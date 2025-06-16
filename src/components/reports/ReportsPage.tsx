
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
}

const ReportsPage = () => {
  const { user } = useAuth();
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [filteredReadings, setFilteredReadings] = useState<MeterReading[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  useEffect(() => {
    // Load and filter readings based on user role
    const loadReadings = () => {
      const allReadings = JSON.parse(localStorage.getItem('meter-readings') || '[]');
      const pendingReadings = JSON.parse(localStorage.getItem('pending-meter-readings') || '[]');
      const combinedReadings = [...allReadings, ...pendingReadings];

      let userReadings = combinedReadings;

      // Filter based on user role
      if (user?.role === 'district_manager') {
        userReadings = combinedReadings.filter(r => r.district === user.district);
      } else if (user?.role === 'regional_manager') {
        userReadings = combinedReadings.filter(r => r.region === user.region);
      }
      // Global manager sees all readings

      setReadings(userReadings);
      applyFilters(userReadings);
    };

    loadReadings();
  }, [user]);

  const applyFilters = (data: MeterReading[]) => {
    let filtered = [...data];

    // Period filter
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (selectedPeriod) {
      case 'today':
        cutoffDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
    }

    if (selectedPeriod !== 'all') {
      filtered = filtered.filter(r => new Date(r.dateTime) >= cutoffDate);
    }

    // Region filter
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(r => r.region === selectedRegion);
    }

    // District filter
    if (selectedDistrict !== 'all') {
      filtered = filtered.filter(r => r.district === selectedDistrict);
    }

    setFilteredReadings(filtered);
  };

  useEffect(() => {
    applyFilters(readings);
  }, [selectedPeriod, selectedRegion, selectedDistrict, readings]);

  // Analytics calculations
  const totalReadings = filteredReadings.length;
  const completedReadings = filteredReadings.filter(r => r.status === 'completed').length;
  const pendingReadings = filteredReadings.filter(r => r.status === 'pending').length;
  const anomalies = filteredReadings.filter(r => r.status === 'anomaly').length;
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

  const statusData = [
    { name: 'Completed', value: completedReadings, color: '#10B981' },
    { name: 'Pending', value: pendingReadings, color: '#F59E0B' },
    { name: 'Anomalies', value: anomalies, color: '#EF4444' }
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
    const tech = reading.technician;
    if (!acc[tech]) {
      acc[tech] = { name: tech, completed: 0, anomalies: 0, total: 0 };
    }
    acc[tech].total++;
    if (reading.status === 'completed') acc[tech].completed++;
    if (reading.status === 'anomaly') acc[tech].anomalies++;
    return acc;
  }, {} as Record<string, any>);

  const performanceData = Object.values(technicianPerformance);

  const exportReport = () => {
    const csvContent = [
      ['Date', 'Customer', 'Meter No', 'Reading', 'Status', 'Technician', 'Region', 'District'],
      ...filteredReadings.map(r => [
        new Date(r.dateTime).toLocaleDateString(),
        r.customerName,
        r.meterNo,
        r.reading,
        r.status,
        r.technician,
        r.region,
        r.district
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

  const regions = [...new Set(readings.map(r => r.region))];
  const districts = [...new Set(readings.map(r => r.district))];

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
                <CardTitle className="text-lg">Filters</CardTitle>
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
                  
                  {user?.role === 'global_manager' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Region</label>
                      <Select value={selectedRegion} onValueChange={setSelectedRegion}>
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
                  )}
                  
                  {(user?.role === 'global_manager' || user?.role === 'regional_manager') && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">District</label>
                      <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Districts</SelectItem>
                          {districts.map(district => (
                            <SelectItem key={district} value={district}>{district}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalReadings}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{completedReadings}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalReadings > 0 ? Math.round((completedReadings / totalReadings) * 100) : 0}% completion rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Calendar className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{pendingReadings}</div>
                </CardContent>
              </Card>

              <Card>
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

              <Card>
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
                        <Tooltip />
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
                        {regions.slice(0, 5).map(region => {
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
