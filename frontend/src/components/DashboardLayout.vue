<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const auth = useAuthStore()

const handleLogout = () => {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="dashboard-container">
    <aside class="sidebar glass">
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
        <router-link v-if="auth.user?.role === 'admin'" to="/orders" class="nav-item">
          <span class="icon">🧾</span> Semua Pesanan
        </router-link>
        
        <!-- Menu Bersama -->
        <router-link v-if="auth.user?.role === 'cashier'" to="/orders" class="nav-item">
          <span class="icon">🧾</span> Riwayat Pesanan
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
      </header>
      <div class="content-wrapper">
        <!-- Render current view here -->
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--bg-light);
}

.sidebar {
  width: 260px;
  background: var(--bg-sidebar);
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  transition: all 0.3s ease;
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.glass {
  /* Opsi glassmorphism */
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(10px);
}

.sidebar-header {
  padding: 0 20px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.brand {
  font-size: 1.5rem;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 15px;
  letter-spacing: 1px;
}

.text-emerald {
  color: var(--color-emerald);
}

.user-info {
  background: rgba(255, 255, 255, 0.05);
  padding: 10px 15px;
  border-radius: var(--radius-md);
}

.role {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-emerald);
  font-weight: 700;
  margin-bottom: 3px;
}

.username {
  font-size: 0.9rem;
  font-weight: 500;
  color: #e2e8f0;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 20px 15px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  color: #cbd5e1;
  text-decoration: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transform: translateX(4px);
}

.nav-item.router-link-active {
  background: var(--color-emerald);
  color: #fff;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.sidebar-footer {
  padding: 20px 15px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-logout {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-logout:hover {
  background: #ef4444;
  color: #fff;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.topbar {
  background: #fff;
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
  z-index: 5;
}

.topbar h1 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.content-wrapper {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  background-color: var(--bg-light);
}
</style>
