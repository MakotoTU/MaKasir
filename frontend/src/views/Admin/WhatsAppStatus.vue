<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { apiFetch } from '../../utils/api'

const waStatus = ref('loading')
const qrCode = ref('')
const isDisconnecting = ref(false)
const errorMessage = ref('')

const checkWAStatus = async () => {
  try {
    // Gunakan apiFetch agar konsisten, meskipun endpoint ini public
    const res = await apiFetch('/api/wa/qr')
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    const data = await res.json()
    waStatus.value = data.status
    if (data.qr) {
      qrCode.value = data.qr
    } else {
      qrCode.value = ''
    }
    errorMessage.value = ''
  } catch (err: any) {
    console.error('Gagal mengambil status WA:', err)
    waStatus.value = 'error'
    errorMessage.value = err.message || 'Server tidak merespons'
  }
}

const handleDisconnect = async () => {
  const confirmed = confirm(
    'Logout akan memutus koneksi WA dan menghapus sesi.\nBot akan offline hingga QR di-scan ulang. Lanjutkan?'
  )
  if (!confirmed) return

  isDisconnecting.value = true
  errorMessage.value = ''
  try {
    const res = await apiFetch('/api/admin/wa/logout', {
      method: 'POST'
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memutus koneksi WhatsApp')
    }

    // Sukses
    waStatus.value = 'disconnected'
    qrCode.value = ''
    alert('Sesi WhatsApp berhasil dihapus. Silakan hubungkan kembali jika diperlukan.')
    checkWAStatus() // Ambil status baru (seharusnya generating QR baru)
  } catch (err: any) {
    console.error('Error logout WA:', err)
    errorMessage.value = err.message || 'Server tidak merespons'
    alert('Gagal memutuskan WhatsApp: ' + errorMessage.value)
  } finally {
    isDisconnecting.value = false
  }
}

let interval: ReturnType<typeof setInterval>
onMounted(() => {
  checkWAStatus()
  interval = setInterval(checkWAStatus, 3000) // Poll every 3 seconds
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<template>
  <div class="wa-status-page">
    <div class="header-section">
      <h2>Status Integrasi WhatsApp</h2>
      <p class="subtitle">Kelola dan pantau sesi bot WhatsApp untuk mengirim notifikasi kasir.</p>
    </div>

    <div class="card main-card">
      <div class="status-indicator">
        <div class="indicator-dot" :class="waStatus"></div>
        <div class="status-details">
          <h3>Status Sesi: <span class="status-text" :class="waStatus">{{ waStatus }}</span></h3>
          <p v-if="waStatus === 'connected'" class="desc">Bot WhatsApp saat ini aktif dan siap mengirimkan notifikasi transaksi.</p>
          <p v-else-if="waStatus === 'waiting_for_scan'" class="desc">Aplikasi siap dipasangkan. Silakan scan kode QR di bawah menggunakan WhatsApp Anda.</p>
          <p v-else-if="waStatus === 'initializing'" class="desc">Mempersiapkan koneksi WhatsApp, harap tunggu...</p>
          <p v-else-if="waStatus === 'disconnected'" class="desc">Sesi terputus. Silakan tunggu QR Code baru muncul untuk menghubungkan kembali.</p>
          <p v-else class="desc error-text">Terjadi kesalahan saat menghubungi server: {{ errorMessage }}</p>
        </div>
      </div>

      <div class="qr-section" v-if="waStatus === 'waiting_for_scan' && qrCode">
        <div class="qr-wrapper">
          <img :src="qrCode" alt="WhatsApp QR Code" />
        </div>
        <div class="qr-instructions">
          <ol>
            <li>Buka WhatsApp di ponsel Anda.</li>
            <li>Ketuk <strong>Menu</strong> (titik tiga) atau <strong>Pengaturan</strong>.</li>
            <li>Pilih <strong>Perangkat Tertaut</strong> lalu ketuk <strong>Tautkan Perangkat</strong>.</li>
            <li>Arahkan kamera ponsel Anda ke layar ini untuk memindai kode QR.</li>
          </ol>
        </div>
      </div>

      <div class="action-section" v-if="waStatus === 'connected'">
        <button 
          class="btn btn-danger" 
          @click="handleDisconnect" 
          :disabled="isDisconnecting"
        >
          {{ isDisconnecting ? 'Memutus Koneksi...' : 'Disconnect WhatsApp' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wa-status-page {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header-section h2 {
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 6px;
}

.subtitle {
  color: var(--text-muted);
}

.main-card {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 30px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.status-indicator {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding-bottom: 20px;
  border-bottom: 1px dashed #e2e8f0;
}

.indicator-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #cbd5e1;
  flex-shrink: 0;
  margin-top: 4px;
  position: relative;
}

.indicator-dot::after {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border-radius: 50%;
  border: 2px solid transparent;
  opacity: 0.4;
}

.indicator-dot.connected {
  background: var(--color-emerald);
}
.indicator-dot.connected::after {
  border-color: var(--color-emerald);
  animation: pulse 2s infinite;
}

.indicator-dot.waiting_for_scan {
  background: #eab308;
}
.indicator-dot.waiting_for_scan::after {
  border-color: #eab308;
  animation: pulse 2s infinite;
}

.indicator-dot.initializing {
  background: #3b82f6;
}
.indicator-dot.initializing::after {
  border-color: #3b82f6;
  animation: pulse 2s infinite;
}

.indicator-dot.error, .indicator-dot.disconnected {
  background: #ef4444;
}

.status-text {
  text-transform: uppercase;
  font-weight: 800;
  font-size: 1.1rem;
}

.status-text.connected { color: var(--color-emerald); }
.status-text.waiting_for_scan { color: #eab308; }
.status-text.initializing { color: #3b82f6; }
.status-text.error, .status-text.disconnected { color: #ef4444; }

.status-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.desc {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.error-text {
  color: #ef4444;
  font-weight: 500;
}

.qr-section {
  display: flex;
  gap: 40px;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 24px;
  border-radius: var(--radius-md);
  border: 1px solid #e2e8f0;
}

.qr-wrapper {
  background: white;
  padding: 16px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-wrapper img {
  width: 220px;
  height: 220px;
}

.qr-instructions {
  flex: 1;
}

.qr-instructions ol {
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--text-main);
  font-size: 0.95rem;
}

.action-section {
  display: flex;
  justify-content: flex-start;
}

.btn-danger {
  padding: 12px 24px;
  font-weight: 600;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2);
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(239, 68, 68, 0.3);
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.3); opacity: 0; }
  100% { transform: scale(1); opacity: 0.4; }
}

@media (max-width: 600px) {
  .qr-section {
    flex-direction: column;
    text-align: center;
  }
}
</style>
