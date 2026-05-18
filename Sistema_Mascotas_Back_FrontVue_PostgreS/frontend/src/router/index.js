import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/branches',
    name: 'Branches',
    component: () => import('../views/Branches.vue'),
    meta: { requiresAuth: true, roles: ['Administrador'] }
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('../views/Users.vue'),
    meta: { requiresAuth: true, roles: ['Administrador'] }
  },
  {
    path: '/clients',
    name: 'Clients',
    component: () => import('../views/Clients.vue'),
    meta: { requiresAuth: true, roles: ['Administrador', 'Recepcion'] }
  },
  {
    path: '/pets',
    name: 'Pets',
    component: () => import('../views/Pets.vue'),
    // ⬇️ AGREGADO 'Cliente' para que pueda ver sus mascotas
    meta: { requiresAuth: true, roles: ['Administrador', 'Recepcion', 'Groomer', 'Cliente'] }
  },
  {
    path: '/products',
    name: 'Products',
    component: () => import('../views/Products.vue'),
    meta: { requiresAuth: true, roles: ['Administrador', 'Recepcion'] }
  },
  {
    path: '/services',
    name: 'Services',
    component: () => import('../views/Services.vue'),
    meta: { requiresAuth: true, roles: ['Administrador'] }
  },
  {
    path: '/appointments',
    name: 'Appointments',
    component: () => import('../views/Appointments.vue'),
    // ⬇️ AGREGADO 'Cliente' para que pueda ver sus citas
    meta: { requiresAuth: true, roles: ['Administrador', 'Recepcion', 'Groomer', 'Cliente'] }
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('../views/Orders.vue'),
    // ⬇️ CORREGIDO: Cliente, Groomer, Recepcion y Admin pueden acceder a Ventas
    meta: { requiresAuth: true, roles: ['Administrador', 'Recepcion', 'Groomer', 'Cliente'] }
  },
  {
    path: '/grooming',
    name: 'Grooming',
    component: () => import('../views/Grooming.vue'),
    meta: { requiresAuth: true, roles: ['Administrador', 'Groomer'] }
  },
  // ⬇️⬇️⬇️ NUEVA RUTA: AUDITORÍA (SOLO ADMIN) ⬇️⬇️⬇️
  {
    path: '/auditoria',
    name: 'Auditoria',
    component: () => import('../views/Auditoria.vue'),
    meta: { requiresAuth: true, roles: ['Administrador'] }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Guard de navegación
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  // ⬇️ AGREGADO: Verificar autenticación antes de evaluar rutas ⬇️
  if (!authStore.isAuthenticated) {
    authStore.checkAuth()
  }
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.guest && authStore.isAuthenticated) {
    next('/')
  } else if (to.meta.roles && !to.meta.roles.includes(authStore.userRole)) {
    next('/')
  } else {
    next()
  }
})

export default router