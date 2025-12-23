/**
 * Provider Module
 * Yjs ↔ libp2p bridge for CRDT synchronization
 */

import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness.js'
import { fromString, toString } from 'uint8arrays'
import { TOPICS, SYNC_CONFIG } from '../config.js'

/**
 * Message types for sync protocol
 */
export const MessageType = {
  SYNC_REQUEST: 0,
  SYNC_RESPONSE: 1,
  UPDATE: 2,
  AWARENESS: 3
}

/**
 * Encode a sync message
 * @param {object} msg
 * @returns {Uint8Array}
 */
function encodeMessage(msg) {
  return fromString(JSON.stringify({
    ...msg,
    data: msg.data ? Array.from(msg.data) : null
  }))
}

/**
 * Decode a sync message
 * @param {Uint8Array} data
 * @returns {object}
 */
function decodeMessage(data) {
  const msg = JSON.parse(toString(data))
  if (msg.data) {
    msg.data = new Uint8Array(msg.data)
  }
  return msg
}

/**
 * Konomi P2P Provider for Yjs
 * Syncs Yjs documents over libp2p pubsub
 */
export class KonomiP2PProvider {
  /**
   * Create a new provider
   * @param {Y.Doc} doc - Yjs document
   * @param {string} roomId - Room identifier
   * @param {P2PNode} node - Libp2p node
   * @param {object} options - Provider options
   */
  constructor(doc, roomId, node, options = {}) {
    this.doc = doc
    this.roomId = roomId
    this.node = node
    this.topic = TOPICS.ROOM_PREFIX + roomId

    // Options
    this.awarenessInterval = options.awarenessInterval || SYNC_CONFIG.awarenessInterval
    this.updateDebounce = options.updateDebounce || SYNC_CONFIG.updateDebounce

    // Create awareness
    this.awareness = new Awareness(doc)

    // State
    this._synced = false
    this._destroyed = false
    this._pendingUpdates = []
    this._updateTimeout = null
    this._awarenessInterval = null
    this._messageHandler = null

    // Bind methods
    this._onMessage = this._onMessage.bind(this)
    this._onDocUpdate = this._onDocUpdate.bind(this)
    this._onAwarenessUpdate = this._onAwarenessUpdate.bind(this)

    // Initialize
    this._init()
  }

  /**
   * Initialize the provider
   * @private
   */
  _init() {
    // Subscribe to room topic
    this.node.subscribe(this.topic)

    // Listen for pubsub messages
    this._messageHandler = (evt) => this._onMessage(evt)
    this.node.on('message', this._messageHandler)

    // Listen for local document updates
    this.doc.on('update', this._onDocUpdate)

    // Listen for awareness updates
    this.awareness.on('update', this._onAwarenessUpdate)

    // Request initial sync from peers
    this._requestSync()

    // Start awareness keepalive
    this._startAwarenessInterval()

    console.log(`📄 Provider initialized for room: ${this.roomId}`)
  }

  /**
   * Handle incoming pubsub message
   * @private
   */
  _onMessage(evt) {
    if (this._destroyed) return
    if (evt.detail.topic !== this.topic) return

    try {
      const msg = decodeMessage(evt.detail.data)
      this._handleMessage(msg)
    } catch (err) {
      console.warn('Failed to decode sync message:', err.message)
    }
  }

  /**
   * Handle a decoded message
   * @private
   */
  _handleMessage(msg) {
    switch (msg.type) {
      case MessageType.SYNC_REQUEST:
        this._handleSyncRequest(msg)
        break

      case MessageType.SYNC_RESPONSE:
        this._handleSyncResponse(msg)
        break

      case MessageType.UPDATE:
        this._handleUpdate(msg)
        break

      case MessageType.AWARENESS:
        this._handleAwarenessUpdate(msg)
        break
    }
  }

  /**
   * Handle sync request from peer
   * @private
   */
  _handleSyncRequest(msg) {
    // Generate diff based on their state vector
    const stateVector = msg.data
    const diff = Y.encodeStateAsUpdate(this.doc, stateVector)

    // Send sync response
    this._broadcast({
      type: MessageType.SYNC_RESPONSE,
      from: this.node.peerId,
      data: diff
    })
  }

  /**
   * Handle sync response from peer
   * @private
   */
  _handleSyncResponse(msg) {
    try {
      Y.applyUpdate(this.doc, msg.data, this)
      this._synced = true
    } catch (err) {
      console.warn('Failed to apply sync response:', err.message)
    }
  }

  /**
   * Handle update from peer
   * @private
   */
  _handleUpdate(msg) {
    try {
      Y.applyUpdate(this.doc, msg.data, this)
    } catch (err) {
      console.warn('Failed to apply update:', err.message)
    }
  }

