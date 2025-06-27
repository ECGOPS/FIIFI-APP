import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import { useAuth, User, UserRole } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getRegionsByType, getDistrictsByRegion } from '@/lib/data/regions';
import Papa from 'papaparse';

const UserManagement = () => {
  const { users, addUser, updateUser, deleteUser, fetchUsers } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    staffId: '',
    name: '',
    email: '',
    role: 'technician' as UserRole,
    region: '',
    district: ''
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Poll for user updates every 10 seconds
    const intervalId = setInterval(() => {
      fetchUsers();
    }, 10000);
    return () => clearInterval(intervalId);
  }, [fetchUsers]);

  const regions = getRegionsByType();
  const districts = formData.region ? getDistrictsByRegion(formData.region) : [];

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addUser({ ...formData, uid: '' });
      setFormData({ staffId: '', name: '', email: '', role: 'technician', region: '', district: '' });
      setIsAddDialogOpen(false);
      toast({
        title: "User Added",
        description: "New user has been successfully added.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      try {
        await updateUser(editingUser.id, formData);
        setIsEditDialogOpen(false);
        setEditingUser(null);
        toast({
          title: "User Updated",
          description: "User has been successfully updated.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update user. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteUser = async (id: string) => {
    console.log('[handleDeleteUser] Deleting user with id:', id);
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id);
        toast({
          title: "User Deleted",
          description: "User has been successfully deleted.",
          variant: "destructive",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete user. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      staffId: user.staffId || '',
      name: user.name,
      email: user.email,
      role: user.role,
      region: user.region || '',
      district: user.district || ''
    });
    setIsEditDialogOpen(true);
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'global_manager': return 'bg-red-100 text-red-800';
      case 'regional_manager': return 'bg-blue-100 text-blue-800';
      case 'district_manager': return 'bg-green-100 text-green-800';
      case 'technician': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRegionChange = (region: string) => {
    setFormData(prev => ({
      ...prev,
      region,
      district: '' // Reset district when region changes
    }));
  };

  // CSV Upload Handlers
  const handleDownloadSample = () => {
    const sample = [
      ['staffId', 'name', 'email', 'role', 'region', 'district'],
      ['STF001', 'John Doe', 'john@example.com', 'technician', 'Greater Accra', 'Accra Metro'],
      ['STF002', 'Jane Admin', 'jane@example.com', 'admin', '', ''],
    ];
    const csvContent = sample.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-upload-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let successCount = 0;
        let failCount = 0;
        for (const row of results.data as any[]) {
          try {
            await addUser({
              staffId: row.staffId,
              name: row.name,
              email: row.email,
              role: row.role,
              region: row.region || '',
              district: row.district || '',
              uid: ''
            });
            successCount++;
          } catch (err) {
            failCount++;
          }
        }
        toast({
          title: 'Upload Complete',
          description: `${successCount} users added, ${failCount} failed.`,
          variant: failCount > 0 ? 'destructive' : undefined,
        });
      },
      error: () => {
        toast({
          title: 'Upload Error',
          description: 'Failed to parse CSV file.',
          variant: 'destructive',
        });
      }
    });
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const q = search.toLowerCase();
    return (
      user.staffId?.toLowerCase().includes(q) ||
      user.name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.district?.toLowerCase().includes(q) ||
      user.region?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Navigation />
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 pb-20 sm:pb-4">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold">User Management</h2>
                <p className="text-xs sm:text-base text-gray-600 dark:text-gray-300">Manage system users and their roles</p>
              </div>
              <div className="flex flex-wrap flex-row gap-2 items-center w-full sm:w-auto">
                <Input
                  type="text"
                  placeholder="Search by Staff ID, Name, Email, District, or Region"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full sm:w-64"
                />
                <Button variant="outline" onClick={handleDownloadSample} type="button" className="w-full sm:w-auto">
                  Download Sample CSV
                </Button>
                <Input type="file" accept=".csv" onChange={handleFileUpload} className="w-full sm:w-auto" />
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-green-600 to-yellow-600 w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-full max-w-md mx-auto">
                    <DialogHeader>
                      <DialogTitle className="text-lg">Add New User</DialogTitle>
                      <DialogDescription className="text-sm">Create a new user account</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                        <Label htmlFor="staffId" className="text-sm">Staff ID</Label>
                        <Input
                          id="staffId"
                          value={formData.staffId}
                          onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name" className="text-sm">Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-sm">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="role" className="text-sm">Role</Label>
                        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technician">Technician</SelectItem>
                            <SelectItem value="district_manager">District Manager</SelectItem>
                            <SelectItem value="regional_manager">Regional Manager</SelectItem>
                            <SelectItem value="global_manager">Global Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(formData.role === 'technician' || formData.role === 'district_manager' || formData.role === 'regional_manager') && (
                        <div>
                          <Label htmlFor="region" className="text-sm">Region</Label>
                          <Select value={formData.region} onValueChange={handleRegionChange}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select a region" />
                            </SelectTrigger>
                            <SelectContent>
                              {regions.map(region => (
                                <SelectItem key={region} value={region}>
                                  {region}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {(formData.role === 'technician' || formData.role === 'district_manager') && formData.region && (
                        <div>
                          <Label htmlFor="district" className="text-sm">District</Label>
                          <Select value={formData.district} onValueChange={(value) => setFormData({ ...formData, district: value })}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select a district" />
                            </SelectTrigger>
                            <SelectContent>
                              {districts.map(district => (
                                <SelectItem key={district.name} value={district.name}>
                                  {district.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <Button type="submit" className="w-full">Add User</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <Card>
              <CardHeader className="p-2 sm:p-6">
                <CardTitle className="text-base sm:text-lg sm:text-xl">Users</CardTitle>
                <CardDescription className="text-xs sm:text-sm">All registered users in the system</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <div className="overflow-x-auto w-full">
                  <Table className="min-w-[600px] w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Staff ID</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Email</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Role</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">District/Region</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="text-xs sm:text-sm">{user.staffId}</TableCell>
                          <TableCell className="font-medium text-xs sm:text-sm">{user.name}</TableCell>
                          <TableCell className="text-xs sm:text-sm">{user.email}</TableCell>
                          <TableCell>
                            <Badge className={`${getRoleColor(user.role)} text-xs`}>
                              {user.role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {user.district ? `${user.district}, ${user.region}` : user.region || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1 sm:space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(user)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user.uid || user.id)}
                                className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit User</DialogTitle>
            <DialogDescription className="text-sm">Update user information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div>
              <Label htmlFor="edit-staffId" className="text-sm">Staff ID</Label>
              <Input
                id="edit-staffId"
                value={formData.staffId}
                onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-name" className="text-sm">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-email" className="text-sm">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-role" className="text-sm">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="district_manager">District Manager</SelectItem>
                  <SelectItem value="regional_manager">Regional Manager</SelectItem>
                  <SelectItem value="global_manager">Global Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(formData.role === 'technician' || formData.role === 'district_manager' || formData.role === 'regional_manager') && (
              <div>
                <Label htmlFor="edit-region" className="text-sm">Region</Label>
                <Select value={formData.region} onValueChange={handleRegionChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map(region => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(formData.role === 'technician' || formData.role === 'district_manager') && formData.region && (
              <div>
                <Label htmlFor="edit-district" className="text-sm">District</Label>
                <Select value={formData.district} onValueChange={(value) => setFormData({ ...formData, district: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a district" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map(district => (
                      <SelectItem key={district.name} value={district.name}>
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full">Update User</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
