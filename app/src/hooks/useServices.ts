import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
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
  spareparts: ServiceSparepartItem[],
  alreadyDeducted: boolean
) => !alreadyDeducted && spareparts.length > 0 && (
  nextStatus === 'selesai' || nextStatus === 'diambil' || nextStatus === 'menunggu-sparepart' || nextStatus === 'proses'
);

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

  const applySparepartUsage = useCallback(async (
    spareparts: ServiceSparepartItem[],
    transaction: Transaction
  ) => {
    for (const sparepart of spareparts) {
      const productRef = doc(db, 'barang', sparepart.productId);
      const productSnapshot = await transaction.get(productRef);

      if (!productSnapshot.exists()) {
        throw new Error(`Produk ${sparepart.namaProduk} tidak ditemukan`);
      }

      const currentProduct = productSnapshot.data() as Barang;
      const currentStock = currentProduct.stok ?? 0;

      if (sparepart.jumlah <= 0) {
        throw new Error(`Jumlah sparepart ${sparepart.namaProduk} tidak valid`);
      }

      if (currentStock < sparepart.jumlah) {
        throw new Error(`Stok ${sparepart.namaProduk} tidak mencukupi`);
      }

      transaction.update(productRef, {
        stok: currentStock - sparepart.jumlah,
        updatedAt: serverTimestamp(),
      });
    }
  }, []);

  const addService = useCallback(async (
    payload: SaveServiceInput
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const spareparts = payload.sparepartDigunakan ?? [];
      const deductStock = shouldDeductStock(payload.status, spareparts, false);

      await runTransaction(db, async (transaction) => {
        if (deductStock) {
          await applySparepartUsage(spareparts, transaction);
        }

        const serviceRef = doc(collection(db, 'services'));
        transaction.set(serviceRef, {
          ...payload,
          sparepartDigunakan: spareparts,
          stokDikurangi: deductStock,
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
  }, [applySparepartUsage]);

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
        const alreadyDeducted = currentService.stokDikurangi ?? false;
        const deductStock = shouldDeductStock(nextStatus, spareparts, alreadyDeducted);
        const wasCompleted = currentService.status === 'selesai' || currentService.status === 'diambil';
        const isCompletingNow = (nextStatus === 'selesai' || nextStatus === 'diambil') && !wasCompleted;
        const isPickedUpNow = nextStatus === 'diambil' && currentService.status !== 'diambil';
        const isReopened = nextStatus !== 'selesai' && nextStatus !== 'diambil' && wasCompleted;

        if (deductStock) {
          await applySparepartUsage(spareparts, transaction);
        }

        transaction.update(serviceRef, {
          ...payload,
          sparepartDigunakan: spareparts,
          stokDikurangi: alreadyDeducted || deductStock,
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
  }, [applySparepartUsage]);

  const updateServiceStatus = useCallback(async (
    id: string,
    status: ServiceStatus
  ) => updateService(id, { status }), [updateService]);

  const deleteService = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'services', id));
      return { success: true };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Gagal menghapus servis');
      setError(message);
      return { success: false, error: message };
    }
  }, []);

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
