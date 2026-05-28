import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Banknote, CheckCircle2, Clock3, Cpu, Laptop, PackageCheck, Pencil, Printer, Smartphone, UserRound, Wrench } from 'lucide-react';
import type { ServiceItem, ServiceStatus } from '@/types';

interface ServiceCardProps {
  service: ServiceItem;
  onEdit: (service: ServiceItem) => void;
  onComplete: (service: ServiceItem) => void;
  onPickup: (service: ServiceItem) => void;
  onStatusChange: (service: ServiceItem, status: ServiceStatus) => void;
}

const statusConfig: Record<ServiceStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  },
  proses: {
    label: 'Proses',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  },
  'menunggu-sparepart': {
    label: 'Menunggu Sparepart',
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  },
  selesai: {
    label: 'Selesai',
    className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  },
  diambil: {
    label: 'Diambil',
    className: 'bg-slate-200 text-slate-700 hover:bg-slate-200',
  },
};

const selectableStatuses: ServiceStatus[] = ['pending', 'menunggu-sparepart', 'proses', 'selesai', 'diambil'];

function DeviceIcon({ type }: { type: ServiceItem['jenisPerangkat'] }) {
  if (type === 'Smartphone' || type === 'Tablet') return <Smartphone className="h-3.5 w-3.5" />;
  if (type === 'CPU') return <Cpu className="h-3.5 w-3.5" />;
  if (type === 'Printer') return <Printer className="h-3.5 w-3.5" />;
  return <Laptop className="h-3.5 w-3.5" />;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}

export default function ServiceCard({
  service,
  onEdit,
  onComplete,
  onPickup,
  onStatusChange,
}: ServiceCardProps) {
  const sparepartCount = service.sparepartDigunakan?.reduce((total, item) => total + item.jumlah, 0) ?? 0;
  const biayaJasa = service.biayaJasa ?? 0;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{service.modelPerangkat}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <DeviceIcon type={service.jenisPerangkat} />
              <span>{service.jenisPerangkat}</span>
            </div>
          </div>
          <Badge className={statusConfig[service.status].className}>
            {statusConfig[service.status].label}
          </Badge>
        </div>

        <div className="grid gap-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-slate-400" />
            <span className="truncate">{service.namaPelanggan}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-slate-400" />
            <span>{service.nomorHp}</span>
          </div>
          <div className="flex items-start gap-2">
            <Wrench className="mt-0.5 h-4 w-4 text-slate-400" />
            <p className="line-clamp-2">{service.deskripsiMasalah}</p>
          </div>
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-slate-400" />
            <span>Jasa: {formatRupiah(biayaJasa)}</span>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {sparepartCount > 0
            ? `${sparepartCount} item sparepart dipilih${service.stokDikurangi ? ' dan stok sudah dikurangi' : ''}`
            : 'Belum ada sparepart yang dipilih'}
        </div>

        <div className="space-y-3">
          <Select
            value={service.status}
            onValueChange={(value) => onStatusChange(service, value as ServiceStatus)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Ubah status" />
            </SelectTrigger>
            <SelectContent>
              {selectableStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusConfig[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onEdit(service)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={() => onComplete(service)}
              disabled={service.status === 'selesai' || service.status === 'diambil'}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Selesai
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              onClick={() => onPickup(service)}
              disabled={service.status !== 'selesai'}
            >
              <PackageCheck className="mr-2 h-4 w-4" />
              Diambil
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
