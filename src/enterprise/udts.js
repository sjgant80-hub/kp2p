/**
 * @t 250|Enterprise UDTs|v1.0
 * @h {C:"isa95,packml,sparkplug,mesh",L:"MIT"}
 * @p ISA-95/PackML/Sparkplug types for industrial P2P
 * @a define→deploy→monitor→control
 */

// ============================================================================
// ISA-95 HIERARCHY TYPES
// ============================================================================

export const ISA95_LEVEL_UDT = {
  N: 'ISA95Level',
  C: 'isa95',
  D: 'ISA-95 hierarchy levels',
  V: {
    L4: { N: 'business', D: 'Planning/ERP', V: 4, X: 'days-months' },
    L3: { N: 'mom', D: 'MES/Execution', V: 3, X: 'shifts-days' },
    L2: { N: 'control', D: 'Supervision', V: 2, X: 'sec-hours' },
    L1: { N: 'sensing', D: 'Direct Control', V: 1, X: 'ms-sec' },
    L0: { N: 'process', D: 'Physical', V: 0, X: 'continuous' },
  },
};

export const HIERARCHY_NODE_TYPE_UDT = {
  N: 'HierarchyNodeType',
  C: 'isa95',
  D: 'ISA-95 node types',
  V: {
    E: { N: 'enterprise', D: 'Top level', V: 'enterprise' },
    S: { N: 'site', D: 'Plant/Facility', V: 'site' },
    A: { N: 'area', D: 'Production area', V: 'area' },
    WC: { N: 'workcenter', D: 'Process cell', V: 'workcenter' },
    WU: { N: 'workunit', D: 'Unit', V: 'workunit' },
    EQ: { N: 'equipment', D: 'Leaf node', V: 'equipment' },
  },
};

// ============================================================================
// PACKML STATE MACHINE
// ============================================================================

export const PACKML_STATE_UDT = {
  N: 'PackMLState',
  C: 'packml',
  D: 'PackML equipment states',
  V: {
    ST: { N: 'stopped', D: 'Not running', V: 'stopped' },
    ID: { N: 'idle', D: 'Ready to start', V: 'idle' },
    SG: { N: 'starting', D: 'Starting up', V: 'starting' },
    EX: { N: 'execute', D: 'Running', V: 'execute' },
    CG: { N: 'completing', D: 'Finishing', V: 'completing' },
    CP: { N: 'complete', D: 'Done', V: 'complete' },
    RS: { N: 'resetting', D: 'Resetting', V: 'resetting' },
    HG: { N: 'holding', D: 'Entering hold', V: 'holding' },
    HD: { N: 'held', D: 'Held', V: 'held' },
    UH: { N: 'unholding', D: 'Exiting hold', V: 'unholding' },
    SP: { N: 'stopping', D: 'Stopping', V: 'stopping' },
    AB: { N: 'aborting', D: 'Aborting', V: 'aborting' },
    AD: { N: 'aborted', D: 'Aborted', V: 'aborted' },
    CL: { N: 'clearing', D: 'Clearing', V: 'clearing' },
  },
};

export const EQUIPMENT_MODE_UDT = {
  N: 'EquipmentMode',
  C: 'packml',
  D: 'Equipment operating modes',
  V: {
    P: { N: 'production', D: 'Normal production', V: 'production' },
    M: { N: 'maintenance', D: 'Maintenance mode', V: 'maintenance' },
    MN: { N: 'manual', D: 'Manual control', V: 'manual' },
    A: { N: 'automatic', D: 'Auto control', V: 'automatic' },
    S: { N: 'semiauto', D: 'Semi-automatic', V: 'semiauto' },
  },
};

// ============================================================================
// SPARKPLUG MESSAGING
// ============================================================================

export const SPARKPLUG_MSG_UDT = {
  N: 'SparkplugMsgType',
  C: 'sparkplug',
  D: 'Sparkplug-style message types',
  V: {
    B: { N: 'birth', D: 'Node online', V: 'BIRTH' },
    D: { N: 'death', D: 'Node offline', V: 'DEATH' },
    DT: { N: 'data', D: 'Data update', V: 'DATA' },
    C: { N: 'cmd', D: 'Command', V: 'CMD' },
    S: { N: 'state', D: 'State change', V: 'STATE' },
    A: { N: 'alarm', D: 'Alarm event', V: 'ALARM' },
  },
};

export const TOPIC_UDT = {
  N: 'Topic',
  C: 'sparkplug',
  D: 'Sparkplug topic structure',
  P: {
    NS: { N: 'namespace', T: 'string', D: 'Topic namespace', R: 1 },
    G: { N: 'group', T: 'string', D: 'Group/site ID', R: 1 },
    MT: { N: 'msgType', T: 'SparkplugMsgType', D: 'Message type', R: 1 },
    P: { N: 'path', T: 'string', D: 'Node path', R: 1 },
  },
  X: { format: '{namespace}/{group}/{msgType}/{path}' },
};

