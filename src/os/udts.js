/**
 * @file src/os/udts.js
 * @desc Unified UDT definitions for OS modules (VFS, Kernel, VM)
 *
 * Minified tag format for compact storage/transmission.
 * Uses single-letter keys for common properties.
 *
 * KEY MAPPING:
 * N = name, T = type, D = description, V = values/variants
 * S = size, P = properties, R = required, O = optional
 * M = mode, F = flags, C = category
 */

// ============================================================================
// VFS TYPES
// ============================================================================

/**
 * File type enum (minified)
 */
export const FILE_TYPE_UDT = {
  N: 'FileType',
  C: 'vfs',
  D: 'Virtual file system node types',
  V: {
    F: { N: 'file', D: 'Regular file', V: 1 },
    D: { N: 'dir', D: 'Directory', V: 2 },
    L: { N: 'link', D: 'Symbolic link', V: 3 },
    P: { N: 'pipe', D: 'Named pipe (FIFO)', V: 4 },
    S: { N: 'socket', D: 'Unix socket', V: 5 },
    B: { N: 'block', D: 'Block device', V: 6 },
    C: { N: 'char', D: 'Character device', V: 7 },
  },
};

/**
 * Permission bits (minified)
 */
export const PERM_UDT = {
  N: 'Permission',
  C: 'vfs',
  D: 'Unix-style permission bits',
  V: {
    R: { N: 'READ', D: 'Read permission', V: 4 },
    W: { N: 'WRITE', D: 'Write permission', V: 2 },
    X: { N: 'EXEC', D: 'Execute permission', V: 1 },
    UR: { N: 'USR_R', D: 'User read', V: 0o400 },
    UW: { N: 'USR_W', D: 'User write', V: 0o200 },
    UX: { N: 'USR_X', D: 'User exec', V: 0o100 },
    GR: { N: 'GRP_R', D: 'Group read', V: 0o040 },
    GW: { N: 'GRP_W', D: 'Group write', V: 0o020 },
    GX: { N: 'GRP_X', D: 'Group exec', V: 0o010 },
    OR: { N: 'OTH_R', D: 'Other read', V: 0o004 },
    OW: { N: 'OTH_W', D: 'Other write', V: 0o002 },
    OX: { N: 'OTH_X', D: 'Other exec', V: 0o001 },
  },
  // Common permission combinations
  X: {
    755: 0o755, // rwxr-xr-x (dirs/executables)
    644: 0o644, // rw-r--r-- (files)
    600: 0o600, // rw------- (private)
    777: 0o777, // rwxrwxrwx (full access)
  },
};

/**
 * Inode structure (minified)
 */
export const INODE_UDT = {
  N: 'Inode',
  C: 'vfs',
  D: 'File system inode (index node)',
  P: {
    T: { N: 'type', T: 'FileType', D: 'Node type', R: true },
    M: { N: 'mode', T: 'number', D: 'Permission bits', R: true },
    U: { N: 'uid', T: 'number', D: 'Owner user ID', R: true },
    G: { N: 'gid', T: 'number', D: 'Owner group ID', R: true },
    S: { N: 'size', T: 'number', D: 'Size in bytes', R: true },
    A: { N: 'atime', T: 'number', D: 'Access time (epoch ms)', R: true },
    MT: { N: 'mtime', T: 'number', D: 'Modify time (epoch ms)', R: true },
    CT: { N: 'ctime', T: 'number', D: 'Change time (epoch ms)', R: true },
    V: { N: 'version', T: 'number', D: 'CRDT version counter', R: true },
    D: { N: 'data', T: 'string', D: 'File data (base64 for binary)', O: true },
    L: { N: 'link', T: 'string', D: 'Symlink target path', O: true },
    C: { N: 'children', T: 'string[]', D: 'Directory entries', O: true },
  },
};

/**
 * File descriptor structure (minified)
 */
export const FD_UDT = {
  N: 'FileDescriptor',
  C: 'vfs',
  D: 'Open file handle',
  P: {
    FD: { N: 'fd', T: 'number', D: 'File descriptor number', R: true },
    P: { N: 'path', T: 'string', D: 'File path', R: true },
    F: { N: 'flags', T: 'number', D: 'Open flags', R: true },
    O: { N: 'offset', T: 'number', D: 'Current read/write position', R: true },
  },
  // Standard file descriptors
  X: {
    STDIN: 0,
    STDOUT: 1,
    STDERR: 2,
  },
};

