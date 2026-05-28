import { useMemo, useState } from 'react';
import AddServiceModal, { type ServiceFormState } from '@/components/AddServiceModal';
import ServiceCard from '@/components/ServiceCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBarang } from '@/hooks/useBarang';
import { useServices } from '@/hooks/useServices';
import { Plus, Search, Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { ServiceItem, ServiceStatus } from '@/types';

export default function ServiceStatus() {
  const { userData } = useAuth();
  const { barangList } = useBarang();
  const {
    services,
    loading,
    error,
    addService,
    updateService,
    updateServiceStatus,
  } = useServices();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | ServiceStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  const filteredServices = useMemo(() => services.filter((service) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = [
      service.namaPelanggan,
      service.nomorHp,
      service.modelPerangkat,
      service.deskripsiMasalah,
    ].some((value) => value.toLowerCase().includes(query));

    const matchesStatus = selectedStatus === 'all' || service.status === selectedStatus;
    return matchesSearch && matchesStatus;
  }), [searchQuery, selectedStatus, services]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Manajemen Servis</h1>
          <p className="text-sm text-gray-400 mt-0.5">Lacak progres perbaikan unit dan pemakaian sparepart.</p>
        </div>

        <Button onClick={handleCreate} size="sm" className="sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Servis
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari pelanggan, HP, atau model perangkat..."
            className="pl-10"
          />
        </div>

        <Select
          value={selectedStatus}
          onValueChange={(value) => setSelectedStatus(value as 'all' | ServiceStatus)}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="menunggu-sparepart">Menunggu Sparepart</SelectItem>
            <SelectItem value="proses">Proses</SelectItem>
            <SelectItem value="selesai">Selesai</SelectItem>
            <SelectItem value="diambil">Diambil</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? (
          <Card className="lg:col-span-2">
            <CardContent className="flex min-h-40 items-center justify-center text-slate-500">
              Memuat data servis...
            </CardContent>
          </Card>
        ) : filteredServices.length === 0 ? (
          <Card className="lg:col-span-2">
            <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
              <Wrench className="mb-3 h-12 w-12 text-slate-300" />
              <p className="font-medium text-slate-700">Belum ada data servis yang cocok</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Tambahkan unit servis baru untuk mulai memantau progres perbaikan dan pemakaian sparepart.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={handleEdit}
              onComplete={handleComplete}
              onPickup={handlePickup}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>

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
