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
  Trash2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { MeterReading as BaseMeterReading, getMeterReadings, deleteMeterReading } from '@/lib/firebase/meter-readings';
import { getOfflineReadings } from '@/lib/offlineReadingsQueue';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

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
  hasPendingWrites: boolean;
  isOffline?: boolean;
  tempId?: string;
}

type DashboardMeterReading = BaseMeterReading & { hasPendingWrites?: boolean };

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [readings, setReadings] = useState<DashboardMeterReading[]>([]);
  const [selectedReading, setSelectedReading] = useState<DashboardMeterReading | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalReadings: 0,
    todayReadings: 0,
    pendingSync: 0,
    anomalies: 0
  });
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(readings.length / pageSize);
  const paginatedReadings = readings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    // Build Firestore query
    const readingsRef = collection(db, 'meter-readings');
    const q = query(readingsRef, orderBy('dateTime', 'desc'));

    // Set up real-time listener for online readings
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      setIsFromCache(snapshot.metadata.fromCache);
      let onlineReadings = snapshot.docs.map(doc => ({
        ...(doc.data() as BaseMeterReading),
        id: doc.id,
        hasPendingWrites: doc.metadata.hasPendingWrites,
        isOffline: false,
      }));

      // Get offline readings from IndexedDB
      const offlineReadings = await getOfflineReadings();
      const offlineReadingsFormatted = offlineReadings.map(offline => ({
        ...offline.data,
        id: offline.tempId,
        tempId: offline.tempId,
        hasPendingWrites: false,
        isOffline: true,
      }));

      // Combine online and offline readings
      let allReadings = [...onlineReadings, ...offlineReadingsFormatted];

      // Filter based on user role
      if (user?.role === 'technician') {
        allReadings = allReadings.filter(r => r.technician === user.name);
      } else if (user?.role === 'district_manager') {
        allReadings = allReadings.filter(r => r.district === user.district);
      } else if (user?.role === 'regional_manager') {
        allReadings = allReadings.filter(r => r.region === user.region);
      }

      // Sort by date (newest first)
      allReadings.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

      setReadings(allReadings);

      // Calculate stats
      const today = new Date().toDateString();
      const todayCount = allReadings.filter(r => 
        new Date(r.dateTime).toDateString() === today
      ).length;
      
      const offlineCount = allReadings.filter(r => r.isOffline).length;
      
      // Count anomalies - check both status and anomaly field, but exclude 'METER IS OK'
      const anomalyCount = allReadings.filter(r => 
        (r.status?.toLowerCase() === 'anomaly' || r.anomaly) &&
        !(r.anomaly && r.anomaly.trim().toLowerCase() === 'meter is ok')
      ).length;
      
      setStats({
        totalReadings: allReadings.length,
        todayReadings: todayCount,
        pendingSync: offlineCount,
        anomalies: anomalyCount
      });
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'anomaly': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleViewDetails = (reading: DashboardMeterReading) => {
    setSelectedReading(reading);
    setIsViewDialogOpen(true);
  };

  const handleEditReading = (reading: DashboardMeterReading) => {
    // Navigate to meter reading form with pre-filled data
    navigate('/meter-reading', { state: { editData: reading } });
  };

  const handleDeleteReading = async (readingId: string) => {
    if (confirm('Are you sure you want to delete this reading?')) {
      try {
        await deleteMeterReading(readingId);
        
        // Reload readings
        const allReadings = await getMeterReadings();
        let filteredReadings = allReadings;

        if (user?.role === 'technician') {
          filteredReadings = allReadings.filter(r => r.technician === user.name);
        } else if (user?.role === 'district_manager') {
          filteredReadings = allReadings.filter(r => r.district === user.district);
        } else if (user?.role === 'regional_manager') {
          filteredReadings = allReadings.filter(r => r.region === user.region);
        }

        // Sort readings by date in descending order (newest first)
        filteredReadings.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

        setReadings(filteredReadings);
        
        toast({
          title: "Reading Deleted",
          description: "Meter reading has been successfully deleted.",
          variant: "destructive",
        });
      } catch (error) {
        console.error('Error deleting reading:', error);
        toast({
          title: "Error",
          description: "Failed to delete the reading. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      
      <div className="flex">
        <Navigation />
        
        <main className="flex-1 p-2 sm:p-4 pb-20 sm:pb-4">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-green-600 to-yellow-600 rounded-lg p-4 sm:p-6 text-white">
              <h2 className="text-xl sm:text-2xl font-bold mb-2">
                Welcome back, {user?.name}!
              </h2>
              <p className="opacity-90 text-sm sm:text-base">
                {user?.role === 'technician' 
                  ? 'Ready to capture meter readings?' 
                  : 'Here\'s your team\'s performance overview'}
              </p>
              {user?.role === 'technician' && (
                <Button 
                  className="mt-4 bg-white text-green-600 hover:bg-gray-100 text-sm sm:text-base"
                  onClick={() => navigate('/meter-reading')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Reading
                </Button>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <Card className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{stats.totalReadings}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{stats.todayReadings}</div>
                  <p className="text-xs text-muted-foreground">Readings today</p>
                </CardContent>
              </Card>

              <Card className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{stats.anomalies}</div>
                  <p className="text-xs text-muted-foreground">Need attention</p>
                </CardContent>
              </Card>

              <Card className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Meter is OK</CardTitle>
                  <Zap className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {readings.filter(r => r.anomaly && r.anomaly.trim().toLowerCase() === 'meter is ok').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Meters confirmed OK</p>
                </CardContent>
              </Card>
            </div>

            {isFromCache && !navigator.onLine && (
              <div className="mb-2 text-xs text-yellow-700 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200 rounded px-2 py-1 inline-block">
                Offline: showing cached data
              </div>
            )}
            {isFromCache && navigator.onLine && (
              <div className="mb-2 text-xs text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 rounded px-2 py-1 inline-block">
                Syncing with server...
              </div>
            )}

            {/* Meter Readings List */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Meter Readings</h3>
              {paginatedReadings.length === 0 ? (
                <div className="text-gray-500">No meter readings found.</div>
              ) : (
                <div className="space-y-4">
                  {paginatedReadings.map((reading) => (
                    <div key={reading.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg">
                      <div className="space-y-1 flex-1 mb-2 sm:mb-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-medium text-sm sm:text-base">{reading.customerName}</h4>
                          <Badge className={reading.hasPendingWrites 
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" 
                            : getStatusColor(reading.status)
                          }>
                            {reading.status}
                          </Badge>
                          {reading.isOffline && (
                            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 flex items-center gap-1 ml-2">
                              <WifiOff className="h-3 w-3" />
                              Offline
                            </Badge>
                          )}
                          {reading.hasPendingWrites && (
                            <Badge variant="outline" className="ml-2 text-yellow-700 border-yellow-400 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200">Pending Sync</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                          <span>Meter: {reading.meterNo}</span>
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {reading.district}
                          </span>
                          <span>{new Date(reading.dateTime).toLocaleDateString()}</span>
                        </div>
                        {reading.anomaly && (
                          <p className={
                            "text-xs sm:text-sm " +
                            (reading.anomaly.trim().toLowerCase() === 'meter is ok'
                              ? 'text-green-600 dark:text-green-400 font-semibold'
                              : 'text-red-600')
                          }>
                            {reading.anomaly}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <div className="text-right">
                          <div className="font-medium text-sm sm:text-base">{reading.reading} kWh</div>
                          <div className="text-xs sm:text-sm text-gray-500">{reading.technician}</div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(reading)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditReading(reading)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReading(reading.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {readings.length > 0 && (
                <div className="font-bold mt-6 mb-2 text-base text-gray-800 dark:text-gray-200 text-center">
                  {`Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, readings.length)} of ${readings.length} readings`}
                </div>
              )}
              {/* Pagination Controls */}
              <div className="flex items-center justify-center mt-6 space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="font-semibold text-base text-gray-700 dark:text-gray-200">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Meter Reading Details</DialogTitle>
            <DialogDescription className="text-sm">Complete information for this meter reading</DialogDescription>
          </DialogHeader>
          {selectedReading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Customer Name</label>
                  <p className="font-medium text-sm sm:text-base">{selectedReading.customerName}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Meter Number</label>
                  <p className="text-sm sm:text-base">{selectedReading.meterNo}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Reading</label>
                  <p className="font-medium text-sm sm:text-base">{selectedReading.reading} kWh</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Date & Time</label>
                  <p className="text-sm sm:text-base">{new Date(selectedReading.dateTime).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Customer Access</label>
                  <p className="text-sm sm:text-base">{selectedReading.customerAccess}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Region/District</label>
                  <p className="text-sm sm:text-base">{selectedReading.district}, {selectedReading.region}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Status</label>
                  <Badge className={selectedReading.hasPendingWrites 
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" 
                    : getStatusColor(selectedReading.status)
                  }>
                    {selectedReading.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Technician</label>
                  <p className="text-sm sm:text-base">{selectedReading.technician}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Tariff Class</label>
                  <p className="text-sm sm:text-base capitalize">{selectedReading.tariffClass}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Activities</label>
                  <p className="text-sm sm:text-base capitalize">{selectedReading.activities}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Phase</label>
                  <p className="text-sm sm:text-base">{selectedReading.phase}</p>
                </div>
                {selectedReading.anomaly && (
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Anomaly</label>
                    <p className={
                      "text-sm sm:text-base " +
                      (selectedReading.anomaly.trim().toLowerCase() === 'meter is ok'
                        ? 'text-green-600 dark:text-green-400 font-semibold'
                        : 'text-red-600')
                    }>
                      {selectedReading.anomaly}
                    </p>
                  </div>
                )}
              </div>
              {selectedReading.remarks && (
                <div className="col-span-1 md:col-span-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Remarks</label>
                  <p className="text-sm sm:text-base">{selectedReading.remarks}</p>
                </div>
              )}
              {selectedReading.photos && selectedReading.photos.length > 0 && (
                <div className="col-span-1 md:col-span-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Photos</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {selectedReading.photos
                      .filter(photo => !photo.startsWith('blob:')) // Only show non-blob URLs
                      .map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photo}
                            alt={`Meter photo ${index + 1}`}
                            className="w-full h-32 object-cover rounded border cursor-zoom-in"
                            onClick={() => setEnlargedPhoto(photo)}
                            onError={(e) => {
                              // Hide broken images and show placeholder
                              e.currentTarget.style.display = 'none';
                              const placeholder = document.createElement('div');
                              placeholder.className = 'w-full h-32 bg-gray-200 rounded border flex items-center justify-center text-gray-500 text-sm';
                              placeholder.textContent = 'Photo not available';
                              e.currentTarget.parentNode?.appendChild(placeholder);
                            }}
                          />
                        </div>
                      ))}
                    {selectedReading.photos.filter(photo => photo.startsWith('blob:')).length > 0 && (
                      <div className="col-span-1 sm:col-span-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
                        Some photos are still syncing. They will appear once the sync is complete.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Enlarged Photo Dialog */}
      {enlargedPhoto && (
        <Dialog open={true} onOpenChange={() => setEnlargedPhoto(null)}>
          <DialogContent className="max-w-2xl w-full flex flex-col items-center">
            <img 
              src={enlargedPhoto} 
              alt="Enlarged meter" 
              className="w-full max-h-[80vh] object-contain rounded"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.className = 'w-full max-h-[80vh] bg-gray-200 rounded flex items-center justify-center text-gray-500 text-lg';
                placeholder.textContent = 'Photo not available';
                e.currentTarget.parentNode?.appendChild(placeholder);
              }}
            />
            <Button className="mt-4" onClick={() => setEnlargedPhoto(null)}>Close</Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Dashboard;
