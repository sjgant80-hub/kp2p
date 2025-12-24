/**
 * @t 250|Sync UDTs|v1.0
 * @h {C:"awareness,provider,room,persistence",L:"MIT"}
 * @p CRDT sync types for Y.js collaboration
 * @a load→sync→persist→broadcast
 */

// ============================================================================
// AWARENESS TYPES
// ============================================================================

export const PRESENCE_STATE_UDT = {
  N: 'PresenceState',
  C: 'awareness',
  D: 'User activity states',
  V: {
    A: { N: 'active', D: 'Currently active', V: 'active' },
    I: { N: 'idle', D: 'Idle (1+ min)', V: 'idle' },
    W: { N: 'away', D: 'Away (5+ min)', V: 'away' },
    O: { N: 'offline', D: 'Disconnected', V: 'offline' },
  },
};

export const AWARENESS_STATE_UDT = {
  N: 'AwarenessState',
  C: 'awareness',
  D: 'Local awareness state',
  P: {
    U: { N: 'user', T: 'UserInfo', D: 'User info', R: 1 },
    S: { N: 'state', T: 'PresenceState', D: 'Presence state', R: 1 },
    LA: { N: 'lastActive', T: 'number', D: 'Last activity time', R: 1 },
    C: { N: 'cursor', T: 'Cursor', D: 'Cursor position', O: 1 },
    SL: { N: 'selection', T: 'Selection', D: 'Text selection', O: 1 },
    X: { N: 'custom', T: 'object', D: 'Custom state', O: 1 },
  },
};

export const CURSOR_UDT = {
  N: 'Cursor',
  C: 'awareness',
  D: 'Cursor position',
  P: {
    X: { N: 'x', T: 'number', D: 'X coordinate', R: 1 },
    Y: { N: 'y', T: 'number', D: 'Y coordinate', R: 1 },
  },
};

export const SELECTION_UDT = {
  N: 'Selection',
  C: 'awareness',
  D: 'Text selection range',
  P: {
    A: { N: 'anchor', T: 'number', D: 'Selection start', R: 1 },
    H: { N: 'head', T: 'number', D: 'Selection end', R: 1 },
  },
};

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export const SYNC_MSG_TYPE_UDT = {
  N: 'SyncMessageType',
  C: 'provider',
  D: 'Y.js sync message types',
  V: {
    Q: { N: 'sync_request', D: 'Request state vector', V: 0 },
    R: { N: 'sync_response', D: 'State diff response', V: 1 },
    U: { N: 'update', D: 'Incremental update', V: 2 },
    A: { N: 'awareness', D: 'Awareness update', V: 3 },
  },
};

export const SYNC_MSG_UDT = {
  N: 'SyncMessage',
  C: 'provider',
  D: 'Y.js sync message',
  P: {
    T: { N: 'type', T: 'SyncMessageType', D: 'Message type', R: 1 },
    F: { N: 'from', T: 'string', D: 'Sender peer ID', R: 1 },
    D: { N: 'data', T: 'Uint8Array', D: 'Encoded Y.js data', O: 1 },
  },
};

export const PROVIDER_CONFIG_UDT = {
  N: 'ProviderConfig',
  C: 'provider',
  D: 'Y.js provider config',
  P: {
    AI: { N: 'awarenessInterval', T: 'number', D: 'Awareness broadcast interval', X: 15000 },
    UD: { N: 'updateDebounce', T: 'number', D: 'Update debounce (ms)', X: 50 },
  },
};

// ============================================================================
// ROOM TYPES
// ============================================================================

export const ROOM_STATE_UDT = {
  N: 'RoomState',
  C: 'room',
  D: 'Collaborative room states',
  V: {
    D: { N: 'disconnected', D: 'Not connected', V: 'disconnected' },
    C: { N: 'connecting', D: 'Connecting...', V: 'connecting' },
    O: { N: 'connected', D: 'Connected', V: 'connected' },
    Y: { N: 'syncing', D: 'Syncing state', V: 'syncing' },
    S: { N: 'synced', D: 'Fully synced', V: 'synced' },
  },
};

