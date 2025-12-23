/**
 * @file src/os/kernel.js
 * @desc P2P OS Kernel - Process management, scheduling, IPC
 *
 * ISA-95 MAPPING:
 * Enterprise  → Network (all VMs)
 * Site        → Cluster (group of VMs)
 * Area        → Node (single VM)
 * WorkCenter  → Process Group
 * WorkUnit    → Process
 * Equipment   → Thread/Task
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────┐
 * │              P2P NETWORK                │
 * │  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
 * │  │  Node   │──│  Node   │──│  Node   │ │
 * │  │  (VM)   │  │  (VM)   │  │  (VM)   │ │
 * │  └────┬────┘  └────┬────┘  └────┬────┘ │
 * │       │            │            │      │
 * │  ┌────┴────────────┴────────────┴────┐ │
 * │  │         KERNEL (per node)         │ │
 * │  │  ┌─────────┐  ┌─────────┐        │ │
 * │  │  │Scheduler│  │   IPC   │        │ │
 * │  │  └─────────┘  └─────────┘        │ │
 * │  │  ┌─────────┐  ┌─────────┐        │ │
 * │  │  │  VFS    │  │ Sandbox │        │ │
 * │  │  └─────────┘  └─────────┘        │ │
 * │  └───────────────────────────────────┘ │
 * └─────────────────────────────────────────┘
 */

import { Sandbox } from '../core/sandbox.js';

/**
 * Process states
 */
export const PROC_STATE = {
  NEW: 'new',
  READY: 'ready',
  RUNNING: 'running',
  WAITING: 'waiting',
  BLOCKED: 'blocked',
  TERMINATED: 'terminated',
};

/**
 * Process priorities
 */
export const PRIORITY = {
  REALTIME: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
  IDLE: 4,
};

/**
 * IPC message types
 */
export const IPC = {
  SIGNAL: 'signal',
  MESSAGE: 'message',
  PIPE: 'pipe',
  SHARED_MEM: 'shm',
};

/**
 * System signals
 */
export const SIGNAL = {
  KILL: 'SIGKILL',
  TERM: 'SIGTERM',
  STOP: 'SIGSTOP',
  CONT: 'SIGCONT',
  HUP: 'SIGHUP',
  INT: 'SIGINT',
  USR1: 'SIGUSR1',
  USR2: 'SIGUSR2',
};

/**
 * Process Control Block (PCB)
 */
export class Process {
  constructor(options) {
    this.pid = options.pid;
    this.ppid = options.ppid || 0;  // Parent PID
    this.name = options.name || 'process';
    this.state = PROC_STATE.NEW;
    this.priority = options.priority || PRIORITY.NORMAL;
    this.sandbox = null;
    this.code = options.code || null;
    this.args = options.args || [];
    this.env = options.env || {};
    this.cwd = options.cwd || '/';
    this.uid = options.uid || 0;
    this.gid = options.gid || 0;
    this.created = Date.now();
    this.started = null;
    this.ended = null;
    this.exitCode = null;
    this.cpu = 0;  // CPU time used
    this.memory = 0;  // Memory used
    this.children = new Set();
    this.signals = [];
    this.messageQueue = [];
    this.waiters = [];  // Processes waiting for this one
  }

  toJSON() {
    return {
      pid: this.pid,
      ppid: this.ppid,
      name: this.name,
      state: this.state,
      priority: this.priority,
      cwd: this.cwd,
      uid: this.uid,
      created: this.created,
      cpu: this.cpu,
      memory: this.memory,
    };
  }
}

/**
 * Kernel - manages processes and resources
 */
export class Kernel {
  constructor(options = {}) {
    this.nodeId = options.nodeId || 'node-' + Math.random().toString(36).slice(2, 8);
    this.hostname = options.hostname || this.nodeId;
    this.processes = new Map();
    this.nextPid = 1;
    this.runQueue = [];
    this.waitQueue = [];
    this.running = null;
    this.timeSlice = options.timeSlice || 100;  // ms
    this.bootTime = Date.now();
    this.syscalls = new Map();
    this.messageHandlers = new Map();
    this.peers = new Map();  // Other nodes

    this._setupSyscalls();
  }

