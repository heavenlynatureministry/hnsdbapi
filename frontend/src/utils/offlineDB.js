/**
 * IndexedDB wrapper for offline data storage
 */

const DB_NAME = 'HNSOfflineDB';
const DB_VERSION = 3;

let dbInstance = null;

export const openDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // API Response Cache
      if (!db.objectStoreNames.contains('apiCache')) {
        const apiStore = db.createObjectStore('apiCache', { keyPath: 'path' });
        apiStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Sync Queue for pending changes
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        syncStore.createIndex('synced', 'synced', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Offline data store (general key-value)
      if (!db.objectStoreNames.contains('offlineData')) {
        const dataStore = db.createObjectStore('offlineData', { keyPath: 'key' });
        dataStore.createIndex('collection', 'collection', { unique: false });
      }
      
      // User preferences & auth data
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });
};

// Helper: Promisify IDB request
const promisify = (request) => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Cache API response
export const cacheApiResponse = async (path, data) => {
  try {
    const db = await openDB();
    const tx = db.transaction('apiCache', 'readwrite');
    const store = tx.objectStore('apiCache');
    await promisify(store.put({
      path,
      data,
      timestamp: Date.now(),
    }));
    await tx.complete;
  } catch (error) {
    console.error('[OfflineDB] Error caching API response:', error);
  }
};

// Get cached API response
export const getCachedApiResponse = async (path) => {
  try {
    const db = await openDB();
    const tx = db.transaction('apiCache', 'readonly');
    const store = tx.objectStore('apiCache');
    const result = await promisify(store.get(path));
    return result || null;
  } catch (error) {
    console.error('[OfflineDB] Error getting cached response:', error);
    return null;
  }
};

// Get all cached API responses
export const getAllCachedResponses = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction('apiCache', 'readonly');
    const store = tx.objectStore('apiCache');
    return await promisify(store.getAll());
  } catch (error) {
    console.error('[OfflineDB] Error getting all cached responses:', error);
    return [];
  }
};

// Clear expired cache (older than specified hours)
export const clearExpiredCache = async (maxAgeHours = 24) => {
  try {
    const db = await openDB();
    const tx = db.transaction('apiCache', 'readwrite');
    const store = tx.objectStore('apiCache');
    const all = await promisify(store.getAll());
    const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    
    for (const item of all) {
      if (item.timestamp < cutoff) {
        await promisify(store.delete(item.path));
      }
    }
    await tx.complete;
  } catch (error) {
    console.error('[OfflineDB] Error clearing expired cache:', error);
  }
};

// Add to sync queue
export const addToSyncQueue = async (entry) => {
  try {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const id = await promisify(store.add({
      ...entry,
      synced: false,
      retryCount: 0,
      timestamp: Date.now(),
    }));
    await tx.complete;
    return id;
  } catch (error) {
    console.error('[OfflineDB] Error adding to sync queue:', error);
    return null;
  }
};

// Get pending sync items (not yet synced)
export const getPendingSyncItems = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    // Get all items and filter unsynced manually
    // This avoids the IDBIndex.getAll() key issue
    const allItems = await promisify(store.getAll());
    return allItems.filter(item => !item.synced);
  } catch (error) {
    console.error('[OfflineDB] Error getting pending sync items:', error);
    return [];
  }
};

// Mark sync item as synced
export const markSynced = async (id) => {
  try {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const item = await promisify(store.get(id));
    if (item) {
      item.synced = true;
      item.syncedAt = Date.now();
      await promisify(store.put(item));
    }
    await tx.complete;
  } catch (error) {
    console.error('[OfflineDB] Error marking item as synced:', error);
  }
};

// Remove synced items from queue
export const cleanSyncedItems = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const allItems = await promisify(store.getAll());
    const syncedItems = allItems.filter(item => item.synced);
    for (const item of syncedItems) {
      await promisify(store.delete(item.id));
    }
    await tx.complete;
  } catch (error) {
    console.error('[OfflineDB] Error cleaning synced items:', error);
  }
};

// Get sync queue count (for status display)
export const getSyncQueueCount = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const allItems = await promisify(store.getAll());
    const pending = allItems.filter(item => !item.synced).length;
    return {
      total: allItems.length,
      pending: pending,
      synced: allItems.length - pending
    };
  } catch (error) {
    console.error('[OfflineDB] Error getting sync queue count:', error);
    return { total: 0, pending: 0, synced: 0 };
  }
};

// Store offline data
export const storeOfflineData = async (collection, key, data) => {
  try {
    const db = await openDB();
    const tx = db.transaction('offlineData', 'readwrite');
    const store = tx.objectStore('offlineData');
    await promisify(store.put({
      key: `${collection}_${key}`,
      collection,
      data,
      timestamp: Date.now(),
    }));
    await tx.complete;
  } catch (error) {
    console.error('[OfflineDB] Error storing offline data:', error);
  }
};

// Get offline data
export const getOfflineData = async (collection, key) => {
  try {
    const db = await openDB();
    const tx = db.transaction('offlineData', 'readonly');
    const store = tx.objectStore('offlineData');
    const result = await promisify(store.get(`${collection}_${key}`));
    return result?.data || null;
  } catch (error) {
    console.error('[OfflineDB] Error getting offline data:', error);
    return null;
  }
};

// Get all offline data for a collection
export const getAllOfflineData = async (collection) => {
  try {
    const db = await openDB();
    const tx = db.transaction('offlineData', 'readonly');
    const store = tx.objectStore('offlineData');
    const allItems = await promisify(store.getAll());
    // Filter by collection
    return allItems
      .filter(item => item.collection === collection)
      .map(item => item.data);
  } catch (error) {
    console.error('[OfflineDB] Error getting all offline data:', error);
    return [];
  }
};

// Store user data (auth token, preferences)
export const storeUserData = async (key, value) => {
  try {
    const db = await openDB();
    const tx = db.transaction('userData', 'readwrite');
    const store = tx.objectStore('userData');
    await promisify(store.put({ key, value, timestamp: Date.now() }));
    await tx.complete;
  } catch (error) {
    console.error('[OfflineDB] Error storing user data:', error);
  }
};

// Get user data
export const getUserData = async (key) => {
  try {
    const db = await openDB();
    const tx = db.transaction('userData', 'readonly');
    const store = tx.objectStore('userData');
    const result = await promisify(store.get(key));
    return result?.value || null;
  } catch (error) {
    console.error('[OfflineDB] Error getting user data:', error);
    return null;
  }
};

// Delete user data
export const deleteUserData = async (key) => {
  try {
    const db = await openDB();
    const tx = db.transaction('userData', 'readwrite');
    const store = tx.objectStore('userData');
    await promisify(store.delete(key));
    await tx.complete;
  } catch (error) {
    console.error('[OfflineDB] Error deleting user data:', error);
  }
};

// Clear all offline data
export const clearAllData = async () => {
  try {
    const db = await openDB();
    const stores = ['apiCache', 'syncQueue', 'offlineData', 'userData'];
    for (const storeName of stores) {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      await promisify(store.clear());
      await tx.complete;
    }
    console.log('[OfflineDB] All offline data cleared');
  } catch (error) {
    console.error('[OfflineDB] Error clearing all data:', error);
  }
};

// Get storage usage estimate
export const getStorageEstimate = async () => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentUsed: estimate.quota ? Math.round((estimate.usage / estimate.quota) * 100) : 0
      };
    }
    return { usage: 0, quota: 0, percentUsed: 0 };
  } catch (error) {
    console.error('[OfflineDB] Error getting storage estimate:', error);
    return { usage: 0, quota: 0, percentUsed: 0 };
  }
};