// ============================================================================
// ISA-18.2 ALARMS
// ============================================================================

export const ALARM_PRIORITY_UDT = {
  N: 'AlarmPriority',
  C: 'alarm',
  D: 'ISA-18.2 alarm priorities',
  V: {
    P1: { N: 'emergency', D: 'Immediate', V: 1, X: { rt: '<1min', c: '#CC0000' } },
    P2: { N: 'high', D: 'Urgent', V: 2, X: { rt: '<10min', c: '#FF6600' } },
    P3: { N: 'medium', D: 'Normal', V: 3, X: { rt: '<1hr', c: '#FFCC00' } },
    P4: { N: 'low', D: 'Deferred', V: 4, X: { rt: 'Shift', c: '#00CCCC' } },
  },
};

export const ALARM_STATE_UDT = {
  N: 'AlarmState',
  C: 'alarm',
  D: 'Alarm acknowledgment states',
  V: {
    U: { N: 'unack', D: 'Unacknowledged', V: 'UNACK' },
    A: { N: 'acked', D: 'Acknowledged', V: 'ACKED' },
    C: { N: 'clear', D: 'Cleared', V: 'CLEAR' },
  },
};

export const ALARM_UDT = {
  N: 'Alarm',
  C: 'alarm',
  D: 'Active alarm',
  P: {
    ID: { N: 'id', T: 'string', D: 'Alarm ID', R: 1 },
    M: { N: 'message', T: 'string', D: 'Alarm text', R: 1 },
    P: { N: 'priority', T: 'AlarmPriority', D: 'Priority level', R: 1 },
    S: { N: 'state', T: 'AlarmState', D: 'Ack state', R: 1 },
    TS: { N: 'timestamp', T: 'number', D: 'Raise time', R: 1 },
    AT: { N: 'ackTime', T: 'number', D: 'Ack time', O: 1 },
    AU: { N: 'ackUser', T: 'string', D: 'Ack user', O: 1 },
  },
};

// ============================================================================
// OPC-UA QUALITY
// ============================================================================

export const QUALITY_CODE_UDT = {
  N: 'QualityCode',
  C: 'quality',
  D: 'OPC-UA style quality codes',
  V: {
    G: { N: 'good', D: 'Valid data', V: 192 },
    B: { N: 'bad', D: 'Invalid data', V: 0 },
    U: { N: 'uncertain', D: 'Suspect data', V: 64 },
  },
};

export const VALUE_UDT = {
  N: 'Value',
  C: 'quality',
  D: 'Value with quality and timestamp',
  P: {
    V: { N: 'v', T: 'any', D: 'Value', R: 1 },
    Q: { N: 'q', T: 'QualityCode', D: 'Quality code', R: 1, X: 192 },
    T: { N: 't', T: 'number', D: 'Timestamp', R: 1 },
    U: { N: 'unit', T: 'string', D: 'Engineering unit', O: 1 },
  },
};

// ============================================================================
// HIERARCHY NODE STRUCTURE
// ============================================================================

export const HIERARCHY_NODE_UDT = {
  N: 'HierarchyNode',
  C: 'isa95',
  D: 'ISA-95 hierarchy node',
  P: {
    ID: { N: 'id', T: 'string', D: 'Node UUID', R: 1 },
    N: { N: 'name', T: 'string', D: 'Node name', R: 1 },
    P: { N: 'path', T: 'string', D: 'Full path', R: 1 },
    L: { N: 'level', T: 'ISA95Level', D: 'ISA-95 level', R: 1 },
    T: { N: 'type', T: 'HierarchyNodeType', D: 'Node type', O: 1 },
    S: { N: 'state', T: 'PackMLState', D: 'Current state', R: 1, X: 'stopped' },
    M: { N: 'mode', T: 'EquipmentMode', D: 'Operating mode', R: 1, X: 'automatic' },
    PR: { N: 'props', T: 'object', D: 'Custom props', O: 1 },
  },
};

export const BIRTH_MSG_UDT = {
  N: 'BirthMessage',
  C: 'sparkplug',
  D: 'Node BIRTH message payload',
  P: {
    T: { N: 'type', T: 'string', D: 'Message type', R: 1, X: 'BIRTH' },
    ID: { N: 'id', T: 'string', D: 'Node ID', R: 1 },
    N: { N: 'name', T: 'string', D: 'Node name', R: 1 },
    P: { N: 'path', T: 'string', D: 'Full path', R: 1 },
    L: { N: 'level', T: 'ISA95Level', D: 'ISA-95 level', R: 1 },
    S: { N: 'state', T: 'PackMLState', D: 'Current state', R: 1 },
    M: { N: 'mode', T: 'EquipmentMode', D: 'Operating mode', R: 1 },
    MT: { N: 'metrics', T: 'object', D: 'Current metrics', O: 1 },
    AL: { N: 'alarms', T: 'object', D: 'Active alarms', O: 1 },
    CH: { N: 'children', T: 'string[]', D: 'Child names', O: 1 },
    PR: { N: 'props', T: 'object', D: 'Custom props', O: 1 },
    TS: { N: 'timestamp', T: 'number', D: 'Birth time', R: 1 },
  },
};