export const ROOM_META_UDT = {
  N: 'RoomMeta',
  C: 'room',
  D: 'Room metadata',
  P: {
    ID: { N: 'id', T: 'string', D: 'Room ID', R: 1 },
    N: { N: 'name', T: 'string', D: 'Room name', O: 1 },
    O: { N: 'owner', T: 'string', D: 'Owner peer ID', O: 1 },
    CR: { N: 'created', T: 'number', D: 'Creation time', O: 1 },
  },
};

export const ROOM_USER_UDT = {
  N: 'RoomUser',
  C: 'room',
  D: 'User in a room',
  P: {
    CI: { N: 'clientId', T: 'number', D: 'Y.js client ID', R: 1 },
    N: { N: 'name', T: 'string', D: 'Display name', O: 1 },
    C: { N: 'color', T: 'string', D: 'User color', O: 1 },
    S: { N: 'state', T: 'PresenceState', D: 'Presence', R: 1 },
    CR: { N: 'cursor', T: 'Cursor', D: 'Cursor pos', O: 1 },
    LA: { N: 'lastActive', T: 'number', D: 'Last activity', O: 1 },
  },
};

// ============================================================================
// PERSISTENCE TYPES
// ============================================================================

export const STORED_DOC_UDT = {
  N: 'StoredDoc',
  C: 'persistence',
  D: 'Persisted Y.js document',
  P: {
    ID: { N: 'id', T: 'string', D: 'Document name', R: 1 },
    S: { N: 'state', T: 'number[]', D: 'Encoded state (array)', R: 1 },
    LS: { N: 'lastSync', T: 'number', D: 'Last sync time', R: 1 },
  },
};

export const OFFLINE_ITEM_UDT = {
  N: 'OfflineItem',
  C: 'persistence',
  D: 'Offline queue item',
  P: {
    ID: { N: 'id', T: 'number', D: 'Item ID', R: 1 },
    TS: { N: 'ts', T: 'number', D: 'Queue time', R: 1 },
    R: { N: 'retries', T: 'number', D: 'Retry count', X: 0 },
    LR: { N: 'lastRetry', T: 'number', D: 'Last retry time', O: 1 },
    S: { N: 'synced', T: 'boolean', D: 'Was synced', X: false },
    SA: { N: 'syncedAt', T: 'number', D: 'Sync time', O: 1 },
  },
};

export const PERSISTENCE_CONFIG_UDT = {
  N: 'PersistenceConfig',
  C: 'persistence',
  D: 'Persistence provider config',
  P: {
    SN: { N: 'storeName', T: 'string', D: 'IndexedDB store', X: 'rooms' },
    SD: { N: 'saveDebounce', T: 'number', D: 'Save debounce (ms)', X: 1000 },
  },
};

// ============================================================================
// REGISTRY
// ============================================================================

export const SYNC_UDTS = {
  awareness: {
    PresenceState: PRESENCE_STATE_UDT,
    AwarenessState: AWARENESS_STATE_UDT,
    Cursor: CURSOR_UDT,
    Selection: SELECTION_UDT,
  },
  provider: {
    SyncMessageType: SYNC_MSG_TYPE_UDT,
    SyncMessage: SYNC_MSG_UDT,
    ProviderConfig: PROVIDER_CONFIG_UDT,
  },
  room: {
    RoomState: ROOM_STATE_UDT,
    RoomMeta: ROOM_META_UDT,
    RoomUser: ROOM_USER_UDT,
  },
  persistence: {
    StoredDoc: STORED_DOC_UDT,
    OfflineItem: OFFLINE_ITEM_UDT,
    PersistenceConfig: PERSISTENCE_CONFIG_UDT,
  },
};

// ============================================================================
// USER COLORS
// ============================================================================

export const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
];

export default SYNC_UDTS;
