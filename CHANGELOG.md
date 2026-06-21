# Changelog Aplikasi Kasir Terintegrasi WhatsApp

## [Minggu, 21 Juni 2026 19:42]
- **Ditambahkan**: Pembuatan dokumen perencanaan awal (`planning.md`) berdasarkan kesepakatan sesi *brainstorming*.
- **Ditambahkan**: Inisialisasi struktur proyek (folder `backend/` menggunakan ElysiaJS + Bun, dan folder `frontend/` menggunakan Vue 3 + Vite).
- **Ditambahkan**: Instalasi dependensi backend utama (`elysia`, `mongoose`, `@whiskeysockets/baileys`, `dotenv`, `pino`, `qrcode`).
- **Ditambahkan**: Instalasi dependensi frontend.

## [Minggu, 21 Juni 2026 19:43]
- **Ditambahkan**: Schema MongoDB untuk Product, Order, dan User di direktori `backend/models`.
- **Ditambahkan**: File ekspor model pada `backend/models/index.ts`.
- **Ditambahkan**: Konfigurasi koneksi MongoDB pada `backend/config/db.ts`.
- **Ditambahkan**: File environment `backend/.env` dan `backend/.env.example`.

## [Minggu, 21 Juni 2026 19:44]
- **Ditambahkan**: Implementasi API endpoints (Elysia) pada `backend/index.ts`, mencakup rute untuk Auth, Product, dan Order.
- **Ditambahkan**: Controller untuk Product, Order, dan Auth di direktori `backend/controllers`.
- **Ditambahkan**: Event service (Pub/Sub lokal) di `backend/services/event.service.ts` untuk arsitektur event-driven.
- **Ditambahkan**: Implementasi WhatsApp Service Module menggunakan Baileys di `backend/services/whatsapp.service.ts`. Menangani penyimpanan sesi, inisialisasi QR Code, *auto-reconnect*, dan pengiriman notifikasi otomatis saat event order diterima.
- **Diubah**: Mengubah endpoint stub WA di `backend/index.ts` agar menggunakan method `getQR()` dari `waService`.

## [Minggu, 21 Juni 2026 19:45]
- **Ditambahkan**: Setup konfigurasi Vue Router di `frontend/src/router/index.ts`.
- **Ditambahkan**: Halaman Login Kasir (`Login.vue`) dengan fitur polling API getQR untuk menampilkan barcode WhatsApp di browser.
- **Ditambahkan**: Halaman Point of Sales (`POS.vue`) untuk manajemen keranjang belanja, perhitungan total, dan submit order dengan tujuan nomor WA.
- **Ditambahkan**: Halaman Riwayat Transaksi (`Orders.vue`) yang menampilkan detail pesanan beserta status pengiriman pesan WA.
- **Diubah**: Mengonfigurasi `vite.config.ts` untuk menggunakan proxy ke backend ElysiaJS di `http://localhost:3000`.
- **Diubah**: Update `App.vue` dan `main.ts` untuk mendukung sistem navigasi Vue Router.

## [Minggu, 21 Juni 2026 19:55]
- **Diperbaiki**: Melakukan *downgrade* versi `mongoose` ke versi `8.x` (dari versi `9.x`). Mongoose versi terbaru menggunakan modul BSON versi baru yang bergantung pada method V8 Node (`isBuildingSnapshot()`) yang belum diimplementasikan di versi Bun saat ini, sehingga menyebabkan *runtime error* (NotImplementedError) saat inisialisasi server.

