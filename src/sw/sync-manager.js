/**
 * Sync Manager
 * Coordinates background sync with service worker
 */

/**
 * Sync manager for coordinating offline/online sync
 */
export class BackgroundSyncManager {
  constructor(options = {}) {
    this.swPath = options.swPath || '/service-worker.js'
    this.syncTag = options.syncTag || 'konomi-sync'
    this._registration = null
    this._handlers = new Map()
    this._initialized = false
  }

  /**
   * Initialize sync manager and register service worker
   */
  async init() {
    if (this._initialized) return
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported')
      return
    }

    try {
      // Register service worker
      this._registration = await navigator.serviceWorker.register(this.swPath)
      console.log('Service worker registered')

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this._handleMessage(event.data)
      })

      // Listen for controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed')
        this._emit('controllerchange')
      })

      this._initialized = true
    } catch (error) {
      console.error('Service worker registration failed:', error)
    }
  }

  /**
   * Request background sync
   */
  async requestSync() {
    if (!this._registration) return false

    if ('sync' in this._registration) {
      try {
        await this._registration.sync.register(this.syncTag)
        console.log('Background sync registered')
        return true
      } catch (error) {
        console.warn('Background sync registration failed:', error)
        return false
      }
    }

    console.warn('Background sync not supported')
    return false
  }

  /**
   * Request periodic sync (if supported)
   */
  async requestPeriodicSync(minInterval = 12 * 60 * 60 * 1000) {
    if (!this._registration) return false

    if ('periodicSync' in this._registration) {
      try {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync'
        })

        if (status.state === 'granted') {
          await this._registration.periodicSync.register(this.syncTag, {
            minInterval
          })
          console.log('Periodic sync registered')
          return true
        }
      } catch (error) {
        console.warn('Periodic sync registration failed:', error)
      }
    }

    console.warn('Periodic sync not supported')
    return false
  }

  /**
   * Send message to service worker
   */
  async postMessage(message) {
    if (!navigator.serviceWorker.controller) return

    navigator.serviceWorker.controller.postMessage(message)
  }

  /**
   * Cache URLs via service worker
   */
  async cacheUrls(urls) {
    await this.postMessage({ type: 'CACHE_URLS', urls })
  }

  /**
   * Clear cache
   */
  async clearCache() {
    await this.postMessage({ type: 'CLEAR_CACHE' })
  }

  /**
   * Get cache size
   */
  async getCacheSize() {
    return new Promise((resolve) => {
      const handler = (event) => {
        if (event.data.type === 'CACHE_SIZE') {
          navigator.serviceWorker.removeEventListener('message', handler)
          resolve(event.data.size)
        }
      }

      navigator.serviceWorker.addEventListener('message', handler)
      this.postMessage({ type: 'GET_CACHE_SIZE' })

      // Timeout
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('message', handler)
        resolve(0)
      }, 5000)
    })
  }

  /**
   * Check if online
   */
  get isOnline() {
    return navigator.onLine
  }

  /**
   * Handle message from service worker
   * @private
   */
  _handleMessage(data) {
    switch (data.type) {
      case 'SYNC_REQUESTED':
        this._emit('sync-requested')
        break

      default:
        this._emit('message', data)
    }
  }

  /**
   * Add event listener
   */
  on(event, handler) {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set())
    }
    this._handlers.get(event).add(handler)
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    if (this._handlers.has(event)) {
      this._handlers.get(event).delete(handler)
    }
  }

  /**
   * Emit event
   * @private
   */
  _emit(event, data) {
    if (this._handlers.has(event)) {
      for (const handler of this._handlers.get(event)) {
        try {
          handler(data)
        } catch (err) {
          console.error('Event handler error:', err)
        }
      }
    }
  }

  /**
   * Unregister service worker
   */
  async unregister() {
    if (this._registration) {
      await this._registration.unregister()
      this._registration = null
      this._initialized = false
    }
  }

  /**
   * Update service worker
   */
  async update() {
    if (this._registration) {
      await this._registration.update()
    }
  }

  /**
   * Skip waiting and activate new worker
   */
  async skipWaiting() {
    await this.postMessage({ type: 'SKIP_WAITING' })
  }
}

/**
 * Online/offline status tracker
 */
export class ConnectionStatus {
  constructor() {
    this._online = typeof navigator !== 'undefined' ? navigator.onLine : true
    this._handlers = new Map()

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this._setOnline(true))
      window.addEventListener('offline', () => this._setOnline(false))
    }
  }

  /**
   * Check if online
   */
  get isOnline() {
    return this._online
  }

  /**
   * Set online status
   * @private
   */
  _setOnline(status) {
    if (this._online !== status) {
      this._online = status
      this._emit(status ? 'online' : 'offline')
      this._emit('change', { online: status })
    }
  }

  /**
   * Add event listener
   */
  on(event, handler) {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set())
    }
    this._handlers.get(event).add(handler)
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    if (this._handlers.has(event)) {
      this._handlers.get(event).delete(handler)
    }
  }

  /**
   * Emit event
   * @private
   */
  _emit(event, data) {
    if (this._handlers.has(event)) {
      for (const handler of this._handlers.get(event)) {
        try {
          handler(data)
        } catch (err) {
          console.error('Event handler error:', err)
        }
      }
    }
  }
}

/**
 * Network quality estimator
 */
export class NetworkQuality {
  constructor() {
    this._connection = typeof navigator !== 'undefined'
      ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
      : null

    if (this._connection) {
      this._connection.addEventListener('change', () => {
        this._onConnectionChange()
      })
    }
  }

  /**
   * Get effective connection type
   */
  get effectiveType() {
    return this._connection?.effectiveType || 'unknown'
  }

  /**
   * Get downlink speed in Mbps
   */
  get downlink() {
    return this._connection?.downlink || -1
  }

  /**
   * Get round-trip time estimate
   */
  get rtt() {
    return this._connection?.rtt || -1
  }

  /**
   * Check if connection is metered (data saver)
   */
  get saveData() {
    return this._connection?.saveData || false
  }

  /**
   * Get quality level (1-5)
   */
  get qualityLevel() {
    const type = this.effectiveType

    switch (type) {
      case '4g':
        return 5
      case '3g':
        return 3
      case '2g':
        return 2
      case 'slow-2g':
        return 1
      default:
        return this.downlink > 1 ? 4 : 3
    }
  }

  /**
   * Get quality label
   */
  get qualityLabel() {
    const level = this.qualityLevel

    switch (level) {
      case 5:
        return 'excellent'
      case 4:
        return 'good'
      case 3:
        return 'fair'
      case 2:
        return 'poor'
      case 1:
        return 'very poor'
      default:
        return 'unknown'
    }
  }

  /**
   * Handle connection change
   * @private
   */
  _onConnectionChange() {
    console.log('Network quality changed:', this.qualityLabel)
  }
}

/**
 * Create singleton instances
 */
let syncManager = null
let connectionStatus = null
let networkQuality = null

export function getSyncManager() {
  if (!syncManager) {
    syncManager = new BackgroundSyncManager()
  }
  return syncManager
}

export function getConnectionStatus() {
  if (!connectionStatus) {
    connectionStatus = new ConnectionStatus()
  }
  return connectionStatus
}

export function getNetworkQuality() {
  if (!networkQuality) {
    networkQuality = new NetworkQuality()
  }
  return networkQuality
}

export default {
  BackgroundSyncManager,
  ConnectionStatus,
  NetworkQuality,
  getSyncManager,
  getConnectionStatus,
  getNetworkQuality
}