// ============================================================================
// MESH TYPES
// ============================================================================

export const MESH_NODE_CONFIG_UDT = {
  N: 'MeshNodeConfig',
  C: 'mesh',
  D: 'Mesh node configuration',
  P: {
    NS: { N: 'namespace', T: 'string', D: 'Topic namespace', X: 'kp2p' },
    G: { N: 'group', T: 'string', D: 'Group/site ID', X: 'default' },
  },
};

export const MESH_PEER_UDT = {
  N: 'MeshPeer',
  C: 'mesh',
  D: 'Connected mesh peer',
  P: {
    ID: { N: 'id', T: 'string', D: 'Peer ID', R: 1 },
    S: { N: 'status', T: 'string', D: 'Connection status', R: 1 },
    B: { N: 'birthReceived', T: 'boolean', D: 'Got BIRTH', X: false },
  },
};

export const MESH_SUBSCRIPTION_UDT = {
  N: 'MeshSubscription',
  C: 'mesh',
  D: 'Topic subscription',
  P: {
    T: { N: 'topic', T: 'string', D: 'Full topic', R: 1 },
    P: { N: 'peers', T: 'string[]', D: 'Subscribed peers', R: 1 },
  },
};

// ============================================================================
// COMMAND TYPES
// ============================================================================

export const MESH_CMD_UDT = {
  N: 'MeshCommand',
  C: 'mesh',
  D: 'Mesh command types',
  V: {
    ST: { N: 'start', D: 'Start equipment', V: 'start' },
    SP: { N: 'stop', D: 'Stop equipment', V: 'stop' },
    RS: { N: 'reset', D: 'Reset equipment', V: 'reset' },
    HD: { N: 'hold', D: 'Hold operation', V: 'hold' },
    UH: { N: 'unhold', D: 'Release hold', V: 'unhold' },
    AB: { N: 'abort', D: 'Emergency abort', V: 'abort' },
    CL: { N: 'clear', D: 'Clear aborted', V: 'clear' },
    SM: { N: 'setMode', D: 'Change mode', V: 'setMode' },
    GM: { N: 'getMetric', D: 'Read metric', V: 'getMetric' },
    SX: { N: 'setMetric', D: 'Write metric', V: 'setMetric' },
    GS: { N: 'getState', D: 'Read state', V: 'getState' },
    GB: { N: 'getBirth', D: 'Request BIRTH', V: 'getBirth' },
    CP: { N: 'compute', D: 'Sandbox compute', V: 'compute' },
  },
};

export const CMD_REQUEST_UDT = {
  N: 'CmdRequest',
  C: 'mesh',
  D: 'Command request payload',
  P: {
    P: { N: 'path', T: 'string', D: 'Target node path', R: 1 },
    C: { N: 'command', T: 'MeshCommand', D: 'Command type', R: 1 },
    PA: { N: 'params', T: 'object', D: 'Command params', O: 1 },
  },
};

export const CMD_RESPONSE_UDT = {
  N: 'CmdResponse',
  C: 'mesh',
  D: 'Command response payload',
  P: {
    S: { N: 'success', T: 'boolean', D: 'Command succeeded', R: 1 },
    R: { N: 'result', T: 'any', D: 'Result data', O: 1 },
    E: { N: 'error', T: 'string', D: 'Error message', O: 1 },
  },
};

// ============================================================================
// REGISTRY
// ============================================================================

export const ENTERPRISE_UDTS = {
  isa95: {
    ISA95Level: ISA95_LEVEL_UDT,
    HierarchyNodeType: HIERARCHY_NODE_TYPE_UDT,
    HierarchyNode: HIERARCHY_NODE_UDT,
  },
  packml: {
    PackMLState: PACKML_STATE_UDT,
    EquipmentMode: EQUIPMENT_MODE_UDT,
  },
  sparkplug: {
    SparkplugMsgType: SPARKPLUG_MSG_UDT,
    Topic: TOPIC_UDT,
    BirthMessage: BIRTH_MSG_UDT,
  },
  alarm: {
    AlarmPriority: ALARM_PRIORITY_UDT,
    AlarmState: ALARM_STATE_UDT,
    Alarm: ALARM_UDT,
  },
  quality: {
    QualityCode: QUALITY_CODE_UDT,
    Value: VALUE_UDT,
  },
  mesh: {
    MeshNodeConfig: MESH_NODE_CONFIG_UDT,
    MeshPeer: MESH_PEER_UDT,
    MeshSubscription: MESH_SUBSCRIPTION_UDT,
    MeshCommand: MESH_CMD_UDT,
    CmdRequest: CMD_REQUEST_UDT,
    CmdResponse: CMD_RESPONSE_UDT,
  },
};

export default ENTERPRISE_UDTS;
