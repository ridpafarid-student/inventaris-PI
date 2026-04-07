// ============================================
// HOOK - Manajemen Data Barang
// ============================================

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Barang, Kategori } from '@/types';

export function useBarang() {
  const [barangList, setBarangList] = useState<Barang[]>([]);
  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to barang collection
  useEffect(() => {
    const q = query(collection(db, 'barang'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const barang: Barang[] = [];
        snapshot.forEach((doc) => {
          barang.push({ id: doc.id, ...doc.data() } as Barang);
        });
        setBarangList(barang);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Subscribe to kategori collection
  useEffect(() => {
    const q = query(collection(db, 'kategori'), orderBy('nama'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const kategori: Kategori[] = [];
        snapshot.forEach((doc) => {
          kategori.push({ id: doc.id, ...doc.data() } as Kategori);
        });
        setKategoriList(kategori);
      },
      (err) => {
        setError(err.message);
      }
    );

    return unsubscribe;
  }, []);

  // Add barang
  const addBarang = useCallback(async (barang: Omit<Barang, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const kategori = kategoriList.find(k => k.id === barang.kategoriId);
      
      await addDoc(collection(db, 'barang'), {
        ...barang,
        kategoriNama: kategori?.nama || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [kategoriList]);

  // Update barang
  const updateBarang = useCallback(async (id: string, barang: Partial<Barang>) => {
    try {
      const barangRef = doc(db, 'barang', id);
      const kategori = barang.kategoriId ? kategoriList.find(k => k.id === barang.kategoriId) : null;
      
      await updateDoc(barangRef, {
        ...barang,
        ...(kategori && { kategoriNama: kategori.nama }),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [kategoriList]);

  // Delete barang
  const deleteBarang = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'barang', id));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  // Add kategori
  const addKategori = useCallback(async (kategori: Omit<Kategori, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'kategori'), {
        ...kategori,
        createdAt: serverTimestamp()
      });
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  // Delete kategori
  const deleteKategori = useCallback(async (id: string) => {
    try {
      // Check if kategori is used by any barang
      const q = query(collection(db, 'barang'), where('kategoriId', '==', id));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        throw new Error('Kategori masih digunakan oleh barang');
      }
      
      await deleteDoc(doc(db, 'kategori', id));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  return {
    barangList,
    kategoriList,
    loading,
    error,
    addBarang,
    updateBarang,
    deleteBarang,
    addKategori,
    deleteKategori
  };
}
