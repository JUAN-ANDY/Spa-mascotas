<template>
  <div class="users-page">
    <div class="page-header">
      <h2 class="page-title">Gestión de Usuarios</h2>
      <button class="btn btn-primary" @click="openCreateModal">
        <i class="bi bi-person-plus"></i> Nuevo Usuario
      </button>
    </div>

    <!-- Filtros -->
    <div class="card mb-3">
      <div class="card-body">
        <div class="row">
          <div class="col-6">
            <input v-model="search" class="form-control" placeholder="Buscar usuario..." @input="debounceSearch">
          </div>
          <div class="col-6">
            <select v-model="filterRole" class="form-select" @change="loadUsers">
              <option value="">Todos los roles</option>
              <option value="Administrador">Administrador</option>
              <option value="Recepcion">Recepcionista</option>
              <option value="Groomer">Groomer</option>
              <option value="Cliente">Cliente</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="card">
      <div class="card-header">
        Listado de Usuarios
        <span class="badge badge-primary">{{ total }} registros</span>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Teléfono</th>
                <th>Turno</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="text-center py-4"><Loading /></td>
              </tr>
              <tr v-else-if="users.length === 0">
                <td colspan="7" class="text-center py-4 text-muted">No se encontraron usuarios</td>
              </tr>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.first_name }} {{ user.last_name }}</td>
                <td>{{ user.email }}</td>
                <td><span :class="getRoleBadge(user.role)">{{ user.role }}</span></td>
                <td>{{ user.phone || '-' }}</td>
                <td>
                  <span v-if="user.turno" :class="user.turno === 'Mañana' ? 'badge badge-info' : 'badge badge-warning'">
                    {{ user.turno }} {{ user.turno === 'Mañana' ? '🌅' : '🌇' }}
                  </span>
                  <span v-else class="text-muted">-</span>
                </td>
                <td>
                  <span :class="user.is_active ? 'badge badge-success' : 'badge badge-danger'">
                    {{ user.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-sm btn-info" @click="viewUser(user)" title="Ver"><i class="bi bi-eye"></i></button>
                    <button class="btn btn-sm btn-warning" @click="openEditModal(user)" title="Editar"><i class="bi bi-pencil"></i></button>
                    <button v-if="user.role !== 'Administrador'" class="btn btn-sm btn-danger" @click="deleteUser(user.id)" title="Eliminar"><i class="bi bi-trash"></i></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-container" v-if="totalPages > 1">
          <button :disabled="page === 1" @click="changePage(page - 1)">«</button>
          <button v-for="p in getVisiblePages()" :key="p" :class="{ active: p === page }" @click="changePage(p)">{{ p }}</button>
          <button :disabled="page === totalPages" @click="changePage(page + 1)">»</button>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- MODAL CREAR USUARIO                           -->
    <!-- ============================================ -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal-content user-modal">
        <div class="modal-header">
          <h3><i class="bi bi-person-plus"></i> Nuevo Usuario</h3>
          <button class="modal-close" @click="closeCreateModal">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="createUser">
            <div class="form-row">
              <div class="form-group form-half">
                <label class="form-label">Nombre *</label>
                <input v-model="createForm.first_name" class="form-control" placeholder="Nombre" required>
              </div>
              <div class="form-group form-half">
                <label class="form-label">Apellido *</label>
                <input v-model="createForm.last_name" class="form-control" placeholder="Apellido" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email *</label>
              <input v-model="createForm.email" type="email" class="form-control" placeholder="correo@ejemplo.com" required>
            </div>

            <!-- ⬇️⬇️⬇️ CONTRASEÑA CON MEDIDOR DE FORTALEZA ⬇️⬇️⬇️ -->
            <div class="form-group">
              <label class="form-label">Contraseña *</label>
              <div class="input-wrapper">
                <input v-model="createForm.password" :type="showCreatePass ? 'text' : 'password'" class="form-control" placeholder="Mín. 8 caracteres" required minlength="8" @input="checkCreatePasswordStrength">
                <span class="toggle-pass" @click="showCreatePass = !showCreatePass">
                  <i :class="showCreatePass ? 'bi-eye-slash' : 'bi-eye'"></i>
                </span>
              </div>
              <!-- ⬇️ MEDIDOR DE FORTALEZA ⬇️ -->
              <div v-if="createForm.password.length > 0" class="password-strength">
                <div class="strength-bar">
                  <div class="strength-fill" :class="createStrengthClass" :style="{ width: createStrengthPercent + '%' }"></div>
                </div>
                <div class="strength-info">
                  <span :class="'strength-text ' + createStrengthClass">{{ createStrengthLabel }}</span>
                  <div class="strength-criteria">
                    <span :class="{ met: createHasMinLength }"><i :class="createHasMinLength ? 'bi-check-circle-fill' : 'bi-circle'"></i> 8+ caracteres</span>
                    <span :class="{ met: createHasUpperCase }"><i :class="createHasUpperCase ? 'bi-check-circle-fill' : 'bi-circle'"></i> Mayúsculas</span>
                    <span :class="{ met: createHasLowerCase }"><i :class="createHasLowerCase ? 'bi-check-circle-fill' : 'bi-circle'"></i> Minúsculas</span>
                    <span :class="{ met: createHasNumber }"><i :class="createHasNumber ? 'bi-check-circle-fill' : 'bi-circle'"></i> Números</span>
                    <span :class="{ met: createHasSymbol }"><i :class="createHasSymbol ? 'bi-check-circle-fill' : 'bi-circle'"></i> Símbolos</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group form-half">
                <label class="form-label">Rol *</label>
                <select v-model="createForm.role" class="form-select" required @change="onRoleChange">
                  <option value="">Seleccionar rol</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Recepcion">Recepcionista</option>
                  <option value="Groomer">Groomer</option>
                  <option value="Cliente">Cliente</option>
                </select>
              </div>
              <div class="form-group form-half">
                <label class="form-label">Teléfono</label>
                <input v-model="createForm.phone" class="form-control" placeholder="+591 77712345">
              </div>
            </div>

            <!-- ⬇️⬇️⬇️ TURNO (SOLO PARA RECEPCIONISTA Y GROOMER) ⬇️⬇️⬇️ -->
            <div v-if="createForm.role === 'Recepcion' || createForm.role === 'Groomer'" class="turno-section">
              <label class="form-label">Turno de Trabajo *</label>
              <div class="turno-options">
                <label class="turno-option" :class="{ active: createForm.turno === 'Mañana' }">
                  <input type="radio" v-model="createForm.turno" value="Mañana">
                  <span class="turno-icon">🌅</span>
                  <span class="turno-label">Mañana</span>
                  <span class="turno-horario">8:00 - 14:00</span>
                </label>
                <label class="turno-option" :class="{ active: createForm.turno === 'Tarde' }">
                  <input type="radio" v-model="createForm.turno" value="Tarde">
                  <span class="turno-icon">🌇</span>
                  <span class="turno-label">Tarde</span>
                  <span class="turno-horario">14:00 - 21:00</span>
                </label>
              </div>
            </div>

            <div v-if="createForm.role === 'Groomer'" class="form-group mt-3">
              <label class="form-label">Capacidad Concurrente</label>
              <input v-model.number="createForm.concurrent_capacity" type="number" class="form-control" min="1" max="5" placeholder="1">
              <small class="text-muted">Cantidad de mascotas que puede atender al mismo tiempo</small>
            </div>

            <!-- Mensajes -->
            <div v-if="createError" class="alert alert-danger mt-2"><i class="bi bi-exclamation-triangle"></i> {{ createError }}</div>
            <div v-if="createSuccess" class="alert alert-success mt-2"><i class="bi bi-check-circle"></i> {{ createSuccess }}</div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeCreateModal">Cancelar</button>
          <button class="btn btn-primary" @click="createUser" :disabled="creating || !isCreatePasswordValid">
            <span v-if="creating" class="spinner-small"></span>
            <span v-else><i class="bi bi-check-lg"></i> Guardar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- MODAL EDITAR USUARIO                          -->
    <!-- ============================================ -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal-content user-modal">
        <div class="modal-header">
          <h3><i class="bi bi-pencil"></i> Editar Usuario</h3>
          <button class="modal-close" @click="closeEditModal">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="updateUser">
            <div class="form-row">
              <div class="form-group form-half">
                <label class="form-label">Nombre *</label>
                <input v-model="editForm.first_name" class="form-control" required>
              </div>
              <div class="form-group form-half">
                <label class="form-label">Apellido *</label>
                <input v-model="editForm.last_name" class="form-control" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Email *</label>
              <input v-model="editForm.email" type="email" class="form-control" required>
            </div>
            <div class="form-row">
              <div class="form-group form-half">
                <label class="form-label">Rol</label>
                <select v-model="editForm.role" class="form-select" @change="onEditRoleChange">
                  <option value="Administrador">Administrador</option>
                  <option value="Recepcion">Recepcionista</option>
                  <option value="Groomer">Groomer</option>
                  <option value="Cliente">Cliente</option>
                </select>
              </div>
              <div class="form-group form-half">
                <label class="form-label">Teléfono</label>
                <input v-model="editForm.phone" class="form-control">
              </div>
            </div>

            <!-- ⬇️ TURNO EN EDICIÓN ⬇️ -->
            <div v-if="editForm.role === 'Recepcion' || editForm.role === 'Groomer'" class="turno-section">
              <label class="form-label">Turno de Trabajo</label>
              <div class="turno-options">
                <label class="turno-option" :class="{ active: editForm.turno === 'Mañana' }">
                  <input type="radio" v-model="editForm.turno" value="Mañana">
                  <span class="turno-icon">🌅</span>
                  <span class="turno-label">Mañana</span>
                  <span class="turno-horario">8:00 - 14:00</span>
                </label>
                <label class="turno-option" :class="{ active: editForm.turno === 'Tarde' }">
                  <input type="radio" v-model="editForm.turno" value="Tarde">
                  <span class="turno-icon">🌇</span>
                  <span class="turno-label">Tarde</span>
                  <span class="turno-horario">14:00 - 21:00</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-check-label">
                <input type="checkbox" v-model="editForm.is_active" class="mr-2">
                Usuario activo
              </label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeEditModal">Cancelar</button>
          <button class="btn btn-primary" @click="updateUser" :disabled="updating">
            <span v-if="updating" class="spinner-small"></span>
            <span v-else><i class="bi bi-check-lg"></i> Actualizar</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { usersAPI } from '../services/api'
import Loading from '../components/common/Loading.vue'
import Swal from 'sweetalert2'

// ============================================
// DATOS DE TABLA
// ============================================
const users = ref([])
const loading = ref(false)
const search = ref('')
const filterRole = ref('')
const page = ref(1)
const total = ref(0)
const totalPages = ref(0)

// ============================================
// MODAL CREAR
// ============================================
const showCreateModal = ref(false)
const creating = ref(false)
const createError = ref('')
const createSuccess = ref('')
const showCreatePass = ref(false)

const createForm = reactive({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: '',
  phone: '',
  turno: '',
  concurrent_capacity: 1
})

// ⬇️ FORTALEZA DE CONTRASEÑA (CREAR) ⬇️
const createHasMinLength = computed(() => createForm.password.length >= 8)
const createHasUpperCase = computed(() => /[A-Z]/.test(createForm.password))
const createHasLowerCase = computed(() => /[a-z]/.test(createForm.password))
const createHasNumber = computed(() => /[0-9]/.test(createForm.password))
const createHasSymbol = computed(() => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(createForm.password))

const createStrengthScore = computed(() => {
  let score = 0
  if (createHasMinLength.value) score++
  if (createHasUpperCase.value) score++
  if (createHasLowerCase.value) score++
  if (createHasNumber.value) score++
  if (createHasSymbol.value) score++
  return score
})

const createStrengthPercent = computed(() => (createStrengthScore.value / 5) * 100)

const createStrengthLabel = computed(() => {
  if (createStrengthScore.value <= 1) return 'Muy Débil'
  if (createStrengthScore.value === 2) return 'Débil'
  if (createStrengthScore.value === 3) return 'Medio'
  if (createStrengthScore.value === 4) return 'Fuerte'
  if (createStrengthScore.value === 5) return 'Muy Fuerte'
  return ''
})

const createStrengthClass = computed(() => {
  if (createStrengthScore.value <= 1) return 'very-weak'
  if (createStrengthScore.value === 2) return 'weak'
  if (createStrengthScore.value === 3) return 'medium'
  if (createStrengthScore.value >= 4) return 'strong'
  return ''
})

const isCreatePasswordValid = computed(() => {
  return createHasMinLength.value && createStrengthScore.value >= 3
})

function checkCreatePasswordStrength() {}

// ============================================
// MODAL EDITAR
// ============================================
const showEditModal = ref(false)
const updating = ref(false)

const editForm = reactive({
  id: '',
  first_name: '',
  last_name: '',
  email: '',
  role: '',
  phone: '',
  turno: '',
  is_active: true
})

let searchTimeout

// ============================================
// CARGAR DATOS
// ============================================
onMounted(() => loadUsers())

async function loadUsers() {
  loading.value = true
  try {
    const { data } = await usersAPI.getAll({
      search: search.value,
      role: filterRole.value,
      page: page.value,
      limit: 10
    })
    users.value = data.data || data.users || []
    total.value = data.pagination?.total || 0
    totalPages.value = data.pagination?.totalPages || 0
  } catch (e) { console.error('Error:', e) }
  finally { loading.value = false }
}

function debounceSearch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { page.value = 1; loadUsers() }, 400) }
function changePage(p) { page.value = p; loadUsers() }
function getVisiblePages() { const pages = []; for (let i = Math.max(1, page.value - 2); i <= Math.min(totalPages.value, page.value + 2); i++) pages.push(i); return pages }

