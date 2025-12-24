/**
 * @file src/p2p/udts.js
 * @desc Unified UDT definitions for P2P modules (Mesh, Users, Chat, Status, Laser)
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
// MESH TYPES
// ============================================================================

/**
 * Mesh connection state enum (minified)
 */
export const MESH_STATE_UDT = {
  N: 'MeshState',
  C: 'mesh',
  D: 'WebRTC mesh connection states',
  V: {
    D: { N: 'disconnected', D: 'Not connected to tracker', V: 'disconnected' },
    C: { N: 'connecting', D: 'Connecting to tracker', V: 'connecting' },
    O: { N: 'open', D: 'Connected to tracker', V: 'open' },
    R: { N: 'reconnecting', D: 'Reconnecting after disconnect', V: 'reconnecting' },
  },
};

/**
 * DataChannel state enum (minified)
 */
export const DC_STATE_UDT = {
  N: 'DataChannelState',
  C: 'mesh',
  D: 'RTCDataChannel ready states',
  V: {
    C: { N: 'connecting', D: 'Channel connecting', V: 'connecting' },
    O: { N: 'open', D: 'Channel ready', V: 'open' },
    X: { N: 'closing', D: 'Channel closing', V: 'closing' },
    D: { N: 'closed', D: 'Channel closed', V: 'closed' },
  },
};

/**
 * ICE connection state enum (minified)
 */
export const ICE_STATE_UDT = {
  N: 'ICEConnectionState',
  C: 'mesh',
  D: 'WebRTC ICE connection states',
  V: {
    N: { N: 'new', D: 'Just created', V: 'new' },
    C: { N: 'checking', D: 'Gathering candidates', V: 'checking' },
    O: { N: 'connected', D: 'Connection established', V: 'connected' },
    P: { N: 'completed', D: 'ICE completed', V: 'completed' },
    D: { N: 'disconnected', D: 'Temporarily disconnected', V: 'disconnected' },
    F: { N: 'failed', D: 'Connection failed', V: 'failed' },
    X: { N: 'closed', D: 'Connection closed', V: 'closed' },
  },
};

/**
 * Signaling message types (minified)
 */
export const SIGNAL_TYPE_UDT = {
  N: 'SignalType',
  C: 'mesh',
  D: 'WebRTC signaling message types',
  V: {
    A: { N: 'announce', D: 'Room announcement', V: 'announce' },
    O: { N: 'offer', D: 'SDP offer', V: 'offer' },
    R: { N: 'answer', D: 'SDP answer', V: 'answer' },
    I: { N: 'ice', D: 'ICE candidate', V: 'ice' },
  },
};

/**
 * Announce message structure (minified)
 */
export const MESH_ANNOUNCE_UDT = {
  N: 'MeshAnnounce',
  C: 'mesh',
  D: 'WebTorrent tracker announce message',
  P: {
    A: { N: 'action', T: 'string', D: 'Action type (announce)', R: true, X: 'announce' },
    H: { N: 'info_hash', T: 'string', D: 'Room hash (SHA-1)', R: true },
    ID: { N: 'peer_id', T: 'string', D: 'Local peer ID', R: true },
    NW: { N: 'numwant', T: 'number', D: 'Max peers wanted', R: false, X: 10 },
    OF: { N: 'offers', T: 'Offer[]', D: 'SDP offers', O: true },
    TO: { N: 'to_peer_id', T: 'string', D: 'Target peer for answer', O: true },
    OI: { N: 'offer_id', T: 'string', D: 'Offer ID for answer', O: true },
    AN: { N: 'answer', T: 'Answer', D: 'SDP answer', O: true },
  },
};

/**
 * SDP offer structure (minified)
 */
export const SDP_OFFER_UDT = {
  N: 'SDPOffer',
  C: 'mesh',
  D: 'WebRTC SDP offer',
  P: {
    OI: { N: 'offer_id', T: 'string', D: 'Unique offer ID', R: true },
    O: { N: 'offer', T: 'object', D: 'SDP offer object', R: true },
  },
};

/**
 * SDP answer structure (minified)
 */
export const SDP_ANSWER_UDT = {
  N: 'SDPAnswer',
  C: 'mesh',
  D: 'WebRTC SDP answer',
  P: {
    S: { N: 'sdp', T: 'string', D: 'SDP string', R: true },
  },
};

/**
 * Mesh peer info (minified)
 */
export const MESH_PEER_UDT = {
  N: 'MeshPeer',
  C: 'mesh',
  D: 'Connected mesh peer info',
  P: {
    ID: { N: 'id', T: 'string', D: 'Peer ID', R: true },
    DC: { N: 'dataChannel', T: 'RTCDataChannel', D: 'Data channel', R: true },
    PC: { N: 'peerConnection', T: 'RTCPeerConnection', D: 'Peer connection', R: true },
    ST: { N: 'state', T: 'DataChannelState', D: 'Channel state', R: true },
    CT: { N: 'connectedAt', T: 'number', D: 'Connection time', O: true },
  },
};

// ============================================================================
// USER TYPES
// ============================================================================

