// ============================================
// PAGE - Dashboard Admin M-THREE COMPUTER
// ============================================

import { useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ChevronRight,
  Laptop,
  Cpu,
  Smartphone,
  Printer,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect } from 'react';
import type { ServiceItem, Barang } from '@/types';

// ─── Status badge helper ───────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    ring: 'ring-blue-200',
  },
  'menunggu-sparepart': {
    label: 'Menunggu Sparepart',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    ring: 'ring-orange-200',
  },
  proses: {
    label: 'Proses',
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
    ring: 'ring-yellow-200',
  },
  selesai: {
    label: 'Selesai',
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
    ring: 'ring-green-200',
  },
  diambil: {
    label: 'Diambil',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    dot: 'bg-slate-500',
    ring: 'ring-slate-200',
  },
} as const;

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Device icon ──────────────────────────────────────────────────────────
function DeviceIcon({ type }: { type: string }) {
  if (type === 'Smartphone' || type === 'Tablet') return <Smartphone className="w-3.5 h-3.5 text-gray-400" />;
  if (type === 'CPU') return <Cpu className="w-3.5 h-3.5 text-gray-400" />;
  if (type === 'Printer') return <Printer className="w-3.5 h-3.5 text-gray-400" />;
  return <Laptop className="w-3.5 h-3.5 text-gray-400" />;
}

