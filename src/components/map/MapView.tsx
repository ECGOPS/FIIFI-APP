
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Calendar, User, Zap, Phone, MapPinIcon } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

const MapView = () => {
  const { user } = useAuth();
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([5.6037, -0.1870]); // Default to Accra, Ghana

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

      // Set map center to the first reading's location if available
      if (readingsWithGPS.length > 0 && readingsWithGPS[0].gpsLocation) {
        const [lat, lng] = readingsWithGPS[0].gpsLocation.split(',').map(coord => parseFloat(coord.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          setMapCenter([lat, lng]);
        }
      }
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

  const getMarkerIcon = (status: string) => {
    const color = status === 'completed' ? 'green' : status === 'anomaly' ? 'red' : 'orange';
    return new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  };

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
                  Click on markers to view meter details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] rounded-lg overflow-hidden border">
                  {readings.length > 0 ? (
                    <MapContainer
                      center={mapCenter}
                      zoom={10}
                      style={{ height: '100%', width: '100%' }}
                      key={mapCenter.join(',')}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {readings.map((reading) => {
                        if (!reading.gpsLocation || !reading.gpsLocation.includes(',')) return null;
                        
                        const coords = reading.gpsLocation.split(',');
                        const lat = parseFloat(coords[0].trim());
                        const lng = parseFloat(coords[1].trim());
                        
                        if (isNaN(lat) || isNaN(lng)) return null;

                        return (
                          <Marker
                            key={reading.id}
                            position={[lat, lng]}
                            icon={getMarkerIcon(reading.status)}
                          >
                            <Popup>
                              <div className="p-2 min-w-[250px]">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-semibold text-lg">{reading.customerName}</h3>
                                  <Badge className={getStatusColor(reading.status)}>
                                    {reading.status}
                                  </Badge>
                                </div>
                                
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center">
                                    <Zap className="h-4 w-4 mr-2 text-blue-600" />
                                    <span className="font-medium">Meter:</span>
                                    <span className="ml-1">{reading.meterNo}</span>
                                  </div>
                                  
                                  <div className="flex items-center">
                                    <MapPin className="h-4 w-4 mr-2 text-green-600" />
                                    <span className="font-medium">Location:</span>
                                    <span className="ml-1">{reading.district}, {reading.region}</span>
                                  </div>
                                  
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                                    <span className="font-medium">Date:</span>
                                    <span className="ml-1">{new Date(reading.dateTime).toLocaleDateString()}</span>
                                  </div>
                                  
                                  <div className="flex items-center">
                                    <User className="h-4 w-4 mr-2 text-orange-600" />
                                    <span className="font-medium">Technician:</span>
                                    <span className="ml-1">{reading.technician}</span>
                                  </div>
                                  
                                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                    <span className="font-medium">Reading:</span>
                                    <span className="ml-1 text-lg font-bold text-blue-600">{reading.reading} kWh</span>
                                  </div>
                                  
                                  {reading.customerContact && (
                                    <div className="flex items-center">
                                      <Phone className="h-4 w-4 mr-2 text-green-600" />
                                      <span className="font-medium">Contact:</span>
                                      <span className="ml-1">{reading.customerContact}</span>
                                    </div>
                                  )}
                                  
                                  {reading.anomaly && (
                                    <div className="bg-red-50 dark:bg-red-900 p-2 rounded border border-red-200 dark:border-red-700">
                                      <span className="font-medium text-red-700 dark:text-red-300">Anomaly:</span>
                                      <span className="ml-1 text-red-600 dark:text-red-400">{reading.anomaly}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
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

export default MapView;
