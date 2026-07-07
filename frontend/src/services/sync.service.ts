import { db, type LocalOrder } from '../db';
import { useAuthStore } from '../store/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Menyimpan cache daftar produk dari server ke IndexedDB lokal.
 * Dipanggil saat aplikasi online untuk memperbarui data.
 */
export async function cacheProducts(): Promise<void> {
  try {
    const auth = useAuthStore();
    const res = await fetch(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (!res.ok) throw new Error('Gagal mengambil produk');
    const products = await res.json();
    // Bersihkan cache lama dan isi ulang dengan data terbaru
    await db.products.clear();
    await db.products.bulkPut(products);
    console.log(`[sync] ${products.length} produk berhasil di-cache ke IndexedDB.`);
  } catch (e) {
    console.warn('[sync] Gagal meng-cache produk (mungkin sedang offline):', e);
  }
}

/**
 * Menyimpan transaksi ke antrian offline di IndexedDB.
 * Dipanggil saat kasir checkout namun jaringan tidak tersedia.
 */
export async function saveOfflineOrder(cashierId: number, items: { productId: number; qty: number }[]): Promise<string> {
  const clientUuid = crypto.randomUUID();
  const offlineOrder: LocalOrder = {
    clientUuid,
    cashierId,
    items,
    createdAt: new Date()
  };
  await db.offline_orders.add(offlineOrder);
  console.log(`[sync] Pesanan disimpan offline dengan clientUuid: ${clientUuid}`);
  return clientUuid;
}

/**
 * Mengirimkan semua transaksi yang ada di antrian offline ke server.
 * Dipanggil otomatis ketika koneksi internet terdeteksi aktif kembali.
 */
export async function syncOfflineOrders(): Promise<void> {
  const pendingOrders = await db.offline_orders.toArray();
  if (pendingOrders.length === 0) return;

  console.log(`[sync] Mulai sinkronisasi ${pendingOrders.length} pesanan offline...`);
  const auth = useAuthStore();

  for (const order of pendingOrders) {
    // Cek koneksi sebelum setiap pengiriman
    if (!navigator.onLine) {
      console.warn('[sync] Koneksi terputus di tengah sinkronisasi. Menghentikan proses.');
      break;
    }

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          cashierId: order.cashierId,
          items: order.items,
          clientUuid: order.clientUuid // Idempotency key
        })
      });

      // Hapus dari IndexedDB jika sukses (201 Created atau 200 OK - idempotent)
      if (res.ok || res.status === 201) {
        await db.offline_orders.where('clientUuid').equals(order.clientUuid).delete();
        console.log(`[sync] ✅ Pesanan ${order.clientUuid} berhasil disinkronkan dan dihapus dari antrian.`);
      }
    } catch (e) {
      console.error(`[sync] ❌ Gagal mengirim pesanan ${order.clientUuid}:`, e);
    }
  }

  console.log('[sync] Sinkronisasi selesai.');
}

/**
 * Mengembalikan jumlah pesanan offline yang menunggu sinkronisasi.
 */
export async function getOfflineOrderCount(): Promise<number> {
  return await db.offline_orders.count();
}

/**
 * Mendaftarkan listener untuk sinkronisasi otomatis saat koneksi internet kembali.
 */
export function initOfflineSync(): void {
  window.addEventListener('online', () => {
    console.log('[sync] Koneksi internet pulih. Memulai sinkronisasi otomatis...');
    syncOfflineOrders();
    cacheProducts();
  });
}
