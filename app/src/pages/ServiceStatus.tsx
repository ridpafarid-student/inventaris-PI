import { useEffect, useMemo, useState } from 'react';
import AddServiceModal, { type ServiceFormState } from '@/components/AddServiceModal';
import ServiceCard from '@/components/ServiceCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBarang } from '@/hooks/useBarang';
import { useServices } from '@/hooks/useServices';
import { Plus, Search, Wrench, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';
import type { ServiceItem, ServiceStatus } from '@/types';

export default function ServiceStatus({ initialStatus = 'all' }: { initialStatus?: 'all' | ServiceStatus }) {
  const { userData, isAdmin } = useAuth();
  const { barangList } = useBarang();
    const {
    services,
    loading,
    error,
    addService,
    updateService,
    updateServiceStatus,
    deleteService,
  } = useServices();
    const [activeTab, setActiveTab] = useState<'aktif' | 'riwayat'>('aktif');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | ServiceStatus>(initialStatus);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [riwayatSearch, setRiwayatSearch] = useState('');

    const filteredServices = useMemo(() => services.filter((service) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = [
      service.namaPelanggan,
      service.noNota ?? '',
      service.nomorHp,
      service.modelPerangkat,
      service.deskripsiMasalah,
    ].some((value) => value.toLowerCase().includes(query));

    const matchesStatus = selectedStatus === 'all' || service.status === selectedStatus;
    return matchesSearch && matchesStatus && service.status !== 'diambil';
  }), [searchQuery, selectedStatus, services]);

  const riwayatServices = useMemo(() => {
    const query = riwayatSearch.toLowerCase();
    return services
      .filter((service) => service.status === 'diambil')
      .filter((service) =>
        [service.namaPelanggan, service.noNota ?? '', service.nomorHp, service.modelPerangkat]
          .some((value) => value.toLowerCase().includes(query))
      )
      .sort((a, b) => {
        const dateA = a.pickedUpAt instanceof Timestamp ? a.pickedUpAt.toDate() : new Date(a.pickedUpAt ?? a.updatedAt ?? a.createdAt);
        const dateB = b.pickedUpAt instanceof Timestamp ? b.pickedUpAt.toDate() : new Date(b.pickedUpAt ?? b.updatedAt ?? b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
  }, [riwayatSearch, services]);

  const formatDate = (value: ServiceItem['createdAt']) => {
    const date = value instanceof Timestamp ? value.toDate() : new Date(value);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  const getServiceTotalValue = (service: ServiceItem) => {
    const sparepartValue = (service.sparepartDigunakan ?? []).reduce((sum, item) => {
      const barang = barangList.find((product) => product.id === item.productId);
      return sum + ((barang?.hargaJual ?? barang?.hargaBeli ?? 0) * item.jumlah);
    }, 0);
    return (service.biayaJasa ?? 0) + sparepartValue;
  };

  const handleCreate = () => {
    setSelectedService(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (payload: ServiceFormState) => {
    const result = selectedService
      ? await updateService(selectedService.id, payload)
      : await addService({
        ...payload,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        createdByName: userData?.name || '',
      });

    if (result.success) {
      setIsModalOpen(false);
      setSelectedService(null);
    }
  };

  const handleEdit = (service: ServiceItem) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (service: ServiceItem, status: ServiceStatus) => {
    if (service.status === status) {
      return;
    }

    await updateServiceStatus(service.id, status);
  };

  const handleComplete = async (service: ServiceItem) => {
    if (service.status === 'selesai' || service.status === 'diambil') {
      return;
    }

    await updateServiceStatus(service.id, 'selesai');
  };

    const handlePickup = async (service: ServiceItem) => {
    if (service.status !== 'selesai') {
      return;
    }

    await updateServiceStatus(service.id, 'diambil');
  };

  const handleDelete = async (service: ServiceItem) => {
    await deleteService(service.id);
  };

  useEffect(() => {
    setSelectedStatus(initialStatus);
  }, [initialStatus]);

    return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border-default">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Jasa Servis</h1>
          <p className="text-sm text-text-secondary mt-0.5">Kelola status dan monitoring servis pelanggan</p>
        </div>
        <Button variant="outline" onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Servis
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-default">
        <button
          onClick={() => setActiveTab('aktif')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'aktif'
              ? 'border-text-inverse text-text-inverse'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Aktif
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
            activeTab === 'aktif' ? 'bg-text-inverse/10 text-text-inverse' : 'bg-surface-muted text-text-secondary'
          }`}>
            {services.filter(s => s.status !== 'diambil').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('riwayat')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'riwayat'
              ? 'border-text-inverse text-text-inverse'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Riwayat
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
            activeTab === 'riwayat' ? 'bg-text-inverse/10 text-text-inverse' : 'bg-surface-muted text-text-secondary'
          }`}>
            {services.filter(s => s.status === 'diambil').length}
          </span>
        </button>
      </div>

            {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tab Aktif */}
      {activeTab === 'aktif' && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari pelanggan, HP, atau model perangkat..."
                className="pl-10 focus-visible:ring-1 focus-visible:ring-text-inverse/20 focus-visible:shadow-focus"
              />
            </div>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as 'all' | ServiceStatus)}
            >
              <SelectTrigger className="w-full sm:w-56 focus:ring-1 focus:ring-text-inverse/20 focus:shadow-focus">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="menunggu-sparepart">Menunggu Sparepart</SelectItem>
                <SelectItem value="proses">Proses</SelectItem>
                <SelectItem value="selesai">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {loading ? (
              <div className="lg:col-span-2 flex min-h-40 items-center justify-center text-text-secondary">
                Memuat data servis...
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="lg:col-span-2 flex min-h-48 flex-col items-center justify-center text-center py-12 border border-border-default rounded-sm bg-surface-base">
                <Wrench className="mb-3 h-12 w-12 text-text-secondary/30" />
                <p className="font-semibold text-text-primary">Belum ada data servis yang cocok</p>
                <p className="mt-1 max-w-sm text-sm text-text-secondary">
                  Tambahkan unit servis baru untuk mulai memantau progres perbaikan dan pemakaian sparepart.
                </p>
              </div>
            ) : (
              filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onEdit={handleEdit}
                  onComplete={handleComplete}
                  onPickup={handlePickup}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  isAdmin={isAdmin}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Tab Riwayat */}
      {activeTab === 'riwayat' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
            <Input
              value={riwayatSearch}
              onChange={(e) => setRiwayatSearch(e.target.value)}
              placeholder="Cari pelanggan, no nota, atau model perangkat..."
              className="pl-10"
            />
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y border border-border-default rounded-sm">
            {loading ? (
              <div className="py-8 text-center text-text-secondary">Memuat data...</div>
            ) : riwayatServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="mb-3 h-12 w-12 text-text-secondary/30" />
                <p className="font-semibold text-text-primary">Belum ada riwayat servis</p>
                <p className="mt-1 text-sm text-text-secondary">Servis yang sudah diserahkan akan muncul di sini.</p>
              </div>
            ) : (
              riwayatServices.map((service) => (
                <div key={service.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary">{service.namaPelanggan}</p>
                      <p className="text-xs text-text-secondary">{service.nomorHp}</p>
                    </div>
                    {service.noNota && (
                      <span className="text-xs font-mono px-2 py-1 rounded border border-border-default text-text-secondary shrink-0">
                        {service.noNota}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary">Perangkat</p>
                      <p className="mt-1 font-medium text-text-primary">{service.modelPerangkat}</p>
                      <p className="text-xs text-text-secondary">{service.jenisPerangkat}</p>
                    </div>
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary">Diserahkan</p>
                      <p className="mt-1 font-medium text-text-primary">
                        {formatDate(service.pickedUpAt ?? service.updatedAt ?? service.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary">Biaya Jasa</p>
                      <p className="mt-1 font-medium text-text-primary">{formatRupiah(service.biayaJasa ?? 0)}</p>
                    </div>
                    <div className="rounded-sm bg-surface-muted p-3">
                      <p className="text-text-secondary">Total</p>
                      <p className="mt-1 font-medium text-text-primary">{formatRupiah(getServiceTotalValue(service))}</p>
                    </div>
                  </div>
                  {(service.sparepartDigunakan ?? []).length > 0 && (
                    <p className="text-xs text-text-secondary">
                      Sparepart: {service.sparepartDigunakan!.map((i) => `${i.namaProduk} x${i.jumlah}`).join(', ')}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop */}
                    <div className="hidden md:block border border-border-default rounded-sm overflow-hidden">
            <Table className="table-fixed min-w-full">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">No Nota</TableHead>
                  <TableHead className="px-4">Tanggal Serah</TableHead>
                  <TableHead className="px-4">Pelanggan</TableHead>
                  <TableHead className="px-4">Perangkat</TableHead>
                  <TableHead className="px-4">Sparepart</TableHead>
                  <TableHead className="px-4 text-right">Biaya Jasa</TableHead>
                  <TableHead className="px-4 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-text-secondary">Memuat data...</TableCell>
                  </TableRow>
                ) : riwayatServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center">
                      <History className="mx-auto mb-2 h-10 w-10 text-text-secondary/30" />
                      <p className="text-text-secondary">Belum ada riwayat servis</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  riwayatServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="px-4 font-mono text-sm">
                        {service.noNota ?? '-'}
                      </TableCell>
                      <TableCell className="px-4 text-sm">
                        {formatDate(service.pickedUpAt ?? service.updatedAt ?? service.createdAt)}
                      </TableCell>
                      <TableCell className="px-4">
                        <p className="font-medium text-text-primary">{service.namaPelanggan}</p>
                        <p className="text-xs text-text-secondary">{service.nomorHp}</p>
                      </TableCell>
                      <TableCell className="px-4">
                        <p className="font-medium text-text-primary">{service.modelPerangkat}</p>
                        <p className="text-xs text-text-secondary">{service.jenisPerangkat}</p>
                      </TableCell>
                      <TableCell className="px-4 text-sm text-text-secondary">
                        {(service.sparepartDigunakan ?? []).length > 0
                          ? service.sparepartDigunakan!.map((i) => `${i.namaProduk} x${i.jumlah}`).join(', ')
                          : '-'}
                      </TableCell>
                      <TableCell className="px-4 text-right font-medium tabular-nums">
                        {formatRupiah(service.biayaJasa ?? 0)}
                      </TableCell>
                      <TableCell className="px-4 text-right font-medium tabular-nums">
                        {formatRupiah(getServiceTotalValue(service))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <AddServiceModal
        key={selectedService?.id ?? 'new-service'}
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedService(null);
          }
        }}
        onSubmit={handleSubmit}
        products={barangList}
        service={selectedService}
        error={error}
      />
    </div>
  );
}