// ============================================
// ROLE CHANGE
// ============================================
function onRoleChange() {
  if (createForm.role !== 'Recepcion' && createForm.role !== 'Groomer') {
    createForm.turno = ''
  }
}

function onEditRoleChange() {
  if (editForm.role !== 'Recepcion' && editForm.role !== 'Groomer') {
    editForm.turno = ''
  }
}

// ============================================
// CREAR USUARIO
// ============================================
function openCreateModal() {
  Object.assign(createForm, {
    first_name: '', last_name: '', email: '', password: '',
    role: '', phone: '', turno: '', concurrent_capacity: 1
  })
  createError.value = ''; createSuccess.value = ''
  showCreateModal.value = true
}

function closeCreateModal() { showCreateModal.value = false }

async function createUser() {
  createError.value = ''; createSuccess.value = ''

  if (!createForm.first_name || !createForm.last_name || !createForm.email || !createForm.password || !createForm.role) {
    createError.value = 'Completa todos los campos requeridos'
    return
  }

  if (createForm.password.length < 8) {
    createError.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }

  if (!isCreatePasswordValid.value) {
    createError.value = 'La contraseña debe contener al menos 3 de: mayúsculas, minúsculas, números y símbolos'
    return
  }

  if ((createForm.role === 'Recepcion' || createForm.role === 'Groomer') && !createForm.turno) {
    createError.value = 'Selecciona un turno de trabajo'
    return
  }

  creating.value = true
  try {
    const payload = {
      email: createForm.email.trim().toLowerCase(),
      password: createForm.password,
      first_name: createForm.first_name.trim(),
      last_name: createForm.last_name.trim(),
      role: createForm.role,
      phone: createForm.phone || null,
      turno: createForm.turno || null,
      concurrent_capacity: createForm.concurrent_capacity || 1
    }

    await usersAPI.create(payload)
    createSuccess.value = 'Usuario creado exitosamente'
    setTimeout(() => { closeCreateModal(); loadUsers() }, 1000)
  } catch (error) {
    createError.value = error.response?.data?.message || 'Error al crear usuario'
  } finally { creating.value = false }
}

