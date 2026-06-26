import { useState, useEffect } from 'react';
import { getOfflineManager } from '../utils/offlineManager';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    const offlineManager = getOfflineManager();
    
    const unsubscribe = offlineManager.subscribe((state) => {
      setIsOnline(state.isOnline);
      setSyncing(state.syncing);
      setLastSyncTime(state.lastSyncTime);
    });

    return unsubscribe;
  }, []);

  return { isOnline, syncing, lastSyncTime };
};
