<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatRupiah } from '../utils/currency'
import type { Order } from '../types'

const orders = ref<Order[]>([])
const isLoadingData = ref(false)

const fetchOrders = async () => {
  isLoadingData.value = true
  try {
    const res = await fetch('/api/orders')
    if (!res.ok) throw new Error('Failed to fetch orders')
    orders.value = await res.json()
  } catch (err) {
    console.error(err)
    alert('Gagal memuat riwayat transaksi')
  } finally {
    isLoadingData.value = false
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <div class="orders-page">
    <h2>Riwayat Transaksi</h2>
    <div style="overflow-x:auto;">
      <table class="table card">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Kasir</th>
            <th>Total</th>
            <th>Status</th>
            <th>Status WA</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoadingData">
            <td colspan="5" style="text-align: center; padding: 1rem;">Memuat data...</td>
          </tr>
          <tr v-else-if="orders.length === 0">
            <td colspan="5" style="text-align: center; padding: 1rem;">Belum ada transaksi.</td>
          </tr>
          <tr v-else v-for="o in orders" :key="o.id">
            <td>{{ new Date(o.createdAt).toLocaleString() }}</td>
            <td>{{ o.cashier?.username || 'Unknown' }}</td>
            <td>{{ formatRupiah(o.totalPrice) }}</td>
            <td>
              <span class="status-pill" :class="o.status === 'completed' ? 'status-success' : 'status-pending'">
                {{ o.status }}
              </span>
            </td>
            <td>
              <span :class="o.whatsappStatus">{{ o.whatsappStatus }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.table { width: 100%; border-collapse: collapse; margin-top: 20px; }
.table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
.table th { background-color: #f2f2f2; }
.sent { color: green; font-weight: bold; }
.failed { color: red; font-weight: bold; }
.pending { color: orange; }
</style>
