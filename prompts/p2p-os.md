# P2P OS Build Prompt

## Goal
Distributed operating system for P2P virtual machines using ISA-95 hierarchy.

## Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    P2P MESH NETWORK                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    VM-1     │──│    VM-2     │──│    VM-3     │         │
│  │  (Node A)   │  │  (Node B)   │  │  (Node C)   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│  ┌──────┴────────────────┴────────────────┴──────┐         │
│  │              CRDT SYNC LAYER                   │         │
│  │    (VFS + Process State + Shared Memory)       │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## ISA-95 Mapping
```
Enterprise  → Network (all VMs)
Site        → Cluster (group of VMs)
Area        → Single VM instance
WorkCenter  → Process Group
WorkUnit    → Process
Equipment   → Thread/Task
```

## Components

### Kernel (src/os/kernel.js)
```javascript
// Process States
NEW → READY → RUNNING → WAITING → TERMINATED
                ↓
             BLOCKED

// Process Control Block
- pid, ppid (parent)
- name, state, priority
- sandbox (isolated execution)
- code, args, env, cwd
- uid, gid (permissions)
- signals, messageQueue

// System Calls
Process: fork, exec, exit, wait, kill, getpid, getppid
IPC: send, recv, signal
Info: ps, uptime, hostname
```

### Virtual File System (src/os/vfs.js)
```javascript
// File Types
FILE, DIR, LINK, DEV, PIPE, SOCKET

// Inode
- id, type, name, parent
- mode (Unix permissions)
- uid, gid, size, data
- children (for dirs)
- version (CRDT)

// Operations
mkdir, rmdir, writeFile, readFile, unlink
readdir, stat, exists, chdir, getcwd
open, close, read, write

// Structure
/
├── bin/
├── dev/
│   ├── null
│   ├── zero
│   ├── random
│   └── tty
├── etc/
│   ├── hostname
│   ├── passwd
│   └── motd
├── home/
├── tmp/
├── var/
│   └── log/
└── proc/
```

### VM Runtime (src/os/vm.js)
```javascript
// VM States (PackML)
OFF → BOOTING → RUNNING → SUSPENDED → SHUTTING_DOWN
                   ↓
               MIGRATING

// Features
- Kernel + VFS integration
- P2P peer connections
- Shared memory (CRDT)
- State export/import (migration)
- Event system

// Shared Memory Syscalls
shm_get(key) → value
shm_set(key, value)
shm_delete(key)

// Sync Types
VFS_UPDATE, VFS_FULL
PROC_SPAWN, PROC_KILL, PROC_MIGRATE
SHM_UPDATE, HEARTBEAT
```

## Usage
```javascript
import { VM, VMCluster } from './os/vm.js';

// Create cluster
const cluster = new VMCluster({ id: 'my-cluster' });

// Boot VM
const vm = await cluster.createVM({ name: 'node-1' });

// Run commands
vm.vfs.mkdir('/home/user');
vm.vfs.writeFile('/home/user/hello.txt', 'Hello P2P!');

// Spawn process
await vm.spawn({
  name: 'worker',
  code: async (proc, kernel) => {
    console.log('Worker running');
    await new Promise(r => setTimeout(r, 5000));
    console.log('Worker done');
  }
});

// Connect VMs
const vm2 = await cluster.createVM({ name: 'node-2' });
cluster.connectVMs(vm.id, vm2.id, channel1, channel2);

// Shared memory (synced across VMs)
vm.shmSet('config', { mode: 'production' });
vm2.shmGet('config'); // → { mode: 'production' }

// Export/Import (migration)
const snapshot = vm.export();
newVM.import(snapshot);
```

## Demo
```
src/demo/os-demo.html
- Interactive terminal
- Boot/shutdown VM
- Shell commands (ls, cd, cat, echo, touch, rm, mkdir, ps, kill)
- Process management
- File system browser
- P2P peer connections
```

## Files
```
src/os/
├── kernel.js    # Process management, scheduling, IPC
├── vfs.js       # Virtual file system (CRDT)
└── vm.js        # VM runtime, P2P sync, shared memory

src/demo/
└── os-demo.html # Interactive OS demo
```
