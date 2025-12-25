/**
 * @t 251|Path UDTs|v1.0
 * @h {C:"paths,tokens,isa95",L:"MIT"}
 * @p Path UDT templates - ISA-95 style path management
 * @a define→instance→resolve→use
 *
 * TOKEN OPTIMIZATION:
 * Instead of: /home/user/kp2p/src/widgets/chat.html (45 chars)
 * Use:        P.W.f('chat.html') or just P.W.$ + 'chat.html' (20 chars)
 * Savings:    ~55% per path reference
 */

// ============================================================================
// PATH UDT TEMPLATE
// ============================================================================

/**
 * Path template UDT - defines a directory location
 */
export const PATH_UDT = {
  N: 'Path',
  C: 'paths',
  D: 'Directory path template',
  P: {
    K: { N: 'key', T: 'string', D: 'Short key (1-3 chars)', R: 1 },
    B: { N: 'base', T: 'string', D: 'Base path', R: 1 },
    A: { N: 'alias', T: 'string', D: 'Human name', O: 1 },
    P: { N: 'parent', T: 'Path', D: 'Parent path ref', O: 1 },
  },
};

/**
 * File reference UDT - points to a specific file
 */
export const FILE_REF_UDT = {
  N: 'FileRef',
  C: 'paths',
  D: 'File reference within a path',
  P: {
    P: { N: 'path', T: 'Path', D: 'Parent path', R: 1 },
    F: { N: 'file', T: 'string', D: 'Filename', R: 1 },
    L: { N: 'line', T: 'number', D: 'Line number', O: 1 },
  },
};

// ============================================================================
// PATH FACTORY
// ============================================================================

/**
 * Create a path instance from the template
 * @param {string} key - Short key (e.g., 'W' for widgets)
 * @param {string} base - Base path
 * @param {string} [alias] - Human readable name
 * @param {object} [parent] - Parent path instance
 */
function createPath(key, base, alias, parent) {
  const fullBase = parent ? parent.$ + '/' + base : base;

  return {
    K: key,           // Short key
    $: fullBase,      // Full base path (the $ is the "value" accessor)
    A: alias || base, // Alias
    P: parent,        // Parent ref

    // Resolve a file within this path
    f(file) { return this.$ + '/' + file; },

    // Resolve with line number (for code refs)
    l(file, line) { return this.$ + '/' + file + ':' + line; },

    // Create child path
    c(key, subdir, alias) { return createPath(key, subdir, alias, this); },

    // Get relative from another path
    rel(other) {
      if (this.$.startsWith(other.$)) {
        return this.$.slice(other.$.length + 1);
      }
      return this.$;
    },
  };
}

// ============================================================================
// PATH INSTANCES - THE ACTUAL DIRECTORY TREE
// ============================================================================

// Root path - detect or default
const ROOT = typeof process !== 'undefined' && process.cwd
  ? process.cwd()
  : '/home/user/kp2p';

/**
 * P = Path registry - all paths accessible via P.{KEY}
 *
 * Usage:
 *   P.R.$              → '/home/user/kp2p'
 *   P.W.$              → '/home/user/kp2p/src/widgets'
 *   P.W.f('chat.html') → '/home/user/kp2p/src/widgets/chat.html'
 *   P.D.f('os-mesh-global-v7.html') → full demo path
 */
export const P = {
  // Root
  R: createPath('R', ROOT, 'root'),
};

// Source tree
P.S = P.R.c('S', 'src', 'source');

// Core modules
P.C = P.S.c('C', 'core', 'core');
P.N = P.S.c('N', 'network', 'network');
P.P = P.S.c('P', 'p2p', 'p2p');
P.Y = P.S.c('Y', 'sync', 'sync');
P.O = P.S.c('O', 'os', 'os');
P.E = P.S.c('E', 'enterprise', 'enterprise');
P.L = P.S.c('L', 'lib', 'lib');
P.PR = P.S.c('PR', 'protocols', 'protocols');

// Widgets
P.W = P.S.c('W', 'widgets', 'widgets');

