// ============================================
// PAGE - Laporan dengan Export PDF
// ============================================

import { useState, useRef } from 'react';
import { useTransaksi } from '@/hooks/useTransaksi';
import { useBarang } from '@/hooks/useBarang';
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
import { FileDown } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


export default function Laporan() {
  const { transaksiList } = useTransaksi();
  const { kategoriList, barangList } = useBarang();
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

  // Calculate summary
  const summary = {
    totalMasuk: filteredTransaksi
      .filter(t => t.tipe === 'masuk')
      .reduce((sum, t) => sum + t.jumlah, 0),
    totalKeluar: filteredTransaksi
      .filter(t => t.tipe === 'keluar')
      .reduce((sum, t) => sum + t.jumlah, 0),
    nilaiMasuk: filteredTransaksi
      .filter(t => t.tipe === 'masuk')
      .reduce((sum, t) => sum + t.totalHarga, 0),
    nilaiKeluar: filteredTransaksi
      .filter(t => t.tipe === 'keluar')
      .reduce((sum, t) => sum + t.totalHarga, 0),
  };

  // Format currency
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (timestamp: any) => {
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
        
        <Button onClick={exportPDF} className="w-full sm:w-auto">
          <FileDown className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
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

      {/* Report Content (for PDF export) */}
      <div ref={reportRef} className="bg-white p-8">
        {/* Report Header */}
        <div className="text-center mb-8 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-900">LAPORAN INVENTARIS BARANG</h2>
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
            <p className="text-xl font-bold">{filteredTransaksi.length}</p>
          </div>
          <div className="border p-3 rounded">
            <p className="text-sm text-gray-500">Total Nilai</p>
            <p className="text-xl font-bold">{formatRupiah(summary.nilaiMasuk + summary.nilaiKeluar)}</p>
          </div>
        </div>

        {/* Table */}
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
            {filteredTransaksi.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Tidak ada data transaksi
                </TableCell>
              </TableRow>
            ) : (
              filteredTransaksi.map((transaksi, index) => (
                <TableRow key={transaksi.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{formatDate(transaksi.createdAt)}</TableCell>
                  <TableCell>
                    <p className="font-medium">{transaksi.barangNama}</p>
                    <p className="text-xs text-gray-500">{transaksi.barangKode}</p>
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

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
          <p>Laporan ini digenerate secara otomatis dari sistem inventaris</p>
        </div>
      </div>
    </div>
  );
}
