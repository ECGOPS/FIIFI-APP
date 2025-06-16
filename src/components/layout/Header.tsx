
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useOffline } from '@/contexts/OfflineContext';
import { Moon, Sun, User, Wifi, WifiOff, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isOnline, pendingSync } = useOffline();

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'technician': return 'Technician';
      case 'district_manager': return 'District Manager';
      case 'regional_manager': return 'Regional Manager';
      case 'global_manager': return 'Global Manager';
      default: return role;
    }
  };

  return (
    <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-50">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/5cde61ae-2a1b-429f-abd3-69c473f7d353.png" 
            alt="ECG Logo" 
            className="h-10 w-10 object-contain"
          />
          <div>
            <h1 className="text-lg font-semibold">ECG Operation Zero</h1>
            <p className="text-xs text-gray-500">Meter Reading System</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            {pendingSync > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingSync} pending
              </Badge>
            )}
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:block">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-gray-500">{getRoleDisplay(user?.role || '')}</p>
                  {user?.district && (
                    <p className="text-xs text-gray-500">{user.district}, {user.region}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
