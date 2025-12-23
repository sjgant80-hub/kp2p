/**
 * Konomi P2P
 * Peer-to-peer client for GitHub Pages
 * No server needed - discovery, sync, offline, encrypted, real-time collaboration
 */

// Core
export { Identity, IdentityManager, loadIdentity, getIdentityManager } from './core/identity.js'
export { PeerInfo, PeerStore, createPeerId, toBase58, fromBase58 } from './core/peer.js'
export {
  KeyPair,
  encrypt,
  decrypt,
  sign,
  verify,
  hash,
  randomBytes,
  toBase64,
  fromBase64,
  toHex,
  fromHex,
  generateSigningKeyPair,
  generateBoxKeyPair,
  deriveSharedSecret
} from './core/crypto.js'
export { Store, LRUCache, BlobStore, getStore, getBlobStore } from './core/store.js'

// Config
export { createConfig, BOOTSTRAP_PEERS, PROTOCOLS, TOPICS } from './config.js'

// Network
export { createNode, P2PNode, getNode, startNode } from './network/libp2p.js'
export {
  TransportType,
  parseMultiaddr,
  getTransportType,
  isRelayAddr,
  isWebRTCAddr,
  isWebSocketAddr,
  ConnectionQuality,
  BandwidthEstimator,
  TransportManager
} from './network/transport.js'
export { DiscoveryManager, RoomDiscovery } from './network/discovery.js'
export { RelayManager, ReservationStatus } from './network/relay.js'
export { NATManager, ICEManager, ConnectionStrategy, NATType } from './network/nat.js'

// Sync
export { KonomiP2PProvider, createRoomProvider, MessageType } from './sync/provider.js'
export {
  AwarenessManager,
  CursorOverlay,
  PresenceState,
  USER_COLORS,
  getRandomColor
} from './sync/awareness.js'
export { Room, RoomManager, RoomState } from './sync/room.js'
export { IndexedDBPersistence, OfflineQueue, SyncManager } from './sync/persistence.js'

// Protocols
export { SignalManager, RTCNegotiator, SignalType } from './protocols/signal.js'
export { SyncProtocol, StateVectorUtils, SyncMessageType } from './protocols/sync.js'
export { BlobProtocol, ChunkedReader, TransferState, BlobMessageType } from './protocols/blob.js'
export { RPCProtocol, RPCClient, RPCError, ErrorCode, RPCMessageType } from './protocols/rpc.js'

// Bridge
export { injectP2P, KonomiP2P } from './bridge/inject.js'
export {
  StorageInterceptor,
  FetchInterceptor,
  HistoryInterceptor,
  CookieInterceptor,
  createInterceptors
} from './bridge/intercept.js'
export {
  FormAdapter,
  CanvasAdapter,
  ContentEditableAdapter,
  ListAdapter,
  createAdapters
} from './bridge/adapter.js'
export { injectStatusUI, removeStatusUI, showToast, showModal } from './bridge/ui.js'

// Service Worker
export {
  BackgroundSyncManager,
  ConnectionStatus,
  NetworkQuality,
  getSyncManager,
  getConnectionStatus,
  getNetworkQuality
} from './sw/sync-manager.js'

// Re-export Yjs for convenience
export { Doc as YDoc, Map as YMap, Array as YArray, Text as YText } from 'yjs'

// Default export - main injection function
export { injectP2P as default } from './bridge/inject.js'
