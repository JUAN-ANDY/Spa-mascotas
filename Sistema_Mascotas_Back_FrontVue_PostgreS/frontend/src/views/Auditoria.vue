<template>
  <div class="auditoria-page">
    <div class="page-header">
      <h2 class="page-title">
        <i class="bi bi-journal-check"></i> Auditoría del Sistema
      </h2>
    </div>

    <!-- Tarjetas de estadísticas -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #4e73df, #3a5ccc);">
          <i class="bi bi-list-ul"></i>
        </div>
        <div class="stat-info">
          <p class="stat-label">Total Registros</p>
          <h3 class="stat-value">{{ stats.total_registros || 0 }}</h3>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #1cc88a, #17a673);">
          <i class="bi bi-calendar-check"></i>
        </div>
        <div class="stat-info">
          <p class="stat-label">Acciones Hoy</p>
          <h3 class="stat-value">{{ stats.acciones_hoy || 0 }}</h3>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f6c23e, #f0ad4e);">
          <i class="bi bi-people"></i>
        </div>
        <div class="stat-info">
          <p class="stat-label">Usuarios Activos</p>
          <h3 class="stat-value">{{ stats.total_usuarios || 0 }}</h3>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #36b9cc, #2aa3b3);">
          <i class="bi bi-folder"></i>
        </div>
        <div class="stat-info">
          <p class="stat-label">Módulos</p>
          <h3 class="stat-value">{{ stats.total_modulos || 0 }}</h3>
        </div>
      </div>
    </div>

    <!-- Top usuarios -->
    <div class="card mb-3" v-if="topUsuarios.length > 0">
      <div class="card-header">
        <i class="bi bi-trophy"></i> Usuarios Más Activos
      </div>
      <div class="card-body">
        <div class="top-users-grid">
          <div v-for="(user, index) in topUsuarios" :key="index" class="top-user-item">
            <span class="top-user-rank">#{{ index + 1 }}</span>
            <span class="top-user-name">{{ user.nombre }}</span>
            <span class="top-user-email">{{ user.email }}</span>
            <span class="badge badge-primary">{{ user.total }} acciones</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card mb-3">
      <div class="card-body">
        <div class="row">
          <div class="col-3">
            <label class="form-label-sm">Módulo</label>
            <select v-model="filterModulo" class="form-select" @change="loadAuditoria">
              <option value="">Todos los módulos</option>
              <option v-for="mod in modulos" :key="mod" :value="mod">{{ mod }}</option>
            </select>
          </div>
          <div class="col-2">
            <label class="form-label-sm">Acción</label>
            <select v-model="filterAccion" class="form-select" @change="loadAuditoria">
              <option value="">Todas</option>
              <option value="CREAR">CREAR</option>
              <option value="ACTUALIZAR">ACTUALIZAR</option>
              <option value="ELIMINAR">ELIMINAR</option>
            </select>
          </div>
          <div class="col-3">
            <label class="form-label-sm">Fecha Desde</label>
            <input v-model="filterFechaDesde" type="date" class="form-control" @change="loadAuditoria">
          </div>
          <div class="col-2">
            <label class="form-label-sm">Fecha Hasta</label>
            <input v-model="filterFechaHasta" type="date" class="form-control" @change="loadAuditoria">
          </div>
          <div class="col-2">
            <label class="form-label-sm">Buscar</label>
            <input v-model="search" class="form-control" placeholder="Buscar..." @input="debounceSearch">
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de auditoría -->
    <div class="card">
      <div class="card-header">
        Registros de Auditoría
        <span class="badge badge-primary">{{ total }} registros</span>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Usuario</th>
                <th>Módulo</th>
                <th>Acción</th>
                <th>IP</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="text-center py-4">
                  <Loading />
                </td>
              </tr>
              <tr v-else-if="registros.length === 0">
                <td colspan="6" class="text-center py-4 text-muted">
                  No se encontraron registros de auditoría
                </td>
              </tr>
              <tr v-for="reg in registros" :key="reg.id">
                <td>{{ formatDateTime(reg.fecha_hora) }}</td>
                <td>
                  <span v-if="reg.usuario_nombre">{{ reg.usuario_nombre }}</span>
                  <span v-else class="text-muted">Sistema / Anónimo</span>
                  <br>
                  <small class="text-muted" v-if="reg.usuario_rol">{{ reg.usuario_rol }}</small>
                </td>
                <td>
                  <span class="badge badge-info">{{ reg.modulo }}</span>
                </td>
                <td>
                  <span :class="getAccionBadge(reg.accion)">{{ reg.accion }}</span>
                </td>
                <td><small>{{ reg.ip_cliente || '-' }}</small></td>
                <td>
                  <button class="btn btn-sm btn-info" @click="verDetalle(reg)" title="Ver detalle">
                    <i class="bi bi-eye"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="pagination-container" v-if="totalPages > 1">
          <button :disabled="page === 1" @click="changePage(page - 1)">«</button>
          <button v-for="p in getVisiblePages()" :key="p" :class="{ active: p === page }" @click="changePage(p)">{{ p }}</button>
          <button :disabled="page === totalPages" @click="changePage(page + 1)">»</button>
        </div>
      </div>
    </div>

    <!-- Modal de detalle -->
    <div v-if="showDetalleModal" class="modal-overlay" @click.self="showDetalleModal = false">
      <div class="modal-content" style="max-width: 650px;">
        <div class="modal-header">
          <h3><i class="bi bi-info-circle"></i> Detalle de Auditoría</h3>
          <button class="modal-close" @click="showDetalleModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detalle-grid">
            <div class="detalle-row">
              <strong>ID Registro:</strong>
              <span>{{ detalleSeleccionado?.id?.substring(0, 8) || 'N/A' }}</span>
            </div>
            <div class="detalle-row">
              <strong>Fecha y Hora:</strong>
              <span>{{ formatDateTime(detalleSeleccionado?.fecha_hora) }}</span>
            </div>
            <div class="detalle-row">
              <strong>Usuario:</strong>
              <span>{{ detalleSeleccionado?.usuario_nombre || 'Sistema / Anónimo' }}</span>
            </div>
            <div class="detalle-row">
              <strong>Email:</strong>
              <span>{{ detalleSeleccionado?.usuario_email || 'N/A' }}</span>
            </div>
            <div class="detalle-row">
              <strong>Rol:</strong>
              <span>{{ detalleSeleccionado?.usuario_rol || 'N/A' }}</span>
            </div>
            <div class="detalle-row">
              <strong>Módulo:</strong>
              <span class="badge badge-info">{{ detalleSeleccionado?.modulo }}</span>
            </div>
            <div class="detalle-row">
              <strong>Acción:</strong>
              <span :class="getAccionBadge(detalleSeleccionado?.accion)">{{ detalleSeleccionado?.accion }}</span>
            </div>
            <div class="detalle-row">
              <strong>IP Cliente:</strong>
              <span>{{ detalleSeleccionado?.ip_cliente || 'N/A' }}</span>
            </div>
            <div class="detalle-row" v-if="detalleSeleccionado?.registro_id">
              <strong>ID Registro Afectado:</strong>
              <code>{{ detalleSeleccionado?.registro_id }}</code>
            </div>
          </div>

          <!-- JSON del detalle -->
          <div class="detalle-json" v-if="parsedDetalle">
            <h5>📋 Datos de la Operación</h5>
            <pre>{{ JSON.stringify(parsedDetalle, null, 2) }}</pre>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDetalleModal = false">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../services/api'
