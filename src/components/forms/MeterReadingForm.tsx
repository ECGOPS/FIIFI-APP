import { useState, useEffect, useMemo } from 'react';
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
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Camera, Save, Loader2, X } from 'lucide-react';
import { getRegionsByType, getDistrictsByRegion, isSubtransmissionRegion } from '@/lib/data/regions';
import { MeterReading, addMeterReading, updateMeterReading } from '@/lib/firebase/meter-readings';
import { useGeolocation } from '@/hooks/use-geolocation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import imageCompression from 'browser-image-compression';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const MeterReadingForm = () => {
  const { user } = useAuth();
  const { isOnline, setIsOnline } = useOffline();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState<number[]>([]);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  
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

  const regions = getRegionsByType();
  const districts = formData.region ? getDistrictsByRegion(formData.region) : [];

  // Dynamic activities and anomalies
  const [activities, setActivities] = useState<string[]>([]);
  const [anomalies, setAnomalies] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Disable region select for technician, district_manager, and regional_manager
  const regionDisabled = user && (user.role === 'technician' || user.role === 'district_manager' || user.role === 'regional_manager');
  // Disable district select for technician and district_manager only
  const districtDisabled = user && (user.role === 'technician' || user.role === 'district_manager');

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      const activitiesSnap = await getDocs(collection(db, 'activities'));
      setActivities(activitiesSnap.docs.map(doc => doc.data().name));
      const anomaliesSnap = await getDocs(collection(db, 'anomalies'));
      setAnomalies(anomaliesSnap.docs.map(doc => doc.data().name));
      setLoadingOptions(false);
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check if we're in edit mode and populate form data
  useEffect(() => {
    if (location.state?.editData) {
      const editData = location.state.editData;
      setIsEditMode(true);
      setFormData({
        ...editData,
        dateTime: editData.dateTime ? new Date(editData.dateTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        photos: editData.photos || []
      });
    }
  }, [location.state]);

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
    
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        // Show previews immediately
        const previewUrls = files.map(file => URL.createObjectURL(file));
        setFormData(prev => ({
          ...prev,
          photos: [...(prev.photos || []), ...previewUrls]
        }));
        // Mark these indexes as uploading
        const startIdx = (formData.photos?.length || 0);
        const newUploading = files.map((_, i) => startIdx + i);
        setUploadingPhotos(prev => [...prev, ...newUploading]);
        // Start background upload
        const storage = getStorage();
        files.forEach(async (file, i) => {
          try {
            const compressedFile = await imageCompression(file, {
              maxWidthOrHeight: 800,
              maxSizeMB: 1,
              initialQuality: 0.8,
              useWebWorker: true,
            });
            const fileName = `meter-photos/${Date.now()}-${Math.floor(Math.random()*1e6)}-${file.name}`;
            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, compressedFile);
            const url = await getDownloadURL(storageRef);
            // Replace preview with real URL
            setFormData(prev => {
              const updated = [...(prev.photos || [])];
              updated[startIdx + i] = url;
              return { ...prev, photos: updated };
            });
          } catch (err) {
            toast({
              title: "Photo Upload Error",
              description: "Failed to upload a photo.",
              variant: "destructive",
            });
            // Remove the preview if upload fails
            setFormData(prev => {
              const updated = [...(prev.photos || [])];
              updated.splice(startIdx + i, 1);
              return { ...prev, photos: updated };
            });
          } finally {
            setUploadingPhotos(prev => prev.filter(idx => idx !== (startIdx + i)));
          }
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

  const handleRegionChange = (region: string) => {
    setFormData(prev => ({
      ...prev,
      region,
      district: '' // Reset district when region changes
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let offline = false;

    try {
      // Validate required fields
      if (
        !formData.customerName ||
        !formData.meterNo ||
        !formData.reading ||
        !formData.dateTime
      ) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // If anomaly is selected, ensure status is set to 'anomaly'
      if (formData.anomaly) {
        formData.status = 'anomaly';
      }

      // Construct a complete MeterReading object (except id)
      const readingToSave = {
        dateTime: formData.dateTime,
        customerAccess: formData.customerAccess || 'yes',
        region: formData.region || '',
        district: formData.district || '',
        tariffClass: formData.tariffClass || 'residential',
        activities: formData.activities || 'residential',
        phase: formData.phase || '1ph',
        technician: formData.technician || user?.name || '',
        status: formData.status || 'pending',
        photos: formData.photos || [],
        gpsLocation: formData.gpsLocation || '',
        customerName: formData.customerName,
        meterNo: formData.meterNo,
        reading: formData.reading,
        customerContact: formData.customerContact || '',
        spn: formData.spn || '',
        accountNumber: formData.accountNumber || '',
        geoCode: formData.geoCode || '',
        creditBalance: formData.creditBalance || 0,
        anomaly: formData.anomaly || '',
        areaLocation: formData.areaLocation || '',
        transformerNo: formData.transformerNo || '',
        remarks: formData.remarks || '',
      };

      if (isEditMode && formData.id) {
        await updateMeterReading(formData.id, readingToSave);
        if (!navigator.onLine) {
          toast({
            title: "Saved Offline",
            description: "You are offline. The reading will be synced when you're back online. Go to Dashboard manually.",
            variant: "default"
          });
        } else {
          toast({
            title: "Reading Updated",
            description: "Meter reading has been successfully updated.",
          });
          setTimeout(() => {
            navigate('/dashboard');
          }, 400);
        }
      } else {
        await addMeterReading(readingToSave);
        if (!navigator.onLine) {
          toast({
            title: "Saved Offline",
            description: "You are offline. The reading will be synced when you're back online. Go to Dashboard manually.",
            variant: "default"
          });
        } else {
          toast({
            title: "Reading Added",
            description: "New meter reading has been successfully added.",
          });
          setTimeout(() => {
            navigate('/dashboard');
          }, 400);
        }
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      if (!navigator.onLine) {
        offline = true;
        console.log('Offline error caught');
        toast({
          title: "Saved Offline",
          description: "You are offline. The reading will be synced when you're back online. Go to Dashboard manually.",
          variant: "default"
        });
        setIsSubmitting(false);
        // Do NOT auto-navigate, let the user click dashboard manually
        return;
      } else {
        toast({
          title: "Error",
          description: "Failed to save the reading. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
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
                <CardTitle>{isEditMode ? 'Edit Meter Reading' : 'New Meter Reading'}</CardTitle>
                <CardDescription>
                  {isEditMode ? 'Update meter reading details' : 'Capture electricity meter reading details'}
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
                        onValueChange={handleRegionChange}
                        disabled={regionDisabled}
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
                    {formData.region && (
                      <div className="space-y-2">
                        <Label htmlFor="district">District</Label>
                        <Select
                          value={formData.district}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, district: value }))}
                          disabled={districtDisabled}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select district" />
                          </SelectTrigger>
                          <SelectContent>
                            {districts.map(district => (
                              <SelectItem key={district.name} value={district.name}>{district.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                          {!isOnline && activities.length === 0 && (
                            <div className="bg-yellow-100 text-yellow-800 p-2 rounded mb-2 text-sm">
                              Activity options are not available offline until loaded at least once online.
                            </div>
                          )}
                          {loadingOptions ? (
                            <div className="px-3 py-2 text-gray-500">Loading...</div>
                          ) : activities.length === 0 ? (
                            <div className="px-3 py-2 text-gray-500">No activities found</div>
                          ) : activities.map(activity => (
                            <SelectItem key={activity} value={activity}>{activity}</SelectItem>
                          ))}
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
                      onValueChange={(value) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          anomaly: value,
                          status: value ? 'anomaly' : 'pending' // Set status to anomaly when an anomaly is selected
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select anomaly if detected" />
                      </SelectTrigger>
                      <SelectContent>
                        {!isOnline && anomalies.length === 0 && (
                          <div className="bg-yellow-100 text-yellow-800 p-2 rounded mb-2 text-sm">
                            Anomaly options are not available offline until loaded at least once online.
                          </div>
                        )}
                        {loadingOptions ? (
                          <div className="px-3 py-2 text-gray-500">Loading...</div>
                        ) : anomalies.length === 0 ? (
                          <div className="px-3 py-2 text-gray-500">No anomalies found</div>
                        ) : anomalies.map(anomaly => (
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
                        disabled={isProcessingPhoto}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {isProcessingPhoto ? 'Processing…' : 'Capture Photos'}
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
                              className="w-full h-24 object-cover rounded border cursor-pointer"
                              onClick={() => setEnlargedPhoto(photo)}
                            />
                            {uploadingPhotos.includes(index) && (
                              <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded">
                                <Loader2 className="h-6 w-6 animate-spin text-yellow-600" />
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                              onClick={() => removePhoto(index)}
                              disabled={uploadingPhotos.includes(index)}
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
                    disabled={isSubmitting || uploadingPhotos.length > 0}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isEditMode ? 'Update Reading' : 'Save Reading'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Enlarged Photo Modal */}
      {enlargedPhoto && (
        <Dialog open={!!enlargedPhoto} onOpenChange={() => setEnlargedPhoto(null)}>
          <DialogContent className="max-w-lg p-0 bg-transparent shadow-none border-none flex flex-col items-center">
            <img src={enlargedPhoto} alt="Enlarged meter photo" className="max-w-full max-h-[80vh] rounded-lg" />
            <Button onClick={() => setEnlargedPhoto(null)} className="mt-4">Close</Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MeterReadingForm;
