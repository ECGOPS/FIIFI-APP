import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "./pages/Index";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  return isOnline;
}

const App = () => {
  const isOnline = useOnlineStatus();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {!isOnline && (
          <div className="fixed top-0 left-0 w-full bg-yellow-500 text-white text-center py-2 z-50 shadow-md">
            You are offline. Changes will sync when you're back online.
          </div>
        )}
        <Toaster />
        <Sonner />
        <Index />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
