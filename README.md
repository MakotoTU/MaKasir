# MaKasir (WhatsApp-Integrated POS System)

MaKasir adalah sistem Point of Sales (Kasir) modern berbasis web yang terintegrasi secara langsung dengan WhatsApp. Aplikasi ini dirancang menggunakan arsitektur frontend (Vue 3) dan backend (Bun + ElysiaJS) terpisah, dengan fokus pada performa, keamanan, dan notifikasi transaksi otomatis (real-time) via WhatsApp.

## 🌟 Fitur Utama
- **Manajemen Produk & Kategori:** Kelola daftar produk dengan validasi input yang ketat.
- **Sistem Transaksi Kasir (POS):** Antarmuka kasir responsif yang mudah digunakan.
- **Notifikasi WhatsApp Otomatis:** Setiap transaksi yang berhasil akan langsung dikirimkan ke nomor WhatsApp kasir/pemilik toko.
- **Manajemen Pengguna (Auth):** Sistem login terenkripsi menggunakan Bcrypt/Argon2 (melalui Bun.password).
- **Glassmorphism UI:** Tampilan antarmuka *modern* dengan palet Deep Navy dan Emerald.
- **Laporan Riwayat Transaksi:** Laporan pemesanan secara detail dengan fitur cetak/filter.

## 🚀 Teknologi yang Digunakan

### Frontend
- **Vue 3 (Composition API)** + **TypeScript**
- **Pinia** (State Management)
- **Vue Router**
- **Vanilla CSS** (Custom Design System dengan efek Micro-animations)

### Backend
- **Bun** (JavaScript Runtime ultra-cepat)
- **ElysiaJS** (Web Framework berkinerja tinggi)
- **TypeBox** (Skema validasi keamanan API)
- **Sequelize** (ORM) & **MySQL** (Database)
- **Baileys** (Library Web Socket WhatsApp)

---

## ⚙️ Prasyarat Instalasi
Sebelum memulai, pastikan perangkat Anda telah memasang:
1. [Node.js](https://nodejs.org/) (Versi terbaru untuk menjalankan frontend)
2. [Bun](https://bun.sh/) (Dibutuhkan untuk menjalankan backend)
3. MySQL Server (Berjalan di latar belakang)
4. Git

---

## 🛠️ Cara Menjalankan Proyek (Replikasi)

### 1. Setup Backend (Bun + MySQL)
1. Buka terminal dan masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Salin *environment variables* contoh:
   ```bash
   cp .env.example .env
   ```
3. Buka file `.env` dan atur kredensial database MySQL Anda:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=password_anda
   DB_NAME=kasir_db
   ```
4. Buat skema database `kasir_db` secara manual di MySQL Anda.
5. Install semua dependensi menggunakan Bun:
   ```bash
   bun install
   ```
6. Jalankan migrasi kata sandi awal (jika perlu):
   ```bash
   bun run scripts/migrate_passwords.ts
   ```
7. Jalankan server backend:
   ```bash
   bun run index.ts
   ```
   *Terminal backend ini akan memunculkan QR Code WhatsApp. Pindai menggunakan aplikasi WhatsApp Anda yang ingin dijadikan bot notifikasi.*

### 2. Setup Frontend (Vue 3 + Vite)
1. Buka tab terminal **BARU** (jangan matikan terminal backend), lalu masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Install dependensi Node:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan Vite:
   ```bash
   npm run dev
   ```
4. Buka tautan URL lokal yang muncul (biasanya `http://localhost:5173`) di browser Anda.

---

## 🛡️ Keamanan & Best Practices Terapan
- Validasi Input tingkat rute (`TypeBox`) menghindari injeksi negatif dan *malformed data*.
- `bun.password` menolak kompromi keamanan di database dengan enkripsi kuat.
- Transisi status aplikasi di-*handle* dengan rapi menggunakan `try-catch` dan *loading indicator* untuk mencegah eksploitasi manipulasi *double-click*.

## 👨‍💻 Kontributor
- Makoto (Owner)
- Didesain dan direfaktor dengan standar Enterprise.
