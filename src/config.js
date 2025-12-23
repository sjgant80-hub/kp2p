/**
 * Konomi P2P Configuration
 * Default settings and bootstrap peers
 */

// Bootstrap relay peers for initial connection
export const BOOTSTRAP_PEERS = [
  // Public libp2p bootstrap nodes with WebSocket support
  '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb'
]

// Protocol identifiers
export const PROTOCOLS = {
  SIGNAL: '/konomi/signal/1.0.0',
  SYNC: '/konomi/sync/1.0.0',
  BLOB: '/konomi/blob/1.0.0',
  RPC: '/konomi/rpc/1.0.0',
  RELAY: '/konomi/relay/1.0.0'
}

// Topic prefixes for pubsub
export const TOPICS = {
  DISCOVERY: 'konomi:discovery:v1',
  ROOM_PREFIX: 'konomi:room:',
  SIGNAL_PREFIX: 'konomi:signal:'
}

// GossipSub configuration
export const GOSSIPSUB_CONFIG = {
  D: 6,           // target peers per topic
  Dlo: 4,         // minimum peers
  Dhi: 12,        // maximum peers
  heartbeatInterval: 1000,
  mcacheLength: 5,
  mcacheGossip: 3,
  emitSelf: false,
  gossipIncoming: true,
  fallbackToFloodsub: true,
  floodPublish: true
}

// Connection manager settings
export const CONNECTION_CONFIG = {
  minConnections: 5,
  maxConnections: 50,
  pollInterval: 2000,
  autoDialInterval: 10000
}

// IndexedDB settings
export const DB_CONFIG = {
  name: 'konomi-p2p',
  version: 1,
  stores: {
    identity: 'identity',
    peers: 'peers',
    rooms: 'rooms',
    messages: 'messages',
    blobs: 'blobs'
  }
}

// Cache settings
export const CACHE_CONFIG = {
  maxSize: 50 * 1024 * 1024, // 50MB
  strategy: 'lru'
}

// Sync settings
export const SYNC_CONFIG = {
  awarenessInterval: 30000,    // 30s keepalive
  awarenessTimeout: 60000,     // 60s timeout
  syncRequestDebounce: 100,
  updateDebounce: 50
}

// Crypto settings
export const CRYPTO_CONFIG = {
  algorithm: 'ed25519',
  nonceLength: 24,
  keyLength: 32
}

// Default configuration factory
export function createConfig(overrides = {}) {
  return {
    bootstrap: BOOTSTRAP_PEERS,
    protocols: PROTOCOLS,
    topics: TOPICS,
    gossipsub: { ...GOSSIPSUB_CONFIG, ...overrides.gossipsub },
    connection: { ...CONNECTION_CONFIG, ...overrides.connection },
    db: { ...DB_CONFIG, ...overrides.db },
    cache: { ...CACHE_CONFIG, ...overrides.cache },
    sync: { ...SYNC_CONFIG, ...overrides.sync },
    crypto: { ...CRYPTO_CONFIG, ...overrides.crypto },
    ...overrides
  }
}

export default createConfig
