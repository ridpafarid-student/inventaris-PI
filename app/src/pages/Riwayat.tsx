// ============================================
// PAGE - Riwayat Transaksi
// ============================================

import { useState } from 'react';
import { useTransaksi } from '@/hooks/useTransaksi';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownLeft, ArrowUpRight, Search, Calendar, User, History } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import type { TransaksiStok } from '@/types';

export default function Riwayat() {
  const { transaksiList, loading } = useTransaksi();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipe, setFilterTipe] = useState<string>('all');

  const filteredTransaksi = transaksiList.filter(transaksi => {
    const matchesSearch =
      transaksi.barangNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaksi.barangKode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaksi.userName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTipe = filterTipe === 'all' || transaksi.tipe === filterTipe;
    return matchesSearch && matchesTipe;
  });

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (timestamp: TransaksiStok['createdAt']) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Riwayat Transaksi</h1>
        <p className="text-gray-500">Lihat semua riwayat perubahan stok</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari barang atau user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTipe} onValueChange={setFilterTipe}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="masuk">Stok Masuk</SelectItem>
                <SelectItem value="keluar">Stok Keluar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="md:hidden divide-y">
            {loading ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : filteredTransaksi.length === 0 ? (
              <div className="py-8 text-center">
                <History className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">Tidak ada riwayat transaksi</p>
              </div>
            ) : (
              filteredTransaksi.map((transaksi) => (
                <div key={transaksi.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 break-words">{transaksi.barangNama}</p>
                      <p className="text-xs text-gray-500">{transaksi.barangKode}</p>
                    </div>
                    <Badge
                      variant={transaksi.tipe === 'masuk' ? 'default' : 'destructive'}
                      className={transaksi.tipe === 'masuk' ? 'bg-green-100 text-green-700 hover:bg-green-100 shrink-0' : 'bg-red-100 text-red-700 hover:bg-red-100 shrink-0'}
                    >
                      {transaksi.tipe === 'masuk' ? (
                        <ArrowDownLeft className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                      )}
                      {transaksi.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Waktu</p>
                      <p className="mt-1 font-medium text-gray-900">{formatDate(transaksi.createdAt)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Jumlah</p>
                      <p className="mt-1 font-medium text-gray-900">{transaksi.jumlah}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Stok</p>
                      <p className="mt-1 font-medium text-gray-900">{transaksi.stokSebelum} ke {transaksi.stokSesudah}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Total</p>
                      <p className="mt-1 font-medium text-gray-900 break-words">{formatRupiah(transaksi.totalHarga)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="w-4 h-4" />
                    <span>{transaksi.userName}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Oleh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransaksi.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <History className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">Tidak ada riwayat transaksi</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransaksi.map((transaksi) => (
                    <TableRow key={transaksi.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{formatDate(transaksi.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaksi.barangNama}</p>
                          <p className="text-xs text-gray-500">{transaksi.barangKode}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={transaksi.tipe === 'masuk' ? 'default' : 'destructive'}
                          className={transaksi.tipe === 'masuk' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}
                        >
                          {transaksi.tipe === 'masuk' ? (
                            <ArrowDownLeft className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                          )}
                          {transaksi.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {transaksi.jumlah}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm text-gray-500">
                          {transaksi.stokSebelum} →
                        </span>
                        <span className="font-medium ml-1">
                          {transaksi.stokSesudah}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatRupiah(transaksi.totalHarga)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{transaksi.userName}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowDownLeft className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700">Total Stok Masuk</p>
                <p className="text-xl font-bold text-green-800">
                  {filteredTransaksi
                    .filter(t => t.tipe === 'masuk')
                    .reduce((sum, t) => sum + t.jumlah, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-700">Total Stok Keluar</p>
                <p className="text-xl font-bold text-red-800">
                  {filteredTransaksi
                    .filter(t => t.tipe === 'keluar')
                    .reduce((sum, t) => sum + t.jumlah, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
