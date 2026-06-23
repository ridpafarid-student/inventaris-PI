import { useState } from 'react';
import type { ServiceStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { collection, doc, writeBatch, serverTimestamp, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Database, Trash2 } from 'lucide-react';

type SeedBarang = {
  id: string;
  kategoriId: string;
  kategoriNama: string;
  kodeBarang: string;
  nama: string;
  stok: number;
  stokMinimum: number;
  hargaBeli: number;
  hargaJual: number;
  satuan: string;
  deskripsi: string;
};

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
        { id: doc(collection(db, 'kategori')).id, nama: 'Perangkat', deskripsi: 'Unit laptop, komputer, printer, dan smartphone' },
        { id: doc(collection(db, 'kategori')).id, nama: 'Sparepart', deskripsi: 'Suku Cadang & Komponen' },
        { id: doc(collection(db, 'kategori')).id, nama: 'Aksesoris', deskripsi: 'Aksesoris Komputer' },
        { id: doc(collection(db, 'kategori')).id, nama: 'Consumable', deskripsi: 'Barang habis pakai servis' },
      ];

      kategori.forEach(k => {
        batch.set(doc(db, 'kategori', k.id), {
          nama: k.nama,
          deskripsi: k.deskripsi,
          createdAt: serverTimestamp()
        });
      });

      const kategoriByName = Object.fromEntries(kategori.map((item) => [item.nama, item]));
      const createBarang = (
        kategoriNama: string,
        kodeBarang: string,
        nama: string,
        stok: number,
        stokMinimum: number,
        hargaBeli: number,
        hargaJual: number,
        deskripsi: string,
        satuan = 'pcs'
      ): SeedBarang => {
        const selectedKategori = kategoriByName[kategoriNama];
        return {
          id: doc(collection(db, 'barang')).id,
          kategoriId: selectedKategori.id,
          kategoriNama,
          kodeBarang,
          nama,
          stok,
          stokMinimum,
          hargaBeli,
          hargaJual,
          satuan,
          deskripsi,
        };
      };

      // 2. Generate Barang dengan skenario stok aman, kritis, dan habis
      const barang: SeedBarang[] = [
        createBarang('Sparepart', 'SPR-KBD-001', 'Keyboard Laptop Universal', 3, 5, 85000, 125000, 'Stok kritis untuk uji rekomendasi restock'),
        createBarang('Sparepart', 'SPR-SSD-256', 'SSD 256GB SATA', 2, 4, 230000, 315000, 'Stok kritis dan sering dipakai servis'),
        createBarang('Sparepart', 'SPR-CHG-19V', 'Charger Laptop 19V', 0, 3, 145000, 210000, 'Stok habis untuk uji menunggu sparepart'),
        createBarang('Sparepart', 'SPR-RAM-8GB', 'RAM DDR4 8GB', 8, 5, 260000, 350000, 'Stok aman setelah pemakaian servis'),
        createBarang('Sparepart', 'SPR-LCD-14', 'LCD Laptop 14 Inch', 1, 2, 520000, 690000, 'Stok kritis bernilai tinggi'),
        createBarang('Aksesoris', 'AKS-MSE-001', 'Mouse Wireless', 15, 5, 65000, 95000, 'Aksesoris stok aman'),
        createBarang('Aksesoris', 'AKS-HDM-002', 'Kabel HDMI 2 Meter', 12, 4, 35000, 55000, 'Aksesoris stok aman'),
        createBarang('Consumable', 'CON-TPS-001', 'Thermal Paste 4g', 6, 10, 25000, 45000, 'Consumable kritis untuk servis rutin'),
        createBarang('Perangkat', 'DEV-LTP-001', 'Laptop Bekas Siap Jual', 2, 1, 2500000, 3200000, 'Perangkat jual stok aman'),
      ];

      barang.forEach((item) => {
        batch.set(doc(db, 'barang', item.id), {
          kategoriId: item.kategoriId,
          kategoriNama: item.kategoriNama,
          kodeBarang: item.kodeBarang,
          nama: item.nama,
          stok: item.stok,
          stokMinimum: item.stokMinimum,
          hargaBeli: item.hargaBeli,
          hargaJual: item.hargaJual,
          satuan: item.satuan,
          deskripsi: item.deskripsi,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      // 3. Generate Transaksi manual untuk uji stok masuk/keluar
      const now = new Date();
      const daysAgo = (days: number) => new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      const findBarang = (kodeBarang: string) => {
        const item = barang.find((product) => product.kodeBarang === kodeBarang);
        if (!item) {
          throw new Error(`Seed barang ${kodeBarang} tidak ditemukan`);
        }
        return item;
      };
      const addTransaksi = (
        item: SeedBarang,
        tipe: 'masuk' | 'keluar',
        jumlah: number,
        stokSebelum: number,
        tanggal: Date,
        keterangan: string
      ) => {
        const stokSesudah = tipe === 'masuk' ? stokSebelum + jumlah : stokSebelum - jumlah;
        const hargaSatuan = tipe === 'masuk' ? item.hargaBeli : item.hargaJual;
        batch.set(doc(collection(db, 'transaksi')), {
          barangId: item.id,
          barangNama: item.nama,
          barangKode: item.kodeBarang,
          tipe,
          jumlah,
          stokSebelum,
          stokSesudah,
          hargaSatuan,
          totalHarga: jumlah * hargaSatuan,
          keterangan,
          userId: userData.uid,
          userName: userData.name,
          source: 'manual',
          createdAt: tanggal
        });
      };

      addTransaksi(findBarang('SPR-KBD-001'), 'masuk', 8, 0, daysAgo(45), 'Pembelian awal stok keyboard');
      addTransaksi(findBarang('SPR-KBD-001'), 'keluar', 3, 6, daysAgo(8), 'Penjualan keyboard manual');
      addTransaksi(findBarang('SPR-SSD-256'), 'masuk', 6, 0, daysAgo(40), 'Pembelian SSD untuk stok servis');
      addTransaksi(findBarang('SPR-SSD-256'), 'keluar', 2, 5, daysAgo(12), 'Penjualan SSD manual');
      addTransaksi(findBarang('SPR-CHG-19V'), 'masuk', 3, 0, daysAgo(35), 'Pembelian charger laptop');
      addTransaksi(findBarang('SPR-CHG-19V'), 'keluar', 3, 3, daysAgo(4), 'Stok charger habis untuk pelanggan');
      addTransaksi(findBarang('AKS-MSE-001'), 'masuk', 20, 0, daysAgo(30), 'Pembelian mouse wireless');
      addTransaksi(findBarang('AKS-MSE-001'), 'keluar', 5, 20, daysAgo(5), 'Penjualan mouse wireless');
      addTransaksi(findBarang('CON-TPS-001'), 'masuk', 12, 0, daysAgo(20), 'Pembelian thermal paste');

      // 4. Generate Servis sesuai alur baru stok-servis
      const serviceScenarios: Array<{
        noNota: string;
        namaPelanggan: string;
        nomorHp: string;
        jenisPerangkat: 'Laptop' | 'Smartphone' | 'Tablet' | 'CPU' | 'Printer';
        modelPerangkat: string;
        deskripsiMasalah: string;
        status: ServiceStatus;
        biayaJasa: number;
        spareparts: Array<{ barang: SeedBarang; jumlah: number }>;
        createdAt: Date;
      }> = [
        {
          noNota: 'NT-0001',
          namaPelanggan: 'Raka Pratama',
          nomorHp: '081234560001',
          jenisPerangkat: 'Laptop',
          modelPerangkat: 'ASUS A456U',
          deskripsiMasalah: 'Laptop mati total, menunggu pengecekan awal',
          status: 'pending',
          biayaJasa: 0,
          spareparts: [],
          createdAt: daysAgo(1),
        },
        {
          noNota: 'NT-0002',
          namaPelanggan: 'Dina Safitri',
          nomorHp: '081234560002',
          jenisPerangkat: 'Laptop',
          modelPerangkat: 'Lenovo Ideapad 330',
          deskripsiMasalah: 'Adaptor rusak dan stok charger sedang kosong',
          status: 'menunggu-sparepart',
          biayaJasa: 50000,
          spareparts: [{ barang: findBarang('SPR-CHG-19V'), jumlah: 1 }],
          createdAt: daysAgo(2),
        },
        {
          noNota: 'NT-0003',
          namaPelanggan: 'Bima Saputra',
          nomorHp: '081234560003',
          jenisPerangkat: 'Laptop',
          modelPerangkat: 'Acer Aspire 5',
          deskripsiMasalah: 'Keyboard beberapa tombol tidak berfungsi',
          status: 'proses',
          biayaJasa: 120000,
          spareparts: [{ barang: findBarang('SPR-KBD-001'), jumlah: 1 }],
          createdAt: daysAgo(3),
        },
        {
          noNota: 'NT-0004',
          namaPelanggan: 'Sari Wulandari',
          nomorHp: '081234560004',
          jenisPerangkat: 'Laptop',
          modelPerangkat: 'HP Pavilion 14',
          deskripsiMasalah: 'Upgrade SSD dan instal ulang sistem',
          status: 'selesai',
          biayaJasa: 150000,
          spareparts: [{ barang: findBarang('SPR-SSD-256'), jumlah: 1 }],
          createdAt: daysAgo(6),
        },
        {
          noNota: 'NT-0005',
          namaPelanggan: 'Agus Setiawan',
          nomorHp: '081234560005',
          jenisPerangkat: 'CPU',
          modelPerangkat: 'PC Rakitan i5',
          deskripsiMasalah: 'Upgrade RAM dan pembersihan thermal',
          status: 'diambil',
          biayaJasa: 200000,
          spareparts: [
            { barang: findBarang('SPR-RAM-8GB'), jumlah: 2 },
            { barang: findBarang('CON-TPS-001'), jumlah: 1 },
          ],
          createdAt: daysAgo(9),
        },
        {
          noNota: 'NT-0006',
          namaPelanggan: 'Maya Kartika',
          nomorHp: '081234560006',
          jenisPerangkat: 'Laptop',
          modelPerangkat: 'Dell Inspiron 14',
          deskripsiMasalah: 'LCD pecah, penggantian panel sedang diproses',
          status: 'proses',
          biayaJasa: 180000,
          spareparts: [{ barang: findBarang('SPR-LCD-14'), jumlah: 1 }],
          createdAt: daysAgo(10),
        },
      ];

      serviceScenarios.forEach((service) => {
        const serviceRef = doc(collection(db, 'services'));
        const shouldDeductStock = service.status === 'proses' || service.status === 'selesai' || service.status === 'diambil';
        const stokDikurangi = shouldDeductStock && service.spareparts.length > 0;
        const serviceSpareparts = service.spareparts.map((item) => ({
          productId: item.barang.id,
          namaProduk: item.barang.nama,
          jumlah: item.jumlah,
        }));

        batch.set(serviceRef, {
          noNota: service.noNota,
          namaPelanggan: service.namaPelanggan,
          nomorHp: service.nomorHp,
          jenisPerangkat: service.jenisPerangkat,
          modelPerangkat: service.modelPerangkat,
          deskripsiMasalah: service.deskripsiMasalah,
          status: service.status,
          biayaJasa: service.biayaJasa,
          sparepartDigunakan: serviceSpareparts,
          stokDikurangi,
          completedAt: service.status === 'selesai' || service.status === 'diambil' ? service.createdAt : null,
          pickedUpAt: service.status === 'diambil' ? service.createdAt : null,
          userId: userData.uid,
          userName: userData.name,
          createdByName: userData.name,
          createdAt: service.createdAt,
          updatedAt: service.createdAt
        });

        if (stokDikurangi) {
          service.spareparts.forEach((sparepart) => {
            const stokSesudah = sparepart.barang.stok;
            const stokSebelum = stokSesudah + sparepart.jumlah;
            const transaksiRef = doc(db, 'transaksi', `service-${serviceRef.id}-${sparepart.barang.id}`);
            batch.set(transaksiRef, {
              barangId: sparepart.barang.id,
              barangNama: sparepart.barang.nama,
              barangKode: sparepart.barang.kodeBarang,
              tipe: 'keluar',
              jumlah: sparepart.jumlah,
              stokSebelum,
              stokSesudah,
              hargaSatuan: sparepart.barang.hargaJual,
              totalHarga: sparepart.jumlah * sparepart.barang.hargaJual,
              keterangan: `Pemakaian sparepart untuk servis ${service.modelPerangkat} - ${service.namaPelanggan}`,
              userId: userData.uid,
              userName: `Servis - ${userData.name}`,
              source: 'service',
              serviceId: serviceRef.id,
              createdAt: service.createdAt,
              updatedAt: service.createdAt,
            });
          });
        }
      });

      await batch.commit();
      setStatus('Berhasil! Data dummy pengujian alur stok-servis telah di-generate.');
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
            Fitur ini akan memasukkan data kategori, barang, transaksi manual, servis menunggu sparepart, servis yang sudah memakai stok, dan transaksi servis resmi untuk pengujian laporan.
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
                  'Generate Data Pengujian'
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
