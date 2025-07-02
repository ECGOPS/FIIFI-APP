import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// --- PWA update notification and cache clearing ---
import { registerSW } from 'virtual:pwa-register';
import { toast } from '@/hooks/use-toast';
import { clearIndexedDbPersistence, getFirestore } from 'firebase/firestore';
import { del } from 'idb-keyval';
import { ToastAction } from '@/components/ui/toast';

// List of custom IndexedDB keys to clear
const CUSTOM_IDB_KEYS = [
  'offline-meter-readings', // from offlineReadingsQueue
  'photo-queue',            // from photoQueue
];

function clearAllCachesAndReload() {
  // Clear Firestore persistence
  try {
    const db = getFirestore();
    // This will clear Firestore's IndexedDB data
    // (If not supported, just ignore)
    if (typeof window !== 'undefined' && db) {
      // @ts-ignore
      if (window.indexedDB) {
        import('firebase/firestore').then(({ clearIndexedDbPersistence }) => {
          clearIndexedDbPersistence(db).finally(() => {
            // Clear custom app data
            Promise.all(CUSTOM_IDB_KEYS.map(key => del(key))).finally(() => {
              window.location.reload();
            });
          });
        });
      } else {
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  } catch {
    window.location.reload();
  }
}

// Expose for use in AuthContext
if (typeof window !== 'undefined') {
  window.clearAllCachesAndReload = clearAllCachesAndReload;
}

registerSW({
  onNeedRefresh() {
    toast({
      title: 'Update Available',
      description: 'A new version of the app is available.',
      action: {
        label: 'Reload',
        onClick: clearAllCachesAndReload,
      },
      variant: 'default',
      duration: 10000,
    });
  },
  onOfflineReady() {
    // Optionally notify user that app is ready for offline use
  },
});
// --- End PWA update notification ---

// Automatic cache corruption detection
(async function detectCacheCorruption() {
  let corrupted = false;
  try {
    // Try reading offline readings
    await import('./lib/offlineReadingsQueue').then(async mod => {
      try {
        await mod.getOfflineReadings();
      } catch (e) {
        corrupted = true;
      }
    });
    // Try reading photo queue
    await import('./lib/photoQueue').then(async mod => {
      try {
        await mod.getQueuedPhotos();
      } catch (e) {
        corrupted = true;
      }
    });
  } catch (e) {
    corrupted = true;
  }
  if (corrupted) {
    let syncing = false;
    const syncAndClear = async () => {
      if (syncing) return;
      syncing = true;
      toast({
        title: 'Syncing...',
        description: 'Attempting to sync your pending work before clearing cache.',
        variant: 'default',
        duration: 10000,
      });
      try {
        // Sync offline readings and photos
        const [{ syncPendingReadings }, { getQueuedPhotos }] = await Promise.all([
          import('./lib/firebase/sync'),
          import('./lib/photoQueue'),
        ]);
        await syncPendingReadings();
        // Try to sync photos (simulate PhotoSyncProvider logic)
        const queue = await getQueuedPhotos();
        // Optionally, you could try to upload photos here if needed
        // For now, just clear after attempting
      } catch (e) {
        // Ignore errors, proceed to clear
      } finally {
        clearAllCachesAndReload();
      }
    };
    toast({
      title: 'App Storage Error',
      description: 'App data appears to be corrupted or inaccessible. You can try to sync your work before clearing the cache.',
      action: (
        <ToastAction altText="Sync and clear cache" onClick={syncAndClear}>
          Sync & Clear Cache
        </ToastAction>
      ),
      variant: 'destructive',
      duration: 60000,
    });
  }
})();

// Listen for background sync messages from the service worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'SYNC_METER_READINGS') {
      console.log('[main.tsx] Received SYNC_METER_READINGS from service worker, triggering sync');
      try {
        const [{ syncPendingReadings }, { getQueuedPhotos }] = await Promise.all([
          import('./lib/firebase/sync'),
          import('./lib/photoQueue'),
        ]);
        await syncPendingReadings();
        await getQueuedPhotos(); // Optionally, trigger photo sync logic
      } catch (e) {
        console.error('[main.tsx] Error during background sync:', e);
      }
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
