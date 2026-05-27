# Rencana Pengerjaan: Master Data Kategori Transaksi

Dokumen ini berisi rencana pengerjaan (*plan*) untuk memindahkan data kategori transaksi kas yang sebelumnya statis/ter-hardcode menjadi dinamis. Pengguna dapat mengonfigurasi kategori kas melalui menu **Master Data** di sidebar.

---

## 🎯 Tujuan Fitur
1. **Model Database Baru (`TransactionCategory`):** Menyimpan kategori transaksi secara dinamis di database.
2. **Auto-Seeding Kategori Default:** Database akan otomatis di-seeding entri kategori default (`TAGIHAN_BULANAN`, `BANDWIDTH_ISP`, dsb.) saat pertama kali diakses.
3. **Proteksi Sistem (`isSystem`):** Kategori sistem bawaan (seperti `TAGIHAN_BULANAN` dari tagihan bulanan lunas) dikunci agar tidak dapat dihapus/diedit oleh admin karena esensial untuk otomatisasi tagihan.
4. **Halaman CRUD Kategori Baru:** Halaman antarmuka manajemen kategori dalam **Master Data** di Sidebar.
5. **Dinamisasi Halaman Transaksi:** Dropdown pilihan kategori di halaman Transaksi akan diubah dari statis menjadi dinamis mengambil dari database.

---

## 🛠️ Langkah-Langkah Pengerjaan

### Langkah 1: Pembaruan Database (`prisma/schema.prisma`)
Menambahkan model `TransactionCategory` ke skema prisma:
* Field: `id`, `name` (unique), `type` ("INCOME" / "EXPENSE"), `isSystem` (default: false), `createdAt`, `updatedAt`.
* Menjalankan perintah sinkronisasi SQLite:
  ```bash
  npx prisma db push
  ```

### Langkah 2: Pembuatan API Kategori Transaksi
1. **`src/app/api/mikrotik/billing/categories/route.ts`**
   * **`GET`**: Mengambil daftar kategori transaksi. Apabila database terdeteksi kosong, secara otomatis melakukan seeding data default.
   * **`POST`**: Membuat kategori baru.
2. **`src/app/api/mikrotik/billing/categories/[id]/route.ts`**
   * **`PATCH`**: Mengubah nama kategori manual (tolak jika `isSystem: true`).
   * **`DELETE`**: Menghapus kategori manual (tolak jika `isSystem: true` atau jika kategori sedang digunakan di data transaksi kas manapun).

### Langkah 3: Update Sidebar Navigasi (`src/layout/AppSidebar.tsx`)
Menambahkan submenu **"Kategori Transaksi"** di bawah dropdown menu **Master Data**.

### Langkah 4: Pembuatan Halaman Master Kategori (`src/app/(admin)/mikrotik/billing/categories/page.tsx`)
Membuat halaman UI manajemen kategori yang interaktif dengan layout premium:
* Tampilan terbagi menjadi 2 tab: **Kategori Uang Masuk** dan **Kategori Uang Keluar**.
* Menandai kategori sistem bawaan dengan badge `Sistem 🔒`.
* Menghadirkan modal dialog interaktif untuk menambah/mengedit kategori manual.
* Memproteksi tombol edit & hapus untuk kategori sistem.

### Langkah 5: Pembaruan UI Transaksi Keuangan (`src/app/(admin)/mikrotik/billing/transactions/page.tsx`)
Mengubah form input transaksi kas agar bersifat dinamis:
* Mengambil data kategori dinamis dari database menggunakan API `/api/mikrotik/billing/categories`.
* Menghubungkan daftar opsi dropdown tambah/edit transaksi manual ke data API.
* Memetakan kode kategori transaksi di tabel dengan deskripsi nama kategori asli secara dinamis.

---

## 📈 Rencana Pengujian & Verifikasi
1. **Verifikasi Seeding:** Menghapus data kategori (jika ada) kemudian jalankan API GET kategori dan pastikan auto-seeding data bawaan terbuat otomatis.
2. **Uji Coba Proteksi:** Coba edit dan hapus kategori sistem `TAGIHAN_BULANAN` dan pastikan aksi ditolak oleh sistem.
3. **Uji Coba CRUD Kategori Baru:** Menambah kategori baru (misal: "Sewa Kantor"), lalu pastikan kategori tersebut langsung tampil sebagai pilihan di dropdown tambah transaksi kas.
4. **Verifikasi Kompilasi:** Jalankan `npm run build` untuk menjamin seluruh kode terkompilasi 100% tanpa error TypeScript.
