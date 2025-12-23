/**
 * Store Module
 * IndexedDB wrapper for persistent storage
 */

import { openDB } from 'idb'
import { DB_CONFIG, CACHE_CONFIG } from '../config.js'

/**
 * IndexedDB Store wrapper
 */
export class Store {
  constructor(dbName = DB_CONFIG.name, version = DB_CONFIG.version) {
    this.dbName = dbName
    this.version = version
    this._db = null
    this._ready = false
  }

  /**
   * Initialize the database
   */
  async init() {
    if (this._ready) return

    this._db = await openDB(this.dbName, this.version, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Identity store
        if (!db.objectStoreNames.contains('identity')) {
          db.createObjectStore('identity', { keyPath: 'id' })
        }

        // Peers store with indexes
        if (!db.objectStoreNames.contains('peers')) {
          const peersStore = db.createObjectStore('peers', { keyPath: 'id' })
          peersStore.createIndex('by-score', 'score')
          peersStore.createIndex('by-seen', 'seen')
          peersStore.createIndex('by-trusted', 'trusted')
        }

        // Rooms store with indexes
        if (!db.objectStoreNames.contains('rooms')) {
          const roomsStore = db.createObjectStore('rooms', { keyPath: 'id' })
          roomsStore.createIndex('by-lastSync', 'lastSync')
          roomsStore.createIndex('by-name', 'name')
        }

        // Messages store with indexes
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id' })
          messagesStore.createIndex('by-room', 'room')
          messagesStore.createIndex('by-from', 'from')
          messagesStore.createIndex('by-ts', 'ts')
          messagesStore.createIndex('by-room-ts', ['room', 'ts'])
        }

        // Blobs store with indexes
        if (!db.objectStoreNames.contains('blobs')) {
          const blobsStore = db.createObjectStore('blobs', { keyPath: 'hash' })
          blobsStore.createIndex('by-refs', 'refs')
          blobsStore.createIndex('by-pinned', 'pinned')
        }

        // Offline queue store
        if (!db.objectStoreNames.contains('offline-queue')) {
          const queueStore = db.createObjectStore('offline-queue', { keyPath: 'id', autoIncrement: true })
          queueStore.createIndex('by-ts', 'ts')
        }
      }
    })

    this._ready = true
  }

  /**
   * Get a value by key from a store
   * @param {string} storeName
   * @param {string} key
   * @returns {Promise<any>}
   */
  async get(storeName, key) {
    await this.init()
    return this._db.get(storeName, key)
  }

  /**
   * Get all values from a store
   * @param {string} storeName
   * @returns {Promise<any[]>}
   */
  async getAll(storeName) {
    await this.init()
    return this._db.getAll(storeName)
  }

  /**
   * Get values by index
   * @param {string} storeName
   * @param {string} indexName
   * @param {any} query
   * @returns {Promise<any[]>}
   */
  async getAllByIndex(storeName, indexName, query) {
    await this.init()
    return this._db.getAllFromIndex(storeName, indexName, query)
  }

  /**
   * Get values with a range query
   * @param {string} storeName
   * @param {string} indexName
   * @param {IDBKeyRange} range
   * @returns {Promise<any[]>}
   */
  async getRange(storeName, indexName, range) {
    await this.init()
    return this._db.getAllFromIndex(storeName, indexName, range)
  }

  /**
   * Put a value in a store
   * @param {string} storeName
   * @param {object} value
   * @returns {Promise<any>}
   */
  async put(storeName, value) {
    await this.init()
    return this._db.put(storeName, value)
  }

  /**
   * Put multiple values in a store
   * @param {string} storeName
   * @param {object[]} values
   */
  async putMany(storeName, values) {
    await this.init()
    const tx = this._db.transaction(storeName, 'readwrite')
    await Promise.all([
      ...values.map(v => tx.store.put(v)),
      tx.done
    ])
  }

  /**
   * Delete a value from a store
   * @param {string} storeName
   * @param {string} key
   */
  async delete(storeName, key) {
    await this.init()
    return this._db.delete(storeName, key)
  }

  /**
   * Clear all values from a store
   * @param {string} storeName
   */
  async clear(storeName) {
    await this.init()
    return this._db.clear(storeName)
  }

  /**
   * Count values in a store
   * @param {string} storeName
   * @returns {Promise<number>}
   */
  async count(storeName) {
    await this.init()
    return this._db.count(storeName)
  }

  /**
   * Get keys from a store
   * @param {string} storeName
   * @returns {Promise<string[]>}
   */
  async keys(storeName) {
    await this.init()
    return this._db.getAllKeys(storeName)
  }

  /**
   * Check if a key exists
   * @param {string} storeName
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async has(storeName, key) {
    const value = await this.get(storeName, key)
    return value !== undefined
  }

  /**
   * Transaction helper for complex operations
   * @param {string[]} storeNames
   * @param {string} mode - 'readonly' or 'readwrite'
   * @param {function} callback
   */
  async transaction(storeNames, mode, callback) {
    await this.init()
    const tx = this._db.transaction(storeNames, mode)
    await callback(tx)
    await tx.done
  }

  /**
   * Close the database
   */
  close() {
    if (this._db) {
      this._db.close()
      this._db = null
      this._ready = false
    }
  }
}

