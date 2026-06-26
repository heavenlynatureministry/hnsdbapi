/**
 * IndexedDB wrapper for offline data storage
 */

const DB_NAME = 'HNSOfflineDB';
const DB_VERSION = 2;

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

// Cache API response
export const cacheApiResponse = async (path, data) => {
  const db = await openDB();
  const tx = db.transaction('apiCache', 'readwrite');
  const store = tx.objectStore('apiCache');
  await store.put({
    path,
    data,
    timestamp: Date.now(),
  });
  await tx.complete;
};

// Get cached API response
export const getCachedApiResponse = async (path) => {
  const db = await openDB();
  const tx = db.transaction('apiCache', 'readonly');
  const store = tx.objectStore('apiCache');
  const result = await store.get(path);
  return result || null;
};

// Get all cached API responses
export const getAllCachedResponses = async () => {
  const db = await openDB();
  const tx = db.transaction('apiCache', 'readonly');
  const store = tx.objectStore('apiCache');
  return await store.getAll();
};

// Clear expired cache (older than specified hours)
export const clearExpiredCache = async (maxAgeHours = 24) => {
  const db = await openDB();
  const tx = db.transaction('apiCache', 'readwrite');
  const store = tx.objectStore('apiCache');
  const all = await store.getAll();
  const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);
  
  for (const item of all) {
    if (item.timestamp < cutoff) {
      await store.delete(item.path);
    }
  }
  await tx.complete;
};

// Add to sync queue
export const addToSyncQueue = async (entry) => {
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const store = tx.objectStore('syncQueue');
  const id = await store.add({
    ...entry,
    synced: false,
    retryCount: 0,
    timestamp: Date.now(),
  });
  await tx.complete;
  return id;
};

// Get pending sync items
export const getPendingSyncItems = async () => {
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readonly');
  const store = tx.objectStore('syncQueue');
  const index = store.index('synced');
  return await index.getAll(false);
};

// Mark sync item as synced
export const markSynced = async (id) => {
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const store = tx.objectStore('syncQueue');
  const item = await store.get(id);
  if (item) {
    item.synced = true;
    item.syncedAt = Date.now();
    await store.put(item);
  }
  await tx.complete;
};

// Remove synced items
export const cleanSyncedItems = async () => {
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const store = tx.objectStore('syncQueue');
  const index = store.index('synced');
  const synced = await index.getAll(true);
  for (const item of synced) {
    await store.delete(item.id);
  }
  await tx.complete;
};

// Store offline data
export const storeOfflineData = async (collection, key, data) => {
  const db = await openDB();
  const tx = db.transaction('offlineData', 'readwrite');
  const store = tx.objectStore('offlineData');
  await store.put({
    key: `${collection}_${key}`,
    collection,
    data,
    timestamp: Date.now(),
  });
  await tx.complete;
};

// Get offline data
export const getOfflineData = async (collection, key) => {
  const db = await openDB();
  const tx = db.transaction('offlineData', 'readonly');
  const store = tx.objectStore('offlineData');
  const result = await store.get(`${collection}_${key}`);
  return result?.data || null;
};

// Get all offline data for a collection
export const getAllOfflineData = async (collection) => {
  const db = await openDB();
  const tx = db.transaction('offlineData', 'readonly');
  const store = tx.objectStore('offlineData');
  const index = store.index('collection');
  const results = await index.getAll(collection);
  return results.map(r => r.data);
};

// Store user data (auth token, preferences)
export const storeUserData = async (key, value) => {
  const db = await openDB();
  const tx = db.transaction('userData', 'readwrite');
  const store = tx.objectStore('userData');
  await store.put({ key, value, timestamp: Date.now() });
  await tx.complete;
};

// Get user data
export const getUserData = async (key) => {
  const db = await openDB();
  const tx = db.transaction('userData', 'readonly');
  const store = tx.objectStore('userData');
  const result = await store.get(key);
  return result?.value || null;
};

// Clear all offline data
export const clearAllData = async () => {
  const db = await openDB();
  const stores = ['apiCache', 'syncQueue', 'offlineData', 'userData'];
  for (const storeName of stores) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.clear();
    await tx.complete;
  }
};
