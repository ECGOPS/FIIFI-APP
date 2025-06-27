import { auth, db } from './config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from '@/contexts/AuthContext';

const demoUsers: Omit<User, 'id'>[] = [
  {
    staffId: 'STF001',
    uid: '',
    name: 'John Mensah',
    email: 'technician@gec.gh',
    role: 'technician',
    region: 'Greater Accra',
    district: 'Accra Metro'
  },
  {
    staffId: 'STF002',
    uid: '',
    name: 'Mary Asante',
    email: 'district@gec.gh',
    role: 'district_manager',
    region: 'Greater Accra',
    district: 'Accra Metro'
  },
  {
    staffId: 'STF003',
    uid: '',
    name: 'Kwame Osei',
    email: 'regional@gec.gh',
    role: 'regional_manager',
    region: 'Greater Accra'
  },
  {
    staffId: 'STF004',
    uid: '',
    name: 'Akosua Frimpong',
    email: 'global@gec.gh',
    role: 'global_manager'
  },
  {
    staffId: 'STF005',
    uid: '',
    name: 'System Admin',
    email: 'admin@gec.gh',
    role: 'admin'
  }
];

export const initializeDemoUsers = async () => {
  console.log('Starting demo users initialization...');
  
  // First, try to create the admin user
  const adminUser = demoUsers.find(user => user.role === 'admin');
  if (!adminUser) {
    throw new Error('Admin user not found in demo users');
  }

  try {
    // Create admin user in Firebase Authentication
    const adminCredential = await createUserWithEmailAndPassword(
      auth,
      adminUser.email,
      'password123'
    );

    // Create admin user document in Firestore
    const adminData = {
      ...adminUser,
      id: adminCredential.user.uid,
    };

    await setDoc(doc(db, 'users', adminCredential.user.uid), adminData);
    console.log(`Successfully created admin user: ${adminUser.email}`);

    // Sign in as admin to create other users
    await signInWithEmailAndPassword(auth, adminUser.email, 'password123');

    // Create other users
    for (const user of demoUsers.filter(u => u.role !== 'admin')) {
      try {
        // Check if user exists in Auth
        const signInMethods = await fetchSignInMethodsForEmail(auth, user.email);
        let userCredential: { user: FirebaseUser } | null = null;
        if (signInMethods.length === 0) {
          // Create user in Firebase Authentication
          userCredential = await createUserWithEmailAndPassword(
            auth,
            user.email,
            'password123'
          );
        } else {
          // Sign in to get UID
          userCredential = {
            user: (await signInWithEmailAndPassword(auth, user.email, 'password123')).user
          };
        }

        // Check if Firestore user doc exists
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          const userData = {
            ...user,
            id: userCredential.user.uid,
          };
          await setDoc(userDocRef, userData);
          console.log(`Created Firestore doc for user: ${user.email}`);
        } else {
          console.log(`Firestore doc already exists for user: ${user.email}`);
        }
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`User ${user.email} already exists, skipping...`);
        } else {
          console.error(`Error creating user ${user.email}:`, error);
        }
      }
    }
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin user already exists, attempting to sign in...');
      try {
        // Try to sign in as admin
        const adminSignIn = await signInWithEmailAndPassword(auth, adminUser.email, 'password123');
        // Ensure Firestore doc exists for admin
        const adminDocRef = doc(db, 'users', adminSignIn.user.uid);
        const adminDocSnap = await getDoc(adminDocRef);
        if (!adminDocSnap.exists()) {
          const adminData = {
            ...adminUser,
            id: adminSignIn.user.uid,
          };
          await setDoc(adminDocRef, adminData);
          console.log(`Created Firestore doc for admin: ${adminUser.email}`);
        } else {
          console.log(`Firestore doc already exists for admin: ${adminUser.email}`);
        }
        // Create/check other users
        for (const user of demoUsers.filter(u => u.role !== 'admin')) {
          try {
            const signInMethods = await fetchSignInMethodsForEmail(auth, user.email);
            let userCredential: { user: FirebaseUser } | null = null;
            if (signInMethods.length === 0) {
              userCredential = await createUserWithEmailAndPassword(
                auth,
                user.email,
                'password123'
              );
            } else {
              userCredential = {
                user: (await signInWithEmailAndPassword(auth, user.email, 'password123')).user
              };
            }
            const userDocRef = doc(db, 'users', userCredential.user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (!userDocSnap.exists()) {
              const userData = {
                ...user,
                id: userCredential.user.uid,
              };
              await setDoc(userDocRef, userData);
              console.log(`Created Firestore doc for user: ${user.email}`);
            } else {
              console.log(`Firestore doc already exists for user: ${user.email}`);
            }
          } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
              console.log(`User ${user.email} already exists, skipping...`);
            } else {
              console.error(`Error creating user ${user.email}:`, error);
            }
          }
        }
      } catch (signInError) {
        console.error('Error signing in as admin:', signInError);
        throw signInError;
      }
    } else {
      console.error('Error creating admin user:', error);
      throw error;
    }
  }

  console.log('Demo users initialization completed!');
}; 