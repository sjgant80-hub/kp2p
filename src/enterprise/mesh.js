/**
 * @file src/enterprise/mesh.js
 * @desc P2P mesh for enterprise hierarchy communication
 *
 * Connects enterprise nodes via WebRTC with:
 * - Topic-based pub/sub (Sparkplug-style)
 * - Hierarchical routing
 * - State sync via CRDT
 * - Sandboxed execution
 */

import { HierarchyNode, MSG, STATE, createValue, QUALITY } from './hierarchy.js';
import { Protocol, MSG_TYPE } from '../core/protocol.js';
import { Sandbox } from '../core/sandbox.js';

/**
 * Topic format: {namespace}/{group}/{msgtype}/{path}
 * Example: kp2p/plant1/DATA/Line1/Filler/LevelSensor
 */
export function createTopic(namespace, group, msgType, path) {
  return `${namespace}/${group}/${msgType}/${path}`.replace(/\/+/g, '/');
}

/**
 * Parse topic into components
 */
export function parseTopic(topic) {
  const parts = topic.split('/');
  return {
    namespace: parts[0],
    group: parts[1],
    msgType: parts[2],
    path: parts.slice(3).join('/'),
  };
}

/**
 * Enterprise mesh node - wraps hierarchy node with P2P
 */
export class MeshNode {
  constructor(node, options = {}) {
    this.node = node;
    this.namespace = options.namespace || 'kp2p';
    this.group = options.group || 'default';
    this.peers = new Map();
    this.subscriptions = new Map();
    this.protocol = null;
    this.sandbox = null;
    this.dataChannels = new Map();
    this.birthSent = false;
  }

  /**
   * Get topic for this node
   */
  getTopic(msgType) {
    return createTopic(this.namespace, this.group, msgType, this.node.getPath());
  }

  /**
   * Initialize mesh node
   */
  async start() {
    // Start sandbox
    this.sandbox = new Sandbox({ id: `mesh-${this.node.id}` });
    await this.sandbox.start();

    // Setup protocol
    this.protocol = new Protocol(this.node.id, {
      onSend: (msg) => this._broadcast(msg),
    });

    // Register handlers
    this._setupHandlers();

    // Listen to node events
    this.node.on(MSG.DATA, (e) => this._onNodeData(e));
    this.node.on(MSG.STATE, (e) => this._onNodeState(e));
    this.node.on(MSG.ALARM, (e) => this._onNodeAlarm(e));

    return this;
  }

  /**
   * Setup protocol handlers
   */
  _setupHandlers() {
    // Handle incoming DATA
    this.protocol.on('data', async (payload, msg) => {
      const { path, metric, value } = payload;
      if (path === this.node.getPath()) {
        this.node.setMetric(metric, value.v, value.q, value.unit);
      }
      // Forward to subscribers
      this._notifySubscribers(MSG.DATA, payload);
    });

    // Handle incoming CMD
    this.protocol.on('cmd', async (payload, msg) => {
      const { path, command, params } = payload;
      if (path === this.node.getPath()) {
        return this._executeCommand(command, params);
      }
      // Route to child
      const target = this.node.navigate(path);
      if (target) {
        return this._executeCommand(command, params, target);
      }
      return { error: 'Node not found' };
    });

    // Handle incoming STATE
    this.protocol.on('state', async (payload, msg) => {
      this._notifySubscribers(MSG.STATE, payload);
    });

    // Handle BIRTH request
    this.protocol.on('birth', async (payload, msg) => {
      return this.node.toBirth();
    });

    // Handle subscription
    this.protocol.on('subscribe', async (payload, msg) => {
      const { topic } = payload;
      if (!this.subscriptions.has(topic)) {
        this.subscriptions.set(topic, new Set());
      }
      this.subscriptions.get(topic).add(msg.from);
      return { subscribed: true, topic };
    });
  }

  /**
   * Execute command on node
   */
  async _executeCommand(command, params, target = null) {
    const node = target || this.node;

    switch (command) {
      case 'start':
      case 'stop':
      case 'reset':
      case 'hold':
      case 'unhold':
      case 'abort':
      case 'clear':
        const success = node.transition(command);
        return { success, state: node.state };

      case 'setMode':
        node.mode = params.mode;
        return { success: true, mode: node.mode };

      case 'setMetric':
        node.setMetric(params.name, params.value, params.quality, params.unit);
        return { success: true };

      case 'getMetric':
        return node.getMetric(params.name);

      case 'getState':
        return { state: node.state, mode: node.mode };

      case 'getBirth':
        return node.toBirth();

      default:
        // Try sandbox computation
        if (command === 'compute') {
          return await this.sandbox.compute(params.expr);
        }
        return { error: `Unknown command: ${command}` };
    }
  }