  /**
   * Setup system calls
   */
  _setupSyscalls() {
    // Process management
    this.syscalls.set('fork', this._fork.bind(this));
    this.syscalls.set('exec', this._exec.bind(this));
    this.syscalls.set('exit', this._exit.bind(this));
    this.syscalls.set('wait', this._wait.bind(this));
    this.syscalls.set('kill', this._kill.bind(this));
    this.syscalls.set('getpid', this._getpid.bind(this));
    this.syscalls.set('getppid', this._getppid.bind(this));

    // IPC
    this.syscalls.set('send', this._send.bind(this));
    this.syscalls.set('recv', this._recv.bind(this));
    this.syscalls.set('signal', this._signal.bind(this));

    // Info
    this.syscalls.set('ps', this._ps.bind(this));
    this.syscalls.set('uptime', this._uptime.bind(this));
    this.syscalls.set('hostname', () => this.hostname);
  }

  /**
   * Boot the kernel
   */
  async boot() {
    console.log(`[KERNEL] Booting ${this.hostname}...`);

    // Create init process (PID 1)
    await this.spawn({
      name: 'init',
      priority: PRIORITY.HIGH,
      code: async (proc, kernel) => {
        console.log('[init] System initialized');
        // Init stays alive as long as kernel runs
        while (proc.state !== PROC_STATE.TERMINATED) {
          await new Promise(r => setTimeout(r, 1000));
        }
      },
    });

    console.log(`[KERNEL] Boot complete. PID 1 running.`);
    return this;
  }

  /**
   * Shutdown kernel
   */
  async shutdown() {
    console.log(`[KERNEL] Shutting down...`);

    // Kill all processes except init
    for (const [pid, proc] of this.processes) {
      if (pid !== 1) {
        await this.kill(pid, SIGNAL.KILL);
      }
    }

    // Kill init
    await this.kill(1, SIGNAL.KILL);

    this.processes.clear();
    console.log(`[KERNEL] Shutdown complete.`);
  }

  /**
   * Spawn a new process
   */
  async spawn(options) {
    const pid = this.nextPid++;
    const proc = new Process({
      pid,
      ppid: options.ppid || (this.running?.pid || 0),
      name: options.name,
      priority: options.priority,
      code: options.code,
      args: options.args,
      env: { ...options.env, PID: pid, HOSTNAME: this.hostname },
      cwd: options.cwd || '/',
    });

    // Track parent-child
    if (proc.ppid > 0) {
      const parent = this.processes.get(proc.ppid);
      if (parent) parent.children.add(pid);
    }

    this.processes.set(pid, proc);

    // Create sandbox for process (optional - may fail in some environments)
    try {
      proc.sandbox = new Sandbox({ id: `proc-${pid}`, timeout: 2000 });
      await proc.sandbox.start();
    } catch (e) {
      console.warn(`[KERNEL] Sandbox creation failed for PID ${pid}: ${e.message}`);
      proc.sandbox = null; // Process runs without sandbox
    }

    // Start process
    proc.state = PROC_STATE.READY;
    this.runQueue.push(proc);

    // Execute if code provided
    if (proc.code) {
      this._runProcess(proc);
    }

    return proc;
  }

  /**
   * Run process code
   */
  async _runProcess(proc) {
    proc.state = PROC_STATE.RUNNING;
    proc.started = Date.now();
    this.running = proc;

    try {
      await proc.code(proc, this);
      proc.exitCode = 0;
    } catch (err) {
      console.error(`[KERNEL] Process ${proc.pid} error:`, err.message);
      proc.exitCode = 1;
    }

    this._terminateProcess(proc);
  }

  /**
   * Terminate process
   */
  _terminateProcess(proc) {
    proc.state = PROC_STATE.TERMINATED;
    proc.ended = Date.now();

    // Stop sandbox
    proc.sandbox?.stop();

    // Notify waiters
    for (const waiter of proc.waiters) {
      waiter.resolve(proc.exitCode);
    }

    // Reparent children to init
    for (const childPid of proc.children) {
      const child = this.processes.get(childPid);
      if (child) child.ppid = 1;
    }

    // Remove from run queue
    this.runQueue = this.runQueue.filter(p => p.pid !== proc.pid);

    if (this.running?.pid === proc.pid) {
      this.running = null;
    }
  }

