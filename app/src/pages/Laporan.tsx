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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, Sparkles } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ServiceItem, ServiceStatus, TransaksiStok } from '@/types';

type RecommendationPriority = 'Tinggi' | 'Sedang' | 'Rendah';
type RecommendationCadence = 'weekly' | 'monthly';

interface RecommendationItem {
  title: string;
  priority: RecommendationPriority;
  reason: string;
  action: string;
}

const PRIORITY_STYLES: Record<RecommendationPriority, string> = {
  Tinggi: 'bg-red-100 text-red-700',
  Sedang: 'bg-amber-100 text-amber-700',
  Rendah: 'bg-emerald-100 text-emerald-700',
};

const CADENCE_LABELS: Record<RecommendationCadence, string> = {
  weekly: 'Mingguan',
  monthly: 'Bulanan',
};

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

const daysBetweenInclusive = (start: Date, end: Date) => {
  const milliseconds = endOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.max(1, Math.floor(milliseconds / (1000 * 60 * 60 * 24)) + 1);
};

const toDate = (value: Date | Timestamp | string | null | undefined) => {
  if (!value) return null;
  return value instanceof Timestamp ? value.toDate() : new Date(value);
};

const isSameMonth = (start: Date, end: Date) =>
  start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();

const isFullMonth = (start: Date, end: Date) => {
  const monthStart = startOfDay(new Date(start.getFullYear(), start.getMonth(), 1));
  const monthEnd = endOfDay(new Date(start.getFullYear(), start.getMonth() + 1, 0));

  return start.getTime() === monthStart.getTime() && end.getTime() === monthEnd.getTime();
};