/**
 * User presence state enum (minified)
 */
export const PRESENCE_STATE_UDT = {
  N: 'PresenceState',
  C: 'user',
  D: 'User online presence states',
  V: {
    O: { N: 'online', D: 'Active', V: 'online' },
    A: { N: 'away', D: 'Idle/away', V: 'away' },
    B: { N: 'busy', D: 'Do not disturb', V: 'busy' },
    X: { N: 'offline', D: 'Disconnected', V: 'offline' },
  },
};

/**
 * User info structure (minified)
 */
export const USER_INFO_UDT = {
  N: 'UserInfo',
  C: 'user',
  D: 'User presence information',
  P: {
    ID: { N: 'id', T: 'string', D: 'User/peer ID', R: true },
    N: { N: 'name', T: 'string', D: 'Display name', O: true },
    C: { N: 'color', T: 'string', D: 'User color (hex)', O: true },
    S: { N: 'state', T: 'PresenceState', D: 'Presence state', R: false, X: 'online' },
    A: { N: 'avatar', T: 'string', D: 'Avatar URL', O: true },
    LS: { N: 'lastSeen', T: 'number', D: 'Last activity time', O: true },
  },
};

/**
 * User list update message (minified)
 */
export const USER_UPDATE_UDT = {
  N: 'UserUpdate',
  C: 'user',
  D: 'User presence update message',
  P: {
    T: { N: 'type', T: 'string', D: 'Update type', R: true },
    U: { N: 'user', T: 'UserInfo', D: 'User data', R: true },
    TS: { N: 'timestamp', T: 'number', D: 'Update time', R: true },
  },
  // Update types
  X: {
    JOIN: 'join',
    LEAVE: 'leave',
    UPDATE: 'update',
  },
};

// ============================================================================
// CHAT TYPES
// ============================================================================

/**
 * Chat message type enum (minified)
 */
export const CHAT_TYPE_UDT = {
  N: 'ChatType',
  C: 'chat',
  D: 'Chat message types',
  V: {
    M: { N: 'message', D: 'Regular chat message', V: 'message' },
    S: { N: 'system', D: 'System notification', V: 'system' },
    A: { N: 'action', D: 'Action/emote (/me)', V: 'action' },
    R: { N: 'reaction', D: 'Emoji reaction', V: 'reaction' },
    T: { N: 'thread', D: 'Thread reply', V: 'thread' },
  },
};

/**
 * Chat message structure (minified)
 */
export const CHAT_MSG_UDT = {
  N: 'ChatMessage',
  C: 'chat',
  D: 'Chat message',
  P: {
    ID: { N: 'id', T: 'string', D: 'Message ID', R: true },
    T: { N: 'type', T: 'ChatType', D: 'Message type', R: true, X: 'message' },
    F: { N: 'from', T: 'string', D: 'Sender ID', R: true },
    N: { N: 'name', T: 'string', D: 'Sender name', O: true },
    X: { N: 'text', T: 'string', D: 'Message text', R: true },
    TS: { N: 'timestamp', T: 'number', D: 'Send time', R: true },
    RT: { N: 'replyTo', T: 'string', D: 'Parent message ID', O: true },
    E: { N: 'edited', T: 'boolean', D: 'Was edited', O: true },
  },
};

/**
 * Reaction structure (minified)
 */
export const REACTION_UDT = {
  N: 'Reaction',
  C: 'chat',
  D: 'Emoji reaction to message/content',
  P: {
    E: { N: 'emoji', T: 'string', D: 'Emoji character', R: true },
    F: { N: 'from', T: 'string', D: 'Reactor ID', R: true },
    TO: { N: 'to', T: 'string', D: 'Target message/content ID', O: true },
    TS: { N: 'timestamp', T: 'number', D: 'Reaction time', R: true },
  },
};

/**
 * Reaction counts (minified)
 */
export const REACTION_COUNTS_UDT = {
  N: 'ReactionCounts',
  C: 'chat',
  D: 'Aggregated reaction counts',
  P: {
    ID: { N: 'targetId', T: 'string', D: 'Target content ID', R: true },
    C: { N: 'counts', T: 'object', D: 'Emoji -> count map', R: true },
  },
  // Default emojis
  X: {
    DEFAULT_EMOJIS: ['👍', '❤️', '🎉', '💡', '🤔', '👏'],
  },
};

// ============================================================================
// STATUS TYPES
// ============================================================================

/**
 * Connection status enum (minified)
 */
export const CONN_STATUS_UDT = {
  N: 'ConnectionStatus',
  C: 'status',
  D: 'Overall connection status',
  V: {
    D: { N: 'disconnected', D: 'Not connected', V: 'disconnected' },
    C: { N: 'connecting', D: 'Connecting...', V: 'connecting' },
    O: { N: 'connected', D: 'Connected', V: 'connected' },
    E: { N: 'error', D: 'Connection error', V: 'error' },
    R: { N: 'reconnecting', D: 'Reconnecting...', V: 'reconnecting' },
  },
};

/**
 * Status indicator config (minified)
 */