// ============================================================================
// KERNEL TYPES
// ============================================================================

/**
 * Process state enum (minified)
 */
export const PROC_STATE_UDT = {
  N: 'ProcessState',
  C: 'kernel',
  D: 'Process execution states',
  V: {
    N: { N: 'new', D: 'Just created', V: 'new' },
    R: { N: 'ready', D: 'Ready to run', V: 'ready' },
    X: { N: 'running', D: 'Currently executing', V: 'running' },
    W: { N: 'waiting', D: 'Waiting for I/O or event', V: 'waiting' },
    S: { N: 'stopped', D: 'Stopped by signal', V: 'stopped' },
    Z: { N: 'zombie', D: 'Terminated, awaiting cleanup', V: 'zombie' },
    D: { N: 'dead', D: 'Process terminated', V: 'dead' },
  },
};

/**
 * Priority levels (minified)
 */
export const PRIORITY_UDT = {
  N: 'Priority',
  C: 'kernel',
  D: 'Process scheduling priority',
  V: {
    I: { N: 'idle', D: 'Lowest priority', V: 19 },
    L: { N: 'low', D: 'Below normal', V: 10 },
    N: { N: 'normal', D: 'Default priority', V: 0 },
    H: { N: 'high', D: 'Above normal', V: -10 },
    R: { N: 'realtime', D: 'Highest priority', V: -20 },
  },
};

/**
 * Signal types (minified)
 */
export const SIGNAL_UDT = {
  N: 'Signal',
  C: 'kernel',
  D: 'Unix-style process signals',
  V: {
    HUP: { N: 'SIGHUP', D: 'Hangup', V: 1 },
    INT: { N: 'SIGINT', D: 'Interrupt (Ctrl+C)', V: 2 },
    QUIT: { N: 'SIGQUIT', D: 'Quit', V: 3 },
    ILL: { N: 'SIGILL', D: 'Illegal instruction', V: 4 },
    TRAP: { N: 'SIGTRAP', D: 'Trace/breakpoint trap', V: 5 },
    ABRT: { N: 'SIGABRT', D: 'Abort', V: 6 },
    BUS: { N: 'SIGBUS', D: 'Bus error', V: 7 },
    FPE: { N: 'SIGFPE', D: 'Floating point exception', V: 8 },
    KILL: { N: 'SIGKILL', D: 'Kill (cannot be caught)', V: 9 },
    USR1: { N: 'SIGUSR1', D: 'User signal 1', V: 10 },
    SEGV: { N: 'SIGSEGV', D: 'Segmentation fault', V: 11 },
    USR2: { N: 'SIGUSR2', D: 'User signal 2', V: 12 },
    PIPE: { N: 'SIGPIPE', D: 'Broken pipe', V: 13 },
    ALRM: { N: 'SIGALRM', D: 'Alarm clock', V: 14 },
    TERM: { N: 'SIGTERM', D: 'Termination', V: 15 },
    CHLD: { N: 'SIGCHLD', D: 'Child stopped/terminated', V: 17 },
    CONT: { N: 'SIGCONT', D: 'Continue if stopped', V: 18 },
    STOP: { N: 'SIGSTOP', D: 'Stop (cannot be caught)', V: 19 },
    TSTP: { N: 'SIGTSTP', D: 'Stop from terminal (Ctrl+Z)', V: 20 },
  },
};

/**
 * IPC message types (minified)
 */
export const IPC_TYPE_UDT = {
  N: 'IPCType',
  C: 'kernel',
  D: 'Inter-process communication message types',
  V: {
    D: { N: 'data', D: 'Data payload', V: 'data' },
    R: { N: 'request', D: 'Request/RPC call', V: 'request' },
    P: { N: 'response', D: 'Response to request', V: 'response' },
    S: { N: 'signal', D: 'Signal delivery', V: 'signal' },
    E: { N: 'event', D: 'Event notification', V: 'event' },
    C: { N: 'control', D: 'Control message', V: 'control' },
  },
};

