/**
 * KonoForge Namespace Provider
 * Unified tag provider for all resources
 * Uses IndexedDB for persistence, P2P for sync
 */

import { UDTs, buildPath, parsePath } from './udts.js';

// IndexedDB setup
const DB_NAME = 'konoforge';
const DB_VERSION = 1;
let db = null;

// In-memory tag cache
const tags = new Map();
const subscriptions = new Map();

// P2P state
let peerId = null;
let peers = new Map();

/**
 * Initialize the namespace provider
 */
export async function initNamespace() {
  // Generate peer ID
  peerId = crypto.randomUUID().substring(0, 8);

  // Open IndexedDB
  db = await openDB();

  // Load persisted tags
  await loadTags();

  // Create forge root if not exists
  if (!tags.has('forge')) {
    await writeTag('forge', createInstance(UDTs.Forge, {
      ID: peerId,
      Name: 'KonoForge Local',
      Created: new Date().toISOString()
    }));
  }

  console.log(`🔨 KonoForge namespace initialized (peer: ${peerId})`);
  return { peerId, tagCount: tags.size };
}

/**
 * Open IndexedDB
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Tags store
      if (!db.objectStoreNames.contains('tags')) {
        const store = db.createObjectStore('tags', { keyPath: 'path' });
        store.createIndex('type', 'type');
        store.createIndex('parent', 'parent');
        store.createIndex('updated', 'updated');
      }

      // Blobs store (for file contents)
      if (!db.objectStoreNames.contains('blobs')) {
        db.createObjectStore('blobs', { keyPath: 'hash' });
      }

      // Objects store (git objects)
      if (!db.objectStoreNames.contains('objects')) {
        const objStore = db.createObjectStore('objects', { keyPath: 'sha' });
        objStore.createIndex('type', 'type');
      }
    };
  });
}

/**
 * Load tags from IndexedDB
 */
async function loadTags() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tags', 'readonly');
    const store = tx.objectStore('tags');
    const request = store.getAll();

    request.onsuccess = () => {
      for (const tag of request.result) {
        tags.set(tag.path, tag);
      }
      resolve(tags.size);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Create instance from UDT
 */
export function createInstance(udt, values = {}) {
  const instance = { _type: udt.name };
  for (const [key, def] of Object.entries(udt.members)) {
    instance[key] = values[key] !== undefined ? values[key] : def.default;
  }
  return instance;
}

/**
 * Write a tag
 */
export async function writeTag(path, value, options = {}) {
  const parsed = parsePath(path);
  const now = new Date().toISOString();

  const tag = {
    path,
    value,
    type: value._type || 'unknown',
    parent: getParentPath(path),
    created: tags.get(path)?.created || now,
    updated: now,
    source: options.source || peerId
  };

  tags.set(path, tag);

  // Persist to IndexedDB
  if (!options.skipPersist) {
    await persistTag(tag);
  }

  // Notify subscribers
  notifySubscribers(path, tag);

  // Broadcast to peers
  if (!options.skipBroadcast) {
    broadcastTag(tag);
  }

  return tag;
}

/**
 * Read a tag
 */
export function readTag(path) {
  return tags.get(path) || null;
}

/**
 * Read tag value
 */
export function readValue(path) {
  return tags.get(path)?.value || null;
}

/**
 * Delete a tag
 */
export async function deleteTag(path) {
  tags.delete(path);

  // Remove from IndexedDB
  const tx = db.transaction('tags', 'readwrite');
  tx.objectStore('tags').delete(path);

  // Notify subscribers
  notifySubscribers(path, null);
}

/**
 * Query tags by pattern
 */
export function queryTags(pattern, options = {}) {
  const results = [];
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));

  for (const [path, tag] of tags) {
    if (regex.test(path)) {
      if (options.type && tag.type !== options.type) continue;
      if (options.parent && tag.parent !== options.parent) continue;
      results.push(tag);
    }
  }

  // Sort by updated desc
  results.sort((a, b) => new Date(b.updated) - new Date(a.updated));

  return options.limit ? results.slice(0, options.limit) : results;
}

/**
 * Get children of a path
 */
export function getChildren(parentPath) {
  return queryTags(`${parentPath}/*`).filter(t =>
    t.path.split('/').length === parentPath.split('/').length + 1
  );
}

/**
 * Subscribe to tag changes
 */
export function subscribe(pattern, callback) {
  const id = crypto.randomUUID();
  subscriptions.set(id, { pattern, callback });
  return () => subscriptions.delete(id);
}

/**
 * Notify subscribers
 */
function notifySubscribers(path, tag) {
  for (const [id, sub] of subscriptions) {
    const regex = new RegExp(sub.pattern.replace(/\*/g, '.*'));
    if (regex.test(path)) {
      try {
        sub.callback(path, tag);
      } catch (e) {
        console.error('Subscriber error:', e);
      }
    }
  }
}

/**
 * Persist tag to IndexedDB
 */
function persistTag(tag) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tags', 'readwrite');
    const store = tx.objectStore('tags');
    const request = store.put(tag);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get parent path
 */
function getParentPath(path) {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || null;
}

/**
 * Store blob (content-addressed)
 */
export async function storeBlob(content) {
  const encoder = new TextEncoder();
  const data = typeof content === 'string' ? encoder.encode(content) : content;

  // Hash content
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Store
  return new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', 'readwrite');
    const store = tx.objectStore('blobs');
    store.put({ hash, data, size: data.byteLength });
    tx.oncomplete = () => resolve(hash);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get blob by hash
 */
export async function getBlob(hash) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', 'readonly');
    const store = tx.objectStore('blobs');
    const request = store.get(hash);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Broadcast tag to peers (stub for P2P)
 */
function broadcastTag(tag) {
  // TODO: Implement WebRTC broadcast
  // For now, just log
  // console.log('Broadcast:', tag.path);
}

/**
 * Get namespace stats
 */
export function getStats() {
  const byType = {};
  for (const tag of tags.values()) {
    byType[tag.type] = (byType[tag.type] || 0) + 1;
  }

  return {
    peerId,
    tagCount: tags.size,
    peerCount: peers.size,
    byType
  };
}

/**
 * Export all tags (for sync/backup)
 */
export function exportTags() {
  return Array.from(tags.values());
}

/**
 * Import tags (from sync/backup)
 */
export async function importTags(tagList, options = {}) {
  for (const tag of tagList) {
    await writeTag(tag.path, tag.value, {
      skipBroadcast: true,
      source: tag.source || 'import'
    });
  }
  return tagList.length;
}
