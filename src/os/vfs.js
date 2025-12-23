/**
 * @file src/os/vfs.js
 * @desc Virtual File System - CRDT-synced across P2P network
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────┐
 * │           VIRTUAL FILE SYSTEM           │
 * │  ┌─────────────────────────────────┐   │
 * │  │          Inode Table            │   │
 * │  │  (CRDT - synced across nodes)   │   │
 * │  └─────────────────────────────────┘   │
 * │                  │                      │
 * │  ┌───────────────┴───────────────┐     │
 * │  │                               │     │
 * │  ▼                               ▼     │
 * │  /                              /dev   │
 * │  ├── bin/                       ├── null  │
 * │  ├── etc/                       ├── zero  │
 * │  ├── home/                      └── random│
 * │  ├── tmp/                               │
 * │  └── var/                               │
 * └─────────────────────────────────────────┘
 *
 * Storage: IndexedDB (local) + CRDT sync (remote)
 */

/**
 * File types
 */
export const FILE_TYPE = {
  FILE: 'file',
  DIR: 'dir',
  LINK: 'link',
  DEV: 'dev',
  PIPE: 'pipe',
  SOCKET: 'socket',
};

/**
 * File permissions (Unix-style)
 */
export const PERM = {
  R: 4,  // Read
  W: 2,  // Write
  X: 1,  // Execute
};

/**
 * Inode - file system node
 */
export class Inode {
  constructor(options) {
    this.id = options.id || crypto.randomUUID();
    this.type = options.type || FILE_TYPE.FILE;
    this.name = options.name;
    this.parent = options.parent || null;
    this.mode = options.mode || 0o644;  // rw-r--r--
    this.uid = options.uid || 0;
    this.gid = options.gid || 0;
    this.size = 0;
    this.data = options.data || null;
    this.children = new Map();  // For directories
    this.created = Date.now();
    this.modified = Date.now();
    this.accessed = Date.now();
    this.links = 1;
    this.target = options.target || null;  // For symlinks
    this.version = 0;  // CRDT version
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      parent: this.parent,
      mode: this.mode,
      uid: this.uid,
      gid: this.gid,
      size: this.size,
      created: this.created,
      modified: this.modified,
      children: this.type === FILE_TYPE.DIR
        ? Array.from(this.children.keys())
        : undefined,
      version: this.version,
    };
  }
}

/**
 * File descriptor
 */
export class FileDescriptor {
  constructor(inode, flags, position = 0) {
    this.inode = inode;
    this.flags = flags;
    this.position = position;
    this.opened = Date.now();
  }
}

/**
 * Virtual File System
 */
export class VFS {
  constructor(options = {}) {
    this.inodes = new Map();
    this.root = null;
    this.fdTable = new Map();
    this.nextFd = 3;  // 0=stdin, 1=stdout, 2=stderr
    this.cwd = '/';
    this.onSync = options.onSync || (() => {});
    this.storageKey = options.storageKey || 'kp2p-vfs';

    this._init();
  }

  /**
   * Initialize file system
   */
  _init() {
    // Create root
    this.root = new Inode({
      id: 'root',
      type: FILE_TYPE.DIR,
      name: '/',
      mode: 0o755,
    });
    this.inodes.set('/', this.root);

    // Create standard directories
    this.mkdir('/bin');
    this.mkdir('/dev');
    this.mkdir('/etc');
    this.mkdir('/home');
    this.mkdir('/tmp', 0o1777);  // Sticky bit
    this.mkdir('/var');
    this.mkdir('/var/log');
    this.mkdir('/proc');

    // Create device files
    this._createDevice('/dev/null');
    this._createDevice('/dev/zero');
    this._createDevice('/dev/random');
    this._createDevice('/dev/tty');

    // Create basic etc files
    this.writeFile('/etc/hostname', 'kp2p-node\n');
    this.writeFile('/etc/passwd', 'root:x:0:0:root:/root:/bin/sh\n');
    this.writeFile('/etc/motd', 'Welcome to KP2P OS!\n');
  }

  /**
   * Create device file
   */
  _createDevice(path) {
    const parts = this._parsePath(path);
    const name = parts.pop();
    const parentPath = '/' + parts.join('/');
    const parent = this.inodes.get(parentPath);

    if (!parent) return null;

    const inode = new Inode({
      type: FILE_TYPE.DEV,
      name,
      parent: parentPath,
      mode: 0o666,
    });

    this.inodes.set(path, inode);
    parent.children.set(name, inode);
    return inode;
  }

