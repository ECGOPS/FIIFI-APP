import { set, get, del, update, keys } from 'idb-keyval';

export interface QueuedPhoto {
  readingId: string;
  file?: File; // Only for runtime use
  base64: string; // Persisted in IndexedDB
  localUrl: string; // The blob URL used in the UI
  fileName: string;
  fileType: string;
}

const PHOTO_QUEUE_KEY = 'photo-upload-queue';

// Helper: Convert File to base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper: Convert base64 to File
export function base64ToFile(base64: string, fileName: string, fileType: string): File {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: fileType || mime });
}

// Add a photo to the queue
export async function queuePhotoUpload(photo: { readingId: string; file: File; localUrl: string }) {
  const base64 = await fileToBase64(photo.file);
  const queue: QueuedPhoto[] = (await get(PHOTO_QUEUE_KEY)) || [];
  queue.push({
    readingId: photo.readingId,
    base64,
    localUrl: photo.localUrl,
    fileName: photo.file.name,
    fileType: photo.file.type,
  });
  await set(PHOTO_QUEUE_KEY, queue);
}

// Get all queued photos
export async function getQueuedPhotos(): Promise<QueuedPhoto[]> {
  const queue: QueuedPhoto[] = (await get(PHOTO_QUEUE_KEY)) || [];
  // Reconstruct File objects for runtime use
  return queue.map(q => ({
    ...q,
    file: base64ToFile(q.base64, q.fileName, q.fileType),
  }));
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