/**
 * Process structure (minified)
 */
export const PROCESS_UDT = {
  N: 'Process',
  C: 'kernel',
  D: 'Process control block',
  P: {
    PID: { N: 'pid', T: 'number', D: 'Process ID', R: true },
    PPID: { N: 'ppid', T: 'number', D: 'Parent process ID', R: true },
    N: { N: 'name', T: 'string', D: 'Process name', R: true },
    S: { N: 'state', T: 'ProcessState', D: 'Current state', R: true },
    PR: { N: 'priority', T: 'Priority', D: 'Scheduling priority', R: true },
    U: { N: 'uid', T: 'number', D: 'User ID', R: true },
    G: { N: 'gid', T: 'number', D: 'Group ID', R: true },
    CWD: { N: 'cwd', T: 'string', D: 'Current working directory', R: true },
    ENV: { N: 'env', T: 'object', D: 'Environment variables', O: true },
    FD: { N: 'fds', T: 'Map<number, FileDescriptor>', D: 'Open file descriptors', O: true },
    C: { N: 'children', T: 'number[]', D: 'Child PIDs', O: true },
    CT: { N: 'created', T: 'number', D: 'Creation time', R: true },
    UT: { N: 'utime', T: 'number', D: 'User CPU time', R: true },
    ST: { N: 'stime', T: 'number', D: 'System CPU time', R: true },
    EC: { N: 'exitCode', T: 'number', D: 'Exit code (if terminated)', O: true },
  },
};

/**
 * IPC Message structure (minified)
 */
export const IPC_MSG_UDT = {
  N: 'IPCMessage',
  C: 'kernel',
  D: 'Inter-process communication message',
  P: {
    ID: { N: 'id', T: 'string', D: 'Message ID', R: true },
    F: { N: 'from', T: 'number', D: 'Source PID', R: true },
    T: { N: 'to', T: 'number', D: 'Destination PID', R: true },
    Y: { N: 'type', T: 'IPCType', D: 'Message type', R: true },
    D: { N: 'data', T: 'any', D: 'Message payload', O: true },
    TS: { N: 'timestamp', T: 'number', D: 'Send time', R: true },
    RI: { N: 'replyTo', T: 'string', D: 'Reply-to message ID', O: true },
  },
};

// ============================================================================
// VM TYPES
// ============================================================================

/**
 * VM state enum (PackML-inspired, minified)
 */
export const VM_STATE_UDT = {
  N: 'VMState',
  C: 'vm',
  D: 'Virtual machine states (PackML-inspired)',
  V: {
    O: { N: 'off', D: 'Not running', V: 'off' },
    B: { N: 'booting', D: 'Starting up', V: 'booting' },
    R: { N: 'running', D: 'Active and processing', V: 'running' },
    S: { N: 'suspended', D: 'Paused but resumable', V: 'suspended' },
    M: { N: 'migrating', D: 'Moving to another node', V: 'migrating' },
    D: { N: 'shutting_down', D: 'Stopping', V: 'shutting_down' },
    E: { N: 'error', D: 'Error state', V: 'error' },
  },
};

/**
 * VM events (minified)
 */
export const VM_EVENT_UDT = {
  N: 'VMEvent',
  C: 'vm',
  D: 'Virtual machine lifecycle events',
  V: {
    B: { N: 'boot', D: 'VM starting', V: 'vm:boot' },
    R: { N: 'ready', D: 'VM ready', V: 'vm:ready' },
    S: { N: 'suspend', D: 'VM suspended', V: 'vm:suspend' },
    U: { N: 'resume', D: 'VM resumed', V: 'vm:resume' },
    M: { N: 'migrate', D: 'VM migrating', V: 'vm:migrate' },
    D: { N: 'shutdown', D: 'VM stopping', V: 'vm:shutdown' },
    E: { N: 'error', D: 'VM error', V: 'vm:error' },
    Y: { N: 'sync', D: 'State synchronized', V: 'vm:sync' },
    PJ: { N: 'peer_join', D: 'Peer connected', V: 'vm:peer_join' },
    PL: { N: 'peer_leave', D: 'Peer disconnected', V: 'vm:peer_leave' },
  },
};

/**
 * Sync message types (minified)
 */
