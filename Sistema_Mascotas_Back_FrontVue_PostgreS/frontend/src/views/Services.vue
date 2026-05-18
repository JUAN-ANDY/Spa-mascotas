<template>
  <div class="services-page">
    <div class="page-header">
      <h2 class="page-title">Servicios de Grooming</h2>
      <button class="btn btn-primary" @click="openCreateModal">
        <i class="bi bi-plus-lg"></i> Nuevo Servicio
      </button>
    </div>

    <div class="services-grid">
      <div v-for="service in services" :key="service.id" class="service-card">
        <div class="service-icon">
          <i class="bi bi-scissors"></i>
        </div>
        <div class="service-info">
          <h3>{{ service.name }}</h3>
          <p>{{ service.description || 'Sin descripción' }}</p>
          <div class="service-details">
            <span><i class="bi bi-clock"></i> {{ service.base_duration_minutes }} min</span>
            <span class="price">Bs. {{ parseFloat(service.base_price).toFixed(2) }}</span>
          </div>
          <span :class="service.is_active ? 'badge badge-success' : 'badge badge-danger'">
            {{ service.is_active ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
        <div class="service-actions">
          <button class="btn btn-sm btn-warning" @click="openEditModal(service)">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-danger" @click="deleteService(service.id)">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <Modal :show="showModal" :title="modalTitle" @close="closeModal">
      <form @submit.prevent="saveService">
        <div class="form-group">
          <label class="form-label">Nombre *</label>
          <input v-model="form.name" class="form-control" required>
        </div>
        <div class="form-group">
          <label class="form-label">Descripción</label>
          <textarea v-model="form.description" class="form-control" rows="2"></textarea>
        </div>
        <div class="row">
          <div class="col-6">
            <div class="form-group">
              <label class="form-label">Duración (min) *</label>
              <input v-model.number="form.base_duration_minutes" type="number" class="form-control" min="1" required>
            </div>
          </div>
          <div class="col-6">
            <div class="form-group">
              <label class="form-label">Precio (Bs.) *</label>
              <input v-model.number="form.base_price" type="number" class="form-control" step="0.01" min="0" required>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-check-label">
            <input type="checkbox" v-model="form.allows_overlap" class="mr-2">
            Permite solapamiento con otros servicios
          </label>
        </div>
        <div class="form-group">
          <label class="form-check-label">
            <input type="checkbox" v-model="form.is_active" class="mr-2">
            Servicio activo
          </label>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
        <button class="btn btn-primary" @click="saveService">Guardar</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { servicesAPI } from '../services/api'
import Modal from '../components/common/Modal.vue'
import Swal from 'sweetalert2'

const services = ref([])
const showModal = ref(false)
const modalTitle = ref('')
const editingId = ref(null)
const form = ref({
  name: '',
  description: '',
  base_duration_minutes: 60,
  base_price: 0,
  allows_overlap: false,
  is_active: true
})

onMounted(() => loadServices())

async function loadServices() {
  try {
    const { data } = await servicesAPI.getAll()
    services.value = data.services || []
  } catch (error) {
    console.error('Error:', error)
  }
}

function openCreateModal() {
  modalTitle.value = 'Nuevo Servicio'
  editingId.value = null
  form.value = { name: '', description: '', base_duration_minutes: 60, base_price: 0, allows_overlap: false, is_active: true }
  showModal.value = true
}

function openEditModal(service) {
  modalTitle.value = 'Editar Servicio'
  editingId.value = service.id
  form.value = { ...service }
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function saveService() {
  try {
    if (editingId.value) {
      await servicesAPI.update(editingId.value, form.value)
      Swal.fire({ icon: 'success', title: 'Servicio actualizado', timer: 1500, showConfirmButton: false })
    } else {
      await servicesAPI.create(form.value)
      Swal.fire({ icon: 'success', title: 'Servicio creado', timer: 1500, showConfirmButton: false })
    }
    closeModal()
    loadServices()
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message })
  }
}

async function deleteService(id) {
  const result = await Swal.fire({
    title: '¿Eliminar servicio?',
    icon: 'warning',
    showCancelButton: true
  })
  if (result.isConfirmed) {
    await servicesAPI.delete(id)
    Swal.fire({ icon: 'success', title: 'Servicio eliminado', timer: 1500, showConfirmButton: false })
    loadServices()
  }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-title { margin: 0; }
.services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1rem; }
.service-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  position: relative;
  transition: box-shadow 0.2s;
}
.service-card:hover { box-shadow: var(--shadow); }
.service-icon {
  font-size: 2.5rem;
  color: var(--primary);
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f0fe;
  border-radius: 50%;
}
.service-info { flex: 1; }
.service-info h3 { margin: 0 0 0.25rem; font-size: 1.1rem; }
.service-info p { color: #666; font-size: 0.85rem; margin: 0.25rem 0; }
.service-details { display: flex; gap: 1rem; margin: 0.5rem 0; font-size: 0.9rem; }
.price { font-weight: 600; color: var(--primary); }
.service-actions { position: absolute; top: 0.5rem; right: 0.5rem; }
</style>