/**
 * Intercept Module
 * Intercept and bridge browser APIs to P2P
 */

/**
 * Storage interceptor for localStorage/sessionStorage
 */
export class StorageInterceptor {
  constructor(storage, syncMap) {
    this.storage = storage
    this.syncMap = syncMap
    this._originalMethods = {}
    this._intercepted = false
  }

  /**
   * Start intercepting storage operations
   */
  start() {
    if (this._intercepted) return
    this._intercepted = true

    // Save original methods
    this._originalMethods = {
      setItem: this.storage.setItem.bind(this.storage),
      getItem: this.storage.getItem.bind(this.storage),
      removeItem: this.storage.removeItem.bind(this.storage),
      clear: this.storage.clear.bind(this.storage)
    }

    // Load existing data into sync map
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i)
      const value = this.storage.getItem(key)
      this.syncMap.set(key, value)
    }

    // Override setItem
    this.storage.setItem = (key, value) => {
      this._originalMethods.setItem(key, value)
      this.syncMap.set(key, value)
    }

    // Override removeItem
    this.storage.removeItem = (key) => {
      this._originalMethods.removeItem(key)
      this.syncMap.delete(key)
    }

    // Override clear
    this.storage.clear = () => {
      this._originalMethods.clear()
      // Clear sync map
      const keys = Array.from(this.syncMap.keys())
      for (const key of keys) {
        this.syncMap.delete(key)
      }
    }

    // Listen for sync map changes
    this.syncMap.observe((event) => {
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'delete') {
          this._originalMethods.removeItem(key)
        } else {
          const value = this.syncMap.get(key)
          if (value !== this._originalMethods.getItem(key)) {
            this._originalMethods.setItem(key, value)
          }
        }
      })
    })
  }

  /**
   * Stop intercepting
   */
  stop() {
    if (!this._intercepted) return
    this._intercepted = false

    // Restore original methods
    if (this._originalMethods.setItem) {
      this.storage.setItem = this._originalMethods.setItem
      this.storage.getItem = this._originalMethods.getItem
      this.storage.removeItem = this._originalMethods.removeItem
      this.storage.clear = this._originalMethods.clear
    }
  }
}

/**
 * Fetch interceptor for caching and P2P fallback
 */
export class FetchInterceptor {
  constructor(options = {}) {
    this.cache = options.cache || new Map()
    this.blobStore = options.blobStore
    this.peers = options.peers || []
    this._originalFetch = null
    this._intercepted = false
    this._urlPatterns = options.urlPatterns || []
  }

  /**
   * Start intercepting fetch calls
   */
  start() {
    if (this._intercepted) return
    if (typeof fetch === 'undefined') return

    this._intercepted = true
    this._originalFetch = fetch.bind(window)

    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url

      // Check if we should intercept this URL
      if (!this._shouldIntercept(url)) {
        return this._originalFetch(input, init)
      }

      try {
        // Try original fetch first
        const response = await this._originalFetch(input, init)

        // Cache successful GET requests
        if (response.ok && (!init?.method || init.method === 'GET')) {
          const clone = response.clone()
          const blob = await clone.blob()
          const buffer = await blob.arrayBuffer()
          this.cache.set(url, {
            data: new Uint8Array(buffer),
            contentType: response.headers.get('content-type'),
            timestamp: Date.now()
          })
        }

        return response
      } catch (err) {
        // Fetch failed, try cache
        const cached = this.cache.get(url)
        if (cached) {
          console.log(`📦 Serving from cache: ${url}`)
          return new Response(cached.data, {
            headers: { 'Content-Type': cached.contentType || 'application/octet-stream' }
          })
        }

        // Try P2P
        if (this.blobStore && this.peers.length > 0) {
          const p2pResult = await this._tryP2P(url)
          if (p2pResult) {
            return p2pResult
          }
        }

        throw err
      }
    }
  }

  /**
   * Stop intercepting
   */
  stop() {
    if (!this._intercepted) return
    this._intercepted = false

    if (this._originalFetch) {
      window.fetch = this._originalFetch
    }
  }

  /**
   * Check if URL should be intercepted
   * @private
   */
  _shouldIntercept(url) {
    if (this._urlPatterns.length === 0) return true

    return this._urlPatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return url.includes(pattern)
      }
      if (pattern instanceof RegExp) {
        return pattern.test(url)
      }
      return false
    })
  }

  /**
   * Try to fetch from P2P network
   * @private
   */
  async _tryP2P(url) {
    // This would use content-addressing
    // For now, return null
    return null
  }

  /**
   * Add URL pattern to intercept
   */
  addPattern(pattern) {
    this._urlPatterns.push(pattern)
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear()
  }
}

