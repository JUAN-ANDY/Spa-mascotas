<template>
  <div class="appointments-page">
    <div class="page-header">
      <h2 class="page-title">
        {{ authStore.isClient ? 'Mis Citas' : 'Agenda de Citas' }}
      </h2>
      <button class="btn btn-primary" @click="openCreateModal">
        <i class="bi bi-plus-lg"></i> 
        {{ authStore.isClient ? 'Agendar Nueva Cita' : 'Nueva Cita' }}
      </button>
    </div>

    <!-- Listado de citas -->
    <div class="card">
      <div class="card-header">
        {{ authStore.isClient ? 'Mis Citas Agendadas' : 'Listado de Citas' }}
        <span class="badge badge-primary">{{ appointments.length }} citas</span>
      </div>
      <div class="card-body">
        <div v-if="loading" class="text-center py-4"><Loading /></div>
        <div v-else-if="appointments.length === 0" class="text-center py-4">
          <i class="bi bi-calendar-x" style="font-size:3rem;color:#ccc;"></i>
          <p class="text-muted mt-2">No tienes citas agendadas</p>
          <button class="btn btn-primary mt-2" @click="openCreateModal">
            <i class="bi bi-plus-lg"></i> Agendar mi primera cita
          </button>
        </div>
        <div v-else class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Mascota</th>
                <th>Servicio</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Precio</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="appt in appointments" :key="appt.id">
                <td><strong>{{ appt.pet_name }}</strong></td>
                <td>{{ appt.service_name }}</td>
                <td>{{ formatDate(appt.scheduled_start) }}</td>
                <td><span :class="getStatusBadge(appt.status)">{{ formatStatus(appt.status) }}</span></td>
                <td>Bs. {{ formatMoney(appt.total_price) }}</td>
                <td>
                  <button v-if="appt.status === 'Pendiente' || appt.status === 'Confirmada'" class="btn btn-sm btn-danger" @click="cancelAppointment(appt.id)">Cancelar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Agendar Cita -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content" style="max-width:600px;">
        <div class="modal-header">
          <h3><i class="bi bi-calendar-plus"></i> Agendar Nueva Cita</h3>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveAppointment">
            
            <!-- ⬇️ CLIENTE: MOSTRAR SU NOMBRE ⬇️ -->
            <div v-if="authStore.isClient" class="client-info-box mb-3">
              <i class="bi bi-person-check"></i>
              <div>
                <strong>Cliente:</strong> {{ authStore.userName }}
                <br><small class="text-muted">{{ authStore.userEmail }}</small>
              </div>
            </div>

            <!-- ⬇️ ADMIN/RECEPCION/GROOMER: SELECTOR DE CLIENTE ⬇️ -->
            <div v-else class="form-group">
              <label class="form-label">Cliente *</label>
              <select v-model="form.client_id" class="form-select" required>
                <option value="">-- Seleccionar cliente --</option>
                <option v-for="c in clients" :key="c.id" :value="c.id">
                  {{ c.first_name }} {{ c.last_name }} ({{ c.email }})
                </option>
              </select>
            </div>

            <!-- Mascota -->
            <div class="form-group">
              <label class="form-label">Mascota *</label>
              <select v-model="form.pet_id" class="form-select" required>
                <option value="">-- Seleccionar --</option>
                <option v-for="pet in myPets" :key="pet.id" :value="pet.id">
                  {{ pet.name }} ({{ pet.species }}{{ pet.breed ? ' - ' + pet.breed : '' }})
                </option>
              </select>
              <small v-if="myPets.length === 0" class="text-warning">
                ⚠️ No tienes mascotas. <router-link to="/pets">Registra una aquí</router-link>
              </small>
            </div>

            <!-- Servicio -->
            <div class="form-group">
              <label class="form-label">Servicio *</label>
              <select v-model="form.service_id" class="form-select" required @change="onServiceChange">
                <option value="">-- Seleccionar --</option>
                <option v-for="s in services" :key="s.id" :value="s.id">
                  {{ s.name }} - {{ s.base_duration_minutes }}min - Bs. {{ formatMoney(s.base_price) }}
                </option>
              </select>
            </div>

            <!-- Fecha -->
            <div class="form-group">
              <label class="form-label">Fecha y Hora *</label>
              <input v-model="form.scheduled_start" type="datetime-local" class="form-control" required :min="minDate">
            </div>

            <!-- Sucursal -->
            <div class="form-group">
              <label class="form-label">Sucursal *</label>
              <select v-model="form.branch_id" class="form-select" required>
                <option value="">-- Seleccionar --</option>
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }} - {{ b.address }}</option>
              </select>
            </div>

            <!-- Groomer -->
            <div class="form-group">
              <label class="form-label">Groomer</label>
              <select v-model="form.groomer_id" class="form-select">
                <option value="">Sin preferencia</option>
                <option v-for="g in groomers" :key="g.id" :value="g.id">{{ g.first_name }} {{ g.last_name }}</option>
              </select>
            </div>

            <!-- Total -->
            <div v-if="form.total_price > 0" class="total-preview">
              <p><strong>Total a pagar:</strong> <span class="text-primary">Bs. {{ formatMoney(form.total_price) }}</span></p>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
          <button class="btn btn-primary" @click="saveAppointment" :disabled="!canSave || saving">
            <span v-if="saving" class="spinner-small"></span>
            <span v-else><i class="bi bi-calendar-check"></i> Confirmar Cita</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '../store'
