
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Users, 
  Zap,
  CheckCircle,
  AlertTriangle,
  Plus,
  Eye,
  Edit,
  Trash2
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
  customerAccess: 'yes' | 'no';
  customerContact?: string;
  spn?: string;
  accountNumber?: string;
  geoCode?: string;
  tariffClass: 'residential' | 'commercial';
  activities: string;
  phase: '1ph' | '3ph';
  creditBalance?: number;
  areaLocation?: string;
  transformerNo?: string;
  remarks?: string;
  photos?: string[];
  gpsLocation?: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [selectedReading, setSelectedReading] = useState<MeterReading | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
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
      // Global manager and admin see all readings

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

  const handleViewDetails = (reading: MeterReading) => {
    setSelectedReading(reading);
    setIsViewDialogOpen(true);
  };

  const handleEditReading = (reading: MeterReading) => {
    // Navigate to meter reading form with pre-filled data
    navigate('/meter-reading', { state: { editData: reading } });
  };

  const handleDeleteReading = (readingId: string) => {
    if (confirm('Are you sure you want to delete this reading?')) {
      const allReadings = JSON.parse(localStorage.getItem('meter-readings') || '[]');
      const pendingReadings = JSON.parse(localStorage.getItem('pending-meter-readings') || '[]');
      
      const updatedAllReadings = allReadings.filter((r: MeterReading) => r.id !== readingId);
      const updatedPendingReadings = pendingReadings.filter((r: MeterReading) => r.id !== readingId);
      
      localStorage.setItem('meter-readings', JSON.stringify(updatedAllReadings));
      localStorage.setItem('pending-meter-readings', JSON.stringify(updatedPendingReadings));
      
      // Reload readings
      const combinedReadings = [...updatedAllReadings, ...updatedPendingReadings];
      let filteredReadings = combinedReadings;

      if (user?.role === 'technician') {
        filteredReadings = combinedReadings.filter(r => r.technician === user.name);
      } else if (user?.role === 'district_manager') {
        filteredReadings = combinedReadings.filter(r => r.district === user.district);
      } else if (user?.role === 'regional_manager') {
        filteredReadings = combinedReadings.filter(r => r.region === user.region);
      }

      setReadings(filteredReadings);
      
      toast({
        title: "Reading Deleted",
        description: "Meter reading has been successfully deleted.",
        variant: "destructive",
      });
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
                      <div className="space-y-1 flex-1">
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
                      <div className="flex items-center space-x-2">
                        <div className="text-right mr-4">
                          <div className="font-medium">{reading.reading} kWh</div>
                          <div className="text-sm text-gray-500">{reading.technician}</div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(reading)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditReading(reading)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReading(reading.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meter Reading Details</DialogTitle>
            <DialogDescription>Complete information for this meter reading</DialogDescription>
          </DialogHeader>
          {selectedReading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer Name</label>
                  <p className="font-medium">{selectedReading.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Meter Number</label>
                  <p>{selectedReading.meterNo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Reading</label>
                  <p className="font-medium">{selectedReading.reading} kWh</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date & Time</label>
                  <p>{new Date(selectedReading.dateTime).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer Access</label>
                  <p>{selectedReading.customerAccess}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Region/District</label>
                  <p>{selectedReading.district}, {selectedReading.region}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={getStatusColor(selectedReading.status)}>
                    {selectedReading.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Technician</label>
                  <p>{selectedReading.technician}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tariff Class</label>
                  <p className="capitalize">{selectedReading.tariffClass}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Activities</label>
                  <p className="capitalize">{selectedReading.activities}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phase</label>
                  <p>{selectedReading.phase}</p>
                </div>
                {selectedReading.anomaly && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Anomaly</label>
                    <p className="text-red-600">{selectedReading.anomaly}</p>
                  </div>
                )}
              </div>
              {selectedReading.remarks && (
                <div className="col-span-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Remarks</label>
                  <p>{selectedReading.remarks}</p>
                </div>
              )}
              {selectedReading.photos && selectedReading.photos.length > 0 && (
                <div className="col-span-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Photos</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {selectedReading.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Meter photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
