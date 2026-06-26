import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

function OfflineIndicator() {
  const { isOnline, syncing, lastSyncTime } = useOnlineStatus();

  if (isOnline && !syncing) return null;

  return (
    <div className={`
      fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg
      flex items-center gap-2 text-sm font-medium
      ${isOnline && syncing 
        ? 'bg-blue-600 text-white' 
        : 'bg-red-600 text-white'
      }
      animate-slide-up
    `}>
      {isOnline && syncing ? (
        <>
          <RefreshCw size={16} className="animate-spin" />
          <span>Syncing data...</span>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>Offline Mode</span>
          {lastSyncTime && (
            <span className="text-xs opacity-75 ml-2">
              Last synced: {new Date(lastSyncTime).toLocaleTimeString()}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export default OfflineIndicator;