## [Minggu, 21 Juni 2026 19:59]
- **Diubah**: Migrasi keseluruhan arsitektur database dari **MongoDB (Mongoose)** ke **MySQL (Sequelize)** atas permintaan pengguna.
- **Dihapus**: Package `mongoose` dan digantikan dengan `sequelize` dan `mysql2`.
- **Diubah**: Konfigurasi koneksi di `backend/config/db.ts` menggunakan *connection pool* Sequelize dengan fitur `sync()` untuk sinkronisasi tabel otomatis.
- **Diubah**: Penulisan ulang semua *Schema* (User, Product, Order) menjadi class-based Model Sequelize di direktori `backend/models/`.
- **Ditambahkan**: Model relasional `OrderItem.ts` untuk menangani relasi antara pesanan dan produk di MySQL.
- **Diubah**: Logika pada `AuthController`, `ProductController`, dan `OrderController` (sekarang memakai transaksi `sequelize.transaction()` agar data pesanan aman).
- **Diubah**: Menyesuaikan pengikatan key objek di UI Frontend (dari `_id` menjadi `id`).
- **Diubah**: File `backend/.env` dan `backend/.env.example` disesuaikan untuk variabel lingkungan koneksi MySQL (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`).

## [Minggu, 21 Juni 2026 20:20]
- **Dihapus**: Fitur penghitungan dan limitasi "Stok" pada produk (dihapus dari DB Model, Controller, dan UI Frontend) karena pesanan bersifat fleksibel dan hanya perlu perhitungan harga akhir.
- **Dihapus**: Input "Nomor WA Tujuan" dari halaman Kasir (POS).
- **Diubah**: Notifikasi WhatsApp tidak lagi dikirim ke nomor pelanggan, melainkan dikirim sebagai rekap pesanan ke **nomor WA milik kasir itu sendiri** (nomor yang di-scan QR-nya) menggunakan `sock.user.id` dari *session* Baileys.

## [Minggu, 21 Juni 2026 20:45]
- **Ditambah**: Modul `pinia` di Frontend untuk *State Management* tersentralisasi (terutama auth data).
- **Ditambah**: `DashboardLayout.vue` yang berperan sebagai kerangka utama (*wrapper*) navigasi berdasar peran (Admin vs Kasir) menggunakan desain modern *Vanilla CSS* beraksen kaca buram (*glassmorphism*).
- **Ditambah**: Layar Manajemen Produk (`/admin/products`) di Frontend untuk Admin yang mendukung Edit harga, nama, dan kategori produk.
- **Ditambah**: Endpoint CRUD Akun (*Users*) di Backend (`AuthController.ts`).
- **Ditambah**: Layar Manajemen Akun (`/admin/users`) di mana Admin bisa membuat dan mengatur data *login* akun kasir secara dinamis.
- **Diubah**: Proses *Routing* di `router/index.ts` dibuat lebih modular dengan `children` rute dan perlindungan akses berlapis (*role-based auth guard*).
- **Diubah**: Tampilan antarmuka *Login* dirombak menyesuaikan bahasa visual (*design language*) yang baru agar lebih modern.

## [Minggu, 21 Juni 2026 20:57]
- **Diperbaiki**: Menambahkan parsing `role` yang sebelumnya tidak diteruskan dengan benar ke `AuthController` sehingga pembuatan akun Admin berfungsi sebagaimana mestinya.
- **Diperbaiki**: Menambahkan proteksi `null` check parameter pada fungsi create user.
- **Diperbaiki**: Menangkap *error* ketika API gagal dihubungi (seperti ketika server backend di-*restart*) di halaman Frontend `Users.vue` dan memberikan pesan peringatan jaringan kepada pengguna secara eksplisit, alih-alih `alert` abstrak.

## [Minggu, 21 Juni 2026 21:04]
- **Diubah**: Mengaktifkan kembali fitur polling status dan *QR Code* WhatsApp di halaman `Login.vue` sesuai permintaan pengguna.

## [Minggu, 21 Juni 2026 21:10]
- **Diubah**: Perombakan total (Revamp) desain halaman Kasir (`POS.vue`).
- **Ditambah**: Fitur **Search Bar** untuk mencari nama produk dengan cepat di halaman POS.
- **Ditambah**: Barisan *Chips* / *Pills* Kategori yang dinamis untuk filtering produk di halaman POS.
- **Ditambah**: Keranjang kasir sekarang *sticky* (menetap) di sebelah kanan layar, dengan tambahan *quick buttons* (`+` dan `-`) pada setiap *item* pesanan.
- **Ditambah**: Format rupiah otomatis pada tampilan harga dan sub-total.

## [Minggu, 21 Juni 2026 21:24]
- **Diubah**: Mengubah seluruh penamaan aplikasi (di Frontend, sidebar, login, judul jendela browser) dari "KasirKu" menjadi "**MaKasir**".
- **Diperbaiki**: Menggelapkan (*darken*) kode warna Emerald khusus untuk teks (seperti harga produk) di halaman `POS.vue` (`#10b981` menjadi `#047857`) agar memiliki kontras rasio yang jauh lebih baik ketika dibaca di atas *background* terang (*white* / kaca buram), mengatasi masalah warna teks yang membaur (*nyaru*) dengan latar.

## [Minggu, 21 Juni 2026 21:30]
- **Diperbaiki**: Mengubah warna teks "Ma" pada judul aplikasi "MaKasir" di Sidebar menjadi putih bersih (`#ffffff`). Sebelumnya, elemen `h2` tersebut mengambil warna `var(--text-main)` (biru abu-abu gelap) dari `style.css` bawaan secara global, sehingga menyebabkan warnanya membaur (*nyaru*) dengan *background* Sidebar yang juga berwarna gelap (`var(--bg-sidebar)` / Navy).

## [Minggu, 21 Juni 2026 21:38]
- **Diperbaiki**: Melakukan *refactoring* ekstensif pada kode *frontend* (`POS.vue`, `Login.vue`, `Products.vue`, `Users.vue`, `Orders.vue`) untuk mengatasi masalah keterbacaan, keamanan, dan celah logika.
- **Ditambah**: Mendefinisikan tipe data *TypeScript* (`Product`, `User`, `Order`) dalam `src/types/index.ts` untuk menjamin *Type Safety* dan menghilangkan penggunaan tipe data `any`.
- **Ditambah**: Membuat berkas utilitas `src/utils/currency.ts` untuk memusatkan logika `formatRupiah`, yang kini diimplementasikan secara konsisten di semua halaman.
- **Ditambah**: Komponen `BaseModal.vue` yang *reusable*, menghilangkan duplikasi kode gaya (*CSS*) untuk modal di halaman pengelolaan produk dan pengguna.
- **Diperbaiki**: Mengubah seluruh penanganan `fetch` API dengan blok `try-catch` dan validasi `!res.ok` agar aplikasi tidak *crash* ketika server mengalami *error*.
- **Diperbaiki**: Menambahkan *state* `isLoading` dan *disable* tombol pada semua proses asinkron (login, menyimpan produk, menyimpan pengguna, checkout) demi mencegah *double submit* dan memberikan *feedback* visual yang lebih baik.
- **Diperbaiki**: Mengganti pengambilan data *user id* dari `localStorage` secara langsung menjadi melalui *state management* `Pinia` (`useAuthStore`) di halaman `POS.vue` demi konsistensi data.
- **Dihapus**: Kredensial statis (username "admin" dan password "password") dari halaman `Login.vue` untuk memastikan *best practice* keamanan rilis.

## [Minggu, 21 Juni 2026 21:48]
- **Diperbaiki (Kritis)**: Implementasi enkripsi kata sandi menggunakan fungsi `Bun.password.hash` (berbasis algoritma *Bcrypt/Argon2*) pada proses pendaftaran kasir/admin di `AuthController.ts`, menggantikan metode pemeriksaan *plaintext* yang rentan peretasan.
- **Diperbaiki (Kritis)**: Validasi kata sandi saat *login* kini menggunakan fungsi `Bun.password.verify` secara asinkron guna memastikan *security compliance*.
- **Ditambah**: Penerapan skema validasi tipe objek (`TypeBox`) pada *endpoint* API (di `index.ts`) untuk memblokir secara otomatis permintaan dengan tipe yang salah, jumlah nilai negatif untuk *harga* dan *jumlah barang*, mencegah manipulasi harga total.
- **Diperbaiki**: Pembersihan kode migrasi lama (*MongoDB*) yang mendatangkan nilai `_id` menjadi `id` (*Sequelize/MySQL*) pada proses notifikasi di `whatsapp.service.ts`.
- **Diubah**: Pengecekan status lingkungan (*environment*) dengan `NODE_ENV` sebelum menjalankan `sequelize.sync({ alter: true })` di `db.ts` untuk menghindari hilangnya skema tabel secara permanen bila masuk mode produksi.
- **Diperbaiki**: Menata format nominal uang (menggunakan `Intl.NumberFormat`) ke dalam notifikasi otomatis layanan WhatsApp agar terlihat lebih profesional ketimbang `Rp1000000`.
