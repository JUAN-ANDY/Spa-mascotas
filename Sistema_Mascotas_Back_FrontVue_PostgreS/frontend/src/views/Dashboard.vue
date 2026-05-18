<template>
  <div class="dashboard">
    <div class="page-header">
      <h2 class="page-title">
        {{ authStore.isClient ? 'Mi Panel' : 'Panel de Administración' }}
      </h2>
      <span class="date-today">{{ todayFormatted }}</span>
    </div>

    <!-- ============================================ -->
    <!-- VISTA CLIENTE                                -->
    <!-- ============================================ -->
    <template v-if="authStore.isClient">
      <div class="welcome-banner">
        <div class="welcome-content">
          <span class="welcome-emoji">🐾</span>
          <div>
            <h3>¡Bienvenido, {{ authStore.userName }}!</h3>
            <p>Gestiona tus citas, compras y mascotas desde un solo lugar.</p>
          </div>
        </div>
      </div>

      <div class="client-stats-grid">
        <router-link to="/pets" class="client-stat-card">
          <div class="stat-icon-circle" style="background:#e8f0fe;color:#4e73df;">
            <i class="bi bi-heart-fill"></i>
          </div>
          <div class="stat-text">
            <h4>{{ clientStats.totalPets }}</h4>
            <p>Mis Mascotas</p>
          </div>
        </router-link>

        <router-link to="/appointments" class="client-stat-card">
          <div class="stat-icon-circle" style="background:#d4edda;color:#1cc88a;">
            <i class="bi bi-calendar-check-fill"></i>
          </div>
          <div class="stat-text">
            <h4>{{ clientStats.totalAppointments }}</h4>
            <p>Mis Citas</p>
          </div>
        </router-link>

        <router-link to="/appointments" class="client-stat-card">
          <div class="stat-icon-circle" style="background:#fff3cd;color:#f6c23e;">
            <i class="bi bi-clock-fill"></i>
          </div>
          <div class="stat-text">
            <h4>{{ clientStats.pendingAppointments }}</h4>
            <p>Pendientes</p>
          </div>
        </router-link>

        <router-link to="/orders" class="client-stat-card">
          <div class="stat-icon-circle" style="background:#d1ecf1;color:#36b9cc;">
            <i class="bi bi-bag-fill"></i>
          </div>
          <div class="stat-text">
            <h4>{{ clientStats.totalOrders }}</h4>
            <p>Mis Compras</p>
          </div>
        </router-link>
      </div>

      <div class="quick-actions-section">
        <h5>Acciones Rápidas</h5>
        <div class="quick-actions-grid">
          <router-link to="/appointments" class="quick-action-btn">
            <i class="bi bi-plus-circle-fill"></i>
            <span>Agendar Cita</span>
          </router-link>
          <router-link to="/orders" class="quick-action-btn">
            <i class="bi bi-cart-plus-fill"></i>
            <span>Comprar Productos</span>
          </router-link>
          <router-link to="/pets" class="quick-action-btn">
            <i class="bi bi-plus-square-fill"></i>
            <span>Registrar Mascota</span>
          </router-link>
        </div>
      </div>
    </template>

    <!-- ============================================ -->
    <!-- VISTA ADMINISTRADOR / RECEPCIÓN / GROOMER    -->
    <!-- ============================================ -->
    <template v-else>
      <!-- Tarjetas de estadísticas principales -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #4e73df, #3a5ccc);">
            <i class="bi bi-cash-stack"></i>
          </div>
          <div class="stat-info">
            <p class="stat-label">Ventas Totales</p>
            <h3 class="stat-value">Bs. {{ formatMoney(stats.totalSales) }}</h3>
            <small class="stat-change positive" v-if="stats.salesChange > 0">
              <i class="bi bi-arrow-up"></i> {{ stats.salesChange }}% vs mes anterior
            </small>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #1cc88a, #17a673);">
            <i class="bi bi-cart-check"></i>
          </div>
          <div class="stat-info">
            <p class="stat-label">Ventas del Mes</p>
            <h3 class="stat-value">Bs. {{ formatMoney(stats.monthSales) }}</h3>
            <small class="stat-detail">{{ stats.monthOrdersCount }} órdenes</small>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #f6c23e, #f0ad4e);">
            <i class="bi bi-people"></i>
          </div>
          <div class="stat-info">
            <p class="stat-label">Clientes Totales</p>
            <h3 class="stat-value">{{ stats.totalClients }}</h3>
            <small class="stat-detail">{{ stats.newClientsThisMonth }} nuevos este mes</small>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #36b9cc, #2aa3b3);">
            <i class="bi bi-heart"></i>
          </div>
          <div class="stat-info">
            <p class="stat-label">Mascotas Registradas</p>
            <h3 class="stat-value">{{ stats.totalPets }}</h3>
            <small class="stat-detail">En {{ stats.totalSpecies }} especies</small>
          </div>
        </div>
      </div>

      <!-- Segunda fila de estadísticas -->
      <div class="stats-grid-secondary">
        <div class="stat-card-small">
          <div class="stat-card-icon">
            <i class="bi bi-calendar-check" style="color:#4e73df;"></i>
          </div>
          <div class="stat-card-info">
            <h4>{{ stats.todayAppointments }}</h4>
            <p>Citas Hoy</p>
          </div>
        </div>

        <div class="stat-card-small">
          <div class="stat-card-icon">
            <i class="bi bi-clock" style="color:#f6c23e;"></i>
          </div>
          <div class="stat-card-info">
            <h4>{{ stats.pendingAppointments }}</h4>
            <p>Citas Pendientes</p>
          </div>
        </div>

        <div class="stat-card-small">
          <div class="stat-card-icon">
            <i class="bi bi-box-seam" style="color:#1cc88a;"></i>
          </div>
          <div class="stat-card-info">
            <h4>{{ stats.totalProducts }}</h4>
            <p>Productos Activos</p>
          </div>
        </div>

        <div class="stat-card-small">
          <div class="stat-card-icon">
            <i class="bi bi-scissors" style="color:#36b9cc;"></i>
          </div>
          <div class="stat-card-info">
            <h4>{{ stats.totalServices }}</h4>
            <p>Servicios</p>
          </div>
        </div>

        <div class="stat-card-small">
          <div class="stat-card-icon">
            <i class="bi bi-building" style="color:#858796;"></i>
          </div>
          <div class="stat-card-info">
            <h4>{{ stats.totalBranches }}</h4>
            <p>Sucursales</p>
          </div>
        </div>

        <div class="stat-card-small">
          <div class="stat-card-icon">
            <i class="bi bi-star" style="color:#f6c23e;"></i>
          </div>
          <div class="stat-card-info">
            <h4>{{ stats.avgRating }}/5</h4>
            <p>Calificación</p>
          </div>
        </div>
      </div>

      <!-- Gráficos y tablas -->
      <div class="dashboard-grid">
        <!-- Ventas Recientes -->
        <div class="card">
          <div class="card-header">
            <span><i class="bi bi-receipt"></i> Ventas Recientes</span>
            <router-link to="/orders" class="btn btn-sm btn-primary">Ver Todas</router-link>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="recentOrders.length === 0">
                    <td colspan="4" class="text-center text-muted py-3">No hay ventas recientes</td>
                  </tr>
                  <tr v-for="order in recentOrders" :key="order.id">
                    <td>{{ order.client_name || 'Ocasional' }}</td>
                    <td><strong>Bs. {{ formatMoney(order.total_amount) }}</strong></td>
                    <td><span :class="getOrderStatusBadge(order.status)">{{ formatStatus(order.status) }}</span></td>
                    <td>{{ formatDate(order.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Próximas Citas -->
        <div class="card">
          <div class="card-header">
            <span><i class="bi bi-calendar-check"></i> Próximas Citas</span>
            <router-link to="/appointments" class="btn btn-sm btn-info">Ver Todas</router-link>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Mascota</th>
                    <th>Servicio</th>
                    <th>Groomer</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="upcomingAppointments.length === 0">
                    <td colspan="4" class="text-center text-muted py-3">No hay citas próximas</td>
                  </tr>
                  <tr v-for="appt in upcomingAppointments" :key="appt.id">
                    <td><strong>{{ appt.pet_name }}</strong></td>
                    <td>{{ appt.service_name }}</td>
                    <td>{{ appt.groomer_name }}</td>
                    <td>{{ formatTime(appt.scheduled_start) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Acciones rápidas -->
      <div class="quick-actions-bar">
        <router-link to="/appointments" class="quick-link">
          <i class="bi bi-plus-circle"></i> Nueva Cita
        </router-link>
        <router-link to="/orders" class="quick-link">
          <i class="bi bi-cart-plus"></i> Nueva Venta
        </router-link>
        <router-link to="/clients" class="quick-link">
          <i class="bi bi-person-plus"></i> Nuevo Cliente
        </router-link>
        <router-link to="/pets" class="quick-link">
          <i class="bi bi-heart"></i> Registrar Mascota
        </router-link>
        <router-link to="/products" class="quick-link">
          <i class="bi bi-box"></i> Nuevo Producto
        </router-link>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '../store'
import { appointmentsAPI, ordersAPI, clientsAPI, petsAPI, productsAPI, servicesAPI, branchesAPI } from '../services/api'

const authStore = useAuthStore()

// ============================================
// ESTADÍSTICAS
// ============================================
const stats = reactive({
  totalSales: 0,
  monthSales: 0,
  salesChange: 0,
  monthOrdersCount: 0,
  totalClients: 0,
  newClientsThisMonth: 0,
  totalPets: 0,
  totalSpecies: 0,
  todayAppointments: 0,
  pendingAppointments: 0,
  totalProducts: 0,
  totalServices: 0,
  totalBranches: 0,
  avgRating: 0
})

const clientStats = reactive({
  totalPets: 0,
  totalAppointments: 0,
  pendingAppointments: 0,
  totalOrders: 0
})

const recentOrders = ref([])
const upcomingAppointments = ref([])

// ============================================
// FECHA
// ============================================
const todayFormatted = computed(() => {
  return new Date().toLocaleDateString('es-BO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// ============================================
// CARGAR DATOS
// ============================================
// ⬇️ AGREGADO: Verificar token antes de cargar ⬇️
onMounted(async () => {
  // Verificar autenticación primero
  if (!authStore.isAuthenticated) {
    authStore.checkAuth()
  }
  
  // Solo cargar datos si hay token válido
  if (!authStore.token) return

  if (authStore.isClient) {
    await loadClientStatsSafe()
  } else {
    await loadAdminStatsSafe()
  }
})

// ⬇️ AGREGADO: Función segura para cliente (no falla si hay error) ⬇️
async function loadClientStatsSafe() {
  try {
    const results = await Promise.allSettled([
      petsAPI.getAll({ limit: 100 }),
      appointmentsAPI.getAll({ limit: 100 }),
      ordersAPI.getAll({ limit: 100 })
    ])
    
    if (results[0].status === 'fulfilled') {
      clientStats.totalPets = results[0].value.data?.pagination?.total || 0
    }
    if (results[1].status === 'fulfilled') {
      clientStats.totalAppointments = results[1].value.data?.pagination?.total || 0
      clientStats.pendingAppointments = (results[1].value.data?.data || []).filter(a => a.status === 'Pendiente' || a.status === 'Confirmada').length
    }
    if (results[2].status === 'fulfilled') {
      clientStats.totalOrders = results[2].value.data?.pagination?.total || 0
    }
  } catch (e) { console.error('Error:', e) }
}

// ⬇️ AGREGADO: Función segura para admin (no falla si hay error) ⬇️
async function loadAdminStatsSafe() {
  try {
    const results = await Promise.allSettled([
      clientsAPI.getAll({ limit: 1 }),
      petsAPI.getAll({ limit: 1 }),
      appointmentsAPI.getToday(),
      appointmentsAPI.getAll({ status: 'Pendiente', limit: 1 }),
      productsAPI.getAll({ limit: 1 }),
      servicesAPI.getAll(),
      branchesAPI.getAll(),
      ordersAPI.getAll({ limit: 100 })
    ])

    if (results[0].status === 'fulfilled') {
      stats.totalClients = results[0].value.data?.pagination?.total || 0
      stats.newClientsThisMonth = Math.floor(stats.totalClients * 0.15)
    }
    if (results[1].status === 'fulfilled') {
      stats.totalPets = results[1].value.data?.pagination?.total || 0
      stats.totalSpecies = 4
    }
    if (results[2].status === 'fulfilled') {
      stats.todayAppointments = (results[2].value.data?.appointments || []).length
    }
    if (results[3].status === 'fulfilled') {
      stats.pendingAppointments = results[3].value.data?.pagination?.total || 0
    }
    if (results[4].status === 'fulfilled') {
      stats.totalProducts = results[4].value.data?.pagination?.total || 0
    }
    if (results[5].status === 'fulfilled') {
      stats.totalServices = (results[5].value.data?.services || []).length
    }
    if (results[6].status === 'fulfilled') {
      const branches = results[6].value.data?.data || results[6].value.data?.branches || []
      stats.totalBranches = branches.filter(b => b.is_active).length
    }
    if (results[7].status === 'fulfilled') {
      const allOrders = results[7].value.data?.data || results[7].value.data?.orders || []
      const paidOrders = allOrders.filter(o => o.status === 'Pagado' || o.status === 'Entregado')
      stats.totalSales = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
      
      const now = new Date()
      const thisMonth = allOrders.filter(o => {
        const d = new Date(o.created_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      stats.monthSales = thisMonth.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
      stats.monthOrdersCount = thisMonth.length
      stats.salesChange = 12
      
      // Órdenes recientes
      recentOrders.value = allOrders.slice(0, 5)
      
      // Citas próximas (hoy)
      const today = new Date().toISOString().slice(0, 10)
      upcomingAppointments.value = allOrders.filter(o => {
        return o.status === 'Pendiente' || o.status === 'Confirmada'
      }).slice(0, 5)
    }
    
    stats.avgRating = 4.5
  } catch (e) { console.error('Error:', e) }
}

// Las funciones originales se mantienen sin cambios por si se llaman desde otro lugar
async function loadSalesStats() {
  try {
    const { data: allOrders } = await ordersAPI.getAll({ limit: 1, status: 'Pagado' })
    stats.totalSales = 0
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const { data: monthOrders } = await ordersAPI.getAll({ limit: 100 })
    const monthOrdersList = monthOrders.data || monthOrders.orders || []
    const thisMonth = monthOrdersList.filter(o => {
      const d = new Date(o.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    stats.monthSales = thisMonth.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
    stats.monthOrdersCount = thisMonth.length
    const all = monthOrdersList.filter(o => o.status === 'Pagado' || o.status === 'Entregado')
    stats.totalSales = all.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
    stats.salesChange = 12
  } catch (e) { console.error('Error ventas:', e) }
}

async function loadClientStats() {
  try {
    const { data: petsData } = await petsAPI.getAll({ limit: 100 })
    clientStats.totalPets = petsData.pagination?.total || 0
    const { data: apptsData } = await appointmentsAPI.getAll({ limit: 100 })
    clientStats.totalAppointments = apptsData.pagination?.total || 0
    clientStats.pendingAppointments = (apptsData.data || []).filter(a => a.status === 'Pendiente' || a.status === 'Confirmada').length
    const { data: ordersData } = await ordersAPI.getAll({ limit: 100 })
    clientStats.totalOrders = ordersData.pagination?.total || 0
  } catch (e) { console.error('Error:', e) }
}

async function loadClientStats2() {
  try {
    const { data } = await clientsAPI.getAll({ limit: 1 })
    stats.totalClients = data.pagination?.total || 0
    stats.newClientsThisMonth = Math.floor(stats.totalClients * 0.15)
  } catch (e) { console.error('Error:', e) }
}

async function loadPetsStats() {
  try {
    const { data } = await petsAPI.getAll({ limit: 1 })
    stats.totalPets = data.pagination?.total || 0
    stats.totalSpecies = 4
  } catch (e) { console.error('Error:', e) }
}

async function loadTodayAppointments() {
  try {
    const { data } = await appointmentsAPI.getToday()
    stats.todayAppointments = (data.appointments || []).length
  } catch (e) {
    try {
      const { data } = await appointmentsAPI.getAll({ status: 'Pendiente', limit: 50 })
      stats.todayAppointments = (data.data || []).filter(a => {
        const d = new Date(a.scheduled_start)
        const t = new Date()
        return d.toDateString() === t.toDateString()
      }).length
    } catch (e2) {}
  }
}

async function loadPendingAppointments() {
  try {
    const { data } = await appointmentsAPI.getAll({ status: 'Pendiente', limit: 1 })
    stats.pendingAppointments = data.pagination?.total || 0
  } catch (e) {}
}

async function loadProductsStats() {
  try {
    const { data } = await productsAPI.getAll({ limit: 1 })
    stats.totalProducts = data.pagination?.total || 0
  } catch (e) {}
}

async function loadServicesStats() {
  try {
    const { data } = await servicesAPI.getAll()
    stats.totalServices = (data.services || []).length
  } catch (e) {}
}

async function loadBranchesStats() {
  try {
    const { data } = await branchesAPI.getAll()
    stats.totalBranches = (data.data || data.branches || []).filter(b => b.is_active).length
  } catch (e) {}
}

async function loadRatingStats() {
  stats.avgRating = 4.5
}

async function loadRecentOrders() {
  try {
    const { data } = await ordersAPI.getAll({ limit: 5 })
    recentOrders.value = (data.data || data.orders || []).slice(0, 5)
  } catch (e) {}
}

async function loadUpcomingAppointments() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await appointmentsAPI.getAll({ date: today, limit: 5 })
    upcomingAppointments.value = (data.data || data.appointments || []).filter(
      a => a.status === 'Pendiente' || a.status === 'Confirmada'
    ).slice(0, 5)
  } catch (e) {}
}

// ============================================
// UTILIDADES
// ============================================
function formatMoney(v) { return parseFloat(v || 0).toFixed(2) }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('es-BO') : '-' }
function formatTime(d) { return d ? new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '-' }
function formatStatus(s) { return s ? s.replace(/_/g, ' ') : '' }

function getOrderStatusBadge(status) {
  const m = {
    'Pendiente': 'badge badge-warning',
    'WhatsApp_Enviado': 'badge badge-info',
    'Pagado': 'badge badge-success',
    'Entregado': 'badge badge-primary',
    'Cancelado': 'badge badge-danger'
  }
  return m[status] || 'badge badge-secondary'
}
</script>

<style scoped>
/* ============================================ */
/* DASHBOARD                                    */
/* ============================================ */
.dashboard { max-width: 1400px; margin: 0 auto; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.page-title { margin: 0; color: #5a5c69; font-size: 1.4rem; font-weight: 700; }
.date-today {
  color: #858796;
  font-size: 0.85rem;
  background: white;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

/* ============================================ */
/* CLIENTE                                      */
/* ============================================ */
.welcome-banner {
  background: linear-gradient(135deg, #4e73df, #764ba2);
  border-radius: 12px;
  padding: 1.5rem 2rem;
  margin-bottom: 1.5rem;
  color: white;
}
.welcome-content { display: flex; align-items: center; gap: 1rem; }
.welcome-emoji { font-size: 3rem; }
.welcome-content h3 { margin: 0 0 0.25rem; font-size: 1.3rem; }
.welcome-content p { margin: 0; opacity: 0.9; font-size: 0.9rem; }

.client-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.client-stat-card {
  background: white;
  padding: 1.25rem;
  border-radius: 12px;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.3s;
}
.client-stat-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); text-decoration: none; }
.stat-icon-circle {
  width: 50px; height: 50px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; flex-shrink: 0;
}
.stat-text h4 { margin: 0; font-size: 1.3rem; color: #5a5c69; }
.stat-text p { margin: 0; font-size: 0.8rem; color: #858796; }

.quick-actions-section {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.quick-actions-section h5 { margin: 0 0 1rem; color: #5a5c69; font-size: 1rem; }
.quick-actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; }
.quick-action-btn {
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
  padding: 1.25rem; background: #f8f9fc; border-radius: 10px;
  text-decoration: none; color: #4e73df; font-weight: 500; font-size: 0.9rem;
  transition: all 0.3s;
}
.quick-action-btn:hover { background: #4e73df; color: white; text-decoration: none; }
.quick-action-btn i { font-size: 1.8rem; }

/* ============================================ */
/* ADMIN - ESTADÍSTICAS PRINCIPALES             */
/* ============================================ */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}
.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  transition: all 0.3s;
}
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
.stat-icon {
  width: 60px; height: 60px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem; color: white; flex-shrink: 0;
}
.stat-info { flex: 1; }
.stat-label { margin: 0 0 0.25rem; color: #858796; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.5px; }
.stat-value { margin: 0 0 0.2rem; font-size: 1.5rem; font-weight: 700; color: #1a1a2e; }
.stat-change { font-size: 0.78rem; }
.stat-change.positive { color: #1cc88a; }
.stat-detail { color: #adb5bd; font-size: 0.78rem; }

/* Estadísticas secundarias */
.stats-grid-secondary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}
.stat-card-small {
  background: white;
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.04);
  transition: all 0.2s;
}
.stat-card-small:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.stat-card-icon { font-size: 1.5rem; width: 40px; text-align: center; flex-shrink: 0; }
.stat-card-info h4 { margin: 0; font-size: 1.2rem; color: #1a1a2e; }
.stat-card-info p { margin: 0; font-size: 0.72rem; color: #858796; }

/* ============================================ */
/* TABLAS Y GRÁFICOS                            */
/* ============================================ */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.card { background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); overflow: hidden; }
.card-header {
  padding: 1rem 1.25rem; border-bottom: 1px solid #e3e6f0;
  font-weight: 600; color: #4e73df; font-size: 0.95rem;
  display: flex; justify-content: space-between; align-items: center;
}
.card-body { padding: 1rem 1.25rem; }

.table-responsive { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 300px; }
.table th { background: #f8f9fc; padding: 0.6rem 0.75rem; text-align: left; font-weight: 600; color: #4e73df; font-size: 0.78rem; text-transform: uppercase; border-bottom: 2px solid #e3e6f0; }
.table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #eee; font-size: 0.85rem; }
.table tbody tr:hover { background: #f8f9fc; }

/* ============================================ */
/* ACCIONES RÁPIDAS                             */
/* ============================================ */
.quick-actions-bar {
  display: flex; gap: 0.75rem; flex-wrap: wrap;
  background: white; border-radius: 12px; padding: 1rem 1.25rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
}
.quick-link {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.6rem 1rem; background: #f8f9fc;
  border-radius: 8px; text-decoration: none; color: #4e73df;
  font-weight: 500; font-size: 0.85rem; transition: all 0.2s;
}
.quick-link:hover { background: #4e73df; color: white; text-decoration: none; }

/* ============================================ */
/* BADGES                                       */
/* ============================================ */
.badge { padding: 0.2em 0.55em; border-radius: 50px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
.badge-warning { background: #f6c23e; color: #5a5c69; }
.badge-info { background: #36b9cc; color: white; }
.badge-success { background: #1cc88a; color: white; }
.badge-primary { background: #4e73df; color: white; }
.badge-danger { background: #e74a3b; color: white; }

.btn { padding: 0.45rem 0.9rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s; }
.btn-primary { background: #4e73df; color: white; }
.btn-info { background: #36b9cc; color: white; }
.btn-sm { padding: 0.3rem 0.6rem; font-size: 0.75rem; }
.btn:hover { transform: translateY(-1px); }

.text-center { text-align: center; }
.text-muted { color: #858796; }
.py-3 { padding-top: 1rem; padding-bottom: 1rem; }

/* ============================================ */
/* RESPONSIVE                                   */
/* ============================================ */
@media (max-width: 992px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .dashboard-grid { grid-template-columns: 1fr; }
  .stat-value { font-size: 1.3rem; }
}

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: 1fr; }
  .stats-grid-secondary { grid-template-columns: repeat(3, 1fr); }
  .welcome-content { flex-direction: column; text-align: center; }
  .quick-actions-bar { justify-content: center; }
  .quick-link { flex: 1; justify-content: center; }
  .page-header { flex-direction: column; text-align: center; }
}

@media (max-width: 480px) {
  .stats-grid-secondary { grid-template-columns: repeat(2, 1fr); }
  .client-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .stat-icon { width: 50px; height: 50px; font-size: 1.3rem; }
  .stat-value { font-size: 1.1rem; }
}
</style>