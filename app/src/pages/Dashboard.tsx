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
  ResponsiveContainer,
} from 'recharts';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect } from 'react';
import type { ServiceItem, ServiceStatus } from '@/types';

const surface = {
  base: 'bg-surface-base',
  muted: 'bg-surface-muted',
  panel: 'bg-surface-muted',
  panelHover: 'hover:bg-surface-muted/50',
  border: 'border-border-default',
  borderStrong: 'border-border-default',
  text: 'text-text-primary',
  secondary: 'text-text-secondary',
  tertiary: 'text-text-secondary/70',
  accent: 'text-text-inverse',
  accentBg: 'bg-text-inverse/10',
  accentBorder: 'border-text-inverse/40',
  focus: 'focus-visible:outline-none focus-visible:shadow-focus',
};

// ─── Status badge helper ───────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    bg: 'bg-text-inverse/10',
    text: 'text-text-inverse',
    dot: 'bg-text-inverse',
    ring: 'ring-text-inverse/30',
  },
  'menunggu-sparepart': {
    label: 'Menunggu Sparepart',
    bg: 'bg-orange-500/10',
    text: 'text-orange-300',
    dot: 'bg-orange-400',
    ring: 'ring-orange-400/30',
  },
  proses: {
    label: 'Proses',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-300',
    dot: 'bg-yellow-400',
    ring: 'ring-yellow-400/30',
  },
  selesai: {
    label: 'Selesai',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-400/30',
  },
  diambil: {
    label: 'Diserahkan',
    bg: 'bg-neutral-500/10',
    text: 'text-neutral-300',
    dot: 'bg-neutral-400',
    ring: 'ring-neutral-400/30',
  },
} as const;

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Device icon ──────────────────────────────────────────────────────────
function DeviceIcon({ type }: { type: string }) {
  if (type === 'Smartphone' || type === 'Tablet') return <Smartphone className={`h-3.5 w-3.5 ${surface.secondary}`} />;
  if (type === 'CPU') return <Cpu className={`h-3.5 w-3.5 ${surface.secondary}`} />;
  if (type === 'Printer') return <Printer className={`h-3.5 w-3.5 ${surface.secondary}`} />;
  return <Laptop className={`h-3.5 w-3.5 ${surface.secondary}`} />;
}

