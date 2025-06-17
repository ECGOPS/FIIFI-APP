
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, BarChart3, Plus, Users, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: Home },
    { path: '/meter-reading', label: 'New Reading', shortLabel: 'Reading', icon: Plus },
    { path: '/map', label: 'Map View', shortLabel: 'Map', icon: MapPin },
    ...(user?.role !== 'technician' ? [{ path: '/reports', label: 'Reports', shortLabel: 'Reports', icon: BarChart3 }] : []),
    ...(user?.role === 'admin' ? [{ path: '/users', label: 'User Management', shortLabel: 'Users', icon: Users }] : []),
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 border-t sm:border-t-0 sm:border-r fixed bottom-0 left-0 right-0 sm:relative sm:w-64 sm:min-h-screen">
      <div className="flex sm:flex-col justify-around sm:justify-start sm:space-y-2 sm:p-4 p-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Button
              key={item.path}
              variant={isActive ? "default" : "ghost"}
              className={`flex-1 sm:flex-none sm:w-full flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-1 sm:space-y-0 sm:space-x-2 h-auto py-1.5 px-1 sm:py-2 sm:px-3 ${
                isActive 
                  ? 'bg-gradient-to-r from-green-600 to-yellow-600 text-white' 
                  : 'text-gray-600 dark:text-gray-300'
              }`}
              onClick={() => navigate(item.path)}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-center sm:text-left leading-tight whitespace-nowrap sm:whitespace-normal">
                <span className="sm:hidden">{item.shortLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
