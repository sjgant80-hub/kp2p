/**
 * @t 250|Protocols UDTs|v1.0
 * @h {C:"signal,rpc,blob",L:"MIT"}
 * @p Protocol handlers for P2P communication
 * @a dial→stream→handle→respond
 */

// ============================================================================
// SIGNAL PROTOCOL TYPES
// ============================================================================

export const SIGNAL_TYPE_UDT = {
  N: 'SignalType',
  C: 'signal',
  D: 'WebRTC signaling types',
  V: {
    O: { N: 'offer', D: 'SDP offer', V: 'offer' },
    A: { N: 'answer', D: 'SDP answer', V: 'answer' },
    C: { N: 'candidate', D: 'ICE candidate', V: 'candidate' },
    R: { N: 'renegotiate', D: 'Renegotiation', V: 'renegotiate' },
    X: { N: 'close', D: 'Close connection', V: 'close' },
  },
};

export const SIGNAL_MSG_UDT = {
  N: 'SignalMessage',
  C: 'signal',
  D: 'WebRTC signal message',
  P: {
    T: { N: 'type', T: 'SignalType', D: 'Signal type', R: 1 },
    F: { N: 'from', T: 'string', D: 'Sender peer ID', R: 1 },
    TO: { N: 'to', T: 'string', D: 'Target peer ID', R: 1 },
    S: { N: 'sdp', T: 'string', D: 'SDP data', O: 1 },
    C: { N: 'candidate', T: 'object', D: 'ICE candidate', O: 1 },
    TS: { N: 'ts', T: 'number', D: 'Timestamp', R: 1 },
  },
};

// ============================================================================
// RPC PROTOCOL TYPES
// ============================================================================

export const RPC_MSG_TYPE_UDT = {
  N: 'RPCMessageType',
  C: 'rpc',
  D: 'RPC message types',
  V: {
    Q: { N: 'request', D: 'RPC request', V: 'request' },
    R: { N: 'response', D: 'RPC response', V: 'response' },
    E: { N: 'error', D: 'Error response', V: 'error' },
    N: { N: 'notification', D: 'No response needed', V: 'notification' },
  },
};

export const RPC_ERROR_CODE_UDT = {
  N: 'RPCErrorCode',
  C: 'rpc',
  D: 'JSON-RPC style error codes',
  V: {
    PE: { N: 'parse_error', D: 'Invalid JSON', V: -32700 },
    IR: { N: 'invalid_request', D: 'Bad request', V: -32600 },
    MNF: { N: 'method_not_found', D: 'Unknown method', V: -32601 },
    IP: { N: 'invalid_params', D: 'Bad params', V: -32602 },
    IE: { N: 'internal_error', D: 'Server error', V: -32603 },
    TO: { N: 'timeout', D: 'Request timeout', V: -32000 },
    CN: { N: 'cancelled', D: 'Request cancelled', V: -32001 },
  },
};

export const RPC_REQUEST_UDT = {
  N: 'RPCRequest',
  C: 'rpc',
  D: 'RPC request message',
  P: {
    T: { N: 'type', T: 'string', D: 'Message type', R: 1, X: 'request' },
    ID: { N: 'id', T: 'string', D: 'Request ID', R: 1 },
    M: { N: 'method', T: 'string', D: 'Method name', R: 1 },
    P: { N: 'params', T: 'any', D: 'Method params', O: 1 },
  },
};

export const RPC_RESPONSE_UDT = {
  N: 'RPCResponse',
  C: 'rpc',
  D: 'RPC response message',
  P: {
    T: { N: 'type', T: 'string', D: 'Message type', R: 1 },
    ID: { N: 'id', T: 'string', D: 'Request ID', R: 1 },
    R: { N: 'result', T: 'any', D: 'Method result', O: 1 },
    E: { N: 'error', T: 'RPCError', D: 'Error if failed', O: 1 },
  },
};

export const RPC_ERROR_UDT = {
  N: 'RPCError',
  C: 'rpc',
  D: 'RPC error object',
  P: {
    C: { N: 'code', T: 'number', D: 'Error code', R: 1 },
    M: { N: 'message', T: 'string', D: 'Error message', R: 1 },
    D: { N: 'data', T: 'any', D: 'Extra data', O: 1 },
  },
};

