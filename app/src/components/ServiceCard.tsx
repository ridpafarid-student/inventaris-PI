import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';









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
    className: 'bg-text-inverse/10 text-text-inverse border-text-inverse/20 hover:bg-text-inverse/15',
  },
  proses: {
    label: 'Proses',
    className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/15',
  },
  'menunggu-sparepart': {
    label: 'Menunggu Sparepart',
    className: 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/15',
  },
  selesai: {
    label: 'Selesai',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15',
  },
  diambil: {
    label: 'Diserahkan',
    className: 'bg-neutral-500/10 text-neutral-600 border-neutral-500/20 hover:bg-neutral-500/15',
  },
};

const selectableStatuses: ServiceStatus[] = ['pending', 'menunggu-sparepart', 'proses'];

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
    <div className="rounded-sm p-4 transition-all bg-surface-base border border-border-default hover:shadow-card flex flex-col justify-between space-y-4">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {service.noNota && (
              <p className="text-xs text-text-secondary font-mono">Nota: {service.noNota}</p>
            )}
            <h3 className="font-semibold mt-0.5 truncate text-text-primary text-base">
              {service.modelPerangkat}
            </h3>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
            <span className="text-xs bg-surface-muted text-text-primary px-2 py-0.5 rounded-sm font-medium flex items-center gap-1">
              <DeviceIcon type={service.jenisPerangkat} />
              {service.jenisPerangkat}
            </span>
            <Badge variant="outline" className={`${statusConfig[service.status].className} rounded-pill border px-2.5 py-0.5 text-xs font-medium`}>
              {statusConfig[service.status].label}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 text-sm text-text-primary">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-text-secondary shrink-0" />
            <span className="truncate font-medium">{service.namaPelanggan}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-text-secondary shrink-0" />
            <span className="text-text-secondary">{service.nomorHp}</span>
          </div>
          <div className="flex items-start gap-2">
            <Wrench className="mt-0.5 h-4 w-4 text-text-secondary shrink-0" />
            <p className="line-clamp-2 text-text-secondary">{service.deskripsiMasalah}</p>
          </div>
          <div className="flex items-center justify-between border-t border-border-default/50 pt-2 mt-2 text-sm">
            <span className="text-text-secondary flex items-center gap-1.5">
              <Banknote className="h-4 w-4 text-text-secondary" />
              Biaya Jasa
            </span>
            <span className="font-semibold text-text-primary">{formatRupiah(biayaJasa)}</span>
          </div>
        </div>

        <div className="rounded-sm bg-surface-muted border border-border-default px-3 py-2 text-xs text-text-primary">
          {sparepartCount > 0 ? (
            <span className="text-text-secondary">
              <strong className="text-text-primary font-semibold">{sparepartCount} item</strong> sparepart {service.stokDikurangi ? 'terpakai (stok akan dikurangi ketika di serahkan)' : 'direncanakan'}
            </span>
          ) : (
            <span className="text-text-secondary">Belum ada sparepart yang dipilih</span>
          )}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {(service.status !== 'selesai' && service.status !== 'diambil') ? (
          <Select
            value={service.status}
            onValueChange={(value) => onStatusChange(service, value as ServiceStatus)}
          >
            <SelectTrigger className="h-10 focus:ring-1 focus:ring-text-inverse/20 focus:shadow-focus">
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
        ) : null}

        <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => onEdit(service)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => onComplete(service)}
                      disabled={service.status === 'selesai' || service.status === 'diambil'}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Selesai
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => onPickup(service)}
                      disabled={service.status !== 'selesai'}
                    >
                      <PackageCheck className="mr-1.5 h-3.5 w-3.5" />
                      Serahkan
                    </Button>
        </div>
      </div>
    </div>
  );
}
