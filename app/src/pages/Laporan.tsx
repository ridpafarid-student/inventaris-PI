// ============================================
// PAGE - Laporan dengan Export PDF
// ============================================

import { useState, useRef } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ServiceItem, ServiceStatus, TransaksiStok } from '@/types';
import * as XLSX from 'xlsx';


export default function Laporan() {
  const { transaksiList } = useTransaksi();
  const { kategoriList, barangList } = useBarang();
  const { services } = useServices();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterTipe, setFilterTipe] = useState<string>('all');
  const [filterKategori, setFilterKategori] = useState<string>('all');

  const filteredTransaksi = transaksiList.filter(transaksi => {
    const tDate = transaksi.createdAt instanceof Timestamp
      ? transaksi.createdAt.toDate()
      : new Date(transaksi.createdAt);
    const barang = barangList.find((item) => item.id === transaksi.barangId);

    const matchesStart = !startDate || tDate >= new Date(startDate);
    const matchesEnd = !endDate || tDate <= new Date(endDate + 'T23:59:59');
    const matchesTipe = filterTipe === 'all' || transaksi.tipe === filterTipe;
    const matchesKategori =
      filterKategori === 'all' || barang?.kategoriId === filterKategori;

    return matchesStart && matchesEnd && matchesTipe && matchesKategori;
  });

  const filteredServices = services.filter((service) => {
    const serviceDate = service.createdAt instanceof Timestamp
      ? service.createdAt.toDate()
      : new Date(service.createdAt);

    const matchesStart = !startDate || serviceDate >= new Date(startDate);
    const matchesEnd = !endDate || serviceDate <= new Date(endDate + 'T23:59:59');

    return matchesStart && matchesEnd;
  });

  const serviceStockTransaksi = filteredServices.flatMap((service) =>
    (service.sparepartDigunakan ?? [])
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
      (total, service) => total + (service.sparepartDigunakan?.reduce((sum, item) => sum + item.jumlah, 0) ?? 0),
      0
    ),
  };

  const getServiceSparepartTotal = (service: ServiceItem) =>
    service.sparepartDigunakan?.reduce((sum, item) => sum + item.jumlah, 0) ?? 0;

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

  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet([
      {
        periodeMulai: startDate || 'Semua',
        periodeSelesai: endDate || 'Semua',
        totalTransaksi: filteredTransaksiGabungan.length,
        totalStokMasuk: summary.totalMasuk,
        totalStokKeluar: summary.totalKeluar,
        nilaiMasuk: summary.nilaiMasuk,
        nilaiKeluar: summary.nilaiKeluar,
        totalServis: serviceSummary.totalServis,
        servisPending: serviceSummary.pending,
        servisProses: serviceSummary.proses,
        servisMenungguSparepart: serviceSummary.menungguSparepart,
        servisSelesai: serviceSummary.selesai,
        totalSparepartTerpakai: serviceSummary.totalSparepart,
      },
    ]);

    const transaksiSheet = XLSX.utils.json_to_sheet(
      filteredTransaksiGabungan.map((transaksi, index) => ({
        no: index + 1,
        tanggal: formatDate(transaksi.createdAt),
        barang: transaksi.barangNama,
        kodeBarang: transaksi.barangKode,
        tipe: transaksi.tipe === 'masuk' ? 'Masuk' : 'Keluar',
        jumlah: transaksi.jumlah,
        stokSebelum: transaksi.stokSebelum,
        stokSesudah: transaksi.stokSesudah,
        hargaSatuan: transaksi.hargaSatuan,
        totalHarga: transaksi.totalHarga,
        keterangan: transaksi.keterangan,
        user: transaksi.userName,
        sumber: transaksi.userName === 'Servis' ? 'Servis' : 'Transaksi Stok',
      }))
    );

    const servicesSheet = XLSX.utils.json_to_sheet(
      filteredServices.map((service, index) => ({
        no: index + 1,
        tanggalMasuk: formatDate(service.createdAt),
        pelanggan: service.namaPelanggan,
        nomorHp: service.nomorHp,
        jenisPerangkat: service.jenisPerangkat,
        modelPerangkat: service.modelPerangkat,
        deskripsiMasalah: service.deskripsiMasalah,
        status: getServiceStatusLabel(service.status),
        sparepart: service.sparepartDigunakan?.length
          ? service.sparepartDigunakan.map((item) => `${item.namaProduk} x${item.jumlah}`).join(', ')
          : '-',
        totalSparepart: getServiceSparepartTotal(service),
        stokDikurangi: service.stokDikurangi ? 'Ya' : 'Belum',
        terakhirUpdate: formatDate(service.updatedAt),
      }))
    );

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');
    XLSX.utils.book_append_sheet(workbook, transaksiSheet, 'Transaksi');
    XLSX.utils.book_append_sheet(workbook, servicesSheet, 'Servis');

    const fileName = `Laporan_Inventaris_Servis_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
          <p className="text-gray-500">Generate dan export laporan transaksi</p>
        </div>
        
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button onClick={exportExcel} variant="outline" className="w-full sm:w-auto">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={exportPDF} className="w-full sm:w-auto">
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Dari Tanggal</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sampai Tanggal</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipe Transaksi</Label>
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
            <div className="space-y-2">
              <Label>Kategori</Label>
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
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-green-700">Total Stok Masuk</p>
            <p className="text-2xl font-bold text-green-800">{summary.totalMasuk}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-sm text-red-700">Total Stok Keluar</p>
            <p className="text-2xl font-bold text-red-800">{summary.totalKeluar}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-700">Nilai Masuk</p>
            <p className="text-lg font-bold text-blue-800">{formatRupiah(summary.nilaiMasuk)}</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <p className="text-sm text-purple-700">Nilai Keluar</p>
            <p className="text-lg font-bold text-purple-800">{formatRupiah(summary.nilaiKeluar)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-sky-50 border-sky-200">
          <CardContent className="p-4">
            <p className="text-sm text-sky-700">Total Servis</p>
            <p className="text-2xl font-bold text-sky-800">{serviceSummary.totalServis}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Belum Selesai</p>
            <p className="text-2xl font-bold text-amber-800">
              {serviceSummary.pending + serviceSummary.proses + serviceSummary.menungguSparepart}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4">
            <p className="text-sm text-emerald-700">Servis Selesai</p>
            <p className="text-2xl font-bold text-emerald-800">{serviceSummary.selesai}</p>
          </CardContent>
        </Card>
        <Card className="bg-violet-50 border-violet-200">
          <CardContent className="p-4">
            <p className="text-sm text-violet-700">Sparepart Terpakai</p>
            <p className="text-2xl font-bold text-violet-800">{serviceSummary.totalSparepart}</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Content (for PDF export) */}
      <div ref={reportRef} className="bg-white p-8">
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

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border p-3 rounded">
            <p className="text-sm text-gray-500">Total Transaksi</p>
            <p className="text-xl font-bold">{filteredTransaksiGabungan.length}</p>
          </div>
          <div className="border p-3 rounded">
            <p className="text-sm text-gray-500">Total Nilai</p>
            <p className="text-xl font-bold">{formatRupiah(summary.nilaiMasuk + summary.nilaiKeluar)}</p>
          </div>
          <div className="border p-3 rounded">
            <p className="text-sm text-gray-500">Total Servis</p>
            <p className="text-xl font-bold">{serviceSummary.totalServis}</p>
          </div>
          <div className="border p-3 rounded">
            <p className="text-sm text-gray-500">Servis Selesai</p>
            <p className="text-xl font-bold">{serviceSummary.selesai}</p>
          </div>
        </div>

        {/* Table */}
        <div className="mb-8">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Transaksi Stok</h3>
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
                    {transaksi.userName === 'Servis' && (
                      <p className="text-xs text-blue-600">{transaksi.keterangan}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={transaksi.tipe === 'masuk' ? 'default' : 'destructive'}
                      className={transaksi.tipe === 'masuk' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                    >
                      {transaksi.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                    </Badge>
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

        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Manajemen Servis</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pelanggan</TableHead>
              <TableHead>Perangkat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sparepart</TableHead>
              <TableHead className="text-right">Total</TableHead>
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
                    <TableCell>
                      <Badge className={getServiceStatusBadgeClass(service.status)}>
                        {getServiceStatusLabel(service.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {service.sparepartDigunakan?.length
                        ? service.sparepartDigunakan.map((item) => `${item.namaProduk} x${item.jumlah}`).join(', ')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {getServiceSparepartTotal(service)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
          <p>Laporan ini digenerate secara otomatis dari sistem inventaris dan servis</p>
        </div>
      </div>
    </div>
  );
}
