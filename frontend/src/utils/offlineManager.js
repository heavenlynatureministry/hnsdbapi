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
    this.syncInterval = null;
    
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
    this.syncInterval = setInterval(() => this.checkAndSync(), 5 * 60 * 1000);
    
    // Initial sync if online (delay to let app initialize)
    if (this.isOnline) {
      setTimeout(() => this.checkAndSync(), 3000);
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
    // Small delay to ensure connection is stable
    setTimeout(() => this.checkAndSync(), 1000);
  }

  handleOffline() {
    console.log('[OfflineManager] 📵 Offline - Changes will be queued locally');
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
        console.log(`[OfflineManager] Found ${pendingItems.length} pending item(s) to sync`);
        await this.syncItems(pendingItems);
      } else {
        console.log('[OfflineManager] No pending items to sync');
      }
      
      // Clean up synced items
      await cleanSyncedItems();
      
      // Clear expired cache
      await clearExpiredCache(72);
      
      this.lastSyncTime = Date.now();
    } catch (error) {
      console.error('[OfflineManager] Sync check failed:', error.message);
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
        // Skip items that have failed too many times
        if (item.retryCount >= 5) {
          console.warn(`[OfflineManager] ⏭️ Skipping ${item.method} ${item.url} - max retries reached`);
          await markSynced(item.id); // Mark as synced to remove from queue
          failCount++;
          continue;
        }
        
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            ...item.headers,
          },
          body: item.method !== 'GET' && item.method !== 'HEAD' ? JSON.stringify(item.body) : null,
        });
        
        if (response.ok) {
          await markSynced(item.id);
          successCount++;
          console.log(`[OfflineManager] ✅ Synced: ${item.method} ${item.url}`);
        } else if (response.status === 409) {
          // Conflict - mark as synced but log
          await markSynced(item.id);
          console.warn(`[OfflineManager] ⚠️ Conflict resolved: ${item.method} ${item.url}`);
          successCount++;
        } else if (response.status === 401 || response.status === 403) {
          // Auth error - don't retry
          await markSynced(item.id);
          console.error(`[OfflineManager] 🔒 Auth error: ${item.method} ${item.url} - Status: ${response.status}`);
          failCount++;
        } else {
          failCount++;
          // Update retry count
          item.retryCount = (item.retryCount || 0) + 1;
          console.error(`[OfflineManager] ❌ Failed (attempt ${item.retryCount}): ${item.method} ${item.url} - Status: ${response.status}`);
        }
      } catch (error) {
        failCount++;
        item.retryCount = (item.retryCount || 0) + 1;
        console.error(`[OfflineManager] ❌ Network error (attempt ${item.retryCount}): ${item.method} ${item.url}`, error.message);
      }
    }
    
    console.log(`[OfflineManager] Sync complete: ${successCount} succeeded, ${failCount} failed`);
    
    // Trigger background sync for remaining failures
    if (failCount > 0 && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await registration.sync.register('sync-pending');
        }
      } catch (error) {
        console.warn('[OfflineManager] Could not register background sync:', error.message);
      }
    }
  }

  // Queue an API request for offline use
  async queueRequest(method, url, body = null) {
    if (this.isOnline) {
      // Try to make the request directly first
      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : null,
        });
        
        if (response.ok) {
          return await response.json();
        }
        
        // If server error, queue for retry
        if (response.status >= 500) {
          console.warn('[OfflineManager] Server error, queueing for retry');
        }
      } catch (error) {
        console.warn('[OfflineManager] Online request failed, queueing:', error.message);
      }
    }
    
    // Queue for later sync
    await addToSyncQueue({
      url,
      method,
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    
    console.log(`[OfflineManager] 📝 Queued for sync: ${method} ${url}`);
    
    return { 
      success: true, 
      queued: true, 
      message: 'Saved offline. Will sync when connection is restored.' 
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

  // Get all cached responses
  async getAllCached() {
    return await getAllCachedResponses();
  }

  // Store auth token for offline login
  async storeAuth(token, user) {
    await storeUserData('authToken', token);
    await storeUserData('currentUser', user);
    await storeUserData('lastLogin', Date.now());
  }

  // Get stored auth for offline login
  async getStoredAuth() {
    const token = await getUserData('authToken');
    const user = await getUserData('currentUser');
    const lastLogin = await getUserData('lastLogin');
    return { token, user, lastLogin };
  }

  // Check if stored auth is still valid
  async isStoredAuthValid() {
    const { token, lastLogin } = await this.getStoredAuth();
    if (!token || !lastLogin) return false;
    
    // Auth valid for 7 days offline
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    return (Date.now() - lastLogin) < maxAge;
  }

  // Subscribe to online/offline changes
  subscribe(listener) {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.getState());
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[OfflineManager] Listener error:', error);
      }
    });
  }

  // Get current state
  getState() {
    return {
      isOnline: this.isOnline,
      syncing: this.syncing,
      lastSyncTime: this.lastSyncTime,
    };
  }

  // Force immediate sync
  async forceSync() {
    if (!this.isOnline) {
      console.warn('[OfflineManager] Cannot sync - offline');
      return { success: false, message: 'Cannot sync while offline' };
    }
    await this.checkAndSync();
    return { success: true, message: 'Sync completed' };
  }

  // Destroy the manager (cleanup)
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
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
