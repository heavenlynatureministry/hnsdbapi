// Service Worker for HNS School Management System
const CACHE_VERSION = 'v2';
const CACHE_NAME = `hns-cache-${CACHE_VERSION}`;
const STATIC_CACHE = `hns-static-${CACHE_VERSION}`;
const API_CACHE = `hns-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `hns-images-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/watermark-A4.jpg',
  '/letter-head.jpg',
];

// API routes to cache
const API_ROUTES = [
  '/api/v1/school/info',
  '/api/v1/school/settings',
  '/api/v1/school/calendar/current-term',
  '/api/v1/classes',
  '/api/v1/classes/levels',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v2...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn('[SW] Some assets failed to cache:', err);
        });
      }),
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.addAll([
          '/watermark-A4.jpg',
          '/letter-head.jpg',
        ]).catch(err => {
          console.warn('[SW] Some images failed to cache:', err);
        });
      }),
    ]).then(() => {
      console.log('[SW] Static assets cached');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v2...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('hns-') && 
                   !name.includes(CACHE_VERSION);
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (let them pass through to network)
  if (request.method !== 'GET') {
    if (!navigator.onLine) {
      // Queue the request for later sync
      event.respondWith(
        queueOfflineRequest(request).then(() => {
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Queued for sync',
            queued: true 
          }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );
    }
    // If online, let the request go through normally
    return;
  }

  // ✅ Don't cache API requests - let them pass through for fresh data
  if (url.pathname.startsWith('/api/')) {
    // Network-only for API requests (no caching to avoid stale data)
    event.respondWith(
      fetch(request).catch(() => {
        // Only serve from cache if offline
        return caches.match(request).then(cached => {
          if (cached) return cached;
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'You are offline. This data is not available offline.' 
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
    return;
  }

  // Handle static assets (cache-first)
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Handle images (cache-first)
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|svg|ico)$/)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // ✅ For JS/CSS assets (the React app), use network-first with fresh fetch
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // Handle navigation requests (React app) - network first
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

// Network-first strategy
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    // ✅ Only cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

// Store API response in IndexedDB (for offline reference only)
async function storeApiResponse(path, response) {
  try {
    const data = await response.clone().json();
    const db = await openOfflineDB();
    const tx = db.transaction('apiCache', 'readwrite');
    const store = tx.objectStore('apiCache');
    store.put({
      path: path,
      data: data,
      timestamp: Date.now(),
      synced: true
    });
    await tx.complete;
  } catch (error) {
    // Silently fail - API caching is optional
  }
}

// Get stored API response from IndexedDB
async function getStoredApiResponse(path) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('apiCache', 'readonly');
    const store = tx.objectStore('apiCache');
    const result = await store.get(path);
    return result?.data || null;
  } catch (error) {
    return null;
  }
}

// Queue offline requests for later sync
async function queueOfflineRequest(request) {
  try {
    const clonedRequest = request.clone();
    const body = await clonedRequest.json();
    const db = await openOfflineDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    await store.add({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers),
      body: body,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0
    });
    await tx.complete;
    
    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-pending');
    }
  } catch (error) {
    console.error('[SW] Error queueing request:', error);
  }
}

// Open IndexedDB
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HNSOfflineDB', 3);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('apiCache')) {
        db.createObjectStore('apiCache', { keyPath: 'path' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('synced', 'synced', { unique: false });
      }
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData', { keyPath: 'key' });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending') {
    event.waitUntil(syncPendingRequests());
  }
});

// Sync pending requests
async function syncPendingRequests() {
  console.log('[SW] Starting background sync...');
  const db = await openOfflineDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const store = tx.objectStore('syncQueue');
  const allItems = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const pendingRequests = allItems.filter(item => !item.synced);
  
  for (const request of pendingRequests) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(request.body)
      });
      
      if (response.ok) {
        request.synced = true;
        await new Promise((resolve, reject) => {
          const req = store.put(request);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        console.log('[SW] Synced:', request.url);
      } else {
        request.retryCount = (request.retryCount || 0) + 1;
        if (request.retryCount > 5) {
          await new Promise((resolve, reject) => {
            const req = store.delete(request.id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        } else {
          await new Promise((resolve, reject) => {
            const req = store.put(request);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        }
      }
    } catch (error) {
      console.error('[SW] Sync failed for:', request.url);
      request.retryCount = (request.retryCount || 0) + 1;
      if (request.retryCount > 5) {
        await new Promise((resolve, reject) => {
          const req = store.delete(request.id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } else {
        await new Promise((resolve, reject) => {
          const req = store.put(request);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    }
  }
  
  await tx.complete;
  console.log('[SW] Background sync complete');
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_NOW') {
    syncPendingRequests();
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