// ============================================
// EDITAR USUARIO
// ============================================
function openEditModal(user) {
  Object.assign(editForm, {
    id: user.id,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    role: user.role || '',
    phone: user.phone || '',
    turno: user.turno || '',
    is_active: user.is_active
  })
  showEditModal.value = true
}

function closeEditModal() { showEditModal.value = false }

async function updateUser() {
  updating.value = true
  try {
    await usersAPI.update(editForm.id, {
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      email: editForm.email,
      role: editForm.role,
      phone: editForm.phone,
      turno: editForm.turno,
      is_active: editForm.is_active
    })
    Swal.fire({ icon: 'success', title: 'Usuario actualizado', timer: 1500, showConfirmButton: false })
    closeEditModal()
    loadUsers()
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message })
  } finally { updating.value = false }
}

// ============================================
// ELIMINAR
// ============================================
async function deleteUser(id) {
  const result = await Swal.fire({ title: '¿Eliminar usuario?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí', cancelButtonText: 'No' })
  if (result.isConfirmed) {
    await usersAPI.delete(id)
    Swal.fire({ icon: 'success', title: 'Usuario eliminado', timer: 1500, showConfirmButton: false })
    loadUsers()
  }
}

// ============================================
// VER
// ============================================
function viewUser(user) {
  Swal.fire({
    title: `${user.first_name} ${user.last_name}`,
    html: `
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Rol:</strong> ${user.role}</p>
      <p><strong>Teléfono:</strong> ${user.phone || 'No registrado'}</p>
      <p><strong>Turno:</strong> ${user.turno || 'No asignado'}</p>
      <p><strong>Estado:</strong> ${user.is_active ? 'Activo' : 'Inactivo'}</p>
    `,
    icon: 'info'
  })
}

