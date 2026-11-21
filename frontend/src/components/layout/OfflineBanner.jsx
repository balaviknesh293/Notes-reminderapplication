import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { getSyncQueue, syncOfflineQueue } from '../../services/offlineStorage';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getSyncQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');
  const { refreshGlobalData } = useApp();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setPendingCount(getSyncQueue().length);
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    const res = await syncOfflineQueue(api);
    setIsSyncing(false);
    setPendingCount(getSyncQueue().length);
    if (res.success && res.count > 0) {
      setSyncSuccessMsg(`Synchronized ${res.count} item(s) to server.`);
      refreshGlobalData();
      setTimeout(() => setSyncSuccessMsg(''), 4000);
    }
  };

  if (isOnline && pendingCount === 0 && !syncSuccessMsg) return null;

  return (
    <div className="bg-slate-900 text-white text-xs px-4 py-2 flex items-center justify-between border-b border-slate-800 transition-all z-40">
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-amber-400" />
            <span>
              You are currently <strong>offline</strong>. Notes and tasks are saved locally and will sync when internet returns.
            </span>
          </>
        ) : syncSuccessMsg ? (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{syncSuccessMsg}</span>
          </>
        ) : (
          <span>
            {pendingCount} unsynced offline change(s) pending.
          </span>
        )}
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          onClick={triggerSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium text-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      )}
    </div>
  );
}