  /**
   * Handle awareness update from peer
   * @private
   */
  _handleAwarenessUpdate(msg) {
    try {
      Awareness.applyAwarenessUpdate(this.awareness, msg.data, this)
    } catch (err) {
      console.warn('Failed to apply awareness update:', err.message)
    }
  }

  /**
   * Handle local document update
   * @private
   */
  _onDocUpdate(update, origin) {
    if (this._destroyed) return
    if (origin === this) return // Ignore remote updates

    // Debounce updates
    this._pendingUpdates.push(update)

    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout)
    }

    this._updateTimeout = setTimeout(() => {
      this._flushUpdates()
    }, this.updateDebounce)
  }

  /**
   * Flush pending updates
   * @private
   */
  _flushUpdates() {
    if (this._pendingUpdates.length === 0) return

    // Merge all pending updates
    const merged = Y.mergeUpdates(this._pendingUpdates)
    this._pendingUpdates = []

    // Broadcast update
    this._broadcast({
      type: MessageType.UPDATE,
      from: this.node.peerId,
      data: merged
    })
  }

  /**
   * Handle local awareness update
   * @private
   */
  _onAwarenessUpdate({ added, updated, removed }) {
    if (this._destroyed) return

    const changedClients = [...added, ...updated, ...removed]
    const encodedUpdate = Awareness.encodeAwarenessUpdate(this.awareness, changedClients)

    this._broadcast({
      type: MessageType.AWARENESS,
      from: this.node.peerId,
      data: encodedUpdate
    })
  }

  /**
   * Request sync from peers
   * @private
   */
  _requestSync() {
    const stateVector = Y.encodeStateVector(this.doc)

    this._broadcast({
      type: MessageType.SYNC_REQUEST,
      from: this.node.peerId,
      data: stateVector
    })
  }

  /**
   * Start awareness keepalive interval
   * @private
   */
  _startAwarenessInterval() {
    this._awarenessInterval = setInterval(() => {
      if (this._destroyed) return

      // Send awareness update
      const changedClients = [this.doc.clientID]
      const encodedUpdate = Awareness.encodeAwarenessUpdate(this.awareness, changedClients)

      this._broadcast({
        type: MessageType.AWARENESS,
        from: this.node.peerId,
        data: encodedUpdate
      })
    }, this.awarenessInterval)
  }

  /**
   * Broadcast a message to the room
   * @private
   */
  async _broadcast(msg) {
    if (this._destroyed) return

    try {
      const data = encodeMessage(msg)
      await this.node.publish(this.topic, data)
    } catch (err) {
      console.warn('Failed to broadcast:', err.message)
    }
  }

  /**
   * Set local awareness state
   * @param {object} state
   */
  setAwarenessState(state) {
    this.awareness.setLocalState(state)
  }

  /**
   * Get local awareness state
   * @returns {object}
   */
  getLocalAwarenessState() {
    return this.awareness.getLocalState()
  }

  /**
   * Get all awareness states
   * @returns {Map}
   */
  getAwarenessStates() {
    return this.awareness.getStates()
  }

  /**
   * Get connected peers in room
   * @returns {string[]}
   */
  getConnectedPeers() {
    return this.node.getSubscribers(this.topic)
  }

  /**
   * Check if synced
   * @returns {boolean}
   */
  get isSynced() {
    return this._synced
  }

  /**
   * Force sync with peers
   */
  sync() {
    this._requestSync()
  }

  /**
   * Destroy the provider
   */
  destroy() {
    if (this._destroyed) return
    this._destroyed = true

    // Clear intervals/timeouts
    if (this._awarenessInterval) {
      clearInterval(this._awarenessInterval)
    }
    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout)
    }

    // Remove listeners
    this.doc.off('update', this._onDocUpdate)
    this.awareness.off('update', this._onAwarenessUpdate)

    if (this._messageHandler) {
      this.node.off('message', this._messageHandler)
    }

    // Unsubscribe from topic
    this.node.unsubscribe(this.topic)

    // Clear awareness
    this.awareness.destroy()

    console.log(`📄 Provider destroyed for room: ${this.roomId}`)
  }
}

/**
 * Create a provider for a room
 * @param {string} roomId
 * @param {P2PNode} node
 * @param {object} options
 * @returns {{doc: Y.Doc, provider: KonomiP2PProvider}}
 */
export function createRoomProvider(roomId, node, options = {}) {
  const doc = options.doc || new Y.Doc()
  const provider = new KonomiP2PProvider(doc, roomId, node, options)

  return { doc, provider }
}

export default {
  MessageType,
  KonomiP2PProvider,
  createRoomProvider
}
