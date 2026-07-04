// ============================================
// PAGE - Riwayat Transaksi
// ============================================

import { useMemo, useState } from 'react';
import { useBarang } from '@/hooks/useBarang';
import { useServices } from '@/hooks/useServices';
import { useTransaksi } from '@/hooks/useTransaksi';
import { useAuth } from '@/contexts/AuthContext';
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
  const { transaksiList, loading: loadingTransaksi } = useTransaksi();
  const { services, loading: loadingServices } = useServices();
  const { barangList } = useBarang();
  const { isTeknisi } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipe, setFilterTipe] = useState<string>('all');
  const shouldHideFinancials = isTeknisi;
  const officialServiceTransactionIds = useMemo(
    () => new Set(transaksiList.map((transaksi) => transaksi.serviceId).filter(Boolean)),
    [transaksiList]
  );

  const serviceStockTransaksi = useMemo(() => (
    services.flatMap((service) =>
      service.status !== 'diambil' || officialServiceTransactionIds.has(service.id)
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
              userName: `Servis (${service.modelPerangkat})`,
              source: 'service' as const,
              serviceId: service.id,
              createdAt: service.updatedAt ?? service.createdAt,
            };
          })
    )
  ), [barangList, officialServiceTransactionIds, services]);

  const allTransaksi = useMemo(() => (
    [...transaksiList, ...serviceStockTransaksi].sort((a, b) => {
      const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    })
  ), [serviceStockTransaksi, transaksiList]);

  const loading = loadingTransaksi || loadingServices;

  const filteredTransaksi = allTransaksi.filter(transaksi => {
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
      <div className="pb-4 border-b border-border-default">
        <h1 className="text-xl font-semibold text-text-primary">Riwayat Transaksi</h1>
        <p className="text-sm text-text-secondary mt-0.5">Menampilkan seluruh riwayat transaksi barang masuk dan barang keluar.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="md:hidden divide-y">
                        {loading ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text-inverse mx-auto"></div>
              </div>
            ) : filteredTransaksi.length === 0 ? (
              <div className="py-8 text-center">
                <History className="w-12 h-12 mx-auto text-text-secondary/30 mb-2" />
                <p className="text-text-secondary">Tidak ada riwayat transaksi</p>
              </div>
            ) : (
              filteredTransaksi.map((transaksi) => (
                <div key={transaksi.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                      <p className="font-semibold text-text-primary break-words">{transaksi.barangNama}</p>
                      <p className="text-xs text-text-secondary">{transaksi.barangKode}</p>
                    </div>
                                        <Badge
                      variant={transaksi.tipe === 'masuk' ? 'default' : 'destructive'}
                      className={transaksi.tipe === 'masuk' ? 'bg-status-success/10 text-status-success hover:bg-status-success/10 shrink-0' : 'bg-status-danger/10 text-status-danger hover:bg-status-danger/10 shrink-0'}
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
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary">Waktu</p>
                      <p className="mt-1 font-medium text-text-primary">{formatDate(transaksi.createdAt)}</p>
                    </div>
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary">Jumlah</p>
                      <p className="mt-1 font-medium text-text-primary">{transaksi.jumlah}</p>
                    </div>
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary">Stok</p>
                      <p className="mt-1 font-medium text-text-primary">{transaksi.stokSebelum} ke {transaksi.stokSesudah}</p>
                    </div>
                    {!shouldHideFinancials && (
                      <div className="rounded-sm bg-surface-muted p-3">
                        <p className="text-text-secondary">Total</p>
                        <p className="mt-1 font-medium text-text-primary break-words">{formatRupiah(transaksi.totalHarga)}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <User className="w-4 h-4" />
                    <span>{transaksi.userName}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table className="min-w-full table-fixed">
              {shouldHideFinancials ? (
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[34%]" />
                  <col className="w-[9%]" />
                  <col className="w-[8%]" />
                  <col className="w-[10%]" />
                  <col className="w-[21%]" />
                </colgroup>
              ) : (
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[26%]" />
                  <col className="w-[7%]" />
                  <col className="w-[6%]" />
                  <col className="w-[8%]" />
                  <col className="w-[15%]" />
                  <col className="w-[22%]" />
                </colgroup>
              )}
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Waktu</TableHead>
                  <TableHead className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Barang</TableHead>
                  <TableHead className="px-1 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipe</TableHead>
                  <TableHead className="px-1 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Jumlah</TableHead>
                  <TableHead className="px-1 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Stok</TableHead>
                  {!shouldHideFinancials && (
                    <TableHead className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</TableHead>
                  )}
                  <TableHead className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Oleh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={shouldHideFinancials ? 6 : 7} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransaksi.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={shouldHideFinancials ? 6 : 7} className="text-center py-8">
                      <History className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">Tidak ada riwayat transaksi</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransaksi.map((transaksi) => (
                    <TableRow key={transaksi.id}>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{formatDate(transaksi.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal text-center">
                        <div className="mx-auto max-w-full">
                          <p className="break-words font-medium leading-snug">{transaksi.barangNama}</p>
                          <p className="text-xs text-gray-500">{transaksi.barangKode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-1 text-center">
                        <Badge 
                          variant={transaksi.tipe === 'masuk' ? 'default' : 'destructive'}
                          className={transaksi.tipe === 'masuk' ? 'bg-status-success/10 border-status-success/40 text-status-success' : 'bg-status-danger/10 border-status-danger/40 text-status-danger'}
                        >
                          {transaksi.tipe === 'masuk' ? (
                            <ArrowDownLeft className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                          )}
                          {transaksi.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-1 text-center font-medium tabular-nums">
                        {transaksi.jumlah}
                      </TableCell>
                      <TableCell className="px-1 text-center tabular-nums">
                        <span className="text-sm text-gray-500">
                          {transaksi.stokSebelum} →
                        </span>
                        <span className="font-medium ml-1">
                          {transaksi.stokSesudah}
                        </span>
                      </TableCell>
                      {!shouldHideFinancials && (
                        <TableCell className="px-2 py-2 text-center font-medium tabular-nums">
                          {formatRupiah(transaksi.totalHarga)}
                        </TableCell>
                      )}
                      <TableCell className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-2 whitespace-normal">
                          <User className="w-4 h-4 shrink-0 text-gray-400" />
                          <span className="text-sm break-words text-center">{transaksi.userName}</span>
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
            <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-base border border-border-default rounded-sm p-4 flex items-center gap-3">
          <div className="p-2 bg-surface-muted rounded-sm">
            <ArrowDownLeft className="w-4 h-4 text-text-secondary" />
          </div>
          <div>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Masuk</p>
            <p className="text-xl font-bold text-text-primary">
              {filteredTransaksi
                .filter(t => t.tipe === 'masuk')
                .reduce((sum, t) => sum + t.jumlah, 0)}
            </p>
          </div>
        </div>

        <div className="bg-surface-base border border-border-default rounded-sm p-4 flex items-center gap-3">
          <div className="p-2 bg-surface-muted rounded-sm">
            <ArrowUpRight className="w-4 h-4 text-text-secondary" />
          </div>
          <div>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Keluar</p>
            <p className="text-xl font-bold text-text-primary">
              {filteredTransaksi
                .filter(t => t.tipe === 'keluar')
                .reduce((sum, t) => sum + t.jumlah, 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
