<template>
  <div class="kds-container">
    <header class="kds-header">
      <div class="kds-header-left">
        <h1>🍳 Kitchen Display</h1>
        <span class="kds-date">{{ currentTime }}</span>
      </div>
      <div class="kds-header-right">
        <span class="ws-badge" :class="wsStatusClass">
          <span class="ws-dot"></span>
          {{ wsStatusLabel }}
        </span>
      </div>
    </header>

    <div class="kds-board">
      <!-- Kolom: Sedang Diproses -->
      <div class="kds-column">
        <div class="column-header processing">
          <span>🔥 Sedang Diproses</span>
          <span class="count-badge">{{ processingOrders.length }}</span>
        </div>
        <div class="orders-list">
          <transition-group name="order-card">
            <div
              v-for="order in processingOrders"
              :key="order.id"
              class="order-card"
              :class="timerClass(order.createdAt)"
            >
              <div class="order-card-header">
                <span class="order-id">#{{ order.id }}</span>
                <span class="order-cashier">{{ order.cashier?.username || 'Kasir' }}</span>
                <span class="order-timer" :class="timerClass(order.createdAt)">
                  ⏱ {{ elapsedTime(order.createdAt) }}
                </span>
              </div>
              <ul class="order-items">
                <li v-for="item in order.items" :key="item.id">
                  <span class="item-qty">{{ item.qty }}x</span>
                  <span class="item-name">{{ item.name }}</span>
                </li>
              </ul>
              <button class="btn-done" @click="markReady(order.id)">
                ✅ Selesai & Sajikan
              </button>
            </div>
          </transition-group>
          <div v-if="processingOrders.length === 0" class="empty-state">
            <span>Belum ada pesanan masuk</span>
          </div>
        </div>
      </div>

      <!-- Kolom: Siap Disajikan -->
      <div class="kds-column">
        <div class="column-header ready">
          <span>✅ Siap Disajikan</span>
          <span class="count-badge">{{ readyOrders.length }}</span>
        </div>
        <div class="orders-list">
          <transition-group name="order-card">
            <div
              v-for="order in readyOrders"
              :key="order.id"
              class="order-card ready-card"
            >
              <div class="order-card-header">
                <span class="order-id">#{{ order.id }}</span>
                <span class="order-cashier">{{ order.cashier?.username || 'Kasir' }}</span>
              </div>
              <ul class="order-items">
                <li v-for="item in order.items" :key="item.id">
                  <span class="item-qty">{{ item.qty }}x</span>
                  <span class="item-name">{{ item.name }}</span>
                </li>
              </ul>
              <button class="btn-complete" @click="markCompleted(order.id)">
                🏁 Selesai Diambil
              </button>
            </div>
          </transition-group>
          <div v-if="readyOrders.length === 0" class="empty-state">
            <span>Belum ada pesanan yang siap</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Audio element untuk alarm notifikasi -->
    <audio ref="bellAudio" preload="auto">
      <source src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" type="audio/mp3" />
    </audio>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface OrderItem {
  id: number;
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: number;
  status: string;
  cashierId: number;
  createdAt: string;
  cashier?: { username: string };
  items: OrderItem[];
}

const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:3000') + '/ws/kds';

const orders = ref<Order[]>([]);
const bellAudio = ref<HTMLAudioElement | null>(null);
const wsStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting');
const currentTime = ref('');
let ws: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let clockInterval: ReturnType<typeof setInterval> | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let reconnectDelay = 1000;

// Tick untuk refresh timer display di setiap kartu
const timerTick = ref(0);

const processingOrders = computed(() =>
  orders.value.filter(o => !['siap_disajikan', 'selesai_ambil'].includes(o.status))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
);

const readyOrders = computed(() =>
  orders.value.filter(o => o.status === 'siap_disajikan')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
);

function elapsedTime(createdAt: string): string {
  void timerTick.value; // Reaktif terhadap tick
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function timerClass(createdAt: string): string {
  void timerTick.value;
  const minutes = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (minutes >= 20) return 'timer-red';
  if (minutes >= 10) return 'timer-yellow';
  return 'timer-green';
}

function playBell() {
  if (bellAudio.value) {
    bellAudio.value.currentTime = 0;
    bellAudio.value.play().catch(() => {});
  }
}

function connectWebSocket() {
  wsStatus.value = 'connecting';
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    wsStatus.value = 'connected';
    reconnectDelay = 1000; // Reset delay saat berhasil
    console.log('[KDS] WebSocket terhubung.');
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'init_orders') {
        orders.value = msg.data;
      } else if (msg.type === 'new_order') {
        // Tambahkan pesanan baru ke daftar
        const exists = orders.value.find(o => o.id === msg.data.id);
        if (!exists) {
          orders.value.push(msg.data);
          playBell();
        }
      } else if (msg.type === 'status_updated') {
        // Update status pesanan yang ada
        const order = orders.value.find(o => o.id === msg.data.orderId);
        if (order) order.status = msg.data.status;
        // Hapus dari daftar jika sudah selesai diambil
        if (msg.data.status === 'selesai_ambil') {
          orders.value = orders.value.filter(o => o.id !== msg.data.orderId);
        }
      }
    } catch (e) {
      console.error('[KDS] Gagal parse pesan WebSocket:', e);
    }
  };

  ws.onclose = () => {
    wsStatus.value = 'disconnected';
    console.warn(`[KDS] Koneksi terputus. Mencoba reconnect dalam ${reconnectDelay / 1000}s...`);
    // Exponential backoff (maks 30 detik)
    reconnectTimeout = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      connectWebSocket();
    }, reconnectDelay);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function sendStatusUpdate(orderId: number, status: string) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'update_status', orderId, status }));
  }
}