const formatRecommendationPeriodLabel = (start: Date, end: Date) => {
  if (isSameMonth(start, end) && isFullMonth(start, end)) {
    return start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }

  return `${start.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} - ${end.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;
};

const getRecommendationPeriodFromAnchor = (anchorDate: Date, cadence: RecommendationCadence) => {
  if (cadence === 'weekly') {
    const start = startOfDay(anchorDate);
    const end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));

    return { start, end };
  }

  return {
    start: startOfDay(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)),
    end: endOfDay(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0)),
  };
};

const getRecommendationPriority = (score: number): RecommendationPriority => {
  if (score >= 8) return 'Tinggi';
  if (score >= 5) return 'Sedang';
  return 'Rendah';
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
  const [recommendationCadence, setRecommendationCadence] = useState<RecommendationCadence>('weekly');

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

  const recommendationPeriod = useMemo(() => {
    const anchorValue = startDate || endDate;

    if (!anchorValue) {
      return null;
    }

    return getRecommendationPeriodFromAnchor(new Date(anchorValue), recommendationCadence);
  }, [endDate, recommendationCadence, startDate]);

  const previousRecommendationPeriod = useMemo(() => {
    if (!recommendationPeriod) {
      return null;
    }

    const totalDays = daysBetweenInclusive(recommendationPeriod.start, recommendationPeriod.end);
    const previousEnd = endOfDay(new Date(recommendationPeriod.start.getTime() - 24 * 60 * 60 * 1000));
    const previousStart = startOfDay(new Date(previousEnd.getTime() - (totalDays - 1) * 24 * 60 * 60 * 1000));

    return {
      start: previousStart,
      end: previousEnd,
      totalDays,
    };
  }, [recommendationPeriod]);

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

  const allServiceStockTransaksi = useMemo(() => (
    services.flatMap((service) =>
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
    )
  ), [barangList, services]);

  const filteredTransaksiGabungan = [...filteredTransaksi, ...serviceStockTransaksi]
    .sort((a, b) => {
      const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

  const monthlyRecommendations = useMemo(() => {
    if (!recommendationPeriod || !previousRecommendationPeriod) {
      return null;
    }

    const isInRange = (value: Date | Timestamp | string, start: Date, end: Date) => {
      const date = toDate(value);
      return Boolean(date && date >= start && date <= end);
    };

    const matchesKategoriFilter = (barangId: string) => {
      if (filterKategori === 'all') return true;
      const barang = barangList.find((item) => item.id === barangId);
      return barang?.kategoriId === filterKategori;
    };

    const allStockMovements = [...transaksiList, ...allServiceStockTransaksi];
    const currentMovements = allStockMovements.filter(
      (item) =>
        item.tipe === 'keluar' &&
        matchesKategoriFilter(item.barangId) &&
        isInRange(item.createdAt, recommendationPeriod.start, recommendationPeriod.end)
    );

    const previousMovements = allStockMovements.filter(
      (item) =>
        item.tipe === 'keluar' &&
        matchesKategoriFilter(item.barangId) &&
        isInRange(item.createdAt, previousRecommendationPeriod.start, previousRecommendationPeriod.end)
    );

    const currentUsage = currentMovements.reduce<Record<string, number>>((acc, item) => {
      acc[item.barangId] = (acc[item.barangId] ?? 0) + item.jumlah;
      return acc;
    }, {});

    const previousUsage = previousMovements.reduce<Record<string, number>>((acc, item) => {
      acc[item.barangId] = (acc[item.barangId] ?? 0) + item.jumlah;
      return acc;
    }, {});

    const getStockAtPeriodEnd = (barangId: string, currentStock: number) => {
      const latestTransaction = transaksiList
        .filter((item) => {
          const date = toDate(item.createdAt);
          return item.barangId === barangId && Boolean(date && date <= recommendationPeriod.end);
        })
        .sort((a, b) => {
          const dateA = toDate(a.createdAt)?.getTime() ?? 0;
          const dateB = toDate(b.createdAt)?.getTime() ?? 0;
          return dateB - dateA;
        })[0];

      return latestTransaction?.stokSesudah ?? currentStock;
    };

    const restock = barangList
      .filter((barang) => matchesKategoriFilter(barang.id))
      .map((barang) => {
        const current = currentUsage[barang.id] ?? 0;
        const previous = previousUsage[barang.id] ?? 0;
        const stockAtPeriodEnd = getStockAtPeriodEnd(barang.id, barang.stok);
        const coverage = current > 0 ? stockAtPeriodEnd / current : stockAtPeriodEnd;
        const score =
          (stockAtPeriodEnd <= barang.stokMinimum ? 5 : 0) +
          (coverage <= 1 ? 3 : coverage <= 2 ? 2 : 0) +
          (current > previous ? 2 : current > 0 ? 1 : 0);

        return {
          barang,
          current,
          previous,
          score,
          coverage,
          stockAtPeriodEnd,
        };
      })
      .filter(({ current, score }) => current > 0 && score >= 4)
      .sort((a, b) => b.score - a.score || b.current - a.current)
      .slice(0, 3)
      .map<RecommendationItem>(({ barang, current, previous, score, coverage, stockAtPeriodEnd }) => ({
        title: `Restock ${barang.nama}`,
        priority: getRecommendationPriority(score),
        reason: `${barang.nama} keluar ${current} unit pada periode ini, stok akhir periode ${stockAtPeriodEnd} ${barang.satuan}${previous > 0 ? `, sebelumnya ${previous} unit` : ''}.`,
        action: coverage <= 1
          ? 'Siapkan pembelian di awal bulan depan agar servis tidak tertahan.'
          : 'Tambahkan stok buffer untuk antisipasi kebutuhan bulan depan.',
      }));

    const slowMoving = barangList
      .filter((barang) => matchesKategoriFilter(barang.id))
      .map((barang) => {
        const current = currentUsage[barang.id] ?? 0;
        const previous = previousUsage[barang.id] ?? 0;
        const stockAtPeriodEnd = getStockAtPeriodEnd(barang.id, barang.stok);
        const score =
          (stockAtPeriodEnd > barang.stokMinimum * 2 ? 4 : 0) +
          (current === 0 ? 3 : current <= 1 ? 2 : 0) +
          (previous > current ? 1 : 0);

        return {
          barang,
          current,
          previous,
          score,
          stockAtPeriodEnd,
        };
      })
      .filter(({ current, score, stockAtPeriodEnd }) => stockAtPeriodEnd > 0 && score >= 5 && current <= 1)
      .sort((a, b) => b.score - a.score || b.stockAtPeriodEnd - a.stockAtPeriodEnd)
      .slice(0, 3)
      .map<RecommendationItem>(({ barang, current, previous, score, stockAtPeriodEnd }) => ({
        title: `Evaluasi stok ${barang.nama}`,
        priority: getRecommendationPriority(score),
        reason: `Stok akhir periode ${stockAtPeriodEnd} ${barang.satuan}, pergerakan periode ini ${current} unit${previous > 0 ? `, turun dari ${previous} unit` : ''}.`,
        action: current === 0
          ? 'Tahan pembelian ulang dan pertimbangkan bundling atau promo agar stok bergerak.'
          : 'Batasi pembelian berikutnya sampai pergerakan stok kembali stabil.',
      }));

    const currentServicesInPeriod = services.filter((service) =>
      isInRange(service.createdAt, recommendationPeriod.start, recommendationPeriod.end)
    );
    const previousServicesInPeriod = services.filter((service) =>
      isInRange(service.createdAt, previousRecommendationPeriod.start, previousRecommendationPeriod.end)
    );
    const waitingServicesInScope = services.filter((service) => {
      const createdAt = toDate(service.createdAt);
      const updatedAt = toDate(service.updatedAt);

      return service.status === 'menunggu-sparepart' && Boolean(
        createdAt &&
        createdAt <= recommendationPeriod.end &&
        (!updatedAt || updatedAt >= recommendationPeriod.start)
      );
    });
    const previousWaitingServicesInScope = services.filter((service) => {
      const createdAt = toDate(service.createdAt);
      const updatedAt = toDate(service.updatedAt);

      return service.status === 'menunggu-sparepart' && Boolean(
        createdAt &&
        createdAt <= previousRecommendationPeriod.end &&
        (!updatedAt || updatedAt >= previousRecommendationPeriod.start)
      );
    });

    const currentWaiting = waitingServicesInScope.length;
    const previousWaiting = previousWaitingServicesInScope.length;
    const currentCompleted = currentServicesInPeriod.filter((service) => service.status === 'selesai').length;
    const completionRate = currentServicesInPeriod.length > 0
      ? Math.round((currentCompleted / currentServicesInPeriod.length) * 100)
      : 0;

    const currentSparepartTrend = currentServicesInPeriod.reduce<Record<string, number>>((acc, service) => {
      for (const item of service.sparepartDigunakan ?? []) {
        acc[item.namaProduk] = (acc[item.namaProduk] ?? 0) + item.jumlah;
      }
      return acc;
    }, {});

    const topSparepart = Object.entries(currentSparepartTrend)
      .sort((a, b) => b[1] - a[1])[0];

    const serviceTrendItems: RecommendationItem[] = [];

    if (currentWaiting > 0) {
      const score = 6 + (currentWaiting > previousWaiting ? 2 : 0);
      serviceTrendItems.push({
        title: 'Evaluasi antrean menunggu sparepart',
        priority: getRecommendationPriority(score),
        reason: `${currentWaiting} servis berada di status menunggu sparepart pada periode ini${previousWaiting > 0 ? `, sebelumnya ${previousWaiting}` : ''}.`,
        action: 'Review supplier dan siapkan stok buffer untuk komponen yang paling sering menahan pengerjaan.',
      });
    }

    if (topSparepart) {
      const [, usageCount] = topSparepart;
      serviceTrendItems.push({
        title: `Siapkan sparepart untuk layanan ${topSparepart[0]}`,
        priority: getRecommendationPriority(usageCount >= 8 ? 8 : usageCount >= 4 ? 6 : 4),
        reason: `${topSparepart[0]} dipakai ${usageCount} kali di servis periode ini, menunjukkan permintaan perbaikan yang konsisten.`,
        action: 'Pastikan stok sparepart ini aman dan pertimbangkan paket layanan yang relevan bulan depan.',
      });
    }

    if (currentServicesInPeriod.length > 0) {
      const trendDelta = currentServicesInPeriod.length - previousServicesInPeriod.length;
      serviceTrendItems.push({
        title: trendDelta >= 0 ? 'Permintaan servis sedang naik' : 'Permintaan servis sedang melambat',
        priority: getRecommendationPriority(
          trendDelta > 3 || completionRate < 60 ? 7 : Math.abs(trendDelta) > 0 ? 5 : 4
        ),
        reason: `Total servis periode ini ${currentServicesInPeriod.length} unit${previousServicesInPeriod.length > 0 ? `, dibanding ${previousServicesInPeriod.length} unit pada periode sebelumnya` : ''}. Tingkat penyelesaian saat ini ${completionRate}%.`,
        action: trendDelta >= 0
          ? 'Siapkan kapasitas teknisi dan sparepart untuk menjaga waktu pengerjaan tetap stabil.'
          : 'Pertimbangkan follow up pelanggan lama atau promo layanan agar permintaan kembali naik.',
      });
    }

    const fallback = (title: string, action: string): RecommendationItem[] => ([
      {
        title,
        priority: 'Rendah',
        reason: 'Belum ada pola yang cukup kuat pada periode ini untuk memunculkan rekomendasi prioritas tinggi.',
        action,
      },
    ]);

    return {
      periodLabel: formatRecommendationPeriodLabel(recommendationPeriod.start, recommendationPeriod.end),
      comparisonLabel: `${previousRecommendationPeriod.totalDays} hari sebelumnya`,
      cadenceLabel: CADENCE_LABELS[recommendationCadence],
      restock: restock.length > 0
        ? restock
        : fallback('Stok restock relatif aman', 'Lanjutkan pemantauan pemakaian sparepart untuk periode berikutnya.'),
      slowMoving: slowMoving.length > 0
        ? slowMoving
        : fallback('Belum ada stok lambat bergerak yang kritis', 'Pertahankan pola pembelian saat ini dan evaluasi lagi periode berikutnya.'),
      service: serviceTrendItems.slice(0, 3).length > 0
        ? serviceTrendItems.slice(0, 3)
        : fallback('Tren layanan masih stabil', 'Pantau kembali permintaan servis dan status pengerjaan pada periode berikutnya.'),
    };
  }, [
    allServiceStockTransaksi,
    barangList,
    filterKategori,
    previousRecommendationPeriod,
    recommendationCadence,
    recommendationPeriod,
    services,
    transaksiList,
  ]);

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
    totalBiayaJasa: filteredServices.reduce((total, service) => total + (service.biayaJasa ?? 0), 0),
    nilaiSparepart: serviceStockTransaksi.reduce((total, transaksi) => total + transaksi.totalHarga, 0),
    omzetServis: filteredServices.reduce((total, service) => total + (service.biayaJasa ?? 0), 0) +
      serviceStockTransaksi.reduce((total, transaksi) => total + transaksi.totalHarga, 0),
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-white border border-gray-200 rounded-lg">
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
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Mode Rekomendasi</Label>
          <Select
            value={recommendationCadence}
            onValueChange={(value) => setRecommendationCadence(value as RecommendationCadence)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Mingguan</SelectItem>
              <SelectItem value="monthly">Bulanan</SelectItem>
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
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
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
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-medium">Omzet Servis</p>
            <p className="text-base font-bold text-gray-800 mt-1">{formatRupiah(serviceSummary.omzetServis)}</p>
          </div>
        </div>
      </div>

      <Card className="border-gray-200">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Rekomendasi {CADENCE_LABELS[recommendationCadence]}
              </CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                {monthlyRecommendations
                  ? `Insight otomatis untuk ${monthlyRecommendations.periodLabel} dengan pembanding ${monthlyRecommendations.comparisonLabel}.`
                  : 'Pilih tanggal laporan dulu untuk menampilkan rekomendasi.'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!monthlyRecommendations ? (
            <div className="rounded-lg border border-dashed border-blue-200 bg-white/80 p-6 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-blue-500" />
              <p className="mt-3 font-medium text-gray-900">Rekomendasi belum ditampilkan</p>
              <p className="mt-1 text-sm text-gray-500">
                Isi tanggal laporan, lalu pilih mode mingguan atau bulanan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-100 text-blue-700">{monthlyRecommendations.cadenceLabel}</Badge>
                <Badge className="bg-slate-100 text-slate-700">{monthlyRecommendations.periodLabel}</Badge>
                <Badge className="bg-slate-100 text-slate-700">Banding: {monthlyRecommendations.comparisonLabel}</Badge>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  {
                    title: 'Restock Periode Berikutnya',
                    items: monthlyRecommendations.restock,
                    accent: 'border-red-200 bg-red-50/80',
                  },
                  {
                    title: 'Stok Lambat Bergerak',
                    items: monthlyRecommendations.slowMoving,
                    accent: 'border-amber-200 bg-amber-50/80',
                  },
                  {
                    title: 'Layanan / Service',
                    items: monthlyRecommendations.service,
                    accent: 'border-blue-200 bg-blue-50/80',
                  },
                ].map((section) => (
                  <div key={section.title} className={`rounded-xl border p-4 ${section.accent}`}>
                    <h3 className="text-base font-semibold text-gray-900">{section.title}</h3>
                    <div className="mt-4 space-y-3">
                      {section.items.map((item) => (
                        <div key={item.title} className="rounded-lg border border-white/70 bg-white/90 p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium text-gray-900">{item.title}</p>
                            <Badge className={`${PRIORITY_STYLES[item.priority]} shrink-0`}>{item.priority}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-gray-600">{item.reason}</p>
                          <p className="mt-2 text-sm font-medium text-gray-800">Saran: {item.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
          <div className="border p-3 rounded">
            <p className="text-sm text-gray-500">Nilai Jasa</p>
            <p className="text-xl font-bold">{formatRupiah(serviceSummary.totalBiayaJasa)}</p>
          </div>
          <div className="border p-3 rounded">
            <p className="text-sm text-gray-500">Omzet Servis</p>
            <p className="text-xl font-bold">{formatRupiah(serviceSummary.omzetServis)}</p>
          </div>
        </div>

        {monthlyRecommendations && (
          <div className="mb-8">
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Rekomendasi {monthlyRecommendations.cadenceLabel}
            </h3>
            <p className="mb-3 text-sm text-gray-500">
              Periode {monthlyRecommendations.periodLabel}, dibanding {monthlyRecommendations.comparisonLabel}.
            </p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {[
                {
                  title: 'Restock Periode Berikutnya',
                  items: monthlyRecommendations.restock,
                },
                {
                  title: 'Stok Lambat Bergerak',
                  items: monthlyRecommendations.slowMoving,
                },
                {
                  title: 'Layanan / Service',
                  items: monthlyRecommendations.service,
                },
              ].map((section) => (
                <div key={section.title} className="rounded-lg border p-4">
                  <p className="font-semibold text-gray-900">{section.title}</p>
                  <div className="mt-3 space-y-3">
                    {section.items.map((item) => (
                      <div key={item.title} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-gray-900">{item.title}</p>
                          <span className="text-xs font-semibold text-gray-500">{item.priority}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{item.reason}</p>
                        <p className="mt-2 text-sm text-gray-800">Saran: {item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
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
                      {transaksi.userName === 'Servis' && (
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
