import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { MapPin, Camera, Save, Loader2, X } from 'lucide-react';

interface MeterReading {
  id: string;
  dateTime: string;
  customerAccess: 'yes' | 'no';
  meterNo: string;
  region: string;
  district: string;
  gpsLocation: string;
  customerName: string;
  customerContact: string;
  spn: string;
  accountNumber: string;
  geoCode: string;
  tariffClass: 'residential' | 'commercial';
  activities: 'residential' | 'factory' | 'church' | 'school' | 'shop';
  phase: '1ph' | '3ph';
  reading: number;
  creditBalance: number;
  anomaly?: string;
  areaLocation: string;
  transformerNo: string;
  remarks: string;
  photos: string[];
  technician: string;
  status: 'pending' | 'completed';
}

const MeterReadingForm = () => {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState<Partial<MeterReading>>({
    dateTime: new Date().toISOString().slice(0, 16),
    customerAccess: 'yes',
    region: user?.region || '',
    district: user?.district || '',
    tariffClass: 'residential',
    activities: 'residential',
    phase: '1ph',
    technician: user?.name || '',
    status: 'pending',
    photos: []
  });

  const regions = [
    'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 
    'Volta', 'Northern', 'Upper East', 'Upper West', 'Brong Ahafo',
    'Western North', 'Ahafo', 'Bono East', 'Oti', 'North East', 'Savannah'
  ];

  const anomalyOptions = [
    'burnt meter', 'blank screen', 'faulty card', 'faulty meter', 'tampered meter', 
    'meter not accessible', 'wrong meter number', 'customer not available'
  ];

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            gpsLocation: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          }));
          setIsGettingLocation(false);
          toast({
            title: "Location Captured",
            description: "GPS coordinates have been added to the form.",
          });
        },
        (error) => {
          console.error('Location error:', error);
          setIsGettingLocation(false);
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please enter manually.",
            variant: "destructive",
          });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setIsGettingLocation(false);
      toast({
        title: "Location Not Available",
        description: "Geolocation is not supported by this device.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.multiple = true;
    
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        const promises = files.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        });

        Promise.all(promises).then(newPhotos => {
          setFormData(prev => ({
            ...prev,
            photos: [...(prev.photos || []), ...newPhotos]
          }));
          toast({
            title: "Photos Captured",
            description: `${files.length} photo(s) added successfully.`,
          });
        });
      }
    };
    
    input.click();
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      const required = ['meterNo', 'customerName', 'reading', 'gpsLocation'];
      const missing = required.filter(field => !formData[field as keyof MeterReading]);
      
      if (missing.length > 0) {
        throw new Error(`Please fill in: ${missing.join(', ')}`);
      }

      const reading: MeterReading = {
        ...formData,
        id: Date.now().toString(),
        dateTime: formData.dateTime || new Date().toISOString(),
        reading: Number(formData.reading),
        creditBalance: Number(formData.creditBalance) || 0,
        photos: formData.photos || []
      } as MeterReading;

      // Save to appropriate storage based on online status
      const storageKey = isOnline ? 'meter-readings' : 'pending-meter-readings';
      const existingReadings = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existingReadings.push(reading);
      localStorage.setItem(storageKey, JSON.stringify(existingReadings));

      toast({
        title: "Reading Saved",
        description: isOnline 
          ? "Meter reading has been saved successfully." 
          : "Reading saved offline. Will sync when connection is restored.",
      });

      // Reset form
      setFormData({
        dateTime: new Date().toISOString().slice(0, 16),
        customerAccess: 'yes',
        region: user?.region || '',
        district: user?.district || '',
        tariffClass: 'residential',
        activities: 'residential',
        phase: '1ph',
        technician: user?.name || '',
        status: 'pending',
        photos: []
      });

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save reading",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      
      <div className="flex">
        <Navigation />
        
        <main className="flex-1 p-4 pb-20 sm:pb-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>New Meter Reading</CardTitle>
                <CardDescription>
                  Capture electricity meter reading details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  
                  {/* Date and Time */}
                  <div className="space-y-2">
                    <Label htmlFor="dateTime">Date and Time</Label>
                    <Input
                      id="dateTime"
                      type="datetime-local"
                      value={formData.dateTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateTime: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Customer Access */}
                  <div className="space-y-3">
                    <Label>Customer Access</Label>
                    <RadioGroup
                      value={formData.customerAccess}
                      onValueChange={(value: 'yes' | 'no') => 
                        setFormData(prev => ({ ...prev, customerAccess: value }))
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="access-yes" />
                        <Label htmlFor="access-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="access-no" />
                        <Label htmlFor="access-no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Meter Number */}
                  <div className="space-y-2">
                    <Label htmlFor="meterNo">Meter Number *</Label>
                    <Input
                      id="meterNo"
                      value={formData.meterNo || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, meterNo: e.target.value }))}
                      placeholder="Enter meter number"
                      required
                    />
                  </div>

                  {/* Region and District */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="region">Region</Label>
                      <Select
                        value={formData.region}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {regions.map(region => (
                            <SelectItem key={region} value={region}>{region}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="district">District</Label>
                      <Input
                        id="district"
                        value={formData.district || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                        placeholder="Enter district"
                      />
                    </div>
                  </div>

                  {/* GPS Location */}
                  <div className="space-y-2">
                    <Label htmlFor="gpsLocation">GPS Location *</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="gpsLocation"
                        value={formData.gpsLocation || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, gpsLocation: e.target.value }))}
                        placeholder="Latitude, Longitude"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={getCurrentLocation}
                        disabled={isGettingLocation}
                      >
                        {isGettingLocation ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Customer Name *</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                        placeholder="Enter customer name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerContact">Customer Contact</Label>
                      <Input
                        id="customerContact"
                        value={formData.customerContact || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerContact: e.target.value }))}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>

                  {/* SPN and Account Number */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="spn">SPN</Label>
                      <Input
                        id="spn"
                        value={formData.spn || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, spn: e.target.value }))}
                        placeholder="Service Point Number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={formData.accountNumber || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="Customer account number"
                      />
                    </div>
                  </div>

                  {/* GEO-CODE */}
                  <div className="space-y-2">
                    <Label htmlFor="geoCode">GEO-CODE</Label>
                    <Input
                      id="geoCode"
                      value={formData.geoCode || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, geoCode: e.target.value }))}
                      placeholder="Geographic code"
                    />
                  </div>

                  {/* Tariff Class and Activities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tariff Class</Label>
                      <Select
                        value={formData.tariffClass}
                        onValueChange={(value: 'residential' | 'commercial') => 
                          setFormData(prev => ({ ...prev, tariffClass: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residential">Residential</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Activities</Label>
                      <Select
                        value={formData.activities}
                        onValueChange={(value: any) => setFormData(prev => ({ ...prev, activities: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residential">Residential</SelectItem>
                          <SelectItem value="factory">Factory</SelectItem>
                          <SelectItem value="church">Church</SelectItem>
                          <SelectItem value="school">School</SelectItem>
                          <SelectItem value="shop">Shop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Phase */}
                  <div className="space-y-3">
                    <Label>Phase</Label>
                    <RadioGroup
                      value={formData.phase}
                      onValueChange={(value: '1ph' | '3ph') => 
                        setFormData(prev => ({ ...prev, phase: value }))
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1ph" id="phase-1" />
                        <Label htmlFor="phase-1">1 Phase</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="3ph" id="phase-3" />
                        <Label htmlFor="phase-3">3 Phase</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Reading and Credit Balance */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reading">Reading (kWh) *</Label>
                      <Input
                        id="reading"
                        type="number"
                        value={formData.reading || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, reading: Number(e.target.value) }))}
                        placeholder="Enter meter reading"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="creditBalance">Credit Balance</Label>
                      <Input
                        id="creditBalance"
                        type="number"
                        step="0.01"
                        value={formData.creditBalance || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, creditBalance: Number(e.target.value) }))}
                        placeholder="Credit balance"
                      />
                    </div>
                  </div>

                  {/* Anomaly */}
                  <div className="space-y-2">
                    <Label>Anomaly (if any)</Label>
                    <Select
                      value={formData.anomaly}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, anomaly: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select anomaly if detected" />
                      </SelectTrigger>
                      <SelectContent>
                        {anomalyOptions.map(anomaly => (
                          <SelectItem key={anomaly} value={anomaly}>{anomaly}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Area Location and Transformer */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="areaLocation">Area Location</Label>
                      <Input
                        id="areaLocation"
                        value={formData.areaLocation || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, areaLocation: e.target.value }))}
                        placeholder="Area or street name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transformerNo">Transformer Number</Label>
                      <Input
                        id="transformerNo"
                        value={formData.transformerNo || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, transformerNo: e.target.value }))}
                        placeholder="Transformer number"
                      />
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-2">
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea
                      id="remarks"
                      value={formData.remarks || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Additional notes or comments"
                      rows={3}
                    />
                  </div>

                  {/* Multiple Photos */}
                  <div className="space-y-2">
                    <Label>Meter Photos</Label>
                    <div className="flex items-center space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={capturePhoto}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Capture Photos
                      </Button>
                      {formData.photos && formData.photos.length > 0 && (
                        <span className="text-sm text-green-600">
                          {formData.photos.length} photo(s) captured ✓
                        </span>
                      )}
                    </div>
                    {formData.photos && formData.photos.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                        {formData.photos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img 
                              src={photo} 
                              alt={`Meter photo ${index + 1}`} 
                              className="w-full h-24 object-cover rounded border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                              onClick={() => removePhoto(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-yellow-600 hover:from-green-700 hover:to-yellow-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Reading
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MeterReadingForm;
