/**
 * @file src/network/udts.js
 * @desc Unified UDT definitions for Network modules (Discovery, Transport, Relay, NAT)
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
// TRANSPORT TYPES
// ============================================================================

/**
 * Transport type enum (minified)
 */
export const TRANSPORT_TYPE_UDT = {
  N: 'TransportType',
  C: 'transport',
  D: 'Network transport protocols',
  V: {
    WR: { N: 'webrtc', D: 'WebRTC peer-to-peer', V: 'webrtc' },
    WS: { N: 'websocket', D: 'WebSocket to server', V: 'websocket' },
    CR: { N: 'circuit_relay', D: 'Relay via third peer', V: 'circuit-relay' },
    TC: { N: 'tcp', D: 'Direct TCP (non-browser)', V: 'tcp' },
    QC: { N: 'quic', D: 'QUIC transport', V: 'quic' },
  },
};

/**
 * Connection quality labels (minified)
 */
export const QUALITY_LABEL_UDT = {
  N: 'QualityLabel',
  C: 'transport',
  D: 'Connection quality categories',
  V: {
    E: { N: 'excellent', D: 'Score >= 80', V: 'excellent' },
    G: { N: 'good', D: 'Score 60-79', V: 'good' },
    F: { N: 'fair', D: 'Score 40-59', V: 'fair' },
    P: { N: 'poor', D: 'Score 20-39', V: 'poor' },
    B: { N: 'bad', D: 'Score < 20', V: 'bad' },
  },
};

/**
 * Latency measurement structure (minified)
 */
export const LATENCY_SAMPLE_UDT = {
  N: 'LatencySample',
  C: 'transport',
  D: 'Single latency measurement',
  P: {
    L: { N: 'latency', T: 'number', D: 'RTT in milliseconds', R: true },
    TS: { N: 'timestamp', T: 'number', D: 'Measurement time', R: true },
  },
};

/**
 * Bandwidth sample structure (minified)
 */
export const BANDWIDTH_SAMPLE_UDT = {
  N: 'BandwidthSample',
  C: 'transport',
  D: 'Bandwidth measurement sample',
  P: {
    BPS: { N: 'bytesPerSecond', T: 'number', D: 'Bytes per second', R: true },
    TS: { N: 'timestamp', T: 'number', D: 'Measurement time', R: true },
  },
};

/**
 * Connection quality stats (minified)
 */
export const CONN_QUALITY_UDT = {
  N: 'ConnectionQuality',
  C: 'transport',
  D: 'Connection quality metrics',
  P: {
    AL: { N: 'avgLatency', T: 'number', D: 'Average latency (ms)', R: true },
    J: { N: 'jitter', T: 'number', D: 'Latency variance (ms)', R: true },
    S: { N: 'score', T: 'number', D: 'Quality score (0-100)', R: true },
    L: { N: 'label', T: 'QualityLabel', D: 'Quality category', R: true },
    SC: { N: 'sampleCount', T: 'number', D: 'Number of samples', R: true },
  },
};

/**
 * Multiaddr parsed structure (minified)
 */
export const MULTIADDR_UDT = {
  N: 'Multiaddr',
  C: 'transport',
  D: 'Parsed multiaddr components',
  P: {
    T: { N: 'transport', T: 'TransportType', D: 'Transport protocol', R: true },
    H: { N: 'host', T: 'string', D: 'IP or hostname', O: true },
    PT: { N: 'port', T: 'number', D: 'Port number', O: true },
    ID: { N: 'peerId', T: 'string', D: 'Peer ID component', O: true },
    RL: { N: 'relay', T: 'boolean', D: 'Is relay address', R: true },
    R: { N: 'raw', T: 'string', D: 'Raw multiaddr string', R: true },
  },
};

// ============================================================================
// DISCOVERY TYPES
// ============================================================================

/**
 * Discovery event types (minified)
 */
export const DISCOVERY_EVENT_UDT = {
  N: 'DiscoveryEvent',
  C: 'discovery',
  D: 'Peer discovery event types',
  V: {
    D: { N: 'discovered', D: 'Peer found', V: 'peer:discovered' },
    C: { N: 'connected', D: 'Peer connected', V: 'peer:connected' },
    L: { N: 'lost', D: 'Peer disconnected', V: 'peer:lost' },
    A: { N: 'announce', D: 'Self announcement', V: 'announce' },
  },
};

/**
 * Announcement message structure (minified)
 */
export const ANNOUNCE_MSG_UDT = {
  N: 'AnnounceMessage',
  C: 'discovery',
  D: 'Peer presence announcement',
  P: {
    T: { N: 'type', T: 'string', D: 'Message type (announce)', R: true, X: 'announce' },
    ID: { N: 'peerId', T: 'string', D: 'Announcing peer ID', R: true },
    AD: { N: 'addrs', T: 'string[]', D: 'Known multiaddrs', R: true },
    RM: { N: 'rooms', T: 'string[]', D: 'Joined room IDs', O: true },
    TS: { N: 'ts', T: 'number', D: 'Announcement time', R: true },
  },
};

