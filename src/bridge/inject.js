/**
 * Inject Module
 * Inject P2P capabilities into any static page
 */

import { P2PNode, startNode } from '../network/libp2p.js'
import { DiscoveryManager } from '../network/discovery.js'
import { RelayManager } from '../network/relay.js'
import { RoomManager, Room } from '../sync/room.js'
import { loadIdentity } from '../core/identity.js'
import { getStore, getBlobStore } from '../core/store.js'
import { SignalManager } from '../protocols/signal.js'
import { BlobProtocol } from '../protocols/blob.js'
import { RPCProtocol } from '../protocols/rpc.js'
import { injectStatusUI, removeStatusUI } from './ui.js'
import { createConfig } from '../config.js'

/**
 * Main P2P injection function
 * Call this to add P2P capabilities to any static page
 *
 * @param {object} config - Configuration options
 * @returns {Promise<KonomiP2P>}
 */
export async function injectP2P(config = {}) {
  const finalConfig = createConfig(config)

  // Initialize core components
  console.log('🌐 Initializing Konomi P2P...')

  // Load identity
  const identity = await loadIdentity()
  console.log('🔑 Identity loaded:', identity.peerId)

  // Initialize stores
  const store = await getStore()
  const blobStore = await getBlobStore()

  // Create and start P2P node
  const node = await startNode(finalConfig)
  console.log('🌐 P2P Node started:', node.peerId)

  // Initialize managers
  const discovery = new DiscoveryManager(node, { peerStore: null })
  const relay = new RelayManager(node)
  const rooms = new RoomManager(node)
  const signal = new SignalManager(node)
  const blob = new BlobProtocol(node, blobStore)
  const rpc = new RPCProtocol(node)

  // Start services
  await Promise.all([
    discovery.start(),
    relay.start(),
    signal.start(),
    blob.start(),
    rpc.start()
  ])

  // Get or create room from URL hash
  let roomId = config.roomId
  if (!roomId && typeof location !== 'undefined') {
    roomId = location.hash.slice(1) || crypto.randomUUID()
    if (!location.hash) {
      location.hash = roomId
    }
  }
  roomId = roomId || crypto.randomUUID()

  // Join room
  const room = rooms.join(roomId, {
    user: config.user || {
      name: 'Anonymous',
      color: getRandomColor()
    }
  })

  // Create API object
  const api = new KonomiP2P({
    node,
    identity,
    discovery,
    relay,
    rooms,
    room,
    signal,
    blob,
    rpc,
    store,
    blobStore,
    config: finalConfig
  })

  // Expose globally
  if (typeof window !== 'undefined') {
    window.konomiP2P = api
  }

  // Inject status UI
  if (config.showUI !== false) {
    injectStatusUI(api)
  }

  // Listen for hash changes to switch rooms
  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', () => {
      const newRoomId = location.hash.slice(1)
      if (newRoomId && newRoomId !== api.roomId) {
        api.switchRoom(newRoomId)
      }
    })
  }

  console.log('🌐 Konomi P2P ready!')
  console.log('📋 Room:', roomId)
  console.log('🔗 Invite:', api.invite())

  return api
}

/**
 * Random color generator
 */
function getRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * Main API class for Konomi P2P
 */
export class KonomiP2P {
  constructor(options) {
    this._node = options.node
    this._identity = options.identity
    this._discovery = options.discovery
    this._relay = options.relay
    this._rooms = options.rooms
    this._room = options.room
    this._signal = options.signal
    this._blob = options.blob
    this._rpc = options.rpc
    this._store = options.store
    this._blobStore = options.blobStore
    this._config = options.config
    this._handlers = new Map()
  }

  // === Node Info ===

  /**
   * Get our peer ID
   */
  get peerId() {
    return this._node.peerId
  }

  /**
   * Get current room ID
   */
  get roomId() {
    return this._room.id
  }

  /**
   * Get the underlying libp2p node
   */
  get node() {
    return this._node
  }

  /**
   * Get the Yjs document
   */
  get doc() {
    return this._room.doc
  }

  /**
   * Get the provider
   */
  get provider() {
    return this._room.provider
  }

  // === Room API ===

  /**
   * Get room
   */
  get room() {
    return this._room
  }

  /**
   * Switch to a different room
   */
  switchRoom(roomId, options = {}) {
    // Leave current room
    this._rooms.leave(this._room.id)

    // Join new room
    this._room = this._rooms.join(roomId, options)

    // Update hash
    if (typeof location !== 'undefined') {
      location.hash = roomId
    }

    // Emit event
    this._emit('room:switch', { roomId })

    return this._room
  }

