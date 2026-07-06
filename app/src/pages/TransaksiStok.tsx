// ============================================
// PAGE - Transaksi Stok (Masuk/Keluar)
// ============================================

import { useState } from 'react';
import { useEffect } from 'react';
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

export default function TransaksiStok({ initialFilterMode = 'all' }: { initialFilterMode?: 'all' | 'perlu-restock' } = {}) {
  const { barangList, kategoriList } = useBarang();
  const { addTransaksi, error: transaksiError } = useTransaksi();
  const { userData, isTeknisi } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBarang, setSelectedBarang] = useState<Barang | null>(null);
  const [error, setError] = useState('');

  // Set initial filter mode
  useEffect(() => {
    if (initialFilterMode === 'perlu-restock') {
      setSelectedKategori('perlu-restock');
    }
  }, [initialFilterMode]);

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
  const filteredBarang = barangList
    .filter(barang => {
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
    })
    .sort((a, b) => {
      // When filtering by restock, sort by urgency (consistent with Laporan.tsx)
      if (selectedKategori === 'perlu-restock') {
        const kekuranganA = Math.max(a.stokMinimum - a.stok, 0);
        const kekuranganB = Math.max(b.stokMinimum - b.stok, 0);
        // Sort by kekurangan DESC (most critical first), then by stok ASC
        return kekuranganB - kekuranganA || a.stok - b.stok;
      }
      return 0; // No sorting for other filters
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
      <div className="pb-4 border-b border-border-default">
        <h1 className="text-xl font-semibold text-text-primary">Mutasi Stok</h1>
        <p className="text-sm text-text-secondary mt-0.5">Catat dan kelola transaksi stok masuk serta stok keluar barang.</p>
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
            <Search style={{ width: '20px', height: '20px' }} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
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
                  ? 'border-status-danger/40 ring-1 ring-status-danger/10'
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
                                <span className="flex items-center gap-1.5 text-status-danger/70 font-medium">
                  <AlertTriangle style={{ width: '13px', height: '13px' }} />
                  Perlu Restock
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

                {/* Banner info saat filter Perlu Restock aktif */}
                                {isFilterRestock && (
                                    <div className="flex items-center gap-2 bg-status-danger/10 border border-status-danger/20 text-status-danger text-sm font-medium px-4 py-2.5 rounded-sm ring-1 ring-status-danger/10">
                    <AlertTriangle style={{ width: '16px', height: '16px' }} className="shrink-0" />
                    <span>
                      Menampilkan <strong>{filteredBarang.length}</strong> item yang telah mencapai atau berada di bawah ambang batas minimum stok
                    </span>
                  </div>
                )}
      </div>

            {/* Stats Summary - Restock Overview */}
      {isFilterRestock && filteredBarang.length > 0 && (
        <div className={`grid grid-cols-1 gap-3 ${shouldHideHargaBeli ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          <div className="bg-surface-base border border-border-default rounded-sm p-4">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Item Perlu Restock</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{filteredBarang.length}</p>
          </div>
          <div className="bg-surface-base border border-border-default rounded-sm p-4">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Rekomendasi Unit</p>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {filteredBarang.reduce((sum, barang) => sum + Math.max(barang.stokMinimum - barang.stok, 0), 0)}
            </p>
          </div>
          {!shouldHideHargaBeli && (
            <div className="bg-surface-base border border-border-default rounded-sm p-4">
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Estimasi Budget</p>
              <p className="text-base font-bold text-text-primary mt-1">
                {formatRupiah(filteredBarang.reduce((sum, barang) => sum + (Math.max(barang.stokMinimum - barang.stok, 0) * barang.hargaBeli), 0))}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Barang Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBarang.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Package style={{ width: '48px', height: '48px' }} className="mx-auto text-text-secondary/30 mb-2" />
            <p className="text-text-secondary">
              {isFilterRestock ? '🎉 Semua stok aman! Tidak ada item yang perlu restock.' : 'Tidak ada data barang'}
            </p>
          </div>
        ) : (
                    filteredBarang.map((barang) => {
            const isHabis = barang.stok === 0;
            const isRendah = barang.stok > 0 && barang.stok <= barang.stokMinimum;
            const isKritis = isHabis || isRendah;
            return (
                            <div
                            key={barang.id}
                                                        className={`flex flex-col rounded-sm p-4 transition-all bg-surface-base border ${
                                                            isHabis
                                ? 'border-status-danger/40 ring-1 ring-status-danger/10 hover:shadow-card'
                                : isRendah
                                  ? 'border-status-warning/40 ring-1 ring-status-warning/10 hover:shadow-card'
                                  : 'border-border-default hover:border-text-secondary hover:shadow-card'
                            }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary font-mono">{barang.kodeBarang}</p>
                                        <h3 className="font-semibold mt-0.5 truncate text-text-primary">
                      {barang.nama}
                    </h3>
                  </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                        <span className="text-xs bg-surface-muted text-text-primary px-2 py-0.5 rounded-sm font-medium">
                      {barang.kategoriNama}
                    </span>
                                        {isHabis && (
                      <span className="flex items-center gap-1 text-xs font-semibold bg-status-danger/10 text-status-danger px-2 py-0.5 rounded-pill">
                        <AlertTriangle style={{ width: '11px', height: '11px' }} />
                        HABIS
                      </span>
                    )}
                                        {isRendah && (
                      <span className="flex items-center gap-1 text-xs font-semibold bg-status-warning/10 text-status-warning px-2 py-0.5 rounded-pill">
                        <AlertTriangle style={{ width: '11px', height: '11px' }} />
                        RENDAH
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                                    <div className="flex justify-between items-center text-sm">
                    <span className="text-text-primary">Stok Sisa</span>
                                        {isHabis ? (
                      <span className="inline-flex items-center justify-center min-w-[2.5rem] h-7 px-2 rounded-sm text-sm font-bold ring-1 bg-status-danger/10 text-status-danger ring-status-danger/20">
                        {barang.stok} {barang.satuan}
                      </span>
                    ) : isRendah ? (
                      <span className="inline-flex items-center justify-center min-w-[2.5rem] h-7 px-2 rounded-sm text-sm font-bold ring-1 bg-status-warning/10 text-status-warning ring-status-warning/20">
                        {barang.stok} {barang.satuan}
                      </span>
                    ) : (
                      <span className="font-medium text-text-primary">{barang.stok} {barang.satuan}</span>
                    )}
                  </div>
                                    {isKritis && (
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary">Min stok</span>
                      <span className="text-text-secondary font-medium">{barang.stokMinimum} {barang.satuan}</span>
                    </div>
                  )}
                                    {!shouldHideHargaBeli && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-primary">Harga Beli</span>
                      <span className="text-text-primary">{formatRupiah(barang.hargaBeli)}</span>
                    </div>
                  )}
                                    <div className="flex justify-between text-sm">
                    <span className="text-text-primary">{shouldHideHargaBeli ? 'Harga' : 'Harga Jual'}</span>
                    <span className="font-medium text-text-primary">{formatRupiah(barang.hargaJual)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                                                                        <Button
                    variant="outline"
                    size="default"
                                        className={`flex-1 text-xs !py-3 ${
                      isHabis
                        ? 'border-status-danger/40 text-status-danger hover:bg-status-danger/5 font-semibold'
                        : isRendah
                          ? 'border-status-warning/40 text-status-warning hover:bg-status-warning/5'
                          : ''
                    }`}
                    onClick={() => openDialog(barang, 'masuk')}
                  >
                    <ArrowDownLeft style={{ width: '14px', height: '14px' }} className="mr-1" />
                    Masuk
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    className="flex-1 text-xs !py-3"
                    onClick={() => openDialog(barang, 'keluar')}
                    disabled={barang.stok === 0}
                  >
                    <ArrowUpRight style={{ width: '14px', height: '14px' }} className="mr-1" />
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
                  <ArrowDownLeft style={{ width: '20px', height: '20px' }} className="text-status-success" />
                  Stok Masuk
                </>
              ) : (
                <>
                  <ArrowUpRight style={{ width: '20px', height: '20px' }} className="text-status-danger" />
                  Stok Keluar
                </>
              )}
            </DialogTitle>
          </DialogHeader>

                    {selectedBarang && (
            <div className="bg-surface-muted p-3 rounded-sm mb-4">
              <p className="text-sm text-text-secondary">{selectedBarang.kodeBarang}</p>
              <p className="font-semibold text-text-primary">{selectedBarang.nama}</p>
              <p className="text-sm text-text-primary">Stok saat ini: <span className="font-medium">{selectedBarang.stok} {selectedBarang.satuan}</span></p>
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
                <p className="text-sm text-status-danger">Jumlah melebihi stok tersedia</p>
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

                        <div className="bg-surface-muted border border-border-default p-3 rounded-sm">
              {!shouldHideHargaSatuan && (
                <p className="text-sm text-text-primary">
                  <span className="font-medium">Total:</span> {formatRupiah(formData.jumlah * formData.hargaSatuan)}
                </p>
              )}
              {selectedBarang && (
                <p className={`text-sm text-text-secondary ${shouldHideHargaSatuan ? '' : 'mt-1'}`}>
                  Stok setelah transaksi:{' '}
                  <span className="font-medium text-text-primary">
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
              variant="outline"
              onClick={handleSubmit}
              disabled={formData.jumlah <= 0 || (formData.tipe === 'keluar' && selectedBarang !== null && formData.jumlah > selectedBarang.stok)}
            >
              {formData.tipe === 'masuk' ? 'Simpan Stok Masuk' : 'Simpan Stok Keluar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
