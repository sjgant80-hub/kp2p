/**
 * @file src/os/vm.js
 * @desc P2P Virtual Machine - Distributed computing across mesh network
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    P2P MESH NETWORK                         │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
 * │  │    VM-1     │──│    VM-2     │──│    VM-3     │         │
 * │  │  (Node A)   │  │  (Node B)   │  │  (Node C)   │         │
 * │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
 * │         │                │                │                 │
 * │  ┌──────┴────────────────┴────────────────┴──────┐         │
 * │  │              CRDT SYNC LAYER                   │         │
 * │  │    (VFS + Process State + Shared Memory)       │         │
 * │  └────────────────────────────────────────────────┘         │
 * └─────────────────────────────────────────────────────────────┘
 *
 * ISA-95 MAPPING:
 * Enterprise  → Network of all VMs
 * Site        → VM Cluster (region)
 * Area        → Single VM instance
 * WorkCenter  → Process Group
 * WorkUnit    → Process
 * Equipment   → Thread/Task
 */

import { Kernel, PROC_STATE, PRIORITY, SIGNAL } from './kernel.js';
import { VFS, FILE_TYPE } from './vfs.js';

/**
 * VM States (PackML-inspired)
 */
export const VM_STATE = {
  OFF: 'off',
  BOOTING: 'booting',
  RUNNING: 'running',
  SUSPENDED: 'suspended',
  MIGRATING: 'migrating',
  SHUTTING_DOWN: 'shutting_down',
  ERROR: 'error',
};

/**
 * VM Events
 */
export const VM_EVENT = {
  BOOT: 'vm:boot',
  READY: 'vm:ready',
  SUSPEND: 'vm:suspend',
  RESUME: 'vm:resume',
  MIGRATE: 'vm:migrate',
  SHUTDOWN: 'vm:shutdown',
  ERROR: 'vm:error',
  SYNC: 'vm:sync',
  PEER_JOIN: 'vm:peer_join',
  PEER_LEAVE: 'vm:peer_leave',
};

/**
 * Sync message types
 */
const SYNC_TYPE = {
  VFS_UPDATE: 'vfs:update',
  VFS_FULL: 'vfs:full',
  PROC_SPAWN: 'proc:spawn',
  PROC_KILL: 'proc:kill',
  PROC_MIGRATE: 'proc:migrate',
  SHM_UPDATE: 'shm:update',
  HEARTBEAT: 'heartbeat',
};

/**
 * Virtual Machine - Complete P2P-capable computing environment
 */
export class VM {
  constructor(options = {}) {
    this.id = options.id || 'vm-' + Math.random().toString(36).slice(2, 8);
    this.name = options.name || this.id;
    this.state = VM_STATE.OFF;

    // Core components
    this.kernel = null;
    this.vfs = null;

    // P2P networking
    this.peers = new Map();
    this.dataChannels = new Map();

    // Shared memory (CRDT-synced across VMs)
    this.sharedMemory = new Map();
    this.sharedVersion = 0;

    // Event handlers
    this.eventHandlers = new Map();

    // Stats
    this.bootTime = null;
    this.stats = {
      processes: 0,
      files: 0,
      syncMessages: 0,
      bytesTransferred: 0,
    };

    // Configuration
    this.config = {
      syncInterval: options.syncInterval || 1000,
      heartbeatInterval: options.heartbeatInterval || 5000,
      maxProcesses: options.maxProcesses || 100,
      maxFiles: options.maxFiles || 10000,
      ...options.config,
    };

    this._syncTimer = null;
    this._heartbeatTimer = null;
  }

  /**
   * Boot the VM
   */
  async boot() {
    if (this.state !== VM_STATE.OFF) {
      throw new Error('VM already running');
    }

    this.state = VM_STATE.BOOTING;
    this._emit(VM_EVENT.BOOT, { id: this.id });
    console.log(`[VM:${this.id}] Booting...`);

    try {
      // Initialize VFS
      this.vfs = new VFS({
        storageKey: `kp2p-vfs-${this.id}`,
        onSync: () => this._onVfsChange(),
      });

      // Try to load persisted state
      this.vfs.load();

      // Initialize kernel
      this.kernel = new Kernel({
        nodeId: this.id,
        hostname: this.name,
      });

      // Link kernel to VFS
      this._setupKernelVfs();

      // Boot kernel
      await this.kernel.boot();

      // Start sync timers
      this._startSyncTimers();

      this.state = VM_STATE.RUNNING;
      this.bootTime = Date.now();
      this._emit(VM_EVENT.READY, { id: this.id });
      console.log(`[VM:${this.id}] Running. PID 1 active.`);

      return this;
    } catch (err) {
      this.state = VM_STATE.ERROR;
      this._emit(VM_EVENT.ERROR, { error: err.message });
      throw err;
    }
  }

