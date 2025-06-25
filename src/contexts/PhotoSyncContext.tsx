import React, { useEffect, useRef } from 'react';
import { getQueuedPhotos, removeQueuedPhoto, updateQueuedPhotosReadingId } from '@/lib/photoQueue';
import { getOfflineReadings, removeOfflineReading } from '@/lib/offlineReadingsQueue';
import { addMeterReading } from '@/lib/firebase/meter-readings';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from '@/hooks/use-toast';

export const PhotoSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const syncingRef = useRef(false);

  useEffect(() => {
    const syncOfflineReadings = async () => {
      console.log('PhotoSyncProvider: Checking for offline readings...');
      const offlineReadings = await getOfflineReadings();
      console.log('PhotoSyncProvider: Found offline readings:', offlineReadings);
      
      if (offlineReadings.length > 0) {
        for (const offline of offlineReadings) {
          try {
            console.log('PhotoSyncProvider: Syncing reading with tempId:', offline.tempId);
            // Add to Firestore
            const result = await addMeterReading(offline.data);
            if (result && result.id) {
              console.log('PhotoSyncProvider: Reading synced to Firestore with ID:', result.id);
              // Update queued photos from tempId to real Firestore ID
              await updateQueuedPhotosReadingId(offline.tempId, result.id);
              console.log('PhotoSyncProvider: Updated queued photos from', offline.tempId, 'to', result.id);
              // Remove from offline queue
              await removeOfflineReading(offline.tempId);
              console.log('PhotoSyncProvider: Removed reading from offline queue');
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
      }
    };

    const syncPhotos = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        const queue = await getQueuedPhotos();
        console.log('Photo sync queue:', queue);
        console.log('Queue details:', JSON.stringify(queue.map(q => ({
          readingId: q.readingId,
          localUrl: q.localUrl,
          fileName: q.file?.name,
          fileSize: q.file?.size,
          fileType: q.file?.type,
          isFile: q.file instanceof File
        })), null, 2));
        
        for (const photo of queue) {
          console.log(`Processing photo ${queue.indexOf(photo) + 1} of ${queue.length}`);
          
          if (photo.readingId === 'PENDING') {
            console.log('Skipping photo with PENDING readingId');
            continue; // Skip if not yet associated
          }
          
          // Skip temporary IDs (these will be handled when the real reading is created)
          if (photo.readingId.startsWith('temp_')) {
            console.log('Skipping photo with temporary readingId:', photo.readingId);
            continue;
          }
          
          if (!(photo.file instanceof File)) {
            console.log('Invalid file object:', photo.file);
            toast({
              title: 'Photo Sync Failed',
              description: 'Photo file missing or corrupted, cannot sync.',
              variant: 'destructive',
            });
            await removeQueuedPhoto(photo.localUrl);
            continue;
          }
          
          // Additional validation
          if (photo.file.size === 0) {
            console.log('File is empty:', photo.file.name);
            toast({
              title: 'Photo Sync Failed',
              description: 'Photo file is empty, cannot sync.',
              variant: 'destructive',
            });
            await removeQueuedPhoto(photo.localUrl);
            continue;
          }
          
          try {
            console.log('Processing photo:', photo.localUrl, 'for reading:', photo.readingId);
            
            const storage = getStorage();
            const fileName = `meter-photos/${Date.now()}-${Math.floor(Math.random()*1e6)}-${photo.file.name}`;
            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, photo.file);
            const url = await getDownloadURL(storageRef);
            console.log('Uploaded photo URL:', url);
            
            // Update Firestore document with the real photo URL
            const readingDoc = doc(db, 'meter-readings', photo.readingId);
            const readingSnap = await getDoc(readingDoc);
            if (readingSnap.exists()) {
              const data = readingSnap.data();
              const currentPhotos: string[] = data.photos || [];
              console.log('Current photos in Firestore:', currentPhotos);
              console.log('Looking for:', photo.localUrl);
              
              const updatedPhotos = currentPhotos.map(p => {
                console.log('Comparing:', p, 'with:', photo.localUrl, 'match:', p === photo.localUrl);
                return p === photo.localUrl ? url : p;
              });
              console.log('Updated photos array:', updatedPhotos);
              
              await updateDoc(readingDoc, { photos: updatedPhotos });
              console.log('Firestore updated successfully');
            }
            await removeQueuedPhoto(photo.localUrl);
            toast({
              title: 'Photo Synced',
              description: 'A pending photo was uploaded and synced.',
            });
          } catch (err) {
            console.error('Photo sync error:', err);
            toast({
              title: 'Photo Sync Failed',
              description: 'A pending photo could not be uploaded.',
              variant: 'destructive',
            });
          }
        }
      } finally {
        syncingRef.current = false;
      }
    };

    const handleOnline = () => {
      // First sync offline readings, then sync photos
      syncOfflineReadings().then(() => {
        syncPhotos();
      });
    };
    window.addEventListener('online', handleOnline);
    // Also try syncing on mount (in case we start online)
    if (navigator.onLine) {
      syncOfflineReadings().then(() => {
        syncPhotos();
      });
    }
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return <>{children}</>;
}; 