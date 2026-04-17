// ============================================
// PAGE - Dashboard dengan Grafik & Statistik
// ============================================

import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ArrowLeftRight,
  AlertTriangle,
  TrendingUp,
  Wrench,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Dashboard() {
  const { stats, alertStok, aktivitas7Hari, servisByStatus, loading } = useDashboard();
  const servicePieChartData = servisByStatus.every((item) => item.value === 0)
    ? servisByStatus.map((item) => ({ ...item, chartValue: 1 }))
    : servisByStatus.map((item) => ({ ...item, chartValue: item.value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const renderPieLabel = ({ name, payload }: { name: string; payload?: { value?: number } }) => {
    if (!payload?.value) return '';
    return `${name} ${payload.value}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Ringkasan inventaris barang dan manajemen servis</p>
      </div>

      {alertStok.length > 0 && (
        <Alert variant="destructive" className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Peringatan Stok Menipis</AlertTitle>
          <AlertDescription className="text-orange-700">
            Terdapat {alertStok.length} barang dengan stok di bawah atau sama dengan batas minimum.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Fokus Utama</h2>
          <p className="text-sm text-gray-500">Area yang paling cepat butuh tindakan operasional harian.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Servis Aktif</p>
                  <p className="text-2xl lg:text-3xl font-bold text-amber-600 mt-1">
                    {stats.servisAktif}
                  </p>
                </div>
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Wrench className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Menunggu Sparepart</p>
                  <p className="text-2xl lg:text-3xl font-bold text-orange-600 mt-1">
                    {stats.servisMenungguSparepart}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Servis tertahan karena komponen</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Stok Menipis</p>
                  <p
                    className={`text-2xl lg:text-3xl font-bold mt-1 ${
                      stats.stokMenipis > 0 ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    {stats.stokMenipis}
                  </p>
                </div>
                <div
                  className={`p-2 rounded-lg ${
                    stats.stokMenipis > 0 ? 'bg-red-100' : 'bg-gray-100'
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 ${
                      stats.stokMenipis > 0 ? 'text-red-600' : 'text-gray-500'
                    }`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Servis Masuk Hari Ini</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                    {stats.servisHariIni}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Unit baru yang dicatat hari ini</p>
                </div>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Ringkasan Pendukung</h2>
          <p className="text-sm text-gray-500">Metrik pelengkap untuk melihat ritme kerja dan kapasitas inventaris.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Servis Selesai</p>
                  <p className="text-2xl lg:text-3xl font-bold text-emerald-600 mt-1">
                    {stats.servisSelesai}
                  </p>
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Transaksi Hari Ini</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                    {stats.totalTransaksiHariIni}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Stok harian + servis selesai hari ini</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Sparepart Terpakai</p>
                  <p className="text-2xl lg:text-3xl font-bold text-sky-600 mt-1">
                    {stats.totalSparepartTerpakai}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Total item pada semua servis</p>
                </div>
                <div className="p-2 bg-sky-100 rounded-lg">
                  <Package className="w-5 h-5 text-sky-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Barang</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                    {stats.totalBarang}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Nilai Total Inventori</p>
              <p className="text-3xl lg:text-4xl font-bold mt-2">
                {formatRupiah(stats.nilaiInventori)}
              </p>
            </div>
            <div className="p-4 bg-white/10 rounded-xl">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Servis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={servicePieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderPieLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="chartValue"
                  >
                    {servicePieChartData.map((_, index) => (
                      <Cell key={`service-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(_, __, item) => item?.payload?.value ?? 0} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aktivitas 7 Hari Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aktivitas7Hari}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="transaksi" fill="#3B82F6" name="Transaksi" radius={[4, 4, 0, 0]} />
                <Bar dataKey="servis" fill="#10B981" name="Servis" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {alertStok.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              Barang Stok Menipis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertStok.slice(0, 5).map((alert) => (
                <div
                  key={alert.barangId}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{alert.barangNama}</p>
                    <p className="text-sm text-gray-500">{alert.barangKode}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="bg-orange-100 text-orange-700 border-orange-200">
                      Stok: {alert.stok}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">Min: {alert.stokMinimum}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