  // === Shared State API ===

  /**
   * Get shared map
   */
  getSharedMap(name) {
    return this._room.getMap(name)
  }

  /**
   * Get shared array
   */
  getSharedArray(name) {
    return this._room.getArray(name)
  }

  /**
   * Get shared text
   */
  getSharedText(name) {
    return this._room.getText(name)
  }

  /**
   * Transaction wrapper
   */
  transact(fn, origin = null) {
    this._room.transact(fn, origin)
  }

  // === Peer Info ===

  /**
   * Get connected peers in room
   */
  getPeers() {
    return this._room.getPeers()
  }

  /**
   * Get all connected peers
   */
  getAllPeers() {
    return this._node.getConnectedPeers()
  }

  /**
   * Get users in room (with awareness info)
   */
  getUsers() {
    return this._room.getUsers()
  }

  /**
   * Get awareness manager
   */
  getAwareness() {
    return this._room.awareness
  }

  // === User API ===

  /**
   * Set current user info
   */
  setUser(user) {
    this._room.setUser(user)
  }

  /**
   * Set cursor position
   */
  setCursor(cursor) {
    this._room.setCursor(cursor)
  }

  // === Utility ===

  /**
   * Get invite link
   */
  invite() {
    return this._room.getInviteLink()
  }

  /**
   * Create a new room and return invite link
   */
  createRoom(roomId = null, options = {}) {
    roomId = roomId || crypto.randomUUID()
    const room = this._rooms.join(roomId, options)
    return {
      roomId,
      room,
      invite: room.getInviteLink()
    }
  }

  // === Blob API ===

  /**
   * Share a file/blob
   */
  async shareBlob(data, metadata = {}) {
    return this._blob.share(data, metadata)
  }

  /**
   * Request a blob from a peer
   */
  async requestBlob(peerId, hash, onProgress) {
    return this._blob.requestBlob(peerId, hash, onProgress)
  }

  // === RPC API ===

  /**
   * Register an RPC method
   */
  registerMethod(method, handler) {
    this._rpc.register(method, handler)
  }

  /**
   * Call RPC method on peer
   */
  async callPeer(peerId, method, params) {
    return this._rpc.call(peerId, method, params)
  }

  /**
   * Broadcast to all peers
   */
  async broadcast(method, params) {
    return this._rpc.broadcast(this.getPeers(), method, params)
  }

  // === Events ===

  /**
   * Add event listener
   */
  on(event, handler) {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set())
    }
    this._handlers.get(event).add(handler)

    // Proxy some events
    switch (event) {
      case 'peer:connect':
        this._node.on('peer:connect', handler)
        break
      case 'peer:disconnect':
        this._node.on('peer:disconnect', handler)
        break
      case 'update':
        this._room.on('update', handler)
        break
    }
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    if (this._handlers.has(event)) {
      this._handlers.get(event).delete(handler)
    }

    switch (event) {
      case 'peer:connect':
        this._node.off('peer:connect', handler)
        break
      case 'peer:disconnect':
        this._node.off('peer:disconnect', handler)
        break
      case 'update':
        this._room.off('update', handler)
        break
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
          console.error('Event handler error:', err)
        }
      }
    }
  }

  // === Lifecycle ===

  /**
   * Stop P2P
   */
  async stop() {
    console.log('🌐 Stopping Konomi P2P...')

    // Remove UI
    removeStatusUI()

    // Stop services
    await Promise.all([
      this._discovery.stop(),
      this._relay.stop(),
      this._signal.stop(),
      this._blob.stop(),
      this._rpc.stop()
    ])

    // Leave all rooms
    this._rooms.destroy()

    // Stop node
    await this._node.stop()

    // Clear global
    if (typeof window !== 'undefined') {
      delete window.konomiP2P
    }

    console.log('🌐 Konomi P2P stopped')
  }

  // === Stats ===

  /**
   * Get connection stats
   */
  getStats() {
    return {
      peerId: this.peerId,
      roomId: this.roomId,
      connectedPeers: this.getAllPeers().length,
      roomPeers: this.getPeers().length,
      users: this.getUsers().length,
      multiaddrs: this._node.multiaddrs
    }
  }
}

export default {
  injectP2P,
  KonomiP2P
}