export const STATUS_CONFIG_UDT = {
  N: 'StatusConfig',
  C: 'status',
  D: 'Status indicator configuration',
  P: {
    L: { N: 'labels', T: 'object', D: 'Status -> label map', R: false },
    CL: { N: 'colors', T: 'object', D: 'Status -> color map', O: true },
  },
  X: {
    DEFAULT_LABELS: {
      disconnected: '⚫ Offline',
      connecting: '🟡 Connecting...',
      connected: '🟢 Connected',
      error: '🔴 Error',
      reconnecting: '🟡 Reconnecting...',
    },
  },
};

// ============================================================================
// LASER POINTER TYPES
// ============================================================================

/**
 * Laser pointer position (minified)
 */
export const LASER_POS_UDT = {
  N: 'LaserPosition',
  C: 'laser',
  D: 'Shared cursor/laser pointer position',
  P: {
    ID: { N: 'id', T: 'string', D: 'Pointer owner ID', R: true },
    X: { N: 'x', T: 'number', D: 'X coordinate', R: true },
    Y: { N: 'y', T: 'number', D: 'Y coordinate', R: true },
    C: { N: 'color', T: 'string', D: 'Pointer color', O: true },
    V: { N: 'visible', T: 'boolean', D: 'Is visible', R: false, X: true },
  },
};

/**
 * Laser update message (minified)
 */
export const LASER_UPDATE_UDT = {
  N: 'LaserUpdate',
  C: 'laser',
  D: 'Laser pointer update message',
  P: {
    T: { N: 'type', T: 'string', D: 'Update type', R: true },
    P: { N: 'position', T: 'LaserPosition', D: 'Position data', O: true },
    ID: { N: 'id', T: 'string', D: 'Pointer ID', R: true },
  },
  X: {
    MOVE: 'move',
    SHOW: 'show',
    HIDE: 'hide',
  },
};

// ============================================================================
// P2P MESSAGE ENVELOPE
// ============================================================================

/**
 * P2P message types (minified)
 */
export const P2P_MSG_TYPE_UDT = {
  N: 'P2PMessageType',
  C: 'p2p',
  D: 'P2P data channel message types',
  V: {
    C: { N: 'chat', D: 'Chat message', V: 'chat' },
    U: { N: 'user', D: 'User update', V: 'user' },
    L: { N: 'laser', D: 'Laser pointer', V: 'laser' },
    R: { N: 'reaction', D: 'Reaction', V: 'reaction' },
    S: { N: 'sync', D: 'State sync', V: 'sync' },
    P: { N: 'ping', D: 'Keepalive ping', V: 'ping' },
  },
};

/**
 * P2P message envelope (minified)
 */
export const P2P_MSG_UDT = {
  N: 'P2PMessage',
  C: 'p2p',
  D: 'P2P data channel message envelope',
  P: {
    T: { N: 'type', T: 'P2PMessageType', D: 'Message type', R: true },
    D: { N: 'data', T: 'any', D: 'Message payload', R: true },
    F: { N: 'from', T: 'string', D: 'Sender ID', R: true },
    TS: { N: 'timestamp', T: 'number', D: 'Send time', R: true },
  },
};

// ============================================================================
// REGISTRY
// ============================================================================

/**
 * All P2P UDTs organized by category
 */
export const P2P_UDTS = {
  mesh: {
    MeshState: MESH_STATE_UDT,
    DataChannelState: DC_STATE_UDT,
    ICEConnectionState: ICE_STATE_UDT,
    SignalType: SIGNAL_TYPE_UDT,
    MeshAnnounce: MESH_ANNOUNCE_UDT,
    SDPOffer: SDP_OFFER_UDT,
    SDPAnswer: SDP_ANSWER_UDT,
    MeshPeer: MESH_PEER_UDT,
  },
  user: {
    PresenceState: PRESENCE_STATE_UDT,
    UserInfo: USER_INFO_UDT,
    UserUpdate: USER_UPDATE_UDT,
  },
  chat: {
    ChatType: CHAT_TYPE_UDT,
    ChatMessage: CHAT_MSG_UDT,
    Reaction: REACTION_UDT,
    ReactionCounts: REACTION_COUNTS_UDT,
  },
  status: {
    ConnectionStatus: CONN_STATUS_UDT,
    StatusConfig: STATUS_CONFIG_UDT,
  },
  laser: {
    LaserPosition: LASER_POS_UDT,
    LaserUpdate: LASER_UPDATE_UDT,
  },
  p2p: {
    P2PMessageType: P2P_MSG_TYPE_UDT,
    P2PMessage: P2P_MSG_UDT,
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

/**
 * Create a P2P message envelope
 */
export function createP2PMessage(type, data, from) {
  return {
    T: type,
    D: data,
    F: from,
    TS: Date.now(),
  };
}

/**
 * Parse a P2P message and expand it
 */
export function parseP2PMessage(msg) {
  return {
    type: msg.T,
    data: msg.D,
    from: msg.F,
    timestamp: msg.TS,
  };
}

export default P2P_UDTS;
