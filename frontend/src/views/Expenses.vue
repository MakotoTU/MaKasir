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
import { useAuthStore } from '../../store/auth'
import { apiFetch } from '../../utils/api'
import { formatRupiah } from '../../utils/currency'

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
  border: 1px solid #f1f5f9;
}

.summary-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 500;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions h2 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
}

th {
  font-weight: 700;
  color: var(--text-muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #f8fafc;
}

.date-cell { color: var(--text-muted); font-size: 0.85rem; white-space: nowrap; }

.amount-cell {
  font-weight: 700;
  color: #dc2626;
}

.category-badge {
  padding: 3px 10px;
  background: rgba(99, 102, 241, 0.1);
  color: #4f46e5;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-danger-outline {
  background: transparent;
  color: #ef4444;
  border: 1px solid #fca5a5;
}

.btn-danger-outline:hover {
  background: #fef2f2;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
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
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.modal-close:hover { background: #f1f5f9; }

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
  font-weight: 600;
  color: var(--text-main);
}

.form-group input, .form-group select {
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-group input:focus, .form-group select:focus {
  border-color: var(--color-emerald);
  outline: none;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-secondary {
  background: #f1f5f9;
  color: var(--text-main);
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover { background: #e2e8f0; }
</style>
