/**
 * @file src/network/cell.js
 * @desc KonoCell - Decentralized mesh cellular network
 *
 * F**K VERIZON - Build your own cell network!
 *
 * ARCHITECTURE:
 * - Every device is a node in the mesh
 * - Calls route through multiple hops
 * - WiFi + Bluetooth + LoRa for connectivity
 * - No cell towers, no carriers, no bills
 *
 * LAYERS:
 * 1. Physical: WiFi Direct, Bluetooth Mesh, LoRa, WebRTC
 * 2. Network: Multi-hop routing, peer discovery
 * 3. Transport: Encrypted voice/video streams
 * 4. Application: Phone UI, contacts, call history
 */

import { Protocol, MSG_TYPE } from '../core/protocol.js';

// =============================================================================
// CALL STATES
// =============================================================================

export const CALL_STATE = {
  IDLE: 'idle',
  DIALING: 'dialing',
  RINGING: 'ringing',
  CONNECTING: 'connecting',
  ACTIVE: 'active',
  HOLD: 'hold',
  ENDED: 'ended',
  FAILED: 'failed',
};

export const CALL_TYPE = {
  VOICE: 'voice',
  VIDEO: 'video',
  EMERGENCY: 'emergency',
};

export const CALL_END_REASON = {
  HANGUP: 'hangup',
  REJECTED: 'rejected',
  BUSY: 'busy',
  NO_ANSWER: 'no_answer',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
};

// =============================================================================
// SIGNAL TYPES
// =============================================================================

export const CELL_SIGNAL = {
  // Call signaling
  CALL_OFFER: 'call:offer',
  CALL_ANSWER: 'call:answer',
  CALL_REJECT: 'call:reject',
  CALL_HANGUP: 'call:hangup',
  CALL_BUSY: 'call:busy',
  CALL_HOLD: 'call:hold',
  CALL_RESUME: 'call:resume',

  // ICE/WebRTC
  ICE_CANDIDATE: 'ice:candidate',
  SDP_OFFER: 'sdp:offer',
  SDP_ANSWER: 'sdp:answer',

  // Mesh routing
  ROUTE_REQUEST: 'route:request',
  ROUTE_REPLY: 'route:reply',
  ROUTE_ERROR: 'route:error',

  // Presence
  REGISTER: 'presence:register',
  HEARTBEAT: 'presence:heartbeat',
  LOOKUP: 'presence:lookup',
  FOUND: 'presence:found',
};

// =============================================================================
// CODEC SUPPORT
// =============================================================================

export const AUDIO_CODEC = {
  OPUS: { name: 'opus', rate: 48000, channels: 2, bitrate: 32000 },
  G722: { name: 'G722', rate: 16000, channels: 1, bitrate: 64000 },
  PCMU: { name: 'PCMU', rate: 8000, channels: 1, bitrate: 64000 },
};

export const VIDEO_CODEC = {
  VP8: { name: 'VP8', width: 640, height: 480, fps: 30 },
  VP9: { name: 'VP9', width: 1280, height: 720, fps: 30 },
  H264: { name: 'H264', width: 1920, height: 1080, fps: 30 },
};

// =============================================================================
// MESH CELL NODE
// =============================================================================

/**
 * A node in the mesh cell network
 * Every phone/device runs one of these
 */
export class CellNode {
  constructor(options = {}) {
    this.id = options.id || crypto.randomUUID();
    this.phoneNumber = options.phoneNumber || this._generateNumber();
    this.displayName = options.displayName || 'Anonymous';

    // Network state
    this.peers = new Map();           // Connected peers
    this.routes = new Map();          // Known routes to other nodes
    this.pendingRoutes = new Map();   // Route requests in progress

    // Call state
    this.activeCalls = new Map();     // Active calls by callId
    this.callHistory = [];            // Call log

    // WebRTC
    this.peerConnections = new Map(); // RTCPeerConnection per call
    this.localStream = null;          // Local audio/video stream
    this.remoteStreams = new Map();   // Remote streams per call

    // Config
    this.config = {
      maxHops: options.maxHops || 10,
      routeTimeout: options.routeTimeout || 5000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      ringTimeout: options.ringTimeout || 30000,
      iceServers: options.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };

    // Protocol handler
    this.protocol = new Protocol(this.id, {
      onSend: (msg) => this._broadcast(msg),
    });

    this._setupHandlers();
  }

