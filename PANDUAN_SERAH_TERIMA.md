# 📋 Panduan Konfigurasi & Serah Terima Project

## Computer Store Website — Dokumen Teknis

> Dokumen ini dibuat untuk membantu pihak toko memahami dan mengelola layanan cloud yang digunakan pada website ini.

---

## 🗂️ Daftar Layanan yang Digunakan

| Layanan | Fungsi | Biaya |
|---|---|---|
| **Supabase** | Database online (menyimpan data produk, karyawan, akun admin) | Gratis hingga 500MB |
| **Cloudinary** | Penyimpanan gambar produk di cloud | Gratis hingga 25GB |
| **Node.js Server** | Menjalankan aplikasi (bisa di hosting VPS/Railway/Render) | Tergantung hosting |

---

## 1️⃣ Supabase — Database Online

### Apa itu Supabase?
Supabase adalah layanan database PostgreSQL yang berjalan di internet. Semua data (produk, karyawan, login admin) disimpan di sana, bukan di komputer lokal. Artinya, data tetap aman meski komputer rusak atau ganti.

### Cara Mendapatkan Kredensial Supabase

1. Buka **[supabase.com](https://supabase.com)** → Login
2. Pilih project Anda
3. Klik **Settings** (ikon gear) di sidebar kiri
4. Pilih **Database**
5. Scroll ke bagian **"Connection string"** → pilih tab **URI**
6. Copy string koneksi tersebut, contoh:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghij.supabase.co:5432/postgres
   ```
7. Paste ke file `.env` pada bagian `DATABASE_URL=`

> ⚠️ **PENTING**: Jaga kerahasiaan password database. Jangan dibagikan ke sembarang orang!

---

## 2️⃣ Cloudinary — Penyimpanan Gambar

### Apa itu Cloudinary?
Cloudinary adalah layanan cloud untuk menyimpan gambar produk. Saat admin upload foto produk, gambar langsung tersimpan di Cloudinary dan mendapat URL permanen yang bisa diakses dari mana saja.

### Cara Mendapatkan Kredensial Cloudinary

1. Buka **[cloudinary.com](https://cloudinary.com)** → Login
2. Dari halaman Dashboard utama, akan terlihat:
   - **Cloud Name** (contoh: `dxxxxxxxx`)
   - **API Key** (contoh: `123456789012345`)
   - **API Secret** (contoh: `xxxxxxxxxxxxxxxxxxxxxxxxx`)
3. Salin ketiga nilai tersebut ke file `.env`

---

## 3️⃣ File `.env` — Pusat Konfigurasi

File ini adalah **file konfigurasi utama** project. Berisi semua "kunci rahasia" layanan. Letaknya di folder utama project: `computer-store/.env`

### Isi File `.env` yang Harus Dilengkapi

```env
# DATABASE - Supabase PostgreSQL
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"

# CLOUDINARY - Penyimpanan Gambar
CLOUDINARY_CLOUD_NAME="isi_cloud_name_dari_dashboard"
CLOUDINARY_API_KEY="isi_api_key_dari_dashboard"
CLOUDINARY_API_SECRET="isi_api_secret_dari_dashboard"

# JWT - Kunci keamanan login (buat sendiri, string panjang acak)
JWT_SECRET="kunci_rahasia_minimal_32_karakter_acak"

# SERVER
PORT=3000
```

> 🔒 **File `.env` TIDAK boleh dibagikan / diupload ke GitHub!** File ini sudah otomatis di-ignore oleh `.gitignore`.

---

## 4️⃣ Langkah Setup Awal (Setelah Dapat Semua Kredensial)

Jalankan perintah berikut di terminal, **sekali saja** saat pertama kali setup:

```bash
# 1. Masuk ke folder project
cd computer-store

# 2. Install semua package yang dibutuhkan
npm install

# 3. Sinkronisasi struktur database ke Supabase
npx prisma migrate deploy

# 4. (Opsional) Isi data awal / akun admin pertama
node seed.js

# 5. Jalankan server
npm start
```

---

## 5️⃣ Cara Menjalankan Website Sehari-hari

```bash
# Di folder project, jalankan:
npm start
```

Website akan berjalan di: `http://localhost:3000`

---

## 6️⃣ Alur Upload Gambar Produk (Cloudinary)

```
Admin upload foto
       ↓
Server menerima file
       ↓
File langsung dikirim ke Cloudinary
       ↓
Cloudinary simpan & kembalikan URL gambar
       ↓
URL disimpan ke database Supabase
       ↓
Frontend tampilkan gambar dari URL Cloudinary
```

Gambar tersimpan di: **Cloudinary Dashboard → Media Library → computer-store/products/**

---

## 7️⃣ Troubleshooting Umum

| Masalah | Kemungkinan Penyebab | Solusi |
|---|---|---|
| Server tidak bisa konek ke database | `DATABASE_URL` salah | Cek kembali connection string Supabase |
| Gambar tidak bisa diupload | Kredensial Cloudinary salah | Cek `CLOUD_NAME`, `API_KEY`, `API_SECRET` |
| Login admin gagal | `JWT_SECRET` kosong | Isi `JWT_SECRET` di `.env` |
| Error "prisma not found" | Package belum terinstall | Jalankan `npm install` |

---

## 8️⃣ Informasi Kontak Developer

> *(Isi dengan informasi kontak Anda sebagai developer/magang)*

- **Nama**: ___________________
- **Email**: ___________________
- **WhatsApp**: ___________________
- **Tanggal Selesai Magang**: ___________________

---

## 📁 Struktur Folder Project

```
computer-store/
├── .env                  ← ⭐ FILE KONFIGURASI (isi kredensial di sini)
├── prisma/
│   └── schema.prisma     ← Struktur tabel database
├── src/
│   ├── server.js         ← File utama server
│   └── routes/
│       ├── admin.js      ← API untuk panel admin
│       ├── auth.js       ← API login/logout
│       └── public.js     ← API halaman publik
└── frontend/             ← File tampilan website
```

---

*Dokumen ini dibuat sebagai bagian dari serah terima project magang.*
