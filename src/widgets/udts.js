/**
 * @t 200|Telephony UDTs|v1.0
 * @h {C:"phone,voip,mesh",L:"MIT"}
 * @p P2P decentralized phone system types
 * @a dial→ring→connect→talk→hangup
 */

// ============================================================================
// CALL STATE TYPES
// ============================================================================

export const CALL_STATE_UDT = {
  N: 'CallState',
  C: 'phone',
  D: 'Phone call states',
  V: {
    ID: { N: 'idle', D: 'No active call', V: 'idle' },
    DL: { N: 'dialing', D: 'Outgoing call', V: 'dialing' },
    RG: { N: 'ringing', D: 'Incoming call', V: 'ringing' },
    CN: { N: 'connecting', D: 'Setting up call', V: 'connecting' },
    AC: { N: 'active', D: 'Call in progress', V: 'active' },
    HD: { N: 'hold', D: 'Call on hold', V: 'hold' },
    ED: { N: 'ended', D: 'Call ended', V: 'ended' },
    FL: { N: 'failed', D: 'Call failed', V: 'failed' },
  },
};

export const CALL_TYPE_UDT = {
  N: 'CallType',
  C: 'phone',
  D: 'Types of calls',
  V: {
    V: { N: 'voice', D: 'Voice only', V: 'voice' },
    VD: { N: 'video', D: 'Video call', V: 'video' },
    EM: { N: 'emergency', D: 'Emergency call', V: 'emergency' },
    CF: { N: 'conference', D: 'Multi-party', V: 'conference' },
  },
};

export const CALL_DIRECTION_UDT = {
  N: 'CallDirection',
  C: 'phone',
  D: 'Call direction',
  V: {
    I: { N: 'incoming', D: 'Received call', V: 'incoming' },
    O: { N: 'outgoing', D: 'Made call', V: 'outgoing' },
    M: { N: 'missed', D: 'Missed call', V: 'missed' },
  },
};

export const CALL_END_REASON_UDT = {
  N: 'CallEndReason',
  C: 'phone',
  D: 'Why call ended',
  V: {
    HU: { N: 'hangup', D: 'Normal hangup', V: 'hangup' },
    RJ: { N: 'rejected', D: 'Call rejected', V: 'rejected' },
    BS: { N: 'busy', D: 'Line busy', V: 'busy' },
    NA: { N: 'no_answer', D: 'No answer', V: 'no_answer' },
    NE: { N: 'network_error', D: 'Network failed', V: 'network_error' },
    TO: { N: 'timeout', D: 'Timed out', V: 'timeout' },
  },
};

// ============================================================================
// CALL RECORD TYPES
// ============================================================================

export const CALL_RECORD_UDT = {
  N: 'CallRecord',
  C: 'phone',
  D: 'Call history entry',
  P: {
    ID: { N: 'id', T: 'string', D: 'Call ID', R: 1 },
    T: { N: 'type', T: 'CallType', D: 'Call type', R: 1 },
    D: { N: 'direction', T: 'CallDirection', D: 'Direction', R: 1 },
    S: { N: 'state', T: 'CallState', D: 'Final state', R: 1 },
    P: { N: 'peerId', T: 'string', D: 'Remote peer', R: 1 },
    PN: { N: 'peerNumber', T: 'string', D: 'Phone number', O: 1 },
    PNM: { N: 'peerName', T: 'string', D: 'Display name', O: 1 },
    ST: { N: 'startTime', T: 'number', D: 'Start timestamp', R: 1 },
    CT: { N: 'connectTime', T: 'number', D: 'Connect time', O: 1 },
    ET: { N: 'endTime', T: 'number', D: 'End timestamp', O: 1 },
    DR: { N: 'duration', T: 'number', D: 'Duration (sec)', O: 1 },
    ER: { N: 'endReason', T: 'CallEndReason', D: 'End reason', O: 1 },
  },
};

export const ACTIVE_CALL_UDT = {
  N: 'ActiveCall',
  C: 'phone',
  D: 'Currently active call',
  P: {
    ID: { N: 'id', T: 'string', D: 'Call ID', R: 1 },
    T: { N: 'type', T: 'CallType', D: 'Call type', R: 1 },
    D: { N: 'direction', T: 'CallDirection', D: 'Direction', R: 1 },
    S: { N: 'state', T: 'CallState', D: 'Current state', R: 1 },
    P: { N: 'peerId', T: 'string', D: 'Remote peer', R: 1 },
    PN: { N: 'peerNumber', T: 'string', D: 'Phone number', O: 1 },
    PNM: { N: 'peerName', T: 'string', D: 'Display name', O: 1 },
    M: { N: 'muted', T: 'boolean', D: 'Is muted', X: false },
    SP: { N: 'speaker', T: 'boolean', D: 'Speaker on', X: false },
    VD: { N: 'video', T: 'boolean', D: 'Video enabled', X: false },
    ST: { N: 'startTime', T: 'number', D: 'Start timestamp', R: 1 },
  },
};

