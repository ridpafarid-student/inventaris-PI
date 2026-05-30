// ============================================
// HOOK - Dashboard Stats & Alerts
// ============================================

import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Barang, TransaksiStok, DashboardStats, AlertStok, ChartData, ServiceItem } from '@/types';

export function useDashboard() {
  const [barangList, setBarangList] = useState<Barang[]>([]);
  const [transaksiList, setTransaksiList] = useState<TransaksiStok[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [barangLoaded, setBarangLoaded] = useState(false);
  const [transaksiLoaded, setTransaksiLoaded] = useState(false);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());

  useEffect(() => {
    const scheduleNextDayRefresh = () => {
      const now = new Date();
      const nextDay = new Date(now);
      nextDay.setDate(now.getDate() + 1);
      nextDay.setHours(0, 0, 1, 0);

      return window.setTimeout(() => {
        setTodayKey(new Date().toDateString());
      }, nextDay.getTime() - now.getTime());
    };

    const timeoutId = scheduleNextDayRefresh();
    return () => window.clearTimeout(timeoutId);
  }, [todayKey]);

  // Subscribe to barang
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'barang'),
      (snapshot) => {
        const barang: Barang[] = [];
        snapshot.forEach((doc) => {
          barang.push({ id: doc.id, ...doc.data() } as Barang);
        });
        setBarangList(barang);
        setBarangLoaded(true);
      },
      () => setBarangLoaded(true)
    );

    return unsubscribe;
  }, []);

  // Subscribe to transaksi
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'transaksi'),
      (snapshot) => {
        const transaksi: TransaksiStok[] = [];
        snapshot.forEach((doc) => {
          transaksi.push({ id: doc.id, ...doc.data() } as TransaksiStok);
        });
        setTransaksiList(transaksi);
        setTransaksiLoaded(true);
      }
    );

    return unsubscribe;
  }, []);

  // Subscribe to services
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'services'),
      (snapshot) => {
        const nextServices: ServiceItem[] = [];
        snapshot.forEach((doc) => {
          nextServices.push({ id: doc.id, ...doc.data() } as ServiceItem);
        });
        setServices(nextServices);
        setServicesLoaded(true);
      },
      () => setServicesLoaded(true)
    );

    return unsubscribe;
  }, []);

  const loading = !barangLoaded || !transaksiLoaded || !servicesLoaded;

  // Calculate stats
  const stats: DashboardStats = useMemo(() => {
    const today = new Date(todayKey);
    today.setHours(0, 0, 0, 0);

    const isSameDayOrAfterStart = (value: Date | Timestamp | string | null | undefined) => {
      if (!value) {
        return false;
      }

      const date = value instanceof Timestamp ? value.toDate() : new Date(value);
      return !Number.isNaN(date.getTime()) && date >= today;
    };

    const totalBarang = barangList.length;
    const kategoriSet = new Set(barangList.map(b => b.kategoriId));
    const totalKategori = kategoriSet.size;
    const totalTransaksiStokHariIni = transaksiList.filter((transaksi) =>
      isSameDayOrAfterStart(transaksi.createdAt)
    ).length;
    const stokMenipis = barangList.filter(b => b.stok <= b.stokMinimum).length;
    const nilaiInventori = barangList.reduce((sum, barang) => sum + (barang.stok * barang.hargaBeli), 0);
    const totalServis = services.length;
    const servisHariIni = services.filter((service) => isSameDayOrAfterStart(service.createdAt)).length;
    const servisAktif = services.filter((service) => service.status !== 'selesai' && service.status !== 'diambil').length;
    const servisMenungguSparepart = services.filter((service) => service.status === 'menunggu-sparepart').length;
    const servisSelesai = services.filter((service) => service.status === 'selesai').length;
    const servisSelesaiHariIni = services.filter((service) =>
      service.status === 'selesai' &&
      isSameDayOrAfterStart(service.completedAt ?? service.updatedAt ?? service.createdAt)
    ).length;
    const totalSparepartTerpakai = services.reduce(
      (sum, service) => sum + (service.sparepartDigunakan?.reduce((subtotal, item) => subtotal + item.jumlah, 0) ?? 0),
      0
    );

    // === Laba Hari Ini ===
    // 1. Laba dari transaksi barang keluar hari ini (margin = hargaJual - hargaBeli)
    const labaBarangKeluarHariIni = transaksiList
      .filter((t) => t.tipe === 'keluar' && isSameDayOrAfterStart(t.createdAt))
      .reduce((sum, t) => {
        const barang = barangList.find((b) => b.id === t.barangId);
        if (!barang) return sum;
        const margin = barang.hargaJual - barang.hargaBeli;
        return sum + (margin * t.jumlah);
      }, 0);

    // 2. Pendapatan dari servis yang diambil hari ini (biayaJasa + nilai sparepart)
    const labaServisDiambilHariIni = services
      .filter((s) => s.status === 'diambil' && isSameDayOrAfterStart(s.pickedUpAt ?? s.updatedAt))
      .reduce((sum, s) => {
        const biayaJasa = s.biayaJasa ?? 0;
        const nilaiSparepart = (s.sparepartDigunakan ?? []).reduce((subtotal, item) => {
          const barang = barangList.find((b) => b.id === item.productId);
          return subtotal + ((barang?.hargaJual ?? 0) * item.jumlah);
        }, 0);
        return sum + biayaJasa + nilaiSparepart;
      }, 0);

    const labaHariIni = labaBarangKeluarHariIni + labaServisDiambilHariIni;

    return {
      totalBarang,
      totalKategori,
      totalTransaksiHariIni: totalTransaksiStokHariIni + servisSelesaiHariIni,
      stokMenipis,
      nilaiInventori,
      totalServis,
      servisHariIni,
      servisAktif,
      servisMenungguSparepart,
      servisSelesai,
      servisSelesaiHariIni,
      totalSparepartTerpakai,
      labaHariIni
    };
  }, [barangList, transaksiList, services, todayKey]);

  // Get alert stok (barang dengan stok <= stokMinimum)
  const alertStok: AlertStok[] = useMemo(() => {
    return barangList
      .filter(b => b.stok <= b.stokMinimum)
      .map(b => ({
        barangId: b.id,
        barangNama: b.nama,
        barangKode: b.kodeBarang,
        stok: b.stok,
        stokMinimum: b.stokMinimum,
        selisih: b.stokMinimum - b.stok
      }))
      .sort((a, b) => b.selisih - a.selisih);
  }, [barangList]);

  // Get chart data - Stok by Kategori
  const stokByKategori: ChartData[] = useMemo(() => {
    const data: Record<string, number> = {};
    barangList.forEach(b => {
      const kategoriName = b.kategoriNama || 'Tanpa Kategori';
      if (!data[kategoriName]) {
        data[kategoriName] = 0;
      }
      data[kategoriName] += b.stok;
    });
    
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [barangList]);

  // Get chart data - Aktivitas 7 hari terakhir
  const aktivitas7Hari = useMemo(() => {
    const data: Record<string, { transaksi: number; servis: number }> = {};
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('id-ID', { weekday: 'short' });
      data[dateStr] = { transaksi: 0, servis: 0 };
    }

    transaksiList.forEach(t => {
      const tDate = t.createdAt instanceof Timestamp
        ? t.createdAt.toDate()
        : new Date(t.createdAt);
      const dateStr = tDate.toLocaleDateString('id-ID', { weekday: 'short' });

      if (data[dateStr]) {
        data[dateStr].transaksi += 1;
      }
    });

    services.forEach((service) => {
      const serviceDate = service.createdAt instanceof Timestamp
        ? service.createdAt.toDate()
        : new Date(service.createdAt);
      const dateStr = serviceDate.toLocaleDateString('id-ID', { weekday: 'short' });

      if (data[dateStr]) {
        data[dateStr].servis += 1;
      }
    });

    return Object.entries(data).map(([name, val]) => ({
      name,
      transaksi: val.transaksi,
      servis: val.servis,
    }));
  }, [transaksiList, services]);

  const servisByStatus: ChartData[] = useMemo(() => {
    const today = new Date(todayKey);
    today.setHours(0, 0, 0, 0);

    const isSameDayOrAfterStart = (value: Date | Timestamp | string | null | undefined) => {
      if (!value) {
        return false;
      }

      const date = value instanceof Timestamp ? value.toDate() : new Date(value);
      return !Number.isNaN(date.getTime()) && date >= today;
    };

    const data = {
      Pending: services.filter((service) => service.status === 'pending').length,
      'Menunggu Sparepart': services.filter((service) => service.status === 'menunggu-sparepart').length,
      Proses: services.filter((service) => service.status === 'proses').length,
      Selesai: services.filter((service) => service.status === 'selesai').length,
      Diambil: services.filter((service) =>
        service.status === 'diambil' &&
        isSameDayOrAfterStart(service.pickedUpAt ?? service.updatedAt ?? service.createdAt)
      ).length,
    };

    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [services, todayKey]);

  return {
    stats,
    alertStok,
    stokByKategori,
    aktivitas7Hari,
    servisByStatus,
    loading
  };
}
