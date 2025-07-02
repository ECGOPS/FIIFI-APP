import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Calendar, User, Zap, Phone, MapPinIcon } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import { getMeterReadings } from '@/lib/firebase/meter-readings';
import { useTheme } from '@/contexts/ThemeContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRegionsByType, getDistrictsByRegion } from '@/lib/data/regions';
import { format, parseISO } from 'date-fns';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
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
}

// Dark mode map styles
const darkModeStyles = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }]
  }
];

// Light mode map styles
const lightModeStyles = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  }
];

const MapView = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedAnomaly, setSelectedAnomaly] = useState<string>('all');
  const [anomalyOptions, setAnomalyOptions] = useState<string[]>([]);
  const [loadingAnomalies, setLoadingAnomalies] = useState(true);

  const regions = getRegionsByType();
  const districts = selectedRegion !== 'all' ? getDistrictsByRegion(selectedRegion) : [];

  // Disable region select for technician, district_manager, and regional_manager
  const regionDisabled = user && (user.role === 'technician' || user.role === 'district_manager' || user.role === 'regional_manager');
  // Disable district select for technician and district_manager only
  const districtDisabled = user && (user.role === 'technician' || user.role === 'district_manager');

  useEffect(() => {
    // Initialize Google Maps
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load().then(() => {
      if (mapRef.current) {
        const initialMap = new google.maps.Map(mapRef.current, {
          center: { lat: 5.6037, lng: -0.1870 }, // Ghana's center
          zoom: 6,
          styles: theme === 'dark' ? darkModeStyles : lightModeStyles
        });

        // Add zoom change listener
        initialMap.addListener('zoom_changed', () => {
          setIsFirstLoad(false);
        });

        setMap(initialMap);
        setInfoWindow(new google.maps.InfoWindow());
      }
    });
  }, [theme]);

  useEffect(() => {
    // Real-time listener for meter readings
    const readingsRef = collection(db, 'meter-readings');
    const unsubscribe = onSnapshot(readingsRef, (snapshot) => {
      let allReadings = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as MeterReading) }));
      // Filter based on user role
      if (user?.role === 'technician') {
        allReadings = allReadings.filter(r => r.technician === user.name);
      } else if (user?.role === 'district_manager') {
        allReadings = allReadings.filter(r => r.district === user.district);
      } else if (user?.role === 'regional_manager') {
        allReadings = allReadings.filter(r => r.region === user.region);
      }
      // Filter readings that have GPS coordinates
      const readingsWithGPS = allReadings.filter(r => {
        if (!r.gpsLocation) return false;
        const [lat, lng] = r.gpsLocation.split(',').map(Number);
        return !isNaN(lat) && !isNaN(lng);
      });
      setReadings(readingsWithGPS);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const fetchAnomalies = async () => {
      setLoadingAnomalies(true);
      const snap = await getDocs(collection(db, 'anomalies'));
      setAnomalyOptions(snap.docs.map(doc => doc.data().name));
      setLoadingAnomalies(false);
    };
    fetchAnomalies();
  }, []);

  // Filter readings based on filters
  const filteredReadings = readings.filter(r => {
    let match = true;
    if (selectedDate !== 'all') {
      match = match && format(new Date(r.dateTime), 'yyyy-MM-dd') === selectedDate;
    }
    if (selectedRegion !== 'all') {
      match = match && r.region === selectedRegion;
    }
    if (selectedDistrict !== 'all') {
      match = match && r.district === selectedDistrict;
    }
    if (selectedAnomaly !== 'all') {
      match = match && r.anomaly === selectedAnomaly;
    }
    return match;
  });

  useEffect(() => {
    if (!map || !infoWindow) return;

    // Clear all existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const newMarkers: google.maps.Marker[] = [];

    // Group readings by location
    const locationGroups = new Map<string, MeterReading[]>();
    filteredReadings.forEach(reading => {
      if (!reading.gpsLocation) return;
      const key = reading.gpsLocation;
      if (!locationGroups.has(key)) {
        locationGroups.set(key, []);
      }
      locationGroups.get(key)!.push(reading);
    });

    // Create markers with offset for overlapping locations
    locationGroups.forEach((groupReadings, location) => {
      const [baseLat, baseLng] = location.split(',').map(Number);
      if (isNaN(baseLat) || isNaN(baseLng)) return;

      // If there are multiple readings at the same location, create a single marker with count
      if (groupReadings.length > 1) {
        const marker = new google.maps.Marker({
          position: { lat: baseLat, lng: baseLng },
          map,
          title: `${groupReadings.length} meters at this location`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#3B82F6',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          label: {
            text: groupReadings.length.toString(),
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold'
          }
        });

        const content = `
          <div class="p-2 max-w-[300px] dark:bg-gray-800 dark:text-gray-100">
            <h4 class="font-semibold text-sm mb-2 dark:text-white">${groupReadings.length} Meters at this location</h4>
            <div class="space-y-2">
              ${groupReadings.map(reading => `
                <div class="border-t dark:border-gray-700 pt-2">
                  <div class="flex items-center justify-between mb-1">
                    <h5 class="font-medium text-sm dark:text-white">${reading.customerName}</h5>
                    <span class="text-xs px-2 py-1 rounded ${
                      reading.anomaly && reading.anomaly.trim().toLowerCase() === 'meter is ok'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : reading.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : reading.status === 'anomaly' || reading.anomaly
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }">${reading.anomaly ? reading.anomaly : reading.status}</span>
                  </div>
                  <div class="space-y-1 text-xs dark:text-gray-300">
                    <div class="flex items-center">
                      <span class="text-blue-600 dark:text-blue-400 mr-1">⚡</span>
                      <span>Meter: ${reading.meterNo}</span>
                    </div>
                    <div class="flex items-center">
                      <span class="text-green-600 dark:text-green-400 mr-1">📍</span>
                      <span>${reading.district}, ${reading.region}</span>
                    </div>
                    <div class="flex items-center">
                      <span class="text-orange-600 dark:text-orange-400 mr-1">👤</span>
                      <span>${reading.technician}</span>
                    </div>
                    <div class="bg-blue-50 dark:bg-blue-900/50 p-1 rounded text-center">
                      <span class="font-bold text-blue-600 dark:text-blue-400">${reading.reading} kWh</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        marker.addListener('click', () => {
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
      } else {
        // Single reading at this location
        const reading = groupReadings[0];
        const marker = new google.maps.Marker({
          position: { lat: baseLat, lng: baseLng },
          map,
          title: reading.customerName,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: reading.anomaly && reading.anomaly.trim().toLowerCase() === 'meter is ok'
              ? '#10B981'
              : reading.status === 'completed'
                ? '#10B981'
                : reading.status === 'anomaly' || reading.anomaly
                  ? '#EF4444'
                  : '#F59E0B',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }
        });

        const content = `
          <div class="p-2 max-w-[200px] dark:bg-gray-800 dark:text-gray-100">
            <h4 class="font-semibold text-sm mb-1 dark:text-white">${reading.customerName}</h4>
            <div class="space-y-1 text-xs dark:text-gray-300">
              <div class="flex items-center">
                <span class="text-blue-600 dark:text-blue-400 mr-1">⚡</span>
                <span>Meter: ${reading.meterNo}</span>
              </div>
              <div class="flex items-center">
                <span class="text-green-600 dark:text-green-400 mr-1">📍</span>
                <span>${reading.district}, ${reading.region}</span>
              </div>
              <div class="flex items-center">
                <span class="text-orange-600 dark:text-orange-400 mr-1">👤</span>
                <span>${reading.technician}</span>
              </div>
              <div class="flex items-center mt-1">
                <span class="text-xs px-2 py-1 rounded ${
                  reading.anomaly && reading.anomaly.trim().toLowerCase() === 'meter is ok'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : reading.status === 'completed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : reading.status === 'anomaly' || reading.anomaly
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                }">${reading.anomaly ? reading.anomaly : reading.status}</span>
              </div>
              <div class="bg-blue-50 dark:bg-blue-900/50 p-1 rounded text-center mt-1">
                <span class="font-bold text-blue-600 dark:text-blue-400">${reading.reading} kWh</span>
              </div>
            </div>
          </div>
        `;

        marker.addListener('click', () => {
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
      }
    });

    markersRef.current = newMarkers;

    // Only fit bounds on first load or when new markers are added
    if (newMarkers.length > 0 && isFirstLoad) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        const position = marker.getPosition();
        if (position) {
          bounds.extend(position);
        }
      });
      map.fitBounds(bounds);
    }
  }, [map, filteredReadings, infoWindow, isFirstLoad]);

  // Set default region/district for technician, district_manager, and regional_manager
  useEffect(() => {
    if (user) {
      if (user.role === 'technician' || user.role === 'district_manager' || user.role === 'regional_manager') {
        if (user.region) setSelectedRegion(user.region);
        if ((user.role === 'technician' || user.role === 'district_manager') && user.district) setSelectedDistrict(user.district);
      } else {
        setSelectedRegion('all');
        setSelectedDistrict('all');
      }
    }
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
            {/* Filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Filters</CardTitle>
                  <button
                    className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition"
                    onClick={() => {
                      setSelectedDate('all');
                      setSelectedRegion('all');
                      setSelectedDistrict('all');
                      setSelectedAnomaly('all');
                    }}
                    type="button"
                  >
                    Reset Filters
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <input
                      type="date"
                      className="w-full border rounded px-2 py-1"
                      value={selectedDate === 'all' ? '' : selectedDate}
                      onChange={e => setSelectedDate(e.target.value || 'all')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Region</label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion} disabled={regionDisabled}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Regions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        {regions.map(region => (
                          <SelectItem key={region} value={region}>{region}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">District</label>
                    <Select value={selectedDistrict} onValueChange={setSelectedDistrict} disabled={districtDisabled}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Districts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Districts</SelectItem>
                        {districts.map(district => (
                          <SelectItem key={district.name} value={district.name}>{district.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Anomaly Type</label>
                    <Select value={selectedAnomaly} onValueChange={setSelectedAnomaly}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {loadingAnomalies ? (
                          <div className="px-3 py-2 text-gray-500">Loading...</div>
                        ) : anomalyOptions.length === 0 ? (
                          <div className="px-3 py-2 text-gray-500">No anomalies found</div>
                        ) : anomalyOptions.map(anomaly => (
                          <SelectItem key={anomaly} value={anomaly}>{anomaly}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                </div>
              </CardContent>
            </Card>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Meters</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredReadings.length}</div>
                  <p className="text-xs text-muted-foreground">With GPS coordinates</p>
                </CardContent>
              </Card>

              <Card className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <Zap className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {filteredReadings.filter(r => r.status.toLowerCase() === 'completed').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Successfully read</p>
                </CardContent>
              </Card>

              <Card className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
                  <Zap className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {filteredReadings.filter(r => (r.status?.toLowerCase() === 'anomaly' || r.anomaly) && !(r.anomaly && r.anomaly.trim().toLowerCase() === 'meter is ok')).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Need attention</p>
                </CardContent>
              </Card>

              <Card className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Meter is OK</CardTitle>
                  <Zap className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {filteredReadings.filter(r => r.anomaly && r.anomaly.trim().toLowerCase() === 'meter is ok').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Meters confirmed OK</p>
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
                <div ref={mapRef} className="w-full h-[600px] rounded-lg" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MapView;
