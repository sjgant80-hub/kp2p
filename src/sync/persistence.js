/**
 * Persistence Module
 * IndexedDB ↔ Yjs synchronization
 */

import * as Y from 'yjs'
import { getStore } from '../core/store.js'

/**
 * Persistence provider for Yjs documents
 * Automatically saves and loads document state from IndexedDB
 */
export class IndexedDBPersistence {
  /**
   * Create persistence provider
   * @param {string} docName - Document identifier
   * @param {Y.Doc} doc - Yjs document
   * @param {object} options
   */
  constructor(docName, doc, options = {}) {
    this.docName = docName
    this.doc = doc
    this.storeName = options.storeName || 'rooms'
    this._store = null
    this._synced = false
    this._saveTimeout = null
    this._saveDebounce = options.saveDebounce || 1000

    // Bind methods
    this._onUpdate = this._onUpdate.bind(this)

    // Initialize
    this._init()
  }

  /**
   * Initialize persistence
   * @private
   */
  async _init() {
    this._store = await getStore()

    // Load existing state
    await this._load()

    // Listen for updates
    this.doc.on('update', this._onUpdate)

    this._synced = true
  }

  /**
   * Check if synced with storage
   * @returns {boolean}
   */
  get synced() {
    return this._synced
  }

  /**
   * Load document from storage
   * @private
   */
  async _load() {
    try {
      const stored = await this._store.get(this.storeName, this.docName)
      if (stored?.state) {
        const update = new Uint8Array(stored.state)
        Y.applyUpdate(this.doc, update, 'persistence')
      }
    } catch (err) {
      console.warn('Failed to load document:', err.message)
    }
  }

  /**
   * Handle document update
   * @private
   */
  _onUpdate(update, origin) {
    if (origin === 'persistence') return // Ignore our own updates

    // Debounce saves
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout)
    }

    this._saveTimeout = setTimeout(() => {
      this._save()
    }, this._saveDebounce)
  }

  /**
   * Save document to storage
   * @private
   */
  async _save() {
    try {
      const state = Y.encodeStateAsUpdate(this.doc)

      await this._store.put(this.storeName, {
        id: this.docName,
        state: Array.from(state),
        lastSync: Date.now()
      })
    } catch (err) {
      console.warn('Failed to save document:', err.message)
    }
  }

  /**
   * Force save
   * @returns {Promise}
   */
  async save() {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout)
      this._saveTimeout = null
    }
    return this._save()
  }

  /**
   * Clear stored document
   * @returns {Promise}
   */
  async clear() {
    await this._store.delete(this.storeName, this.docName)
  }

  /**
   * Destroy persistence provider
   */
  destroy() {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout)
    }

    this.doc.off('update', this._onUpdate)

    // Final save
    this._save()
  }
}

/**
 * Offline queue for pending changes
 */
export class OfflineQueue {
  constructor(options = {}) {
    this._store = null
    this.storeName = 'offline-queue'
    this._initialized = false
  }

  /**
   * Initialize queue
   */
  async init() {
    if (this._initialized) return
    this._store = await getStore()
    this._initialized = true
  }

  /**
   * Add item to queue
   * @param {object} item
   * @returns {Promise<number>} - Queue item ID
   */
  async add(item) {
    await this.init()

    return this._store.put(this.storeName, {
      ...item,
      ts: Date.now(),
      retries: 0
    })
  }

  /**
   * Get all queued items
   * @returns {Promise<Array>}
   */
  async getAll() {
    await this.init()
    return this._store.getAll(this.storeName)
  }

  /**
   * Get pending items (not yet synced)
   * @returns {Promise<Array>}
   */
  async getPending() {
    await this.init()
    const items = await this.getAll()
    return items.filter(i => !i.synced)
  }

  /**
   * Mark item as synced
   * @param {number} id
   */
  async markSynced(id) {
    await this.init()
    const item = await this._store.get(this.storeName, id)
    if (item) {
      await this._store.put(this.storeName, {
        ...item,
        synced: true,
        syncedAt: Date.now()
      })
    }
  }

  /**
   * Remove item from queue
   * @param {number} id
   */
  async remove(id) {
    await this.init()
    await this._store.delete(this.storeName, id)
  }

  /**
   * Clear all queued items
   */
  async clear() {
    await this.init()
    await this._store.clear(this.storeName)
  }

  /**
   * Increment retry count
   * @param {number} id
   */
  async incrementRetry(id) {
    await this.init()
    const item = await this._store.get(this.storeName, id)
    if (item) {
      await this._store.put(this.storeName, {
        ...item,
        retries: (item.retries || 0) + 1,
        lastRetry: Date.now()
      })
    }
  }

  /**
   * Get queue size
   * @returns {Promise<number>}
   */
  async size() {
    await this.init()
    return this._store.count(this.storeName)
  }
}

/**
 * Sync manager for coordinating persistence and offline queue
 */
export class SyncManager {
  /**
   * Create sync manager
   * @param {Room} room
   */
  constructor(room) {
    this.room = room
    this.persistence = null
    this.offlineQueue = new OfflineQueue()
    this._online = typeof navigator !== 'undefined' ? navigator.onLine : true
    this._syncInterval = null
  }

  /**
   * Start sync manager
   * @param {object} options
   */
  async start(options = {}) {
    // Set up persistence
    this.persistence = new IndexedDBPersistence(
      this.room.id,
      this.room.doc,
      options
    )

    // Initialize offline queue
    await this.offlineQueue.init()

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this._onOnline.bind(this))
      window.addEventListener('offline', this._onOffline.bind(this))
    }

    // Start periodic sync check
    this._syncInterval = setInterval(() => {
      this._checkSync()
    }, 30000)

    // Process any pending items
    if (this._online) {
      await this._processPending()
    }
  }

  /**
   * Stop sync manager
   */
  stop() {
    if (this.persistence) {
      this.persistence.destroy()
    }

    if (this._syncInterval) {
      clearInterval(this._syncInterval)
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this._onOnline)
      window.removeEventListener('offline', this._onOffline)
    }
  }

  /**
   * Handle coming online
   * @private
   */
  async _onOnline() {
    this._online = true
    await this._processPending()
  }

  /**
   * Handle going offline
   * @private
   */
  _onOffline() {
    this._online = false
  }

  /**
   * Process pending queue items
   * @private
   */
  async _processPending() {
    const pending = await this.offlineQueue.getPending()

    for (const item of pending) {
      try {
        // The update should already be in the doc
        // Just mark as synced when we're online
        await this.offlineQueue.markSynced(item.id)
      } catch (err) {
        await this.offlineQueue.incrementRetry(item.id)
      }
    }
  }

  /**
   * Check and perform sync
   * @private
   */
  async _checkSync() {
    if (!this._online) return

    // Force room sync
    this.room.sync()

    // Save to persistence
    if (this.persistence) {
      await this.persistence.save()
    }
  }

  /**
   * Force save now
   */
  async save() {
    if (this.persistence) {
      await this.persistence.save()
    }
  }

  /**
   * Check if online
   * @returns {boolean}
   */
  get isOnline() {
    return this._online
  }

  /**
   * Get pending count
   * @returns {Promise<number>}
   */
  async getPendingCount() {
    return this.offlineQueue.size()
  }
}

export default {
  IndexedDBPersistence,
  OfflineQueue,
  SyncManager
}
