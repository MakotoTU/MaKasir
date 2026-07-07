<template>
  <div class="network-badge" :class="statusClass" :title="tooltipText">
    <span class="dot"></span>
    <span class="label">{{ labelText }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getOfflineOrderCount } from '../services/sync.service';

const isOnline = ref(navigator.onLine);
const pendingCount = ref(0);

// Polling interval ID untuk mengecek jumlah antrian offline
let pollInterval: ReturnType<typeof setInterval> | null = null;

async function refreshPendingCount() {
  pendingCount.value = await getOfflineOrderCount();
}

function handleOnline() {
  isOnline.value = true;
  refreshPendingCount();
}

function handleOffline() {
  isOnline.value = false;
  refreshPendingCount();
}

onMounted(() => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  refreshPendingCount();
  // Perbarui jumlah antrian setiap 5 detik
  pollInterval = setInterval(refreshPendingCount, 5000);
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  if (pollInterval) clearInterval(pollInterval);
});

const statusClass = computed(() => ({
  'status-online': isOnline.value,
  'status-offline': !isOnline.value
}));

const labelText = computed(() => {
  if (isOnline.value) return 'Online';
  return pendingCount.value > 0 ? `Offline · ${pendingCount.value} transaksi` : 'Offline';
});

const tooltipText = computed(() => {
  if (isOnline.value) return 'Terhubung ke server';
  return pendingCount.value > 0
    ? `Tidak ada internet. ${pendingCount.value} transaksi akan disinkronkan otomatis saat online.`
    : 'Tidak ada internet. Mode offline aktif.';
});
</script>

<style scoped>
.network-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  transition: background 0.3s, color 0.3s;
  cursor: default;
  user-select: none;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-online {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
}
.status-online .dot {
  background: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
  animation: pulse-green 1.8s ease-in-out infinite;
}

.status-offline {
  background: rgba(249, 115, 22, 0.15);
  color: #ea580c;
}
.status-offline .dot {
  background: #f97316;
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.3);
}

@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3); }
  50% { box-shadow: 0 0 0 5px rgba(34, 197, 94, 0); }
}
</style>
