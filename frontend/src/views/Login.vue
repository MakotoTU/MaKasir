<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const waStatus = ref('loading')
const qrCode = ref('')
const isLoading = ref(false)

const login = async () => {
  if (!username.value || !password.value) {
    return alert('Username dan password harus diisi')
  }

  isLoading.value = true
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value })
    })
    
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Login gagal')
    }
    
    const data = await res.json()
    auth.login(data)
    
    // Redirect based on role
    if (data.role === 'admin') {
      router.push('/admin/products')
    } else {
      router.push('/pos')
    }
  } catch (err: any) {
    console.error(err)
    alert(err.message)
  } finally {
    isLoading.value = false
  }
}

const checkWA = async () => {
  try {
    const res = await fetch('/api/wa/qr')
    if (!res.ok) return
    const data = await res.json()
    waStatus.value = data.status
    if (data.qr) {
      qrCode.value = data.qr
    }
  } catch (e) {
    waStatus.value = 'error'
  }
}

let interval: ReturnType<typeof setInterval>
onMounted(() => {
  checkWA()
  interval = setInterval(checkWA, 3000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<template>
  <div class="login-wrapper">
    <div class="login-card card">
      <div class="brand-header">
        <h2>Ma<span class="text-emerald">Kasir</span></h2>
        <p class="subtitle">Masuk ke akun Anda</p>
      </div>
      
      <div class="form-group">
        <label>Username</label>
        <input v-model="username" type="text" placeholder="Masukkan username" />
      </div>
      
      <div class="form-group">
        <label>Password</label>
        <input v-model="password" type="password" placeholder="••••••••" @keyup.enter="login" />
      </div>
      
      <button class="btn btn-primary btn-block" @click="login" :disabled="isLoading">
        {{ isLoading ? 'Memproses...' : 'Masuk' }}
      </button>

      <div class="wa-status" v-if="waStatus !== 'disabled'">
        <h4>Status WhatsApp: <span>{{ waStatus }}</span></h4>
        <div class="qr-container" v-if="waStatus === 'waiting_for_scan' && qrCode">
          <p>Scan QR ini di aplikasi WhatsApp Anda:</p>
          <img :src="qrCode" alt="WA QR Code" />
        </div>
        <p v-else-if="waStatus === 'connected'" class="success-text">WhatsApp Terhubung!</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100vw;
  background: var(--color-accent);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px 30px;
  background: white;
  border: var(--border-thick);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.brand-header {
  text-align: center;
  margin-bottom: 30px;
}

.brand-header h2 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 5px;
  text-transform: uppercase;
}

.text-emerald {
  color: var(--color-danger);
}

.subtitle {
  color: black;
  font-size: 0.95rem;
  font-weight: 800;
}

.form-group {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 800;
  text-transform: uppercase;
}

.btn-block {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  margin-top: 10px;
}

.wa-status {
  margin-top: 30px;
  padding: 20px;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  text-align: center;
  border: var(--border-thick);
  box-shadow: var(--shadow-sm);
}

.wa-status h4 {
  font-size: 0.9rem;
  margin-bottom: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.qr-container img {
  width: 200px;
  height: 200px;
  border-radius: var(--radius-sm);
  border: 2px solid #000;
}

.success-text {
  color: var(--color-emerald);
  font-weight: 800;
  background: white;
  padding: 5px 10px;
  border: 2px solid #000;
  display: inline-block;
}
</style>