/**
 * Cache with LRU eviction
 */
export class LRUCache {
  constructor(maxSize = CACHE_CONFIG.maxSize) {
    this.maxSize = maxSize
    this.cache = new Map()
    this.size = 0
  }

  /**
   * Get a value from cache
   * @param {string} key
   * @returns {any}
   */
  get(key) {
    if (!this.cache.has(key)) return undefined

    // Move to end (most recently used)
    const entry = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  /**
   * Set a value in cache
   * @param {string} key
   * @param {any} value
   * @param {number} size - Size in bytes
   */
  set(key, value, size = 0) {
    // Remove existing if present
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)
      this.size -= existing.size
      this.cache.delete(key)
    }

    // Evict if necessary
    while (this.size + size > this.maxSize && this.cache.size > 0) {
      const oldest = this.cache.keys().next().value
      const entry = this.cache.get(oldest)
      this.size -= entry.size
      this.cache.delete(oldest)
    }

    // Add new entry
    this.cache.set(key, { value, size })
    this.size += size
  }

  /**
   * Delete a value from cache
   * @param {string} key
   */
  delete(key) {
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)
      this.size -= entry.size
      this.cache.delete(key)
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear()
    this.size = 0
  }

  /**
   * Check if key exists
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key)
  }
}

/**
 * Blob store for binary data with reference counting
 */
export class BlobStore {
  constructor(store) {
    this._store = store
    this._cache = new LRUCache()
  }

  /**
   * Store a blob
   * @param {Uint8Array} data
   * @param {boolean} pinned
   * @returns {Promise<string>} - Hash of the blob
   */
  async put(data, pinned = false) {
    const hashBytes = await crypto.subtle.digest('SHA-256', data)
    const hash = Array.from(new Uint8Array(hashBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const existing = await this._store.get('blobs', hash)
    if (existing) {
      // Increment reference count
      await this._store.put('blobs', {
        ...existing,
        refs: existing.refs + 1,
        pinned: existing.pinned || pinned
      })
    } else {
      await this._store.put('blobs', {
        hash,
        data: Array.from(data), // Store as array for IndexedDB
        refs: 1,
        pinned,
        created: Date.now()
      })
    }

    // Cache it
    this._cache.set(hash, data, data.length)

    return hash
  }

  /**
   * Get a blob by hash
   * @param {string} hash
   * @returns {Promise<Uint8Array|null>}
   */
  async get(hash) {
    // Check cache first
    const cached = this._cache.get(hash)
    if (cached) return cached

    const blob = await this._store.get('blobs', hash)
    if (!blob) return null

    const data = new Uint8Array(blob.data)
    this._cache.set(hash, data, data.length)
    return data
  }

  /**
   * Release a reference to a blob
   * @param {string} hash
   */
  async release(hash) {
    const blob = await this._store.get('blobs', hash)
    if (!blob) return

    if (blob.refs <= 1 && !blob.pinned) {
      await this._store.delete('blobs', hash)
      this._cache.delete(hash)
    } else {
      await this._store.put('blobs', {
        ...blob,
        refs: blob.refs - 1
      })
    }
  }

  /**
   * Pin a blob (prevent deletion)
   * @param {string} hash
   */
  async pin(hash) {
    const blob = await this._store.get('blobs', hash)
    if (blob) {
      await this._store.put('blobs', { ...blob, pinned: true })
    }
  }

  /**
   * Unpin a blob
   * @param {string} hash
   */
  async unpin(hash) {
    const blob = await this._store.get('blobs', hash)
    if (blob) {
      await this._store.put('blobs', { ...blob, pinned: false })
    }
  }

  /**
   * Check if a blob exists
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  async has(hash) {
    return await this._store.has('blobs', hash)
  }

  /**
   * Get total storage used
   * @returns {Promise<number>}
   */
  async getStorageUsed() {
    const blobs = await this._store.getAll('blobs')
    return blobs.reduce((sum, b) => sum + b.data.length, 0)
  }

  /**
   * Clean up unreferenced blobs
   */
  async gc() {
    const blobs = await this._store.getAll('blobs')
    for (const blob of blobs) {
      if (blob.refs <= 0 && !blob.pinned) {
        await this._store.delete('blobs', blob.hash)
        this._cache.delete(blob.hash)
      }
    }
  }
}

// Singleton store instance
let defaultStore = null

/**
 * Get the default store instance
 * @returns {Promise<Store>}
 */
export async function getStore() {
  if (!defaultStore) {
    defaultStore = new Store()
    await defaultStore.init()
  }
  return defaultStore
}

/**
 * Get a blob store instance
 * @returns {Promise<BlobStore>}
 */
export async function getBlobStore() {
  const store = await getStore()
  return new BlobStore(store)
}

export default {
  Store,
  LRUCache,
  BlobStore,
  getStore,
  getBlobStore
}
