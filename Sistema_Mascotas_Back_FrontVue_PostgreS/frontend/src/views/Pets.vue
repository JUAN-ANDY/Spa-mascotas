<template>
  <div class="pets-page">
    <div class="page-header">
      <h2 class="page-title">
        {{ authStore.isClient ? 'Mis Mascotas' : 'Gestión de Mascotas' }}
      </h2>
      <button class="btn btn-primary" @click="openCreateModal">
        <i class="bi bi-plus-lg"></i> 
        {{ authStore.isClient ? 'Registrar Mascota' : 'Nueva Mascota' }}
      </button>
    </div>

    <!-- Filtros (solo admin/recepcion/groomer) -->
    <div class="card mb-3" v-if="!authStore.isClient">
      <div class="card-body">
        <div class="row">
          <div class="col-4">
            <input v-model="search" class="form-control" placeholder="Buscar mascota..." @input="debounceSearch">
          </div>
          <div class="col-4">
            <select v-model="filterSpecies" class="form-select" @change="loadPets">
              <option value="">Todas las especies</option>
              <option value="Perro">Perro</option>
              <option value="Gato">Gato</option>
            </select>
          </div>
          <div class="col-4">
            <select v-model="filterSize" class="form-select" @change="loadPets">
              <option value="">Todos los tamaños</option>
              <option value="Pequeño">Pequeño</option>
              <option value="Mediano">Mediano</option>
              <option value="Grande">Grande</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Grid de Mascotas -->
    <div v-if="loading" class="text-center py-4">
      <Loading />
    </div>

    <!-- Sin mascotas -->
    <div v-else-if="pets.length === 0" class="empty-state">
      <span class="empty-icon">🐾</span>
      <h3>No hay mascotas registradas</h3>
      <p>{{ authStore.isClient ? '¡Registra a tu primera mascota!' : 'No se encontraron mascotas' }}</p>
      <button class="btn btn-primary mt-3" @click="openCreateModal">
        <i class="bi bi-plus-lg"></i> {{ authStore.isClient ? 'Registrar Mascota' : 'Nueva Mascota' }}
      </button>
    </div>

    <!-- Grid de mascotas -->
    <div v-else class="pets-grid">
      <div v-for="pet in pets" :key="pet.id" class="pet-card">
        <div class="pet-icon">{{ getPetEmoji(pet.species) }}</div>
        <h3>{{ pet.name }}</h3>
        <p class="text-muted">{{ pet.breed || pet.species }}</p>
        <span class="badge badge-info">{{ pet.size || 'Tamaño no especificado' }}</span>
        <!-- ⬇️ MOSTRAR DUEÑO SOLO PARA ADMIN/RECEPCION/GROOMER ⬇️ -->
        <p v-if="!authStore.isClient && pet.owner_name" class="pet-owner">
          <i class="bi bi-person"></i> {{ pet.owner_name }}
        </p>
        <div class="pet-actions mt-2">
          <button class="btn btn-sm btn-warning" @click="openEditModal(pet)"><i class="bi bi-pencil"></i> Editar</button>
          <button class="btn btn-sm btn-danger" @click="deletePet(pet.id)"><i class="bi bi-trash"></i> Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div class="pagination-container" v-if="totalPages > 1">
      <button :disabled="page === 1" @click="changePage(page - 1)">«</button>
      <button v-for="p in getVisiblePages()" :key="p" :class="{ active: p === page }" @click="changePage(p)">{{ p }}</button>
      <button :disabled="page === totalPages" @click="changePage(page + 1)">»</button>
    </div>

    <!-- ============================================ -->
    <!-- MODAL CREAR/EDITAR MASCOTA                    -->
    <!-- ============================================ -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content pet-modal">
        <div class="modal-header">
          <h3><i class="bi bi-heart"></i> {{ modalTitle }}</h3>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="savePet">

            <!-- ⬇️⬇️⬇️ SECCIÓN CLIENTE (CORREGIDA) ⬇️⬇️⬇️ -->
            
            <!-- SI ES ADMIN/RECEPCION/GROOMER: Selector de cliente -->
            <div v-if="!authStore.isClient" class="form-group">
              <label class="form-label">Cliente *</label>
              <select v-model="form.client_id" class="form-select" required>
                <option value="">-- Seleccionar cliente --</option>
                <option v-for="c in clients" :key="c.id" :value="c.id">
                  {{ c.first_name }} {{ c.last_name }} ({{ c.email }})
                </option>
              </select>
            </div>

            <!-- SI ES CLIENTE: Mostrar su nombre (campo oculto con su ID) -->
            <div v-else class="client-info-box">
              <i class="bi bi-person-check"></i>
              <div>
                <strong>Cliente:</strong> {{ authStore.userName }}
                <br><small class="text-muted">{{ authStore.userEmail }}</small>
              </div>
              <!-- Campo oculto para enviar el client_id -->
              <input type="hidden" v-model="form.client_id" />
            </div>

            <!-- Nombre de la mascota -->
            <div class="form-group mt-3">
              <label class="form-label">Nombre de la Mascota *</label>
              <input v-model="form.name" class="form-control" placeholder="Ej: Max, Luna, Rocky..." required>
            </div>

            <div class="row">
              <div class="col-6">
                <div class="form-group">
                  <label class="form-label">Especie *</label>
                  <select v-model="form.species" class="form-select" required>
                    <option value="">Seleccionar</option>
                    <option value="Perro">🐕 Perro</option>
                    <option value="Gato">🐱 Gato</option>
                    <option value="Ave">🐦 Ave</option>
                    <option value="Conejo">🐰 Conejo</option>
                    <option value="Otro">🐾 Otro</option>
                  </select>
                </div>
              </div>
              <div class="col-6">
                <div class="form-group">
                  <label class="form-label">Raza</label>
                  <input v-model="form.breed" class="form-control" placeholder="Ej: Golden Retriever">
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-6">
                <div class="form-group">
                  <label class="form-label">Tamaño</label>
                  <select v-model="form.size" class="form-select">
                    <option value="">Seleccionar</option>
                    <option value="Pequeño">Pequeño</option>
                    <option value="Mediano">Mediano</option>
                    <option value="Grande">Grande</option>
                    <option value="Gigante">Gigante</option>
                  </select>
                </div>
              </div>
              <div class="col-6">
                <div class="form-group">
                  <label class="form-label">Temperamento</label>
                  <input v-model="form.temperament" class="form-control" placeholder="Ej: Amigable, Juguetón...">
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Alergias</label>
              <textarea v-model="form.allergies" class="form-control" rows="2" placeholder="Ej: Polen, ciertos alimentos..."></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Restricciones</label>
              <textarea v-model="form.restrictions" class="form-control" rows="2" placeholder="Ej: No mojar orejas, usar shampoo especial..."></textarea>
            </div>

            <div class="form-group">
              <label class="form-check-label">
                <input type="checkbox" v-model="form.vaccines_up_to_date" class="mr-2">
                ¿Vacunas al día?
              </label>
            </div>

          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
          <button class="btn btn-primary" @click="savePet" :disabled="saving">
            <span v-if="saving" class="spinner-small"></span>
            <span v-else><i class="bi bi-check-lg"></i> {{ editingId ? 'Actualizar' : 'Registrar' }} Mascota</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '../store'