  /**
   * Handle node data event
   */
  _onNodeData(event) {
    this.protocol.emit('data', {
      path: event.source,
      ...event.data,
    });
  }

  /**
   * Handle node state event
   */
  _onNodeState(event) {
    this.protocol.emit('state', {
      path: event.source,
      ...event.data,
    });
  }

  /**
   * Handle node alarm event
   */
  _onNodeAlarm(event) {
    this.protocol.emit('alarm', {
      path: event.source,
      ...event.data,
    });
  }

  /**
   * Notify topic subscribers
   */
  _notifySubscribers(msgType, data) {
    const topic = createTopic(this.namespace, this.group, msgType, data.path);
    const subs = this.subscriptions.get(topic);
    if (subs) {
      for (const peerId of subs) {
        const channel = this.dataChannels.get(peerId);
        if (channel?.readyState === 'open') {
          channel.send(JSON.stringify({
            type: MSG_TYPE.EVENT,
            topic,
            data,
          }));
        }
      }
    }
  }

  /**
   * Add peer connection
   */
  addPeer(peerId, dataChannel) {
    this.peers.set(peerId, { id: peerId, channel: dataChannel });
    this.dataChannels.set(peerId, dataChannel);

    dataChannel.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this.protocol.receive(msg);
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };

    dataChannel.onclose = () => {
      this.peers.delete(peerId);
      this.dataChannels.delete(peerId);
    };

    // Send BIRTH on connect
    if (!this.birthSent) {
      this._sendBirth();
      this.birthSent = true;
    }
  }

  /**
   * Send BIRTH message
   */
  _sendBirth() {
    this.protocol.emit('birth', this.node.toBirth());
  }

  /**
   * Broadcast message to all peers
   */
  _broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const [_, channel] of this.dataChannels) {
      if (channel.readyState === 'open') {
        channel.send(data);
      }
    }
  }

  /**
   * Subscribe to topic on remote node
   */
  async subscribe(peerId, topic) {
    return this.protocol.call(peerId, 'subscribe', { topic });
  }

  /**
   * Send command to remote node
   */
  async sendCommand(peerId, path, command, params = {}) {
    return this.protocol.call(peerId, 'cmd', { path, command, params });
  }

  /**
   * Request BIRTH from remote node
   */
  async requestBirth(peerId) {
    return this.protocol.call(peerId, 'birth', {});
  }

  /**
   * Stop mesh node
   */
  async stop() {
    // Send DEATH
    this.protocol.emit('death', { path: this.node.getPath() });

    // Close connections
    for (const [_, channel] of this.dataChannels) {
      channel.close();
    }
    this.peers.clear();
    this.dataChannels.clear();

    // Stop sandbox
    await this.sandbox?.stop();
  }
}

/**
 * Enterprise mesh network
 */
export class EnterpriseMesh {
  constructor(options = {}) {
    this.namespace = options.namespace || 'kp2p';
    this.group = options.group || 'default';
    this.nodes = new Map();
  }

  /**
   * Add node to mesh
   */
  async addNode(hierarchyNode) {
    const meshNode = new MeshNode(hierarchyNode, {
      namespace: this.namespace,
      group: this.group,
    });
    await meshNode.start();
    this.nodes.set(hierarchyNode.id, meshNode);
    return meshNode;
  }

  /**
   * Get mesh node by id
   */
  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Connect two mesh nodes
   */
  connectNodes(node1Id, node2Id, channel1, channel2) {
    const node1 = this.nodes.get(node1Id);
    const node2 = this.nodes.get(node2Id);
    if (node1 && node2) {
      node1.addPeer(node2Id, channel1);
      node2.addPeer(node1Id, channel2);
    }
  }

  /**
   * Stop all nodes
   */
  async stopAll() {
    for (const [_, node] of this.nodes) {
      await node.stop();
    }
    this.nodes.clear();
  }
}

export default EnterpriseMesh;