/**
 * History interceptor for URL-based state
 */
export class HistoryInterceptor {
  constructor(syncMap) {
    this.syncMap = syncMap
    this._originalMethods = {}
    this._intercepted = false
  }

  /**
   * Start intercepting history API
   */
  start() {
    if (this._intercepted) return
    if (typeof history === 'undefined') return

    this._intercepted = true

    this._originalMethods = {
      pushState: history.pushState.bind(history),
      replaceState: history.replaceState.bind(history)
    }

    // Override pushState
    history.pushState = (state, title, url) => {
      this._originalMethods.pushState(state, title, url)
      this._syncState(state, url)
    }

    // Override replaceState
    history.replaceState = (state, title, url) => {
      this._originalMethods.replaceState(state, title, url)
      this._syncState(state, url)
    }

    // Listen for popstate
    window.addEventListener('popstate', (event) => {
      this._syncState(event.state, location.href)
    })

    // Listen for sync map changes
    this.syncMap.observe((event) => {
      const url = this.syncMap.get('_url')
      const state = this.syncMap.get('_state')

      if (url && url !== location.href) {
        this._originalMethods.replaceState(state, '', url)
      }
    })
  }

  /**
   * Stop intercepting
   */
  stop() {
    if (!this._intercepted) return
    this._intercepted = false

    if (this._originalMethods.pushState) {
      history.pushState = this._originalMethods.pushState
      history.replaceState = this._originalMethods.replaceState
    }
  }

  /**
   * Sync state to CRDT
   * @private
   */
  _syncState(state, url) {
    this.syncMap.set('_url', url)
    this.syncMap.set('_state', state)
  }
}

/**
 * Cookie interceptor (limited due to browser restrictions)
 */
export class CookieInterceptor {
  constructor(syncMap) {
    this.syncMap = syncMap
    this._intercepted = false
  }

  /**
   * Start intercepting
   */
  start() {
    if (this._intercepted) return
    if (typeof document === 'undefined') return

    this._intercepted = true

    // Read existing cookies into sync map
    this._parseCookies()

    // Listen for sync map changes
    this.syncMap.observe((event) => {
      // Note: Can't reliably intercept cookie writes
      // This is more for syncing cookie-like state
    })
  }

  /**
   * Stop intercepting
   */
  stop() {
    this._intercepted = false
  }

  /**
   * Parse cookies into sync map
   * @private
   */
  _parseCookies() {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name) {
        this.syncMap.set(`cookie:${name}`, decodeURIComponent(value || ''))
      }
    }
  }
}

/**
 * Create all interceptors for a page
 */
export function createInterceptors(doc, options = {}) {
  const storageMap = doc.getMap('_localStorage')
  const sessionMap = doc.getMap('_sessionStorage')
  const historyMap = doc.getMap('_history')
  const cookieMap = doc.getMap('_cookies')

  const interceptors = {
    localStorage: typeof localStorage !== 'undefined'
      ? new StorageInterceptor(localStorage, storageMap)
      : null,
    sessionStorage: typeof sessionStorage !== 'undefined'
      ? new StorageInterceptor(sessionStorage, sessionMap)
      : null,
    history: new HistoryInterceptor(historyMap),
    cookies: new CookieInterceptor(cookieMap),
    fetch: new FetchInterceptor(options.fetch || {})
  }

  return {
    /**
     * Start all interceptors
     */
    startAll() {
      Object.values(interceptors).forEach(i => i?.start())
    },

    /**
     * Stop all interceptors
     */
    stopAll() {
      Object.values(interceptors).forEach(i => i?.stop())
    },

    /**
     * Get specific interceptor
     */
    get(name) {
      return interceptors[name]
    },

    /**
     * Start specific interceptor
     */
    start(name) {
      interceptors[name]?.start()
    },

    /**
     * Stop specific interceptor
     */
    stop(name) {
      interceptors[name]?.stop()
    }
  }
}

export default {
  StorageInterceptor,
  FetchInterceptor,
  HistoryInterceptor,
  CookieInterceptor,
  createInterceptors
}
