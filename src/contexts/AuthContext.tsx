
import { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'technician' | 'district_manager' | 'regional_manager' | 'global_manager';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo purposes
const mockUsers: User[] = [
  { id: '1', name: 'John Mensah', email: 'technician@gec.gh', role: 'technician', region: 'Greater Accra', district: 'Accra Metro' },
  { id: '2', name: 'Mary Asante', email: 'district@gec.gh', role: 'district_manager', region: 'Greater Accra', district: 'Accra Metro' },
  { id: '3', name: 'Kwame Osei', email: 'regional@gec.gh', role: 'regional_manager', region: 'Greater Accra' },
  { id: '4', name: 'Akosua Frimpong', email: 'global@gec.gh', role: 'global_manager' },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('ghana-electricity-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = mockUsers.find(u => u.email === email);
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

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
