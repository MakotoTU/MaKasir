<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BaseModal from '../../components/BaseModal.vue'
import { formatRupiah } from '../../utils/currency'
import { apiFetch } from '../../utils/api'
import type { Product } from '../../types'

const products = ref<Product[]>([])
const isEditing = ref(false)
const showModal = ref(false)

const isLoadingData = ref(false)
const isSaving = ref(false)

const form = ref<Partial<Product>>({ 
  id: undefined,
  name: '',
  price: 0,
  category: '',
  stock: 0,
  minimumStock: 5
})

const fetchProducts = async () => {
  isLoadingData.value = true
  try {
    const res = await apiFetch('/api/products')
    if (!res.ok) throw new Error('Failed to fetch products')
    products.value = await res.json()
  } catch (err) {
    console.error(err)
    alert('Gagal memuat produk')
  } finally {
    isLoadingData.value = false
  }
}

const openAddModal = () => {
  isEditing.value = false
  form.value = { id: undefined, name: '', price: 0, category: '', stock: 0, minimumStock: 5 }
  showModal.value = true
}

const openEditModal = (p: Product) => {
  isEditing.value = true
  form.value = { ...p }
  showModal.value = true
}

const closeModal = () => {
  if (!isSaving.value) {
    showModal.value = false
  }
}

const saveProduct = async () => {
  isSaving.value = true
  try {
    const url = isEditing.value ? `/api/products/${form.value.id}` : '/api/products'
    const method = isEditing.value ? 'PUT' : 'POST'

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(form.value)
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Gagal menyimpan produk')
    }

    fetchProducts()
    closeModal()
  } catch (err: any) {
    console.error(err)
    alert(err.message)
  } finally {
    isSaving.value = false
  }
}

const deleteProduct = async (id: number) => {
  if (!confirm('Yakin ingin menghapus produk ini?')) return
  try {
    const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchProducts()
    } else {
      const data = await res.json()
      alert('Gagal menghapus: ' + data.error)
    }
  } catch (err) {
    console.error(err)
    alert('Terjadi kesalahan saat menghapus')
  }
}

onMounted(() => {
  fetchProducts()
})
</script>

<template>
  <div class="products-admin">
    <div class="header-actions">
      <h2>Manajemen Produk</h2>
      <button class="btn btn-primary" @click="openAddModal">+ Tambah Produk</button>
    </div>

    <div class="card table-container">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nama Produk</th>
            <th>Kategori</th>
            <th>Harga</th>
            <th>Stok</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoadingData">
            <td colspan="6" class="empty-state">Memuat data...</td>
          </tr>
          <tr v-else-if="products.length === 0">
            <td colspan="6" class="empty-state">Belum ada produk.</td>
          </tr>
          <tr v-else v-for="p in products" :key="p.id">
            <td>#{{ p.id }}</td>
            <td><strong>{{ p.name }}</strong></td>
            <td>{{ p.category }}</td>
            <td>{{ formatRupiah(p.price) }}</td>
            <td>
              <span class="stock-badge" :class="{
                'stock-ok': p.stock > p.minimumStock,
                'stock-low': p.stock <= p.minimumStock && p.stock > 0,
                'stock-empty': p.stock === 0
              }">
                {{ p.stock }} pcs
              </span>
            </td>
            <td class="actions">
              <button class="btn btn-sm" @click="openEditModal(p)">Edit</button>
              <button class="btn btn-sm btn-danger-outline" @click="deleteProduct(p.id)">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <BaseModal 
      :show="showModal" 
      :title="isEditing ? 'Edit Produk' : 'Tambah Produk Baru'" 
      @close="closeModal"
    >
      <div class="form-group">
        <label>Nama Produk</label>
        <input v-model="form.name" type="text" placeholder="Cth: Kopi Hitam" />
      </div>

      <div class="form-group">
        <label>Kategori</label>
        <input v-model="form.category" type="text" placeholder="Cth: Minuman" />
      </div>

      <div class="form-group">
        <label>Harga (Rp)</label>
        <input v-model="form.price" type="number" min="0" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Stok Awal (pcs)</label>
          <input v-model="form.stock" type="number" min="0" />
        </div>
        <div class="form-group">
          <label>Minimum Stok (pcs)</label>
          <input v-model="form.minimumStock" type="number" min="0" />
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" @click="closeModal" :disabled="isSaving">Batal</button>
        <button class="btn btn-primary" @click="saveProduct" :disabled="isSaving">
          {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-container {
  overflow-x: auto;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.85rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.btn-sm:hover {
  background: #e2e8f0;
}

.btn-danger-outline {
  color: #ef4444;
  background: white;
  border-color: #f87171;
}

.btn-danger-outline:hover {
  background: #fef2f2;
  border-color: #ef4444;
}

.empty-state {
  text-align: center;
  padding: 30px;
  color: var(--text-muted);
}



.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-main);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.btn-secondary {
  background: #f1f5f9;
  color: var(--text-main);
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stock-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}
.stock-ok { background: #dcfce7; color: #16a34a; }
.stock-low { background: #fef9c3; color: #92400e; }
.stock-empty { background: #fee2e2; color: #dc2626; }
</style>