function getRoleBadge(role) {
  const m = { 'Administrador': 'badge badge-primary', 'Recepcion': 'badge badge-info', 'Groomer': 'badge badge-warning', 'Cliente': 'badge badge-secondary' }
  return m[role] || 'badge badge-secondary'
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.5rem; }
.page-title { margin: 0; color: #5a5c69; }
.card { background: white; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 1rem; }
.card-header { padding: 1rem 1.25rem; border-bottom: 1px solid #e3e6f0; font-weight: 600; color: #4e73df; display: flex; justify-content: space-between; align-items: center; }
.card-body { padding: 1.25rem; }
.table-responsive { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 600px; }
.table th { background: #f8f9fc; padding: 10px 12px; text-align: left; font-weight: 600; color: #4e73df; border-bottom: 2px solid #e3e6f0; font-size: 0.8rem; text-transform: uppercase; }
.table td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 0.85rem; }
.table tbody tr:hover { background: #f8f9fc; }
.btn { padding: 0.45rem 0.85rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; display: inline-flex; align-items: center; gap: 5px; font-size: 0.82rem; transition: all 0.2s; }
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.btn-primary { background: #4e73df; color: white; }
.btn-info { background: #36b9cc; color: white; }
.btn-warning { background: #f6c23e; color: #5a5c69; }
.btn-danger { background: #e74a3b; color: white; }
.btn-secondary { background: #858796; color: white; }
.btn-sm { padding: 0.3rem 0.55rem; font-size: 0.78rem; }
.btn-group { display: flex; gap: 3px; }
.badge { padding: 0.2em 0.55em; border-radius: 50px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
.badge-primary { background: #4e73df; color: white; }
.badge-info { background: #36b9cc; color: white; }
.badge-warning { background: #f6c23e; color: #5a5c69; }
.badge-success { background: #1cc88a; color: white; }
.badge-danger { background: #e74a3b; color: white; }
.badge-secondary { background: #858796; color: white; }
.pagination-container { display: flex; justify-content: center; gap: 4px; margin-top: 1rem; }
.pagination-container button { padding: 0.35rem 0.7rem; border: 1px solid #e3e6f0; background: white; cursor: pointer; border-radius: 4px; }
.pagination-container button.active { background: #4e73df; color: white; border-color: #4e73df; }
.pagination-container button:disabled { opacity: 0.4; cursor: not-allowed; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
.modal-content { background: white; border-radius: 12px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.4); animation: slideUp 0.3s ease; }
.user-modal { max-width: 600px; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 1; }
.modal-header h3 { margin: 0; display: flex; align-items: center; gap: 8px; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #9ca3af; }
.modal-close:hover { color: #e74a3b; }
.modal-body { padding: 1.5rem; }
.modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 0.75rem; position: sticky; bottom: 0; background: white; }

/* Forms */
.form-group { margin-bottom: 1rem; }
.form-label { display: block; margin-bottom: 0.3rem; font-weight: 500; font-size: 0.83rem; color: #374151; }
.form-control, .form-select { width: 100%; padding: 0.55rem 0.7rem; border: 2px solid #e5e7eb; border-radius: 8px; font-family: inherit; font-size: 0.85rem; box-sizing: border-box; transition: all 0.2s; }
.form-control:focus, .form-select:focus { outline: none; border-color: #4e73df; box-shadow: 0 0 0 3px rgba(78,115,223,0.1); }
.form-row { display: flex; gap: 0.75rem; }
.form-half { flex: 1; }
.input-wrapper { position: relative; display: flex; align-items: center; }
.toggle-pass { position: absolute; right: 10px; cursor: pointer; color: #9ca3af; padding: 4px; z-index: 1; }
.toggle-pass:hover { color: #4e73df; }
.form-check-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem; }
.mr-2 { margin-right: 0.5rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 1rem; }
.text-muted { color: #6b7280; font-size: 0.78rem; }

/* ⬇️⬇️⬇️ MEDIDOR DE FORTALEZA ⬇️⬇️⬇️ */
.password-strength { margin-top: 0.5rem; }
.strength-bar { height: 6px; background: #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 0.4rem; }
.strength-fill { height: 100%; border-radius: 10px; transition: all 0.3s ease; }
.strength-fill.very-weak { background: #e74a3b; }
.strength-fill.weak { background: #e67e22; }
.strength-fill.medium { background: #f6c23e; }
.strength-fill.strong { background: #1cc88a; }
.strength-info { display: flex; flex-direction: column; gap: 0.3rem; }
.strength-text { font-size: 0.75rem; font-weight: 600; }
.strength-text.very-weak { color: #e74a3b; }
.strength-text.weak { color: #e67e22; }
.strength-text.medium { color: #f6c23e; }
.strength-text.strong { color: #1cc88a; }
.strength-criteria { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 0.68rem; color: #9ca3af; }
.strength-criteria span { display: flex; align-items: center; gap: 3px; }
.strength-criteria span.met { color: #1cc88a; }
.strength-criteria span i { font-size: 0.65rem; }

/* ⬇️⬇️⬇️ TURNOS ⬇️⬇️⬇️ */
.turno-section { margin-top: 0.5rem; margin-bottom: 0.75rem; padding: 1rem; background: #f8f9fc; border-radius: 10px; border: 1px solid #e9ecef; }
.turno-options { display: flex; gap: 0.75rem; }
.turno-option {
  flex: 1; padding: 0.85rem; border: 2px solid #e5e7eb; border-radius: 10px;
  cursor: pointer; text-align: center; transition: all 0.2s;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.turno-option input { display: none; }
.turno-option.active { border-color: #4e73df; background: #e8f0fe; }
.turno-icon { font-size: 1.5rem; }
.turno-label { font-weight: 600; font-size: 0.9rem; color: #1a1a2e; }
.turno-horario { font-size: 0.75rem; color: #6b7280; }

/* Alert */
.alert { padding: 0.65rem 0.85rem; border-radius: 6px; font-size: 0.82rem; display: flex; align-items: center; gap: 6px; }
.alert-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.alert-success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }

.text-center { text-align: center; }
.text-muted { color: #858796; }
.py-4 { padding: 2rem 0; }
.mb-3 { margin-bottom: 1rem; }
.spinner-small { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) { .form-row { flex-direction: column; gap: 0; } .turno-options { flex-direction: column; } }
@media (max-width: 480px) { .page-header { flex-direction: column; align-items: stretch; } .page-header .btn { justify-content: center; } }
</style>