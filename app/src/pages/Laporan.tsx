// ============================================
// PAGE - Laporan dengan Export PDF
// ============================================

import { useMemo, useRef, useState } from 'react';
import { useTransaksi } from '@/hooks/useTransaksi';
import { useBarang } from '@/hooks/useBarang';
import { useServices } from '@/hooks/useServices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { FileDown, ShoppingCart } from 'lucide-react';
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
  buffer: number;
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
    const serviceDate = toDate(service.createdAt);

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
      const margin = barang ? barang.hargaJual - barang.hargaBeli : 0;
      return sum + (margin * transaksi.jumlah);
    }, 0);

  const labaServisDiambil = filteredServices
    .filter((service) => service.status === 'diambil')
    .reduce((sum, service) => {
      const nilaiSparepart = (service.sparepartDigunakan ?? []).reduce((subtotal, item) => {
        const barang = barangList.find((product) => product.id === item.productId);
        const hargaSatuan = barang?.hargaJual ?? 0;
        return subtotal + (hargaSatuan * item.jumlah);
      }, 0);
      return sum + (service.biayaJasa ?? 0) + nilaiSparepart;
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
      .filter((barang) => barang.stokMinimum > 0 && barang.stok <= barang.stokMinimum)
      .map((barang) => {
        const kekurangan = Math.max(barang.stokMinimum - barang.stok, 0);
        const buffer = Math.max(1, Math.ceil(barang.stokMinimum * 0.5));
        const rekomendasiBeli = kekurangan + buffer;

        return {
          barangId: barang.id,
          kodeBarang: barang.kodeBarang,
          nama: barang.nama,
          kategoriNama: barang.kategoriNama ?? '-',
          satuan: barang.satuan,
          stok: barang.stok,
          stokMinimum: barang.stokMinimum,
          kekurangan,
          buffer,
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
        return 'bg-slate-100 text-slate-700';
      case 'proses':
        return 'bg-blue-100 text-blue-700';
      case 'menunggu-sparepart':
        return 'bg-amber-100 text-amber-700';
      case 'selesai':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-slate-100 text-slate-700';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Laporan</h1>
          <p className="text-sm text-gray-400 mt-0.5">Generate dan export laporan transaksi</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button onClick={exportPDF} size="sm" variant="outline" className="w-full sm:w-auto">
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Dari Tanggal</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Sampai Tanggal</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Tipe Transaksi</Label>
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
          <Label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Kategori</Label>
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
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ringkasan Inventaris</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Stok Masuk</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{summary.totalMasuk}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Stok Keluar</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{summary.totalKeluar}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Nilai Masuk</p>
            <p className="text-base font-bold text-gray-800 mt-1">{formatRupiah(summary.nilaiMasuk)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Nilai Keluar</p>
            <p className="text-base font-bold text-gray-800 mt-1">{formatRupiah(summary.nilaiKeluar)}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards - Servis */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ringkasan Servis</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Total Servis</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{serviceSummary.totalServis}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Belum Selesai</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {serviceSummary.pending + serviceSummary.proses + serviceSummary.menungguSparepart}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Servis Selesai</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{serviceSummary.selesai}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Sparepart Terpakai</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{serviceSummary.totalSparepart}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Nilai Jasa</p>
            <p className="text-base font-bold text-gray-800 mt-1">{formatRupiah(serviceSummary.totalBiayaJasa)}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards - Laba Periode */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Total Margin Penjualan</p>
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800 mt-1">{formatRupiah(serviceSummary.labaPeriodik)}</p>
                <p className="text-xs text-gray-400 mt-1">{totalTransaksiMarginPeriodik} transaksi</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rekomendasi Restok */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <ShoppingCart className="h-5 w-5 text-red-600" />
              Rekomendasi Restok
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Berdasarkan barang yang stoknya sudah mencapai atau berada di bawah ambang batas minimum.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-400">Item Perlu Restok</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{restockSummary.totalItem}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-400">Rekomendasi Unit</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{restockSummary.totalUnit}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-400">Estimasi Budget</p>
            <p className="mt-1 text-base font-bold text-gray-900">{formatRupiah(restockSummary.estimasiBiaya)}</p>
          </div>
        </div>

        {restockRecommendations.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-center">
            <p className="font-medium text-emerald-700">Semua stok masih di atas ambang batas minimum.</p>
            <p className="mt-1 text-sm text-emerald-700/80">Belum ada barang yang perlu direstok dari filter saat ini.</p>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-3 md:hidden">
              {restockRecommendations.map((item) => (
                <div key={item.barangId} className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">{item.kodeBarang}</p>
                  <p className="font-semibold text-gray-900">{item.nama}</p>
                  <p className="text-xs text-gray-500">{item.kategoriNama}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Stok</p>
                      <p className="font-semibold text-gray-900">{item.stok}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Minimum</p>
                      <p className="font-semibold text-gray-900">{item.stokMinimum}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Buffer</p>
                      <p className="font-semibold text-gray-900">{item.buffer}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Beli</p>
                      <p className="font-semibold text-red-600">{item.rekomendasiBeli}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    Kekurangan {item.kekurangan} {item.satuan}, buffer {item.buffer} {item.satuan}. Estimasi {formatRupiah(item.estimasiBiaya)}.
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
                    <TableHead className="text-center">Stok Pengaman</TableHead>
                    <TableHead className="text-center">Rekomendasi Beli</TableHead>
                    <TableHead className="text-right">Estimasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restockRecommendations.map((item) => (
                    <TableRow key={item.barangId}>
                      <TableCell>
                        <p className="font-medium text-gray-900">{item.nama}</p>
                        <p className="text-xs text-gray-500">{item.kodeBarang}</p>
                      </TableCell>
                      <TableCell>{item.kategoriNama}</TableCell>
                      <TableCell className="text-right">{item.stok} {item.satuan}</TableCell>
                      <TableCell className="text-center">{item.stokMinimum} {item.satuan}</TableCell>
                      <TableCell className="text-center">{item.kekurangan} {item.satuan}</TableCell>
                      <TableCell className="text-center">{item.buffer} {item.satuan}</TableCell>
                      <TableCell className="text-center font-semibold text-red-600">
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
        <div ref={reportRef} className="bg-white p-4 md:p-8">
        {/* Report Header */}
        <div className="text-center mb-8 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-900">LAPORAN INVENTARIS & SERVIS</h2>
          <p className="text-gray-500 mt-1">
            Periode: {startDate ? new Date(startDate).toLocaleDateString('id-ID') : 'Semua'} - {endDate ? new Date(endDate).toLocaleDateString('id-ID') : 'Semua'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Dicetak pada: {new Date().toLocaleDateString('id-ID', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        <div className="mb-8">
          <h3 className="mb-1 text-lg font-semibold text-gray-900">
            Rekomendasi Restok Berdasarkan Ambang Batas
          </h3>
          <p className="mb-3 text-sm text-gray-500">
            Barang dengan stok saat ini kurang dari atau sama dengan stok minimum.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="border p-3 rounded">
              <p className="text-sm text-gray-500">Item Restok</p>
              <p className="text-xl font-bold">{restockSummary.totalItem}</p>
            </div>
            <div className="border p-3 rounded">
              <p className="text-sm text-gray-500">Rekomendasi Unit</p>
              <p className="text-xl font-bold">{restockSummary.totalUnit}</p>
            </div>
            <div className="border p-3 rounded">
              <p className="text-sm text-gray-500">Estimasi Budget</p>
              <p className="text-lg font-bold">{formatRupiah(restockSummary.estimasiBiaya)}</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barang</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-center">Minimum</TableHead>
                <TableHead className="text-center">Kekurangan</TableHead>
                <TableHead className="text-center">Buffer Aman</TableHead>
                <TableHead className="text-center">Rekomendasi Beli</TableHead>
                <TableHead className="text-right">Estimasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restockRecommendations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Tidak ada barang yang perlu restok
                  </TableCell>
                </TableRow>
              ) : (
                restockRecommendations.map((item) => (
                  <TableRow key={item.barangId}>
                    <TableCell>
                      <p className="font-medium">{item.nama}</p>
                      <p className="text-xs text-gray-500">{item.kodeBarang}</p>
                    </TableCell>
                    <TableCell>{item.kategoriNama}</TableCell>
                    <TableCell className="text-right">{item.stok} {item.satuan}</TableCell>
                    <TableCell className="text-center">{item.stokMinimum} {item.satuan}</TableCell>
                    <TableCell className="text-center">{item.kekurangan} {item.satuan}</TableCell>
                    <TableCell className="text-center">{item.buffer} {item.satuan}</TableCell>
                    <TableCell className="text-center font-semibold">{item.rekomendasiBeli} {item.satuan}</TableCell>
                    <TableCell className="text-right">{formatRupiah(item.estimasiBiaya)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Total Margin Penjualan */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">Ringkasan Inventaris</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Stok Masuk</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{summary.totalMasuk}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Stok Keluar</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{summary.totalKeluar}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Nilai Masuk</p>
            <p className="text-base font-bold text-gray-800 mt-1">{formatRupiah(summary.nilaiMasuk)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Nilai Keluar</p>
            <p className="text-base font-bold text-gray-800 mt-1">{formatRupiah(summary.nilaiKeluar)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Total Margin Penjualan</p>
            <p className="text-base font-bold text-gray-800 mt-1">{formatRupiah(serviceSummary.labaPeriodik)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Total Transaksi</p>
            <p className="text-base font-bold text-gray-800 mt-1">{totalTransaksiMarginPeriodik} transaksi</p>
          </div>
        </div>
      </div>

        <div className="mb-8">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Transaksi Stok</h3>
          <div className="md:hidden space-y-3">
            {filteredTransaksiGabungan.length === 0 ? (
              <div className="rounded-lg border py-8 text-center text-gray-500">
                Tidak ada data transaksi
              </div>
            ) : (
              filteredTransaksiGabungan.map((transaksi, index) => (
                <div key={transaksi.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">#{index + 1} - {formatDate(transaksi.createdAt)}</p>
                      <p className="font-semibold text-gray-900 break-words">{transaksi.barangNama}</p>
                      <p className="text-xs text-gray-500">{transaksi.barangKode}</p>
                      {isServiceTransaction(transaksi) && (
                        <p className="text-xs text-blue-600 mt-1">{transaksi.keterangan}</p>
                      )}
                    </div>
                    <Badge
                      variant={transaksi.tipe === 'masuk' ? 'default' : 'destructive'}
                      className={transaksi.tipe === 'masuk' ? 'bg-green-100 text-green-700 shrink-0' : 'bg-red-100 text-red-700 shrink-0'}
                    >
                      {transaksi.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Jumlah</p>
                      <p className="mt-1 font-medium">{transaksi.jumlah}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Harga</p>
                      <p className="mt-1 font-medium break-words">{formatRupiah(transaksi.hargaSatuan)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Total</p>
                      <p className="mt-1 font-semibold break-words">{formatRupiah(transaksi.totalHarga)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Barang</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead className="text-right">Total</TableHead>
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
                <TableRow key={transaksi.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{formatDate(transaksi.createdAt)}</TableCell>
                  <TableCell>
                    <p className="font-medium">{transaksi.barangNama}</p>
                    <p className="text-xs text-gray-500">{transaksi.barangKode}</p>
                    {isServiceTransaction(transaksi) && (
                      <p className="text-xs text-blue-600">{transaksi.keterangan}</p>
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

        <div className="mb-8">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Ringkasan Servis</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-400 font-medium">Total Servis</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{serviceSummary.totalServis}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-400 font-medium">Servis Selesai</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{serviceSummary.selesai}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-400 font-medium">Nilai Jasa</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{formatRupiah(serviceSummary.totalBiayaJasa)}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Manajemen Servis</h3>
          <div className="md:hidden space-y-3">
            {filteredServices.length === 0 ? (
              <div className="rounded-lg border py-8 text-center text-gray-500">
                Tidak ada data servis
              </div>
            ) : (
              filteredServices.map((service, index) => (
                <div key={service.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">#{index + 1} - {formatDate(service.createdAt)}</p>
                      <p className="font-semibold text-gray-900">{service.namaPelanggan}</p>
                      <p className="text-xs text-gray-500">{service.nomorHp}</p>
                    </div>
                    <Badge className={`${getServiceStatusBadgeClass(service.status)} shrink-0`}>
                      {getServiceStatusLabel(service.status)}
                    </Badge>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500 text-sm">Perangkat</p>
                    <p className="mt-1 font-medium text-gray-900">{service.modelPerangkat}</p>
                    <p className="text-xs text-gray-500">{service.jenisPerangkat}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500 text-sm">Sparepart</p>
                    <p className="mt-1 text-sm text-gray-900 break-words">
                      {service.sparepartDigunakan?.length
                        ? service.sparepartDigunakan.map((item) => `${item.namaProduk} x${item.jumlah}`).join(', ')
                        : '-'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500 text-sm">Total</p>
                    <p className="mt-1 font-semibold text-gray-900">{getServiceSparepartTotal(service)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500 text-sm">Biaya Jasa</p>
                      <p className="mt-1 font-semibold text-gray-900">{formatRupiah(service.biayaJasa ?? 0)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500 text-sm">Total Tagihan</p>
                      <p className="mt-1 font-semibold text-gray-900">{formatRupiah(getServiceTotalValue(service))}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pelanggan</TableHead>
              <TableHead>Perangkat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sparepart</TableHead>
              <TableHead className="text-right">Biaya Jasa</TableHead>
              <TableHead className="text-right">Total Tagihan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Tidak ada data servis
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((service, index) => (
                  <TableRow key={service.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{formatDate(service.createdAt)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{service.namaPelanggan}</p>
                      <p className="text-xs text-gray-500">{service.nomorHp}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{service.modelPerangkat}</p>
                      <p className="text-xs text-gray-500">{service.jenisPerangkat}</p>
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold">
                      {getServiceStatusLabel(service.status)}
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
          <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
            <p>Laporan ini digenerate secara otomatis dari sistem inventaris dan servis</p>
          </div>
        </div>
      </div>
    </div>
  );
}
