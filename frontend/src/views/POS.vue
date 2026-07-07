<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../store/auth'
import { formatRupiah } from '../utils/currency'
import { apiFetch } from '../utils/api'
import type { Product, CartItem } from '../types'
import { db } from '../db'
import { saveOfflineOrder } from '../services/sync.service'

const auth = useAuthStore()

const products = ref<Product[]>([])
const cart = ref<CartItem[]>([])

const isLoadingProducts = ref(false)
const isCheckingOut = ref(false)

// Payment
const paymentMethod = ref<'cash' | 'qris'>('cash')
const amountPaid = ref<number | null>(null)
const changeDue = computed(() => {
  if (paymentMethod.value !== 'cash' || amountPaid.value == null) return null
  return amountPaid.value - totalCart.value
})

// Filters
const searchQuery = ref('')
const selectedCategory = ref('Semua')

const fetchProducts = async () => {
  isLoadingProducts.value = true
  try {
    // Coba ambil dari server terlebih dahulu
    const res = await apiFetch('/api/products')
    if (!res.ok) throw new Error('Failed to fetch products')
    const serverProducts = await res.json()
    products.value = serverProducts
  } catch (err) {
    console.warn('[POS] Gagal memuat produk dari server, mencoba IndexedDB cache...')
    // Fallback: gunakan cache produk dari Dexie jika offline
    const cached = await db.products.toArray()
    if (cached.length > 0) {
      products.value = cached as Product[]
      console.log(`[POS] Menggunakan ${cached.length} produk dari cache offline.`)
    } else {
      console.error('[POS] Tidak ada cache produk tersedia.')
      alert('Gagal memuat produk dan tidak ada cache tersedia. Harap sambungkan ke internet.')
    }
  } finally {
    isLoadingProducts.value = false
  }
}

// Compute categories based on products
const categories = computed(() => {
  const cats = new Set(products.value.map(p => p.category || 'Lainnya'))
  return ['Semua', ...Array.from(cats)]
})

// Filtered products
const filteredProducts = computed(() => {
  return products.value.filter(p => {
    const matchCategory = selectedCategory.value === 'Semua' || (p.category || 'Lainnya') === selectedCategory.value
    const matchSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchCategory && matchSearch
  })
})

const addToCart = (product: Product) => {
  const existing = cart.value.find(item => item.productId === product.id)
  if (existing) {
    existing.qty++
  } else {
    cart.value.push({ productId: product.id, name: product.name, price: product.price, qty: 1 })
  }
}

const decreaseQty = (index: number) => {
  if (cart.value[index].qty > 1) {
    cart.value[index].qty--
  } else {
    cart.value.splice(index, 1)
  }
}

const increaseQty = (index: number) => {
  cart.value[index].qty++
}

const clearCart = () => {
  cart.value = []
}

const totalCart = computed(() => {
  return cart.value.reduce((acc, item) => acc + (item.price * item.qty), 0)
})

const checkout = async () => {
  if (cart.value.length === 0) return alert('Keranjang kosong')
  if (!auth.user || !auth.user.id) return alert('Sesi tidak valid, harap login kembali')

  isCheckingOut.value = true
  try {
    // Mode Offline: simpan ke IndexedDB dan informasikan kasir
    if (!navigator.onLine) {
      await saveOfflineOrder(
        auth.user.id,
        cart.value.map(c => ({ productId: c.productId, qty: c.qty }))
      )
      alert('⚠️ Mode Offline: Pesanan disimpan dan akan dikirim otomatis saat internet kembali aktif.')
      cart.value = []
      return
    }

    // Mode Online: kirim langsung ke server
    const payload: any = {
      items: cart.value,
      cashierId: auth.user.id,
      paymentMethod: paymentMethod.value
    }
    if (paymentMethod.value === 'cash') {
      if (!amountPaid.value || amountPaid.value < totalCart.value) {
        alert('Masukkan jumlah uang yang diterima (minimal sama dengan total belanja)')
        isCheckingOut.value = false
        return
      }
      payload.amountPaid = amountPaid.value
    }

    const res = await apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Gagal menyimpan pesanan')
    }

    alert('Order berhasil disimpan dan pesan WA akan segera dikirim!')
    cart.value = []
    amountPaid.value = null
    paymentMethod.value = 'cash'
  } catch (err: any) {
    // Jika error karena koneksi, save ke offline juga
    if (!navigator.onLine || err.message?.includes('fetch')) {
      await saveOfflineOrder(
        auth.user!.id,
        cart.value.map(c => ({ productId: c.productId, qty: c.qty }))
      )
      alert('⚠️ Koneksi terputus. Pesanan disimpan offline dan akan disinkronkan saat online kembali.')
      cart.value = []
    } else {
      console.error(err)
      alert('Terjadi kesalahan saat checkout: ' + err.message)
    }
  } finally {
    isCheckingOut.value = false
  }
}

