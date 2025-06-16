
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Users, 
  Zap,
  CheckCircle,
  AlertTriangle,
  Plus
} from 'lucide-react';

interface MeterReading {
  id: string;
  customerName: string;
  meterNo: string;
  reading: number;
  region: string;
  district: string;
  dateTime: string;
  status: 'completed' | 'pending' | 'anomaly';
  technician: string;
  anomaly?: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [stats, setStats] = useState({
    totalReadings: 0,
    todayReadings: 0,
    pendingSync: 0,
    anomalies: 0
  });

  useEffect(() => {
    // Load meter readings based on user role
    const loadReadings = () => {
      const allReadings = JSON.parse(localStorage.getItem('meter-readings') || '[]');
      const pendingReadings = JSON.parse(localStorage.getItem('pending-meter-readings') || '[]');
      const combinedReadings = [...allReadings, ...pendingReadings];

      let filteredReadings = combinedReadings;

      // Filter based on user role
      if (user?.role === 'technician') {
        filteredReadings = combinedReadings.filter(r => r.technician === user.name);
      } else if (user?.role === 'district_manager') {
        filteredReadings = combinedReadings.filter(r => r.district === user.district);
      } else if (user?.role === 'regional_manager') {
        filteredReadings = combinedReadings.filter(r => r.region === user.region);
      }
      // Global manager sees all readings

      setReadings(filteredReadings);

      // Calculate stats
      const today = new Date().toDateString();
      const todayCount = filteredReadings.filter(r => 
        new Date(r.dateTime).toDateString() === today
      ).length;
      
      const anomalyCount = filteredReadings.filter(r => r.status === 'anomaly').length;
      const pendingCount = pendingReadings.length;

      setStats({
        totalReadings: filteredReadings.length,
        todayReadings: todayCount,
        pendingSync: pendingCount,
        anomalies: anomalyCount
      });
    };

    loadReadings();
    const interval = setInterval(loadReadings, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'anomaly': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      
      <div className="flex">
        <Navigation />
        
        <main className="flex-1 p-4 pb-20 sm:pb-4">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-green-600 to-yellow-600 rounded-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">
                Welcome back, {user?.name}!
              </h2>
              <p className="opacity-90">
                {user?.role === 'technician' 
                  ? 'Ready to capture meter readings?' 
                  : 'Here\'s your team\'s performance overview'}
              </p>
              {user?.role === 'technician' && (
                <Button 
                  className="mt-4 bg-white text-green-600 hover:bg-gray-100"
                  onClick={() => navigate('/meter-reading')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Reading
                </Button>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalReadings}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.todayReadings}</div>
                  <p className="text-xs text-muted-foreground">Readings today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Sync</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingSync}</div>
                  <p className="text-xs text-muted-foreground">Offline readings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.anomalies}</div>
                  <p className="text-xs text-muted-foreground">Need attention</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Readings */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Readings</CardTitle>
                <CardDescription>
                  Latest meter readings {user?.role === 'technician' ? 'by you' : 'in your area'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {readings.slice(0, 10).map((reading) => (
                    <div key={reading.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{reading.customerName}</h4>
                          <Badge className={getStatusColor(reading.status)}>
                            {reading.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Meter: {reading.meterNo}</span>
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {reading.district}
                          </span>
                          <span>{new Date(reading.dateTime).toLocaleDateString()}</span>
                        </div>
                        {reading.anomaly && (
                          <p className="text-sm text-red-600">{reading.anomaly}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{reading.reading} kWh</div>
                        <div className="text-sm text-gray-500">{reading.technician}</div>
                      </div>
                    </div>
                  ))}
                  
                  {readings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No meter readings yet</p>
                      {user?.role === 'technician' && (
                        <Button 
                          className="mt-4" 
                          onClick={() => navigate('/meter-reading')}
                        >
                          Create Your First Reading
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