// ============================================================================
// CONTACT TYPES
// ============================================================================

export const CONTACT_UDT = {
  N: 'Contact',
  C: 'phone',
  D: 'Phone contact',
  P: {
    ID: { N: 'id', T: 'string', D: 'Contact ID', R: 1 },
    N: { N: 'name', T: 'string', D: 'Display name', R: 1 },
    P: { N: 'peerId', T: 'string', D: 'Mesh peer ID', O: 1 },
    PN: { N: 'phoneNumber', T: 'string', D: 'Phone number', O: 1 },
    AV: { N: 'avatar', T: 'string', D: 'Avatar URL', O: 1 },
    ON: { N: 'online', T: 'boolean', D: 'Is online', X: false },
    LS: { N: 'lastSeen', T: 'number', D: 'Last seen time', O: 1 },
    F: { N: 'favorite', T: 'boolean', D: 'Is favorite', X: false },
    B: { N: 'blocked', T: 'boolean', D: 'Is blocked', X: false },
  },
};

// ============================================================================
// MESH ROUTING TYPES
// ============================================================================

export const ROUTE_UDT = {
  N: 'Route',
  C: 'mesh',
  D: 'Network route to peer',
  P: {
    T: { N: 'target', T: 'string', D: 'Target peer ID', R: 1 },
    NH: { N: 'nextHop', T: 'string', D: 'Next hop peer', R: 1 },
    H: { N: 'hops', T: 'number', D: 'Hop count', R: 1 },
    P: { N: 'path', T: 'string[]', D: 'Full path', O: 1 },
    TS: { N: 'timestamp', T: 'number', D: 'Route timestamp', R: 1 },
    Q: { N: 'quality', T: 'number', D: 'Link quality 0-1', O: 1 },
  },
};

export const MESH_PEER_UDT = {
  N: 'MeshPeer',
  C: 'mesh',
  D: 'Connected mesh peer',
  P: {
    ID: { N: 'id', T: 'string', D: 'Peer ID', R: 1 },
    N: { N: 'name', T: 'string', D: 'Display name', O: 1 },
    T: { N: 'transport', T: 'string', D: 'Transport type', O: 1 },
    CT: { N: 'connectedAt', T: 'number', D: 'Connect time', R: 1 },
    LS: { N: 'lastSeen', T: 'number', D: 'Last seen', R: 1 },
    Q: { N: 'quality', T: 'number', D: 'Signal quality', O: 1 },
  },
};

// ============================================================================
// CODEC TYPES
// ============================================================================

export const AUDIO_CODEC_UDT = {
  N: 'AudioCodec',
  C: 'codec',
  D: 'Audio codec config',
  V: {
    OP: { N: 'opus', D: 'Opus (best)', V: 'opus', X: { rate: 48000, ch: 2, br: 32000 } },
    G7: { N: 'g722', D: 'G.722 HD', V: 'G722', X: { rate: 16000, ch: 1, br: 64000 } },
    PC: { N: 'pcmu', D: 'G.711 uLaw', V: 'PCMU', X: { rate: 8000, ch: 1, br: 64000 } },
  },
};

export const VIDEO_CODEC_UDT = {
  N: 'VideoCodec',
  C: 'codec',
  D: 'Video codec config',
  V: {
    V8: { N: 'vp8', D: 'VP8', V: 'VP8', X: { w: 640, h: 480, fps: 30 } },
    V9: { N: 'vp9', D: 'VP9 HD', V: 'VP9', X: { w: 1280, h: 720, fps: 30 } },
    H4: { N: 'h264', D: 'H.264', V: 'H264', X: { w: 1920, h: 1080, fps: 30 } },
  },
};

// ============================================================================
// SIGNALING TYPES
// ============================================================================