/**
 * Room presence message (minified)
 */
export const PRESENCE_MSG_UDT = {
  N: 'PresenceMessage',
  C: 'discovery',
  D: 'Room presence announcement',
  P: {
    T: { N: 'type', T: 'string', D: 'Message type (presence)', R: true, X: 'presence' },
    ID: { N: 'peerId', T: 'string', D: 'Peer ID', R: true },
    TS: { N: 'ts', T: 'number', D: 'Presence time', R: true },
  },
};

/**
 * Discovery manager config (minified)
 */
export const DISCOVERY_CONFIG_UDT = {
  N: 'DiscoveryConfig',
  C: 'discovery',
  D: 'Discovery manager configuration',
  P: {
    AI: { N: 'announceInterval', T: 'number', D: 'Announce interval (ms)', R: false, X: 30000 },
    ST: { N: 'staleTimeout', T: 'number', D: 'Stale peer timeout (ms)', R: false, X: 300000 },
  },
};

// ============================================================================
// RELAY TYPES
// ============================================================================

/**
 * Relay reservation status (minified)
 */
export const RESERVATION_STATUS_UDT = {
  N: 'ReservationStatus',
  C: 'relay',
  D: 'Circuit relay reservation states',
  V: {
    N: { N: 'none', D: 'No reservation', V: 'none' },
    P: { N: 'pending', D: 'Request in progress', V: 'pending' },
    A: { N: 'active', D: 'Reservation active', V: 'active' },
    E: { N: 'expired', D: 'Reservation expired', V: 'expired' },
    F: { N: 'failed', D: 'Reservation failed', V: 'failed' },
  },
};

/**
 * Relay reservation info (minified)
 */
export const RESERVATION_UDT = {
  N: 'Reservation',
  C: 'relay',
  D: 'Relay reservation information',
  P: {
    S: { N: 'status', T: 'ReservationStatus', D: 'Current status', R: true },
    C: { N: 'createdAt', T: 'number', D: 'Creation time', R: true },
    E: { N: 'expiresAt', T: 'number', D: 'Expiration time', O: true },
    ER: { N: 'error', T: 'string', D: 'Error message if failed', O: true },
  },
};

/**
 * Relay manager config (minified)
 */
export const RELAY_CONFIG_UDT = {
  N: 'RelayConfig',
  C: 'relay',
  D: 'Relay manager configuration',
  P: {
    MR: { N: 'maxReservations', T: 'number', D: 'Max concurrent reservations', R: false, X: 3 },
    TL: { N: 'reservationTTL', T: 'number', D: 'Reservation lifetime (ms)', R: false, X: 3600000 },
  },
};

/**
 * Relay stats (minified)
 */
export const RELAY_STATS_UDT = {
  N: 'RelayStats',
  C: 'relay',
  D: 'Relay connection statistics',
  P: {
    T: { N: 'total', T: 'number', D: 'Total reservations', R: true },
    A: { N: 'active', T: 'number', D: 'Active count', R: true },
    P: { N: 'pending', T: 'number', D: 'Pending count', R: true },
    E: { N: 'expired', T: 'number', D: 'Expired count', R: true },
    F: { N: 'failed', T: 'number', D: 'Failed count', R: true },
  },
};

// ============================================================================
// NAT TYPES
// ============================================================================

/**
 * Connection strategy enum (minified)
 */
export const CONN_STRATEGY_UDT = {
  N: 'ConnectionStrategy',
  C: 'nat',
  D: 'NAT traversal strategies (priority order)',
  V: {
    D: { N: 'direct', D: 'Direct connection', V: 'direct' },
    H: { N: 'hole_punch', D: 'UDP hole punching', V: 'hole-punch' },
    R: { N: 'relay', D: 'Circuit relay', V: 'relay' },
    T: { N: 'turn', D: 'TURN server relay', V: 'turn' },
  },
};

/**
 * NAT type enum (minified)
 */
export const NAT_TYPE_UDT = {
  N: 'NATType',
  C: 'nat',
  D: 'Detected NAT type',
  V: {
    U: { N: 'unknown', D: 'Not yet determined', V: 'unknown' },
    O: { N: 'open', D: 'No NAT / public IP', V: 'open' },
    FC: { N: 'full_cone', D: 'Full cone NAT (easy)', V: 'full-cone' },
    R: { N: 'restricted', D: 'Restricted cone NAT', V: 'restricted' },
    PR: { N: 'port_restricted', D: 'Port-restricted NAT', V: 'port-restricted' },
    S: { N: 'symmetric', D: 'Symmetric NAT (hardest)', V: 'symmetric' },
  },
};

