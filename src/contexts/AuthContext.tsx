
import { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'technician' | 'district_manager' | 'regional_manager' | 'global_manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  region?: string;
  district?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo purposes
const mockUsers: User[] = [
  { id: '1', name: 'John Mensah', email: 'technician@gec.gh', role: 'technician', region: 'Greater Accra', district: 'Accra Metro' },
  { id: '2', name: 'Mary Asante', email: 'district@gec.gh', role: 'district_manager', region: 'Greater Accra', district: 'Accra Metro' },
  { id: '3', name: 'Kwame Osei', email: 'regional@gec.gh', role: 'regional_manager', region: 'Greater Accra' },
  { id: '4', name: 'Akosua Frimpong', email: 'global@gec.gh', role: 'global_manager' },
  { id: '5', name: 'System Admin', email: 'admin@gec.gh', role: 'admin' },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>(mockUsers);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('ghana-electricity-user');
    const storedUsers = localStorage.getItem('ghana-electricity-users');
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = users.find(u => u.email === email);
    if (foundUser && password === 'password123') {
      setUser(foundUser);
      localStorage.setItem('ghana-electricity-user', JSON.stringify(foundUser));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ghana-electricity-user');
  };

  const addUser = (newUser: Omit<User, 'id'>) => {
    const user = { ...newUser, id: Date.now().toString() };
    const updatedUsers = [...users, user];
    setUsers(updatedUsers);
    localStorage.setItem('ghana-electricity-users', JSON.stringify(updatedUsers));
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    const updatedUsers = users.map(u => u.id === id ? { ...u, ...updates } : u);
    setUsers(updatedUsers);
    localStorage.setItem('ghana-electricity-users', JSON.stringify(updatedUsers));
  };

  const deleteUser = (id: string) => {
    const updatedUsers = users.filter(u => u.id !== id);
    setUsers(updatedUsers);
    localStorage.setItem('ghana-electricity-users', JSON.stringify(updatedUsers));
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
      deleteUser 
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
