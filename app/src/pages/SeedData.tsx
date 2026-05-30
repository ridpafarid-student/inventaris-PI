import { useState } from 'react';
import type { ServiceStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { collection, doc, writeBatch, serverTimestamp, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Database, Trash2 } from 'lucide-react';

export default function SeedData() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const generateData = async () => {
    if (!userData || userData.role !== 'admin') {
      setStatus('Akses ditolak. Hanya admin yang bisa generate data.');
      return;
    }

    setLoading(true);
    setStatus('Memulai generate data...');
    try {
      const batch = writeBatch(db);

      // 1. Generate Kategori
      const kategori = [
        { id: doc(collection(db, 'kategori')).id, nama: 'Laptop', deskripsi: 'Perangkat Laptop' },
        { id: doc(collection(db, 'kategori')).id, nama: 'Smartphone', deskripsi: 'Perangkat Smartphone' },
        { id: doc(collection(db, 'kategori')).id, nama: 'Aksesoris', deskripsi: 'Aksesoris Komputer' },
        { id: doc(collection(db, 'kategori')).id, nama: 'Sparepart', deskripsi: 'Suku Cadang & Komponen' },
      ];

      kategori.forEach(k => {
        batch.set(doc(db, 'kategori', k.id), {
          nama: k.nama,
          deskripsi: k.deskripsi,
          createdAt: serverTimestamp()
        });
      });

      // 2. Generate Barang
      const barang: any[] = [];
      kategori.forEach((k, index) => {
        for (let i = 1; i <= 5; i++) {
          const id = doc(collection(db, 'barang')).id;
          const hargaBeli = 100000 * i * (index + 1);
          const hargaJual = hargaBeli + (hargaBeli * 0.2); // 20% margin
          const b = {
            id,
            kategoriId: k.id,
            kategoriNama: k.nama,
            kodeBarang: `BRG-${k.nama.substring(0, 3).toUpperCase()}-${100 + i}`,
            nama: `Dummy ${k.nama} ${i}`,
            stok: 50 + (i * 10),
            stokMinimum: 10,
            hargaBeli,
            hargaJual,
            satuan: 'pcs',
            deskripsi: `Barang dummy otomatis untuk testing laporan`,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          barang.push(b);
          batch.set(doc(db, 'barang', id), {
            kategoriId: b.kategoriId,
            kategoriNama: b.kategoriNama,
            kodeBarang: b.kodeBarang,
            nama: b.nama,
            stok: b.stok,
            stokMinimum: b.stokMinimum,
            hargaBeli: b.hargaBeli,
            hargaJual: b.hargaJual,
            satuan: b.satuan,
            deskripsi: b.deskripsi,
            createdAt: b.createdAt,
            updatedAt: b.updatedAt
          });
        }
      });

      // 3. Generate Transaksi (Masuk & Keluar) tersebar dalam 3 bulan terakhir
      const now = new Date();
      barang.forEach(b => {
        // Buat 10 transaksi per barang
        for (let i = 0; i < 10; i++) {
          const tDate = new Date(now.getTime() - (Math.random() * 90 * 24 * 60 * 60 * 1000)); // random date in last 90 days
          const isMasuk = Math.random() > 0.6;
          const jumlah = Math.floor(Math.random() * 10) + 1;

          const tRef = doc(collection(db, 'transaksi'));
          batch.set(tRef, {
            barangId: b.id,
            barangNama: b.nama,
            barangKode: b.kodeBarang,
            tipe: isMasuk ? 'masuk' : 'keluar',
            jumlah: jumlah,
            stokSebelum: b.stok,
            stokSesudah: isMasuk ? b.stok + jumlah : b.stok - jumlah,
            hargaSatuan: isMasuk ? b.hargaBeli : b.hargaJual,
            totalHarga: jumlah * (isMasuk ? b.hargaBeli : b.hargaJual),
            keterangan: `Transaksi dummy otomatis ${isMasuk ? 'pembelian' : 'penjualan'}`,
            userId: userData.uid,
            userName: userData.name,
            createdAt: tDate // Custom past date
          });
        }
      });

      // 4. Generate Servis
      const sparepartBarang = barang.filter(b => b.kategoriNama === 'Sparepart');
      for (let i = 1; i <= 20; i++) {
        const sRef = doc(collection(db, 'services'));
        const sDate = new Date(now.getTime() - (Math.random() * 60 * 24 * 60 * 60 * 1000));
        const statuses: ServiceStatus[] = ['pending', 'proses', 'menunggu-sparepart', 'selesai', 'diambil'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const isCompleted = status === 'selesai' || status === 'diambil';
        const isPickedUp = status === 'diambil';

        const usedSpareparts = [];
        if (status !== 'pending' && sparepartBarang.length > 0) {
          // Add 1-2 random products as spareparts
          const p1 = sparepartBarang[Math.floor(Math.random() * sparepartBarang.length)];
          usedSpareparts.push({
            productId: p1.id,
            namaProduk: p1.nama,
            jumlah: 1
          });
        }

        batch.set(sRef, {
          noNota: `NT-${i.toString().padStart(4, '0')}`,
          namaPelanggan: `Pelanggan Dummy ${i}`,
          nomorHp: `0812345678${i.toString().padStart(2, '0')}`,
          jenisPerangkat: ['Laptop', 'Smartphone', 'Tablet', 'CPU', 'Printer'][i % 5],
          modelPerangkat: `Model Perangkat ${i}`,
          deskripsiMasalah: `Masalah dummy untuk testing data laporan`,
          status: status,
          biayaJasa: status !== 'pending' ? 50000 * (Math.floor(Math.random() * 6) + 1) : 0,
          sparepartDigunakan: usedSpareparts,
          stokDikurangi: usedSpareparts.length > 0,
          completedAt: isCompleted ? sDate : null,
          pickedUpAt: isPickedUp ? sDate : null,
          userId: userData.uid,
          userName: userData.name,
          createdByName: userData.name,
          createdAt: sDate,
          updatedAt: sDate
        });
      }

      await batch.commit();
      setStatus('Berhasil! Ratusan data dummy telah di-generate.');
    } catch (error: any) {
      console.error(error);
      setStatus(`Gagal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!userData || userData.role !== 'admin') {
      setStatus('Akses ditolak.');
      return;
    }

    if (!window.confirm('PERINGATAN: Ini akan MENGHAPUS SEMUA DATA (Kategori, Barang, Transaksi, dan Servis) dari database. Apakah kamu yakin?')) {
      return;
    }

    setLoading(true);
    setStatus('Sedang menghapus semua data...');
    try {
      const collectionsToClear = ['kategori', 'barang', 'transaksi', 'services'];

      for (const colName of collectionsToClear) {
        const querySnapshot = await getDocs(collection(db, colName));
        const deletePromises: Promise<void>[] = [];
        querySnapshot.forEach((document) => {
          deletePromises.push(deleteDoc(doc(db, colName, document.id)));
        });
        await Promise.all(deletePromises);
      }

      setStatus('Berhasil! Semua data telah dibersihkan.');
    } catch (error: any) {
      console.error(error);
      setStatus(`Gagal menghapus data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800">Developer Tools</h1>
        <p className="text-sm text-gray-400 mt-0.5">Hanya untuk keperluan pengujian dan development</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Seed Dummy Data
          </CardTitle>
          <CardDescription>
            Fitur ini akan memasukkan data Kategori, Barang, Transaksi (stok masuk/keluar dalam 3 bulan terakhir), dan Servis secara otomatis ke database untuk keperluan pengujian Laporan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={generateData}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Generate Ratusan Data Dummy Sekarang'
                )}
              </Button>

              <Button
                onClick={clearAllData}
                disabled={loading}
                variant="destructive"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Hapus Semua Data
                  </>
                )}
              </Button>
            </div>

            {status && (
              <div className={`p-4 rounded-lg text-sm font-medium ${status.includes('Berhasil') ? 'bg-green-50 text-green-700 border border-green-200' :
                  status.includes('Gagal') ? 'bg-red-50 text-red-700 border border-red-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                {status}
              </div>
            )}

            <p className="text-xs text-red-500 mt-2 font-medium">
              Peringatan: Gunakan hanya di lingkungan Development/Testing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