// ============================================================================
// BLOB PROTOCOL TYPES
// ============================================================================

export const BLOB_MSG_TYPE_UDT = {
  N: 'BlobMessageType',
  C: 'blob',
  D: 'Blob transfer message types',
  V: {
    Q: { N: 'request', D: 'Request blob', V: 0 },
    M: { N: 'metadata', D: 'Blob metadata', V: 1 },
    C: { N: 'chunk', D: 'Data chunk', V: 2 },
    A: { N: 'ack', D: 'Acknowledge', V: 3 },
    D: { N: 'complete', D: 'Transfer done', V: 4 },
    E: { N: 'error', D: 'Error', V: 5 },
    X: { N: 'cancel', D: 'Cancel transfer', V: 6 },
  },
};

export const TRANSFER_STATE_UDT = {
  N: 'TransferState',
  C: 'blob',
  D: 'Blob transfer states',
  V: {
    P: { N: 'pending', D: 'Not started', V: 'pending' },
    T: { N: 'transferring', D: 'In progress', V: 'transferring' },
    C: { N: 'complete', D: 'Finished', V: 'complete' },
    E: { N: 'error', D: 'Failed', V: 'error' },
    X: { N: 'cancelled', D: 'Cancelled', V: 'cancelled' },
  },
};

export const BLOB_META_UDT = {
  N: 'BlobMetadata',
  C: 'blob',
  D: 'Blob file metadata',
  P: {
    H: { N: 'hash', T: 'string', D: 'SHA-256 hash', R: 1 },
    S: { N: 'size', T: 'number', D: 'Size in bytes', R: 1 },
    N: { N: 'name', T: 'string', D: 'File name', O: 1 },
    T: { N: 'type', T: 'string', D: 'MIME type', O: 1 },
    C: { N: 'chunks', T: 'number', D: 'Chunk count', R: 1 },
  },
};

export const BLOB_CHUNK_UDT = {
  N: 'BlobChunk',
  C: 'blob',
  D: 'Blob data chunk',
  P: {
    T: { N: 'type', T: 'number', D: 'Message type', R: 1, X: 2 },
    I: { N: 'index', T: 'number', D: 'Chunk index', R: 1 },
    D: { N: 'data', T: 'number[]', D: 'Chunk data', R: 1 },
  },
};

export const TRANSFER_INFO_UDT = {
  N: 'TransferInfo',
  C: 'blob',
  D: 'Active transfer info',
  P: {
    ID: { N: 'id', T: 'string', D: 'Transfer ID', R: 1 },
    H: { N: 'hash', T: 'string', D: 'Blob hash', R: 1 },
    P: { N: 'peerId', T: 'string', D: 'Remote peer', R: 1 },
    S: { N: 'state', T: 'TransferState', D: 'Current state', R: 1 },
    PR: { N: 'progress', T: 'number', D: 'Progress 0-1', R: 1 },
    ST: { N: 'startTime', T: 'number', D: 'Start time', R: 1 },
    ET: { N: 'endTime', T: 'number', D: 'End time', O: 1 },
    ER: { N: 'error', T: 'string', D: 'Error message', O: 1 },
  },
};

// ============================================================================
// REGISTRY
// ============================================================================

export const PROTOCOL_UDTS = {
  signal: {
    SignalType: SIGNAL_TYPE_UDT,
    SignalMessage: SIGNAL_MSG_UDT,
  },
  rpc: {
    RPCMessageType: RPC_MSG_TYPE_UDT,
    RPCErrorCode: RPC_ERROR_CODE_UDT,
    RPCRequest: RPC_REQUEST_UDT,
    RPCResponse: RPC_RESPONSE_UDT,
    RPCError: RPC_ERROR_UDT,
  },
  blob: {
    BlobMessageType: BLOB_MSG_TYPE_UDT,
    TransferState: TRANSFER_STATE_UDT,
    BlobMetadata: BLOB_META_UDT,
    BlobChunk: BLOB_CHUNK_UDT,
    TransferInfo: TRANSFER_INFO_UDT,
  },
};

export const DEFAULT_CHUNK_SIZE = 64 * 1024; // 64KB

export default PROTOCOL_UDTS;