import { appointmentsAPI, petsAPI, clientsAPI, servicesAPI, branchesAPI, usersAPI } from '../services/api'
import Loading from '../components/common/Loading.vue'
import Swal from 'sweetalert2'

const authStore = useAuthStore()

const appointments = ref([])
const myPets = ref([])
const services = ref([])
const branches = ref([])
const groomers = ref([])
const clients = ref([]) // Solo para admin/recepcion/groomer
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const clientId = ref(null)

const form = reactive({
  client_id: '',
  pet_id: '',
  service_id: '',
  scheduled_start: '',
  branch_id: '',
  groomer_id: '',
  total_price: 0
})

const minDate = computed(() => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
})

const canSave = computed(() => {
  return form.pet_id && form.service_id && form.scheduled_start && form.branch_id
})

// ⬇️ CARGA RÁPIDA: SOLO LO NECESARIO ⬇️
onMounted(async () => {
  loading.value = true
  
  // Cargar datos en paralelo para velocidad
  const promises = [
    loadServices(),
    loadBranches(),
    loadGroomers()
  ]

  if (authStore.isClient) {
    promises.push(loadClientInfo())
  } else {
    promises.push(loadClients())
  }

  await Promise.all(promises)
  
  // Cargar mascotas después de tener clientId
  if (authStore.isClient && clientId.value) {
    await loadMyPets()
  }
  
  await loadAppointments()
  loading.value = false
})

async function loadServices() {
  try {
    const { data } = await servicesAPI.getAll()
    services.value = data.services || []
  } catch (e) { console.error('Error servicios:', e) }
}

async function loadBranches() {
  try {
    const { data } = await branchesAPI.getAll()
    branches.value = data.data || data.branches || []
    if (branches.value.length > 0) form.branch_id = branches.value[0].id
  } catch (e) { console.error('Error sucursales:', e) }
}

async function loadGroomers() {
  try {
    const { data } = await usersAPI.getGroomers()
    groomers.value = data.groomers || []
    if (groomers.value.length > 0) form.groomer_id = groomers.value[0].id
  } catch (e) { console.error('Error groomers:', e) }
}

async function loadClients() {
  try {
    const { data } = await clientsAPI.getAll({ limit: 100 })
    clients.value = data.data || data.clients || []
  } catch (e) { console.error('Error clientes:', e) }
}

// ⬇️ OBTENER CLIENTE ACTUAL (RÁPIDO) ⬇️
async function loadClientInfo() {
  try {
    // Buscar directamente por email
    const { data } = await clientsAPI.getAll({ 
      search: authStore.userEmail, 
      limit: 1 
    })
    const foundClients = data.data || data.clients || []
    if (foundClients.length > 0) {
      clientId.value = foundClients[0].id
      form.client_id = foundClients[0].id
    }
    // Si no se encuentra, no crear automáticamente para no ralentizar
  } catch (e) { console.error('Error:', e) }
}

async function loadMyPets() {
  if (!clientId.value) return
  try {
    const { data } = await petsAPI.getByClient(clientId.value)
    myPets.value = data.pets || []
  } catch (e) { console.error('Error mascotas:', e) }
}

async function loadAppointments() {
  try {
    if (authStore.isClient && clientId.value) {
      const { data } = await appointmentsAPI.getAll({ limit: 50 })
      appointments.value = (data.data || data.appointments || []).filter(
        a => a.client_id === clientId.value
      )
    } else {
      const { data } = await appointmentsAPI.getAll({ limit: 50 })
      appointments.value = data.data || data.appointments || []
    }
  } catch (e) { console.error('Error citas:', e) }
}

function onServiceChange() {
  const service = services.value.find(s => s.id === form.service_id)
  form.total_price = service ? service.base_price : 0
}

