import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import { toast } from '@/hooks/use-toast';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const AdminOptionsManager = () => {
  // Activities
  const [activities, setActivities] = useState<{ id: string; name: string }[]>([]);
  const [newActivity, setNewActivity] = useState('');
  const [editingActivity, setEditingActivity] = useState<{ id: string; name: string } | null>(null);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  // Anomalies
  const [anomalies, setAnomalies] = useState<{ id: string; name: string }[]>([]);
  const [newAnomaly, setNewAnomaly] = useState('');
  const [editingAnomaly, setEditingAnomaly] = useState<{ id: string; name: string } | null>(null);
  const [anomalyDialogOpen, setAnomalyDialogOpen] = useState(false);
  // Loading
  const [loading, setLoading] = useState(true);
  const [resettingAnomalies, setResettingAnomalies] = useState(false);

  // Fetch activities and anomalies
  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      const activitiesSnap = await getDocs(collection(db, 'activities'));
      setActivities(activitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      const anomaliesSnap = await getDocs(collection(db, 'anomalies'));
      setAnomalies(anomaliesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      setLoading(false);
    };
    fetchOptions();
  }, []);

  // CRUD for Activities
  const addActivity = async () => {
    if (!newActivity.trim()) return;
    await addDoc(collection(db, 'activities'), { name: newActivity.trim() });
    setNewActivity('');
    toast({ title: 'Activity added', description: 'Activity has been added successfully.' });
    const activitiesSnap = await getDocs(collection(db, 'activities'));
    setActivities(activitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
  };
  const updateActivity = async () => {
    if (!editingActivity) return;
    await updateDoc(doc(db, 'activities', editingActivity.id), { name: editingActivity.name });
    setEditingActivity(null);
    setActivityDialogOpen(false);
    toast({ title: 'Activity updated', description: 'Activity has been updated successfully.' });
    const activitiesSnap = await getDocs(collection(db, 'activities'));
    setActivities(activitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
  };
  const deleteActivity = async (id: string) => {
    await deleteDoc(doc(db, 'activities', id));
    setActivities(activities.filter(a => a.id !== id));
    toast({ title: 'Activity deleted', description: 'Activity has been deleted.' });
  };

  // CRUD for Anomalies
  const addAnomaly = async () => {
    if (!newAnomaly.trim()) return;
    await addDoc(collection(db, 'anomalies'), { name: newAnomaly.trim() });
    setNewAnomaly('');
    toast({ title: 'Anomaly added', description: 'Anomaly has been added successfully.' });
    const anomaliesSnap = await getDocs(collection(db, 'anomalies'));
    setAnomalies(anomaliesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
  };
  const updateAnomaly = async () => {
    if (!editingAnomaly) return;
    await updateDoc(doc(db, 'anomalies', editingAnomaly.id), { name: editingAnomaly.name });
    setEditingAnomaly(null);
    setAnomalyDialogOpen(false);
    toast({ title: 'Anomaly updated', description: 'Anomaly has been updated successfully.' });
    const anomaliesSnap = await getDocs(collection(db, 'anomalies'));
    setAnomalies(anomaliesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
  };
  const deleteAnomaly = async (id: string) => {
    await deleteDoc(doc(db, 'anomalies', id));
    setAnomalies(anomalies.filter(a => a.id !== id));
    toast({ title: 'Anomaly deleted', description: 'Anomaly has been deleted.' });
  };

  const officialAnomalies = [
    'BLANK SCREEN/FAULTY SCREEN',
    'BURNT METER',
    'DIRECT SERVICE CONNECTION',
    'ERROR MESSAGE DISPLAY',
    'FAULTY CARD',
    'FAULTY METER',
    'ILLEGAL CONNECTION',
    'NON-PURCHASING PREPAID METERS',
    'UNCAPTURED METER / CUSTOMER',
    'WRONG DATE & TIME',
    'WRONG TARIFF CLASS',
    'NON - REVISED TARIFF',
    'FOREIGN METER',
    'METER IS OK'
  ];

  const resetAnomalies = async () => {
    setResettingAnomalies(true);
    // Delete all existing anomalies
    const anomaliesSnap = await getDocs(collection(db, 'anomalies'));
    await Promise.all(anomaliesSnap.docs.map(docSnap => deleteDoc(doc(db, 'anomalies', docSnap.id))));
    // Double-check collection is empty
    const checkSnap = await getDocs(collection(db, 'anomalies'));
    if (checkSnap.empty) {
      // Add official anomalies (no duplicates)
      await Promise.all(officialAnomalies.map(async (name) => {
        // Check if already exists (should not, but for safety)
        const existsSnap = await getDocs(collection(db, 'anomalies'));
        if (!existsSnap.docs.some(doc => doc.data().name.toLowerCase() === name.toLowerCase())) {
          await addDoc(collection(db, 'anomalies'), { name });
        }
      }));
      toast({ title: 'Anomalies reset', description: 'Anomalies have been reset to the official list.' });
    } else {
      toast({ title: 'Error', description: 'Could not clear anomalies. Please try again.' });
    }
    // Refresh
    const newSnap = await getDocs(collection(db, 'anomalies'));
    setAnomalies(newSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    setResettingAnomalies(false);
  };

  const officialActivities = [
    'RESIDENTIAL',
    'FACTORY',
    'COLD STORE',
    'CHURCH',
    'SCHOOL',
    'SHOP',
    'EVENT/ENTERTAINMENT CENTER',
    'MOSQUE',
    'PUBLIC SERVICE'
  ];
  const [resettingActivities, setResettingActivities] = useState(false);

  const resetActivities = async () => {
    setResettingActivities(true);
    // Delete all existing activities
    const activitiesSnap = await getDocs(collection(db, 'activities'));
    await Promise.all(activitiesSnap.docs.map(docSnap => deleteDoc(doc(db, 'activities', docSnap.id))));
    // Double-check collection is empty
    const checkSnap = await getDocs(collection(db, 'activities'));
    if (checkSnap.empty) {
      // Add official activities (no duplicates)
      await Promise.all(officialActivities.map(async (name) => {
        const existsSnap = await getDocs(collection(db, 'activities'));
        if (!existsSnap.docs.some(doc => doc.data().name.toLowerCase() === name.toLowerCase())) {
          await addDoc(collection(db, 'activities'), { name });
        }
      }));
      toast({ title: 'Activities reset', description: 'Activities have been reset to the official list.' });
    } else {
      toast({ title: 'Error', description: 'Could not clear activities. Please try again.' });
    }
    // Refresh
    const newSnap = await getDocs(collection(db, 'activities'));
    setActivities(newSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    setResettingActivities(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 p-4 pb-20 sm:pb-4">
          <div className="max-w-3xl mx-auto space-y-10">
            {/* Activities Section */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Manage Activities</CardTitle>
                <CardDescription>
                  Add, edit, or remove activities for meter readings. These options will appear in the meter reading form.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-6">
                  <Input
                    value={newActivity}
                    onChange={e => setNewActivity(e.target.value)}
                    placeholder="Add new activity"
                  />
                  <Button onClick={addActivity} variant="default" className="flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
                <Button onClick={resetActivities} variant="outline" className="mb-4" disabled={resettingActivities}>
                  {resettingActivities ? <Loader2 className="h-4 w-4 animate-spin inline" /> : null} Reset to Official List
                </Button>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center text-gray-500 py-6">No activities found.</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full bg-white dark:bg-gray-900">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-200">Activity</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {activities.map(activity => (
                          <tr key={activity.id} className="even:bg-gray-50 dark:even:bg-gray-800">
                            <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{activity.name}</td>
                            <td className="px-4 py-2 flex gap-2">
                              <Button size="icon" variant="outline" onClick={() => { setEditingActivity(activity); setActivityDialogOpen(true); }} title="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="destructive" onClick={() => deleteActivity(activity.id)} title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Edit Activity Dialog */}
            <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Activity</DialogTitle>
                </DialogHeader>
                <Input
                  value={editingActivity?.name || ''}
                  onChange={e => setEditingActivity(editingActivity ? { ...editingActivity, name: e.target.value } : null)}
                  placeholder="Activity name"
                />
                <DialogFooter>
                  <Button onClick={updateActivity} disabled={!editingActivity?.name?.trim()}>Save</Button>
                  <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>Cancel</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* Anomalies Section */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Manage Anomalies</CardTitle>
                <CardDescription>
                  Add, edit, or remove anomalies for meter readings. These options will appear in the meter reading form.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-6">
                  <Input
                    value={newAnomaly}
                    onChange={e => setNewAnomaly(e.target.value)}
                    placeholder="Add new anomaly"
                  />
                  <Button onClick={addAnomaly} variant="default" className="flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
                <Button onClick={resetAnomalies} variant="outline" className="mb-4" disabled={resettingAnomalies}>
                  {resettingAnomalies ? <Loader2 className="h-4 w-4 animate-spin inline" /> : null} Reset to Official List
                </Button>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : anomalies.length === 0 ? (
                  <div className="text-center text-gray-500 py-6">No anomalies found.</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full bg-white dark:bg-gray-900">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-200">Anomaly</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {anomalies.map(anomaly => (
                          <tr key={anomaly.id} className="even:bg-gray-50 dark:even:bg-gray-800">
                            <td className={`px-4 py-2 ${anomaly.name.trim().toLowerCase() === 'meter is ok' ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-800 dark:text-gray-100'}`}>{anomaly.name}</td>
                            <td className="px-4 py-2 flex gap-2">
                              <Button size="icon" variant="outline" onClick={() => { setEditingAnomaly(anomaly); setAnomalyDialogOpen(true); }} title="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="destructive" onClick={() => deleteAnomaly(anomaly.id)} title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Edit Anomaly Dialog */}
            <Dialog open={anomalyDialogOpen} onOpenChange={setAnomalyDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Anomaly</DialogTitle>
                </DialogHeader>
                <Input
                  value={editingAnomaly?.name || ''}
                  onChange={e => setEditingAnomaly(editingAnomaly ? { ...editingAnomaly, name: e.target.value } : null)}
                  placeholder="Anomaly name"
                />
                <DialogFooter>
                  <Button onClick={updateAnomaly} disabled={!editingAnomaly?.name?.trim()}>Save</Button>
                  <Button variant="outline" onClick={() => setAnomalyDialogOpen(false)}>Cancel</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminOptionsManager; 