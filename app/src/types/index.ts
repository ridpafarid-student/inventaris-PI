// ============================================
// TYPE DEFINITIONS - INVENTARIS BARANG
// ============================================

// Role User
export type UserRole = 'admin' | 'staff';

// User Data
export interface UserData {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

// Kategori Barang
export interface Kategori {
  id: string;
  nama: string;
  deskripsi: string;
  createdAt: Date;
}

// Barang
export interface Barang {
  id: string;
  kodeBarang: string;
  nama: string;
  kategoriId: string;
  kategoriNama?: string;
  stok: number;
  stokMinimum: number;
  hargaBeli: number;
  hargaJual: number;
  satuan: string;
  deskripsi: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tipe Transaksi Stok
export type TipeTransaksi = 'masuk' | 'keluar';

// Transaksi Stok
export interface TransaksiStok {
  id: string;
  barangId: string;
  barangNama: string;
  barangKode: string;
  tipe: TipeTransaksi;
  jumlah: number;
  stokSebelum: number;
  stokSesudah: number;
  hargaSatuan: number;
  totalHarga: number;
  keterangan: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

// Alert Stok
export interface AlertStok {
  barangId: string;
  barangNama: string;
  barangKode: string;
  stok: number;
  stokMinimum: number;
  selisih: number;
}

// Dashboard Stats
export interface DashboardStats {
  totalBarang: number;
  totalKategori: number;
  totalTransaksiHariIni: number;
  stokMenipis: number;
  nilaiInventori: number;
}

// Chart Data
export interface ChartData {
  name: string;
  value: number;
}

// Laporan Filter
export interface LaporanFilter {
  startDate: Date;
  endDate: Date;
  tipeTransaksi: 'all' | 'masuk' | 'keluar';
  kategoriId: string;
}
