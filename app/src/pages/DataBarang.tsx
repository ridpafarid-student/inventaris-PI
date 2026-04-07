// ============================================
// PAGE - Data Barang (CRUD)
// ============================================

import { useState } from 'react';
import { useBarang } from '@/hooks/useBarang';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react';
import type { Barang } from '@/types';

export default function DataBarang() {
  const {
    barangList,
    kategoriList,
    error: barangError,
    addBarang,
    updateBarang,
    deleteBarang,
    addKategori,
    deleteKategori
  } = useBarang();
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isKategoriDialogOpen, setIsKategoriDialogOpen] = useState(false);
  const [selectedBarang, setSelectedBarang] = useState<Barang | null>(null);
  const [error, setError] = useState('');
  const [kategoriError, setKategoriError] = useState('');
  const [kategoriForm, setKategoriForm] = useState({
    nama: '',
    deskripsi: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    kodeBarang: '',
    nama: '',
    kategoriId: '',
    stok: 0,
    stokMinimum: 5,
    hargaBeli: 0,
    hargaJual: 0,
    satuan: 'pcs',
    deskripsi: ''
  });

  // Filter barang
  const filteredBarang = barangList.filter(barang => {
    const matchesSearch = 
      barang.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      barang.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKategori = selectedKategori === 'all' || barang.kategoriId === selectedKategori;
    return matchesSearch && matchesKategori;
  });

  // Reset form
  const resetForm = () => {
    setSelectedBarang(null);
    setFormData({
      kodeBarang: '',
      nama: '',
      kategoriId: '',
      stok: 0,
      stokMinimum: 5,
      hargaBeli: 0,
      hargaJual: 0,
      satuan: 'pcs',
      deskripsi: ''
    });
    setError('');
  };

  const resetKategoriForm = () => {
    setKategoriForm({
      nama: '',
      deskripsi: ''
    });
    setKategoriError('');
  };

  // Handle add
  const handleAdd = async () => {
    setError('');
    
    if (!formData.kodeBarang || !formData.nama || !formData.kategoriId) {
      setError('Kode barang, nama, dan kategori wajib diisi');
      return;
    }

    const success = await addBarang(formData);
    if (success) {
      setIsAddDialogOpen(false);
      resetForm();
    } else {
      setError('Gagal menambahkan barang');
    }
  };

  // Handle edit
  const handleEdit = async () => {
    setError('');
    
    if (!selectedBarang) return;
    
    if (!formData.kodeBarang || !formData.nama || !formData.kategoriId) {
      setError('Kode barang, nama, dan kategori wajib diisi');
      return;
    }

    const success = await updateBarang(selectedBarang.id, formData);
    if (success) {
      setIsEditDialogOpen(false);
      setSelectedBarang(null);
      resetForm();
    } else {
      setError('Gagal mengupdate barang');
    }
  };

  // Handle delete
  const handleDelete = async (barang: Barang) => {
    if (confirm(`Yakin ingin menghapus ${barang.nama}?`)) {
      await deleteBarang(barang.id);
    }
  };

  // Open edit dialog
  const openEditDialog = (barang: Barang) => {
    setSelectedBarang(barang);
    setFormData({
      kodeBarang: barang.kodeBarang,
      nama: barang.nama,
      kategoriId: barang.kategoriId,
      stok: barang.stok,
      stokMinimum: barang.stokMinimum,
      hargaBeli: barang.hargaBeli,
      hargaJual: barang.hargaJual,
      satuan: barang.satuan,
      deskripsi: barang.deskripsi
    });
    setIsEditDialogOpen(true);
  };

  const handleAddKategori = async () => {
    setKategoriError('');

    if (!kategoriForm.nama.trim()) {
      setKategoriError('Nama kategori wajib diisi');
      return;
    }

    const success = await addKategori({
      nama: kategoriForm.nama.trim(),
      deskripsi: kategoriForm.deskripsi.trim()
    });

    if (success) {
      setIsKategoriDialogOpen(false);
      resetKategoriForm();
    } else {
      setKategoriError('Gagal menambahkan kategori');
    }
  };

  const handleDeleteKategori = async (id: string, nama: string) => {
    if (confirm(`Yakin ingin menghapus kategori ${nama}?`)) {
      const success = await deleteKategori(id);
      if (!success) {
        setKategoriError('Kategori gagal dihapus. Pastikan kategori tidak sedang digunakan.');
      }
    }
  };

  // Format currency
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const parseNumberInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly ? parseInt(digitsOnly, 10) : 0;
  };

  // Render form fields without remounting the whole form on each keystroke
  const renderFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Kode Barang *</Label>
          <Input
            value={formData.kodeBarang}
            onChange={(e) => setFormData({ ...formData, kodeBarang: e.target.value })}
            placeholder="BRG-001"
          />
        </div>
        <div className="space-y-2">
          <Label>Kategori *</Label>
          <Select
            value={formData.kategoriId}
            onValueChange={(value) => setFormData({ ...formData, kategoriId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {kategoriList.length === 0 ? (
                <div className="px-2 py-2 text-sm text-gray-500">
                  Belum ada kategori
                </div>
              ) : (
                kategoriList.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {kategoriList.length === 0 && (
            <p className="text-xs text-amber-600">
              Tambahkan kategori terlebih dahulu agar barang bisa dipilih kategorinya.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Nama Barang *</Label>
        <Input
          value={formData.nama}
          onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
          placeholder="Nama barang"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Stok Awal</Label>
          <Input
            type="number"
            value={formData.stok}
            onChange={(e) => setFormData({ ...formData, stok: parseInt(e.target.value) || 0 })}
            disabled={selectedBarang !== null}
          />
        </div>
        <div className="space-y-2">
          <Label>Stok Minimum *</Label>
          <Input
            type="number"
            value={formData.stokMinimum}
            onChange={(e) => setFormData({ ...formData, stokMinimum: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Satuan</Label>
          <Input
            value={formData.satuan}
            onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
            placeholder="pcs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Harga Beli (Rp)</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={formData.hargaBeli === 0 ? '' : String(formData.hargaBeli)}
            onChange={(e) => setFormData({ ...formData, hargaBeli: parseNumberInput(e.target.value) })}
            placeholder="Masukkan harga beli"
          />
        </div>
        <div className="space-y-2">
          <Label>Harga Jual (Rp)</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={formData.hargaJual === 0 ? '' : String(formData.hargaJual)}
            onChange={(e) => setFormData({ ...formData, hargaJual: parseNumberInput(e.target.value) })}
            placeholder="Masukkan harga jual"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Deskripsi</Label>
        <Input
          value={formData.deskripsi}
          onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
          placeholder="Deskripsi barang (opsional)"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Barang</h1>
          <p className="text-gray-500">Kelola data barang inventaris</p>
        </div>
        
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={isKategoriDialogOpen} onOpenChange={setIsKategoriDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={resetKategoriForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Kategori
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Kelola Kategori</DialogTitle>
                </DialogHeader>
                {(kategoriError || barangError) && (
                  <Alert variant="destructive">
                    <AlertDescription>{kategoriError || barangError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nama Kategori *</Label>
                    <Input
                      value={kategoriForm.nama}
                      onChange={(e) => setKategoriForm({ ...kategoriForm, nama: e.target.value })}
                      placeholder="Elektronik"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deskripsi</Label>
                    <Input
                      value={kategoriForm.deskripsi}
                      onChange={(e) => setKategoriForm({ ...kategoriForm, deskripsi: e.target.value })}
                      placeholder="Deskripsi kategori"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Daftar Kategori</Label>
                    <div className="max-h-52 space-y-2 overflow-auto rounded-md border p-3">
                      {kategoriList.length === 0 ? (
                        <p className="text-sm text-gray-500">Belum ada kategori.</p>
                      ) : (
                        kategoriList.map((kategori) => (
                          <div key={kategori.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-gray-900">{kategori.nama}</p>
                              <p className="text-xs text-gray-500">{kategori.deskripsi || 'Tanpa deskripsi'}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteKategori(kategori.id, kategori.nama)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsKategoriDialogOpen(false)}>
                    Tutup
                  </Button>
                  <Button onClick={handleAddKategori}>Simpan Kategori</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Barang
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tambah Barang Baru</DialogTitle>
                </DialogHeader>
                {(error || barangError) && (
                  <Alert variant="destructive">
                    <AlertDescription>{error || barangError}</AlertDescription>
                  </Alert>
                )}
                {renderFormFields()}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setIsAddDialogOpen(false);
                    resetForm();
                  }}>
                    Batal
                  </Button>
                  <Button onClick={handleAdd}>Simpan</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedKategori} onValueChange={setSelectedKategori}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {kategoriList.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="md:hidden divide-y">
            {filteredBarang.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">Tidak ada data barang</p>
              </div>
            ) : (
              filteredBarang.map((barang) => (
                <div key={barang.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">{barang.kodeBarang}</p>
                      <p className="font-semibold text-gray-900 break-words">{barang.nama}</p>
                      <p className="text-xs text-gray-500">{barang.satuan}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 max-w-28 truncate">
                      {barang.kategoriNama}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Stok</p>
                      <div className="mt-1 flex items-center gap-2">
                        {barang.stok <= barang.stokMinimum && (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        )}
                        <span className={barang.stok <= barang.stokMinimum ? 'font-semibold text-orange-600' : 'font-semibold text-gray-900'}>
                          {barang.stok}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Harga Beli</p>
                      <p className="mt-1 font-semibold text-gray-900 break-words">{formatRupiah(barang.hargaBeli)}</p>
                    </div>
                    <div className="col-span-2 rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Harga Jual</p>
                      <p className="mt-1 font-semibold text-gray-900 break-words">{formatRupiah(barang.hargaJual)}</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => openEditDialog(barang)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(barang)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Hapus
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Harga Beli</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  {isAdmin && <TableHead className="text-center">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBarang.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                      <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">Tidak ada data barang</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBarang.map((barang) => (
                    <TableRow key={barang.id}>
                      <TableCell className="font-medium">{barang.kodeBarang}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{barang.nama}</p>
                          <p className="text-xs text-gray-500">{barang.satuan}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{barang.kategoriNama}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {barang.stok <= barang.stokMinimum && (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          )}
                          <span className={barang.stok <= barang.stokMinimum ? 'text-orange-600 font-medium' : ''}>
                            {barang.stok}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatRupiah(barang.hargaBeli)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(barang.hargaJual)}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(barang)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(barang)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Barang</DialogTitle>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {renderFormFields()}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              resetForm();
            }}>
              Batal
            </Button>
            <Button onClick={handleEdit}>Update</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
