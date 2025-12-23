/**
 * Service Worker for Konomi P2P
 * Handles offline caching and background sync
 */

const CACHE_NAME = 'konomi-p2p-v1'
const OFFLINE_QUEUE_NAME = 'konomi-offline-queue'

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html'
]

// Cache strategies
const STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
}

// URL patterns and their strategies
const ROUTE_STRATEGIES = [
  { pattern: /\.(js|css|woff2?|ttf|eot)$/, strategy: STRATEGIES.CACHE_FIRST },
  { pattern: /\.(png|jpg|jpeg|gif|svg|webp)$/, strategy: STRATEGIES.CACHE_FIRST },
  { pattern: /\/api\//, strategy: STRATEGIES.NETWORK_FIRST },
  { pattern: /.*/, strategy: STRATEGIES.STALE_WHILE_REVALIDATE }
]

/**
 * Install event - precache assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets')
        return cache.addAll(PRECACHE_ASSETS)
      })
      .then(() => {
        console.log('[SW] Installed')
        return self.skipWaiting()
      })
  )
})

/**
 * Activate event - clean old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('konomi-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => {
        console.log('[SW] Activated')
        return self.clients.claim()
      })
  )
})

/**
 * Fetch event - serve from cache or network
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Find matching strategy
  const route = ROUTE_STRATEGIES.find((r) => r.pattern.test(url.pathname))
  const strategy = route ? route.strategy : STRATEGIES.NETWORK_FIRST

  event.respondWith(handleFetch(event.request, strategy))
})

/**
 * Handle fetch with specified strategy
 */
async function handleFetch(request, strategy) {
  switch (strategy) {
    case STRATEGIES.CACHE_FIRST:
      return cacheFirst(request)

    case STRATEGIES.NETWORK_FIRST:
      return networkFirst(request)

    case STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request)

    case STRATEGIES.NETWORK_ONLY:
      return fetch(request)

    case STRATEGIES.CACHE_ONLY:
      return caches.match(request)

    default:
      return networkFirst(request)
  }
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    return new Response('Offline', { status: 503 })
  }
}

/**
 * Network-first strategy
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    return new Response('Offline', { status: 503 })
  }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request)

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(CACHE_NAME)
        cache.then((c) => c.put(request, response.clone()))
      }
      return response
    })
    .catch(() => null)

  return cached || fetchPromise || new Response('Offline', { status: 503 })
}

/**
 * Background sync event
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)

  if (event.tag === 'konomi-sync') {
    event.waitUntil(syncOfflineChanges())
  }
})

/**
 * Sync offline changes
 */
async function syncOfflineChanges() {
  // This would coordinate with the main thread
  // to sync any pending CRDT changes
  console.log('[SW] Syncing offline changes...')

  // Notify clients
  const clients = await self.clients.matchAll()
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_REQUESTED'
    })
  })
}

/**
 * Push notification event
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push received')

  const data = event.data ? event.data.json() : {}

  const options = {
    body: data.body || 'New update from peers',
    icon: data.icon || '/icon.png',
    badge: data.badge || '/badge.png',
    data: data,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Konomi P2P', options)
  )
})

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'open') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' })
        .then((clients) => {
          // Focus existing window or open new
          for (const client of clients) {
            if (client.url === '/' && 'focus' in client) {
              return client.focus()
            }
          }
          return self.clients.openWindow('/')
        })
    )
  }
})

/**
 * Message event - communication with main thread
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)

  switch (event.data.type) {
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(event.data.urls))
      break

    case 'CLEAR_CACHE':
      event.waitUntil(clearCache())
      break

    case 'GET_CACHE_SIZE':
      event.waitUntil(getCacheSize().then((size) => {
        event.source.postMessage({ type: 'CACHE_SIZE', size })
      }))
      break

    case 'SKIP_WAITING':
      self.skipWaiting()
      break
  }
})

/**
 * Cache specific URLs
 */
async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(urls)
}

/**
 * Clear all caches
 */
async function clearCache() {
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames
      .filter((name) => name.startsWith('konomi-'))
      .map((name) => caches.delete(name))
  )
}

/**
 * Get total cache size
 */
async function getCacheSize() {
  const cache = await caches.open(CACHE_NAME)
  const keys = await cache.keys()
  let size = 0

  for (const request of keys) {
    const response = await cache.match(request)
    if (response) {
      const blob = await response.blob()
      size += blob.size
    }
  }

  return size
}

console.log('[SW] Service Worker loaded')
