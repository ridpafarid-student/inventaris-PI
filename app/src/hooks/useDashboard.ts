// ============================================
// HOOK - Dashboard Stats & Alerts
// ============================================

import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Barang, TransaksiStok, DashboardStats, AlertStok, ChartData } from '@/types';

export function useDashboard() {
  const [barangList, setBarangList] = useState<Barang[]>([]);
  const [transaksiList, setTransaksiList] = useState<TransaksiStok[]>([]);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsubscribe;
  }, []);

  // Subscribe to today's transaksi
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, 'transaksi'),
      where('createdAt', '>=', Timestamp.fromDate(today))
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const transaksi: TransaksiStok[] = [];
        snapshot.forEach((doc) => {
          transaksi.push({ id: doc.id, ...doc.data() } as TransaksiStok);
        });
        setTransaksiList(transaksi);
      }
    );

    return unsubscribe;
  }, []);

  // Calculate stats
  const stats: DashboardStats = useMemo(() => {
    const totalBarang = barangList.length;
    const kategoriSet = new Set(barangList.map(b => b.kategoriId));
    const totalKategori = kategoriSet.size;
    const totalTransaksiHariIni = transaksiList.length;
    const stokMenipis = barangList.filter(b => b.stok <= b.stokMinimum).length;
    const nilaiInventori = 0;

    return {
      totalBarang,
      totalKategori,
      totalTransaksiHariIni,
      stokMenipis,
      nilaiInventori
    };
  }, [barangList, transaksiList]);

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
      if (!data[b.kategoriNama]) {
        data[b.kategoriNama] = 0;
      }
    });
    
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [barangList]);

  // Get chart data - Transaksi 7 hari terakhir
  const transaksi7Hari: ChartData[] = useMemo(() => {
    const data: Record<string, { masuk: number; keluar: number }> = {};
    const today = new Date();
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('id-ID', { weekday: 'short' });
      data[dateStr] = { masuk: 0, keluar: 0 };
    }

    transaksiList.forEach(t => {
      const tDate = t.createdAt instanceof Timestamp
        ? t.createdAt.toDate()
        : new Date(t.createdAt);
      const dateStr = tDate.toLocaleDateString('id-ID', { weekday: 'short' });

      if (data[dateStr]) {
        if (t.tipe === 'masuk') {
          data[dateStr].masuk += t.jumlah;
        } else {
          data[dateStr].keluar += t.jumlah;
        }
      }
    });

    return Object.entries(data).map(([name, val]) => ({
      name,
      value: val.masuk + val.keluar
    }));
  }, [transaksiList]);

  return {
    stats,
    alertStok,
    stokByKategori,
    transaksi7Hari,
    loading
  };
}
