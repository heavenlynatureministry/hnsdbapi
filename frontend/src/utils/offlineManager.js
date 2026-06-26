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
} from './offlineDB';

class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = new Set();
    this.syncing = false;
    this.lastSyncTime = null;
    
    this.init();
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Try to register service worker
    if ('serviceWorker' in navigator) {
      this.registerSW();
    }
    
    // Periodic sync check (every 5 minutes)
    setInterval(() => this.checkAndSync(), 5 * 60 * 1000);
    
    // Initial sync if online
    if (this.isOnline) {
      this.checkAndSync();
    }
  }

  async registerSW() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[OfflineManager] Service Worker registered:', registration.scope);
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETE') {
          this.lastSyncTime = Date.now();
          this.notifyListeners();
        }
      });
    } catch (error) {
      console.error('[OfflineManager] SW registration failed:', error);
    }
  }

  handleOnline() {
    console.log('[OfflineManager] 📶 Online - Starting sync...');
    this.isOnline = true;
    this.notifyListeners();
    this.checkAndSync();
  }

  handleOffline() {
    console.log('[OfflineManager] 📵 Offline - Changes will be queued');
    this.isOnline = false;
    this.notifyListeners();
  }

  async checkAndSync() {
    if (!this.isOnline || this.syncing) return;
    
    this.syncing = true;
    console.log('[OfflineManager] 🔄 Checking for pending sync items...');
    
    try {
      const pendingItems = await getPendingSyncItems();
      
      if (pendingItems.length > 0) {
        console.log(`[OfflineManager] Found ${pendingItems.length} items to sync`);
        await this.syncItems(pendingItems);
      } else {
        console.log('[OfflineManager] No pending items to sync');
      }
      
      // Clean up synced items
      await cleanSyncedItems();
      
      // Clear expired cache
      await clearExpiredCache(72); // Clear cache older than 72 hours
      
      this.lastSyncTime = Date.now();
    } catch (error) {
      console.error('[OfflineManager] Sync failed:', error);
    } finally {
      this.syncing = false;
      this.notifyListeners();
    }
  }

  async syncItems(items) {
    let successCount = 0;
    let failCount = 0;
    
    for (const item of items) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            ...item.headers,
          },
          body: JSON.stringify(item.body),
        });
        
        if (response.ok) {
          await markSynced(item.id);
          successCount++;
          console.log(`[OfflineManager] ✅ Synced: ${item.method} ${item.url}`);
        } else if (response.status === 409) {
          // Conflict - mark as synced but log conflict
          await markSynced(item.id);
          console.warn(`[OfflineManager] ⚠️ Conflict: ${item.method} ${item.url}`);
          successCount++;
        } else {
          failCount++;
          console.error(`[OfflineManager] ❌ Failed: ${item.method} ${item.url} - Status: ${response.status}`);
        }
      } catch (error) {
        failCount++;
        console.error(`[OfflineManager] ❌ Error syncing: ${item.method} ${item.url}`, error);
      }
    }
    
    console.log(`[OfflineManager] Sync complete: ${successCount} succeeded, ${failCount} failed`);
    
    // If there were failures, trigger background sync
    if (failCount > 0 && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await registration.sync.register('sync-pending');
      }
    }
  }

  // Queue an API request for offline use
  async queueRequest(method, url, body = null) {
    if (this.isOnline) {
      // If online, try to make the request directly
      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : null,
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn('[OfflineManager] Online request failed, queueing:', error);
      }
    }
    
    // Queue for later sync
    await addToSyncQueue({
      url,
      method,
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    
    console.log(`[OfflineManager] 📝 Queued: ${method} ${url}`);
    
    return { 
      success: true, 
      queued: true, 
      message: 'Saved offline. Will sync when online.' 
    };
  }

  // Cache API response for offline use
  async cacheResponse(path, data) {
    await cacheApiResponse(path, data);
  }

  // Get cached response
  async getCachedResponse(path) {
    return await getCachedApiResponse(path);
  }

  // Store auth token for offline
  async storeAuth(token, user) {
    await storeUserData('authToken', token);
    await storeUserData('currentUser', user);
    await storeUserData('lastLogin', Date.now());
  }

  // Get stored auth
  async getStoredAuth() {
    const token = await getUserData('authToken');
    const user = await getUserData('currentUser');
    return { token, user };
  }

  // Subscribe to online/offline changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  notifyListeners() {
    const state = {
      isOnline: this.isOnline,
      syncing: this.syncing,
      lastSyncTime: this.lastSyncTime,
    };
    this.listeners.forEach(listener => listener(state));
  }

  // Get current state
  getState() {
    return {
      isOnline: this.isOnline,
      syncing: this.syncing,
      lastSyncTime: this.lastSyncTime,
    };
  }
}

// Singleton instance
let instance = null;

export const getOfflineManager = () => {
  if (!instance) {
    instance = new OfflineManager();
  }
  return instance;
};

export default getOfflineManager;
