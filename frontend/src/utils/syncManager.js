/**
 * Sync Manager - Handles data synchronization between frontend and backend
 */

import api from '../api/axios';
import { getOfflineManager } from './offlineManager';
import { 
  cacheApiResponse, 
  getCachedApiResponse,
  storeOfflineData,
  getOfflineData,
  getAllOfflineData 
} from './offlineDB';

class SyncManager {
  constructor() {
    this.offlineManager = getOfflineManager();
    this.syncInProgress = false;
  }

  // Sync specific entity type (students, teachers, etc.)
  async syncEntity(entityType) {
    if (!this.offlineManager.isOnline) {
      console.log(`[SyncManager] Offline, cannot sync ${entityType}`);
      return false;
    }

    if (this.syncInProgress) {
      console.log('[SyncManager] Sync already in progress');
      return false;
    }

    this.syncInProgress = true;
    console.log(`[SyncManager] 🔄 Syncing ${entityType}...`);

    try {
      // First push any pending changes
      await this.pushChanges(entityType);
      
      // Then pull latest data
      await this.pullData(entityType);
      
      console.log(`[SyncManager] ✅ ${entityType} sync complete`);
      return true;
    } catch (error) {
      console.error(`[SyncManager] ❌ ${entityType} sync failed:`, error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Push local changes to server
  async pushChanges(entityType) {
    const pendingItems = await this.getPendingChanges(entityType);
    
    if (pendingItems.length === 0) return;
    
    console.log(`[SyncManager] Pushing ${pendingItems.length} ${entityType} changes...`);
    
    for (const item of pendingItems) {
      try {
        const response = await api.post('/sync/push', {
          entityType,
          action: item.action,
          data: item.data,
          clientTimestamp: item.timestamp,
        });
        
        if (response?.data?.success) {
          await this.markChangeSynced(item.id);
        }
      } catch (error) {
        console.error(`[SyncManager] Failed to push ${entityType} change:`, error);
        throw error;
      }
    }
  }

  // Pull latest data from server
  async pullData(entityType) {
    const lastSync = await this.getLastSyncTime(entityType);
    
    try {
      const response = await api.get('/sync/pull', {
        params: {
          entityType,
          since: lastSync || undefined,
        }
      });
      
      if (response?.data?.success) {
        // Update local cache
        await this.updateLocalCache(entityType, response.data.data);
        
        // Update last sync time
        await this.setLastSyncTime(entityType, Date.now());
      }
    } catch (error) {
      console.error(`[SyncManager] Failed to pull ${entityType} data:`, error);
      throw error;
    }
  }

  // Get pending changes for entity type
  async getPendingChanges(entityType) {
    // This would come from your sync queue in IndexedDB
    // Filtered by entity type
    const allPending = await getOfflineData('syncQueue', 'all') || [];
    return allPending.filter(item => item.entityType === entityType && !item.synced);
  }

  // Mark a change as synced
  async markChangeSynced(changeId) {
    const allPending = await getOfflineData('syncQueue', 'all') || [];
    const updated = allPending.map(item => 
      item.id === changeId ? { ...item, synced: true } : item
    );
    await storeOfflineData('syncQueue', 'all', updated);
  }

  // Get last sync time
  async getLastSyncTime(entityType) {
    return await getOfflineData('syncTimes', entityType);
  }

  // Set last sync time
  async setLastSyncTime(entityType, timestamp) {
    await storeOfflineData('syncTimes', entityType, timestamp);
  }

  // Update local cache with server data
  async updateLocalCache(entityType, data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        const id = item._id || item.id;
        await storeOfflineData(entityType, id, item);
      }
    }
    
    // Also cache the list endpoint
    await cacheApiResponse(`/api/v1/${entityType}`, { success: true, data });
  }

  // Get data with offline support
  async getData(endpoint, entityType, params = {}) {
    // Try to get from network first
    if (this.offlineManager.isOnline) {
      try {
        const response = await api.get(endpoint, { params });
        if (response?.data) {
          // Cache the response
          await cacheApiResponse(endpoint, response.data);
          return response.data;
        }
      } catch (error) {
        console.warn(`[SyncManager] Network request failed for ${endpoint}, using cache`);
      }
    }
    
    // Fall back to cached data
    const cached = await getCachedApiResponse(endpoint);
    if (cached) {
      return cached.data;
    }
    
    // Fall back to offline stored data
    const offlineData = await getAllOfflineData(entityType);
    if (offlineData.length > 0) {
      return { success: true, data: offlineData };
    }
    
    return { success: false, message: 'No data available offline' };
  }

  // Save data with offline support
  async saveData(method, endpoint, entityType, data, entityId = null) {
    if (this.offlineManager.isOnline) {
      try {
        let response;
        if (method === 'POST') {
          response = await api.post(endpoint, data);
        } else if (method === 'PUT') {
          response = await api.put(endpoint, data);
        } else if (method === 'DELETE') {
          response = await api.delete(endpoint);
        }
        
        if (response?.data) {
          // Update cache
          if (entityId) {
            await storeOfflineData(entityType, entityId, data);
          }
          return response.data;
        }
      } catch (error) {
        console.warn(`[SyncManager] Online save failed, saving offline`);
      }
    }
    
    // Save offline
    if (entityId) {
      await storeOfflineData(entityType, entityId, data);
    }
    
    // Add to sync queue
    const syncData = {
      action: method === 'POST' ? 'create' : method === 'PUT' ? 'update' : 'delete',
      entityType,
      data,
      entityId,
      timestamp: Date.now(),
    };
    
    const allPending = await getOfflineData('syncQueue', 'all') || [];
    allPending.push({
      id: Date.now().toString(),
      ...syncData,
      synced: false,
    });
    await storeOfflineData('syncQueue', 'all', allPending);
    
    return { success: true, queued: true, message: 'Saved offline' };
  }
}

let instance = null;

export const getSyncManager = () => {
  if (!instance) {
    instance = new SyncManager();
  }
  return instance;
};

export default getSyncManager;