import { petsAPI, clientsAPI } from '../services/api'
import Loading from '../components/common/Loading.vue'
import Swal from 'sweetalert2'

const authStore = useAuthStore()

// ============================================
// DATOS
// ============================================
const pets = ref([])
const clients = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const filterSpecies = ref('')
const filterSize = ref('')
const page = ref(1)
const totalPages = ref(0)
const clientId = ref(null) // ID del cliente (para rol Cliente)

// Modal
const showModal = ref(false)
const modalTitle = ref('')
const editingId = ref(null)

const form = reactive({
  client_id: '',
  name: '',
  species: '',
  breed: '',
  size: '',
  temperament: '',
  allergies: '',
  restrictions: '',
  vaccines_up_to_date: false
})

let searchTimeout

// ============================================
// CARGAR DATOS
// ============================================
onMounted(async () => {
  // Cargar clientes solo si NO es cliente
  if (!authStore.isClient) {
    await loadClients()
  } else {
    // Si es cliente, obtener su client_id
    await loadMyClientId()
  }
  loadPets()
})

async function loadClients() {
  try {
    const { data } = await clientsAPI.getAll({ limit: 200 })
    clients.value = data.data || data.clients || []
    console.log('✅ Clientes cargados:', clients.value.length)
  } catch (e) { console.error('Error cargando clientes:', e) }
}

