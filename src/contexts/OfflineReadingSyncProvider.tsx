import React, { useEffect } from 'react';
import { getOfflineReadings, removeOfflineReading } from '@/lib/offlineReadingsQueue';
import { addMeterReading } from '@/lib/firebase/meter-readings';
import { updateQueuedPhotosReadingId } from '@/lib/photoQueue';
import { toast } from '@/hooks/use-toast';

console.log('OfflineReadingSyncProvider: File loaded');

const OfflineReadingSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('OfflineReadingSyncProvider: Component mounted');
  
  useEffect(() => {
    console.log('OfflineReadingSyncProvider: useEffect running, navigator.onLine:', navigator.onLine);
    
    // Test: manually trigger sync after 2 seconds to see if it works
    const testSync = setTimeout(() => {
      console.log('OfflineReadingSyncProvider: Manual test sync triggered');
      syncOfflineReadings();
    }, 2000);
    
    const syncOfflineReadings = async () => {
      console.log('OfflineReadingSyncProvider: Checking for offline readings...');
      const offlineReadings = await getOfflineReadings();
      console.log('OfflineReadingSyncProvider: Found offline readings:', offlineReadings);
      
      if (!offlineReadings.length) {
        console.log('OfflineReadingSyncProvider: No offline readings to sync');
        return;
      }
      
      for (const offline of offlineReadings) {
        try {
          console.log('OfflineReadingSyncProvider: Syncing reading with tempId:', offline.tempId);
          // Add to Firestore
          const result = await addMeterReading(offline.data);
          if (result && result.id) {
            console.log('OfflineReadingSyncProvider: Reading synced to Firestore with ID:', result.id);
            // Update queued photos from tempId to real Firestore ID
            await updateQueuedPhotosReadingId(offline.tempId, result.id);
            console.log('OfflineReadingSyncProvider: Updated queued photos from', offline.tempId, 'to', result.id);
            // Remove from offline queue
            await removeOfflineReading(offline.tempId);
            console.log('OfflineReadingSyncProvider: Removed reading from offline queue');
            toast({
              title: 'Reading Synced',
              description: 'An offline reading and its photos were synced.',
            });
          }
        } catch (err) {
          console.error('Failed to sync offline reading:', err);
          toast({
            title: 'Sync Failed',
            description: 'An offline reading could not be synced.',
            variant: 'destructive',
          });
        }
      }
    };
    // Sync on mount and when coming online
    const handleOnline = () => {
      syncOfflineReadings();
    };
    window.addEventListener('online', handleOnline);
    if (navigator.onLine) syncOfflineReadings();
    return () => {
      window.removeEventListener('online', handleOnline);
      clearTimeout(testSync);
    };
  }, []);
  return <>{children}</>;
};

export default OfflineReadingSyncProvider; 