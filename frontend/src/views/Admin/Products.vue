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
  background: white;
  border: var(--border-thick);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 800;
  box-shadow: var(--shadow-sm);
  transition: transform 0.1s, box-shadow 0.1s;
  color: black;
  text-transform: uppercase;
}

.btn-sm:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-md);
  background: var(--color-primary);
}

.btn-danger-outline {
  color: var(--color-danger);
}

.btn-danger-outline:hover {
  background: var(--color-danger);
  color: white;
}

.empty-state {
  text-align: center;
  padding: 30px;
  color: black;
  font-weight: 800;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 800;
  color: black;
  text-transform: uppercase;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.btn-secondary {
  background: white;
  color: black;
  border: var(--border-thick);
  font-weight: 800;
  box-shadow: var(--shadow-sm);
  transition: transform 0.1s, box-shadow 0.1s;
}

.btn-secondary:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-md);
  background: #f1f5f9;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stock-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 800;
  border: 2px solid #000;
  text-transform: uppercase;
}
.stock-ok { background: var(--color-emerald); color: white; }
.stock-low { background: var(--color-primary); color: black; }
.stock-empty { background: var(--color-danger); color: white; }
</style>
