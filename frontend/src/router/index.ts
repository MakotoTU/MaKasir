import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import DashboardLayout from '../components/DashboardLayout.vue'
import POS from '../views/POS.vue'
import Orders from '../views/Orders.vue'
import AdminProducts from '../views/Admin/Products.vue'
import AdminUsers from '../views/Admin/Users.vue'
import AdminWhatsApp from '../views/Admin/WhatsAppStatus.vue'
import { useAuthStore } from '../store/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/',
      component: DashboardLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: () => {
            const auth = useAuthStore()
            if (auth.user?.role === 'admin') {
              return '/admin/products'
            }
            return '/pos'
          }
        },
        {
          path: 'pos',
          name: 'pos',
          component: POS
        },
        {
          path: 'orders',
          name: 'orders',
          component: Orders
        },
        {
          path: 'admin/products',
          name: 'admin-products',
          component: AdminProducts,
          meta: { requiresAdmin: true }
        },
        {
          path: 'admin/users',
          name: 'admin-users',
          component: AdminUsers,
          meta: { requiresAdmin: true }
        },
        {
          path: 'admin/whatsapp',
          name: 'admin-whatsapp',
          component: AdminWhatsApp,
          meta: { requiresAdmin: true }
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const loggedIn = auth.user !== null

  if (to.meta.requiresAuth && !loggedIn) {
    next('/login')
  } else if (to.meta.requiresAdmin && auth.user?.role !== 'admin') {
    next('/') // redirect back to default dashboard view
  } else {
    next()
  }
})

export default router
