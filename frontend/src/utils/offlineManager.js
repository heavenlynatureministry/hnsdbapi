/**
 * Offline Manager - Handles online/offline state and coordinates sync
 */

import { 
  addToSyncQueue, 
  getPendingSyncItems, 
  markSynced, 
  cleanSyncedItems,
  cacheApiResponse,
  getCachedApiResponse,
  getAllCachedResponses,
  clearExpiredCache,
  storeUserData,
  getUserData
} from './offlineDB'
import { getToken } from './storage'

class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine
    this.listeners = new Set()
    this.syncing = false
    this.lastSyncTime = null
    this.syncInterval = null
    
    this.init()
  }

  init() {
    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())
    
    if ('serviceWorker' in navigator) {
      this.registerSW()
    }
    
    // Periodic sync check (every 5 minutes)
    this.syncInterval = setInterval(() => this.checkAndSync(), 5 * 60 * 1000)
    
    // Initial sync if online
    if (this.isOnline) {
      setTimeout(() => this.checkAndSync(), 3000)
    }
  }

  async registerSW() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('[OfflineManager] Service Worker registered:', registration.scope)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETE') {
          this.lastSyncTime = Date.now()
          this.notifyListeners()
        }
      })
    } catch (error) {
      console.error('[OfflineManager] SW registration failed:', error)
    }
  }

  handleOnline() {
    console.log('[OfflineManager] 📶 Online - Starting sync...')
    this.isOnline = true
    this.notifyListeners()
    setTimeout(() => this.checkAndSync(), 1500)
  }

  handleOffline() {
    console.log('[OfflineManager] 📵 Offline - Changes will be queued locally')
    this.isOnline = false
    this.notifyListeners()
  }

  async checkAndSync() {
    if (!this.isOnline || this.syncing) return
    
    this.syncing = true
    console.log('[OfflineManager] 🔄 Checking for pending sync items...')
    
    try {
      const pendingItems = await getPendingSyncItems()
      
      if (pendingItems.length > 0) {
        console.log(`[OfflineManager] Found ${pendingItems.length} pending item(s) to sync`)
        await this.syncItems(pendingItems)
      } else {
        console.log('[OfflineManager] No pending items to sync')
      }
      
      await cleanSyncedItems()
      await clearExpiredCache(72)
      
      this.lastSyncTime = Date.now()
    } catch (error) {
      console.error('[OfflineManager] Sync check failed:', error.message)
    } finally {
      this.syncing = false
      this.notifyListeners()
    }
  }

  async syncItems(items) {
    let successCount = 0
    let failCount = 0
    
    // ✅ Get auth token for syncing
    const token = getToken()
    
    for (const item of items) {
      try {
        // Skip max-retry items
        if (item.retryCount >= 5) {
          console.warn(`[OfflineManager] ⏭️ Skipping ${item.method} ${item.url} - max retries`)
          await markSynced(item.id)
          failCount++
          continue
        }
        
        // ✅ Build headers with auth token
        const headers = {
          'Content-Type': 'application/json',
          ...(item.headers || {}),
        }
        
        // ✅ Add Authorization if we have a token
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const response = await fetch(item.url, {
          method: item.method,
          headers: headers,
          body: item.method !== 'GET' && item.method !== 'HEAD' 
            ? JSON.stringify(item.body) 
            : null,
        })
        
        if (response.ok) {
          await markSynced(item.id)
          successCount++
          console.log(`[OfflineManager] ✅ Synced: ${item.method} ${item.url}`)
        } else if (response.status === 409) {
          await markSynced(item.id)
          console.warn(`[OfflineManager] ⚠️ Conflict: ${item.method} ${item.url}`)
          successCount++
        } else if (response.status === 401 || response.status === 403) {
          // Auth error - don't retry, mark as synced to remove
          await markSynced(item.id)
          console.error(`[OfflineManager] 🔒 Auth error: ${item.method} ${item.url}`)
          failCount++
        } else {
          failCount++
          // ✅ Update retry count in the database
          item.retryCount = (item.retryCount || 0) + 1
          console.error(`[OfflineManager] ❌ Failed (attempt ${item.retryCount}): ${item.method} ${item.url} - Status: ${response.status}`)
        }
      } catch (error) {
        failCount++
        item.retryCount = (item.retryCount || 0) + 1
        console.error(`[OfflineManager] ❌ Network error (attempt ${item.retryCount}): ${item.method} ${item.url}`)
        // ✅ Stop syncing if we're actually still offline
        if (!navigator.onLine) {
          console.warn('[OfflineManager] Still offline, stopping sync')
          break
        }
      }
    }
    
    console.log(`[OfflineManager] Sync complete: ${successCount} succeeded, ${failCount} failed`)
  }

  // Queue an API request for offline use
  async queueRequest(method, url, body = null) {
    if (this.isOnline) {
      try {
        const token = getToken()
        const headers = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : null,
        })
        
        if (response.ok) {
          return await response.json()
        }
        
        if (response.status >= 500) {
          console.warn('[OfflineManager] Server error, queueing for retry')
        }
      } catch (error) {
        console.warn('[OfflineManager] Online request failed, queueing:', error.message)
      }
    }
    
    await addToSyncQueue({
      url,
      method,
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    
    console.log(`[OfflineManager] 📝 Queued for sync: ${method} ${url}`)
    
    return { 
      success: true, 
      queued: true, 
      message: 'Saved offline. Will sync when connection is restored.' 
    }
  }

  async cacheResponse(path, data) { await cacheApiResponse(path, data) }
  async getCachedResponse(path) { return await getCachedApiResponse(path) }
  async getAllCached() { return await getAllCachedResponses() }

  async storeAuth(token, user) {
    await storeUserData('authToken', token)
    await storeUserData('currentUser', user)
    await storeUserData('lastLogin', Date.now())
  }

  async getStoredAuth() {
    const token = await getUserData('authToken')
    const user = await getUserData('currentUser')
    const lastLogin = await getUserData('lastLogin')
    return { token, user, lastLogin }
  }

  async isStoredAuthValid() {
    const { token, lastLogin } = await this.getStoredAuth()
    if (!token || !lastLogin) return false
    const maxAge = 7 * 24 * 60 * 60 * 1000
    return (Date.now() - lastLogin) < maxAge
  }

  subscribe(listener) {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  notifyListeners() {
    const state = this.getState()
    this.listeners.forEach(listener => {
      try { listener(state) } catch (error) { console.error('[OfflineManager] Listener error:', error) }
    })
  }

  getState() {
    return { isOnline: this.isOnline, syncing: this.syncing, lastSyncTime: this.lastSyncTime }
  }

  async forceSync() {
    if (!this.isOnline) {
      console.warn('[OfflineManager] Cannot sync - offline')
      return { success: false, message: 'Cannot sync while offline' }
    }
    await this.checkAndSync()
    return { success: true, message: 'Sync completed' }
  }

  destroy() {
    if (this.syncInterval) { clearInterval(this.syncInterval); this.syncInterval = null }
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    this.listeners.clear()
  }
}

let instance = null

export const getOfflineManager = () => {
  if (!instance) {
    instance = new OfflineManager()
  }
  return instance
}

export default getOfflineManager