export const SYNC_TYPE_UDT = {
  N: 'SyncType',
  C: 'vm',
  D: 'VM-to-VM synchronization message types',
  V: {
    VU: { N: 'vfs_update', D: 'Incremental VFS change', V: 'vfs:update' },
    VF: { N: 'vfs_full', D: 'Full VFS snapshot', V: 'vfs:full' },
    PS: { N: 'proc_spawn', D: 'Process spawn notification', V: 'proc:spawn' },
    PK: { N: 'proc_kill', D: 'Process kill notification', V: 'proc:kill' },
    PM: { N: 'proc_migrate', D: 'Process migration', V: 'proc:migrate' },
    SU: { N: 'shm_update', D: 'Shared memory update', V: 'shm:update' },
    HB: { N: 'heartbeat', D: 'Keepalive message', V: 'heartbeat' },
  },
};

/**
 * VM configuration structure (minified)
 */
export const VM_CONFIG_UDT = {
  N: 'VMConfig',
  C: 'vm',
  D: 'Virtual machine configuration',
  P: {
    SI: { N: 'syncInterval', T: 'number', D: 'Sync timer interval (ms)', R: false, X: 1000 },
    HI: { N: 'heartbeatInterval', T: 'number', D: 'Heartbeat interval (ms)', R: false, X: 5000 },
    MP: { N: 'maxProcesses', T: 'number', D: 'Max concurrent processes', R: false, X: 100 },
    MF: { N: 'maxFiles', T: 'number', D: 'Max open files', R: false, X: 10000 },
  },
};

/**
 * Shared memory entry (minified)
 */
export const SHM_ENTRY_UDT = {
  N: 'ShmEntry',
  C: 'vm',
  D: 'Shared memory entry (CRDT-synced)',
  P: {
    V: { N: 'value', T: 'any', D: 'Stored value', R: true },
    VE: { N: 'version', T: 'number', D: 'CRDT version counter', R: true },
    TS: { N: 'timestamp', T: 'number', D: 'Last update time', R: true },
    O: { N: 'origin', T: 'string', D: 'Origin VM ID', R: true },
  },
};

/**
 * Peer info structure (minified)
 */
export const PEER_INFO_UDT = {
  N: 'PeerInfo',
  C: 'vm',
  D: 'Connected peer information',
  P: {
    ID: { N: 'id', T: 'string', D: 'Peer VM ID', R: true },
    C: { N: 'connected', T: 'number', D: 'Connection time', R: true },
    LS: { N: 'lastSeen', T: 'number', D: 'Last heartbeat time', R: true },
  },
};

/**
 * VM stats structure (minified)
 */
export const VM_STATS_UDT = {
  N: 'VMStats',
  C: 'vm',
  D: 'Virtual machine runtime statistics',
  P: {
    P: { N: 'processes', T: 'number', D: 'Active process count', R: true },
    F: { N: 'files', T: 'number', D: 'Open file count', R: true },
    SM: { N: 'syncMessages', T: 'number', D: 'Sync messages sent', R: true },
    BT: { N: 'bytesTransferred', T: 'number', D: 'Total bytes transferred', R: true },
  },
};

// ============================================================================
// REGISTRY
// ============================================================================

/**
 * All OS UDTs organized by category
 */
export const OS_UDTS = {
  vfs: {
    FileType: FILE_TYPE_UDT,
    Permission: PERM_UDT,
    Inode: INODE_UDT,
    FileDescriptor: FD_UDT,
  },
  kernel: {
    ProcessState: PROC_STATE_UDT,
    Priority: PRIORITY_UDT,
    Signal: SIGNAL_UDT,
    IPCType: IPC_TYPE_UDT,
    Process: PROCESS_UDT,
    IPCMessage: IPC_MSG_UDT,
  },
  vm: {
    VMState: VM_STATE_UDT,
    VMEvent: VM_EVENT_UDT,
    SyncType: SYNC_TYPE_UDT,
    VMConfig: VM_CONFIG_UDT,
    ShmEntry: SHM_ENTRY_UDT,
    PeerInfo: PEER_INFO_UDT,
    VMStats: VM_STATS_UDT,
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
    result.presets = udt.X;
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

export default OS_UDTS;
