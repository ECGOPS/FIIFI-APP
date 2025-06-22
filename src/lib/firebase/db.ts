import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  DocumentData,
} from 'firebase/firestore';
import { db } from './config';

// Generic function to get a document by ID
export const getDocument = async <T>(collectionName: string, docId: string): Promise<T | null> => {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
};

// Generic function to get all documents in a collection
export const getDocuments = async <T>(collectionName: string): Promise<T[]> => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
};

// Generic function to create or update a document
export const setDocument = async <T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> => {
  const docRef = doc(db, collectionName, docId);
  await setDoc(docRef, data, { merge: true });
};

// Generic function to update a document
export const updateDocument = async <T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: Partial<T>
): Promise<void> => {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data as DocumentData);
};

// Generic function to delete a document
export const deleteDocument = async (
  collectionName: string,
  docId: string
): Promise<void> => {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
};

// Generic function to query documents
export const queryDocuments = async <T>(
  collectionName: string,
  field: string,
  operator: any,
  value: any
): Promise<T[]> => {
  const q = query(collection(db, collectionName), where(field, operator, value));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}; 