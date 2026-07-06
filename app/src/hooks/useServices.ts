import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type Transaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Barang, ServiceItem, ServiceSparepartItem, ServiceStatus } from '@/types';

interface SaveServiceInput {
  noNota?: string;
  namaPelanggan: string;
  nomorHp: string;
  jenisPerangkat: 'Laptop' | 'Smartphone' | 'Tablet' | 'CPU' | 'Printer';
  modelPerangkat: string;
  deskripsiMasalah: string;
  biayaJasa?: number;
  status: ServiceStatus;
  sparepartDigunakan?: ServiceSparepartItem[];
  userId?: string;
  userName?: string;
  createdByName?: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const shouldDeductStock = (
  nextStatus: ServiceStatus,
  currentStatus: ServiceStatus | undefined,
  spareparts: ServiceSparepartItem[],
  wasDeducted = false
) => spareparts.length > 0 && (
  nextStatus === 'proses' || nextStatus === 'selesai' || nextStatus === 'diambil' || currentStatus === 'diambil' || wasDeducted
);

const aggregateSpareparts = (spareparts: ServiceSparepartItem[]) => {
  const usage = new Map<string, ServiceSparepartItem>();

  for (const item of spareparts) {
    if (!item.productId || item.jumlah <= 0) {
      continue;
    }

    const current = usage.get(item.productId);
    usage.set(item.productId, {
      productId: item.productId,
      namaProduk: item.namaProduk,
      jumlah: (current?.jumlah ?? 0) + item.jumlah,
    });
  }

  return usage;
};

export function useServices() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const servicesQuery = query(
      collection(db, 'services'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      servicesQuery,
      (snapshot) => {
        const nextServices: ServiceItem[] = [];
        snapshot.forEach((serviceDoc) => {
          nextServices.push({
            id: serviceDoc.id,
            ...serviceDoc.data(),
          } as ServiceItem);
        });
        setServices(nextServices);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  /**
   * Mengelola stok dan entry transaksi sparepart dalam satu fungsi.
   *
   * PENTING - aturan Firestore transaction: semua read harus selesai sebelum write pertama.
   * Solusi: satu batch Promise.all() untuk semua transaction.get() (barang + transaksi),
   * baru semua write (update stok, set/update/delete transaksi) dijalankan setelahnya.
   *
   * shouldRecordTransactions: true  → buat/update entry di collection 'transaksi' (hanya status 'diambil')
   *                            false → hapus entry transaksi yang ada jika ada
   */
  const syncSparepartUsage = useCallback(async ({
    serviceId,
    service,
    previousSpareparts,
    nextSpareparts,
    wasDeducted,
    shouldDeduct,
    shouldRecordTransactions,
    transaction,
  }: {
    serviceId: string;
    service: SaveServiceInput;
    previousSpareparts: ServiceSparepartItem[];
    nextSpareparts: ServiceSparepartItem[];
    wasDeducted: boolean;
    shouldDeduct: boolean;
    shouldRecordTransactions: boolean;
    transaction: Transaction;
  }) => {
    const previousUsage = wasDeducted
      ? aggregateSpareparts(previousSpareparts)
      : new Map<string, ServiceSparepartItem>();
    const nextUsage = shouldDeduct
      ? aggregateSpareparts(nextSpareparts)
      : new Map<string, ServiceSparepartItem>();

    // Union semua productId: dari stok (previousUsage/nextUsage) dan dari transaksi
    const allProductIds = Array.from(
      new Set([
        ...previousSpareparts.map((s) => s.productId),
        ...nextSpareparts.map((s) => s.productId),
      ].filter(Boolean))
    );

    // ── FASE READ: semua transaction.get() selesai sebelum write pertama manapun ──
    const snapshots = await Promise.all(
      allProductIds.map(async (productId) => {
        const productRef = doc(db, 'barang', productId);
        const transaksiRef = doc(db, 'transaksi', `service-${serviceId}-${productId}`);
        const [productSnapshot, transaksiSnapshot] = await Promise.all([
          transaction.get(productRef),
          transaction.get(transaksiRef),
        ]);
        return { productId, productRef, transaksiRef, productSnapshot, transaksiSnapshot };
      })
    );

    // ── FASE WRITE 1: sesuaikan stok barang ──
    for (const item of snapshots) {
      const previousQty = previousUsage.get(item.productId)?.jumlah ?? 0;
      const nextItem = nextUsage.get(item.productId);
      const nextQty = nextItem?.jumlah ?? 0;
      const delta = nextQty - previousQty;

      if (delta === 0) continue;

      if (!item.productSnapshot.exists()) {
        const productName = nextItem?.namaProduk ?? previousUsage.get(item.productId)?.namaProduk ?? 'Produk';
        throw new Error(`${productName} tidak ditemukan`);
      }

      const product = item.productSnapshot.data() as Barang;
      const currentStock = product.stok ?? 0;

      if (delta > 0 && currentStock < delta) {
        throw new Error(`Stok ${product.nama} tidak mencukupi`);
      }

      transaction.update(item.productRef, {
        stok: currentStock - delta,
        updatedAt: serverTimestamp(),
      });
    }

    // ── FASE WRITE 2: catat atau hapus entry transaksi barang ──
    const recordUsage = shouldRecordTransactions
      ? aggregateSpareparts(nextSpareparts)
      : new Map<string, ServiceSparepartItem>();

    for (const item of snapshots) {
      const usageItem = recordUsage.get(item.productId);
      const qty = usageItem?.jumlah ?? 0;

      if (shouldRecordTransactions && qty > 0) {
        if (!item.productSnapshot.exists()) {
          throw new Error(`${usageItem?.namaProduk ?? 'Produk'} tidak ditemukan`);
        }

        const product = item.productSnapshot.data() as Barang;
        const stockAtRead = product.stok ?? 0;
        const deductedQty = nextUsage.get(item.productId)?.jumlah ?? qty;
        const hargaSatuan = product.hargaJual ?? product.hargaBeli ?? 0;
        
        const transaksiPayload = {
          barangId: item.productId,
          barangNama: product.nama,
          barangKode: product.kodeBarang,
          tipe: 'keluar' as const,
          jumlah: qty,
          stokSebelum: stockAtRead,
          stokSesudah: stockAtRead - deductedQty,
          hargaSatuan,
          totalHarga: qty * hargaSatuan,
          keterangan: `Pemakaian sparepart untuk servis ${service.modelPerangkat} - ${service.namaPelanggan}`,
          userId: service.userId ?? '',
          userName: service.userName ? `Servis - ${service.userName}` : 'Servis',
          source: 'service' as const,
          serviceId,
          updatedAt: serverTimestamp(),
        };

        if (item.transaksiSnapshot.exists()) {
          transaction.update(item.transaksiRef, transaksiPayload);
        } else {
          transaction.set(item.transaksiRef, { ...transaksiPayload, createdAt: serverTimestamp() });
        }
      } else if (item.transaksiSnapshot.exists()) {
        transaction.delete(item.transaksiRef);
      }
    }

    return nextUsage.size > 0;
  }, []);

  const addService = useCallback(async (
    payload: SaveServiceInput
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const spareparts = payload.sparepartDigunakan ?? [];
      const deductStock = shouldDeductStock(payload.status, undefined, spareparts);
      const isPickedUp = payload.status === 'diambil';

      await runTransaction(db, async (transaction) => {
        const serviceRef = doc(collection(db, 'services'));

        const stockDeducted = await syncSparepartUsage({
          serviceId: serviceRef.id,
          service: payload,
          previousSpareparts: [],
          nextSpareparts: spareparts,
          wasDeducted: false,
          shouldDeduct: deductStock,
          // Catat transaksi barang HANYA jika langsung masuk status 'diambil'
          shouldRecordTransactions: isPickedUp && deductStock,
          transaction,
        });

        transaction.set(serviceRef, {
          ...payload,
          sparepartDigunakan: spareparts,
          stokDikurangi: stockDeducted,
          ...(isPickedUp ? { pickedUpAt: serverTimestamp() } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      return { success: true };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Gagal menambah servis');
      setError(message);
      return { success: false, error: message };
    }
  }, [syncSparepartUsage]);

  const updateService = useCallback(async (
    id: string,
    payload: Partial<SaveServiceInput>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await runTransaction(db, async (transaction) => {
        const serviceRef = doc(db, 'services', id);
        const serviceSnapshot = await transaction.get(serviceRef);

        if (!serviceSnapshot.exists()) {
          throw new Error('Data servis tidak ditemukan');
        }

        const currentService = serviceSnapshot.data() as ServiceItem;
        const nextStatus = payload.status ?? currentService.status;
        const spareparts = payload.sparepartDigunakan ?? currentService.sparepartDigunakan ?? [];
        const deductStock = shouldDeductStock(nextStatus, currentService.status, spareparts, currentService.stokDikurangi ?? false);
        const wasPickedUp = currentService.status === 'diambil';
        const isPickedUpNow = nextStatus === 'diambil' && !wasPickedUp;
        const isReopenedFromPickedUp = wasPickedUp && nextStatus !== 'diambil';
        const wasCompleted = currentService.status === 'selesai' || currentService.status === 'diambil';
        const isCompletingNow = (nextStatus === 'selesai' || nextStatus === 'diambil') && !wasCompleted;
        const isReopened = nextStatus !== 'selesai' && nextStatus !== 'diambil' && wasCompleted;
        
        const nextService = {
          ...currentService,
          ...payload,
          status: nextStatus,
          sparepartDigunakan: spareparts,
        };
        
        // Catat transaksi barang HANYA saat status menjadi 'diambil'.
        // Hapus transaksi saat reopen dari 'diambil' ke status lain.
        // syncSparepartUsage menjamin semua read selesai sebelum write pertama.
        const shouldRecordTransactions = nextStatus === 'diambil' && !isReopenedFromPickedUp;

        const stockDeducted = await syncSparepartUsage({
          serviceId: id,
          service: nextService,
          previousSpareparts: currentService.sparepartDigunakan ?? [],
          nextSpareparts: spareparts,
          wasDeducted: currentService.stokDikurangi ?? false,
          shouldDeduct: deductStock,
          shouldRecordTransactions,
          transaction,
        });

        transaction.update(serviceRef, {
          ...payload,
          sparepartDigunakan: spareparts,
          stokDikurangi: stockDeducted,
          ...(isCompletingNow ? { completedAt: serverTimestamp() } : {}),
          ...(isPickedUpNow ? { pickedUpAt: serverTimestamp() } : {}),
          ...(isReopened ? { completedAt: null } : {}),
          ...(isReopened ? { pickedUpAt: null } : {}),
          updatedAt: serverTimestamp(),
        });
      });

      return { success: true };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Gagal mengupdate servis');
      setError(message);
      return { success: false, error: message };
    }
  }, [syncSparepartUsage]);

  const updateServiceStatus = useCallback(async (
    id: string,
    status: ServiceStatus
  ) => updateService(id, { status }), [updateService]);

  const deleteService = useCallback(async (id: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const serviceRef = doc(db, 'services', id);
        const serviceSnapshot = await transaction.get(serviceRef);

        if (!serviceSnapshot.exists()) {
          throw new Error('Data servis tidak ditemukan');
        }

        const currentService = serviceSnapshot.data() as ServiceItem;
        
        // Kembalikan stok + hapus entry transaksi dalam satu batch read-then-write
        await syncSparepartUsage({
          serviceId: id,
          service: currentService,
          previousSpareparts: currentService.sparepartDigunakan ?? [],
          nextSpareparts: [],
          wasDeducted: currentService.stokDikurangi ?? false,
          shouldDeduct: false,
          shouldRecordTransactions: false,
          transaction,
        });
        
        transaction.delete(serviceRef);
      });

      return { success: true };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Gagal menghapus servis');
      setError(message);
      return { success: false, error: message };
    }
  }, [syncSparepartUsage]);

  return {
    services,
    loading,
    error,
    addService,
    updateService,
    updateServiceStatus,
    deleteService,
  };
}