// ⬇️⬇️⬇️ OBTENER CLIENT_ID DEL CLIENTE ACTUAL ⬇️⬇️⬇️
async function loadMyClientId() {
  try {
    const { data } = await clientsAPI.getAll({ 
      search: authStore.userEmail, 
      limit: 1 
    })
    const foundClients = data.data || data.clients || []
    if (foundClients.length > 0) {
      clientId.value = foundClients[0].id
      form.client_id = foundClients[0].id
      console.log('✅ Cliente ID encontrado:', clientId.value)
    } else {
      // Si no existe el perfil de cliente, crearlo automáticamente
      console.log('⚠️ Creando perfil de cliente...')
      try {
        const createResult = await clientsAPI.create({
          email: authStore.user?.email,
          first_name: authStore.user?.first_name || 'Cliente',
          last_name: authStore.user?.last_name || 'Nuevo',
          phone: authStore.user?.phone || null
        })
        // Intentar obtener el ID del cliente creado
        const newClientId = createResult.data?.client?.id || createResult.data?.id
        if (newClientId) {
          clientId.value = newClientId
          form.client_id = newClientId
          console.log('✅ Cliente creado con ID:', newClientId)
        }
      } catch (createError) {
        console.error('Error creando cliente:', createError)
      }
    }
  } catch (e) { 
    console.error('Error buscando cliente:', e) 
  }
}

async function loadPets() {
  loading.value = true
  try {
    if (authStore.isClient && clientId.value) {
      // Cliente: solo sus mascotas
      const { data } = await petsAPI.getByClient(clientId.value)
      pets.value = data.pets || []
    } else {
      // Admin/Recepción/Groomer: todas las mascotas con filtros
      const { data } = await petsAPI.getAll({
        search: search.value,
        species: filterSpecies.value,
        size: filterSize.value,
        page: page.value,
        limit: 12
      })
      pets.value = data.data || data.pets || []
      totalPages.value = data.pagination?.totalPages || 0
    }
    console.log('✅ Mascotas cargadas:', pets.value.length)
  } catch (e) { console.error('Error:', e) }
  finally { loading.value = false }
}

function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 1; loadPets() }, 400)
}

function changePage(p) { page.value = p; loadPets() }
function getVisiblePages() { 
  const pages = []
  for (let i = Math.max(1, page.value - 2); i <= Math.min(totalPages.value, page.value + 2); i++) pages.push(i)
  return pages 
}

// ============================================
// MODAL
// ============================================
function openCreateModal() {
  modalTitle.value = 'Registrar Nueva Mascota'
  editingId.value = null
  form.name = ''
  form.species = ''
  form.breed = ''
  form.size = ''
  form.temperament = ''
  form.allergies = ''
  form.restrictions = ''
  form.vaccines_up_to_date = false
  
  // ⬇️ ESTABLECER CLIENT_ID SEGÚN ROL ⬇️
  if (authStore.isClient) {
    form.client_id = clientId.value || ''
  } else {
    form.client_id = ''
  }
  
  showModal.value = true
}

function openEditModal(pet) {
  modalTitle.value = 'Editar Mascota'
  editingId.value = pet.id
  form.name = pet.name || ''
  form.species = pet.species || ''
  form.breed = pet.breed || ''
  form.size = pet.size || ''
  form.temperament = pet.temperament || ''
  form.allergies = pet.allergies || ''
  form.restrictions = pet.restrictions || ''
  form.vaccines_up_to_date = pet.vaccines_up_to_date || false
  
  // ⬇️ ESTABLECER CLIENT_ID ⬇️
  if (authStore.isClient) {
    form.client_id = clientId.value || pet.client_id || ''
  } else {
    form.client_id = pet.client_id || ''
  }
  
  showModal.value = true
}

function closeModal() { showModal.value = false }

// ============================================
// GUARDAR
// ============================================
async function savePet() {
  if (!form.name || !form.species) {
    Swal.fire({ icon: 'warning', title: 'Completa los campos requeridos', text: 'Nombre y especie son obligatorios' })
    return
  }

  if (!form.client_id) {
    Swal.fire({ icon: 'warning', title: 'Cliente requerido', text: 'Selecciona un cliente para esta mascota' })
    return
  }

  saving.value = true
  try {
    const petData = {
      client_id: form.client_id,
      name: form.name.trim(),
      species: form.species,
      breed: form.breed || null,
      size: form.size || null,
      temperament: form.temperament || null,
      allergies: form.allergies || null,
      restrictions: form.restrictions || null,
      vaccines_up_to_date: form.vaccines_up_to_date
    }

    if (editingId.value) {
      await petsAPI.update(editingId.value, petData)
      Swal.fire({ icon: 'success', title: 'Mascota actualizada', timer: 1500, showConfirmButton: false })
    } else {
      await petsAPI.create(petData)
      Swal.fire({ icon: 'success', title: '¡Mascota Registrada!', timer: 1500, showConfirmButton: false })
    }
    closeModal()
    loadPets()
  } catch (error) {
    console.error('Error guardando mascota:', error)
    Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al guardar la mascota' })
  } finally {
    saving.value = false
  }
}

