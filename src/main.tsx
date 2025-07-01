import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// --- PWA update notification and cache clearing ---
import { registerSW } from 'virtual:pwa-register';
import { toast } from '@/hooks/use-toast';
import { clearIndexedDbPersistence, getFirestore } from 'firebase/firestore';
import { del } from 'idb-keyval';

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

createRoot(document.getElementById("root")!).render(<App />);
