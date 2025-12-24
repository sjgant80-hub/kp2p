/**
 * @file src/core/udts.js
 * @desc Unified UDT definitions for Core modules (Identity, Peer, Protocol, Crypto)
 *
 * Minified tag format for compact storage/transmission.
 * Uses single-letter keys for common properties.
 *
 * KEY MAPPING:
 * N = name, T = type, D = description, V = values/variants
 * S = size, P = properties, R = required, O = optional
 * C = category, X = default value
 */

// ============================================================================
// CRYPTO TYPES
// ============================================================================

/**
 * Key type enum (minified)
 */
export const KEY_TYPE_UDT = {
  N: 'KeyType',
  C: 'crypto',
  D: 'Cryptographic key types',
  V: {
    S: { N: 'signing', D: 'Ed25519 signing key', V: 'signing' },
    B: { N: 'box', D: 'X25519 encryption key', V: 'box' },
    Y: { N: 'symmetric', D: 'Shared secret key', V: 'symmetric' },
  },
};

/**
 * Key pair structure (minified)
 */
export const KEY_PAIR_UDT = {
  N: 'KeyPair',
  C: 'crypto',
  D: 'Asymmetric key pair (public + secret)',
  P: {
    PK: { N: 'publicKey', T: 'Uint8Array', D: 'Public key bytes', R: true },
    SK: { N: 'secretKey', T: 'Uint8Array', D: 'Secret key bytes', R: true },
  },
  // Key sizes in bytes
  X: {
    SIGN_PK: 32,  // Ed25519 public key
    SIGN_SK: 64,  // Ed25519 secret key
    BOX_PK: 32,   // X25519 public key
    BOX_SK: 32,   // X25519 secret key
  },
};

/**
 * Full key bundle structure (minified)
 */
export const KEY_BUNDLE_UDT = {
  N: 'KeyBundle',
  C: 'crypto',
  D: 'Complete identity key bundle (signing + encryption)',
  P: {
    S: { N: 'signing', T: 'KeyPair', D: 'Ed25519 signing key pair', R: true },
    B: { N: 'box', T: 'KeyPair', D: 'X25519 encryption key pair', R: true },
  },
};

/**
 * Encrypted payload structure (minified)
 */
export const ENCRYPTED_UDT = {
  N: 'Encrypted',
  C: 'crypto',
  D: 'Encrypted payload with nonce',
  P: {
    N: { N: 'nonce', T: 'Uint8Array', D: 'Random nonce (24 bytes)', R: true },
    C: { N: 'ciphertext', T: 'Uint8Array', D: 'Encrypted data', R: true },
  },
  X: {
    NONCE_LEN: 24,
  },
};

/**
 * Signature structure (minified)
 */
export const SIGNATURE_UDT = {
  N: 'Signature',
  C: 'crypto',
  D: 'Detached Ed25519 signature',
  P: {
    S: { N: 'sig', T: 'Uint8Array', D: 'Signature bytes (64)', R: true },
    PK: { N: 'publicKey', T: 'Uint8Array', D: 'Signer public key', R: true },
    TS: { N: 'timestamp', T: 'number', D: 'Signing time', O: true },
  },
  X: {
    SIG_LEN: 64,
  },
};

// ============================================================================
// IDENTITY TYPES
// ============================================================================

/**
 * Identity metadata structure (minified)
 */
export const IDENTITY_META_UDT = {
  N: 'IdentityMeta',
  C: 'identity',
  D: 'User-facing identity metadata',
  P: {
    N: { N: 'name', T: 'string', D: 'Display name', O: true },
    A: { N: 'avatar', T: 'string', D: 'Avatar URL or data URI', O: true },
    C: { N: 'created', T: 'number', D: 'Creation timestamp', R: true },
  },
};

/**
 * Full identity structure (minified)
 */
export const IDENTITY_UDT = {
  N: 'Identity',
  C: 'identity',
  D: 'Complete cryptographic identity',
  P: {
    ID: { N: 'peerId', T: 'string', D: 'Base58-encoded peer ID', R: true },
    K: { N: 'keyPair', T: 'KeyBundle', D: 'Signing + encryption keys', R: true },
    M: { N: 'metadata', T: 'IdentityMeta', D: 'User metadata', R: true },
  },
};

/**
 * Public identity (safe to share) (minified)
 */
