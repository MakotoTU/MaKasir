<template>
  <div class="expenses-page">
    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-label">📅 Pengeluaran Hari Ini</div>
        <div class="summary-value">{{ formatRupiah(todayTotal) }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">📆 Pengeluaran Bulan Ini</div>
        <div class="summary-value">{{ formatRupiah(monthTotal) }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">🧾 Total Transaksi</div>
        <div class="summary-value">{{ expenses.length }}</div>
      </div>
    </div>

    <!-- Header Actions -->
    <div class="header-actions">
      <h2>Catatan Pengeluaran</h2>
      <button class="btn btn-primary" @click="openAddModal">+ Tambah Pengeluaran</button>
    </div>

    <!-- Table -->
    <div class="card table-container">
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Deskripsi</th>
            <th>Kategori</th>
            <th>Nominal</th>
            <th>Dicatat Oleh</th>
            <th v-if="isAdmin">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="6" class="empty-state">Memuat data...</td>
          </tr>
          <tr v-else-if="expenses.length === 0">
            <td colspan="6" class="empty-state">Belum ada catatan pengeluaran.</td>
          </tr>
          <tr v-else v-for="e in expenses" :key="e.id">
            <td class="date-cell">{{ formatDate(e.createdAt) }}</td>
            <td><strong>{{ e.description }}</strong></td>
            <td><span class="category-badge">{{ e.category }}</span></td>
            <td class="amount-cell">{{ formatRupiah(e.amount) }}</td>
            <td>@{{ e.creator?.username || '-' }}</td>
            <td v-if="isAdmin" class="actions">
              <button class="btn btn-sm" @click="openEditModal(e)">Edit</button>
              <button class="btn btn-sm btn-danger-outline" @click="deleteExpense(e.id)">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <div class="modal-box">
        <div class="modal-header">
          <h3>{{ isEditing ? 'Edit Pengeluaran' : 'Tambah Pengeluaran Baru' }}</h3>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Deskripsi</label>
            <input v-model="form.description" type="text" placeholder="Cth: Beli es batu, bayar listrik..." />
          </div>
          <div class="form-group">
            <label>Kategori</label>
            <select v-model="form.category">
              <option value="Operasional">Operasional</option>
              <option value="Bahan Baku">Bahan Baku</option>
              <option value="Gaji">Gaji</option>
              <option value="Peralatan">Peralatan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div class="form-group">
            <label>Nominal (Rp)</label>
            <input v-model.number="form.amount" type="number" min="1" placeholder="0" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeModal" :disabled="isSaving">Batal</button>
          <button class="btn btn-primary" @click="saveExpense" :disabled="isSaving">
            {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../store/auth'
import { apiFetch } from '../utils/api'
import { formatRupiah } from '../utils/currency'

interface Expense {
  id: number
  description: string
  amount: number
  category: string
  createdAt: string
  creator?: { username: string }
}

const auth = useAuthStore()
const isAdmin = computed(() => auth.user?.role === 'admin')

const expenses = ref<Expense[]>([])
const isLoading = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)

const form = ref({ id: 0, description: '', amount: 0, category: 'Operasional' })

// Summary Computeds
const todayTotal = computed(() => {
  const today = new Date().toDateString()
  return expenses.value
    .filter(e => new Date(e.createdAt).toDateString() === today)
    .reduce((sum, e) => sum + e.amount, 0)
})

const monthTotal = computed(() => {
  const now = new Date()
  return expenses.value
    .filter(e => {
      const d = new Date(e.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, e) => sum + e.amount, 0)
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

async function fetchExpenses() {
  isLoading.value = true
  try {
    const res = await apiFetch('/api/expenses')
    if (!res.ok) throw new Error('Gagal memuat pengeluaran')
    expenses.value = await res.json()
  } catch (err) {
    console.error(err)
    alert('Gagal memuat data pengeluaran.')
  } finally {
    isLoading.value = false
  }
}

function openAddModal() {
  isEditing.value = false
  form.value = { id: 0, description: '', amount: 0, category: 'Operasional' }
  showModal.value = true
}

function openEditModal(e: Expense) {
  isEditing.value = true
  form.value = { id: e.id, description: e.description, amount: e.amount, category: e.category }
  showModal.value = true
}

function closeModal() {
  if (!isSaving.value) showModal.value = false
}

async function saveExpense() {
  if (!form.value.description || !form.value.amount) {
    alert('Deskripsi dan nominal wajib diisi.')
    return
  }
  isSaving.value = true
  try {
    const url = isEditing.value ? `/api/expenses/${form.value.id}` : '/api/expenses'
    const method = isEditing.value ? 'PUT' : 'POST'
    const res = await apiFetch(url, {
      method,
      body: JSON.stringify({
        description: form.value.description,
        amount: form.value.amount,
        category: form.value.category
      })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Gagal menyimpan')
    }
    await fetchExpenses()
    closeModal()
  } catch (err: any) {
    alert(err.message)
  } finally {
    isSaving.value = false
  }
}

async function deleteExpense(id: number) {
  if (!confirm('Yakin ingin menghapus catatan pengeluaran ini?')) return
  try {
    const res = await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (res.ok) {
      await fetchExpenses()
    } else {
      const data = await res.json()
      alert('Gagal menghapus: ' + data.error)
    }
  } catch (err) {
    alert('Terjadi kesalahan saat menghapus.')
  }
}

onMounted(fetchExpenses)
</script>

<style scoped>
.expenses-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.summary-card {
  background: white;
  border-radius: var(--radius-md);
  padding: 20px 24px;
  box-shadow: var(--shadow-sm);
  border: var(--border-thick);
  transition: transform 0.1s, box-shadow 0.1s;
}
.summary-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-md);
}

.summary-label {
  font-size: 0.85rem;
  color: black;
  font-weight: 800;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.summary-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-main);
  font-family: 'JetBrains Mono', monospace;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions h2 {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
  text-transform: uppercase;
}

.table-container {
  overflow-x: auto;
  border: var(--border-thick);
  border-radius: var(--radius-md);
  background: white;
  box-shadow: var(--shadow-sm);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  text-align: left;
  padding: 12px 16px;
  border-bottom: var(--border-thin);
  font-size: 0.9rem;
}

th {
  font-weight: 800;
  color: black;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--color-accent);
}

.date-cell { color: black; font-size: 0.85rem; white-space: nowrap; font-weight: 700; }

.amount-cell {
  font-weight: 800;
  color: var(--color-danger);
  font-family: 'JetBrains Mono', monospace;
}

.category-badge {
  padding: 4px 10px;
  background: var(--color-primary);
  color: black;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 800;
  border: 2px solid #000;
  text-transform: uppercase;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-danger-outline {
  background: white;
  color: var(--color-danger);
  border: var(--border-thick);
  font-weight: 800;
  box-shadow: var(--shadow-sm);
}

.btn-danger-outline:hover {
  background: var(--color-danger);
  color: white;
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-md);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: black;
  font-weight: 800;
  border-bottom: none;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: white;
  border-radius: var(--radius-md);
  width: 100%;
  max-width: 480px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: var(--border-thick);
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: var(--border-thick);
  padding-bottom: 12px;
}

.modal-header h3 {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 0;
  text-transform: uppercase;
}

.modal-close {
  background: var(--color-danger);
  border: var(--border-thick);
  font-size: 1.2rem;
  cursor: pointer;
  color: white;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: transform 0.1s, box-shadow 0.1s;
  box-shadow: 2px 2px 0px #000;
  font-weight: 800;
}

.modal-close:hover { 
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0px #000;
}
.modal-close:active {
  transform: translate(2px, 2px);
  box-shadow: 0px 0px 0px #000;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.form-group input, .form-group select {
  padding: 10px 14px;
  border: var(--border-thick);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  box-shadow: var(--shadow-sm);
  font-weight: 700;
}

.form-group input:focus, .form-group select:focus {
  background: var(--color-primary);
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
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-weight: 800;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform 0.1s, box-shadow 0.1s;
  text-transform: uppercase;
}

.btn-secondary:hover { 
  background: #f1f5f9;
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-md);
}
.btn-secondary:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}
</style>