  /**
   * Generate a mesh phone number (like a peer ID but phone-formatted)
   */
  _generateNumber() {
    const prefix = '555'; // Mesh network prefix
    const rand = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `${prefix}-${rand.slice(0, 3)}-${rand.slice(3)}`;
  }

  // ===========================================================================
  // CALL MANAGEMENT
  // ===========================================================================

  /**
   * Start a call to another node
   */
  async call(targetId, type = CALL_TYPE.VOICE) {
    const callId = crypto.randomUUID();

    const call = {
      id: callId,
      type,
      direction: 'outgoing',
      state: CALL_STATE.DIALING,
      target: targetId,
      startTime: Date.now(),
      connectTime: null,
      endTime: null,
    };

    this.activeCalls.set(callId, call);

    // Find route to target
    const route = await this._findRoute(targetId);
    if (!route) {
      call.state = CALL_STATE.FAILED;
      call.endReason = CALL_END_REASON.NETWORK_ERROR;
      this._endCall(callId);
      throw new Error('No route to target');
    }

    // Setup WebRTC
    const pc = await this._createPeerConnection(callId, true);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send call offer
    await this._routeMessage(targetId, {
      type: CELL_SIGNAL.CALL_OFFER,
      callId,
      callType: type,
      from: this.id,
      fromNumber: this.phoneNumber,
      fromName: this.displayName,
      sdp: offer.sdp,
    });

    call.state = CALL_STATE.RINGING;
    this._emit('call:outgoing', call);

    // Ring timeout
    setTimeout(() => {
      if (call.state === CALL_STATE.RINGING) {
        call.state = CALL_STATE.FAILED;
        call.endReason = CALL_END_REASON.NO_ANSWER;
        this._endCall(callId);
      }
    }, this.config.ringTimeout);

    return call;
  }

  /**
   * Answer an incoming call
   */
  async answer(callId) {
    const call = this.activeCalls.get(callId);
    if (!call || call.direction !== 'incoming') {
      throw new Error('Invalid call');
    }

    call.state = CALL_STATE.CONNECTING;

    // Setup WebRTC
    const pc = await this._createPeerConnection(callId, false);
    await pc.setRemoteDescription({ type: 'offer', sdp: call.sdpOffer });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Send answer
    await this._routeMessage(call.from, {
      type: CELL_SIGNAL.CALL_ANSWER,
      callId,
      from: this.id,
      sdp: answer.sdp,
    });

    call.state = CALL_STATE.ACTIVE;
    call.connectTime = Date.now();
    this._emit('call:connected', call);

    return call;
  }

  /**
   * Reject an incoming call
   */
  async reject(callId) {
    const call = this.activeCalls.get(callId);
    if (!call) return;

    await this._routeMessage(call.from, {
      type: CELL_SIGNAL.CALL_REJECT,
      callId,
      from: this.id,
    });

    call.state = CALL_STATE.ENDED;
    call.endReason = CALL_END_REASON.REJECTED;
    this._endCall(callId);
  }

  /**
   * Hang up a call
   */
  async hangup(callId) {
    const call = this.activeCalls.get(callId);
    if (!call) return;

    const target = call.direction === 'outgoing' ? call.target : call.from;

    await this._routeMessage(target, {
      type: CELL_SIGNAL.CALL_HANGUP,
      callId,
      from: this.id,
    });

    call.state = CALL_STATE.ENDED;
    call.endReason = CALL_END_REASON.HANGUP;
    this._endCall(callId);
  }

  /**
   * Put call on hold
   */
  async hold(callId) {
    const call = this.activeCalls.get(callId);
    if (!call || call.state !== CALL_STATE.ACTIVE) return;

    call.state = CALL_STATE.HOLD;
    const target = call.direction === 'outgoing' ? call.target : call.from;

    await this._routeMessage(target, {
      type: CELL_SIGNAL.CALL_HOLD,
      callId,
      from: this.id,
    });

    // Mute local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.enabled = false);
    }

