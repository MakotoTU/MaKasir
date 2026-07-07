# Changelog MaKasir
Dokumentasi lengkap pembaruan sistem POS MaKasir.

## [v1.1.0] - Pembaruan Frontend & Stabilitas Backend

### 🎨 Desain Antarmuka (Neobrutalism Redesign)
Seluruh UI aplikasi telah dirombak total ke gaya **Neobrutalism** (berdasarkan preferensi instruksi) tanpa menyentuh *logic* dan *flow* yang sudah ada.

- **Global Styles**: 
  - Penambahan garis batas (border) solid hitam tebal (`3px solid #000`) di seluruh komponen.
  - Penambahan *hard shadow* (bayangan padat tanpa blur) dengan konfigurasi `box-shadow: 4px 4px 0px #000` di setiap panel dan tombol.
  - Skema warna baru yang mencolok (Kuning Terang, Cyan, Pink/Merah) dipadukan dengan background terang (Krem).
  - Tipografi baru: `Space Grotesk` untuk teks umum dan `JetBrains Mono` untuk angka.
- **Layout & Responsivitas**:
  - `DashboardLayout.vue`: Perbaikan struktur `flexbox` untuk memastikan *layout* mengisi `100vh` dengan sempurna (mengatasi bug ruang kosong di atas header). Elemen *sidebar* dikunci lebarnya dengan `flex-shrink: 0`.
  - Animasi mikro pada interaksi hover (*micro-interactions*): Tombol akan tertekan/bergeser sebesar `translate(2px, 2px)` dan bayangannya menyusut, memberikan sensasi retro taktil.
- **Penyegaran Komponen**:
  - `POS.vue`: Tampilan *grid* produk dan keranjang jadi lebih kaku dan tegas.
  - `KitchenView.vue`: *Kanban board* dirombak menggunakan skema Neobrutalism.
  - `Expenses.vue` & `Products.vue`: Pemisah sel pada tabel menggunakan border tebal, mempermudah pembacaan data tabular.
  - `Login.vue`: Kartu *login* di-desain ulang agar selaras dengan tema retro *vibrant*.

### 🐛 Perbaikan Bug (Bug Fixes)
- **Modul Pengeluaran (Expenses)**:
  - **Backend**: Memperbaiki skema database Sequelize pada `Expense.ts`. Menambahkan atribut `createdBy` agar sinkronisasi ORM berhasil dan tidak memicu SQL Error saat proses `findAll()`.
  - **Server**: Menyelesaikan konflik proses (Zombies Process) di mana server Node lama (PID 5844) menahan *port* 3000, mengakibatkan *routing* baru (`/api/expenses`) tidak terbaca oleh frontend (muncul pesan 500 NOT FOUND). Backend telah di-*restart* sepenuhnya.
  - **Frontend**: Memperbaiki *path import* untuk store autentikasi yang *broken* di `Expenses.vue`.

### ⚡ Fitur Sistem Inti (Core Features)
*(Dari Milestone Sebelumnya)*
- **Sistem Transaksi Atomik**: Penambahan `transaction` dari Sequelize di `OrderController` agar pengurangan stok bahan baku terjadi bersamaan dan mencegah duplikasi/race condition bila ada transaksi konkuren.
- **Mode Offline (Dexie.js)**: Menyimpan transaksi sementara ke dalam peramban lokal jika jaringan terputus (PWA ready). Namun, saat ini masih ada catatan sinkronisasi metadata pembayaran (`paymentMethod`, dsb.) yang menunggu tahap penyempurnaan berikutnya.
- **Integrasi Kitchen Display System (KDS)**: Socket komunikasi realtime (`kdsClients`) disetel untuk memperbarui pesanan masuk ke *dashboard* dapur secara instan tanpa perlu memuat ulang halaman.

## Langkah Selanjutnya (To-Do)
- [ ] Memperbaiki fungsi `saveOfflineOrder` di `sync.service.ts` agar metadata pembayaran (`paymentMethod`, `amountPaid`, `changeDue`) tidak hilang saat koneksi terputus.
- [ ] Implementasi algoritma *backoff* pada antrean pengiriman WhatsApp Notifikasi (fitur katalog bot dibatalkan sesuai instruksi).
