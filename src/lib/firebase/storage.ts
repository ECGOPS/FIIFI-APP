import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from './config';

// Upload a file to Firebase Storage
export const uploadFile = async (
  path: string,
  file: File
): Promise<string> => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

// Get download URL for a file
export const getFileUrl = async (path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
};

// Delete a file from Firebase Storage
export const deleteFile = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}; 