export const PUBLIC_IDENTITY_UDT = {
  N: 'PublicIdentity',
  C: 'identity',
  D: 'Public identity info (shareable)',
  P: {
    ID: { N: 'peerId', T: 'string', D: 'Base58 peer ID', R: true },
    PK: { N: 'publicKey', T: 'string', D: 'Base64 signing public key', R: true },
    BPK: { N: 'boxPublicKey', T: 'string', D: 'Base64 encryption public key', R: true },
    N: { N: 'name', T: 'string', D: 'Display name', O: true },
    A: { N: 'avatar', T: 'string', D: 'Avatar URL', O: true },
  },
};

// ============================================================================
// PEER TYPES
// ============================================================================

/**
 * Peer status enum (minified)
 */
export const PEER_STATUS_UDT = {
  N: 'PeerStatus',
  C: 'peer',
  D: 'Peer connection status',
  V: {
    U: { N: 'unknown', D: 'Unknown/new peer', V: 'unknown' },
    C: { N: 'connecting', D: 'Connection in progress', V: 'connecting' },
    O: { N: 'connected', D: 'Actively connected', V: 'connected' },
    D: { N: 'disconnected', D: 'Previously connected', V: 'disconnected' },
    B: { N: 'blocked', D: 'Blocked by user', V: 'blocked' },
  },
};

/**
 * Peer info structure (minified)
 */
export const PEER_INFO_UDT = {
  N: 'PeerInfo',
  C: 'peer',
  D: 'Information about a known peer',
  P: {
    ID: { N: 'id', T: 'string', D: 'Base58 peer ID', R: true },
    PK: { N: 'publicKey', T: 'Uint8Array', D: 'Signing public key', O: true },
    AD: { N: 'addrs', T: 'string[]', D: 'Known multiaddrs', R: true },
    PR: { N: 'protocols', T: 'string[]', D: 'Supported protocols', R: true },
    S: { N: 'seen', T: 'number', D: 'Last seen timestamp', R: true },
    L: { N: 'latency', T: 'number', D: 'RTT in ms (-1 = unknown)', R: true },
    SC: { N: 'score', T: 'number', D: 'Reputation score (-1000 to 1000)', R: true },
    TR: { N: 'trusted', T: 'boolean', D: 'Manually trusted', R: true },
    BL: { N: 'blocked', T: 'boolean', D: 'Manually blocked', R: true },
    M: { N: 'metadata', T: 'object', D: 'Custom metadata', O: true },
  },
  X: {
    SCORE_MIN: -1000,
    SCORE_MAX: 1000,
    STALE_TIMEOUT: 60000,
  },
};

/**
 * Peer address structure (multiaddr-like) (minified)
 */
export const PEER_ADDR_UDT = {
  N: 'PeerAddr',
  C: 'peer',
  D: 'Peer network address (multiaddr format)',
  P: {
    T: { N: 'transport', T: 'string', D: 'Transport type (tcp, ws, wrtc)', R: true },
    H: { N: 'host', T: 'string', D: 'Host or IP', R: true },
    P: { N: 'port', T: 'number', D: 'Port number', O: true },
    ID: { N: 'peerId', T: 'string', D: 'Target peer ID', O: true },
  },
};

// ============================================================================
// PROTOCOL TYPES
// ============================================================================

/**
 * Message type enum (minified)
 */
export const MSG_TYPE_UDT = {
  N: 'MessageType',
  C: 'protocol',
  D: 'Protocol message types',
  V: {
    Q: { N: 'request', D: 'Request (expects response)', V: 'req' },
    R: { N: 'response', D: 'Response to request', V: 'res' },
    S: { N: 'stream', D: 'Streaming data (no response)', V: 'stream' },
    E: { N: 'event', D: 'Broadcast event', V: 'event' },
  },
};

/**
 * Message envelope structure (minified)
 */
export const MESSAGE_UDT = {
  N: 'Message',
  C: 'protocol',
  D: 'Protocol message envelope',
  P: {
    ID: { N: 'id', T: 'string', D: 'Unique message ID (16 hex chars)', R: true },
    V: { N: 'v', T: 'number', D: 'Protocol version', R: true, X: 1 },
    T: { N: 'type', T: 'MessageType', D: 'Message type', R: true },
    F: { N: 'from', T: 'string', D: 'Sender peer ID', R: true },
    TO: { N: 'to', T: 'string', D: 'Recipient peer ID', O: true },
    A: { N: 'action', T: 'string', D: 'Action name (for req/event)', O: true },
    P: { N: 'payload', T: 'any', D: 'Message payload', O: true },
    RT: { N: 'replyTo', T: 'string', D: 'Original message ID (for response)', O: true },
    TS: { N: 'ts', T: 'number', D: 'Timestamp (epoch ms)', R: true },
    SG: { N: 'sig', T: 'Uint8Array', D: 'Detached signature', O: true },
  },
  X: {
    VERSION: 1,
    MAX_AGE: 5 * 60 * 1000, // 5 minutes
    ID_LEN: 16,
  },
};