// Apps
P.A = P.S.c('A', 'apps', 'apps');
P.D = P.A.c('D', 'demo', 'demo');
P.IG = P.A.c('IG', 'ignite', 'ignite');
P.KG = P.A.c('KG', 'konogate', 'konogate');
P.KV = P.A.c('KV', 'konovpn', 'konovpn');
P.KM = P.A.c('KM', 'konomerce', 'konomerce');
P.KF = P.A.c('KF', 'konoforge', 'konoforge');
P.TD = P.A.c('TD', '3DLand', '3dland');

// LLM
P.LM = P.S.c('LM', 'llm', 'llm');

// Graphics
P.G = P.L.c('G', 'graphics', 'graphics');

// ============================================================================
// FILE SHORTCUTS - COMMON FILES
// ============================================================================

/**
 * F = File registry - quick access to common files
 *
 * Usage:
 *   F.OS7  → full path to os-mesh-global-v7.html
 *   F.CHAT → full path to chat widget
 */
export const F = {
  // Demo files
  OS7: P.D.f('os-mesh-global-v7.html'),
  OS6: P.D.f('os-mesh-global-v6.html'),
  OS5: P.D.f('os-mesh-global-v5.html'),
  OS4: P.D.f('os-mesh-global-v4.html'),
  OS3: P.D.f('os-mesh-global-v3.html'),
  LLM: P.D.f('local-llm-demo.html'),
  AGT4: P.D.f('llm-agent-demo-v4.html'),
  AGT3: P.D.f('llm-agent-demo-v3.html'),
  ENT: P.D.f('enterprise-demo.html'),
  ANON: P.D.f('anon-genesis-v1.html'),

  // Widget files
  CHAT: P.W.f('chat.html'),
  WB: P.W.f('whiteboard.html'),
  FORM: P.W.f('form.html'),
  KB: P.W.f('kanban.html'),
  CMT: P.W.f('comments.html'),
  PHONE: P.W.f('phone.html'),
  PHONE2: P.W.f('phone-v2.html'),
  AI1: P.W.f('ai-comm.html'),
  AI2: P.W.f('ai-comm-v2.html'),
  AI3: P.W.f('ai-comm-v3.html'),

  // Core UDTs
  UDT_C: P.C.f('udts.js'),
  UDT_E: P.E.f('udts.js'),
  UDT_N: P.N.f('udts.js'),
  UDT_P: P.P.f('udts.js'),
  UDT_W: P.W.f('udts.js'),

  // Index files
  IDX: P.R.f('index.html'),
  IDX_W: P.W.f('index.html'),
  IDX_D: P.D.f('index.html'),
  IDX_A: P.A.f('index.html'),
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Resolve a path string using the registry
 * Supports: "W:chat.html" → P.W.f('chat.html')
 */
export function resolve(pathStr) {
  if (!pathStr.includes(':')) return pathStr;

  const [key, file] = pathStr.split(':');
  const path = P[key];
  if (!path) return pathStr;

  return file ? path.f(file) : path.$;
}

/**
 * Shorten a full path to registry notation
 * "/home/user/kp2p/src/widgets/chat.html" → "W:chat.html"
 */
export function shorten(fullPath) {
  for (const [key, path] of Object.entries(P)) {
    if (fullPath.startsWith(path.$)) {
      const rest = fullPath.slice(path.$.length);
      if (rest.startsWith('/')) {
        return key + ':' + rest.slice(1);
      }
      if (rest === '') {
        return key + ':';
      }
    }
  }
  return fullPath;
}

/**
 * Get all paths as a flat object (for debugging/display)
 */
export function listPaths() {
  const result = {};
  for (const [key, path] of Object.entries(P)) {
    result[key] = { alias: path.A, path: path.$ };
  }
  return result;
}

/**
 * Get all file shortcuts
 */
export function listFiles() {
  return { ...F };
}

// ============================================================================
// REGISTRY
// ============================================================================

export const PATH_UDTS = {
  paths: {
    Path: PATH_UDT,
    FileRef: FILE_REF_UDT,
  },
};

export default { P, F, resolve, shorten, listPaths, listFiles, PATH_UDTS };