import Loading from '../components/common/Loading.vue'
import Swal from 'sweetalert2'

// ============================================
// DATOS
// ============================================
const registros = ref([])
const modulos = ref([])
const loading = ref(false)
const search = ref('')
const filterModulo = ref('')
const filterAccion = ref('')
const filterFechaDesde = ref('')
const filterFechaHasta = ref('')
const page = ref(1)
const total = ref(0)
const totalPages = ref(0)

// Estadísticas
const stats = ref({})
const topUsuarios = ref([])

// Modal detalle
const showDetalleModal = ref(false)
const detalleSeleccionado = ref(null)

let searchTimeout

// ============================================
// PARSED DETALLE
// ============================================
const parsedDetalle = computed(() => {
  if (!detalleSeleccionado.value?.detalle) return null
  try {
    if (typeof detalleSeleccionado.value.detalle === 'string') {
      return JSON.parse(detalleSeleccionado.value.detalle)
    }
    return detalleSeleccionado.value.detalle
  } catch {
    return detalleSeleccionado.value.detalle
  }
})

// ============================================
// CARGAR DATOS
// ============================================
onMounted(async () => {
  await loadStats()
  loadAuditoria()
})

async function loadStats() {
  try {
    const { data } = await api.get('/auditoria/stats')
    stats.value = data.stats || {}
    topUsuarios.value = data.topUsuarios || []
  } catch (e) {
    console.error('Error cargando estadísticas:', e)
  }
}

