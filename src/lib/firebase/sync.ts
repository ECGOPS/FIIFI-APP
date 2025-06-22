import { addMeterReading } from './meter-readings';

export const syncPendingReadings = async () => {
  try {
    const pendingReadings = JSON.parse(localStorage.getItem('pending-meter-readings') || '[]');
    
    if (pendingReadings.length === 0) {
      return;
    }

    const syncedReadings = [];
    const failedReadings = [];

    for (const reading of pendingReadings) {
      try {
        // Remove the temporary ID before syncing
        const { id, ...readingData } = reading;
        await addMeterReading(readingData);
        syncedReadings.push(id);
      } catch (error) {
        console.error('Error syncing reading:', error);
        failedReadings.push(reading);
      }
    }

    // Remove successfully synced readings from localStorage
    if (syncedReadings.length > 0) {
      const remainingReadings = pendingReadings.filter(
        reading => !syncedReadings.includes(reading.id)
      );
      localStorage.setItem('pending-meter-readings', JSON.stringify(remainingReadings));
    }

    return {
      synced: syncedReadings.length,
      failed: failedReadings.length
    };
  } catch (error) {
    console.error('Error in sync process:', error);
    throw error;
  }
}; 