    this._emit('call:hold', call);
  }

  /**
   * Resume call from hold
   */
  async resume(callId) {
    const call = this.activeCalls.get(callId);
    if (!call || call.state !== CALL_STATE.HOLD) return;

    call.state = CALL_STATE.ACTIVE;
    const target = call.direction === 'outgoing' ? call.target : call.from;

    await this._routeMessage(target, {
      type: CELL_SIGNAL.CALL_RESUME,
      callId,
      from: this.id,
    });

    // Unmute local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.enabled = true);
    }

    this._emit('call:resumed', call);
  }

  /**
   * Toggle mute
   */
  mute(callId, muted = true) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = !muted);
    }
    this._emit('call:muted', { callId, muted });
  }

  // ===========================================================================
  // WEBRTC
  // ===========================================================================

  /**
   * Create WebRTC peer connection for a call
   */
  async _createPeerConnection(callId, isInitiator) {
    const pc = new RTCPeerConnection({ iceServers: this.config.iceServers });
    this.peerConnections.set(callId, pc);

    // Get local media
    if (!this.localStream) {
      const call = this.activeCalls.get(callId);
      const constraints = {
        audio: true,
        video: call?.type === CALL_TYPE.VIDEO,
      };
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    }

    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream);
    });

    // Handle ICE candidates
    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        const call = this.activeCalls.get(callId);
        const target = call.direction === 'outgoing' ? call.target : call.from;
        await this._routeMessage(target, {
          type: CELL_SIGNAL.ICE_CANDIDATE,
          callId,
          from: this.id,
          candidate: e.candidate,
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (e) => {
      this.remoteStreams.set(callId, e.streams[0]);
      this._emit('call:stream', { callId, stream: e.streams[0] });
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      const call = this.activeCalls.get(callId);
      if (call && pc.connectionState === 'disconnected') {
        call.state = CALL_STATE.FAILED;
        call.endReason = CALL_END_REASON.NETWORK_ERROR;
        this._endCall(callId);
      }
    };

    return pc;
  }

  // ===========================================================================
  // MESH ROUTING
  // ===========================================================================

  /**
   * Find route to target node (AODV-style)
   */
  async _findRoute(targetId) {
    // Check if we have a direct connection
    if (this.peers.has(targetId)) {
      return { nextHop: targetId, hops: 1 };
    }

    // Check cached routes
    if (this.routes.has(targetId)) {
      const route = this.routes.get(targetId);
      if (Date.now() - route.timestamp < 60000) {
        return route;
      }
    }

    // Broadcast route request
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();

      this.pendingRoutes.set(requestId, { resolve, reject, targetId });

      this._broadcast({
        type: CELL_SIGNAL.ROUTE_REQUEST,
        requestId,
        target: targetId,
        origin: this.id,
        hops: 0,
        path: [this.id],
      });

      // Timeout
      setTimeout(() => {
        if (this.pendingRoutes.has(requestId)) {
          this.pendingRoutes.delete(requestId);
          reject(new Error('Route not found'));
        }
      }, this.config.routeTimeout);
    });
  }

  /**
   * Route a message to target through the mesh
   */
  async _routeMessage(targetId, message) {
    // Direct connection
    if (this.peers.has(targetId)) {
      return this._sendToPeer(targetId, message);
    }

    // Use cached route
    const route = this.routes.get(targetId);
    if (route) {
      return this._sendToPeer(route.nextHop, {
        ...message,
        _route: {
          target: targetId,
          hops: route.hops,
        },
      });
    }

    // Find new route
    const newRoute = await this._findRoute(targetId);
    if (newRoute) {
      return this._sendToPeer(newRoute.nextHop, {
        ...message,
        _route: {
          target: targetId,
          hops: newRoute.hops,
        },
      });
    }

    throw new Error('No route to target');
  }

  // ===========================================================================
  // PROTOCOL HANDLERS
  // ===========================================================================

  _setupHandlers() {
    // Call offer
    this.protocol.on(CELL_SIGNAL.CALL_OFFER, (msg) => {
      const call = {
        id: msg.callId,
        type: msg.callType,
        direction: 'incoming',
        state: CALL_STATE.RINGING,
        from: msg.from,
        fromNumber: msg.fromNumber,
        fromName: msg.fromName,
        sdpOffer: msg.sdp,
        startTime: Date.now(),
      };

      this.activeCalls.set(msg.callId, call);
      this._emit('call:incoming', call);
    });

    // Call answer
    this.protocol.on(CELL_SIGNAL.CALL_ANSWER, async (msg) => {
      const call = this.activeCalls.get(msg.callId);
      if (!call) return;

      const pc = this.peerConnections.get(msg.callId);
      if (pc) {
        await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
      }

      call.state = CALL_STATE.ACTIVE;
      call.connectTime = Date.now();
      this._emit('call:connected', call);
    });

    // Call reject
    this.protocol.on(CELL_SIGNAL.CALL_REJECT, (msg) => {
      const call = this.activeCalls.get(msg.callId);
      if (!call) return;

      call.state = CALL_STATE.ENDED;
      call.endReason = CALL_END_REASON.REJECTED;
      this._endCall(msg.callId);
    });

    // Call hangup
    this.protocol.on(CELL_SIGNAL.CALL_HANGUP, (msg) => {
      const call = this.activeCalls.get(msg.callId);
      if (!call) return;

      call.state = CALL_STATE.ENDED;
      call.endReason = CALL_END_REASON.HANGUP;
      this._endCall(msg.callId);
    });

    // ICE candidate
    this.protocol.on(CELL_SIGNAL.ICE_CANDIDATE, async (msg) => {
      const pc = this.peerConnections.get(msg.callId);
      if (pc && msg.candidate) {
        await pc.addIceCandidate(msg.candidate);
      }
    });

    // Route request (AODV)
    this.protocol.on(CELL_SIGNAL.ROUTE_REQUEST, (msg) => {
      // Don't process our own requests
      if (msg.origin === this.id) return;

      // Are we the target?
      if (msg.target === this.id) {
        // Send route reply back along the path
        const replyPath = [...msg.path].reverse();
        this._sendRouteReply(msg.requestId, msg.origin, replyPath);
        return;
      }

      // Forward with incremented hop count
      if (msg.hops < this.config.maxHops) {
        this._broadcast({
          ...msg,
          hops: msg.hops + 1,
          path: [...msg.path, this.id],
        });
      }
    });

    // Route reply
    this.protocol.on(CELL_SIGNAL.ROUTE_REPLY, (msg) => {
      const pending = this.pendingRoutes.get(msg.requestId);
      if (pending) {
        const route = {
          nextHop: msg.path[1], // Next hop after us
          hops: msg.path.length - 1,
          path: msg.path,
          timestamp: Date.now(),
        };
        this.routes.set(msg.target, route);
        pending.resolve(route);
        this.pendingRoutes.delete(msg.requestId);
      }
    });

    // Hold/Resume
    this.protocol.on(CELL_SIGNAL.CALL_HOLD, (msg) => {
      const call = this.activeCalls.get(msg.callId);
      if (call) {
        call.state = CALL_STATE.HOLD;
        this._emit('call:hold', call);
      }
    });

    this.protocol.on(CELL_SIGNAL.CALL_RESUME, (msg) => {
      const call = this.activeCalls.get(msg.callId);
      if (call) {
        call.state = CALL_STATE.ACTIVE;
        this._emit('call:resumed', call);
      }
    });
  }

  _sendRouteReply(requestId, origin, path) {
    // Send reply back along the path
    const nextHop = path[1]; // Next hop towards origin
    if (this.peers.has(nextHop)) {
      this._sendToPeer(nextHop, {
        type: CELL_SIGNAL.ROUTE_REPLY,
        requestId,
        target: this.id,
        origin,
        path,
      });
    }
  }

  // ===========================================================================
  // PEER MANAGEMENT
  // ===========================================================================

  /**
   * Add a peer connection
   */
  addPeer(peerId, transport) {
    this.peers.set(peerId, {
      id: peerId,
      transport,
      connectedAt: Date.now(),
      lastSeen: Date.now(),
    });

    transport.onmessage = (data) => {
      try {
        const msg = JSON.parse(data);
        this.protocol.receive(msg);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    transport.onclose = () => {
      this.peers.delete(peerId);
      this._emit('peer:disconnected', peerId);
    };

    this._emit('peer:connected', peerId);
  }

  /**
   * Send to specific peer
   */
  _sendToPeer(peerId, message) {
    const peer = this.peers.get(peerId);
    if (peer?.transport) {
      peer.transport.send(JSON.stringify(message));
      peer.lastSeen = Date.now();
    }
  }

  /**
   * Broadcast to all peers
   */
  _broadcast(message) {
    const data = JSON.stringify(message);
    for (const [, peer] of this.peers) {
      if (peer.transport) {
        peer.transport.send(data);
      }
    }
  }

  // ===========================================================================
  // CALL LIFECYCLE
  // ===========================================================================

  _endCall(callId) {
    const call = this.activeCalls.get(callId);
    if (!call) return;

    call.endTime = Date.now();
    call.duration = call.connectTime
      ? Math.floor((call.endTime - call.connectTime) / 1000)
      : 0;

    // Add to history
    this.callHistory.unshift({
      ...call,
      timestamp: Date.now(),
    });

    // Keep last 100 calls
    if (this.callHistory.length > 100) {
      this.callHistory.pop();
    }

    // Cleanup WebRTC
    const pc = this.peerConnections.get(callId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(callId);
    }

    this.remoteStreams.delete(callId);
    this.activeCalls.delete(callId);

    this._emit('call:ended', call);
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  _listeners = new Map();

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this._listeners.get(event).delete(callback);
  }

  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        try { cb(data); } catch (e) { console.error(e); }
      }
    }
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  async destroy() {
    // End all active calls
    for (const [callId] of this.activeCalls) {
      await this.hangup(callId);
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    // Close peer connections
    for (const [, pc] of this.peerConnections) {
      pc.close();
    }
    this.peerConnections.clear();

    // Disconnect from peers
    for (const [, peer] of this.peers) {
      if (peer.transport?.close) {
        peer.transport.close();
      }
    }
    this.peers.clear();
  }
}

