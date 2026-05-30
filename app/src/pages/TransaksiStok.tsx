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
  SelectSeparator,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, ArrowDownLeft, ArrowUpRight, Package, AlertTriangle } from 'lucide-react';
import type { Barang, TipeTransaksi } from '@/types';

export default function TransaksiStok() {
  const { barangList, kategoriList } = useBarang();
  const { addTransaksi, error: transaksiError } = useTransaksi();
  const { userData, isTeknisi } = useAuth();
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
  const shouldHideHargaBeli = isTeknisi;
  const shouldHideHargaSatuan = shouldHideHargaBeli && formData.tipe === 'masuk';

  // Filter barang
  const filteredBarang = barangList.filter(barang => {
    const matchesSearch =
      barang.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      barang.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKategori =
      selectedKategori === 'all'
        ? true
        : selectedKategori === 'perlu-restock'
          ? barang.stok <= barang.stokMinimum
          : barang.kategoriId === selectedKategori;
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

  const isFilterRestock = selectedKategori === 'perlu-restock';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800">Stok Masuk / Keluar</h1>
        <p className="text-sm text-gray-400 mt-0.5">Catat penerimaan dan pengeluaran stok barang</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {transaksiError && (
          <Alert variant="destructive">
            <AlertDescription>{transaksiError}</AlertDescription>
          </Alert>
        )}
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
            <SelectTrigger
              className={`w-full sm:w-56 ${
                isFilterRestock
                  ? 'border-orange-300 bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                  : ''
              }`}
            >
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {kategoriList.map((k) => (
                <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value="perlu-restock">
                <span className="flex items-center gap-1.5 text-orange-600 font-semibold">
                  <AlertTriangle style={{ width: '13px', height: '13px' }} />
                  Perlu Restock
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Banner info saat filter Perlu Restock aktif */}
        {isFilterRestock && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-sm font-medium px-4 py-2.5 rounded-xl ring-1 ring-orange-100">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Menampilkan <strong>{filteredBarang.length}</strong> item yang telah mencapai atau berada di bawah ambang batas minimum stok
            </span>
          </div>
        )}
      </div>

      {/* Barang Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBarang.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">
              {isFilterRestock ? '🎉 Semua stok aman! Tidak ada item yang perlu restock.' : 'Tidak ada data barang'}
            </p>
          </div>
        ) : (
          filteredBarang.map((barang) => {
            const isKritis = barang.stok <= barang.stokMinimum;
            return (
              <div
                key={barang.id}
                className={`rounded-xl p-4 transition-all ${
                  isKritis
                    ? 'bg-white border border-orange-200 ring-1 ring-orange-100 hover:shadow-md hover:border-orange-300'
                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-mono">{barang.kodeBarang}</p>
                    <h3 className={`font-semibold mt-0.5 truncate ${isKritis ? 'text-[#1F2937]' : 'text-gray-800'}`}>
                      {barang.nama}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                      {barang.kategoriNama}
                    </span>
                    {isKritis && (
                      <span className="flex items-center gap-1 text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">
                        <AlertTriangle style={{ width: '11px', height: '11px' }} />
                        Ambang Batas Minimum
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Stok Sisa</span>
                    {isKritis ? (
                      <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-7 px-2 rounded-lg text-sm font-bold ring-1 ${
                        barang.stok === 0
                          ? 'bg-red-100 text-red-700 ring-red-200'
                          : 'bg-orange-100 text-orange-700 ring-orange-200'
                      }`}>
                        {barang.stok} {barang.satuan}
                      </span>
                    ) : (
                      <span className="font-medium text-gray-700">{barang.stok} {barang.satuan}</span>
                    )}
                  </div>
                  {isKritis && (
                    <div className="flex justify-between text-xs">
                      <span className="text-orange-400">Min stok</span>
                      <span className="text-orange-600 font-medium">{barang.stokMinimum} {barang.satuan}</span>
                    </div>
                  )}
                  {!shouldHideHargaBeli && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Harga Beli</span>
                      <span className="text-gray-600">{formatRupiah(barang.hargaBeli)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Harga Jual</span>
                    <span className="font-medium text-gray-700">{formatRupiah(barang.hargaJual)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 text-xs ${isKritis ? 'border-orange-300 bg-white text-orange-700 hover:bg-orange-50' : ''}`}
                    onClick={() => openDialog(barang, 'masuk')}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
                    Masuk
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => openDialog(barang, 'keluar')}
                    disabled={barang.stok === 0}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                    Keluar
                  </Button>
                </div>
              </div>
            );
          })
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

            {!shouldHideHargaSatuan && (
              <div className="space-y-2">
                <Label>Harga Satuan (Rp)</Label>
                <Input
                  type="number"
                  value={formData.hargaSatuan}
                  onChange={(e) => setFormData({ ...formData, hargaSatuan: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                placeholder="Contoh: Pembelian dari supplier"
              />
            </div>

            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
              {!shouldHideHargaSatuan && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Total:</span> {formatRupiah(formData.jumlah * formData.hargaSatuan)}
                </p>
              )}
              {selectedBarang && (
                <p className={`text-sm text-gray-500 ${shouldHideHargaSatuan ? '' : 'mt-1'}`}>
                  Stok setelah transaksi:{' '}
                  <span className="font-medium text-gray-700">
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