  /**
   * Shutdown the VM
   */
  async shutdown() {
    if (this.state === VM_STATE.OFF) return;

    this.state = VM_STATE.SHUTTING_DOWN;
    this._emit(VM_EVENT.SHUTDOWN, { id: this.id });
    console.log(`[VM:${this.id}] Shutting down...`);

    // Stop timers
    this._stopSyncTimers();

    // Shutdown kernel
    if (this.kernel) {
      await this.kernel.shutdown();
    }

    // Disconnect peers
    for (const [peerId] of this.peers) {
      this._disconnectPeer(peerId);
    }

    this.state = VM_STATE.OFF;
    console.log(`[VM:${this.id}] Shutdown complete.`);
  }

  /**
   * Suspend the VM
   */
  async suspend() {
    if (this.state !== VM_STATE.RUNNING) return;

    this.state = VM_STATE.SUSPENDED;
    this._stopSyncTimers();
    this._emit(VM_EVENT.SUSPEND, { id: this.id });
    console.log(`[VM:${this.id}] Suspended.`);
  }

  /**
   * Resume the VM
   */
  async resume() {
    if (this.state !== VM_STATE.SUSPENDED) return;

    this.state = VM_STATE.RUNNING;
    this._startSyncTimers();
    this._emit(VM_EVENT.RESUME, { id: this.id });
    console.log(`[VM:${this.id}] Resumed.`);
  }

  /**
   * Setup kernel <-> VFS integration
   */
  _setupKernelVfs() {
    // Add VFS syscalls to kernel
    this.kernel.syscalls.set('open', (path, flags) => this.vfs.open(path, flags));
    this.kernel.syscalls.set('close', (fd) => this.vfs.close(fd));
    this.kernel.syscalls.set('read', (fd, len) => this.vfs.read(fd, len));
    this.kernel.syscalls.set('write', (fd, data) => this.vfs.write(fd, data));
    this.kernel.syscalls.set('mkdir', (path) => this.vfs.mkdir(path));
    this.kernel.syscalls.set('rmdir', (path) => this.vfs.rmdir(path));
    this.kernel.syscalls.set('unlink', (path) => this.vfs.unlink(path));
    this.kernel.syscalls.set('readdir', (path) => this.vfs.readdir(path));
    this.kernel.syscalls.set('stat', (path) => this.vfs.stat(path));
    this.kernel.syscalls.set('chdir', (path) => this.vfs.chdir(path));
    this.kernel.syscalls.set('getcwd', () => this.vfs.getcwd());
    this.kernel.syscalls.set('exists', (path) => this.vfs.exists(path));

    // Add shared memory syscalls
    this.kernel.syscalls.set('shm_get', (key) => this.shmGet(key));
    this.kernel.syscalls.set('shm_set', (key, value) => this.shmSet(key, value));
    this.kernel.syscalls.set('shm_delete', (key) => this.shmDelete(key));

    // Add VM info syscalls
    this.kernel.syscalls.set('vmid', () => this.id);
    this.kernel.syscalls.set('vmpeers', () => Array.from(this.peers.keys()));
    this.kernel.syscalls.set('vmstate', () => this.state);
  }

  // === SHARED MEMORY (CRDT-synced) ===

  /**
   * Get shared memory value
   */
  shmGet(key) {
    const entry = this.sharedMemory.get(key);
    return entry ? entry.value : undefined;
  }

  /**
   * Set shared memory value
   */
  shmSet(key, value) {
    this.sharedVersion++;
    this.sharedMemory.set(key, {
      value,
      version: this.sharedVersion,
      timestamp: Date.now(),
      origin: this.id,
    });

    // Broadcast to peers
    this._broadcast({
      type: SYNC_TYPE.SHM_UPDATE,
      key,
      value,
      version: this.sharedVersion,
    });

    return true;
  }

  /**
   * Delete shared memory value
   */
  shmDelete(key) {
    this.sharedMemory.delete(key);
    this.sharedVersion++;

    this._broadcast({
      type: SYNC_TYPE.SHM_UPDATE,
      key,
      value: null,
      deleted: true,
      version: this.sharedVersion,
    });

    return true;
  }

  // === P2P NETWORKING ===

