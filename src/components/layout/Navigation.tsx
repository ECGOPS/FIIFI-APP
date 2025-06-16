
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, BarChart3, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/meter-reading', label: 'New Reading', icon: Plus },
    ...(user?.role !== 'technician' ? [{ path: '/reports', label: 'Reports', icon: BarChart3 }] : []),
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 border-t sm:border-t-0 sm:border-r fixed bottom-0 left-0 right-0 sm:relative sm:w-64 sm:min-h-screen">
      <div className="flex sm:flex-col justify-around sm:justify-start sm:space-y-2 sm:p-4 p-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Button
              key={item.path}
              variant={isActive ? "default" : "ghost"}
              className={`flex-1 sm:flex-none sm:w-full flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-1 sm:space-y-0 sm:space-x-2 h-auto py-2 px-3 ${
                isActive 
                  ? 'bg-gradient-to-r from-green-600 to-yellow-600 text-white' 
                  : 'text-gray-600 dark:text-gray-300'
              }`}
              onClick={() => navigate(item.path)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
