import { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
  getAuth,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { signIn, signUp, logOut } from '@/lib/firebase/auth';
import { toast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

export type UserRole = 'technician' | 'district_manager' | 'regional_manager' | 'global_manager' | 'admin';

export interface User {
  id: string;
  uid: string;  // Firebase Auth UID
  staffId: string; // Staff ID
  name: string;
  email: string;
  password?: string;  // Optional password field
  role: UserRole;
  region?: string;
  district?: string;
  firstTimeLogin?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  fetchUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Function to generate a secure random password
function generateSecurePassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);

  // Function to fetch all users
  const fetchUsers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
        }
      } else {
        setUser(null);
    }
    setIsLoading(false);
    });

    // Fetch all users when component mounts
    fetchUsers();

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
    setIsLoading(true);
      console.log('[LOGIN] Attempting sign in with:', email);
      const userCredential = await signIn(email, password);
      console.log('[LOGIN] Firebase Auth success:', userCredential.user.uid);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      console.log('[LOGIN] Firestore userDoc exists:', userDoc.exists());
      if (userDoc.exists()) {
        console.log('[LOGIN] Firestore user data:', userDoc.data());
        setUser({ id: userCredential.user.uid, ...userDoc.data() } as User);
        if (auth.currentUser) {
          // Print custom claims after login
          auth.currentUser.getIdTokenResult().then((idTokenResult) => {
            console.log('[LOGIN] Custom claims:', idTokenResult.claims);
          });
        }
        return true;
      } else {
        console.warn('[LOGIN] No Firestore user document found for:', userCredential.user.uid);
      }
      return false;
    } catch (error) {
      console.error('[LOGIN] Error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const addUser = async (newUser: Omit<User, 'id'>) => {
    try {
      // Create the user in Firebase Auth with default password
      const userCredential = await signUp(newUser.email, 'password123');
      
      // Create user document in Firestore
      const userData = {
        ...newUser,
        id: userCredential.user.uid,
        uid: userCredential.user.uid,
        firstTimeLogin: true,
        password: 'password123' // Store the default password
      };
      
      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      
      // Refresh users list
      await fetchUsers();

      // Show success message to admin
      toast({
        title: "User Created",
        description: `New user ${newUser.name} has been created successfully. They will be prompted to set their password on first login.`,
      });

      // Sign out the newly created user
      await logOut();
      
      // Sign back in as admin using the stored admin password
      if (user?.email && user?.password) {
        await login(user.email, user.password);
      } else {
        throw new Error('Admin credentials not found');
      }
    } catch (error) {
      console.error('Add user error:', error);
      throw error;
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const userRef = doc(db, 'users', id);
      await setDoc(userRef, updates, { merge: true });
      // Refresh users list
      await fetchUsers();
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    console.log('[deleteUser] Called with id:', id);
    try {
      // Debug: Print current user and claims before function call
      console.log('[deleteUser] Current user:', auth.currentUser);
      if (auth.currentUser) {
        const tokenResult = await auth.currentUser.getIdTokenResult();
        console.log('[deleteUser] Token claims before function call:', tokenResult.claims);
        await auth.currentUser.getIdToken(true);
        console.log('[deleteUser] Forced ID token refresh');
      }
      const functions = getFunctions(getApp());
      const deleteUserByAdmin = httpsCallable(functions, "deleteUserByAdmin");
      const payload = { uid: String(id) };
      console.log('[deleteUser] About to call Cloud Function with:', payload);
      const result = await deleteUserByAdmin(payload);
      console.log('[deleteUser] Cloud Function result:', result);

      // Refresh users list
      await fetchUsers();
      console.log('[deleteUser] Refreshed users list');
    } catch (error) {
      console.error('[deleteUser] Error:', error);
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      // Get the current user
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No current user found');
      
      // Get the user's email and current password from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) throw new Error('User document not found');
      
      const userData = userDoc.data();
      const email = userData.email;
      const currentPassword = userData.password; // This should be the temporary password
      
      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Now update the password
      await firebaseUpdatePassword(currentUser, newPassword);
      
      // Update the password in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        password: newPassword,
        firstTimeLogin: false
      }, { merge: true });
      
      // Update local user state
      setUser(prev => prev ? { ...prev, firstTimeLogin: false } : null);
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isLoading, 
      users, 
      addUser, 
      updateUser, 
      deleteUser,
      updatePassword,
      fetchUsers
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
