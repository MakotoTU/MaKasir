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
:root {
  --bg-light: #f8fafc;
  --color-primary: #facc15;
  --color-emerald: #22c55e;
  --color-danger: #ef4444;
  --color-accent: #fb923c;
  --border-thick: 3px solid #000;
  --radius-sm: 4px;
  --radius-md: 8px;
  --shadow-sm: 4px 4px 0px #000;
  --shadow-md: 6px 6px 0px #000;
  --shadow-lg: 8px 8px 0px #000;
}

.kitchen-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-light);
  color: black;
  overflow: hidden;
}

.kds-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: var(--border-thick);
}

.kds-brand h1 {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  color: black;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.kds-brand span {
  color: var(--color-danger);
}

.kds-status {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 800;
  border: var(--border-thick);
  box-shadow: 2px 2px 0px #000;
  text-transform: uppercase;
}

.ws-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid #000;
}

.ws-connected { background: var(--color-emerald); color: white; }
.ws-connected .ws-dot { background: #fff; }
.ws-connecting { background: var(--color-primary); color: black; }
.ws-connecting .ws-dot { background: #000; }
.ws-disconnected { background: var(--color-danger); color: white; }
.ws-disconnected .ws-dot { background: #fff; }

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
  border-radius: var(--radius-sm);
  font-weight: 800;
  font-size: 1rem;
  flex-shrink: 0;
  border: var(--border-thick);
  box-shadow: var(--shadow-sm);
  text-transform: uppercase;
}
.column-header.processing { background: var(--color-primary); color: black; }
.column-header.ready { background: var(--color-emerald); color: white; }

.count-badge {
  background: white;
  color: black;
  border: 2px solid #000;
  border-radius: var(--radius-sm);
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
  background: white;
  border: var(--border-thick);
  border-radius: var(--radius-md);
  padding: 16px;
  transition: transform 0.1s, box-shadow 0.1s;
  box-shadow: var(--shadow-md);
  position: relative;
}
.order-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-lg);
}

.order-card.timer-yellow { background: var(--color-primary); }
.order-card.timer-red { background: var(--color-danger); color: white; }
.ready-card { background: #f0fdf4; }

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
  color: inherit;
  font-family: 'JetBrains Mono', monospace;
}

.order-cashier {
  font-size: 0.78rem;
  background: white;
  border: 2px solid #000;
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  color: black;
  font-weight: 800;
  text-transform: uppercase;
}

.order-timer {
  margin-left: auto;
  font-size: 0.8rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  border: 2px solid #000;
  background: white;
  color: black;
  font-family: 'JetBrains Mono', monospace;
}
.order-timer.timer-green { background: var(--color-emerald); color: white; }
.order-timer.timer-yellow { background: var(--color-primary); color: black; }
.order-timer.timer-red { background: var(--color-danger); color: white; }

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
  background: white;
  border: 2px solid #000;
  border-radius: var(--radius-sm);
  color: black;
}

.item-qty {
  background: var(--color-accent);
  color: black;
  font-weight: 800;
  font-size: 0.78rem;
  padding: 1px 8px;
  border-radius: var(--radius-sm);
  border: 2px solid #000;
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
}
.ready-card .item-qty { background: var(--color-emerald); color: white; }

.item-name {
  font-size: 0.9rem;
  font-weight: 700;
}

.btn-done, .btn-complete {
  width: 100%;
  padding: 10px;
  border: var(--border-thick);
  border-radius: var(--radius-sm);
  font-weight: 800;
  font-size: 0.88rem;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
  box-shadow: var(--shadow-sm);
  text-transform: uppercase;
}

.btn-done {
  background: var(--color-emerald);
  color: white;
}
.btn-done:hover { transform: translate(-2px, -2px); box-shadow: var(--shadow-md); }
.btn-done:active { transform: translate(2px, 2px); box-shadow: none; }

.btn-complete {
  background: white;
  color: black;
}
.btn-complete:hover { background: #f1f5f9; transform: translate(-2px, -2px); box-shadow: var(--shadow-md); }
.btn-complete:active { transform: translate(2px, 2px); box-shadow: none; }

.empty-state {
  text-align: center;
  color: black;
  font-weight: 700;
  padding: 40px 20px;
  font-size: 0.9rem;
  border: 2px dashed #000;
  border-radius: var(--radius-md);
  margin-top: 20px;
}

/* Transition animations */
.order-card-enter-active, .order-card-leave-active { transition: all 0.2s ease; }
.order-card-enter-from { opacity: 0; transform: translateY(-20px); }
.order-card-leave-to { opacity: 0; transform: translateX(30px); }
</style>