/**
 * ICE candidate type (minified)
 */
export const ICE_TYPE_UDT = {
  N: 'ICECandidateType',
  C: 'nat',
  D: 'WebRTC ICE candidate types',
  V: {
    H: { N: 'host', D: 'Local network address', V: 'host' },
    S: { N: 'srflx', D: 'Server reflexive (STUN)', V: 'srflx' },
    R: { N: 'relay', D: 'Relay (TURN)', V: 'relay' },
    P: { N: 'prflx', D: 'Peer reflexive', V: 'prflx' },
  },
};

/**
 * Connection attempt tracking (minified)
 */
export const CONN_ATTEMPT_UDT = {
  N: 'ConnectionAttempt',
  C: 'nat',
  D: 'NAT traversal connection attempt',
  P: {
    ID: { N: 'peerId', T: 'string', D: 'Target peer ID', R: true },
    ST: { N: 'startTime', T: 'number', D: 'Attempt start time', R: true },
    ET: { N: 'endTime', T: 'number', D: 'Attempt end time', O: true },
    D: { N: 'duration', T: 'number', D: 'Total duration (ms)', O: true },
    S: { N: 'strategies', T: 'StrategyResult[]', D: 'Tried strategies', R: true },
  },
};

/**
 * Strategy result (minified)
 */
export const STRATEGY_RESULT_UDT = {
  N: 'StrategyResult',
  C: 'nat',
  D: 'Result of a connection strategy attempt',
  P: {
    T: { N: 'type', T: 'ConnectionStrategy', D: 'Strategy used', R: true },
    S: { N: 'success', T: 'boolean', D: 'Whether it worked', R: true },
    ER: { N: 'error', T: 'string', D: 'Error if failed', O: true },
    AD: { N: 'addr', T: 'string', D: 'Address used', O: true },
  },
};

/**
 * NAT connection stats (minified)
 */
export const NAT_STATS_UDT = {
  N: 'NATStats',
  C: 'nat',
  D: 'NAT traversal statistics',
  P: {
    AT: { N: 'attempts', T: 'number', D: 'Total connection attempts', R: true },
    SC: { N: 'successful', T: 'number', D: 'Successful connections', R: true },
    FL: { N: 'failed', T: 'number', D: 'Failed connections', R: true },
    BY: { N: 'byStrategy', T: 'object', D: 'Count by strategy', R: true },
    AV: { N: 'avgTime', T: 'number', D: 'Average connection time', R: true },
  },
};

/**
 * ICE candidate analysis (minified)
 */
export const ICE_ANALYSIS_UDT = {
  N: 'ICEAnalysis',
  C: 'nat',
  D: 'ICE candidate type breakdown',
  P: {
    H: { N: 'host', T: 'number', D: 'Host candidate count', R: true },
    S: { N: 'srflx', T: 'number', D: 'STUN candidate count', R: true },
    R: { N: 'relay', T: 'number', D: 'TURN candidate count', R: true },
    P: { N: 'prflx', T: 'number', D: 'Peer reflexive count', R: true },
  },
};

// ============================================================================
// REGISTRY
// ============================================================================

/**
 * All Network UDTs organized by category
 */
export const NETWORK_UDTS = {
  transport: {
    TransportType: TRANSPORT_TYPE_UDT,
    QualityLabel: QUALITY_LABEL_UDT,
    LatencySample: LATENCY_SAMPLE_UDT,
    BandwidthSample: BANDWIDTH_SAMPLE_UDT,
    ConnectionQuality: CONN_QUALITY_UDT,
    Multiaddr: MULTIADDR_UDT,
  },
  discovery: {
    DiscoveryEvent: DISCOVERY_EVENT_UDT,
    AnnounceMessage: ANNOUNCE_MSG_UDT,
    PresenceMessage: PRESENCE_MSG_UDT,
    DiscoveryConfig: DISCOVERY_CONFIG_UDT,
  },
  relay: {
    ReservationStatus: RESERVATION_STATUS_UDT,
    Reservation: RESERVATION_UDT,
    RelayConfig: RELAY_CONFIG_UDT,
    RelayStats: RELAY_STATS_UDT,
  },
  nat: {
    ConnectionStrategy: CONN_STRATEGY_UDT,
    NATType: NAT_TYPE_UDT,
    ICECandidateType: ICE_TYPE_UDT,
    ConnectionAttempt: CONN_ATTEMPT_UDT,
    StrategyResult: STRATEGY_RESULT_UDT,
    NATStats: NAT_STATS_UDT,
    ICEAnalysis: ICE_ANALYSIS_UDT,
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

export default NETWORK_UDTS;
