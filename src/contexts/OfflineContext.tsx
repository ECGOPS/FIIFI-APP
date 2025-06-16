
import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface OfflineContextType {
  isOnline: boolean;
  pendingSync: number;
  syncData: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Connection Restored",
        description: "Your data will be synced automatically.",
      });
      syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Working Offline",
        description: "Your data will be saved locally and synced when connection is restored.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for pending sync items
    const checkPendingSync = () => {
      const pending = localStorage.getItem('pending-meter-readings');
      if (pending) {
        const readings = JSON.parse(pending);
        setPendingSync(readings.length);
      }
    };

    checkPendingSync();
    const interval = setInterval(checkPendingSync, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const syncData = async () => {
    const pendingReadings = localStorage.getItem('pending-meter-readings');
    if (pendingReadings && isOnline) {
      try {
        const readings = JSON.parse(pendingReadings);
        // Simulate API sync
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Move to synced storage
        const existingReadings = localStorage.getItem('meter-readings') || '[]';
        const allReadings = [...JSON.parse(existingReadings), ...readings];
        localStorage.setItem('meter-readings', JSON.stringify(allReadings));
        localStorage.removeItem('pending-meter-readings');
        
        setPendingSync(0);
        toast({
          title: "Data Synced",
          description: `${readings.length} meter readings have been synced successfully.`,
        });
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  };

  return (
    <OfflineContext.Provider value={{ isOnline, pendingSync, syncData }}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
