// ============================================
// PAGE - Data Barang (CRUD)
// ============================================

import { useState } from 'react';
import { useBarang } from '@/hooks/useBarang';
import { useTransaksi } from '@/hooks/useTransaksi';
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
  const { isAdmin, isTeknisi, currentUser, userData } = useAuth();
  const { addTransaksi } = useTransaksi();
  const shouldHideHargaBeli = isTeknisi;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isKategoriDialogOpen, setIsKategoriDialogOpen] = useState(false);
  const [selectedBarang, setSelectedBarang] = useState<Barang | null>(null);
  const [error, setError] = useState('');
  const [kategoriError, setKategoriError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteBarangId, setConfirmDeleteBarangId] = useState<string | null>(null);
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

    const initialStok = formData.stok;
    const barangInput = { ...formData, stok: 0 };
    const addResult = await addBarang(barangInput);

    if (!addResult.success) {
      setError(addResult.error || 'Gagal menambahkan barang');
      return;
    }

    if (initialStok > 0) {
      const barangWithId = { id: addResult.id, ...barangInput } as Barang;
      const userId = currentUser?.uid ?? '';
      const userName = userData?.name ?? currentUser?.displayName ?? 'System';
      const transaksiResult = await addTransaksi(
        barangWithId,
        'masuk',
        initialStok,
        formData.hargaBeli,
        'Stok awal barang',
        userId,
        userName
      );

      if (!transaksiResult.success) {
        setError(transaksiResult.error || 'Gagal mencatat riwayat transaksi');
        return;
      }
    }

    setIsAddDialogOpen(false);
    resetForm();
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
  const handleDelete = async (id: string) => {
    const success = await deleteBarang(id);
    if (success) {
      setConfirmDeleteBarangId(null);
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

  const handleDeleteKategori = async (id: string) => {
    setKategoriError('');
    const success = await deleteKategori(id);
    if (success) {
      setConfirmDeleteId(null);
    } else {
      setKategoriError('Kategori gagal dihapus. Pastikan tidak ada barang yang menggunakan kategori ini.');
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
          <Label>Kategori</Label>
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
          <Label>Stok Minimum</Label>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Data Barang</h1>
          <p className="text-sm text-gray-400 mt-0.5">Kelola data barang inventaris</p>
        </div>
        
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={isKategoriDialogOpen} onOpenChange={(open) => { setIsKategoriDialogOpen(open); if (!open) { setConfirmDeleteId(null); setKategoriError(''); } }}>
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
                    <Label>Nama Kategori</Label>
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
                          <div key={kategori.id} className="rounded-md border p-2 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-gray-900">{kategori.nama}</p>
                                <p className="text-xs text-gray-500">{kategori.deskripsi || 'Tanpa deskripsi'}</p>
                              </div>
                              {confirmDeleteId === kategori.id ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={() => handleDeleteKategori(kategori.id)}
                                  >
                                    Hapus
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={() => setConfirmDeleteId(null)}
                                  >
                                    Batal
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700 shrink-0"
                                  onClick={() => setConfirmDeleteId(kategori.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            {confirmDeleteId === kategori.id && (
                              <p className="text-xs text-red-600 font-medium">
                                ⚠ Yakin hapus kategori ini? Aksi tidak dapat dibatalkan.
                              </p>
                            )}
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
      <div className="flex flex-col sm:flex-row gap-3">
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

      {/* Table */}
      <Card className={shouldHideHargaBeli ? 'max-w-6xl' : undefined}>
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
                    {!shouldHideHargaBeli && (
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-gray-500">Harga Beli</p>
                        <p className="mt-1 font-semibold text-gray-900 break-words">{formatRupiah(barang.hargaBeli)}</p>
                      </div>
                    )}
                    <div className={`${shouldHideHargaBeli ? '' : 'col-span-2'} rounded-lg bg-gray-50 p-3`}>
                      <p className="text-gray-500">{shouldHideHargaBeli ? 'Harga' : 'Harga Jual'}</p>
                      <p className="mt-1 font-semibold text-gray-900 break-words">{formatRupiah(barang.hargaJual)}</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="space-y-2">
                      {confirmDeleteBarangId === barang.id ? (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-2">
                          <p className="text-xs text-red-700 font-medium">⚠ Yakin ingin menghapus barang ini? Aksi tidak dapat dibatalkan.</p>
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleDelete(barang.id)}
                            >
                              Ya, Hapus
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setConfirmDeleteBarangId(null)}
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
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
                            onClick={() => setConfirmDeleteBarangId(barang.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table className={shouldHideHargaBeli ? 'table-fixed text-sm min-w-full' : 'table-fixed min-w-full'}>
              {shouldHideHargaBeli ? (
                <colgroup>
                  <col className="w-[14%]" />
                  <col className="w-[32%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                  <col className="w-[24%]" />
                </colgroup>
              ) : (
                <colgroup>
                  <col className="w-[11%]" />
                  <col className="w-[28%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                  {isAdmin && <col className="w-[11%]" />}
                </colgroup>
              )}
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kode</TableHead>
                  <TableHead className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nama Barang</TableHead>
                  <TableHead className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kategori</TableHead>
                  <TableHead className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Stok</TableHead>
                  {!shouldHideHargaBeli && <TableHead className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Harga Beli</TableHead>}
                  <TableHead className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">{shouldHideHargaBeli ? 'Harga' : 'Harga Jual'}</TableHead>
                  {isAdmin && <TableHead className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBarang.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(isAdmin ? 6 : 5) + (shouldHideHargaBeli ? 0 : 1)} className="text-center py-8">
                      <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">Tidak ada data barang</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBarang.map((barang) => (
                    <TableRow key={barang.id}>
                      <TableCell className={shouldHideHargaBeli ? 'px-3 py-3 font-semibold text-xs' : 'px-3 py-3 font-medium'}>{barang.kodeBarang}</TableCell>
                      <TableCell className="px-3 py-3">
                        <div>
                          <p className="font-medium truncate">{barang.nama}</p>
                          <p className="text-xs text-gray-500">{barang.satuan}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <Badge variant="secondary" className={shouldHideHargaBeli ? 'max-w-32 truncate px-2 py-0.5 text-xs' : undefined}>
                          {barang.kategoriNama}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {barang.stok <= barang.stokMinimum && (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          )}
                          <span className={barang.stok <= barang.stokMinimum ? 'text-orange-600 font-medium' : ''}>
                            {barang.stok}
                          </span>
                        </div>
                      </TableCell>
                      {!shouldHideHargaBeli && (
                        <TableCell className="px-3 py-3 text-right">{formatRupiah(barang.hargaBeli)}</TableCell>
                      )}
                      <TableCell className="px-3 py-3 text-right font-medium">{formatRupiah(barang.hargaJual)}</TableCell>
                      {isAdmin && (
                        <TableCell className="px-3 py-3 text-center">
                          {confirmDeleteBarangId === barang.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => handleDelete(barang.id)}
                              >
                                Hapus
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => setConfirmDeleteBarangId(null)}
                              >
                                Batal
                              </Button>
                            </div>
                          ) : (
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
                                onClick={() => setConfirmDeleteBarangId(barang.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
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