// ============================================
// ELIMINAR
// ============================================
async function deletePet(id) {
  const result = await Swal.fire({
    title: '¿Eliminar mascota?',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  })
  if (result.isConfirmed) {
    try {
      await petsAPI.delete(id)
      Swal.fire({ icon: 'success', title: 'Mascota eliminada', timer: 1500, showConfirmButton: false })
      loadPets()
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar la mascota' })
    }
  }
}

// ============================================
// UTILIDADES
// ============================================
function getPetEmoji(species) {
  const map = { 'Perro': '🐕', 'Gato': '🐱', 'Ave': '🐦', 'Conejo': '🐰' }
  return map[species] || '🐾'
}
</script>

<style scoped>
/* ============================================ */
/* PETS PAGE                                    */
/* ============================================ */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.5rem; }
.page-title { margin: 0; color: #5a5c69; }

.card { background: white; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 1rem; }
.card-body { padding: 1.25rem; }

/* Grid */
.pets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem; }
.pet-card {
  background: white; border-radius: 12px; padding: 1.5rem; text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06); border: 1px solid #e9ecef;
  transition: all 0.3s;
}
.pet-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
.pet-icon { font-size: 3rem; margin-bottom: 0.5rem; }
.pet-card h3 { margin: 0 0 0.25rem; color: #1a1a2e; }
.pet-owner { color: #4e73df; font-size: 0.85rem; margin-top: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 4px; }
.pet-actions { display: flex; gap: 0.5rem; justify-content: center; }

/* Empty */
.empty-state {
  text-align: center; padding: 4rem 2rem; background: white;
  border-radius: 12px; border: 2px dashed #e3e6f0;
}
.empty-icon { font-size: 4rem; display: block; margin-bottom: 1rem; }
.empty-state h3 { color: #5a5c69; margin: 0 0 0.5rem; }
.empty-state p { color: #858796; margin: 0 0 1.5rem; }

/* ⬇️⬇️⬇️ CAJA INFORMATIVA DEL CLIENTE ⬇️⬇️⬇️ */
.client-info-box {
  background: #e8f0fe; border: 2px solid #c5d5f7;
  border-radius: 10px; padding: 1rem 1.25rem;
  display: flex; align-items: center; gap: 12px;
  color: #4e73df;
}
.client-info-box i { font-size: 2rem; }
.client-info-box strong { display: block; font-size: 1rem; }
.client-info-box small { font-size: 0.8rem; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
.modal-content { background: white; border-radius: 12px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.4); animation: slideUp 0.3s ease; }
.pet-modal { max-width: 600px; }
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
.form-check-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem; }
.mt-3 { margin-top: 1rem; }
.mt-2 { margin-top: 0.5rem; }
.mr-2 { margin-right: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }

/* Paginación */
.pagination-container { display: flex; justify-content: center; gap: 4px; margin-top: 1.5rem; }
.pagination-container button { padding: 0.35rem 0.7rem; border: 1px solid #e3e6f0; background: white; cursor: pointer; border-radius: 4px; }
.pagination-container button.active { background: #4e73df; color: white; border-color: #4e73df; }
.pagination-container button:disabled { opacity: 0.4; cursor: not-allowed; }

/* Botones */
.btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; display: inline-flex; align-items: center; gap: 5px; font-size: 0.85rem; transition: all 0.2s; }
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-primary { background: #4e73df; color: white; }
.btn-warning { background: #f6c23e; color: #5a5c69; }
.btn-danger { background: #e74a3b; color: white; }
.btn-secondary { background: #858796; color: white; }
.btn-sm { padding: 0.3rem 0.55rem; font-size: 0.78rem; }
.badge { padding: 0.2em 0.55em; border-radius: 50px; font-size: 0.72rem; font-weight: 600; }
.badge-info { background: #36b9cc; color: white; }

.text-center { text-align: center; }
.text-muted { color: #858796; }
.py-4 { padding: 2rem 0; }

.spinner-small { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) { .pets-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); } }
@media (max-width: 480px) { .page-header { flex-direction: column; align-items: stretch; } .page-header .btn { justify-content: center; } }
</style>