  /**
   * Parse path into components
   */
  _parsePath(path) {
    // Handle relative paths
    if (!path.startsWith('/')) {
      path = this.cwd + '/' + path;
    }

    // Normalize
    const parts = path.split('/').filter(p => p && p !== '.');
    const normalized = [];

    for (const part of parts) {
      if (part === '..') {
        normalized.pop();
      } else {
        normalized.push(part);
      }
    }

    return normalized;
  }

  /**
   * Get absolute path
   */
  _absPath(path) {
    const parts = this._parsePath(path);
    return '/' + parts.join('/');
  }

  /**
   * Resolve path to inode
   */
  resolve(path) {
    const absPath = this._absPath(path);
    return this.inodes.get(absPath);
  }

  /**
   * Check permissions
   */
  checkPerm(inode, perm, uid = 0, gid = 0) {
    if (uid === 0) return true;  // Root can do anything

    let bits = inode.mode;

    if (inode.uid === uid) {
      bits = (bits >> 6) & 7;
    } else if (inode.gid === gid) {
      bits = (bits >> 3) & 7;
    } else {
      bits = bits & 7;
    }

    return (bits & perm) === perm;
  }

  /**
   * Create directory
   */
  mkdir(path, mode = 0o755) {
    const parts = this._parsePath(path);
    const name = parts.pop();
    const parentPath = '/' + parts.join('/');

    let parent = this.inodes.get(parentPath);
    if (!parent) {
      // Recursive mkdir
      this.mkdir(parentPath, mode);
      parent = this.inodes.get(parentPath);
    }

    if (!parent || parent.type !== FILE_TYPE.DIR) {
      throw new Error(`Not a directory: ${parentPath}`);
    }

    const absPath = this._absPath(path);
    if (this.inodes.has(absPath)) {
      return this.inodes.get(absPath);
    }

    const inode = new Inode({
      type: FILE_TYPE.DIR,
      name,
      parent: parentPath,
      mode,
    });

    this.inodes.set(absPath, inode);
    parent.children.set(name, inode);
    parent.modified = Date.now();

    this._sync();
    return inode;
  }

  /**
   * Remove directory
   */
  rmdir(path) {
    const absPath = this._absPath(path);
    const inode = this.inodes.get(absPath);

    if (!inode) throw new Error(`No such directory: ${path}`);
    if (inode.type !== FILE_TYPE.DIR) throw new Error(`Not a directory: ${path}`);
    if (inode.children.size > 0) throw new Error(`Directory not empty: ${path}`);

    const parent = this.inodes.get(inode.parent);
    if (parent) {
      parent.children.delete(inode.name);
      parent.modified = Date.now();
    }

    this.inodes.delete(absPath);
    this._sync();
    return true;
  }

  /**
   * Write file
   */
  writeFile(path, data) {
    const parts = this._parsePath(path);
    const name = parts.pop();
    const parentPath = '/' + parts.join('/');

    let parent = this.inodes.get(parentPath);
    if (!parent) {
      this.mkdir(parentPath);
      parent = this.inodes.get(parentPath);
    }

    const absPath = this._absPath(path);
    let inode = this.inodes.get(absPath);

    if (inode) {
      // Update existing
      inode.data = data;
      inode.size = typeof data === 'string' ? data.length : data.byteLength;
      inode.modified = Date.now();
      inode.version++;
    } else {
      // Create new
      inode = new Inode({
        type: FILE_TYPE.FILE,
        name,
        parent: parentPath,
        data,
      });
      inode.size = typeof data === 'string' ? data.length : data.byteLength;

      this.inodes.set(absPath, inode);
      parent.children.set(name, inode);
      parent.modified = Date.now();
    }

    this._sync();
    return inode;
  }

  /**
   * Read file
   */
  readFile(path) {
    const inode = this.resolve(path);
    if (!inode) throw new Error(`No such file: ${path}`);
    if (inode.type !== FILE_TYPE.FILE) throw new Error(`Not a file: ${path}`);

    inode.accessed = Date.now();
    return inode.data;
  }

  /**
   * Delete file
   */
  unlink(path) {
    const absPath = this._absPath(path);
    const inode = this.inodes.get(absPath);

    if (!inode) throw new Error(`No such file: ${path}`);
    if (inode.type === FILE_TYPE.DIR) throw new Error(`Is a directory: ${path}`);

    const parent = this.inodes.get(inode.parent);
    if (parent) {
      parent.children.delete(inode.name);
      parent.modified = Date.now();
    }

    this.inodes.delete(absPath);
    this._sync();
    return true;
  }

