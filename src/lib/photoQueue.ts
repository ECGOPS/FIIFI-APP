import { set, get, del, update, keys } from 'idb-keyval';

export interface QueuedPhoto {
  readingId: string;
  file: File;
  localUrl: string; // The blob URL used in the UI
}

const PHOTO_QUEUE_KEY = 'photo-upload-queue';

// Add a photo to the queue
export async function queuePhotoUpload(photo: QueuedPhoto) {
  const queue: QueuedPhoto[] = (await get(PHOTO_QUEUE_KEY)) || [];
  queue.push(photo);
  await set(PHOTO_QUEUE_KEY, queue);
}

// Get all queued photos
export async function getQueuedPhotos(): Promise<QueuedPhoto[]> {
  return (await get(PHOTO_QUEUE_KEY)) || [];
}

// Remove a photo from the queue by localUrl
export async function removeQueuedPhoto(localUrl: string) {
  let queue: QueuedPhoto[] = (await get(PHOTO_QUEUE_KEY)) || [];
  queue = queue.filter(photo => photo.localUrl !== localUrl);
  await set(PHOTO_QUEUE_KEY, queue);
}

// Remove all photos for a reading
export async function removePhotosForReading(readingId: string) {
  let queue: QueuedPhoto[] = (await get(PHOTO_QUEUE_KEY)) || [];
  queue = queue.filter(photo => photo.readingId !== readingId);
  await set(PHOTO_QUEUE_KEY, queue);
}

// Update queued photos from a placeholder readingId to the real readingId
export async function updateQueuedPhotosReadingId(oldId: string, newId: string) {
  console.log('updateQueuedPhotosReadingId called with:', { oldId, newId });
  let queue: QueuedPhoto[] = (await get(PHOTO_QUEUE_KEY)) || [];
  console.log('Current queue before update:', queue.map(q => ({ readingId: q.readingId, localUrl: q.localUrl })));
  
  queue = queue.map(photo =>
    photo.readingId === oldId ? { ...photo, readingId: newId } : photo
  );
  
  console.log('Queue after update:', queue.map(q => ({ readingId: q.readingId, localUrl: q.localUrl })));
  await set(PHOTO_QUEUE_KEY, queue);
  console.log('Queue saved to IndexedDB');
} 