// ─── Stats Card ──────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor = surface.text,
  accent = false,
  onClick,
}: {
  title: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  const isClickable = Boolean(onClick);
  const content = (
    <>
      <div className="flex-1 min-w-0 text-left">
        <p className={`truncate text-sm font-medium leading-6 ${surface.secondary}`}>{title}</p>
        <p className={`mt-1 text-base font-semibold leading-6 tabular-nums ${valueColor}`}>{value}</p>
        {sub && <p className={`mt-1 text-[13px] font-normal leading-5 ${surface.secondary}`}>{sub}</p>}
      </div>
      <div className={`shrink-0 rounded-md p-3.5 ${iconBg}`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
    </>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-start justify-between gap-4 rounded-[12px] border p-5 text-left shadow-sm transition-colors duration-150 ${surface.panel} ${surface.panelHover} ${surface.focus} ${
          accent
            ? `${surface.accentBorder} ring-1 ring-text-inverse/20 active:border-text-inverse`
            : `${surface.border} active:border-border-default`
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-[12px] border p-5 shadow-sm transition-colors duration-150 ${surface.panel} ${surface.panelHover} ${
        accent
          ? `${surface.accentBorder} ring-1 ring-text-inverse/20`
          : surface.border
      }`}
    >
      {content}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────
function SectionHeader({ title, sub, count }: { title: string; sub?: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className={`text-base font-semibold leading-6 ${surface.text}`}>{title}</h2>
        {sub && <p className={`mt-0.5 text-sm leading-6 ${surface.secondary}`}>{sub}</p>}
      </div>
      {count !== undefined && (
        <span className={`rounded-full border px-2.5 py-1 text-[13px] font-medium ${surface.border} ${surface.secondary}`}>
          {count} item
        </span>
      )}
    </div>
  );
}

// ─── Pie chart colors ─────────────────────────────────────────────────────
// NOTE: Recharts requires resolved color values for fill/stroke props.
// Using CSS variables directly since Recharts accepts them in modern browsers.
const PIE_COLORS = [
  'hsl(var(--color-text-inverse))',     // #52a8ff - primary accent
  'hsl(25 95% 61%)',                     // orange - status warning
  'hsl(48 96% 56%)',                     // yellow - status in-progress  
  'hsl(142 71% 56%)',                    // emerald - status success
  'hsl(0 0% 64%)',                       // neutral - status neutral
];

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

export default function Dashboard({ onPageChange }: { onPageChange?: (page: string, status?: 'all' | ServiceStatus | 'perlu-restock') => void }) {
  const { stats, servisByStatus, loading } = useDashboard();
  const { userData, isTeknisi } = useAuth();

  // Ambil 5 servis terbaru langsung
  const [recentServices, setRecentServices] = useState<ServiceItem[]>([]);

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

    return () => {
      unsubSvc();
    };
  }, []);

  // Teknisi/Oleh mengikuti pola transaksi stok: userName, lalu fallback data lama.
  const getTechnician = (service: ServiceItem) => service.userName || service.createdByName || '-';

  if (loading) {
    return (
      <div className={`-m-4 flex h-64 items-center justify-center ${surface.base} lg:-m-8`}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-border-default border-t-text-inverse" />
          <p className={`text-sm font-medium leading-6 ${surface.secondary}`}>Memuat dashboard...</p>
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
    <div className={`${surface.base} ${surface.text} -m-4 min-h-screen max-w-[1400px] space-y-6 p-4 font-[Geist,Arial,Apple_Color_Emoji,Segoe_UI_Emoji,Segoe_UI_Symbol] lg:-m-8 lg:p-8`}>

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className={`text-base font-semibold leading-6 ${surface.text}`}>
            Dashboard
          </h1>
          <p className={`mt-0.5 text-sm font-normal leading-6 ${surface.secondary}`}>
            Selamat datang, <span className={`font-medium ${surface.accent}`}>{userData?.name}</span> — {today}
          </p>
        </div>
      </div>

      {/* ── Statistics Cards ────────────────────────────────── */}
      <div className={`grid grid-cols-2 ${isTeknisi ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
        <StatCard
          title="Servis Aktif"
          value={stats.servisAktif}
          sub={`${stats.servisMenungguSparepart} Menunggu Konfirmasi`}
          icon={Wrench}
          iconBg={surface.accentBg}
          iconColor={surface.accent}
          valueColor={surface.accent}
          onClick={() => onPageChange?.('servis', 'menunggu-sparepart')}
        />
        <StatCard
          title="Siap Diserahkan"
          value={siapDiambil}
          sub="Unit selesai diperbaiki"
          icon={CheckCircle2}
          iconBg="bg-text-secondary/10"
          iconColor={surface.secondary}
          valueColor={surface.text}
          onClick={() => onPageChange?.('servis', 'selesai')}
        />
        <StatCard
          title="Stok Kritikal"
          value={stats.stokMenipis}
          sub="Spare part stok rendah"
          icon={AlertTriangle}
          iconBg="bg-text-secondary/10"
          iconColor={surface.secondary}
          valueColor={surface.text}
          onClick={() => isTeknisi ? onPageChange?.('transaksi', 'perlu-restock') : onPageChange?.('laporan')}
        />
        {!isTeknisi && (
          <StatCard
            title="Total Margin Hari ini"
            value={formatRp(stats.labaHariIni)}
            sub={`${stats.totalTransaksiHariIni} transaksi hari ini`}
            icon={TrendingUp}
            iconBg="bg-text-secondary/10"
            iconColor={surface.secondary}
            valueColor={surface.text}
          />
        )}
      </div>

      {/* ── Two column layout ────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* LEFT — service table (2/3 width) */}
        <div className="xl:col-span-2 space-y-6">


          {/* Tabel Servis Terbaru */}
          <div className={`overflow-hidden rounded-md border shadow-sm ${surface.panel} ${surface.border}`}>
            <div className={`border-b px-6 py-5 ${surface.border}`}>
              <SectionHeader
                title="5 Transaksi Servis Terkini"
                sub="Daftar pekerjaan servis yang baru masuk"
                count={recentServices.length}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${surface.muted} ${surface.border}`}>
                    <th className={`px-5 py-3 text-left text-[13px] font-medium leading-5 ${surface.secondary}`}>No Nota</th>
                    <th className={`px-4 py-3 text-left text-[13px] font-medium leading-5 ${surface.secondary}`}>Pelanggan</th>
                    <th className={`hidden px-4 py-3 text-left text-[13px] font-medium leading-5 md:table-cell ${surface.secondary}`}>Model/Seri</th>
                    <th className={`hidden px-4 py-3 text-left text-[13px] font-medium leading-5 lg:table-cell ${surface.secondary}`}>Keluhan</th>
                    <th className={`px-4 py-3 text-left text-[13px] font-medium leading-5 ${surface.secondary}`}>Status</th>
                    <th className={`hidden px-4 py-3 text-left text-[13px] font-medium leading-5 md:table-cell ${surface.secondary}`}>Oleh</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${surface.border}`}>
                  {recentServices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`py-12 text-center ${surface.secondary}`}>
                        <Wrench className={`mx-auto mb-2 h-10 w-10 ${surface.tertiary}`} />
                        <p className="text-sm leading-6">Belum ada data servis</p>
                      </td>
                    </tr>
                  ) : (
                    recentServices.map((service, idx) => (
                      <tr key={service.id} className="transition-fast hover:bg-surface-muted/30">
                        <td className="px-5 py-3.5">
                          <span className={`rounded border px-2 py-1 font-mono text-[13px] font-medium ${surface.accent} ${surface.accentBg} ${surface.accentBorder}`}>
                            {service.noNota || `#${String(idx + 1).padStart(3, '0')}`}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className={`text-sm font-medium leading-6 ${surface.text}`}>{service.namaPelanggan}</p>
                          <p className={`text-[13px] leading-5 ${surface.secondary}`}>{service.nomorHp}</p>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <DeviceIcon type={service.jenisPerangkat} />
                            <div>
                              <p className={`text-sm font-medium leading-6 ${surface.text}`}>{service.modelPerangkat}</p>
                              <p className={`text-[13px] leading-5 ${surface.secondary}`}>{service.jenisPerangkat}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <p className={`max-w-[180px] truncate text-sm leading-6 ${surface.secondary}`} title={service.deskripsiMasalah}>
                            {service.deskripsiMasalah}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={service.status as keyof typeof STATUS_CONFIG} />
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className={`text-sm leading-6 ${surface.secondary}`}>{getTechnician(service)}</span>
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
          <div className={`rounded-md border p-5 shadow-sm ${surface.panel} ${surface.border}`}>
            <h3 className={`mb-1 text-base font-semibold leading-6 ${surface.text}`}>Distribusi Status Servis</h3>
            <p className={`mb-4 text-[13px] leading-5 ${surface.secondary}`}>Berdasarkan semua data aktif</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="chartValue"
                    strokeWidth={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(_, __, item) => [item?.payload?.value ?? 0, item?.payload?.name]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--color-surface-base))',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid hsl(var(--color-border-default))',
                      color: 'hsl(var(--color-text-primary))',
                      fontSize: '0.75rem',
                      padding: '8px 12px',
                    }}
                    itemStyle={{ color: 'hsl(var(--color-text-primary))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {servisByStatus.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between gap-3 text-sm leading-6">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className={`truncate ${surface.secondary}`}>{item.name}</span>
                  </span>
                  <span className={`font-medium tabular-nums ${surface.text}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats breakdown */}
          <div className={`space-y-3 rounded-md border p-5 shadow-sm ${surface.panel} ${surface.border}`}>
            <h3 className={`mb-3 text-base font-semibold leading-6 ${surface.text}`}>Ringkasan Servis</h3>
            {[
              { label: 'Total Servis', value: stats.totalServis, color: surface.text },
              { label: 'Aktif / On-progress', value: stats.servisAktif, color: surface.accent },
              { label: 'Menunggu Sparepart', value: stats.servisMenungguSparepart, color: surface.secondary },
              { label: 'Selesai Hari Ini', value: stats.servisSelesaiHariIni, color: surface.secondary },
              { label: 'Masuk Hari Ini', value: stats.servisHariIni, color: surface.secondary },
            ].map((row) => (
              <div key={row.label} className={`flex items-center justify-between border-b py-1.5 last:border-0 ${surface.border}`}>
                <span className={`text-sm leading-6 ${surface.secondary}`}>{row.label}</span>
                <span className={`text-sm font-bold ${row.color}`}>{row.value}</span>
              </div>
            ))}
        </div>

        </div>
      </div>

      {/* ── Status Legend Bar ───────────────────────────────── */}
      <div className={`rounded-md border px-6 py-4 shadow-sm ${surface.panel} ${surface.border}`}>
        <div className="flex flex-wrap gap-4 items-center">
          <p className={`mr-2 text-[13px] font-medium leading-5 ${surface.secondary}`}>Keterangan status:</p>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className={`text-[13px] font-medium leading-5 ${surface.secondary}`}>{cfg.label}</span>
            </div>
          ))}
          <div className={`ml-auto flex items-center gap-1.5 text-[13px] ${surface.secondary}`}>
            <Badge variant="outline" className="border-orange-400/40 text-[13px] font-medium text-orange-300">
              Stok mencapai ambang batas minimum = Kritikal
            </Badge>
          </div>
        </div>
      </div>

    </div>
  );
}