  /**
   * List directory
   */
  readdir(path) {
    const inode = this.resolve(path);
    if (!inode) throw new Error(`No such directory: ${path}`);
    if (inode.type !== FILE_TYPE.DIR) throw new Error(`Not a directory: ${path}`);

    inode.accessed = Date.now();
    return Array.from(inode.children.keys());
  }

  /**
   * Get file stats
   */
  stat(path) {
    const inode = this.resolve(path);
    if (!inode) throw new Error(`No such file: ${path}`);
    return inode.toJSON();
  }

  /**
   * Check if exists
   */
  exists(path) {
    return this.inodes.has(this._absPath(path));
  }

  /**
   * Change directory
   */
  chdir(path) {
    const absPath = this._absPath(path);
    const inode = this.inodes.get(absPath);

    if (!inode) throw new Error(`No such directory: ${path}`);
    if (inode.type !== FILE_TYPE.DIR) throw new Error(`Not a directory: ${path}`);

    this.cwd = absPath;
    return this.cwd;
  }

  /**
   * Get current directory
   */
  getcwd() {
    return this.cwd;
  }

  /**
   * Open file
   */
  open(path, flags = 'r') {
    const inode = this.resolve(path);

    if (!inode && flags.includes('w')) {
      // Create if writing and doesn't exist
      this.writeFile(path, '');
    } else if (!inode) {
      throw new Error(`No such file: ${path}`);
    }

    const fd = new FileDescriptor(this.resolve(path), flags);
    const fdNum = this.nextFd++;
    this.fdTable.set(fdNum, fd);
    return fdNum;
  }

  /**
   * Close file
   */
  close(fd) {
    if (!this.fdTable.has(fd)) {
      throw new Error(`Bad file descriptor: ${fd}`);
    }
    this.fdTable.delete(fd);
    return true;
  }

  /**
   * Read from file descriptor
   */
  read(fd, length) {
    const fdesc = this.fdTable.get(fd);
    if (!fdesc) throw new Error(`Bad file descriptor: ${fd}`);

    const data = fdesc.inode.data || '';
    const chunk = data.slice(fdesc.position, fdesc.position + length);
    fdesc.position += chunk.length;

    return chunk;
  }

  /**
   * Write to file descriptor
   */
  write(fd, data) {
    const fdesc = this.fdTable.get(fd);
    if (!fdesc) throw new Error(`Bad file descriptor: ${fd}`);

    const current = fdesc.inode.data || '';
    fdesc.inode.data =
      current.slice(0, fdesc.position) +
      data +
      current.slice(fdesc.position + data.length);

    fdesc.inode.size = fdesc.inode.data.length;
    fdesc.inode.modified = Date.now();
    fdesc.position += data.length;

    this._sync();
    return data.length;
  }

  /**
   * Sync to storage
   */
  _sync() {
    try {
      const snapshot = this.export();
      localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
    } catch (e) {
      // Ignore storage errors
    }
    this.onSync(this);
  }

  /**
   * Export filesystem state
   */
  export() {
    const inodes = {};
    for (const [path, inode] of this.inodes) {
      inodes[path] = {
        ...inode.toJSON(),
        data: inode.data,
      };
    }
    return { inodes, cwd: this.cwd };
  }

  /**
   * Import filesystem state
   */
  import(snapshot) {
    // Validate snapshot structure
    if (!snapshot || !snapshot.inodes || typeof snapshot.inodes !== 'object') {
      console.warn('[VFS] Invalid snapshot, skipping import');
      return;
    }

    this.inodes.clear();

    for (const [path, data] of Object.entries(snapshot.inodes)) {
      const inode = new Inode(data);
      inode.data = data.data;
      this.inodes.set(path, inode);

      // Rebuild children maps
      if (data.type === FILE_TYPE.DIR && data.children) {
        for (const childName of data.children) {
          const childPath = path === '/' ? `/${childName}` : `${path}/${childName}`;
          const childInode = this.inodes.get(childPath);
          if (childInode) {
            inode.children.set(childName, childInode);
          }
        }
      }
    }

    this.root = this.inodes.get('/');
    this.cwd = snapshot.cwd || '/';

    // Ensure root exists after import
    if (!this.root) {
      console.warn('[VFS] No root after import, reinitializing');
      this._init();
    }
  }

  /**
   * Load from storage
   */
  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const snapshot = JSON.parse(data);
        if (snapshot && snapshot.inodes) {
          this.import(snapshot);
          return true;
        }
      }
    } catch (e) {
      console.warn('[VFS] Failed to load from storage:', e.message);
      // Clear corrupted data
      try {
        localStorage.removeItem(this.storageKey);
      } catch (e2) {}
    }
    return false;
  }
}

export default VFS;
