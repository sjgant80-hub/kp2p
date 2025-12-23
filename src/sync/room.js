/**
 * Room Module
 * Room CRDT state management
 */

import * as Y from 'yjs'
import { KonomiP2PProvider } from './provider.js'
import { AwarenessManager, getRandomColor } from './awareness.js'
import { TOPICS } from '../config.js'

/**
 * Room state
 */
export const RoomState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  SYNCING: 'syncing',
  SYNCED: 'synced'
}

/**
 * Room represents a collaborative space with shared state
 */
export class Room {
  /**
   * Create a room
   * @param {string} id - Room ID
   * @param {P2PNode} node - P2P node
   * @param {object} options - Room options
   */
  constructor(id, node, options = {}) {
    this.id = id
    this.node = node
    this.topic = TOPICS.ROOM_PREFIX + id

    // Create Yjs document
    this.doc = new Y.Doc()

    // Create provider
    this.provider = new KonomiP2PProvider(this.doc, id, node, options)

    // Create awareness manager
    this.awareness = new AwarenessManager(this.provider.awareness, options)

    // Room state
    this._state = RoomState.DISCONNECTED
    this._handlers = new Map()

    // Room metadata stored in doc
    this._meta = this.doc.getMap('_meta')

    // Initialize
    this._init(options)
  }

  /**
   * Initialize room
   * @private
   */
  _init(options) {
    // Set up user
    if (options.user) {
      this.awareness.setUser(options.user)
    } else {
      this.awareness.setUser({
        name: 'Anonymous',
        color: getRandomColor()
      })
    }

    // Track state changes
    this.doc.on('update', () => {
      if (this._state !== RoomState.SYNCED && this.provider.isSynced) {
        this._setState(RoomState.SYNCED)
      }
    })

    this._setState(RoomState.CONNECTED)
    this.awareness.startTracking()
  }

  /**
   * Get room state
   * @returns {string}
   */
  get state() {
    return this._state
  }

  /**
   * Set room state
   * @private
   */
  _setState(state) {
    if (this._state !== state) {
      const oldState = this._state
      this._state = state
      this._emit('state', { oldState, newState: state })
    }
  }

  /**
   * Get shared map
   * @param {string} name
   * @returns {Y.Map}
   */
  getMap(name) {
    return this.doc.getMap(name)
  }

  /**
   * Get shared array
   * @param {string} name
   * @returns {Y.Array}
   */
  getArray(name) {
    return this.doc.getArray(name)
  }

  /**
   * Get shared text
   * @param {string} name
   * @returns {Y.Text}
   */
  getText(name) {
    return this.doc.getText(name)
  }

  /**
   * Get shared XML fragment
   * @param {string} name
   * @returns {Y.XmlFragment}
   */
  getXmlFragment(name) {
    return this.doc.getXmlFragment(name)
  }

  /**
   * Get room metadata
   * @returns {object}
   */
  getMeta() {
    return this._meta.toJSON()
  }

  /**
   * Set room metadata
   * @param {string} key
   * @param {any} value
   */
  setMeta(key, value) {
    this._meta.set(key, value)
  }

  /**
   * Get connected peers
   * @returns {string[]}
   */
  getPeers() {
    return this.provider.getConnectedPeers()
  }

  /**
   * Get active users
   * @returns {Array}
   */
  getUsers() {
    return this.awareness.getActiveUsers()
  }

  /**
   * Set user info
   * @param {object} user
   */
  setUser(user) {
    this.awareness.setUser(user)
  }

  /**
   * Set cursor position
   * @param {object} cursor
   */
  setCursor(cursor) {
    this.awareness.setCursor(cursor)
  }

  /**
   * Transaction wrapper
   * @param {function} fn
   * @param {any} origin
   */
  transact(fn, origin = null) {
    this.doc.transact(fn, origin)
  }

  /**
   * Undo manager for this room
   * @param {Y.AbstractType} scope
   * @returns {Y.UndoManager}
   */
  createUndoManager(scope) {
    return new Y.UndoManager(scope)
  }

  /**
   * Export room state
   * @returns {Uint8Array}
   */
  export() {
    return Y.encodeStateAsUpdate(this.doc)
  }

  /**
   * Import room state
   * @param {Uint8Array} update
   */
  import(update) {
    Y.applyUpdate(this.doc, update)
  }

  /**
   * Get invite link
   * @returns {string}
   */
  getInviteLink() {
    if (typeof location !== 'undefined') {
      return `${location.origin}${location.pathname}#${this.id}`
    }
    return `#${this.id}`
  }

  /**
   * Add event listener
   * @param {string} event
   * @param {function} handler
   */
  on(event, handler) {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set())
    }
    this._handlers.get(event).add(handler)

    // Special handling for document events
    if (event === 'update') {
      this.doc.on('update', handler)
    }
  }

  /**
   * Remove event listener
   * @param {string} event
   * @param {function} handler
   */
  off(event, handler) {
    if (this._handlers.has(event)) {
      this._handlers.get(event).delete(handler)
    }

    if (event === 'update') {
      this.doc.off('update', handler)
    }
  }

  /**
   * Emit event
   * @private
   */
  _emit(event, data) {
    if (this._handlers.has(event)) {
      for (const handler of this._handlers.get(event)) {
        try {
          handler(data)
        } catch (err) {
          console.error('Room event handler error:', err)
        }
      }
    }
  }

  /**
   * Force sync
   */
  sync() {
    this.provider.sync()
  }

  /**
   * Leave room
   */
  leave() {
    this._setState(RoomState.DISCONNECTED)
    this.awareness.stopTracking()
    this.provider.destroy()
  }

  /**
   * Destroy room
   */
  destroy() {
    this.leave()
    this.doc.destroy()
    this._handlers.clear()
  }
}

/**
 * Room manager for handling multiple rooms
 */
export class RoomManager {
  constructor(node) {
    this.node = node
    this.rooms = new Map()
  }

  /**
   * Join or create a room
   * @param {string} roomId
   * @param {object} options
   * @returns {Room}
   */
  join(roomId, options = {}) {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)
    }

    const room = new Room(roomId, this.node, options)
    this.rooms.set(roomId, room)
    return room
  }

  /**
   * Leave a room
   * @param {string} roomId
   */
  leave(roomId) {
    const room = this.rooms.get(roomId)
    if (room) {
      room.leave()
      this.rooms.delete(roomId)
    }
  }

  /**
   * Get a room
   * @param {string} roomId
   * @returns {Room}
   */
  get(roomId) {
    return this.rooms.get(roomId)
  }

  /**
   * Check if in room
   * @param {string} roomId
   * @returns {boolean}
   */
  has(roomId) {
    return this.rooms.has(roomId)
  }

  /**
   * Get all rooms
   * @returns {Room[]}
   */
  all() {
    return Array.from(this.rooms.values())
  }

  /**
   * Leave all rooms
   */
  leaveAll() {
    for (const room of this.rooms.values()) {
      room.leave()
    }
    this.rooms.clear()
  }

  /**
   * Destroy all rooms
   */
  destroy() {
    for (const room of this.rooms.values()) {
      room.destroy()
    }
    this.rooms.clear()
  }
}

export default {
  RoomState,
  Room,
  RoomManager
}