  /**
   * Kill process
   */
  async kill(pid, signal = SIGNAL.TERM) {
    const proc = this.processes.get(pid);
    if (!proc) return false;

    proc.signals.push({ signal, time: Date.now() });

    if (signal === SIGNAL.KILL || signal === SIGNAL.TERM) {
      this._terminateProcess(proc);
    } else if (signal === SIGNAL.STOP) {
      proc.state = PROC_STATE.BLOCKED;
    } else if (signal === SIGNAL.CONT) {
      if (proc.state === PROC_STATE.BLOCKED) {
        proc.state = PROC_STATE.READY;
        this.runQueue.push(proc);
      }
    }

    return true;
  }

  /**
   * System call interface
   */
  async syscall(name, ...args) {
    const handler = this.syscalls.get(name);
    if (!handler) {
      throw new Error(`Unknown syscall: ${name}`);
    }
    return handler(...args);
  }

  // === SYSCALL IMPLEMENTATIONS ===

  async _fork() {
    if (!this.running) throw new Error('No running process');
    return this.spawn({
      ppid: this.running.pid,
      name: this.running.name,
      priority: this.running.priority,
      cwd: this.running.cwd,
      env: { ...this.running.env },
    });
  }

  async _exec(code, args = []) {
    if (!this.running) throw new Error('No running process');
    this.running.code = code;
    this.running.args = args;
    await this._runProcess(this.running);
  }

  async _exit(code = 0) {
    if (!this.running) return;
    this.running.exitCode = code;
    this._terminateProcess(this.running);
  }

  async _wait(pid) {
    const proc = this.processes.get(pid);
    if (!proc) return -1;
    if (proc.state === PROC_STATE.TERMINATED) {
      return proc.exitCode;
    }
    return new Promise(resolve => {
      proc.waiters.push({ resolve });
    });
  }

  async _kill(pid, signal) {
    return this.kill(pid, signal);
  }

  _getpid() {
    return this.running?.pid || 0;
  }

  _getppid() {
    return this.running?.ppid || 0;
  }

  async _send(toPid, message) {
    const proc = this.processes.get(toPid);
    if (!proc) return false;
    proc.messageQueue.push({
      from: this.running?.pid || 0,
      message,
      time: Date.now(),
    });
    return true;
  }

  async _recv() {
    if (!this.running) return null;
    return this.running.messageQueue.shift() || null;
  }

  async _signal(pid, signal) {
    return this.kill(pid, signal);
  }

  _ps() {
    return Array.from(this.processes.values()).map(p => p.toJSON());
  }

  _uptime() {
    return Date.now() - this.bootTime;
  }

  /**
   * Add peer node
   */
  addPeer(nodeId, channel) {
    this.peers.set(nodeId, { id: nodeId, channel });

    channel.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this._handlePeerMessage(nodeId, msg);
      } catch (err) {
        console.error('[KERNEL] Peer message error:', err);
      }
    };
  }

  /**
   * Handle message from peer
   */
  _handlePeerMessage(fromNode, msg) {
    const handler = this.messageHandlers.get(msg.type);
    if (handler) {
      handler(fromNode, msg);
    }
  }

  /**
   * Send message to peer
   */
  sendToPeer(nodeId, msg) {
    const peer = this.peers.get(nodeId);
    if (peer?.channel?.readyState === 'open') {
      peer.channel.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  /**
   * Broadcast to all peers
   */
  broadcast(msg) {
    for (const [nodeId, _] of this.peers) {
      this.sendToPeer(nodeId, msg);
    }
  }

  /**
   * Get kernel stats
   */
  stats() {
    return {
      nodeId: this.nodeId,
      hostname: this.hostname,
      uptime: Date.now() - this.bootTime,
      processes: this.processes.size,
      running: this.running?.pid || null,
      peers: this.peers.size,
    };
  }
}

export default Kernel;
