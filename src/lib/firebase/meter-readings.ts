import { collection, addDoc, updateDoc, doc, getDocs, query, where, deleteDoc, Query, CollectionReference } from 'firebase/firestore';
import { db } from './config';

export interface MeterReading {
  id: string;
  dateTime: string;
  customerAccess: 'yes' | 'no';
  meterNo: string;
  region: string;
  district: string;
  gpsLocation: string;
  customerName: string;
  customerContact: string;
  spn: string;
  accountNumber: string;
  geoCode: string;
  tariffClass: 'residential' | 'commercial';
  activities: 'residential' | 'factory' | 'church' | 'school' | 'shop';
  phase: '1ph' | '3ph';
  reading: number;
  creditBalance: number;
  anomaly?: string;
  areaLocation: string;
  remarks: string;
  photos: string[];
  technician: string;
  status: 'pending' | 'completed' | 'anomaly';
}

export const addMeterReading = async (reading: Omit<MeterReading, 'id'>) => {
  console.log('[addMeterReading] Called with:', reading);
  try {
    const readingsRef = collection(db, 'meter-readings');
    const docRef = await addDoc(readingsRef, reading);
    console.log('[addMeterReading] Success, docRef:', docRef);
    return { id: docRef.id, ...reading };
  } catch (error) {
    console.error('[addMeterReading] Error:', error);
    throw error;
  }
};

export const updateMeterReading = async (id: string, reading: Partial<MeterReading>) => {
  console.log('[updateMeterReading] Called with id:', id, 'reading:', reading);
  try {
    const readingRef = doc(db, 'meter-readings', id);
    await updateDoc(readingRef, reading);
    console.log('[updateMeterReading] Success');
    return { id, ...reading };
  } catch (error) {
    console.error('[updateMeterReading] Error:', error);
    throw error;
  }
};

export const deleteMeterReading = async (id: string) => {
  console.log('[deleteMeterReading] Called with id:', id);
  try {
    const readingRef = doc(db, 'meter-readings', id);
    await deleteDoc(readingRef);
    console.log('[deleteMeterReading] Success');
    return true;
  } catch (error) {
    console.error('[deleteMeterReading] Error:', error);
    throw error;
  }
};

export const getMeterReadings = async (filters?: { region?: string; district?: string; status?: string }) => {
  console.log('[getMeterReadings] Called with filters:', filters);
  try {
    const readingsRef = collection(db, 'meter-readings');
    let q: Query | CollectionReference = readingsRef;

    if (filters) {
      const conditions = [];
      if (filters.region) conditions.push(where('region', '==', filters.region));
      if (filters.district) conditions.push(where('district', '==', filters.district));
      if (filters.status) conditions.push(where('status', '==', filters.status));
      
      if (conditions.length > 0) {
        q = query(readingsRef, ...conditions);
      }
    }

    const snapshot = await getDocs(q);
    const result = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MeterReading));
    console.log('[getMeterReadings] Success, result:', result);
    return result;
  } catch (error) {
    console.error('[getMeterReadings] Error:', error);
    throw error;
  }
}; 