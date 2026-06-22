<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BaseModal from '../../components/BaseModal.vue'
import { apiFetch } from '../../utils/api'
import type { User } from '../../types'

const users = ref<User[]>([])
const isEditing = ref(false)
const showModal = ref(false)

const isLoadingData = ref(false)
const isSaving = ref(false)

const form = ref<Partial<User> & { password?: string }>({
  id: undefined,
  username: '',
  password: '',
  role: 'cashier'
})

const fetchUsers = async () => {
  isLoadingData.value = true
  try {
    const res = await apiFetch('/api/users')
    if (!res.ok) throw new Error('Failed to fetch users')
    users.value = await res.json()
  } catch (err) {
    console.error(err)
    alert('Gagal memuat pengguna')
  } finally {
    isLoadingData.value = false
  }
}

const openAddModal = () => {
  isEditing.value = false
  form.value = { id: undefined, username: '', password: '', role: 'cashier' }
  showModal.value = true
}

const openEditModal = (u: User) => {
  isEditing.value = true
  form.value = { id: u.id, username: u.username, password: '', role: u.role }
  showModal.value = true
}

const closeModal = () => {
  if (!isSaving.value) {
    showModal.value = false
  }
}

const saveUser = async () => {
  isSaving.value = true
  try {
    const url = isEditing.value ? `/api/users/${form.value.id}` : '/api/users'
    const method = isEditing.value ? 'PUT' : 'POST'

    // Kalau edit tapi password kosong, jangan kirim password
    const payload = { ...form.value }
    if (isEditing.value && !payload.password) {
      delete payload.password
    }

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      let errorMsg = 'Gagal menyimpan user'
      try {
        const data = await res.json()
        errorMsg += ': ' + data.error
      } catch (e) {
        errorMsg += ': Server mengembalikan format yang tidak valid'
      }
      throw new Error(errorMsg)
    }

    fetchUsers()
    closeModal()
  } catch (err: any) {
    console.error(err)
    alert(err.message || 'Terjadi kesalahan jaringan/koneksi.')
  } finally {
    isSaving.value = false
  }
}

const deleteUser = async (u: User) => {
  if (u.role === 'admin') {
    alert('Tidak bisa menghapus admin!')
    return
  }
  if (!confirm(`Yakin ingin menghapus akun ${u.username}?`)) return
  
  try {
    const res = await apiFetch(`/api/users/${u.id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchUsers()
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
  fetchUsers()
})
</script>

<template>
  <div class="users-admin">
    <div class="header-actions">
      <h2>Manajemen Akun</h2>
      <button class="btn btn-primary" @click="openAddModal">+ Tambah Akun</button>
    </div>

    <div class="card table-container">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Role</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoadingData">
            <td colspan="4" class="empty-state">Memuat data...</td>
          </tr>
          <tr v-else-if="users.length === 0">
            <td colspan="4" class="empty-state">Belum ada user.</td>
          </tr>
          <tr v-else v-for="u in users" :key="u.id">
            <td>#{{ u.id }}</td>
            <td><strong>@{{ u.username }}</strong></td>
            <td>
              <span class="status-pill" :class="u.role === 'admin' ? 'status-success' : 'status-pending'">
                {{ u.role }}
              </span>
            </td>
            <td class="actions">
              <button class="btn btn-sm" @click="openEditModal(u)">Edit</button>
              <button class="btn btn-sm btn-danger-outline" @click="deleteUser(u)" v-if="u.role !== 'admin'">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <BaseModal 
      :show="showModal" 
      :title="isEditing ? 'Edit Akun' : 'Tambah Akun Baru'" 
      @close="closeModal"
    >
      <div class="form-group">
        <label>Username</label>
        <input v-model="form.username" type="text" placeholder="Masukkan username" />
      </div>

      <div class="form-group">
        <label>Password {{ isEditing ? '(Biarkan kosong jika tidak diganti)' : '' }}</label>
        <input v-model="form.password" type="password" placeholder="••••••••" />
      </div>

      <div class="form-group">
        <label>Role</label>
        <select v-model="form.role">
          <option value="cashier">Kasir</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" @click="closeModal" :disabled="isSaving">Batal</button>
        <button class="btn btn-primary" @click="saveUser" :disabled="isSaving">
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
</style>
