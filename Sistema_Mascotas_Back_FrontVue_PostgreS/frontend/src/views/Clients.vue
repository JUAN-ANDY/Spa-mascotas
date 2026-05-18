<template>
  <div class="clients-page">
    <div class="page-header">
      <h2 class="page-title">Gestión de Clientes</h2>
      <button class="btn btn-primary" @click="openCreateModal">
        <i class="bi bi-plus-lg"></i> Nuevo Cliente
      </button>
    </div>

    <!-- Buscador -->
    <div class="card mb-3">
      <div class="card-body">
        <input 
          v-model="search" 
          class="form-control" 
          placeholder="Buscar cliente por nombre o email..."
          @input="debounceSearch"
        >
      </div>
    </div>

    <!-- Tabla -->
    <div class="card">
      <div class="card-header">
        Listado de Clientes
        <span class="badge badge-primary">{{ total }} registros</span>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="4" class="text-center py-4">
                  <Loading />
                </td>
              </tr>
              <tr v-else-if="clients.length === 0">
                <td colspan="4" class="text-center py-4 text-muted">
                  No se encontraron clientes
                </td>
              </tr>
              <tr v-for="client in clients" :key="client.id">
                <td>{{ client.first_name }} {{ client.last_name }}</td>
                <td>{{ client.email }}</td>
                <td>{{ client.phone || '-' }}</td>
                <td>
                  <button class="btn btn-sm btn-info mr-1" @click="viewClient(client)" title="Ver detalle">
                    <i class="bi bi-eye"></i>
                  </button>
                  <button class="btn btn-sm btn-warning mr-1" @click="openEditModal(client)" title="Editar">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" @click="deleteClient(client.id)" title="Eliminar">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="pagination-container" v-if="totalPages > 1">
          <button :disabled="page === 1" @click="changePage(page - 1)">«</button>
          <button v-for="p in totalPages" :key="p" :class="{ active: p === page }" @click="changePage(p)">{{ p }}</button>
          <button :disabled="page === totalPages" @click="changePage(page + 1)">»</button>
        </div>
      </div>
    </div>

    <!-- Modal Crear/Editar -->
    <Modal :show="showModal" :title="modalTitle" @close="closeModal">
      <form @submit.prevent="saveClient">
        <div class="row">
          <div class="col-6">
            <div class="form-group">
              <label class="form-label">Nombre *</label>
              <input v-model="form.first_name" class="form-control" required>
            </div>
          </div>
          <div class="col-6">
            <div class="form-group">
              <label class="form-label">Apellido *</label>
              <input v-model="form.last_name" class="form-control" required>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Email *</label>
          <input v-model="form.email" type="email" class="form-control" required>
        </div>
        <div class="form-group">
          <label class="form-label">Teléfono</label>
          <input v-model="form.phone" class="form-control">
        </div>
        <div class="form-group">
          <label class="form-label">Preferencias</label>
          <textarea v-model="form.preferences" class="form-control" rows="2"></textarea>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
        <button class="btn btn-primary" @click="saveClient">Guardar</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { clientsAPI } from '../services/api'
import Modal from '../components/common/Modal.vue'
import Loading from '../components/common/Loading.vue'
import Swal from 'sweetalert2'

const clients = ref([])
const loading = ref(false)
const search = ref('')
const page = ref(1)
const total = ref(0)
const totalPages = ref(0)

const showModal = ref(false)
const modalTitle = ref('')
const editingId = ref(null)
const form = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  preferences: ''
})

let searchTimeout

onMounted(() => loadClients())

async function loadClients() {
  loading.value = true
  try {
    const { data } = await clientsAPI.getAll({
      search: search.value,
      page: page.value,
      limit: 10
    })
    clients.value = data.data || data.clients || []
    total.value = data.pagination?.total || 0
    totalPages.value = data.pagination?.totalPages || 0
  } catch (error) {
    console.error('Error cargando clientes:', error)
  } finally {
    loading.value = false
  }
}

function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    loadClients()
  }, 500)
}

function changePage(p) {
  page.value = p
  loadClients()
}

