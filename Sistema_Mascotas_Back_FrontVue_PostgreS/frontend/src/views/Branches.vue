<template>
  <div class="branches-page">
    <div class="page-header">
      <h2 class="page-title">Gestión de Sucursales</h2>
      <button class="btn btn-primary" @click="openCreateModal">
        <i class="bi bi-plus-lg"></i> Nueva Sucursal
      </button>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="row mb-3">
          <div class="col-6">
            <input 
              v-model="search" 
              class="form-control" 
              placeholder="Buscar sucursal..."
              @input="debounceSearch"
            >
          </div>
        </div>

        <DataTable
          :columns="columns"
          :data="branches"
          :loading="loading"
          :total="total"
          :currentPage="page"
          :totalPages="totalPages"
          @page-change="changePage"
        >
          <template #cell-is_active="{ value }">
            <span :class="value ? 'badge badge-success' : 'badge badge-danger'">
              {{ value ? 'Activa' : 'Inactiva' }}
            </span>
          </template>
          <template #actions="{ row }">
            <button class="btn btn-sm btn-info" @click="viewBranch(row)">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-warning ml-1" @click="openEditModal(row)">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger ml-1" @click="toggleBranch(row)">
              <i :class="row.is_active ? 'bi bi-toggle-off' : 'bi bi-toggle-on'"></i>
            </button>
          </template>
        </DataTable>
      </div>
    </div>

    <!-- Modal -->
    <Modal :show="showModal" :title="modalTitle" @close="closeModal">
      <form @submit.prevent="saveBranch">
        <div class="form-group">
          <label class="form-label">Nombre *</label>
          <input v-model="form.name" class="form-control" required>
        </div>
        <div class="form-group">
          <label class="form-label">Dirección</label>
          <input v-model="form.address" class="form-control">
        </div>
        <div class="form-group">
          <label class="form-label">Teléfono</label>
          <input v-model="form.phone" class="form-control">
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
        <button class="btn btn-primary" @click="saveBranch">Guardar</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { branchesAPI } from '../services/api'
import DataTable from '../components/common/DataTable.vue'
import Modal from '../components/common/Modal.vue'
import Swal from 'sweetalert2'

const branches = ref([])
const loading = ref(false)
const search = ref('')
const page = ref(1)
const total = ref(0)
const totalPages = ref(0)

const columns = [
  { key: 'name', label: 'Nombre' },
  { key: 'address', label: 'Dirección' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'is_active', label: 'Estado' },
  { key: 'created_at', label: 'Creado', type: 'date' }
]

const showModal = ref(false)
const modalTitle = ref('')
const editingId = ref(null)
const form = ref({ name: '', address: '', phone: '' })

let searchTimeout

onMounted(() => loadBranches())

async function loadBranches() {
  loading.value = true
  try {
    const { data } = await branchesAPI.getAll({ search: search.value, page: page.value })
    branches.value = data.data || data.branches || []
    total.value = data.pagination?.total || 0
    totalPages.value = data.pagination?.totalPages || 0
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
}

function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    loadBranches()
  }, 500)
}

function changePage(p) {
  page.value = p
  loadBranches()
}

function openCreateModal() {
  modalTitle.value = 'Nueva Sucursal'
  editingId.value = null
  form.value = { name: '', address: '', phone: '' }
  showModal.value = true
}

function openEditModal(branch) {
  modalTitle.value = 'Editar Sucursal'
  editingId.value = branch.id
  form.value = { ...branch }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function saveBranch() {
  try {
    if (editingId.value) {
      await branchesAPI.update(editingId.value, form.value)
      Swal.fire({ icon: 'success', title: 'Sucursal actualizada', timer: 1500, showConfirmButton: false })
    } else {
      await branchesAPI.create(form.value)
      Swal.fire({ icon: 'success', title: 'Sucursal creada', timer: 1500, showConfirmButton: false })
    }
    closeModal()
    loadBranches()
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message })
  }
}

async function toggleBranch(branch) {
  const action = branch.is_active ? 'desactivar' : 'activar'
  const result = await Swal.fire({
    title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} sucursal?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí',
    cancelButtonText: 'Cancelar'
  })
  
  if (result.isConfirmed) {
    await branchesAPI.update(branch.id, { is_active: !branch.is_active })
    Swal.fire({ icon: 'success', title: `Sucursal ${action.slice(0, -2)}ada`, timer: 1500, showConfirmButton: false })
    loadBranches()
  }
}

function viewBranch(branch) {
  Swal.fire({
    title: branch.name,
    html: `
      <p><strong>Dirección:</strong> ${branch.address || 'No especificada'}</p>
      <p><strong>Teléfono:</strong> ${branch.phone || 'No especificado'}</p>
      <p><strong>Estado:</strong> ${branch.is_active ? 'Activa' : 'Inactiva'}</p>
      <p><strong>Creado:</strong> ${new Date(branch.created_at).toLocaleString()}</p>
    `,
    icon: 'info'
  })
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.page-title { margin: 0; }
</style>