onMounted(() => {
  fetchProducts()
})
</script>

<template>
  <div class="pos-layout">
    <!-- Kolom Kiri: Produk -->
    <div class="pos-main">
      <div class="pos-header">
        <h2>Ma<span class="text-emerald">Kasir</span></h2>
        <div class="search-box">
          <input type="text" v-model="searchQuery" placeholder="Cari nama produk..." />
        </div>
      </div>

      <div class="category-filters">
        <button 
          v-for="cat in categories" 
          :key="cat"
          class="cat-pill"
          :class="{ active: selectedCategory === cat }"
          @click="selectedCategory = cat"
        >
          {{ cat }}
        </button>
      </div>

      <div class="product-grid">
        <div class="product-card" v-for="p in filteredProducts" :key="p.id" @click="addToCart(p)">
          <div class="product-info">
            <h4>{{ p.name }}</h4>
            <span class="product-price">{{ formatRupiah(p.price) }}</span>
          </div>
          <div class="product-action">
            <button class="btn-add">+</button>
          </div>
        </div>
        
        <div class="empty-products" v-if="filteredProducts.length === 0">
          <p v-if="isLoadingProducts">Memuat produk...</p>
          <p v-else>Produk tidak ditemukan.</p>
        </div>
      </div>
    </div>

    <!-- Kolom Kanan: Keranjang -->
    <div class="pos-sidebar">
      <div class="cart-container card">
        <div class="cart-header">
          <h3>Pesanan Saat Ini</h3>
          <button class="btn-clear" @click="clearCart" v-if="cart.length > 0">Kosongkan</button>
        </div>

        <div class="cart-items" v-if="cart.length > 0">
          <div class="cart-item" v-for="(c, i) in cart" :key="c.productId">
            <div class="item-details">
              <span class="item-name">{{ c.name }}</span>
              <span class="item-price">{{ formatRupiah(c.price * c.qty) }}</span>
            </div>
            <div class="qty-controls">
              <button class="qty-btn" @click="decreaseQty(i)">-</button>
              <span class="qty-display">{{ c.qty }}</span>
              <button class="qty-btn" @click="increaseQty(i)">+</button>
            </div>
          </div>
        </div>
        <div class="cart-empty" v-else>
          <div class="empty-icon">🛒</div>
          <p>Belum ada produk yang dipilih</p>
        </div>

        <div class="cart-footer">
          <div class="cart-total">
            <span>Total Tagihan</span>
            <span class="total-amount">{{ formatRupiah(totalCart) }}</span>
          </div>

          <!-- Pilihan Metode Pembayaran -->
          <div class="payment-method">
            <button
              class="pay-btn"
              :class="{ active: paymentMethod === 'cash' }"
              @click="paymentMethod = 'cash'; amountPaid = null"
            >💵 Tunai</button>
            <button
              class="pay-btn"
              :class="{ active: paymentMethod === 'qris' }"
              @click="paymentMethod = 'qris'; amountPaid = null"
            >📱 QRIS</button>
          </div>

          <!-- Input Uang Diterima (hanya untuk tunai) -->
          <div class="cash-input" v-if="paymentMethod === 'cash'">
            <label>Uang Diterima (Rp)</label>
            <input
              v-model.number="amountPaid"
              type="number"
              :min="totalCart"
              placeholder="Masukkan nominal..."
            />
            <div class="change-display" v-if="changeDue !== null">
              <span>Kembalian:</span>
              <span class="change-amount" :class="{ 'change-negative': changeDue < 0 }">
                {{ formatRupiah(changeDue) }}
              </span>
            </div>
          </div>

          <button class="btn btn-primary btn-block btn-checkout" @click="checkout" :disabled="cart.length === 0 || isCheckingOut">
            {{ isCheckingOut ? 'Memproses...' : 'Proses Pembayaran' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pos-layout {
  display: flex;
  height: calc(100vh - 60px); /* Kurangi tinggi navbar kalau ada */
  overflow: hidden;
  background-color: var(--bg-light);
}

.pos-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pos-header h2 {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
}

.text-emerald {
  color: var(--color-emerald-hover);
}

.search-box input {
  width: 300px;
  padding: 12px 16px;
  border-radius: 20px;
  border: 1px solid #cbd5e1;
  background: white;
  transition: all 0.2s;
}

.search-box input:focus {
  border-color: var(--color-emerald);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  outline: none;
}

.category-filters {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 5px;
}

.cat-pill {
  padding: 8px 16px;
  border-radius: 20px;
  background: white;
  border: 1px solid #e2e8f0;
  color: var(--text-muted);
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.cat-pill:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.cat-pill.active {
  background: var(--color-emerald);
  color: white;
  border-color: var(--color-emerald);
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  padding-bottom: 24px;
}

.product-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-md);
  padding: 20px;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 120px;
  position: relative;
  overflow: hidden;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-emerald);
}