function openCreateModal() {
  modalTitle.value = 'Nuevo Cliente'
  editingId.value = null
  form.first_name = ''
  form.last_name = ''
  form.email = ''
  form.phone = ''
  form.preferences = ''
  showModal.value = true
}

function openEditModal(client) {
  modalTitle.value = 'Editar Cliente'
  editingId.value = client.id
  form.first_name = client.first_name || ''
  form.last_name = client.last_name || ''
  form.email = client.email || ''
  form.phone = client.phone || ''
  form.preferences = client.preferences || ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

async function saveClient() {
  if (!form.first_name || !form.last_name || !form.email) {
    Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Nombre, apellido y email son obligatorios' })
    return
  }

  try {
    if (editingId.value) {
      await clientsAPI.update(editingId.value, form)
      Swal.fire({ icon: 'success', title: 'Cliente actualizado', timer: 1500, showConfirmButton: false })
    } else {
      await clientsAPI.create(form)
      Swal.fire({ icon: 'success', title: 'Cliente creado', timer: 1500, showConfirmButton: false })
    }
    closeModal()
    loadClients()
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al guardar' })
  }
}

async function deleteClient(id) {
  const result = await Swal.fire({
    title: '¿Eliminar cliente?',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  })

  if (result.isConfirmed) {
    try {
      await clientsAPI.delete(id)
      Swal.fire({ icon: 'success', title: 'Cliente eliminado', timer: 1500, showConfirmButton: false })
      loadClients()
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar' })
    }
  }
}

function viewClient(client) {
  Swal.fire({
    title: `${client.first_name} ${client.last_name}`,
    html: `
      <p><strong>Email:</strong> ${client.email}</p>
      <p><strong>Teléfono:</strong> ${client.phone || 'No especificado'}</p>
      <p><strong>Preferencias:</strong> ${client.preferences || 'Ninguna'}</p>
      <p><strong>Creado:</strong> ${new Date(client.created_at).toLocaleString()}</p>
    `,
    icon: 'info'
  })
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-title { margin: 0; color: #5a5c69; }
.card { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); margin-bottom: 1rem; }
.card-header { padding: 1rem 1.25rem; border-bottom: 1px solid #e3e6f0; font-weight: 600; color: #4e73df; display: flex; justify-content: space-between; align-items: center; }
.card-body { padding: 1.25rem; }
.table { width: 100%; border-collapse: collapse; }
.table th { background: #f8f9fc; padding: 12px 16px; text-align: left; font-weight: 600; color: #4e73df; border-bottom: 2px solid #e3e6f0; font-size: 0.85rem; }
.table td { padding: 12px 16px; border-bottom: 1px solid #eee; font-size: 0.9rem; }
.table tbody tr:hover { background: #f8f9fc; }
.btn { padding: 0.4rem 0.75rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px; }
.btn-primary { background: #4e73df; color: white; }
.btn-info { background: #36b9cc; color: white; }
.btn-warning { background: #f6c23e; color: #5a5c69; }
.btn-danger { background: #e74a3b; color: white; }
.btn-secondary { background: #858796; color: white; }
.btn-sm { padding: 0.3rem 0.5rem; font-size: 0.8rem; }
.btn:hover { opacity: 0.9; transform: translateY(-1px); }
.mr-1 { margin-right: 0.25rem; }
.mb-3 { margin-bottom: 1rem; }
.text-center { text-align: center; }
.text-muted { color: #858796; }
.py-4 { padding-top: 2rem; padding-bottom: 2rem; }
.badge { padding: 0.25em 0.6em; border-radius: 10rem; font-size: 0.75rem; font-weight: 600; }
.badge-primary { background: #4e73df; color: white; }
.pagination-container { display: flex; justify-content: center; gap: 0.25rem; margin-top: 1rem; }
.pagination-container button { padding: 0.375rem 0.75rem; border: 1px solid #e3e6f0; background: white; cursor: pointer; border-radius: 4px; }
.pagination-container button.active { background: #4e73df; color: white; border-color: #4e73df; }
.pagination-container button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>