// =============================================================================
// MESH CELL NETWORK
// =============================================================================

/**
 * Mesh cell network coordinator
 * Manages the overall network and provides discovery
 */
export class MeshCellNetwork {
  constructor(options = {}) {
    this.namespace = options.namespace || 'konocell';
    this.nodes = new Map();
    this.directory = new Map(); // Phone number -> node ID mapping
  }

  /**
   * Register a node in the network
   */
  register(node) {
    this.nodes.set(node.id, node);
    this.directory.set(node.phoneNumber, node.id);

    node.on('call:ended', (call) => {
      console.log(`[MeshCell] Call ended: ${call.id} (${call.duration}s)`);
    });

    return this;
  }

  /**
   * Lookup node by phone number
   */
  lookup(phoneNumber) {
    const nodeId = this.directory.get(phoneNumber);
    return nodeId ? this.nodes.get(nodeId) : null;
  }

  /**
   * Connect two nodes directly (for testing/local mesh)
   */
  connect(node1, node2) {
    // Create mock transports
    const transport1 = this._createMockTransport();
    const transport2 = this._createMockTransport();

    // Cross-wire them
    transport1.send = (data) => transport2.onmessage?.(data);
    transport2.send = (data) => transport1.onmessage?.(data);

    node1.addPeer(node2.id, transport1);
    node2.addPeer(node1.id, transport2);
  }

  _createMockTransport() {
    return {
      send: () => {},
      close: () => {},
      onmessage: null,
      onclose: null,
    };
  }

  /**
   * Get network stats
   */
  getStats() {
    return {
      nodes: this.nodes.size,
      directory: this.directory.size,
      activeCalls: Array.from(this.nodes.values())
        .reduce((sum, n) => sum + n.activeCalls.size, 0),
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default CellNode;
