/**
 * Sync Manager - Handles data synchronization between frontend and backend
 * Uses the same IndexedDB sync queue as offlineManager
 */

import api from '../api/axios'
import { getOfflineManager } from './offlineManager'
import { 
  cacheApiResponse, 
  getCachedApiResponse,
  addToSyncQueue,
  getPendingSyncItems,
  markSynced,
  storeOfflineData,
  getOfflineData,
  getAllOfflineData 
} from './offlineDB'

class SyncManager {
  constructor() {
    this.offlineManager = getOfflineManager()
    this.syncInProgress = false
  }

  // Check if online
  get isOnline() {
    return this.offlineManager.isOnline
  }

  // Force sync all pending items
  async syncAll() {
    if (!this.isOnline) {
      console.log('[SyncManager] Offline, cannot sync')
      return false
    }

    if (this.syncInProgress) {
      console.log('[SyncManager] Sync already in progress')
      return false
    }

    this.syncInProgress = true
    console.log('[SyncManager] 🔄 Syncing all pending changes...')

    try {
      // ✅ Use the offlineManager's sync mechanism
      await this.offlineManager.checkAndSync()
      console.log('[SyncManager] ✅ Sync complete')
      return true
    } catch (error) {
      console.error('[SyncManager] ❌ Sync failed:', error)
      return false
    } finally {
      this.syncInProgress = false
    }
  }

  // Get data with offline support
  async getData(endpoint, entityType, params = {}) {
    // Try network first
    if (this.isOnline) {
      try {
        const response = await api.get(endpoint, { params })
        if (response?.success && response.data) {
          // Cache successful response
          await cacheApiResponse(endpoint, { success: true, data: response.data })
          return response.data
        }
      } catch (error) {
        console.warn(`[SyncManager] Network failed for ${endpoint}, using cache`)
      }
    }
    
    // Fall back to cache
    const cached = await getCachedApiResponse(endpoint)
    if (cached?.data) {
      console.log(`[SyncManager] 📦 Using cached data for ${endpoint}`)
      return cached.data
    }
    
    // Fall back to offline store
    const offlineData = await getAllOfflineData(entityType)
    if (offlineData.length > 0) {
      console.log(`[SyncManager] 📦 Using offline data for ${entityType}`)
      return Array.isArray(offlineData) ? offlineData : [offlineData]
    }
    
    return null
  }

  // Save data with offline support
  async saveData(method, endpoint, entityType, data) {
    // Try online first
    if (this.isOnline) {
      try {
        let response
        if (method === 'POST') response = await api.post(endpoint, data)
        else if (method === 'PUT') response = await api.put(endpoint, data)
        else if (method === 'DELETE') response = await api.delete(endpoint)
        
        if (response?.success) {
          return response.data || { success: true }
        }
      } catch (error) {
        // If online save fails with network error, queue for sync
        if (error?.status === 0 || error?.offline) {
          console.warn('[SyncManager] Network error, queuing for sync')
        } else {
          // Server returned an error, don't queue
          throw error
        }
      }
    }
    
    // ✅ Queue the operation in IndexedDB for later sync
    await addToSyncQueue({
      url: `${api.defaults.baseURL}${endpoint}`,
      method: method.toUpperCase(),
      headers: { 'Content-Type': 'application/json' },
      body: data,
      entityType: entityType,
    })
    
    console.log(`[SyncManager] 📝 Queued ${method} ${endpoint} for sync`)
    
    return { success: true, queued: true, message: 'Saved offline. Will sync when connection is restored.' }
  }

  // Get pending sync count
  async getPendingCount() {
    const items = await getPendingSyncItems()
    return items.length
  }
}

let instance = null

export const getSyncManager = () => {
  if (!instance) {
    instance = new SyncManager()
  }
  return instance
}

export default getSyncManager