async function loadAuditoria() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      limit: 20
    }
    if (search.value) params.search = search.value
    if (filterModulo.value) params.modulo = filterModulo.value
    if (filterAccion.value) params.accion = filterAccion.value
    if (filterFechaDesde.value) params.fecha_desde = filterFechaDesde.value
    if (filterFechaHasta.value) params.fecha_hasta = filterFechaHasta.value

    const { data } = await api.get('/auditoria', { params })
    registros.value = data.data || []
    modulos.value = data.modulos || []
    total.value = data.pagination?.total || 0
    totalPages.value = data.pagination?.totalPages || 0
  } catch (e) {
    console.error('Error cargando auditoría:', e)
  } finally {
    loading.value = false
  }
}

// ============================================
// PAGINACIÓN Y BÚSQUEDA
// ============================================
function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 1; loadAuditoria() }, 400)
}

function changePage(p) { page.value = p; loadAuditoria() }

function getVisiblePages() {
  const pages = []
  for (let i = Math.max(1, page.value - 2); i <= Math.min(totalPages.value, page.value + 2); i++) {
    pages.push(i)
  }
  return pages
}

// ============================================
// VER DETALLE
// ============================================
function verDetalle(reg) {
  detalleSeleccionado.value = reg
  showDetalleModal.value = true
}