  /**
   * Connect to peer VM
   */
  connectPeer(peerId, dataChannel) {
    this.peers.set(peerId, {
      id: peerId,
      connected: Date.now(),
      lastSeen: Date.now(),
    });

    this.dataChannels.set(peerId, dataChannel);

    // Setup message handler
    dataChannel.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this._handlePeerMessage(peerId, msg);
      } catch (err) {
        console.error(`[VM:${this.id}] Peer message error:`, err);
      }
    };

    dataChannel.onclose = () => {
      this._disconnectPeer(peerId);
    };

    // Also connect to kernel
    this.kernel.addPeer(peerId, dataChannel);

    this._emit(VM_EVENT.PEER_JOIN, { peerId });
    console.log(`[VM:${this.id}] Peer connected: ${peerId}`);

    // Send full VFS sync to new peer
    this._sendFullSync(peerId);
  }

  /**
   * Disconnect peer
   */
  _disconnectPeer(peerId) {
    this.peers.delete(peerId);
    const channel = this.dataChannels.get(peerId);
    if (channel) {
      try { channel.close(); } catch (e) {}
    }
    this.dataChannels.delete(peerId);
    this._emit(VM_EVENT.PEER_LEAVE, { peerId });
    console.log(`[VM:${this.id}] Peer disconnected: ${peerId}`);
  }

  /**
   * Handle message from peer
   */
  _handlePeerMessage(peerId, msg) {
    this.stats.syncMessages++;

    const peer = this.peers.get(peerId);
    if (peer) peer.lastSeen = Date.now();

    switch (msg.type) {
      case SYNC_TYPE.VFS_UPDATE:
        this._applyVfsUpdate(msg);
        break;

      case SYNC_TYPE.VFS_FULL:
        this._applyFullSync(msg);
        break;

      case SYNC_TYPE.SHM_UPDATE:
        this._applyShmUpdate(msg);
        break;

      case SYNC_TYPE.PROC_SPAWN:
        this._handleRemoteSpawn(msg);
        break;

      case SYNC_TYPE.HEARTBEAT:
        // Just update lastSeen (already done above)
        break;

      default:
        console.warn(`[VM:${this.id}] Unknown sync type: ${msg.type}`);
    }
  }

  /**
   * Send message to peer
   */
  _sendToPeer(peerId, msg) {
    const channel = this.dataChannels.get(peerId);
    if (channel?.readyState === 'open') {
      const data = JSON.stringify(msg);
      channel.send(data);
      this.stats.bytesTransferred += data.length;
      return true;
    }
    return false;
  }

  /**
   * Broadcast to all peers
   */
  _broadcast(msg) {
    for (const peerId of this.peers.keys()) {
      this._sendToPeer(peerId, msg);
    }
  }

  /**
   * Send full VFS sync to peer
   */
  _sendFullSync(peerId) {
    this._sendToPeer(peerId, {
      type: SYNC_TYPE.VFS_FULL,
      vfs: this.vfs.export(),
      shm: Object.fromEntries(this.sharedMemory),
      shmVersion: this.sharedVersion,
    });
  }

  /**
   * Apply VFS update from peer
   */
  _applyVfsUpdate(msg) {
    // Simple LWW (Last Write Wins) based on version
    const inode = this.vfs.inodes.get(msg.path);
    if (!inode || inode.version < msg.version) {
      if (msg.deleted) {
        try {
          if (msg.isDir) {
            this.vfs.rmdir(msg.path);
          } else {
            this.vfs.unlink(msg.path);
          }
        } catch (e) {}
      } else if (msg.isDir) {
        this.vfs.mkdir(msg.path, msg.mode);
      } else {
        this.vfs.writeFile(msg.path, msg.data);
      }
    }
  }

  /**
   * Apply full sync from peer
   */
  _applyFullSync(msg) {
    // Import VFS state (merge strategy: higher version wins)
    for (const [path, data] of Object.entries(msg.vfs.inodes)) {
      const local = this.vfs.inodes.get(path);
      if (!local || local.version < data.version) {
        // Remote is newer, apply it
        // Note: Full import would overwrite, so we do selective
        if (data.type === FILE_TYPE.DIR) {
          try { this.vfs.mkdir(path, data.mode); } catch (e) {}
        } else if (data.type === FILE_TYPE.FILE) {
          try { this.vfs.writeFile(path, data.data); } catch (e) {}
        }
      }
    }

    // Import shared memory
    for (const [key, entry] of Object.entries(msg.shm)) {
      const local = this.sharedMemory.get(key);
      if (!local || local.version < entry.version) {
        this.sharedMemory.set(key, entry);
      }
    }

    if (msg.shmVersion > this.sharedVersion) {
      this.sharedVersion = msg.shmVersion;
    }

    this._emit(VM_EVENT.SYNC, { source: 'full' });
  }

  /**
   * Apply shared memory update from peer
   */
  _applyShmUpdate(msg) {
    const local = this.sharedMemory.get(msg.key);
    if (!local || local.version < msg.version) {
      if (msg.deleted) {
        this.sharedMemory.delete(msg.key);
      } else {
        this.sharedMemory.set(msg.key, {
          value: msg.value,
          version: msg.version,
          timestamp: Date.now(),
          origin: 'remote',
        });
      }
      if (msg.version > this.sharedVersion) {
        this.sharedVersion = msg.version;
      }
    }
  }

  /**
   * Handle remote process spawn request
   */
  _handleRemoteSpawn(msg) {
    // Could spawn a local proxy process
    console.log(`[VM:${this.id}] Remote spawn request:`, msg.name);
  }

  // === VFS CHANGE TRACKING ===

  _onVfsChange() {
    // VFS changed locally, would broadcast incremental updates
    // For now, full sync on timer is simpler
    // Guard: may be called during VFS init before this.vfs is assigned
    if (this.vfs) {
      this.stats.files = this.vfs.inodes.size;
    }
  }

  // === TIMERS ===

  _startSyncTimers() {
    // Periodic sync check
    this._syncTimer = setInterval(() => {
      this.stats.processes = this.kernel?.processes.size || 0;
      this.stats.files = this.vfs?.inodes.size || 0;
    }, this.config.syncInterval);

    // Heartbeat
    this._heartbeatTimer = setInterval(() => {
      this._broadcast({ type: SYNC_TYPE.HEARTBEAT, vmId: this.id });
    }, this.config.heartbeatInterval);
  }

  _stopSyncTimers() {
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;
    }
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  // === EVENTS ===

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
  }

  _emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[VM:${this.id}] Event handler error:`, err);
        }
      }
    }
  }

  // === PROCESS MANAGEMENT (via Kernel) ===

  /**
   * Spawn a process
   */
  async spawn(options) {
    if (this.state !== VM_STATE.RUNNING) {
      throw new Error('VM not running');
    }
    return this.kernel.spawn(options);
  }

  /**
   * Kill a process
   */
  async kill(pid, signal = SIGNAL.TERM) {
    return this.kernel.kill(pid, signal);
  }

  /**
   * Execute a syscall
   */
  async syscall(name, ...args) {
    return this.kernel.syscall(name, ...args);
  }

  /**
   * List processes (sync for UI updates)
   */
  ps() {
    if (!this.kernel) return [];
    return Array.from(this.kernel.processes.values()).map(p => p.toJSON());
  }

  // === VM STATE ===

  /**
   * Get VM info
   */
  info() {
    return {
      id: this.id,
      name: this.name,
      state: this.state,
      uptime: this.bootTime ? Date.now() - this.bootTime : 0,
      kernel: this.kernel?.stats(),
      peers: Array.from(this.peers.keys()),
      stats: { ...this.stats },
    };
  }

  /**
   * Export VM state (for migration/snapshot)
   */
  export() {
    return {
      id: this.id,
      name: this.name,
      vfs: this.vfs.export(),
      shm: Object.fromEntries(this.sharedMemory),
      shmVersion: this.sharedVersion,
      timestamp: Date.now(),
    };
  }

  /**
   * Import VM state (for migration/restore)
   */
  import(snapshot) {
    if (snapshot.vfs) {
      this.vfs.import(snapshot.vfs);
    }
    if (snapshot.shm) {
      this.sharedMemory = new Map(Object.entries(snapshot.shm));
    }
    if (snapshot.shmVersion) {
      this.sharedVersion = snapshot.shmVersion;
    }
  }
}

/**
 * VM Cluster - Manages multiple VMs
 */
export class VMCluster {
  constructor(options = {}) {
    this.id = options.id || 'cluster-' + Math.random().toString(36).slice(2, 6);
    this.vms = new Map();
    this.primary = null;
  }

  /**
   * Create and boot a new VM
   */
  async createVM(options = {}) {
    const vm = new VM({
      ...options,
      id: options.id || `${this.id}-vm-${this.vms.size + 1}`,
    });

    await vm.boot();
    this.vms.set(vm.id, vm);

    if (!this.primary) {
      this.primary = vm;
    }

    return vm;
  }

  /**
   * Get VM by ID
   */
  getVM(vmId) {
    return this.vms.get(vmId);
  }

  /**
   * Connect two VMs
   */
  connectVMs(vm1Id, vm2Id, channel1, channel2) {
    const vm1 = this.vms.get(vm1Id);
    const vm2 = this.vms.get(vm2Id);

    if (vm1 && vm2) {
      vm1.connectPeer(vm2Id, channel1);
      vm2.connectPeer(vm1Id, channel2);
    }
  }

  /**
   * Shutdown all VMs
   */
  async shutdown() {
    for (const vm of this.vms.values()) {
      await vm.shutdown();
    }
    this.vms.clear();
    this.primary = null;
  }

  /**
   * List all VMs
   */
  list() {
    return Array.from(this.vms.values()).map(vm => vm.info());
  }
}

export default VM;
