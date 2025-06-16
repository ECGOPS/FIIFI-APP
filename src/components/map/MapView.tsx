
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Calendar, User, Zap, Phone, MapPinIcon } from 'lucide-react';

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

// Simple map placeholder that doesn't use react-leaflet
const MapPlaceholder = ({ readings }: { readings: MeterReading[] }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'anomaly': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (readings.length === 0) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No GPS Data Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Meter readings with GPS coordinates will appear on the map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg border flex flex-col">
      {/* Map Header */}
      <div className="p-4 border-b bg-white dark:bg-gray-900">
        <h3 className="font-semibold text-lg mb-2">Interactive Map (Loading...)</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Map will load shortly. Showing {readings.length} meter locations with GPS coordinates.
        </p>
      </div>
      
      {/* Map Area with Grid */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900 dark:to-green-900">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="grid grid-cols-12 h-full">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="border-r border-gray-300 dark:border-gray-600"></div>
              ))}
            </div>
            <div className="absolute inset-0 grid grid-rows-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="border-b border-gray-300 dark:border-gray-600"></div>
              ))}
            </div>
          </div>
          
          {/* Mock markers */}
          <div className="absolute inset-0 p-8">
            {readings.slice(0, 8).map((reading, index) => {
              const x = (index % 4) * 25 + Math.random() * 10;
              const y = Math.floor(index / 4) * 40 + Math.random() * 20;
              
              return (
                <div
                  key={reading.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x + 10}%`, top: `${y + 20}%` }}
                >
                  <div className={`relative group cursor-pointer`}>
                    {/* Marker */}
                    <div className={`w-6 h-6 rounded-full border-2 border-white shadow-lg ${
                      reading.status === 'completed' ? 'bg-green-500' :
                      reading.status === 'anomaly' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 min-w-[200px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">{reading.customerName}</h4>
                        <Badge className={`text-xs ${getStatusColor(reading.status)}`}>
                          {reading.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center">
                          <Zap className="h-3 w-3 mr-1 text-blue-600" />
                          <span>Meter: {reading.meterNo}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1 text-green-600" />
                          <span>{reading.district}, {reading.region}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1 text-orange-600" />
                          <span>{reading.technician}</span>
                        </div>
                        
                        <div className="bg-blue-50 dark:bg-blue-900 p-1 rounded text-center">
                          <span className="font-bold text-blue-600">{reading.reading} kWh</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Loading overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">Loading interactive map...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Completed ({readings.filter(r => r.status === 'completed').length})</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span>Anomaly ({readings.filter(r => r.status === 'anomaly').length})</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span>Pending ({readings.filter(r => r.status === 'pending').length})</span>
            </div>
          </div>
          <span className="text-xs text-gray-500">Hover over markers for details</span>
        </div>
      </div>
    </div>
  );
};

const MapView = () => {
  const { user } = useAuth();
  const [readings, setReadings] = useState<MeterReading[]>([]);

  useEffect(() => {
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

      // Filter readings that have GPS coordinates
      const readingsWithGPS = filteredReadings.filter(r => r.gpsLocation && r.gpsLocation.includes(','));
      
      setReadings(readingsWithGPS);
    };

    loadReadings();
    const interval = setInterval(loadReadings, 5000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      
      <div className="flex">
        <Navigation />
        
        <main className="flex-1 p-4 pb-20 sm:pb-4">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-green-600 to-yellow-600 rounded-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-2 flex items-center">
                <MapPinIcon className="h-8 w-8 mr-3" />
                Meter Locations Map
              </h2>
              <p className="opacity-90">
                View all meter readings plotted on the map based on GPS coordinates
              </p>
              <div className="mt-4 flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                  <span>Anomaly</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                  <span>Pending</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Meters</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{readings.length}</div>
                  <p className="text-xs text-muted-foreground">With GPS coordinates</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <Zap className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {readings.filter(r => r.status === 'completed').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Successfully read</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
                  <Zap className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {readings.filter(r => r.status === 'anomaly').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Need attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Zap className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {readings.filter(r => r.status === 'pending').length}
                  </div>
                  <p className="text-xs text-muted-foreground">In progress</p>
                </CardContent>
              </Card>
            </div>

            {/* Map Container */}
            <Card>
              <CardHeader>
                <CardTitle>Meter Readings Map</CardTitle>
                <CardDescription>
                  Interactive map showing meter locations (click markers for details)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MapPlaceholder readings={readings} />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MapView;
