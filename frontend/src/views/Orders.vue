<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatRupiah } from '../utils/currency'
import { apiFetch } from '../utils/api'
import type { Order } from '../types'

const orders = ref<Order[]>([])
const isLoadingData = ref(false)

const summaryDate = ref(new Date().toISOString().split('T')[0])
const summaryData = ref<any>(null)
const isSummaryOpen = ref(false)
const isLoadingSummary = ref(false)
const isSendingCsv = ref(false)

const fetchOrders = async () => {
  isLoadingData.value = true
  try {
    const res = await apiFetch('/api/orders')
    if (!res.ok) throw new Error('Failed to fetch orders')
    orders.value = await res.json()
  } catch (err) {
    console.error(err)
    alert('Gagal memuat riwayat transaksi')
  } finally {
    isLoadingData.value = false
  }
}

const fetchSummary = async () => {
  if (!summaryDate.value) return alert('Pilih tanggal dulu')
  isLoadingSummary.value = true
  try {
    const res = await apiFetch(`/api/orders/summary?date=${summaryDate.value}`)
    if (!res.ok) throw new Error('Failed to fetch summary')
    summaryData.value = await res.json()
    isSummaryOpen.value = true
  } catch (err) {
    console.error(err)
    alert('Gagal memuat rekap penjualan')
  } finally {
    isLoadingSummary.value = false
  }
}

const sendCsvToWA = async () => {
  if (!summaryDate.value) return alert('Pilih tanggal dulu')
  isSendingCsv.value = true
  try {
    const res = await apiFetch('/api/orders/summary/send-wa', {
      method: 'POST',
      body: JSON.stringify({ date: summaryDate.value })
    })
    
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Gagal mengirim CSV ke WA')
    }
    
    alert('Rekap CSV berhasil dikirim ke WhatsApp kasir!')
  } catch (err: any) {
    console.error(err)
    alert(err.message || 'Terjadi kesalahan saat mengirim pesan WA')
  } finally {
    isSendingCsv.value = false
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <div class="orders-page">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2>Riwayat Transaksi</h2>
      <div style="display: flex; gap: 10px; align-items: center;">
        <input type="date" v-model="summaryDate" class="input" style="width:auto; padding:8px;" />
        <button class="btn btn-primary" @click="fetchSummary" :disabled="isLoadingSummary">
          {{ isLoadingSummary ? 'Memuat...' : 'Rekap Penjualan' }}
        </button>
      </div>
    </div>

    <!-- Summary Modal/Card -->
    <div v-if="isSummaryOpen" class="card" style="margin-bottom: 20px; border: 2px solid #000;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 15px; align-items: center;">
        <h3>Rekap: {{ summaryDate }}</h3>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary" @click="sendCsvToWA" :disabled="isSendingCsv" style="padding: 4px 10px;">
            {{ isSendingCsv ? 'Mengirim...' : 'Kirim CSV ke WA' }}
          </button>
          <button class="btn btn-danger" @click="isSummaryOpen = false" style="padding: 4px 10px;">X</button>
        </div>
      </div>
      
      <div v-if="summaryData" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
        <div class="card" style="background: #e6f7ff;">
          <strong>Total Order</strong><br>
          <span style="font-size: 1.5rem; font-weight: bold;">{{ summaryData.totalOrders }}</span>
        </div>
        <div class="card" style="background: #f6ffed;">
          <strong>Total Pendapatan</strong><br>
          <span style="font-size: 1.5rem; font-weight: bold;">{{ formatRupiah(summaryData.totalRevenue) }}</span>
        </div>
        <div class="card" style="background: #fff0f6;">
          <strong>Cash</strong><br>
          <span style="font-size: 1.2rem;">{{ formatRupiah(summaryData.cashTotal) }}</span>
        </div>
        <div class="card" style="background: #f0f5ff;">
          <strong>QRIS</strong><br>
          <span style="font-size: 1.2rem;">{{ formatRupiah(summaryData.qrisTotal) }}</span>
        </div>
      </div>

      <div v-if="summaryData && summaryData.products.length > 0">
        <h4>Barang Terjual</h4>
        <table class="table">
          <thead>
            <tr>
              <th>Nama Barang</th>
              <th>Qty</th>
              <th>Pendapatan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in summaryData.products" :key="item.name">
              <td>{{ item.name }}</td>
              <td>{{ item.qty }}</td>
              <td>{{ formatRupiah(item.revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="summaryData && summaryData.products.length === 0">
        <p>Tidak ada barang terjual pada tanggal ini.</p>
      </div>
    </div>

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
              <span class="status-pill" :class="o.status === 'completed' || o.status === 'selesai' ? 'status-success' : 'status-pending'">
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
.status-success { background: #b7eb8f; padding: 4px 8px; border-radius: 4px; border: 1px solid #389e0d; }
.status-pending { background: #ffe58f; padding: 4px 8px; border-radius: 4px; border: 1px solid #d4b106; }
</style>
