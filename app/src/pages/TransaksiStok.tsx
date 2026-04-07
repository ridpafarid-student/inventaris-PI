// ============================================
// PAGE - Transaksi Stok (Masuk/Keluar)
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, ArrowDownLeft, ArrowUpRight, Package } from 'lucide-react';
import type { Barang, TipeTransaksi } from '@/types';

export default function TransaksiStok() {
  const { barangList, kategoriList } = useBarang();
  const { addTransaksi, error: transaksiError } = useTransaksi();
  const { userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBarang, setSelectedBarang] = useState<Barang | null>(null);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    tipe: 'masuk' as TipeTransaksi,
    jumlah: 1,
    hargaSatuan: 0,
    keterangan: ''
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
    setFormData({
      tipe: 'masuk',
      jumlah: 1,
      hargaSatuan: 0,
      keterangan: ''
    });
    setError('');
  };

  // Open dialog
  const openDialog = (barang: Barang, tipe: TipeTransaksi) => {
    setSelectedBarang(barang);
    setFormData({
      tipe,
      jumlah: 1,
      hargaSatuan: tipe === 'masuk' ? barang.hargaBeli : barang.hargaJual,
      keterangan: ''
    });
    setIsDialogOpen(true);
  };

  // Handle submit
  const handleSubmit = async () => {
    setError('');
    
    if (!selectedBarang) return;
    
    if (formData.jumlah <= 0) {
      setError('Jumlah harus lebih dari 0');
      return;
    }

    if (formData.tipe === 'keluar' && formData.jumlah > selectedBarang.stok) {
      setError('Stok tidak mencukupi');
      return;
    }

    const result = await addTransaksi(
      selectedBarang,
      formData.tipe,
      formData.jumlah,
      formData.hargaSatuan,
      formData.keterangan,
      userData?.uid || '',
      userData?.name || ''
    );

    if (result.success) {
      setIsDialogOpen(false);
      setSelectedBarang(null);
      resetForm();
    } else {
      setError(result.error || transaksiError || 'Gagal melakukan transaksi');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stok Masuk/Keluar</h1>
        <p className="text-gray-500">Kelola transaksi stok barang</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          {transaksiError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{transaksiError}</AlertDescription>
            </Alert>
          )}
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

      {/* Barang Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBarang.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">Tidak ada data barang</p>
          </div>
        ) : (
          filteredBarang.map((barang) => (
            <Card key={barang.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500">{barang.kodeBarang}</p>
                    <h3 className="font-semibold text-gray-900">{barang.nama}</h3>
                  </div>
                  <Badge variant="secondary">{barang.kategoriNama}</Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Stok Tersedia:</span>
                    <span className={`font-medium ${
                      barang.stok <= barang.stokMinimum ? 'text-orange-600' : 'text-gray-900'
                    }`}>
                      {barang.stok} {barang.satuan}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Harga Beli:</span>
                    <span className="font-medium">{formatRupiah(barang.hargaBeli)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Harga Jual:</span>
                    <span className="font-medium">{formatRupiah(barang.hargaJual)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-green-200 hover:bg-green-50 hover:text-green-700"
                    onClick={() => openDialog(barang, 'masuk')}
                  >
                    <ArrowDownLeft className="w-4 h-4 mr-1 text-green-600" />
                    Masuk
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => openDialog(barang, 'keluar')}
                    disabled={barang.stok === 0}
                  >
                    <ArrowUpRight className="w-4 h-4 mr-1 text-red-600" />
                    Keluar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Transaksi Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formData.tipe === 'masuk' ? (
                <>
                  <ArrowDownLeft className="w-5 h-5 text-green-600" />
                  Stok Masuk
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-5 h-5 text-red-600" />
                  Stok Keluar
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedBarang && (
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-gray-500">{selectedBarang.kodeBarang}</p>
              <p className="font-semibold">{selectedBarang.nama}</p>
              <p className="text-sm">Stok saat ini: <span className="font-medium">{selectedBarang.stok} {selectedBarang.satuan}</span></p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jumlah *</Label>
              <Input
                type="number"
                min={1}
                value={formData.jumlah}
                onChange={(e) => setFormData({ ...formData, jumlah: parseInt(e.target.value) || 0 })}
              />
              {formData.tipe === 'keluar' && selectedBarang && formData.jumlah > selectedBarang.stok && (
                <p className="text-sm text-red-500">Jumlah melebihi stok tersedia</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Harga Satuan (Rp)</Label>
              <Input
                type="number"
                value={formData.hargaSatuan}
                onChange={(e) => setFormData({ ...formData, hargaSatuan: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                placeholder="Contoh: Pembelian dari supplier"
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Total:</span> {formatRupiah(formData.jumlah * formData.hargaSatuan)}
              </p>
              {selectedBarang && (
                <p className="text-sm text-blue-600 mt-1">
                  Stok setelah transaksi: {' '}
                  <span className="font-medium">
                    {formData.tipe === 'masuk' 
                      ? selectedBarang.stok + formData.jumlah 
                      : selectedBarang.stok - formData.jumlah} {selectedBarang.satuan}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={formData.jumlah <= 0 || (formData.tipe === 'keluar' && selectedBarang !== null && formData.jumlah > selectedBarang.stok)}
              className={formData.tipe === 'masuk' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {formData.tipe === 'masuk' ? 'Simpan Stok Masuk' : 'Simpan Stok Keluar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
