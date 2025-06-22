import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { syncPendingReadings } from '@/lib/firebase/sync';

interface OfflineContextType {
  isOnline: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      
      try {
        const result = await syncPendingReadings();
        if (result && result.synced > 0) {
          toast({
            title: "Sync Complete",
            description: `Successfully synced ${result.synced} pending readings.`,
          });
        }
      } catch (error) {
        console.error('Error syncing pending readings:', error);
        toast({
          title: "Sync Error",
          description: "Failed to sync some pending readings. They will be retried next time you're online.",
          variant: "destructive",
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline }}>
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