.product-info h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-main);
  line-height: 1.3;
}

.product-price {
  font-weight: 800;
  color: #047857; /* Darker emerald for contrast on white */
  font-size: 1.1rem;
}

.product-action {
  position: absolute;
  bottom: 15px;
  right: 15px;
}

.btn-add {
  background: var(--bg-light);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: var(--color-emerald);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}

.product-card:hover .btn-add {
  background: var(--color-emerald);
  color: white;
}

.pos-sidebar {
  width: 380px;
  padding: 24px;
  background: white;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.cart-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  box-shadow: none;
  border: none;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 1px dashed #e2e8f0;
}

.cart-header h3 {
  font-size: 1.2rem;
  margin: 0;
}

.btn-clear {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-clear:hover {
  text-decoration: underline;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-light);
  border-radius: var(--radius-sm);
  animation: fadeIn 0.2s ease-in;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.item-price {
  color: #047857; /* Darker emerald for contrast */
  font-weight: 600;
  font-size: 0.9rem;
}

.qty-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border-radius: 20px;
  padding: 4px 8px;
  box-shadow: var(--shadow-sm);
}

.qty-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.qty-btn:hover {
  background: #f1f5f9;
  color: var(--text-main);
}

.qty-display {
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.cart-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  opacity: 0.7;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  filter: grayscale(100%) opacity(50%);
}

.cart-footer {
  padding-top: 20px;
  border-top: 1px dashed #e2e8f0;
  margin-top: auto;
}

.cart-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 1.1rem;
  font-weight: 600;
}

.total-amount {
  font-size: 1.5rem;
  font-weight: 800;
  color: #047857; /* Darker emerald for contrast */
}

.btn-checkout {
  padding: 16px;
  font-size: 1.1rem;
  font-weight: 700;
  border-radius: var(--radius-md);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.btn-checkout:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .pos-layout {
    flex-direction: column;
    height: auto;
  }
  .pos-sidebar {
    width: 100%;
    border-left: none;
    border-top: 1px solid #e2e8f0;
  }
}

.payment-method {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}

.pay-btn {
  padding: 10px;
  border-radius: var(--radius-md);
  border: 2px solid #e2e8f0;
  background: #f8fafc;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-muted);
}

.pay-btn:hover { border-color: var(--color-emerald); color: var(--color-emerald); }
.pay-btn.active {
  border-color: var(--color-emerald);
  background: rgba(16, 185, 129, 0.08);
  color: #047857;
}

.cash-input {
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cash-input label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.cash-input input {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid #cbd5e1;
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.cash-input input:focus {
  border-color: var(--color-emerald);
  outline: none;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.change-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f0fdf4;
  border-radius: var(--radius-sm);
  border: 1px solid #bbf7d0;
  font-size: 0.9rem;
  font-weight: 600;
}

.change-amount { color: #047857; font-size: 1rem; font-weight: 800; }
.change-negative { color: #dc2626; }
</style>
