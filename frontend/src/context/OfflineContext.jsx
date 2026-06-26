import { createContext, useContext, useState, useEffect } from 'react';
import { getOfflineManager } from '../utils/offlineManager';
import { getSyncManager } from '../utils/syncManager';

const OfflineContext = createContext(null);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};

export function OfflineProvider({ children }) {
  const [offlineState, setOfflineState] = useState({
    isOnline: navigator.onLine,
    syncing: false,
    lastSyncTime: null,
  });

  useEffect(() => {
    const offlineManager = getOfflineManager();
    const syncManager = getSyncManager();

    const unsubscribe = offlineManager.subscribe((state) => {
      setOfflineState(state);
    });

    return unsubscribe;
  }, []);

  const syncNow = async () => {
    const offlineManager = getOfflineManager();
    await offlineManager.checkAndSync();
  };

  const getData = async (endpoint, entityType, params) => {
    const syncManager = getSyncManager();
    return await syncManager.getData(endpoint, entityType, params);
  };

  const saveData = async (method, endpoint, entityType, data, entityId) => {
    const syncManager = getSyncManager();
    return await syncManager.saveData(method, endpoint, entityType, data, entityId);
  };

  return (
    <OfflineContext.Provider value={{
      ...offlineState,
      syncNow,
      getData,
      saveData,
    }}>
      {children}
    </OfflineContext.Provider>
  );
}
