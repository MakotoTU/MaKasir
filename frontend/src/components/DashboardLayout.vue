<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import NetworkStatus from './NetworkStatus.vue';
import { initOfflineSync, cacheProducts } from '../services/sync.service';

const router = useRouter()
const auth = useAuthStore()

const handleLogout = () => {
  auth.logout()
  router.push('/login')
}

onMounted(() => {
  initOfflineSync();
  cacheProducts();
});
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2 class="brand">Ma<span class="text-emerald">Kasir</span></h2>
        <div class="user-info">
          <p class="role">{{ auth.user?.role === 'admin' ? 'Administrator' : 'Kasir' }}</p>
          <p class="username">@{{ auth.user?.username }}</p>
        </div>
      </div>

      <nav class="sidebar-nav">
        <!-- Menu Kasir -->
        <router-link v-if="auth.user?.role === 'cashier' || auth.user?.role === 'admin'" to="/pos" class="nav-item">
          <span class="icon">🛒</span> Point of Sale
        </router-link>
        
        <!-- Menu Admin -->
        <router-link v-if="auth.user?.role === 'admin'" to="/admin/products" class="nav-item">
          <span class="icon">📦</span> Manajemen Produk
        </router-link>
        <router-link v-if="auth.user?.role === 'admin'" to="/admin/users" class="nav-item">
          <span class="icon">👥</span> Manajemen Akun
        </router-link>
        <router-link v-if="auth.user?.role === 'admin'" to="/admin/whatsapp" class="nav-item">
          <span class="icon">💬</span> Status WhatsApp
        </router-link>
        <router-link v-if="auth.user?.role === 'admin'" to="/orders" class="nav-item">
          <span class="icon">🧾</span> Semua Pesanan
        </router-link>
        
        <!-- Menu Bersama -->
        <router-link v-if="auth.user?.role === 'cashier'" to="/orders" class="nav-item">
          <span class="icon">🧾</span> Riwayat Pesanan
        </router-link>
        <router-link to="/kitchen" class="nav-item">
          <span class="icon">🍳</span> Tampilan Dapur
        </router-link>
        <router-link to="/expenses" class="nav-item">
          <span class="icon">💸</span> Pengeluaran
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <button @click="handleLogout" class="btn-logout">
          <span class="icon">🚪</span> Keluar
        </button>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="topbar-left">
          <h1>Selamat Datang, {{ auth.user?.username }}!</h1>
        </div>
        <div class="topbar-right">
          <NetworkStatus />
        </div>
      </header>
      <div class="content-wrapper">
        <!-- Render current view here -->
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--bg-light);
}

.sidebar {
  width: 260px;
  flex-shrink: 0;
  background-color: var(--bg-sidebar);
  color: #000;
  display: flex;
  flex-direction: column;
  border-right: var(--border-thick);
  z-index: 10;
}

.sidebar-header {
  padding: 20px;
  border-bottom: var(--border-thick);
}

.brand {
  font-size: 1.5rem;
  font-weight: 800;
  color: #000;
  margin-bottom: 15px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.text-emerald {
  color: var(--color-danger);
}

.user-info {
  background: white;
  padding: 10px 15px;
  border-radius: var(--radius-sm);
  border: var(--border-thick);
  box-shadow: var(--shadow-sm);
}

.role {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-danger);
  font-weight: 800;
  margin-bottom: 3px;
}

.username {
  font-size: 0.9rem;
  font-weight: 800;
  color: #000;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 15px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  color: #000;
  text-decoration: none;
  border-radius: var(--radius-sm);
  font-weight: 700;
  border: var(--border-thick);
  background: white;
  transition: transform 0.1s, box-shadow 0.1s;
  box-shadow: var(--shadow-sm);
}

.nav-item:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-md);
  background: var(--color-primary);
}

.nav-item.router-link-active {
  background: var(--color-accent);
  box-shadow: var(--shadow-sm);
}

.sidebar-footer {
  padding: 20px 15px 20px;
  border-top: var(--border-thick);
  background: var(--bg-sidebar);
}

.btn-logout {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  background: var(--color-danger);
  color: #fff;
  border: var(--border-thick);
  border-radius: var(--radius-sm);
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
  box-shadow: var(--shadow-sm);
  text-transform: uppercase;
}

.btn-logout:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px #000;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.topbar {
  background: white;
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: var(--border-thick);
  z-index: 5;
}

.topbar h1 {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
  text-transform: uppercase;
}

.content-wrapper {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  background-color: var(--bg-light);
}
</style>
