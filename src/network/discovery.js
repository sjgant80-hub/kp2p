/**
 * Discovery Module
 * Peer discovery via bootstrap, DHT, and pubsub
 */

import { BOOTSTRAP_PEERS, TOPICS } from '../config.js'
import { PeerInfo, PeerStore } from '../core/peer.js'
import { fromString, toString } from 'uint8arrays'

/**
 * Discovery manager for finding and announcing peers
 */
export class DiscoveryManager {
  constructor(node, options = {}) {
    this.node = node
    this.peerStore = options.peerStore || new PeerStore()
    this.announceInterval = options.announceInterval || 30000
    this.rooms = new Set()

    this._announceTimer = null
    this._handlers = new Map()
    this._started = false
  }

  /**
   * Start discovery
   */
  async start() {
    if (this._started) return
    this._started = true

    // Subscribe to discovery topic
    this.node.subscribe(TOPICS.DISCOVERY)

    // Listen for messages
    this._onMessage = this._handleMessage.bind(this)
    this.node.on('message', this._onMessage)

    // Listen for peer connections
    this._onPeerConnect = this._handlePeerConnect.bind(this)
    this.node.on('peer:connect', this._onPeerConnect)

    // Listen for peer discoveries
    this._onPeerDiscovery = this._handlePeerDiscovery.bind(this)
    this.node.on('peer:discovery', this._onPeerDiscovery)

    // Start announcing
    this._startAnnouncing()

    console.log('🔍 Discovery started')
  }

  /**
   * Stop discovery
   */
  async stop() {
    if (!this._started) return
    this._started = false

    // Stop announcing
    if (this._announceTimer) {
      clearInterval(this._announceTimer)
      this._announceTimer = null
    }

    // Unsubscribe
    this.node.unsubscribe(TOPICS.DISCOVERY)

    // Remove listeners
    if (this._onMessage) {
      this.node.off('message', this._onMessage)
    }
    if (this._onPeerConnect) {
      this.node.off('peer:connect', this._onPeerConnect)
    }
    if (this._onPeerDiscovery) {
      this.node.off('peer:discovery', this._onPeerDiscovery)
    }

    console.log('🔍 Discovery stopped')
  }

  /**
   * Start periodic announcements
   * @private
   */
  _startAnnouncing() {
    // Announce immediately
    this._announce()

    // Then periodically
    this._announceTimer = setInterval(() => {
      this._announce()
    }, this.announceInterval)
  }

  /**
   * Announce presence to the network
   * @private
   */
  async _announce() {
    if (!this._started) return

    const announcement = {
      type: 'announce',
      peerId: this.node.peerId,
      addrs: this.node.multiaddrs,
      rooms: Array.from(this.rooms),
      ts: Date.now()
    }

    try {
      const data = fromString(JSON.stringify(announcement))
      await this.node.publish(TOPICS.DISCOVERY, data)
    } catch (err) {
      console.warn('Failed to announce:', err.message)
    }
  }

  /**
   * Handle incoming pubsub message
   * @private
   */
  _handleMessage(evt) {
    const { topic, data } = evt.detail

    if (topic !== TOPICS.DISCOVERY) return

    try {
      const msg = JSON.parse(toString(data))
      this._processAnnouncement(msg)
    } catch (err) {
      console.warn('Failed to parse discovery message:', err.message)
    }
  }

  /**
   * Process a peer announcement
   * @private
   */
  _processAnnouncement(msg) {
    if (msg.type !== 'announce') return
    if (msg.peerId === this.node.peerId) return // Ignore self

    // Create or update peer info
    const peerInfo = new PeerInfo({
      id: msg.peerId,
      addrs: msg.addrs || [],
      seen: msg.ts || Date.now()
    })

    this.peerStore.add(peerInfo)

    // Emit discovery event
    this._emit('peer:discovered', {
      peerId: msg.peerId,
      addrs: msg.addrs,
      rooms: msg.rooms
    })
  }

  /**
   * Handle peer connection
   * @private
   */
  _handlePeerConnect(evt) {
    const peerId = evt.detail.toString()

    const peerInfo = new PeerInfo({
      id: peerId,
      seen: Date.now()
    })

    this.peerStore.add(peerInfo)
    this._emit('peer:connected', { peerId })
  }

  /**
   * Handle peer discovery from bootstrap/DHT
   * @private
   */
  _handlePeerDiscovery(evt) {
    const peerInfo = new PeerInfo({
      id: evt.detail.id.toString(),
      addrs: evt.detail.multiaddrs?.map(ma => ma.toString()) || [],
      seen: Date.now()
    })

    this.peerStore.add(peerInfo)
    this._emit('peer:discovered', {
      peerId: peerInfo.id,
      addrs: peerInfo.addrs
    })
  }

