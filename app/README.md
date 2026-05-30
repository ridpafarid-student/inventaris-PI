# Aplikasi Inventaris Barang

Aplikasi web untuk mengelola inventaris barang, transaksi stok masuk dan keluar, kategori, pengguna, serta ringkasan dashboard. Project ini dibangun dengan React, TypeScript, Vite, Tailwind CSS, dan Firebase.

## Fitur Utama

- Login dan autentikasi pengguna dengan Firebase Auth
- Dashboard ringkasan inventaris dan grafik aktivitas
- CRUD data barang dan kategori
- Transaksi stok masuk dan stok keluar
- Riwayat transaksi barang
- Laporan inventaris
- Manajemen pengguna
- Peringatan stok menipis

## Teknologi

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Firebase Auth
- Cloud Firestore
- Radix UI dan komponen `shadcn/ui`
- Recharts

## Menjalankan Project

Pastikan Node.js sudah terpasang, lalu jalankan:

```bash
cd app
npm install
npm run dev
```

Setelah itu buka alamat lokal yang ditampilkan Vite, biasanya `http://localhost:5173`.

## Environment Variables

Buat file `.env` di folder `app` lalu isi variabel berikut:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

## Scripts

- `npm run dev` menjalankan development server
- `npm run build` build aplikasi untuk production
- `npm run preview` preview hasil build
- `npm run lint` menjalankan ESLint

## Struktur Folder

```text
app/
|-- src/
|   |-- components/   # Komponen UI
|   |-- contexts/     # Context aplikasi
|   |-- hooks/        # Custom hooks
|   |-- lib/          # Konfigurasi dan helper
|   |-- pages/        # Halaman utama aplikasi
|   `-- types/        # TypeScript types
|-- index.html
|-- package.json
`-- vite.config.ts
```

## Catatan

- bagian Teknisi masih error belum bisa update barang, error di rules firestore 