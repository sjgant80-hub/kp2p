/**
 * Libp2p Node Configuration and Creation
 * Main P2P node setup with all transports, protocols, and services
 */

import { createLibp2p } from 'libp2p'
import { webRTC } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { all as wsFilters } from '@libp2p/websockets/filters'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@libp2p/gossipsub'
import { kadDHT } from '@libp2p/kad-dht'
import { bootstrap } from '@libp2p/bootstrap'
import { identify } from '@libp2p/identify'
import { BOOTSTRAP_PEERS, GOSSIPSUB_CONFIG, CONNECTION_CONFIG, PROTOCOLS } from '../config.js'

/**
 * Create and configure a libp2p node
 * @param {object} config - Configuration options
 * @returns {Promise<Libp2p>}
 */
export async function createNode(config = {}) {
  const bootstrapList = config.bootstrap || BOOTSTRAP_PEERS

  const node = await createLibp2p({
    // Listen addresses
    addresses: {
      listen: [
        '/webrtc'
      ]
    },

    // Transports
    transports: [
      // WebRTC for browser-to-browser
      webRTC({
        rtcConfiguration: {
          iceServers: [
            { urls: ['stun:stun.l.google.com:19302'] },
            { urls: ['stun:stun1.l.google.com:19302'] },
            { urls: ['stun:stun2.l.google.com:19302'] },
            { urls: ['stun:global.stun.twilio.com:3478'] }
          ]
        }
      }),
      // WebSockets for relay connections
      webSockets({
        filter: wsFilters
      }),
      // Circuit relay for NAT traversal
      circuitRelayTransport({
        discoverRelays: 1
      })
    ],

    // Connection encryption
    connectionEncryption: [noise()],

    // Stream multiplexing
    streamMuxers: [yamux()],

    // Peer discovery
    peerDiscovery: bootstrapList.length > 0 ? [
      bootstrap({
        list: bootstrapList,
        timeout: 3000
      })
    ] : [],

    // Services
    services: {
      // Identify protocol
      identify: identify(),

      // GossipSub for pubsub
      pubsub: gossipsub({
        ...GOSSIPSUB_CONFIG,
        ...config.gossipsub,
        allowPublishToZeroTopicPeers: true
      }),

      // Kademlia DHT
      dht: kadDHT({
        clientMode: true,
        protocolPrefix: '/konomi'
      })
    },

    // Connection manager
    connectionManager: {
      minConnections: config.minConnections || CONNECTION_CONFIG.minConnections,
      maxConnections: config.maxConnections || CONNECTION_CONFIG.maxConnections
    }
  })

  return node
}

/**
 * Node wrapper with convenience methods
 */
export class P2PNode {
  constructor(libp2p) {
    this.libp2p = libp2p
    this._started = false
    this._eventHandlers = new Map()
  }

  /**
   * Create a new P2P node
   * @param {object} config
   * @returns {Promise<P2PNode>}
   */
  static async create(config = {}) {
    const libp2p = await createNode(config)
    return new P2PNode(libp2p)
  }

  /**
   * Start the node
   */
  async start() {
    if (this._started) return
    await this.libp2p.start()
    this._started = true
    console.log('🌐 P2P Node started:', this.peerId)
  }

  /**
   * Stop the node
   */
  async stop() {
    if (!this._started) return
    await this.libp2p.stop()
    this._started = false
  }

  /**
   * Get the peer ID
   * @returns {string}
   */
  get peerId() {
    return this.libp2p.peerId.toString()
  }

  /**
   * Get multiaddrs this node is listening on
   * @returns {string[]}
   */
  get multiaddrs() {
    return this.libp2p.getMultiaddrs().map(ma => ma.toString())
  }

  /**
   * Get the pubsub service
   * @returns {GossipSub}
   */
  get pubsub() {
    return this.libp2p.services.pubsub
  }

  /**
   * Get the DHT service
   * @returns {KadDHT}
   */
  get dht() {
    return this.libp2p.services.dht
  }

  /**
   * Get connected peers
   * @returns {string[]}
   */
  getConnectedPeers() {
    return this.libp2p.getPeers().map(p => p.toString())
  }