// ─── Stats Card ──────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor = 'text-[#1F2937]',
  accent = false,
}: {
  title: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-5 shadow-sm flex items-start justify-between gap-4 transition-shadow hover:shadow-md ${accent ? 'border-orange-200 ring-1 ring-orange-100' : 'border-gray-100'
        }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className={`text-3xl font-bold mt-1.5 leading-none ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1.5 font-medium">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────
function SectionHeader({ title, sub, count }: { title: string; sub?: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-[#1F2937]">{title}</h2>
        {sub && <p className="text-sm text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {count !== undefined && (
        <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
          {count} item
        </span>
      )}
    </div>
  );
}

// ─── Pie chart colors ─────────────────────────────────────────────────────
const PIE_COLORS = ['#3B82F6', '#F97316', '#F59E0B', '#10B981', '#64748B'];

// ─── Format currency ──────────────────────────────────────────────────────
function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════

export default function Dashboard({ onPageChange }: { onPageChange?: (page: string) => void }) {
  const { stats, servisByStatus, loading } = useDashboard();
  const { userData } = useAuth();

  // Ambil 5 servis terbaru langsung
  const [recentServices, setRecentServices] = useState<ServiceItem[]>([]);
  // Ambil barang stok rendah berdasarkan batas minimum tiap barang.
  const [lowStockBarang, setLowStockBarang] = useState<Barang[]>([]);

  useEffect(() => {
    // Services terbaru
    const unsubSvc = onSnapshot(
      query(collection(db, 'services'), orderBy('createdAt', 'desc'), limit(5)),
      (snap) => {
        const list: ServiceItem[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ServiceItem));
        setRecentServices(list);
      }
    );
    // Stok rendah
    const unsubBarang = onSnapshot(collection(db, 'barang'), (snap) => {
      const list: Barang[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Barang));
      setLowStockBarang(list.filter((b) => b.stok <= b.stokMinimum).sort((a, b) => a.stok - b.stok).slice(0, 8));
    });

    return () => {
      unsubSvc();
      unsubBarang();
    };
  }, []);

  // Teknisi/Oleh mengikuti pola transaksi stok: userName, lalu fallback data lama.
  const getTechnician = (service: ServiceItem) => service.userName || service.createdByName || '-';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-200 border-t-[#0077CC]" />
          <p className="text-sm text-gray-400 font-medium">Memuat dashboard…</p>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const pieData = servisByStatus.every((i) => i.value === 0)
    ? servisByStatus.map((i) => ({ ...i, chartValue: 1 }))
    : servisByStatus.map((i) => ({ ...i, chartValue: i.value }));

  const siapDiambil = stats.servisSelesai;

  return (
    <div className="space-y-7 max-w-[1400px]">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Selamat datang, <span className="font-semibold text-[#0077CC]">{userData?.name}</span> — {today}
          </p>
        </div>
        {/* Quick alert banner */}
        {stats.stokMenipis > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-sm font-medium px-4 py-2 rounded-xl ring-1 ring-orange-100">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{stats.stokMenipis} item stok kritis</span>
          </div>
        )}
      </div>

      {/* ── Statistics Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Servis Aktif"
          value={stats.servisAktif}
          sub={`${stats.servisMenungguSparepart} Menunggu Konfirmasi`}
          icon={Wrench}
          iconBg="bg-blue-50"
          iconColor="text-[#0077CC]"
          valueColor="text-[#0077CC]"
        />
        <StatCard
          title="Siap Diambil"
          value={siapDiambil}
          sub="Unit selesai diperbaiki"
          icon={CheckCircle2}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          valueColor="text-green-700"
        />
        <StatCard
          title="Stok Kritikal"
          value={stats.stokMenipis}
          sub="Spare part stok rendah"
          icon={AlertTriangle}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          valueColor="text-orange-600"
          accent
        />
        <StatCard
          title="Laba Hari Ini"
          value={formatRp(stats.labaHariIni)}
          sub={`${stats.totalTransaksiHariIni} transaksi hari ini`}
          icon={TrendingUp}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          valueColor="text-[#1E3A8A]"
        />
      </div>

      {/* ── Two column layout ────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* LEFT — service table (2/3 width) */}
        <div className="xl:col-span-2 space-y-6">

          {/* Tabel Servis Terbaru */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50">
              <SectionHeader
                title="5 Transaksi Servis Terkini"
                sub="Daftar pekerjaan servis yang baru masuk"
                count={recentServices.length}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">No Nota</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Pelanggan</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Model/Seri</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Keluhan</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentServices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
                        <Wrench className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                        <p className="text-sm">Belum ada data servis</p>
                      </td>
                    </tr>
                  ) : (
                    recentServices.map((service, idx) => (
                      <tr key={service.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-semibold text-[#1E3A8A] bg-blue-50 px-2 py-1 rounded">
                            #{String(idx + 1).padStart(3, '0')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-[#1F2937] text-sm">{service.namaPelanggan}</p>
                          <p className="text-xs text-gray-400">{service.nomorHp}</p>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <DeviceIcon type={service.jenisPerangkat} />
                            <div>
                              <p className="text-sm text-[#1F2937] font-medium">{service.modelPerangkat}</p>
                              <p className="text-xs text-gray-400">{service.jenisPerangkat}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <p className="text-sm text-gray-600 max-w-[180px] truncate" title={service.deskripsiMasalah}>
                            {service.deskripsiMasalah}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={service.status as keyof typeof STATUS_CONFIG} />
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className="text-sm text-gray-500">{getTechnician(service)}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabel Stok Kritikal */}
          <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden ring-1 ring-orange-50">
            <div className="px-6 py-5 border-b border-orange-50 bg-orange-50/50">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4.5 h-4.5 text-orange-500" style={{ width: '18px', height: '18px' }} />
                <h2 className="text-lg font-semibold text-[#1F2937]">Peringatan Stok</h2>
                <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full ml-1">
                  Batas Minimum
                </span>
              </div>
              <p className="text-sm text-gray-400">Item berikut sudah mencapai atau melewati stok minimum</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Kode Barang</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Nama Barang</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Spesifikasi</th>
                    <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Stok Sisa</th>
                    <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 hidden sm:table-cell">Harga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lowStockBarang.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400">
                        <Package className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                        <p className="text-sm font-medium text-green-600">🎉 Semua stok aman!</p>
                      </td>
                    </tr>
                  ) : (
                    lowStockBarang.map((barang) => (
                      <tr key={barang.id} className="hover:bg-orange-50/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {barang.kodeBarang}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-[#1F2937]">{barang.nama}</p>
                          <p className="text-xs text-gray-400">Min stok: {barang.stokMinimum}</p>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <p className="text-sm text-gray-500">{barang.satuan}</p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center justify-center w-10 h-7 rounded-lg text-sm font-bold ring-1 ${barang.stok === 0
                            ? 'bg-red-100 text-red-700 ring-red-200'
                            : 'bg-orange-100 text-orange-700 ring-orange-200'
                            }`}>
                            {barang.stok}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                          <span className="text-sm font-semibold text-[#1F2937]">
                            {formatRp(barang.hargaJual)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT — charts + info panel (1/3 width) */}
        <div className="space-y-5">

          {/* Pie chart status servis */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-base font-semibold text-[#1F2937] mb-1">Distribusi Status Servis</h3>
            <p className="text-xs text-gray-400 mb-4">Berdasarkan semua data aktif</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={78}
                    dataKey="chartValue"
                    strokeWidth={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(_, __, item) => [item?.payload?.value ?? 0, item?.payload?.name]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick stats breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="text-base font-semibold text-[#1F2937] mb-3">Ringkasan Servis</h3>
            {[
              { label: 'Total Servis', value: stats.totalServis, color: 'text-[#1F2937]' },
              { label: 'Aktif / On-progress', value: stats.servisAktif, color: 'text-[#0077CC]' },
              { label: 'Menunggu Sparepart', value: stats.servisMenungguSparepart, color: 'text-orange-600' },
              { label: 'Selesai (all time)', value: stats.servisSelesai, color: 'text-green-600' },
              { label: 'Masuk Hari Ini', value: stats.servisHariIni, color: 'text-purple-600' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{row.label}</span>
                <span className={`text-sm font-bold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>



          {/* Inventory overview */}
          <div className="bg-gradient-to-br from-[#1E3A8A] to-[#0077CC] rounded-xl shadow-md p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-blue-200" />
              <h3 className="text-base font-semibold">Inventaris</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Total Barang', value: stats.totalBarang, icon: ArrowDownLeft },
                { label: 'Stok Menipis', value: stats.stokMenipis, icon: AlertTriangle },
                { label: 'Sparepart Terpakai', value: stats.totalSparepartTerpakai, icon: ArrowUpRight },
                { label: 'Transaksi Hari Ini', value: stats.totalTransaksiHariIni, icon: Clock },
              ].map((row) => {
                const Ic = row.icon;
                return (
                  <div key={row.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ic className="w-3.5 h-3.5 text-blue-200" style={{ width: '14px', height: '14px' }} />
                      <span className="text-sm text-blue-100">{row.label}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{row.value}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-blue-600/50">
              <button
                onClick={() => onPageChange?.('barang')}
                className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
              >
                <span className="text-xs text-blue-200 font-medium">Lihat Inventaris Lengkap</span>
                <ChevronRight className="w-4 h-4 text-blue-200" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Legend Bar ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
        <div className="flex flex-wrap gap-4 items-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2">Keterangan Status:</p>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-xs font-medium text-gray-600">{cfg.label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
            <Badge variant="outline" className="text-xs font-medium border-orange-200 text-orange-600">
              Stok mencapai minimum = Kritikal
            </Badge>
          </div>
        </div>
      </div>

    </div>
  );
}
