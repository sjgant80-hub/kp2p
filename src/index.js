/**
 * Konomi P2P
 * Peer-to-peer client for GitHub Pages
 * No server needed - discovery, sync, offline, encrypted, real-time collaboration
 *
 * AUTO-DISCOVERY: Modules are auto-loaded from src/*/index.js or src/*/*.js
 * Just add a new directory with exports and it will be included.
 */

// ============================================================================
// CORE
// ============================================================================
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

// ============================================================================
// CONFIG
// ============================================================================
export { createConfig, BOOTSTRAP_PEERS, PROTOCOLS, TOPICS } from './config.js'

// ============================================================================
// NETWORK
// ============================================================================
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

// ============================================================================
// TELEPHONY (KonoPhone / KonoTel / FreeComm)
// ============================================================================
export {
  CellNode,
  MeshCellNetwork,
  CALL_STATE,
  CALL_TYPE,
  CALL_END_REASON,
  CELL_SIGNAL,
  AUDIO_CODEC,
  VIDEO_CODEC
} from './network/cell.js'

export {
  KonoTel,
  VoiceML,
  SMSGateway,
  SIPClient,
  SIP_PROVIDERS,
  CALL_STATUS,
  SMS_STATUS,
  createKonoTelAPI
} from './network/konotel.js'

export {
  FreeCommNode,
  FreeCommMessage,
  StoreAndForward,
  SMSAdapter,
  LoRaAdapter,
  AudioModemAdapter,
  TransportAdapter,
  TRANSPORT,
  TRANSPORT_CAPS,
  PRIORITY,
  MSG_TYPE
} from './network/freecomm.js'

// ============================================================================
// SYNC
// ============================================================================
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

// ============================================================================
// PROTOCOLS
// ============================================================================
export { SignalManager, RTCNegotiator, SignalType } from './protocols/signal.js'
export { SyncProtocol, StateVectorUtils, SyncMessageType } from './protocols/sync.js'
export { BlobProtocol, ChunkedReader, TransferState, BlobMessageType } from './protocols/blob.js'
export { RPCProtocol, RPCClient, RPCError, ErrorCode, RPCMessageType } from './protocols/rpc.js'

// ============================================================================
// ENTERPRISE (ISA-95 / PackML / Sparkplug)
// ============================================================================
export {
  HierarchyNode,
  Enterprise,
  Site,
  Area,
  WorkCenter,
  WorkUnit,
  Equipment,
  LEVEL,
  STATE,
  MODE,
  MSG,
  ALARM_PRIORITY,
  QUALITY,
  TRANSITIONS,
  createValue,
  createExampleHierarchy
} from './enterprise/hierarchy.js'

export {
  MeshNode,
  EnterpriseMesh,
  createTopic,
  parseTopic
} from './enterprise/mesh.js'

// ============================================================================
// BRIDGE
// ============================================================================
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

// ============================================================================
// SERVICE WORKER
// ============================================================================
export {
  BackgroundSyncManager,
  ConnectionStatus,
  NetworkQuality,
  getSyncManager,
  getConnectionStatus,
  getNetworkQuality
} from './sw/sync-manager.js'

// ============================================================================
// UDTs (User Defined Types)
// ============================================================================
export {
  UDT_REGISTRY,
  getUDT,
  listUDTs,
  listDomains,
  searchUDTs,
  expandUDT,
  minify,
  expand,
  validate,
  getEnumValue,
  getEnumShortcode,
  getEnumValues,
  getPropertyNames,
  createDefault,
  generateDocs,
  generateDomainDocs,
  loadAllUDTs,
  getLoadStatus,
  registerModule,
  // Domain exports
  OS_UDTS,
  CORE_UDTS,
  NETWORK_UDTS,
  P2P_UDTS,
  SYNC_UDTS,
  PROTOCOL_UDTS,
  ENTERPRISE_UDTS,
  TELEPHONY_UDTS,
  LLM_TOOLS,
  TYPE_MAP,
  STYLE_MAP,
  SHORTCODES,
  ToolRegistry
} from './lib/udts/index.js'

// ============================================================================
// Y.JS (re-export for convenience)
// ============================================================================
export { Doc as YDoc, Map as YMap, Array as YArray, Text as YText } from 'yjs'

// ============================================================================
// DEFAULT EXPORT
// ============================================================================
export { injectP2P as default } from './bridge/inject.js'