  /**
   * Get connections
   * @returns {Connection[]}
   */
  getConnections() {
    return this.libp2p.getConnections()
  }

  /**
   * Dial a peer
   * @param {string} multiaddr
   */
  async dial(multiaddr) {
    return this.libp2p.dial(multiaddr)
  }

  /**
   * Hang up on a peer
   * @param {string} peerId
   */
  async hangUp(peerId) {
    return this.libp2p.hangUp(peerId)
  }

  /**
   * Subscribe to a pubsub topic
   * @param {string} topic
   */
  subscribe(topic) {
    this.pubsub.subscribe(topic)
  }

  /**
   * Unsubscribe from a topic
   * @param {string} topic
   */
  unsubscribe(topic) {
    this.pubsub.unsubscribe(topic)
  }

  /**
   * Publish to a topic
   * @param {string} topic
   * @param {Uint8Array} data
   */
  async publish(topic, data) {
    await this.pubsub.publish(topic, data)
  }

  /**
   * Get subscribers to a topic
   * @param {string} topic
   * @returns {string[]}
   */
  getSubscribers(topic) {
    return this.pubsub.getSubscribers(topic).map(p => p.toString())
  }

  /**
   * Get subscribed topics
   * @returns {string[]}
   */
  getTopics() {
    return this.pubsub.getTopics()
  }

  /**
   * Add event listener
   * @param {string} event
   * @param {function} handler
   */
  on(event, handler) {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set())
    }
    this._eventHandlers.get(event).add(handler)

    // Map to libp2p events
    switch (event) {
      case 'peer:connect':
        this.libp2p.addEventListener('peer:connect', handler)
        break
      case 'peer:disconnect':
        this.libp2p.addEventListener('peer:disconnect', handler)
        break
      case 'peer:discovery':
        this.libp2p.addEventListener('peer:discovery', handler)
        break
      case 'message':
        this.pubsub.addEventListener('message', handler)
        break
      case 'subscription-change':
        this.pubsub.addEventListener('subscription-change', handler)
        break
    }
  }

  /**
   * Remove event listener
   * @param {string} event
   * @param {function} handler
   */
  off(event, handler) {
    if (this._eventHandlers.has(event)) {
      this._eventHandlers.get(event).delete(handler)
    }

    switch (event) {
      case 'peer:connect':
        this.libp2p.removeEventListener('peer:connect', handler)
        break
      case 'peer:disconnect':
        this.libp2p.removeEventListener('peer:disconnect', handler)
        break
      case 'peer:discovery':
        this.libp2p.removeEventListener('peer:discovery', handler)
        break
      case 'message':
        this.pubsub.removeEventListener('message', handler)
        break
      case 'subscription-change':
        this.pubsub.removeEventListener('subscription-change', handler)
        break
    }
  }

  /**
   * Handle protocol
   * @param {string} protocol
   * @param {function} handler
   */
  async handle(protocol, handler) {
    await this.libp2p.handle(protocol, handler)
  }

  /**
   * Unhandle protocol
   * @param {string} protocol
   */
  async unhandle(protocol) {
    await this.libp2p.unhandle(protocol)
  }

  /**
   * Open a stream to a peer
   * @param {string} peerId
   * @param {string} protocol
   * @returns {Promise<Stream>}
   */
  async dialProtocol(peerId, protocol) {
    return this.libp2p.dialProtocol(peerId, protocol)
  }

  /**
   * Check if started
   * @returns {boolean}
   */
  get isStarted() {
    return this._started
  }

  /**
   * Get connection count
   * @returns {number}
   */
  get connectionCount() {
    return this.getConnections().length
  }
}

// Singleton node instance
let defaultNode = null

/**
 * Get or create the default node
 * @param {object} config
 * @returns {Promise<P2PNode>}
 */
export async function getNode(config = {}) {
  if (!defaultNode) {
    defaultNode = await P2PNode.create(config)
  }
  return defaultNode
}

/**
 * Start the default node
 * @param {object} config
 * @returns {Promise<P2PNode>}
 */
export async function startNode(config = {}) {
  const node = await getNode(config)
  await node.start()
  return node
}

export default {
  createNode,
  P2PNode,
  getNode,
  startNode
}
