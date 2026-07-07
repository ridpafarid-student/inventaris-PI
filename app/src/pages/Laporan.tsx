// ============================================
// PAGE - Laporan dengan Export PDF
// ============================================

import { useMemo, useRef, useState } from 'react';
import { useTransaksi } from '@/hooks/useTransaksi';
import { useBarang } from '@/hooks/useBarang';
import { useServices } from '@/hooks/useServices';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileDown, ShoppingCart, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Timestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ServiceItem, ServiceStatus, TransaksiStok } from '@/types';

interface RestockRecommendationItem {
  barangId: string;
  kodeBarang: string;
  nama: string;
  kategoriNama: string;
  satuan: string;
  stok: number;
  stokMinimum: number;
  kekurangan: number;
  rekomendasiBeli: number;
  estimasiBiaya: number;
}

const startOfDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const endOfDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
};

const toDate = (value: Date | Timestamp | string | null | undefined) => {
  if (!value) return null;
  return value instanceof Timestamp ? value.toDate() : new Date(value);
};

export default function Laporan() {
  const { transaksiList } = useTransaksi();
  const { kategoriList, barangList } = useBarang();
  const { services } = useServices();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterTipe, setFilterTipe] = useState<string>('all');
  const [filterKategori, setFilterKategori] = useState<string>('all');

  const selectedDateRange = useMemo(() => {
    if (!startDate && !endDate) {
      return { start: null, end: null };
    }

    const rawStart = startDate ? startOfDay(new Date(startDate)) : null;
    const rawEnd = endDate ? endOfDay(new Date(endDate)) : null;

    if (rawStart && rawEnd && rawStart > rawEnd) {
      return {
        start: startOfDay(rawEnd),
        end: endOfDay(rawStart),
      };
    }

    return {
      start: rawStart,
      end: rawEnd,
    };
  }, [endDate, startDate]);

  const filteredTransaksi = transaksiList.filter(transaksi => {
    const tDate = toDate(transaksi.createdAt);
    const barang = barangList.find((item) => item.id === transaksi.barangId);

    const matchesStart = !selectedDateRange.start || (tDate && tDate >= selectedDateRange.start);
    const matchesEnd = !selectedDateRange.end || (tDate && tDate <= selectedDateRange.end);
    const matchesTipe = filterTipe === 'all' || transaksi.tipe === filterTipe;
    const matchesKategori =
      filterKategori === 'all' || barang?.kategoriId === filterKategori;

    return matchesStart && matchesEnd && matchesTipe && matchesKategori;
  });

  const filteredServices = services.filter((service) => {
    const serviceDate = toDate(service.pickedUpAt ?? service.updatedAt ?? service.createdAt);

    const matchesStart = !selectedDateRange.start || (serviceDate && serviceDate >= selectedDateRange.start);
    const matchesEnd = !selectedDateRange.end || (serviceDate && serviceDate <= selectedDateRange.end);

    return matchesStart && matchesEnd;
  });

  const isServiceTransaction = (transaksi: TransaksiStok) =>
    transaksi.source === 'service' || Boolean(transaksi.serviceId);

  const labaBarangKeluar = filteredTransaksi
    .filter((transaksi) => transaksi.tipe === 'keluar' && !isServiceTransaction(transaksi))
    .reduce((sum, transaksi) => {
      const barang = barangList.find((item) => item.id === transaksi.barangId);
      if (!barang) return sum;

      const penjualan = transaksi.totalHarga > 0 ? transaksi.totalHarga : (transaksi.hargaSatuan * transaksi.jumlah);
      const biayaPokok = (barang.hargaBeli ?? 0) * transaksi.jumlah;
      return sum + Math.max(0, penjualan - biayaPokok);
    }, 0);

  const labaServisDiambil = filteredServices
    .filter((service) => service.status === 'diambil')
    .reduce((sum, service) => {
      const biayaJasa = service.biayaJasa ?? 0;
      const penjualanSparepart = (service.sparepartDigunakan ?? []).reduce((subtotal, item) => {
        const barang = barangList.find((product) => product.id === item.productId);
        return subtotal + ((barang?.hargaJual ?? 0) * item.jumlah);
      }, 0);
      const modalSparepart = (service.sparepartDigunakan ?? []).reduce((subtotal, item) => {
        const barang = barangList.find((product) => product.id === item.productId);
        return subtotal + ((barang?.hargaBeli ?? 0) * item.jumlah);
      }, 0);
      return sum + biayaJasa + penjualanSparepart - modalSparepart;
    }, 0);

  const labaPeriodik = labaBarangKeluar + labaServisDiambil;

  const totalTransaksiMarginPeriodik =
    filteredTransaksi
      .filter((transaksi) => transaksi.tipe === 'keluar' && !isServiceTransaction(transaksi))
      .length +
    filteredServices
      .filter((service) => service.status === 'diambil')
      .length;

  const officialServiceTransactionIds = new Set(
    transaksiList.map((transaksi) => transaksi.serviceId).filter(Boolean)
  );

  const serviceStockTransaksi = filteredServices.flatMap((service) =>
    officialServiceTransactionIds.has(service.id)
      ? []
      : (service.sparepartDigunakan ?? [])
        .filter(() => service.stokDikurangi)
        .map((item) => {
          const barang = barangList.find((product) => product.id === item.productId);
          const hargaSatuan = barang?.hargaJual ?? barang?.hargaBeli ?? 0;

          return {
            id: `service-${service.id}-${item.productId}`,
            barangId: item.productId,
            barangNama: item.namaProduk,
            barangKode: barang?.kodeBarang ?? '-',
            tipe: 'keluar' as const,
            jumlah: item.jumlah,
            stokSebelum: 0,
            stokSesudah: 0,
            hargaSatuan,
            totalHarga: hargaSatuan * item.jumlah,
            keterangan: `Pemakaian sparepart untuk servis ${service.modelPerangkat} - ${service.namaPelanggan}`,
            userId: '',
            userName: 'Servis',
            source: 'service' as const,
            serviceId: service.id,
            createdAt: service.updatedAt ?? service.createdAt,
          };
        })
  );

  const filteredTransaksiGabungan = [...filteredTransaksi, ...serviceStockTransaksi]
    .sort((a, b) => {
      const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

  // Calculate summary
  const summary = {
    totalMasuk: filteredTransaksiGabungan
      .filter(t => t.tipe === 'masuk')
      .reduce((sum, t) => sum + t.jumlah, 0),
    totalKeluar: filteredTransaksiGabungan
      .filter(t => t.tipe === 'keluar')
      .reduce((sum, t) => sum + t.jumlah, 0),
    nilaiMasuk: filteredTransaksiGabungan
      .filter(t => t.tipe === 'masuk')
      .reduce((sum, t) => sum + t.totalHarga, 0),
    nilaiKeluar: filteredTransaksiGabungan
      .filter(t => t.tipe === 'keluar')
      .reduce((sum, t) => sum + t.totalHarga, 0),
  };

  const serviceSummary = {
    totalServis: filteredServices.length,
    pending: filteredServices.filter((service) => service.status === 'pending').length,
    proses: filteredServices.filter((service) => service.status === 'proses').length,
    menungguSparepart: filteredServices.filter((service) => service.status === 'menunggu-sparepart').length,
    selesai: filteredServices.filter((service) => service.status === 'selesai').length,
    totalSparepart: filteredServices.reduce(
      (total, service) => total + (service.stokDikurangi
        ? service.sparepartDigunakan?.reduce((sum, item) => sum + item.jumlah, 0) ?? 0
        : 0),
      0
    ),
    totalBiayaJasa: filteredServices.reduce((total, service) => total + (service.biayaJasa ?? 0), 0),
    nilaiSparepart: filteredTransaksiGabungan
      .filter((transaksi) => isServiceTransaction(transaksi))
      .reduce((total, transaksi) => total + transaksi.totalHarga, 0),
    labaPeriodik,
  };

  const restockRecommendations = useMemo<RestockRecommendationItem[]>(() => (
    barangList
      .filter((barang) => filterKategori === 'all' || barang.kategoriId === filterKategori)
      .filter((barang) => barang.stokMinimum > 0 && barang.stok < barang.stokMinimum)
      .map((barang) => {
        const kekurangan = Math.max(barang.stokMinimum - barang.stok, 0);
        const rekomendasiBeli = kekurangan;

        return {
          barangId: barang.id,
          kodeBarang: barang.kodeBarang,
          nama: barang.nama,
          kategoriNama: barang.kategoriNama ?? '-',
          satuan: barang.satuan,
          stok: barang.stok,
          stokMinimum: barang.stokMinimum,
          kekurangan,
          rekomendasiBeli,
          estimasiBiaya: rekomendasiBeli * barang.hargaBeli,
        };
      })
      .sort((a, b) => b.kekurangan - a.kekurangan || a.stok - b.stok)
  ), [barangList, filterKategori]);

  const restockSummary = {
    totalItem: restockRecommendations.length,
    totalUnit: restockRecommendations.reduce((sum, item) => sum + item.rekomendasiBeli, 0),
    estimasiBiaya: restockRecommendations.reduce((sum, item) => sum + item.estimasiBiaya, 0),
  };

  const getServiceSparepartTotal = (service: ServiceItem) =>
    service.sparepartDigunakan?.reduce((sum, item) => sum + item.jumlah, 0) ?? 0;

  const getServiceSparepartValue = (service: ServiceItem) =>
    (service.sparepartDigunakan ?? []).reduce((sum, item) => {
      const barang = barangList.find((product) => product.id === item.productId);
      const hargaSatuan = barang?.hargaJual ?? barang?.hargaBeli ?? 0;
      return sum + (hargaSatuan * item.jumlah);
    }, 0);

  const getServiceTotalValue = (service: ServiceItem) =>
    (service.biayaJasa ?? 0) + getServiceSparepartValue(service);

  // Format currency
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (timestamp: TransaksiStok['createdAt'] | ServiceItem['createdAt']) => {
    const date = timestamp instanceof Timestamp
      ? timestamp.toDate()
      : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

    const getServiceStatusBadgeClass = (status: ServiceStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-surface-muted text-text-secondary';
      case 'proses':
        return 'bg-status-info/10 text-status-info';
      case 'menunggu-sparepart':
        return 'bg-status-warning/10 text-status-warning';
            case 'selesai':
        return 'bg-status-success/10 text-status-success';
      case 'diambil':
        return 'bg-neutral-500/10 text-neutral-600';
      default:
        return 'bg-surface-muted text-text-secondary';
    }
  };

  const getServiceStatusLabel = (status: ServiceStatus) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'proses':
        return 'Proses';
      case 'menunggu-sparepart':
        return 'Menunggu Sparepart';
            case 'selesai':
        return 'Selesai';
      case 'diambil':
        return 'Diserahkan';
      default:
        return status;
    }
  };

  // Export PDF
  const exportPDF = async () => {
    if (!reportRef.current) return;

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const fileName = `Laporan_Inventaris_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  return (
    <div className="space-y-6">
            {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border-default">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Laporan</h1>
          <p className="text-sm text-text-secondary mt-0.5">Generate dan export laporan transaksi</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button onClick={exportPDF} size="sm" variant="outline" className="w-full sm:w-auto">
            <FileDown className="w-5 h-5 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

            {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-surface-base border border-border-default rounded-sm">
                        <div className="space-y-1.5">
          <Label className="text-xs text-text-secondary font-medium uppercase tracking-wide">Dari Tanggal</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal ${!startDate && 'text-text-secondary'} bg-surface-base border-border-default`}
              >
                <CalendarIcon className="mr-2 h-5 w-5" />
                {startDate ? format(new Date(startDate), 'dd MMMM yyyy', { locale: id }) : <span>Pilih tanggal</span>}
              </Button>
            </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 shadow-elevated border border-border-default z-50" align="start">
              <Calendar
                mode="single"
                selected={startDate ? new Date(startDate) : undefined}
                onSelect={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-text-secondary font-medium uppercase tracking-wide">Sampai Tanggal</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal ${!endDate && 'text-text-secondary'} bg-surface-base border-border-default`}
              >
                <CalendarIcon className="mr-2 h-5 w-5" />
                {endDate ? format(new Date(endDate), 'dd MMMM yyyy', { locale: id }) : <span>Pilih tanggal</span>}
              </Button>
            </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 shadow-elevated border border-border-default z-50" align="start">
              <Calendar
                mode="single"
                selected={endDate ? new Date(endDate) : undefined}
                onSelect={(date) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
                <div className="space-y-1.5">
          <Label className="text-xs text-text-secondary font-medium uppercase tracking-wide">Tipe Transaksi</Label>
          <Select value={filterTipe} onValueChange={setFilterTipe}>
            <SelectTrigger>
              <SelectValue placeholder="Semua Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="masuk">Stok Masuk</SelectItem>
              <SelectItem value="keluar">Stok Keluar</SelectItem>
            </SelectContent>
          </Select>
        </div>
                <div className="space-y-1.5">
          <Label className="text-xs text-text-secondary font-medium uppercase tracking-wide">Kategori</Label>
          <Select value={filterKategori} onValueChange={setFilterKategori}>
            <SelectTrigger>
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
      </div>

      {/* Summary Cards - Inventaris */}
            <div>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Ringkasan Inventaris</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-surface-base border border-border-default rounded-sm p-4">
            <p className="text-xs text-text-secondary font-medium">Stok Masuk</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{summary.totalMasuk}</p>
          </div>
          <div className="bg-surface-base border border-border-default rounded-sm p-4">
            <p className="text-xs text-text-secondary font-medium">Stok Keluar</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{summary.totalKeluar}</p>
          </div>
          <div className="bg-surface-base border border-border-default rounded-sm p-4">
            <p className="text-xs text-text-secondary font-medium">Nilai Masuk</p>
            <p className="text-base font-bold text-text-primary mt-1">{formatRupiah(summary.nilaiMasuk)}</p>
          </div>
          <div className="bg-surface-base border border-border-default rounded-sm p-4">
            <p className="text-xs text-text-secondary font-medium">Nilai Keluar</p>
            <p className="text-base font-bold text-text-primary mt-1">{formatRupiah(summary.nilaiKeluar)}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards - Servis */}
            <div>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Ringkasan Servis</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-surface-base border border-border-default rounded-sm p-4">
            <p className="text-xs text-text-secondary font-medium">Total Servis</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{serviceSummary.totalServis}</p>
          </div>
          <div className="bg-surface-base border border-border-default rounded-sm p-4">
            <p className="text-xs text-text-secondary font-medium">Belum Selesai</p>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {serviceSummary.pending + serviceSummary.proses + serviceSummary.menungguSparepart}
            </p>
          </div>
          <div className="bg-surface-base border border-border-default rounded-sm p-4">
            <p className="text-xs text-text-secondary font-medium">Servis Selesai</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{serviceSummary.selesai}</p>
          </div>
          <div className="bg-surface-base border border-border-default rounded-sm p-4">
            <p className="text-xs text-text-secondary font-medium">Sparepart Terpakai</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{serviceSummary.totalSparepart}</p>
          </div>
          <div className="bg-surface-base border border-border-default rounded-sm p-4">
            <p className="text-xs text-text-secondary font-medium">Nilai Jasa</p>
            <p className="text-base font-bold text-text-primary mt-1">{formatRupiah(serviceSummary.totalBiayaJasa)}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards - Laba Periode */}
            <div>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Total Margin Penjualan</p>
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-surface-base border border-border-default rounded-sm p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-2xl font-bold text-text-primary mt-1">{formatRupiah(serviceSummary.labaPeriodik)}</p>
                <p className="text-xs text-text-secondary mt-1">{totalTransaksiMarginPeriodik} transaksi</p>
              </div>
            </div>
          </div>
        </div>
      </div>

            {/* Rekomendasi Restok */}
      <div className="bg-surface-muted border border-border-default rounded-md p-4">
        <div className="flex flex-col gap-2 border-b border-border-default pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
              <ShoppingCart className="h-5 w-5 text-status-danger" />
              Rekomendasi Restok
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Berdasarkan barang yang stoknya sudah berada di bawah ambang batas minimum.
            </p>
          </div>
        </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-sm border border-border-default bg-surface-base p-4">
            <p className="text-xs font-medium text-text-secondary">Item Perlu Restok</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{restockSummary.totalItem}</p>
          </div>
          <div className="rounded-sm border border-border-default bg-surface-base p-4">
            <p className="text-xs font-medium text-text-secondary">Rekomendasi Unit</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{restockSummary.totalUnit}</p>
          </div>
          <div className="rounded-sm border border-border-default bg-surface-base p-4">
            <p className="text-xs font-medium text-text-secondary">Estimasi Budget</p>
            <p className="mt-1 text-base font-bold text-text-primary">{formatRupiah(restockSummary.estimasiBiaya)}</p>
          </div>
        </div>

                {restockRecommendations.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <p className="font-medium text-emerald-300">Semua stok masih di atas ambang batas minimum.</p>
            <p className="mt-1 text-sm text-emerald-300/80">Belum ada barang yang perlu direstok dari filter saat ini.</p>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-3 md:hidden">
              {restockRecommendations.map((item) => (
                                <div key={item.barangId} className="rounded-sm border border-border-default p-4">
                  <p className="text-xs text-text-secondary">{item.kodeBarang}</p>
                  <p className="font-semibold text-text-primary">{item.nama}</p>
                  <p className="text-xs text-text-secondary">{item.kategoriNama}</p>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary">Stok</p>
                      <p className="font-semibold text-text-primary">{item.stok}</p>
                    </div>
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary">Minimum</p>
                      <p className="font-semibold text-text-primary">{item.stokMinimum}</p>
                    </div>
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary">Beli</p>
                      <p className="font-semibold text-status-danger">{item.rekomendasiBeli}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-text-secondary">
                    Kekurangan {item.kekurangan} {item.satuan}. Estimasi {formatRupiah(item.estimasiBiaya)}.
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barang</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead className="text-center">Minimum</TableHead>
                    <TableHead className="text-center">Kekurangan</TableHead>
                    <TableHead className="text-center">Rekomendasi Beli</TableHead>
                    <TableHead className="text-right">Estimasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restockRecommendations.map((item) => (
                    <TableRow key={item.barangId}>
                                            <TableCell>
                        <p className="font-medium text-text-primary">{item.nama}</p>
                        <p className="text-xs text-text-secondary">{item.kodeBarang}</p>
                      </TableCell>
                      <TableCell>{item.kategoriNama}</TableCell>
                      <TableCell className="text-right">{item.stok} {item.satuan}</TableCell>
                      <TableCell className="text-center">{item.stokMinimum} {item.satuan}</TableCell>
                      <TableCell className="text-center">{item.kekurangan} {item.satuan}</TableCell>
                      <TableCell className="text-center font-semibold text-status-danger">
                        {item.rekomendasiBeli} {item.satuan}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatRupiah(item.estimasiBiaya)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Report Content (for PDF export) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-[10000px] top-0 w-[1024px] overflow-hidden opacity-0"
      >
                <div ref={reportRef} className="bg-white p-4 md:p-8 text-gray-900">
                {/* Report Header */}
                <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">LAPORAN INVENTARIS & SERVIS</h2>
          <p className="text-gray-800 mt-1 font-medium">
            Periode: {startDate ? new Date(startDate).toLocaleDateString('id-ID') : 'Semua'} - {endDate ? new Date(endDate).toLocaleDateString('id-ID') : 'Semua'}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            Dicetak pada: {new Date().toLocaleDateString('id-ID', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

                {/* ── SECTION: INVENTARIS ── */}
        <div className="mt-2 mb-6 pt-3 border-t-4 border-gray-800">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">Inventaris</p>
        </div>

        <div className="mb-8">
          <h3 className="mb-1 text-lg font-semibold text-gray-900">
            Rekomendasi Restok Berdasarkan Ambang Batas
          </h3>
                    <p className="mb-3 text-sm text-gray-800">
                                            Berdasarkan barang yang stoknya sudah berada di bawah ambang batas minimum.
                                          </p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="border border-gray-300 p-3 rounded-md">
                <p className="text-sm text-gray-800 font-medium">Item Restok</p>
                <p className="text-xl font-bold text-gray-900">{restockSummary.totalItem}</p>
              </div>
              <div className="border border-gray-300 p-3 rounded-md">
                <p className="text-sm text-gray-800 font-medium">Rekomendasi Unit</p>
                <p className="text-xl font-bold text-gray-900">{restockSummary.totalUnit}</p>
              </div>
              <div className="border border-gray-300 p-3 rounded-md">
                <p className="text-sm text-gray-800 font-medium">Estimasi Budget</p>
                <p className="text-lg font-bold text-gray-900">{formatRupiah(restockSummary.estimasiBiaya)}</p>
              </div>
            </div>

          <Table>
                        <TableHeader className="border-b border-gray-300">
              <TableRow>
                <TableHead className="text-gray-900 font-bold">Barang</TableHead>
                <TableHead className="text-gray-900 font-bold">Kategori</TableHead>
                <TableHead className="text-right text-gray-900 font-bold">Stok</TableHead>
                <TableHead className="text-center text-gray-900 font-bold">Minimum</TableHead>
                <TableHead className="text-center text-gray-900 font-bold">Kekurangan</TableHead>
                <TableHead className="text-center text-gray-900 font-bold">Rekomendasi Beli</TableHead>
                <TableHead className="text-right text-gray-900 font-bold">Estimasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restockRecommendations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Tidak ada barang yang perlu restok
                  </TableCell>
                </TableRow>
              ) : (
                restockRecommendations.map((item) => (
                                    <TableRow key={item.barangId} className="border-b border-gray-200">
                    <TableCell>
                      <p className="font-semibold text-gray-900">{item.nama}</p>
                      <p className="text-xs text-gray-700 font-medium">{item.kodeBarang}</p>
                    </TableCell>
                    <TableCell>{item.kategoriNama}</TableCell>
                    <TableCell className="text-right">{item.stok} {item.satuan}</TableCell>
                    <TableCell className="text-center">{item.stokMinimum} {item.satuan}</TableCell>
                    <TableCell className="text-center">{item.kekurangan} {item.satuan}</TableCell>
                    <TableCell className="text-center font-semibold">{item.rekomendasiBeli} {item.satuan}</TableCell>
                    <TableCell className="text-right">{formatRupiah(item.estimasiBiaya)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

                        {/* Ringkasan Inventaris */}
        <div className="mb-8">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Ringkasan Inventaris</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-300 rounded-md p-4">
              <p className="text-xs text-gray-800 font-semibold">Stok Masuk</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalMasuk}</p>
            </div>
            <div className="bg-white border border-gray-300 rounded-md p-4">
              <p className="text-xs text-gray-800 font-semibold">Stok Keluar</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalKeluar}</p>
            </div>
            <div className="bg-white border border-gray-300 rounded-md p-4">
              <p className="text-xs text-gray-800 font-semibold">Nilai Masuk</p>
              <p className="text-base font-bold text-gray-900 mt-1">{formatRupiah(summary.nilaiMasuk)}</p>
            </div>
            <div className="bg-white border border-gray-300 rounded-md p-4">
              <p className="text-xs text-gray-800 font-semibold">Nilai Keluar</p>
              <p className="text-base font-bold text-gray-900 mt-1">{formatRupiah(summary.nilaiKeluar)}</p>
            </div>
            {/* Total Margin — emerald + font-black agar terbaca di cetak hitam-putih */}
            <div className="bg-emerald-50 border border-emerald-300 rounded-md p-4">
              <p className="text-xs text-emerald-800 font-black uppercase tracking-wide">Total Margin Penjualan</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{formatRupiah(serviceSummary.labaPeriodik)}</p>
              <p className="text-xs text-emerald-700 mt-0.5">{totalTransaksiMarginPeriodik} transaksi</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Riwayat Transaksi Barang</h3>
                    <div className="md:hidden space-y-3">
            {filteredTransaksiGabungan.length === 0 ? (
              <div className="rounded-sm border border-border-default py-8 text-center text-text-secondary">
                Tidak ada data transaksi
              </div>
            ) : (
              filteredTransaksiGabungan.map((transaksi, index) => (
                <div key={transaksi.id} className="rounded-sm border border-border-default p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-text-secondary">#{index + 1} - {formatDate(transaksi.createdAt)}</p>
                      <p className="font-semibold text-text-primary break-words">{transaksi.barangNama}</p>
                      <p className="text-xs text-text-secondary">{transaksi.barangKode}</p>
                                            {isServiceTransaction(transaksi) && (
                        <p className="text-xs text-status-info mt-1">{transaksi.keterangan}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={transaksi.tipe === 'masuk' ? 'bg-status-success/10 border-status-success/40 text-status-success shrink-0' : 'bg-status-danger/10 border-status-danger/40 text-status-danger shrink-0'}
                    >
                      {transaksi.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                    </Badge>
                  </div>
                                    <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary">Jumlah</p>
                      <p className="mt-1 font-medium text-text-primary">{transaksi.jumlah}</p>
                    </div>
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary">Harga</p>
                      <p className="mt-1 font-medium text-text-primary break-words">{formatRupiah(transaksi.hargaSatuan)}</p>
                    </div>
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary">Total</p>
                      <p className="mt-1 font-semibold text-text-primary break-words">{formatRupiah(transaksi.totalHarga)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block">
        <Table>
                    <TableHeader className="border-b border-gray-300">
            <TableRow>
              <TableHead className="text-gray-900 font-bold">No</TableHead>
              <TableHead className="text-gray-900 font-bold">Tanggal</TableHead>
              <TableHead className="text-gray-900 font-bold">Barang</TableHead>
              <TableHead className="text-gray-900 font-bold">Tipe</TableHead>
              <TableHead className="text-right text-gray-900 font-bold">Jumlah</TableHead>
              <TableHead className="text-right text-gray-900 font-bold">Harga</TableHead>
              <TableHead className="text-right text-gray-900 font-bold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransaksiGabungan.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Tidak ada data transaksi
                </TableCell>
              </TableRow>
            ) : (
                            filteredTransaksiGabungan.map((transaksi, index) => (
                <TableRow key={transaksi.id} className="border-b border-gray-200">
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{formatDate(transaksi.createdAt)}</TableCell>
                  <TableCell>
                    <p className="font-semibold text-gray-900">{transaksi.barangNama}</p>
                    <p className="text-xs text-gray-700 font-medium">{transaksi.barangKode}</p>
                                        {isServiceTransaction(transaksi) && (
                      <p className="text-xs text-gray-500 font-normal mt-0.5">{transaksi.keterangan}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm font-semibold">
                    {transaksi.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                  </TableCell>
                  <TableCell className="text-right">{transaksi.jumlah}</TableCell>
                  <TableCell className="text-right">{formatRupiah(transaksi.hargaSatuan)}</TableCell>
                  <TableCell className="text-right font-medium">{formatRupiah(transaksi.totalHarga)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
          </div>
        </div>

                                        {/* ── SECTION: SERVIS ── */}
        <div className="mt-10 mb-6 pt-3 border-t-4 border-gray-800">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">Servis</p>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Ringkasan Servis</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-300 rounded-md p-4">
              <p className="text-xs text-gray-800 font-semibold">Total Servis</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{serviceSummary.totalServis}</p>
            </div>
            <div className="bg-white border border-gray-300 rounded-md p-4">
              <p className="text-xs text-gray-800 font-semibold">Servis Selesai</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{serviceSummary.selesai}</p>
            </div>
            {/* Nilai Jasa — emerald + font-black agar terbaca di cetak hitam-putih */}
            <div className="bg-emerald-50 border border-emerald-300 rounded-md p-4">
              <p className="text-xs text-emerald-800 font-black uppercase tracking-wide">Nilai Jasa</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{formatRupiah(serviceSummary.totalBiayaJasa)}</p>
            </div>
          </div>
        </div>

                                <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Riwayat Transaksi Servis</h3>
          <div className="md:hidden space-y-3">
            {filteredServices.length === 0 ? (
              <div className="rounded-sm border border-border-default py-8 text-center text-text-secondary">
                Tidak ada data servis
              </div>
            ) : (
              filteredServices.map((service, index) => (
                <div key={service.id} className="rounded-sm border border-border-default p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-text-secondary">#{index + 1} - {formatDate(service.createdAt)}</p>
                      <p className="font-semibold text-text-primary">{service.namaPelanggan}</p>
                      <p className="text-xs text-text-secondary">{service.nomorHp}</p>
                    </div>
                    <Badge className={`${getServiceStatusBadgeClass(service.status)} shrink-0`}>
                      {getServiceStatusLabel(service.status)}
                    </Badge>
                  </div>
                                    <div className="rounded-sm bg-surface-muted p-3">
                    <p className="text-text-secondary text-sm">Perangkat</p>
                    <p className="mt-1 font-medium text-text-primary">{service.modelPerangkat}</p>
                    <p className="text-xs text-text-secondary">{service.jenisPerangkat}</p>
                  </div>
                  <div className="rounded-sm bg-surface-muted p-3">
                    <p className="text-text-secondary text-sm">Sparepart</p>
                    <p className="mt-1 text-sm text-text-primary break-words">
                      {service.sparepartDigunakan?.length
                        ? service.sparepartDigunakan.map((item) => `${item.namaProduk} x${item.jumlah}`).join(', ')
                        : '-'}
                    </p>
                  </div>
                  <div className="rounded-sm bg-surface-muted p-3">
                    <p className="text-text-secondary text-sm">Total</p>
                    <p className="mt-1 font-semibold text-text-primary">{getServiceSparepartTotal(service)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary text-sm">Biaya Jasa</p>
                      <p className="mt-1 font-semibold text-text-primary">{formatRupiah(service.biayaJasa ?? 0)}</p>
                    </div>
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary text-sm">Total Tagihan</p>
                      <p className="mt-1 font-semibold text-text-primary">{formatRupiah(getServiceTotalValue(service))}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

                    <div className="hidden md:block">
                    <Table>
            <TableHeader className="border-b border-gray-300">
              <TableRow>
                <TableHead className="text-gray-900 font-bold">No Nota</TableHead>
                <TableHead className="text-gray-900 font-bold">Tanggal Serah</TableHead>
                <TableHead className="text-gray-900 font-bold">Pelanggan</TableHead>
                <TableHead className="text-gray-900 font-bold">Perangkat</TableHead>
                <TableHead className="text-gray-900 font-bold">Sparepart</TableHead>
                <TableHead className="text-right text-gray-900 font-bold">Biaya Jasa</TableHead>
                <TableHead className="text-right text-gray-900 font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Tidak ada data servis
                  </TableCell>
                </TableRow>
                            ) : (
                filteredServices.map((service) => (
                  <TableRow key={service.id} className="border-b border-gray-200">
                    <TableCell className="font-mono text-sm">{service.noNota ?? '-'}</TableCell>
                    <TableCell>{formatDate(service.pickedUpAt ?? service.updatedAt ?? service.createdAt)}</TableCell>
                    <TableCell>
                      <p className="font-semibold text-gray-900">{service.namaPelanggan}</p>
                      <p className="text-xs text-gray-700 font-medium">{service.nomorHp}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-gray-900">{service.modelPerangkat}</p>
                      <p className="text-xs text-gray-700 font-medium">{service.jenisPerangkat}</p>
                    </TableCell>
                    <TableCell>
                      {service.sparepartDigunakan?.length
                        ? service.sparepartDigunakan.map((item) => `${item.namaProduk} x${item.jumlah}`).join(', ')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(service.biayaJasa ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(getServiceTotalValue(service))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </div>

                {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
                        <p>Laporan ini digenerate secara otomatis dari sistem inventaris dan servis</p>
        </div>
        </div>
      </div>
    </div>
  );
}
