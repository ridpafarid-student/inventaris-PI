import { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Barang, ServiceItem, ServiceSparepartItem, ServiceStatus } from '@/types';

interface AddServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ServiceFormState) => Promise<void>;
  products: Barang[];
  service?: ServiceItem | null;
  error?: string | null;
}

export interface ServiceFormState {
  namaPelanggan: string;
  nomorHp: string;
  jenisPerangkat: 'Laptop' | 'Smartphone' | 'Tablet' | 'CPU' | 'Printer';
  modelPerangkat: string;
  deskripsiMasalah: string;
  biayaJasa: number;
  status: ServiceStatus;
  sparepartDigunakan: ServiceSparepartItem[];
}

const initialForm: ServiceFormState = {
  namaPelanggan: '',
  nomorHp: '',
  jenisPerangkat: 'Smartphone',
  modelPerangkat: '',
  deskripsiMasalah: '',
  biayaJasa: 0,
  status: 'pending',
  sparepartDigunakan: [],
};

const createInitialForm = (service?: ServiceItem | null): ServiceFormState => {
  if (!service) {
    return initialForm;
  }

  return {
    namaPelanggan: service.namaPelanggan,
    nomorHp: service.nomorHp,
    jenisPerangkat: service.jenisPerangkat,
    modelPerangkat: service.modelPerangkat,
    deskripsiMasalah: service.deskripsiMasalah,
    biayaJasa: service.biayaJasa ?? 0,
    status: service.status,
    sparepartDigunakan: service.sparepartDigunakan ?? [],
  };
};

export default function AddServiceModal({
  open,
  onOpenChange,
  onSubmit,
  products,
  service,
  error,
}: AddServiceModalProps) {
  const [formData, setFormData] = useState<ServiceFormState>(() => createInitialForm(service));
  const [formError, setFormError] = useState('');

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFormError('');
    }

    onOpenChange(nextOpen);
  };

  const availableProducts = useMemo(
    () => products.filter((product) => {
      const kategoriNama = product.kategoriNama?.toLowerCase() ?? '';
      return product.stok > 0 && kategoriNama.includes('sparepart');
    }),
    [products]
  );

  const handleFieldChange = <K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) => {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const parseNumberInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly ? parseInt(digitsOnly, 10) : 0;
  };

  const handleSparepartChange = (index: number, key: keyof ServiceSparepartItem, value: string | number) => {
    setFormData((current) => {
      const nextItems = [...current.sparepartDigunakan];
      const currentItem = nextItems[index];

      if (key === 'productId') {
        const selectedProduct = products.find((product) => product.id === value);
        nextItems[index] = {
          productId: String(value),
          namaProduk: selectedProduct?.nama ?? '',
          jumlah: currentItem?.jumlah ?? 1,
        };
      } else {
        nextItems[index] = {
          ...currentItem,
          [key]: value,
        } as ServiceSparepartItem;
      }

      return {
        ...current,
        sparepartDigunakan: nextItems,
      };
    });
  };

  const addSparepartRow = () => {
    setFormData((current) => ({
      ...current,
      sparepartDigunakan: [
        ...current.sparepartDigunakan,
        { productId: '', namaProduk: '', jumlah: 1 },
      ],
    }));
  };

  const removeSparepartRow = (index: number) => {
    setFormData((current) => ({
      ...current,
      sparepartDigunakan: current.sparepartDigunakan.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = async () => {
    setFormError('');

    if (!formData.namaPelanggan.trim() || !formData.nomorHp.trim() || !formData.modelPerangkat.trim()) {
      setFormError('Nama pelanggan, nomor HP, dan model perangkat wajib diisi');
      return;
    }

    if (!formData.deskripsiMasalah.trim()) {
      setFormError('Deskripsi masalah wajib diisi');
      return;
    }

    const invalidSparepart = formData.sparepartDigunakan.find((item) => !item.productId || item.jumlah <= 0);
    if (invalidSparepart) {
      setFormError('Setiap sparepart harus memilih produk dan jumlah valid');
      return;
    }

    await onSubmit({
      ...formData,
      namaPelanggan: formData.namaPelanggan.trim(),
      nomorHp: formData.nomorHp.trim(),
      modelPerangkat: formData.modelPerangkat.trim(),
      deskripsiMasalah: formData.deskripsiMasalah.trim(),
      sparepartDigunakan: formData.sparepartDigunakan.filter((item) => item.productId),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? 'Edit Servis' : 'Tambah Servis Baru'}</DialogTitle>
        </DialogHeader>

        {(formError || error) && (
          <Alert variant="destructive">
            <AlertDescription>{formError || error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nama Pelanggan *</Label>
              <Input
                value={formData.namaPelanggan}
                onChange={(event) => handleFieldChange('namaPelanggan', event.target.value)}
                placeholder="Nama pelanggan"
              />
            </div>
            <div className="space-y-2">
              <Label>Nomor HP *</Label>
              <Input
                value={formData.nomorHp}
                onChange={(event) => handleFieldChange('nomorHp', event.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Jenis Perangkat *</Label>
              <Select
                value={formData.jenisPerangkat}
                onValueChange={(value) => handleFieldChange('jenisPerangkat', value as ServiceFormState['jenisPerangkat'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis perangkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Laptop">Laptop</SelectItem>
                  <SelectItem value="Smartphone">Smartphone</SelectItem>
                  <SelectItem value="Tablet">Tablet</SelectItem>
                  <SelectItem value="CPU">CPU</SelectItem>
                  <SelectItem value="Printer">Printer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model Perangkat *</Label>
              <Input
                value={formData.modelPerangkat}
                onChange={(event) => handleFieldChange('modelPerangkat', event.target.value)}
                placeholder="iPhone 11 / ASUS A456"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleFieldChange('status', value as ServiceStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="menunggu-sparepart">Menunggu Sparepart</SelectItem>
                  <SelectItem value="proses">Proses</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                  <SelectItem value="diambil">Diserahkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Biaya Jasa (Rp)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formData.biayaJasa === 0 ? '' : String(formData.biayaJasa)}
                onChange={(event) => handleFieldChange('biayaJasa', parseNumberInput(event.target.value))}
                placeholder="Contoh: 150000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deskripsi Masalah *</Label>
            <Textarea
              value={formData.deskripsiMasalah}
              onChange={(event) => handleFieldChange('deskripsiMasalah', event.target.value)}
              placeholder="Jelaskan kerusakan atau keluhan pelanggan"
              rows={4}
            />
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">Sparepart Digunakan</p>
                <p className="text-sm text-slate-500">Pilih dari stok barang yang sudah ada</p>
              </div>
              <Button type="button" variant="outline" onClick={addSparepartRow}>
                Tambah Sparepart
              </Button>
            </div>

            {formData.sparepartDigunakan.length === 0 ? (
              <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
                Belum ada sparepart untuk servis ini.
              </div>
            ) : (
              <div className="space-y-3">
                {formData.sparepartDigunakan.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_110px_88px]">
                    <Select
                      value={item.productId}
                      onValueChange={(value) => handleSparepartChange(index, 'productId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih produk sparepart" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.nama} ({product.stok} {product.satuan})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      min={1}
                      value={item.jumlah}
                      onChange={(event) => handleSparepartChange(index, 'jumlah', parseInt(event.target.value, 10) || 0)}
                    />

                    <Button type="button" variant="outline" onClick={() => removeSparepartRow(index)}>
                      Hapus
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleDialogChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit}>
            {service ? 'Simpan Perubahan' : 'Simpan Servis'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