  /**
   * Join a room (for room-based discovery)
   * @param {string} roomId
   */
  joinRoom(roomId) {
    this.rooms.add(roomId)
    // Announce room membership
    this._announce()
  }

  /**
   * Leave a room
   * @param {string} roomId
   */
  leaveRoom(roomId) {
    this.rooms.delete(roomId)
  }

  /**
   * Find peers in a room
   * @param {string} roomId
   * @returns {PeerInfo[]}
   */
  findRoomPeers(roomId) {
    // Get subscribers to room topic
    const roomTopic = TOPICS.ROOM_PREFIX + roomId
    const subscribers = this.node.getSubscribers(roomTopic)

    return subscribers
      .map(peerId => this.peerStore.get(peerId))
      .filter(Boolean)
  }

  /**
   * Get all discovered peers
   * @returns {PeerInfo[]}
   */
  getPeers() {
    return this.peerStore.all()
  }

  /**
   * Get connected peers
   * @returns {PeerInfo[]}
   */
  getConnectedPeers() {
    const connected = new Set(this.node.getConnectedPeers())
    return this.peerStore.all().filter(p => connected.has(p.id))
  }

  /**
   * Search DHT for a peer
   * @param {string} peerId
   */
  async findPeer(peerId) {
    try {
      const result = await this.node.dht.findPeer(peerId)
      if (result) {
        const peerInfo = new PeerInfo({
          id: peerId,
          addrs: result.multiaddrs?.map(ma => ma.toString()) || [],
          seen: Date.now()
        })
        this.peerStore.add(peerInfo)
        return peerInfo
      }
    } catch (err) {
      console.warn('DHT findPeer failed:', err.message)
    }
    return null
  }

  /**
   * Add event handler
   * @param {string} event
   * @param {function} handler
   */
  on(event, handler) {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set())
    }
    this._handlers.get(event).add(handler)
  }

  /**
   * Remove event handler
   * @param {string} event
   * @param {function} handler
   */
  off(event, handler) {
    if (this._handlers.has(event)) {
      this._handlers.get(event).delete(handler)
    }
  }

  /**
   * Emit an event
   * @private
   */
  _emit(event, data) {
    if (this._handlers.has(event)) {
      for (const handler of this._handlers.get(event)) {
        try {
          handler(data)
        } catch (err) {
          console.error('Event handler error:', err)
        }
      }
    }
  }

  /**
   * Prune stale peers
   * @param {number} timeout
   */
  pruneStale(timeout = 300000) {
    this.peerStore.pruneStale(timeout)
  }
}

/**
 * Room discovery helper
 */
export class RoomDiscovery {
  constructor(node, roomId) {
    this.node = node
    this.roomId = roomId
    this.topic = TOPICS.ROOM_PREFIX + roomId
    this.members = new Map() // peerId -> lastSeen
    this._handler = null
  }

  /**
   * Start room discovery
   */
  async start() {
    // Subscribe to room topic
    this.node.subscribe(this.topic)

    // Listen for messages
    this._handler = (evt) => {
      if (evt.detail.topic !== this.topic) return

      try {
        const msg = JSON.parse(toString(evt.detail.data))
        if (msg.type === 'presence') {
          this.members.set(msg.peerId, msg.ts)
        }
      } catch (err) {
        // Ignore parse errors
      }
    }

    this.node.on('message', this._handler)

    // Announce presence
    this._announcePresence()
  }

  /**
   * Stop room discovery
   */
  async stop() {
    this.node.unsubscribe(this.topic)
    if (this._handler) {
      this.node.off('message', this._handler)
    }
    this.members.clear()
  }

  /**
   * Announce presence in room
   * @private
   */
  async _announcePresence() {
    const msg = {
      type: 'presence',
      peerId: this.node.peerId,
      ts: Date.now()
    }

    try {
      await this.node.publish(this.topic, fromString(JSON.stringify(msg)))
    } catch (err) {
      console.warn('Failed to announce room presence:', err.message)
    }
  }

  /**
   * Get room members
   * @returns {string[]}
   */
  getMembers() {
    // Filter out stale members (not seen in 60s)
    const now = Date.now()
    const active = []

    for (const [peerId, lastSeen] of this.members) {
      if (now - lastSeen < 60000) {
        active.push(peerId)
      } else {
        this.members.delete(peerId)
      }
    }

    return active
  }
}

export default {
  DiscoveryManager,
  RoomDiscovery
}