function markReady(orderId: number) {
  sendStatusUpdate(orderId, 'siap_disajikan');
}

function markCompleted(orderId: number) {
  sendStatusUpdate(orderId, 'selesai_ambil');
}

function updateClock() {
  currentTime.value = new Date().toLocaleString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

const wsStatusClass = computed(() => ({
  'ws-connected': wsStatus.value === 'connected',
  'ws-connecting': wsStatus.value === 'connecting',
  'ws-disconnected': wsStatus.value === 'disconnected',
}));

const wsStatusLabel = computed(() => {
  if (wsStatus.value === 'connected') return 'Terhubung';
  if (wsStatus.value === 'connecting') return 'Menghubungkan...';
  return 'Terputus';
});

onMounted(() => {
  connectWebSocket();
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
  timerInterval = setInterval(() => { timerTick.value++; }, 1000);
});

onUnmounted(() => {
  ws?.close();
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  if (clockInterval) clearInterval(clockInterval);
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<style scoped>
.kds-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', sans-serif;
}

.kds-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 30px;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}

.kds-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px 0;
}

.kds-date {
  font-size: 0.8rem;
  color: #94a3b8;
}

.ws-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.ws-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ws-connected { background: rgba(34,197,94,0.15); color: #4ade80; }
.ws-connected .ws-dot { background: #22c55e; animation: pulse-green 1.8s ease-in-out infinite; }
.ws-connecting { background: rgba(250,204,21,0.15); color: #facc15; }
.ws-connecting .ws-dot { background: #facc15; }
.ws-disconnected { background: rgba(239,68,68,0.15); color: #f87171; }
.ws-disconnected .ws-dot { background: #ef4444; }

@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.3); }
  50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
}

.kds-board {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 24px;
  flex: 1;
  overflow: hidden;
}

.kds-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}
.column-header.processing { background: rgba(249,115,22,0.15); color: #fb923c; border: 1px solid rgba(249,115,22,0.25); }
.column-header.ready { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.25); }

.count-badge {
  background: rgba(255,255,255,0.12);
  color: #fff;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 0.85rem;
}

.orders-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 4px;
}

.order-card {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 16px;
  transition: all 0.3s ease;
  border-left: 4px solid #fb923c;
}
.order-card.timer-yellow { border-left-color: #facc15; }
.order-card.timer-red { border-left-color: #ef4444; animation: pulse-red 1.5s ease-in-out infinite; }
.ready-card { border-left-color: #22c55e !important; }

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
  50% { box-shadow: 0 0 0 6px rgba(239,68,68,0.15); }
}

.order-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.order-id {
  font-size: 1.1rem;
  font-weight: 800;
  color: #fff;
}

.order-cashier {
  font-size: 0.78rem;
  background: rgba(255,255,255,0.1);
  padding: 2px 10px;
  border-radius: 999px;
  color: #94a3b8;
}

.order-timer {
  margin-left: auto;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}
.order-timer.timer-green { background: rgba(34,197,94,0.15); color: #4ade80; }
.order-timer.timer-yellow { background: rgba(250,204,21,0.15); color: #facc15; }
.order-timer.timer-red { background: rgba(239,68,68,0.15); color: #f87171; }

.order-items {
  list-style: none;
  padding: 0;
  margin: 0 0 14px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.order-items li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.04);
  border-radius: 8px;
}

.item-qty {
  background: #f97316;
  color: #fff;
  font-weight: 700;
  font-size: 0.78rem;
  padding: 1px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}
.ready-card .item-qty { background: #22c55e; }

.item-name {
  font-size: 0.9rem;
  color: #e2e8f0;
}

.btn-done, .btn-complete {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-done {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
}
.btn-done:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(34,197,94,0.4); }

.btn-complete {
  background: rgba(148,163,184,0.15);
  color: #94a3b8;
  border: 1px solid rgba(148,163,184,0.2);
}
.btn-complete:hover { background: rgba(148,163,184,0.25); color: #e2e8f0; }

.empty-state {
  text-align: center;
  color: #475569;
  padding: 40px 20px;
  font-size: 0.9rem;
}

/* Transition animations */
.order-card-enter-active, .order-card-leave-active { transition: all 0.4s ease; }
.order-card-enter-from { opacity: 0; transform: translateY(-20px) scale(0.95); }
.order-card-leave-to { opacity: 0; transform: translateX(30px) scale(0.95); }
</style>
