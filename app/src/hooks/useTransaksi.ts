// ============================================
// HOOK - Manajemen Transaksi Stok
// ============================================

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  serverTimestamp,
  where,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TransaksiStok, Barang, TipeTransaksi } from '@/types';

export function useTransaksi() {
  const [transaksiList, setTransaksiList] = useState<TransaksiStok[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to transaksi collection
  useEffect(() => {
    const q = query(
      collection(db, 'transaksi'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const transaksi: TransaksiStok[] = [];
        snapshot.forEach((doc) => {
          transaksi.push({ id: doc.id, ...doc.data() } as TransaksiStok);
        });
        setTransaksiList(transaksi);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Add transaksi stok
  const addTransaksi = useCallback(async (
    barang: Barang,
    tipe: TipeTransaksi,
    jumlah: number,
    hargaSatuan: number,
    keterangan: string,
    userId: string,
    userName: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const stokSebelum = barang.stok;
      const stokSesudah = tipe === 'masuk' 
        ? stokSebelum + jumlah 
        : stokSebelum - jumlah;

      // Validate stok keluar
      if (tipe === 'keluar' && stokSesudah < 0) {
        throw new Error('Stok tidak mencukupi');
      }

      await runTransaction(db, async (transaction) => {
        const barangRef = doc(db, 'barang', barang.id);
        const transaksiRef = doc(collection(db, 'transaksi'));
        const barangSnapshot = await transaction.get(barangRef);

        if (!barangSnapshot.exists()) {
          throw new Error('Data barang tidak ditemukan');
        }

        const currentBarang = barangSnapshot.data() as Barang;
        const currentStok = currentBarang.stok ?? 0;
        const nextStok = tipe === 'masuk'
          ? currentStok + jumlah
          : currentStok - jumlah;

        if (tipe === 'keluar' && nextStok < 0) {
          throw new Error('Stok tidak mencukupi');
        }

        transaction.set(transaksiRef, {
          barangId: barang.id,
          barangNama: barang.nama,
          barangKode: barang.kodeBarang,
          tipe,
          jumlah,
          stokSebelum: currentStok,
          stokSesudah: nextStok,
          hargaSatuan,
          totalHarga: jumlah * hargaSatuan,
          keterangan,
          userId,
          userName,
          createdAt: serverTimestamp()
        });

        transaction.update(barangRef, {
          stok: nextStok,
          updatedAt: serverTimestamp()
        });
      });

      return { success: true };
    } catch (err: any) {
      const errorCode = typeof err?.code === 'string' ? err.code : '';
      const errorMessage = typeof err?.message === 'string' ? err.message : 'Gagal melakukan transaksi';
      if (errorCode === 'permission-denied') {
        const message = 'Akun ini tidak punya izin untuk menyimpan transaksi atau mengubah stok barang. Periksa Firestore Rules untuk staff.';
        setError(message);
        return { success: false, error: message };
      } else {
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    }
  }, []);

  // Get transaksi by date range
  const getTransaksiByDateRange = useCallback(async (
    startDate: Date,
    endDate: Date,
    tipeTransaksi: 'all' | 'masuk' | 'keluar' = 'all'
  ) => {
    try {
      let q = query(
        collection(db, 'transaksi'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('createdAt', 'desc')
      );

      if (tipeTransaksi !== 'all') {
        q = query(q, where('tipe', '==', tipeTransaksi));
      }

      return transaksiList.filter(t => {
        const tDate = t.createdAt instanceof Timestamp 
          ? t.createdAt.toDate() 
          : new Date(t.createdAt);
        return tDate >= startDate && tDate <= endDate &&
          (tipeTransaksi === 'all' || t.tipe === tipeTransaksi);
      });
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, [transaksiList]);

  return {
    transaksiList,
    loading,
    error,
    addTransaksi,
    getTransaksiByDateRange
  };
}
