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
  transformerNo: string;
  remarks: string;
  photos: string[];
  technician: string;
  status: 'pending' | 'completed' | 'anomaly';
}

export const addMeterReading = async (reading: Omit<MeterReading, 'id'>) => {
  try {
    const readingsRef = collection(db, 'meter-readings');
    const docRef = await addDoc(readingsRef, reading);
    return { id: docRef.id, ...reading };
  } catch (error) {
    console.error('Error adding meter reading:', error);
    throw error;
  }
};

export const updateMeterReading = async (id: string, reading: Partial<MeterReading>) => {
  try {
    const readingRef = doc(db, 'meter-readings', id);
    await updateDoc(readingRef, reading);
    return { id, ...reading };
  } catch (error) {
    console.error('Error updating meter reading:', error);
    throw error;
  }
};

export const deleteMeterReading = async (id: string) => {
  try {
    const readingRef = doc(db, 'meter-readings', id);
    await deleteDoc(readingRef);
    return true;
  } catch (error) {
    console.error('Error deleting meter reading:', error);
    throw error;
  }
};

export const getMeterReadings = async (filters?: { region?: string; district?: string; status?: string }) => {
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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MeterReading));
  } catch (error) {
    console.error('Error getting meter readings:', error);
    throw error;
  }
}; 