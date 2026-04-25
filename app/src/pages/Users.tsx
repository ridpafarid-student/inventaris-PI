// ============================================
// PAGE - Manajemen Pengguna (Admin Only)
// ============================================

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, User, Trash2, Shield, UserCircle } from 'lucide-react';
import type { UserData, UserRole } from '@/types';
import { getFirebaseAuthErrorMessage } from '@/lib/firebase-auth-errors';

export default function Users() {
  const { register, userData: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff' as UserRole
  });

  // Subscribe to users
  useEffect(() => {
    const q = query(collection(db, 'users'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList: UserData[] = [];
      snapshot.forEach((doc) => {
        usersList.push({ ...doc.data(), uid: doc.id } as UserData);
      });
      setUsers(usersList);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Filter users
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'staff'
    });
    setError('');
  };

  const getErrorMessage = (error: unknown) => getFirebaseAuthErrorMessage(error);

  // Handle register
  const handleRegister = async () => {
    setError('');
    setRegisterLoading(true);

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('Semua field wajib diisi');
      setRegisterLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      setRegisterLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok');
      setRegisterLoading(false);
      return;
    }

    try {
      await register(formData.email, formData.password, formData.name, formData.role);
      setIsDialogOpen(false);
      resetForm();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setRegisterLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (user: UserData) => {
    if (user.uid === currentUser?.uid) return;
    setDeleteError('');
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      setConfirmDeleteUserId(null);
    } catch {
      setDeleteError('Gagal menghapus user. Silakan coba lagi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
          <p className="text-gray-500">Kelola user dan hak akses</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Tambah User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            </DialogHeader>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Lengkap *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama user"
                />
              </div>

              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Role *</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 flex-1">
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={formData.role === 'admin'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    />
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Admin</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 flex-1">
                    <input
                      type="radio"
                      name="role"
                      value="staff"
                      checked={formData.role === 'staff'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    />
                    <UserCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Staff</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                />
              </div>

              <div className="space-y-2">
                <Label>Konfirmasi Password *</Label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Ulangi password"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleRegister} disabled={registerLoading}>
                {registerLoading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari pengguna..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="md:hidden divide-y">
            {loading ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center">
                <User className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">Tidak ada data pengguna</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.uid} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="font-semibold text-gray-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-sm text-gray-500 break-all">{user.email}</p>
                      </div>
                    </div>
                    <Badge
                      variant={user.role === 'admin' ? 'default' : 'secondary'}
                      className={user.role === 'admin' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100 shrink-0' : 'bg-blue-100 text-blue-700 hover:bg-blue-100 shrink-0'}
                    >
                      {user.role === 'admin' ? (
                        <Shield className="w-3 h-3 mr-1" />
                      ) : (
                        <UserCircle className="w-3 h-3 mr-1" />
                      )}
                      {user.role === 'admin' ? 'Administrator' : 'Staff'}
                    </Badge>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3 text-sm">
                    <p className="text-gray-500">Bergabung</p>
                    <p className="mt-1 font-medium text-gray-900">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>

                  {deleteError && confirmDeleteUserId === user.uid && (
                    <p className="text-xs text-red-600 font-medium">{deleteError}</p>
                  )}

                  {user.uid !== currentUser?.uid && (
                    confirmDeleteUserId === user.uid ? (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-2">
                        <p className="text-xs text-red-700 font-medium">⚠ Yakin hapus pengguna ini?</p>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleDelete(user)}
                          >
                            Ya, Hapus
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setConfirmDeleteUserId(null)}
                          >
                            Batal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full text-red-600 hover:text-red-700"
                        onClick={() => setConfirmDeleteUserId(user.uid)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Hapus Pengguna
                      </Button>
                    )
                  )}
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Bergabung</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <User className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">Tidak ada data pengguna</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="font-semibold text-gray-600">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                          className={user.role === 'admin' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}
                        >
                          {user.role === 'admin' ? (
                            <Shield className="w-3 h-3 mr-1" />
                          ) : (
                            <UserCircle className="w-3 h-3 mr-1" />
                          )}
                          {user.role === 'admin' ? 'Administrator' : 'Staff'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.uid !== currentUser?.uid && (
                          confirmDeleteUserId === user.uid ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => handleDelete(user)}
                              >
                                Hapus
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => setConfirmDeleteUserId(null)}
                              >
                                Batal
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setConfirmDeleteUserId(user.uid)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-purple-900">Administrator</h4>
                <ul className="text-sm text-purple-700 mt-1 space-y-1">
                  <li>• Akses semua fitur</li>
                  <li>• Kelola data barang</li>
                  <li>• Kelola pengguna</li>
                  <li>• Lihat laporan</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <UserCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">Staff</h4>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• Input stok masuk/keluar</li>
                  <li>• Lihat data barang</li>
                  <li>• Lihat riwayat transaksi</li>
                  <li>• Tidak bisa edit/hapus data</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