/**
 * Protocol handler config (minified)
 */
export const PROTOCOL_CONFIG_UDT = {
  N: 'ProtocolConfig',
  C: 'protocol',
  D: 'Protocol handler configuration',
  P: {
    TO: { N: 'timeout', T: 'number', D: 'Request timeout (ms)', R: false, X: 30000 },
    KP: { N: 'keyPair', T: 'KeyBundle', D: 'Signing keys', O: true },
  },
};

/**
 * Pending request state (minified)
 */
export const PENDING_REQ_UDT = {
  N: 'PendingRequest',
  C: 'protocol',
  D: 'Pending request state',
  P: {
    ID: { N: 'id', T: 'string', D: 'Message ID', R: true },
    A: { N: 'action', T: 'string', D: 'Requested action', R: true },
    TO: { N: 'to', T: 'string', D: 'Target peer', R: true },
    TS: { N: 'timestamp', T: 'number', D: 'Request time', R: true },
    TM: { N: 'timer', T: 'number', D: 'Timeout timer ID', R: true },
  },
};

// ============================================================================
// REGISTRY
// ============================================================================

/**
 * All Core UDTs organized by category
 */
export const CORE_UDTS = {
  crypto: {
    KeyType: KEY_TYPE_UDT,
    KeyPair: KEY_PAIR_UDT,
    KeyBundle: KEY_BUNDLE_UDT,
    Encrypted: ENCRYPTED_UDT,
    Signature: SIGNATURE_UDT,
  },
  identity: {
    IdentityMeta: IDENTITY_META_UDT,
    Identity: IDENTITY_UDT,
    PublicIdentity: PUBLIC_IDENTITY_UDT,
  },
  peer: {
    PeerStatus: PEER_STATUS_UDT,
    PeerInfo: PEER_INFO_UDT,
    PeerAddr: PEER_ADDR_UDT,
  },
  protocol: {
    MessageType: MSG_TYPE_UDT,
    Message: MESSAGE_UDT,
    ProtocolConfig: PROTOCOL_CONFIG_UDT,
    PendingRequest: PENDING_REQ_UDT,
  },
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Expand minified UDT to full form
 */
export function expandUDT(udt) {
  const result = {
    name: udt.N,
    category: udt.C,
    description: udt.D,
  };

  if (udt.V) {
    result.values = {};
    for (const [k, v] of Object.entries(udt.V)) {
      result.values[v.N] = {
        shortcode: k,
        description: v.D,
        value: v.V,
      };
    }
  }

  if (udt.P) {
    result.properties = {};
    for (const [k, p] of Object.entries(udt.P)) {
      result.properties[p.N] = {
        shortcode: k,
        type: p.T,
        description: p.D,
        required: !!p.R,
        default: p.X,
      };
    }
  }

  if (udt.X) {
    result.constants = udt.X;
  }

  return result;
}

/**
 * Minify an object using UDT property shortcodes
 */
export function minify(obj, udt) {
  if (!udt.P) return obj;

  const result = {};
  for (const [shortcode, prop] of Object.entries(udt.P)) {
    if (obj[prop.N] !== undefined) {
      result[shortcode] = obj[prop.N];
    }
  }
  return result;
}

/**
 * Expand a minified object to full property names
 */
export function expand(obj, udt) {
  if (!udt.P) return obj;

  const result = {};
  for (const [shortcode, prop] of Object.entries(udt.P)) {
    if (obj[shortcode] !== undefined) {
      result[prop.N] = obj[shortcode];
    }
  }
  return result;
}

/**
 * Validate object against UDT
 */
export function validate(obj, udt) {
  const errors = [];

  if (udt.P) {
    for (const [shortcode, prop] of Object.entries(udt.P)) {
      const value = obj[prop.N] ?? obj[shortcode];
      if (prop.R && value === undefined) {
        errors.push(`Missing required property: ${prop.N} (${shortcode})`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get enum value by shortcode
 */
export function getEnumValue(udt, shortcode) {
  return udt.V?.[shortcode]?.V;
}

/**
 * Get enum shortcode by value
 */
export function getEnumShortcode(udt, value) {
  for (const [k, v] of Object.entries(udt.V || {})) {
    if (v.V === value) return k;
  }
  return null;
}

export default CORE_UDTS;
