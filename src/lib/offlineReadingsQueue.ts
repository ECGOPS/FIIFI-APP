import { set, get, del } from 'idb-keyval';

const OFFLINE_READINGS_KEY = 'offline-meter-readings';

export interface OfflineMeterReading {
  tempId: string;
  data: any; // Omit<MeterReading, 'id'>
}

// Add a reading to the offline queue
export async function queueOfflineReading(reading: OfflineMeterReading) {
  console.log('queueOfflineReading: Adding reading to queue:', reading);
  const queue: OfflineMeterReading[] = (await get(OFFLINE_READINGS_KEY)) || [];
  console.log('queueOfflineReading: Current queue:', queue);
  queue.push(reading);
  console.log('queueOfflineReading: Updated queue:', queue);
  await set(OFFLINE_READINGS_KEY, queue);
  console.log('queueOfflineReading: Saved to IndexedDB');
}

// Get all offline readings
export async function getOfflineReadings(): Promise<OfflineMeterReading[]> {
  return (await get(OFFLINE_READINGS_KEY)) || [];
}

// Remove a reading from the queue by tempId
export async function removeOfflineReading(tempId: string) {
  let queue: OfflineMeterReading[] = (await get(OFFLINE_READINGS_KEY)) || [];
  queue = queue.filter(r => r.tempId !== tempId);
  await set(OFFLINE_READINGS_KEY, queue);
} 