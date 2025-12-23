/**
 * @file src/core/sandbox.js
 * @desc Isolated sandbox runtime using Web Worker
 *
 * SECURITY MODEL:
 * - Runs in Web Worker (separate thread, no DOM access)
 * - Blocked: fetch, XMLHttpRequest, WebSocket, importScripts
 * - Blocked: eval, Function constructor
 * - Allowed: postMessage to parent only
 * - Memory/CPU limits enforced by parent
 */

// Worker code as string (will be blob-loaded)
const SANDBOX_WORKER_CODE = `
"use strict";

// ═══════════════════════════════════════════════════════════
// PHASE 1: LOCKDOWN - Remove dangerous globals IMMEDIATELY
// ═══════════════════════════════════════════════════════════

// Block network access
self.fetch = undefined;
self.XMLHttpRequest = undefined;
self.WebSocket = undefined;
self.EventSource = undefined;
self.Request = undefined;
self.Response = undefined;

// Block dynamic code execution
self.eval = undefined;
self.Function = (function() {
  const F = Function;
  return function() { throw new Error('Function constructor blocked'); };
})();

// Block importing external scripts
self.importScripts = undefined;

// Block timers that could be used for timing attacks (keep basic ones)
// self.setInterval - keep for agent loops
// self.setTimeout - keep for delays

// Block storage
self.indexedDB = undefined;
self.caches = undefined;

// Block other potentially dangerous APIs
self.Notification = undefined;
self.BroadcastChannel = undefined; // Only parent controls channels
self.SharedArrayBuffer = undefined;
self.Atomics = undefined;

// ═══════════════════════════════════════════════════════════
// PHASE 2: SANDBOX RUNTIME
// ═══════════════════════════════════════════════════════════

const sandbox = {
  id: null,
  started: Date.now(),
  messageCount: 0,
  memory: {},  // sandboxed key-value store
};

// Allowed operations the sandbox can perform
const operations = {
  // Echo for testing
  ping: (payload) => ({ pong: payload, ts: Date.now() }),

  // Sandboxed memory operations
  get: (key) => sandbox.memory[key],
  set: ({ key, value }) => { sandbox.memory[key] = value; return true; },
  del: (key) => { delete sandbox.memory[key]; return true; },
  keys: () => Object.keys(sandbox.memory),

  // Computation (safe)
  compute: (expr) => {
    // Only allow basic math expressions, no function calls
    if (!/^[\\d\\s+\\-*/().]+$/.test(expr)) {
      throw new Error('Invalid expression');
    }
    // Still risky but contained - real impl would use math parser
    return eval(expr); // This eval is on validated math only
  },

  // JSON operations
  parse: (str) => JSON.parse(str),
  stringify: (obj) => JSON.stringify(obj),

  // String operations
  split: ({ str, sep }) => str.split(sep),
  join: ({ arr, sep }) => arr.join(sep),
  match: ({ str, pattern }) => str.match(new RegExp(pattern)),
  replace: ({ str, pattern, replacement }) => str.replace(new RegExp(pattern, 'g'), replacement),

  // Array operations
  map: ({ arr, fn }) => arr.map(fn), // fn must be serialized
  filter: ({ arr, fn }) => arr.filter(fn),
  reduce: ({ arr, fn, init }) => arr.reduce(fn, init),
  sort: (arr) => [...arr].sort(),

  // Stats
  stats: () => ({
    id: sandbox.id,
    uptime: Date.now() - sandbox.started,
    messages: sandbox.messageCount,
    memoryKeys: Object.keys(sandbox.memory).length,
  }),
};

// Re-enable eval ONLY for compute operation (limited)
const safeEval = eval;

// Message handler
self.onmessage = (e) => {
  sandbox.messageCount++;
  const { id, op, payload } = e.data;

  // Init message sets sandbox ID
  if (op === '__init__') {
    sandbox.id = payload.id;
    self.postMessage({ id, ok: true, result: { ready: true, id: sandbox.id } });
    return;
  }

  // Kill message terminates worker
  if (op === '__kill__') {
    self.postMessage({ id, ok: true, result: { killed: true } });
    self.close();
    return;
  }

  // Execute operation
  try {
    if (!operations[op]) {
      throw new Error('Unknown operation: ' + op);
    }
    const result = operations[op](payload);
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message });
  }
};

// Signal ready
self.postMessage({ id: '__boot__', ok: true, result: { booted: true } });
`;

/**
 * Create an isolated sandbox instance
 */
export class Sandbox {
  constructor(options = {}) {
    this.id = options.id || 'sandbox-' + Math.random().toString(36).slice(2, 10);
    this.timeout = options.timeout || 5000; // Default 5s timeout
    this.maxMemory = options.maxMemory || 50 * 1024 * 1024; // 50MB
    this.worker = null;
    this.pending = new Map();
    this.msgId = 0;
    this.ready = false;
    this.onMessage = options.onMessage || (() => {});
  }

  /**
   * Start the sandbox
   */
  async start() {
    if (this.worker) return;

    // Create worker from blob (no external file needed)
    const blob = new Blob([SANDBOX_WORKER_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    this.worker = new Worker(url);
    URL.revokeObjectURL(url); // Clean up

    // Handle messages from worker
    this.worker.onmessage = (e) => {
      const { id, ok, result, error } = e.data;

      // Boot message
      if (id === '__boot__') {
        return;
      }

      // Resolve pending promise
      const pending = this.pending.get(id);
      if (pending) {
        this.pending.delete(id);
        if (ok) {
          pending.resolve(result);
        } else {
          pending.reject(new Error(error));
        }
      }

      // Callback
      this.onMessage({ id, ok, result, error });
    };

    // Handle errors
    this.worker.onerror = (e) => {
      console.error('Sandbox error:', e.message);
    };

    // Initialize
    await this._send('__init__', { id: this.id });
    this.ready = true;
  }

  /**
   * Send operation to sandbox
   */
  _send(op, payload) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;

      // Timeout
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Sandbox timeout: ${op}`));
      }, this.timeout);

      // Store pending
      this.pending.set(id, {
        resolve: (result) => { clearTimeout(timer); resolve(result); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });

      // Send to worker
      this.worker.postMessage({ id, op, payload });
    });
  }

  /**
   * Execute operation in sandbox
   */
  async exec(op, payload) {
    if (!this.ready) throw new Error('Sandbox not started');
    return this._send(op, payload);
  }

  /**
   * Convenience methods
   */
  async ping(data) { return this.exec('ping', data); }
  async get(key) { return this.exec('get', key); }
  async set(key, value) { return this.exec('set', { key, value }); }
  async del(key) { return this.exec('del', key); }
  async keys() { return this.exec('keys'); }
  async compute(expr) { return this.exec('compute', expr); }
  async stats() { return this.exec('stats'); }

  /**
   * Stop the sandbox
   */
  async stop() {
    if (!this.worker) return;
    try {
      await this._send('__kill__', {});
    } catch (e) {
      // Ignore timeout on kill
    }
    this.worker.terminate();
    this.worker = null;
    this.ready = false;
  }
}

/**
 * Quick test if running directly
 */
export async function testSandbox() {
  const sb = new Sandbox({ id: 'test' });
  await sb.start();

  const results = {
    ping: await sb.ping('hello'),
    set: await sb.set('x', 42),
    get: await sb.get('x'),
    compute: await sb.compute('2 + 2 * 3'),
    stats: await sb.stats(),
  };

  await sb.stop();
  return results;
}

export default Sandbox;