export const CELL_SIGNAL_UDT = {
  N: 'CellSignal',
  C: 'signal',
  D: 'Cell signaling message types',
  V: {
    // Call
    CO: { N: 'call_offer', D: 'Outgoing call', V: 'call:offer' },
    CA: { N: 'call_answer', D: 'Accept call', V: 'call:answer' },
    CR: { N: 'call_reject', D: 'Reject call', V: 'call:reject' },
    CH: { N: 'call_hangup', D: 'End call', V: 'call:hangup' },
    CB: { N: 'call_busy', D: 'Line busy', V: 'call:busy' },
    CHL: { N: 'call_hold', D: 'Put on hold', V: 'call:hold' },
    CRS: { N: 'call_resume', D: 'Resume call', V: 'call:resume' },
    // ICE/WebRTC
    IC: { N: 'ice_candidate', D: 'ICE candidate', V: 'ice:candidate' },
    SO: { N: 'sdp_offer', D: 'SDP offer', V: 'sdp:offer' },
    SA: { N: 'sdp_answer', D: 'SDP answer', V: 'sdp:answer' },
    // Routing
    RQ: { N: 'route_request', D: 'Find route', V: 'route:request' },
    RP: { N: 'route_reply', D: 'Route found', V: 'route:reply' },
    RE: { N: 'route_error', D: 'Route failed', V: 'route:error' },
  },
};

export const CALL_OFFER_UDT = {
  N: 'CallOffer',
  C: 'signal',
  D: 'Outgoing call offer',
  P: {
    T: { N: 'type', T: 'string', D: 'Signal type', R: 1, X: 'call:offer' },
    CI: { N: 'callId', T: 'string', D: 'Call ID', R: 1 },
    CT: { N: 'callType', T: 'CallType', D: 'Call type', R: 1 },
    F: { N: 'from', T: 'string', D: 'Caller peer ID', R: 1 },
    FN: { N: 'fromNumber', T: 'string', D: 'Caller number', O: 1 },
    FNM: { N: 'fromName', T: 'string', D: 'Caller name', O: 1 },
    SDP: { N: 'sdp', T: 'string', D: 'SDP offer', R: 1 },
  },
};

// ============================================================================
// PHONE UI TYPES
// ============================================================================

export const DIALPAD_KEY_UDT = {
  N: 'DialpadKey',
  C: 'ui',
  D: 'Dialpad key info',
  V: {
    K1: { N: '1', D: '', V: '1' },
    K2: { N: '2', D: 'ABC', V: '2' },
    K3: { N: '3', D: 'DEF', V: '3' },
    K4: { N: '4', D: 'GHI', V: '4' },
    K5: { N: '5', D: 'JKL', V: '5' },
    K6: { N: '6', D: 'MNO', V: '6' },
    K7: { N: '7', D: 'PQRS', V: '7' },
    K8: { N: '8', D: 'TUV', V: '8' },
    K9: { N: '9', D: 'WXYZ', V: '9' },
    KS: { N: '*', D: '', V: '*' },
    K0: { N: '0', D: '+', V: '0' },
    KH: { N: '#', D: '', V: '#' },
  },
};

export const PHONE_VIEW_UDT = {
  N: 'PhoneView',
  C: 'ui',
  D: 'Phone UI views',
  V: {
    DP: { N: 'dialpad', D: 'Number entry', V: 'dialpad' },
    CT: { N: 'contacts', D: 'Contact list', V: 'contacts' },
    RC: { N: 'recent', D: 'Call history', V: 'recent' },
    MS: { N: 'mesh', D: 'Network status', V: 'mesh' },
    AC: { N: 'active_call', D: 'In-call screen', V: 'active_call' },
    IC: { N: 'incoming', D: 'Incoming call', V: 'incoming' },
  },
};

// ============================================================================
// REGISTRY
// ============================================================================

export const TELEPHONY_UDTS = {
  call: {
    CallState: CALL_STATE_UDT,
    CallType: CALL_TYPE_UDT,
    CallDirection: CALL_DIRECTION_UDT,
    CallEndReason: CALL_END_REASON_UDT,
    CallRecord: CALL_RECORD_UDT,
    ActiveCall: ACTIVE_CALL_UDT,
  },
  contact: {
    Contact: CONTACT_UDT,
  },
  mesh: {
    Route: ROUTE_UDT,
    MeshPeer: MESH_PEER_UDT,
  },
  codec: {
    AudioCodec: AUDIO_CODEC_UDT,
    VideoCodec: VIDEO_CODEC_UDT,
  },
  signal: {
    CellSignal: CELL_SIGNAL_UDT,
    CallOffer: CALL_OFFER_UDT,
  },
  ui: {
    DialpadKey: DIALPAD_KEY_UDT,
    PhoneView: PHONE_VIEW_UDT,
  },
};

export default TELEPHONY_UDTS;
