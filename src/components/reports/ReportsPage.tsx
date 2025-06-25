import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  FileText, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  Calendar,
  MapPin,
  Download
} from 'lucide-react';
import { getRegionsByType, getDistrictsByRegion, isSubtransmissionRegion } from '@/lib/data/regions';
import { getMeterReadings } from '@/lib/firebase/meter-readings';

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
  tariffClass: 'residential' | 'commercial';
  activities: string;
  gpsLocation?: string;
}

// Custom tooltip component for technician performance chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-gray-100">{`Technician: ${data.name}`}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">{`Region: ${data.region}`}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">{`District: ${data.district}`}</p>
        <p className="text-sm text-red-600 dark:text-red-400">{`Anomalies: ${data.anomalies}`}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{`Total: ${data.total}`}</p>
      </div>
    );
  }
  return null;
};

const ReportsPage = () => {
  const { user } = useAuth();
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [filteredReadings, setFilteredReadings] = useState<MeterReading[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  const regions = getRegionsByType();
  const districts = selectedRegion !== 'all' ? getDistrictsByRegion(selectedRegion) : [];

  // Disable region select for technician, district_manager, and regional_manager
  const regionDisabled = user && (user.role === 'technician' || user.role === 'district_manager' || user.role === 'regional_manager');
  // Disable district select for technician and district_manager only
  const districtDisabled = user && (user.role === 'technician' || user.role === 'district_manager');

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

  useEffect(() => {
    const loadReadings = async () => {
      let userReadings = await getMeterReadings();
      // Filter based on user role
      if (user?.role === 'district_manager') {
        userReadings = userReadings.filter(r => r.district === user.district);
      } else if (user?.role === 'regional_manager') {
        userReadings = userReadings.filter(r => r.region === user.region);
      }
      // Global manager and admin see all readings
      setReadings(userReadings);
      applyFilters(userReadings);
    };
    loadReadings();
  }, [user]);

  const applyFilters = (data: MeterReading[]) => {
    let filtered = data;
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(r => r.region === selectedRegion);
    }
    if (selectedDistrict !== 'all') {
      filtered = filtered.filter(r => r.district === selectedDistrict);
    }
    setFilteredReadings(filtered);
  };

  useEffect(() => {
    applyFilters(readings);
    // eslint-disable-next-line
  }, [selectedRegion, selectedDistrict]);

  // Analytics calculations
  const totalReadings = filteredReadings.length;
  const completedReadings = filteredReadings.filter(r => r.status === 'completed').length;
  const pendingReadings = filteredReadings.filter(r => r.status === 'pending').length;
  const anomalies = filteredReadings.filter(r => 
    (r.status?.toLowerCase() === 'anomaly' || r.anomaly) &&
    !(r.anomaly && r.anomaly.trim().toLowerCase() === 'meter is ok')
  ).length;
  const uniqueTechnicians = new Set(filteredReadings.map(r => r.technician)).size;

  // Chart data
  const dailyReadings = filteredReadings.reduce((acc, reading) => {
    const date = new Date(reading.dateTime).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dailyData = Object.entries(dailyReadings).map(([date, count]) => ({
    date,
    readings: count
  })).slice(-7);

  // Build anomaly type distribution for the chart
  const meterIsOkCount = filteredReadings.filter(r => r.anomaly && r.anomaly.trim().toLowerCase() === 'meter is ok').length;
  const anomalyTypeCounts = filteredReadings.reduce((acc, r) => {
    if (r.anomaly && r.anomaly.trim() && r.anomaly.trim().toLowerCase() !== 'meter is ok') {
      acc[r.anomaly.trim()] = (acc[r.anomaly.trim()] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const anomalyColors = [
    '#EF4444', '#F59E0B', '#6366F1', '#E11D48', '#0EA5E9', '#A21CAF', '#F472B6', '#22D3EE', '#84CC16', '#FBBF24'
  ];
  const statusData = [
    ...Object.entries(anomalyTypeCounts).map(([type, count], i) => ({
      name: type,
      value: count,
      color: anomalyColors[i % anomalyColors.length]
    })),
    { name: 'Meter is OK', value: meterIsOkCount, color: '#22C55E' }
  ];

  const tariffData = filteredReadings.reduce((acc, reading) => {
    acc[reading.tariffClass] = (acc[reading.tariffClass] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tariffChartData = Object.entries(tariffData).map(([type, count]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    count
  }));

  const technicianPerformance = filteredReadings.reduce((acc, reading) => {
    if (!acc[reading.technician]) {
      acc[reading.technician] = {
        name: reading.technician,
        region: reading.region,
        district: reading.district,
        completed: 0,
        anomalies: 0,
        total: 0
      };
    }
    acc[reading.technician].total++;
    if (reading.status === 'completed') {
      acc[reading.technician].completed++;
    }
    if (reading.status === 'anomaly' || reading.anomaly) {
      acc[reading.technician].anomalies++;
    }
    return acc;
  }, {} as Record<string, { name: string; region: string; district: string; completed: number; anomalies: number; total: number }>);

  const performanceData = Object.values(technicianPerformance);

  const exportReport = () => {
    const csvContent = [
      ['Date', 'Region', 'District', 'Customer', 'Meter No', 'Reading', 'Anomaly Type', 'Technician', 'GPS'],
      ...filteredReadings.map(r => [
        new Date(r.dateTime).toLocaleDateString(),
        r.region,
        r.district,
        r.customerName,
        r.meterNo,
        r.reading,
        r.anomaly || '',
        r.technician,
        r.gpsLocation || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meter-readings-${selectedPeriod}-${Date.now()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Determine which regions to show in the Regional Summary based on user role
  const summaryRegions = (user && (user.role === 'technician' || user.role === 'district_manager' || user.role === 'regional_manager') && user.region)
    ? [user.region]
    : regions;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      
      <div className="flex">
        <Navigation />
        
        <main className="flex-1 p-4 pb-20 sm:pb-4">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-3xl font-bold">Reports & Analytics</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Meter reading performance insights
                </p>
              </div>
              <Button onClick={exportReport} className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Filters</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPeriod('week');
                      setSelectedRegion('all');
                      setSelectedDistrict('all');
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Period</label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last Month</SelectItem>
                        <SelectItem value="quarter">Last Quarter</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Region</label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion} disabled={regionDisabled}>
                      <SelectTrigger>
                        <SelectValue />
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
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Districts</SelectItem>
                        {districts.map(district => (
                          <SelectItem key={district.name} value={district.name}>{district.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalReadings}</div>
                </CardContent>
              </Card>

              {/* Removed Completed metric card */}

              <Card className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{anomalies}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalReadings > 0 ? Math.round((anomalies / totalReadings) * 100) : 0}% anomaly rate
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Meter is OK</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {filteredReadings.filter(r => r.anomaly && r.anomaly.trim().toLowerCase() === 'meter is ok').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Meters confirmed OK</p>
                </CardContent>
              </Card>

              <Card className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Technicians</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{uniqueTechnicians}</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Readings Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dailyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="readings" stroke="#10B981" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Tariff Class Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={tariffChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#F59E0B" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Technician Performance</CardTitle>
                    <CardDescription>
                      Performance metrics by technician
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="completed" fill="#10B981" name="Completed" />
                        <Bar dataKey="anomalies" fill="#EF4444" name="Anomalies" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analysis" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Anomalies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(
                          filteredReadings
                            .filter(r => r.anomaly)
                            .reduce((acc, r) => {
                              acc[r.anomaly!] = (acc[r.anomaly!] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                        )
                        .filter(([anomaly]) => anomaly.trim().toLowerCase() !== 'meter is ok')
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([anomaly, count]) => (
                          <div key={anomaly} className="flex justify-between items-center">
                            <span className="text-sm">{anomaly}</span>
                            <Badge variant="destructive">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Regional Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {summaryRegions.map(region => {
                          const regionReadings = filteredReadings.filter(r => r.region === region);
                          return (
                            <div key={region} className="flex justify-between items-center">
                              <span className="text-sm">{region}</span>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{regionReadings.length} readings</Badge>
                                <Badge className={
                                  regionReadings.filter(r => r.status === 'anomaly').length > 0 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }>
                                  {regionReadings.filter(r => r.status === 'anomaly').length} anomalies
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportsPage;