// ============================================
// UTILIDADES
// ============================================
function formatDateTime(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('es-BO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

function getAccionBadge(accion) {
  const map = {
    'CREAR': 'badge badge-success',
    'ACTUALIZAR': 'badge badge-warning',
    'ELIMINAR': 'badge badge-danger'
  }
  return map[accion] || 'badge badge-secondary'
}
</script>

<style scoped>
.page-header { margin-bottom: 1.5rem; }
.page-title { margin: 0; color: #5a5c69; display: flex; align-items: center; gap: 8px; }

/* ============ ESTADÍSTICAS ============ */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.stat-card {
  background: white; border-radius: 12px; padding: 1.5rem;
  display: flex; align-items: center; gap: 1rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
}
.stat-icon {
  width: 55px; height: 55px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; color: white; flex-shrink: 0;
}
.stat-info { flex: 1; }
.stat-label { margin: 0; color: #858796; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; }
.stat-value { margin: 0.2rem 0 0; font-size: 1.4rem; font-weight: 700; color: #1a1a2e; }

/* ============ TOP USUARIOS ============ */
.top-users-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.top-user-item {
  display: flex; align-items: center; gap: 10px;
  padding: 0.6rem 1rem; background: #f8f9fc; border-radius: 8px; flex: 1; min-width: 250px;
}
.top-user-rank { font-weight: 700; color: #4e73df; font-size: 1rem; width: 30px; }
.top-user-name { font-weight: 500; color: #1a1a2e; flex: 1; }
.top-user-email { color: #858796; font-size: 0.8rem; }

/* ============ CARDS Y TABLA ============ */
.card { background: white; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 1rem; }
.card-header { padding: 1rem 1.25rem; border-bottom: 1px solid #e3e6f0; font-weight: 600; color: #4e73df; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.card-body { padding: 1.25rem; }
.table-responsive { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 700px; }
.table th { background: #f8f9fc; padding: 10px 12px; text-align: left; font-weight: 600; color: #4e73df; border-bottom: 2px solid #e3e6f0; font-size: 0.8rem; text-transform: uppercase; }
.table td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 0.85rem; vertical-align: middle; }
.table tbody tr:hover { background: #f8f9fc; }

/* ============ FORMULARIOS ============ */
.form-label-sm { font-size: 0.72rem; color: #6b7280; margin-bottom: 0.2rem; display: block; }
.form-control, .form-select { width: 100%; padding: 0.5rem 0.65rem; border: 2px solid #e5e7eb; border-radius: 8px; font-family: inherit; font-size: 0.82rem; box-sizing: border-box; transition: all 0.2s; }
.form-control:focus, .form-select:focus { outline: none; border-color: #4e73df; box-shadow: 0 0 0 3px rgba(78,115,223,0.1); }
.row { display: flex; flex-wrap: wrap; margin: 0 -0.5rem; }
.col-2 { flex: 0 0 16.666%; padding: 0 0.5rem; }
.col-3 { flex: 0 0 25%; padding: 0 0.5rem; }

/* ============ BOTONES Y BADGES ============ */
.btn { padding: 0.45rem 0.85rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; display: inline-flex; align-items: center; gap: 5px; font-size: 0.82rem; transition: all 0.2s; }
.btn-info { background: #36b9cc; color: white; }
.btn-secondary { background: #858796; color: white; }
.btn-sm { padding: 0.3rem 0.5rem; font-size: 0.75rem; }
.badge { padding: 0.2em 0.55em; border-radius: 50px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
.badge-primary { background: #4e73df; color: white; }
.badge-info { background: #36b9cc; color: white; }
.badge-success { background: #1cc88a; color: white; }
.badge-warning { background: #f6c23e; color: #5a5c69; }
.badge-danger { background: #e74a3b; color: white; }
.badge-secondary { background: #858796; color: white; }

/* ============ PAGINACIÓN ============ */
.pagination-container { display: flex; justify-content: center; gap: 4px; margin-top: 1rem; }
.pagination-container button { padding: 0.35rem 0.7rem; border: 1px solid #e3e6f0; background: white; cursor: pointer; border-radius: 4px; }
.pagination-container button.active { background: #4e73df; color: white; border-color: #4e73df; }
.pagination-container button:disabled { opacity: 0.4; cursor: not-allowed; }

/* ============ MODAL ============ */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
.modal-content { background: white; border-radius: 12px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.4); animation: slideUp 0.3s ease; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 1; }
.modal-header h3 { margin: 0; display: flex; align-items: center; gap: 8px; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #9ca3af; }
.modal-close:hover { color: #e74a3b; }
.modal-body { padding: 1.5rem; }
.modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 0.75rem; }

/* ============ DETALLE ============ */
.detalle-grid { margin-bottom: 1.5rem; }
.detalle-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f3f5; font-size: 0.88rem; }
.detalle-row strong { color: #4e73df; }
.detalle-json { background: #1a1a2e; color: #1cc88a; padding: 1rem; border-radius: 8px; overflow-x: auto; }
.detalle-json h5 { color: white; margin: 0 0 0.75rem; }
.detalle-json pre { margin: 0; font-size: 0.8rem; font-family: 'Courier New', monospace; white-space: pre-wrap; word-break: break-all; }
code { background: #f1f4fb; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: #4e73df; }

.text-center { text-align: center; }
.text-muted { color: #858796; }
.py-4 { padding: 2rem 0; }
.mb-3 { margin-bottom: 1rem; }

@media (max-width: 768px) {
  .col-2, .col-3 { flex: 0 0 50%; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .col-2, .col-3 { flex: 0 0 100%; }
  .stats-grid { grid-template-columns: 1fr; }
}
</style>