function openCreateModal() {
  if (branches.value.length > 0) form.branch_id = branches.value[0].id
  if (groomers.value.length > 0) form.groomer_id = groomers.value[0].id
  form.pet_id = ''
  form.service_id = ''
  form.scheduled_start = ''
  form.total_price = 0
  
  if (authStore.isClient) {
    form.client_id = clientId.value || ''
  } else {
    form.client_id = ''
  }
  
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function saveAppointment() {
  if (!canSave.value) {
    Swal.fire({ icon: 'warning', title: 'Completa todos los campos' })
    return
  }

  saving.value = true
  try {
    await appointmentsAPI.create({
      client_id: form.client_id,
      pet_id: form.pet_id,
      service_id: form.service_id,
      scheduled_start: form.scheduled_start,
      branch_id: form.branch_id,
      groomer_id: form.groomer_id || groomers.value[0]?.id,
      total_price: form.total_price
    })

    Swal.fire({ icon: 'success', title: '¡Cita Agendada!', timer: 2000, showConfirmButton: false })
    closeModal()
    loadAppointments()
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al agendar' })
  } finally { saving.value = false }
}

async function cancelAppointment(id) {
  const result = await Swal.fire({
    title: '¿Cancelar cita?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí', cancelButtonText: 'No'
  })
  if (result.isConfirmed) {
    await appointmentsAPI.cancel(id, { reason: 'Cancelado por cliente' })
    Swal.fire({ icon: 'success', title: 'Cita cancelada', timer: 1500, showConfirmButton: false })
    loadAppointments()
  }
}

function formatDate(d) { return d ? new Date(d).toLocaleString('es-BO', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-' }
function formatMoney(v) { return parseFloat(v || 0).toFixed(2) }
function formatStatus(s) { return s ? s.replace(/_/g, ' ') : '' }

function getStatusBadge(status) {
  const m = {
    'Pendiente': 'badge badge-warning',
    'Confirmada': 'badge badge-success',
    'Completada': 'badge badge-primary',
    'Cancelada': 'badge badge-danger'
  }
  return m[status] || 'badge badge-secondary'
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.5rem; }
.page-title { margin: 0; color: #5a5c69; }
.card { background: white; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 1rem; }
.card-header { padding: 1rem 1.25rem; border-bottom: 1px solid #e3e6f0; font-weight: 600; color: #4e73df; display: flex; justify-content: space-between; align-items: center; }
.card-body { padding: 1.25rem; }
.table-responsive { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 400px; }
.table th { background: #f8f9fc; padding: 10px; text-align: left; font-weight: 600; color: #4e73df; border-bottom: 2px solid #e3e6f0; font-size: 0.8rem; }
.table td { padding: 10px; border-bottom: 1px solid #eee; font-size: 0.85rem; }
.btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; display: inline-flex; align-items: center; gap: 5px; font-size: 0.85rem; transition: all 0.2s; }
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-primary { background: #4e73df; color: white; }
.btn-danger { background: #e74a3b; color: white; }
.btn-secondary { background: #858796; color: white; }
.btn-sm { padding: 0.3rem 0.5rem; font-size: 0.78rem; }
.badge { padding: 0.2em 0.5em; border-radius: 50px; font-size: 0.7rem; font-weight: 600; }
.badge-primary { background: #4e73df; color: white; }
.badge-warning { background: #f6c23e; color: #5a5c69; }
.badge-success { background: #1cc88a; color: white; }
.badge-danger { background: #e74a3b; color: white; }
.text-center { text-align: center; }
.text-muted { color: #858796; }
.text-primary { color: #4e73df; }
.text-warning { color: #f6c23e; }
.py-4 { padding: 2rem 0; }
.mt-2 { margin-top: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }
.total-preview { margin-top: 1rem; padding: 1rem; background: #f8f9fc; border-radius: 8px; }
small { display: block; margin-top: 4px; font-size: 0.8rem; }

/* Client info box */
.client-info-box {
  background: #e8f0fe; border: 2px solid #c5d5f7;
  border-radius: 10px; padding: 1rem 1.25rem;
  display: flex; align-items: center; gap: 12px;
  color: #4e73df;
}
.client-info-box i { font-size: 2rem; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
.modal-content { background: white; border-radius: 12px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.4); animation: slideUp 0.3s ease; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 1; }
.modal-header h3 { margin: 0; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #9ca3af; }
.modal-close:hover { color: #e74a3b; }
.modal-body { padding: 1.5rem; }
.modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 0.75rem; position: sticky; bottom: 0; background: white; }

.form-group { margin-bottom: 1rem; }
.form-label { display: block; margin-bottom: 0.3rem; font-weight: 500; font-size: 0.83rem; color: #374151; }
.form-control, .form-select { width: 100%; padding: 0.55rem 0.7rem; border: 2px solid #e5e7eb; border-radius: 8px; font-family: inherit; font-size: 0.85rem; box-sizing: border-box; transition: all 0.2s; }
.form-control:focus, .form-select:focus { outline: none; border-color: #4e73df; box-shadow: 0 0 0 3px rgba(78,115,223,0.1); }

.spinner-small { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 480px) { .page-header { flex-direction: column; align-items: stretch; } .page-header .btn { justify-content: center; } }
</style>