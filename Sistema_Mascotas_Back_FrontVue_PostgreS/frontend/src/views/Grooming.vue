<template>
  <div class="grooming-page">
    <div class="page-header">
      <h2 class="page-title">Registros de Grooming</h2>
      <span class="badge badge-info">{{ inProgressAppointments.length }} citas en proceso</span>
    </div>

    <!-- Citas en Proceso -->
    <div class="card mb-4">
      <div class="card-header">
        <i class="bi bi-scissors"></i> Citas en Proceso
      </div>
      <div class="card-body">
        <div v-if="loadingAppointments" class="text-center py-4">
          <Loading />
        </div>
        <div v-else-if="inProgressAppointments.length === 0" class="text-center py-4 text-muted">
          <i class="bi bi-inbox" style="font-size:3rem;display:block;margin-bottom:0.5rem;"></i>
          No hay citas en proceso
        </div>
        <div v-else class="appointments-list">
          <div v-for="appt in inProgressAppointments" :key="appt.id" class="appointment-card">
            <div class="appt-info">
              <div class="appt-pet">
                <span class="pet-icon">🐾</span>
                <div>
                  <strong>{{ appt.pet_name }}</strong>
                  <small class="text-muted">{{ appt.pet_species }} {{ appt.pet_breed || '' }}</small>
                </div>
              </div>
              <div class="appt-details">
                <span><i class="bi bi-person"></i> {{ appt.client_name }}</span>
                <span><i class="bi bi-tag"></i> {{ appt.service_name }}</span>
                <span><i class="bi bi-clock"></i> {{ formatTime(appt.scheduled_start) }}</span>
              </div>
            </div>
            <div class="appt-actions">
              <button class="btn btn-sm btn-success" @click="openGroomingModal(appt)">
                <i class="bi bi-clipboard2-check"></i> Iniciar Registro
              </button>
              <button class="btn btn-sm btn-info" @click="openPhotosModal(appt)">
                <i class="bi bi-camera"></i> Fotos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Historial de Registros -->
    <div class="card">
      <div class="card-header">
        <i class="bi bi-clock-history"></i> Historial de Grooming
      </div>
      <div class="card-body">
        <div v-if="loadingHistory" class="text-center py-4">
          <Loading />
        </div>
        <div v-else-if="groomingHistory.length === 0" class="text-center py-4 text-muted">
          No hay registros de grooming
        </div>
        <div v-else class="history-list">
          <div v-for="record in groomingHistory" :key="record.id" class="history-card">
            <div class="history-header">
              <div class="history-pet">
                <span class="pet-emoji">🐾</span>
                <div>
                  <strong>{{ record.pet_name || 'Mascota' }}</strong>
                  <small>{{ formatDate(record.scheduled_start) }}</small>
                </div>
              </div>
              <span :class="getStatusBadge(record.status)">{{ formatStatus(record.status) }}</span>
            </div>
            <div class="history-body">
              <div class="service-tags">
                <span v-if="record.chk_bath" class="tag tag-bath">🛁 Baño</span>
                <span v-if="record.chk_cut" class="tag tag-cut">✂️ Corte</span>
                <span v-if="record.chk_nails" class="tag tag-nails">💅 Uñas</span>
                <span v-if="record.chk_ears" class="tag tag-ears">👂 Oídos</span>
                <span v-if="record.chk_glands" class="tag tag-glands">🏥 Glándulas</span>
                <span v-if="record.chk_perfume" class="tag tag-perfume">🌸 Perfume</span>
              </div>
              <div class="history-photos" v-if="record.photos && record.photos.length > 0">
                <span class="photo-count"><i class="bi bi-images"></i> {{ record.photos.length }} fotos</span>
              </div>
            </div>
            <div class="history-actions">
              <button class="btn btn-sm btn-info" @click="viewRecordPhotos(record)">
                <i class="bi bi-eye"></i> Ver Fotos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- MODAL DE REGISTRO DE GROOMING                 -->
    <!-- ============================================ -->
    <div v-if="showGroomingModal" class="modal-overlay" @click.self="closeGroomingModal">
      <div class="modal-content grooming-modal">
        <div class="modal-header">
          <h3><i class="bi bi-clipboard2-pulse"></i> Registro de Grooming</h3>
          <button class="modal-close" @click="closeGroomingModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="appointment-summary">
            <div class="summary-item"><strong>Mascota:</strong> {{ selectedAppointment?.pet_name }}</div>
            <div class="summary-item"><strong>Cliente:</strong> {{ selectedAppointment?.client_name }}</div>
            <div class="summary-item"><strong>Servicio:</strong> {{ selectedAppointment?.service_name }}</div>
          </div>
          <hr>
          <h5>📋 Estado de la Mascota</h5>
          <div class="check-row">
            <label class="check-label"><input type="checkbox" v-model="groomingForm.knots_present"><span>Nudos</span></label>
            <label class="check-label"><input type="checkbox" v-model="groomingForm.fleas_present"><span>Pulgas</span></label>
            <label class="check-label"><input type="checkbox" v-model="groomingForm.wounds_present"><span>Heridas</span></label>
          </div>
          <div class="form-group mt-3">
            <label class="form-label">Temperamento Observado</label>
            <select v-model="groomingForm.temperament_observed" class="form-select">
              <option value="">Seleccionar</option>
              <option value="Tranquilo">😊 Tranquilo</option>
              <option value="Nervioso">😰 Nervioso</option>
              <option value="Agresivo">😠 Agresivo</option>
              <option value="Juguetón">🎾 Juguetón</option>
              <option value="Cooperativo">🤝 Cooperativo</option>
            </select>
          </div>
          <hr>
          <h5>✅ Servicios Realizados</h5>
          <div class="services-grid">
            <label class="service-check" :class="{ active: groomingForm.chk_bath }">
              <input type="checkbox" v-model="groomingForm.chk_bath"><span class="service-icon">🛁</span><span>Baño</span>
            </label>
            <label class="service-check" :class="{ active: groomingForm.chk_cut }">
              <input type="checkbox" v-model="groomingForm.chk_cut"><span class="service-icon">✂️</span><span>Corte</span>
            </label>
            <label class="service-check" :class="{ active: groomingForm.chk_nails }">
              <input type="checkbox" v-model="groomingForm.chk_nails"><span class="service-icon">💅</span><span>Uñas</span>
            </label>
            <label class="service-check" :class="{ active: groomingForm.chk_ears }">
              <input type="checkbox" v-model="groomingForm.chk_ears"><span class="service-icon">👂</span><span>Oídos</span>
            </label>
            <label class="service-check" :class="{ active: groomingForm.chk_glands }">
              <input type="checkbox" v-model="groomingForm.chk_glands"><span class="service-icon">🏥</span><span>Glándulas</span>
            </label>
            <label class="service-check" :class="{ active: groomingForm.chk_perfume }">
              <input type="checkbox" v-model="groomingForm.chk_perfume"><span class="service-icon">🌸</span><span>Perfume</span>
            </label>
          </div>
          <hr>
          <div class="form-group">
            <label class="form-label">Observaciones</label>
            <textarea v-model="groomingForm.observations" class="form-control" rows="2" placeholder="Observaciones..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Recomendaciones</label>
            <textarea v-model="groomingForm.recommendations" class="form-control" rows="2" placeholder="Recomendaciones..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Duración Real (minutos)</label>
            <input v-model.number="groomingForm.actual_duration" type="number" class="form-control" min="1">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeGroomingModal">Cancelar</button>
          <button class="btn btn-success" @click="saveGroomingRecord" :disabled="savingRecord">
            <span v-if="savingRecord" class="spinner-small"></span>
            <span v-else><i class="bi bi-check-lg"></i> Completar Servicio</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- MODAL DE FOTOS                               -->
    <!-- ============================================ -->
    <div v-if="showPhotosModal" class="modal-overlay" @click.self="closePhotosModal">
      <div class="modal-content photos-modal">
        <div class="modal-header">
          <h3><i class="bi bi-camera"></i> Fotos - {{ selectedAppointment?.pet_name }}</h3>
          <button class="modal-close" @click="closePhotosModal">&times;</button>
        </div>
        <div class="modal-body">
          
          <!-- Subir Foto -->
          <div class="upload-section">
            <h5>📤 Subir Nueva Foto</h5>
            
            <div class="form-group">
              <label class="form-label">Tipo de Foto *</label>
              <select v-model="photoForm.photo_type" class="form-select">
                <option value="Antes">📸 Antes del servicio</option>
                <option value="Despues">✨ Después del servicio</option>
                <option value="Detalle">🔍 Detalle</option>
              </select>
            </div>

            <div class="upload-tabs">
              <button :class="{ active: uploadMethod === 'file' }" @click="uploadMethod = 'file'" type="button">
                <i class="bi bi-folder"></i> Archivo Local
              </button>
              <button :class="{ active: uploadMethod === 'url' }" @click="uploadMethod = 'url'" type="button">
                <i class="bi bi-link-45deg"></i> URL
              </button>
            </div>

            <div v-if="uploadMethod === 'file'" class="upload-method-content">
              <div class="file-upload-area" 
                @dragover.prevent="dragOver = true" 
                @dragleave.prevent="dragOver = false"
                @drop.prevent="handleFileDrop"
                :class="{ 'drag-over': dragOver }"
              >
                <input type="file" ref="fileInput" @change="handleFileSelect" accept="image/*" style="display:none;">
                <div v-if="!uploadPreview" class="file-placeholder">
                  <i class="bi bi-cloud-upload" style="font-size:3rem;color:#adb5bd;"></i>
                  <p class="mt-2">Arrastra una imagen aquí</p>
                  <p class="text-muted">o</p>
                  <button type="button" class="btn btn-sm btn-outline-primary" @click="$refs.fileInput.click()">
                    <i class="bi bi-folder"></i> Seleccionar Archivo
                  </button>
                  <small class="text-muted mt-2">Formatos: JPG, PNG, WEBP. Máx: 5MB</small>
                </div>
                <div v-else class="file-preview">
                  <img :src="uploadPreview" alt="Preview" class="preview-img">
                  <div class="preview-info">
                    <span>{{ uploadFileName }}</span>
                    <button type="button" class="btn btn-sm btn-danger" @click="clearFileUpload">
                      <i class="bi bi-x"></i> Quitar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="uploadMethod === 'url'" class="upload-method-content">
              <div class="form-group">
                <label class="form-label">URL de la Imagen *</label>
                <input v-model="photoForm.photo_url" type="url" class="form-control" placeholder="https://ejemplo.com/foto.jpg">
                <small class="text-muted">Pega la URL de la imagen (Imgur, Cloudinary, etc.)</small>
              </div>
            </div>

            <button class="btn btn-primary mt-3" @click="uploadPhoto" :disabled="uploadingPhoto || !canUpload">
              <span v-if="uploadingPhoto" class="spinner-small"></span>
              <span v-else><i class="bi bi-cloud-upload"></i> Subir Foto</span>
            </button>

            <div v-if="uploadMessage" :class="['alert mt-3', uploadSuccess ? 'alert-success' : 'alert-danger']">
              {{ uploadMessage }}
            </div>
          </div>

          <hr>

          <!-- Galería de Fotos -->
          <div class="photos-gallery">
            <h5>📷 Galería de Fotos</h5>
            
            <div class="photo-tabs">
              <button :class="{ active: photoFilter === 'all' }" @click="photoFilter = 'all'">Todas ({{ allPhotos.length }})</button>
              <button :class="{ active: photoFilter === 'Antes' }" @click="photoFilter = 'Antes'">📸 Antes ({{ photosAntes.length }})</button>
              <button :class="{ active: photoFilter === 'Despues' }" @click="photoFilter = 'Despues'">✨ Después ({{ photosDespues.length }})</button>
              <button :class="{ active: photoFilter === 'Detalle' }" @click="photoFilter = 'Detalle'">🔍 Detalle ({{ photosDetalle.length }})</button>
            </div>

            <div v-if="filteredPhotos.length === 0" class="text-center py-4 text-muted">
              <i class="bi bi-camera" style="font-size:3rem;display:block;margin-bottom:0.5rem;"></i>
              No hay fotos {{ photoFilter !== 'all' ? 'de ' + photoFilter.toLowerCase() : 'disponibles' }}
            </div>
            <div v-else class="photos-grid">
              <!-- Tarjeta de foto con confirmación de eliminación -->
              <div v-for="photo in filteredPhotos" :key="photo.id" class="photo-card-wrapper">
                <div class="photo-card" @click="openPhotoViewer(photo)">
                  <img :src="photo.photo_url" :alt="photo.photo_type" class="photo-img" @error="handlePhotoError">
                  <div class="photo-overlay">
                    <span class="photo-type-badge">
                      {{ photo.photo_type === 'Antes' ? '📸' : photo.photo_type === 'Despues' ? '✨' : '🔍' }}
                      {{ photo.photo_type }}
                    </span>
                    <small>{{ formatDate(photo.uploaded_at) }}</small>
                  </div>
                </div>
                
                <!-- Botón eliminar -->
                <button class="photo-delete-btn" @click.stop="toggleDeleteConfirm(photo.id)" title="Eliminar foto">
                  <i class="bi bi-trash"></i>
                </button>

                <!-- Confirmación de eliminación (aparece encima de la foto) -->
                <div v-if="deleteConfirmId === photo.id" class="delete-confirm-overlay" @click.stop>
                  <div class="delete-confirm-box">
                    <p><i class="bi bi-exclamation-triangle"></i> ¿Eliminar esta foto?</p>
                    <div class="delete-confirm-actions">
                      <button class="btn btn-sm btn-danger" @click.stop="confirmDeletePhoto(photo)">
                        <i class="bi bi-check"></i> Sí, eliminar
                      </button>
                      <button class="btn btn-sm btn-secondary" @click.stop="cancelDeleteConfirm">
                        <i class="bi bi-x"></i> Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closePhotosModal">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- VISOR DE FOTO AMPLIADA                        -->
    <!-- ============================================ -->
    <div v-if="showPhotoViewer" class="modal-overlay photo-viewer-overlay" @click.self="closePhotoViewer">
      <div class="photo-viewer">
        <button class="viewer-close" @click="closePhotoViewer">&times;</button>
        <button class="viewer-nav viewer-prev" @click="prevPhoto" v-if="filteredPhotos.length > 1">‹</button>
        <img :src="currentPhoto?.photo_url" :alt="currentPhoto?.photo_type" class="viewer-img">
        <button class="viewer-nav viewer-next" @click="nextPhoto" v-if="filteredPhotos.length > 1">›</button>
        <div class="viewer-info">
          <span>{{ currentPhoto?.photo_type === 'Antes' ? '📸 Antes' : currentPhoto?.photo_type === 'Despues' ? '✨ Después' : '🔍 Detalle' }}</span>
          <small>{{ formatDate(currentPhoto?.uploaded_at) }}</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { appointmentsAPI, groomingAPI } from '../services/api'
import Loading from '../components/common/Loading.vue'
import Swal from 'sweetalert2'

// ============================================
// DATOS PRINCIPALES
// ============================================
const inProgressAppointments = ref([])
const groomingHistory = ref([])
const loadingAppointments = ref(false)
const loadingHistory = ref(false)

// ============================================
// MODAL DE GROOMING
// ============================================
const showGroomingModal = ref(false)
const selectedAppointment = ref(null)
const savingRecord = ref(false)

const groomingForm = reactive({
  knots_present: false, fleas_present: false, wounds_present: false,
  temperament_observed: '', chk_bath: true, chk_cut: false,
  chk_nails: false, chk_ears: false, chk_glands: false, chk_perfume: false,
  observations: '', recommendations: '', actual_duration: 60
})

// ============================================
// MODAL DE FOTOS
// ============================================
const showPhotosModal = ref(false)
const allPhotos = ref([])
const photoFilter = ref('all')
const uploadingPhoto = ref(false)
const currentRecordId = ref(null)
const uploadMethod = ref('file')
const dragOver = ref(false)
const fileInput = ref(null)
const uploadPreview = ref(null)
const uploadFileName = ref('')
const uploadFileData = ref(null)
const uploadMessage = ref('')
const uploadSuccess = ref(false)
const deleteConfirmId = ref(null) // ID de la foto con confirmación abierta

const photoForm = reactive({
  photo_type: 'Antes',
  photo_url: ''
})

const photosAntes = computed(() => allPhotos.value.filter(p => p.photo_type === 'Antes'))
const photosDespues = computed(() => allPhotos.value.filter(p => p.photo_type === 'Despues'))
const photosDetalle = computed(() => allPhotos.value.filter(p => p.photo_type === 'Detalle'))

const filteredPhotos = computed(() => {
  if (photoFilter.value === 'all') return allPhotos.value
  return allPhotos.value.filter(p => p.photo_type === photoFilter.value)
})

const canUpload = computed(() => {
  if (uploadMethod.value === 'file') return !!uploadFileData.value
  if (uploadMethod.value === 'url') return !!photoForm.photo_url.trim()
  return false
})

// ============================================
// VISOR DE FOTOS
// ============================================
const showPhotoViewer = ref(false)
const currentPhoto = ref(null)
const currentPhotoIndex = ref(0)

// ============================================
// CARGAR DATOS
// ============================================
onMounted(() => { loadAppointments(); loadHistory() })

async function loadAppointments() {
  loadingAppointments.value = true
  try {
    const { data } = await appointmentsAPI.getAll({ status: 'En_Proceso', limit: 50 })
    inProgressAppointments.value = data.data || data.appointments || []
  } catch (e) { console.error('Error:', e) }
  finally { loadingAppointments.value = false }
}

async function loadHistory() {
  loadingHistory.value = true
  try {
    const { data } = await appointmentsAPI.getAll({ status: 'Completada', limit: 30 })
    const completed = data.data || data.appointments || []
    const records = []
    for (const appt of completed) {
      try {
        const { data: gData } = await groomingAPI.getByAppointment(appt.id)
        if (gData.record) {
          records.push({ ...appt, ...gData.record, photos: gData.photos || [] })
        }
      } catch (e) { /* omitir */ }
    }
    groomingHistory.value = records
  } catch (e) { console.error('Error:', e) }
  finally { loadingHistory.value = false }
}

// ============================================
// MODAL DE GROOMING
// ============================================
function openGroomingModal(appt) {
  selectedAppointment.value = appt
  Object.assign(groomingForm, {
    knots_present: false, fleas_present: false, wounds_present: false,
    temperament_observed: '', chk_bath: true, chk_cut: false,
    chk_nails: false, chk_ears: false, chk_glands: false, chk_perfume: false,
    observations: '', recommendations: '', actual_duration: appt.base_duration_minutes || 60
  })
  showGroomingModal.value = true
}

function closeGroomingModal() { showGroomingModal.value = false; selectedAppointment.value = null }

async function saveGroomingRecord() {
  if (!selectedAppointment.value) return
  savingRecord.value = true
  try {
    await groomingAPI.createRecord({ appointment_id: selectedAppointment.value.id, ...groomingForm })
    Swal.fire({ icon: 'success', title: 'Servicio Completado', timer: 2500, showConfirmButton: false })
    closeGroomingModal()
    loadAppointments()
    loadHistory()
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al guardar' })
  } finally { savingRecord.value = false }
}

// ============================================
// MODAL DE FOTOS
// ============================================
async function openPhotosModal(appt) {
  selectedAppointment.value = appt
  showPhotosModal.value = true
  allPhotos.value = []
  photoFilter.value = 'all'
  resetUploadForm()

  try {
    const { data } = await groomingAPI.getByAppointment(appt.id)
    if (data.record) {
      currentRecordId.value = data.record.id
      allPhotos.value = data.photos || []
    }
  } catch (e) { console.error('Error cargando fotos:', e) }
}

function closePhotosModal() {
  showPhotosModal.value = false
  allPhotos.value = []
  currentRecordId.value = null
  deleteConfirmId.value = null
  resetUploadForm()
}

function resetUploadForm() {
  photoForm.photo_type = 'Antes'
  photoForm.photo_url = ''
  uploadPreview.value = null
  uploadFileName.value = ''
  uploadFileData.value = null
  uploadMessage.value = ''
  uploadSuccess.value = false
  uploadMethod.value = 'file'
}

// ============================================
// MANEJO DE ARCHIVOS
// ============================================
function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) processFile(file)
}

function handleFileDrop(event) {
  dragOver.value = false
  const file = event.dataTransfer.files[0]
  if (file) processFile(file)
}

function processFile(file) {
  if (!file.type.startsWith('image/')) {
    uploadMessage.value = 'Solo se permiten archivos de imagen (JPG, PNG, WEBP)'
    uploadSuccess.value = false
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    uploadMessage.value = 'La imagen no debe superar los 5MB'
    uploadSuccess.value = false
    return
  }
  uploadFileName.value = file.name
  uploadFileData.value = file
  uploadMessage.value = ''
  const reader = new FileReader()
  reader.onload = (e) => { uploadPreview.value = e.target.result }
  reader.readAsDataURL(file)
}

function clearFileUpload() {
  uploadPreview.value = null
  uploadFileName.value = ''
  uploadFileData.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ============================================
// SUBIR FOTO
// ============================================
async function uploadPhoto() {
  uploadMessage.value = ''

  if (!currentRecordId.value) {
    try {
      const { data } = await groomingAPI.getByAppointment(selectedAppointment.value.id)
      if (data.record) {
        currentRecordId.value = data.record.id
      } else {
        uploadMessage.value = 'Primero completa el registro de grooming'
        uploadSuccess.value = false
        return
      }
    } catch (e) {
      uploadMessage.value = 'Primero completa el registro de grooming'
      uploadSuccess.value = false
      return
    }
  }

  uploadingPhoto.value = true

  try {
    let photoUrl = ''

    if (uploadMethod.value === 'file' && uploadFileData.value) {
      photoUrl = await fileToBase64(uploadFileData.value)
    } else if (uploadMethod.value === 'url' && photoForm.photo_url.trim()) {
      photoUrl = photoForm.photo_url.trim()
    } else {
      uploadMessage.value = 'Selecciona un archivo o ingresa una URL'
      uploadSuccess.value = false
      uploadingPhoto.value = false
      return
    }

    await groomingAPI.uploadPhoto({
      record_id: currentRecordId.value,
      photo_url: photoUrl,
      photo_type: photoForm.photo_type
    })

    uploadMessage.value = '¡Foto subida exitosamente!'
    uploadSuccess.value = true
    resetUploadForm()

    const { data } = await groomingAPI.getByAppointment(selectedAppointment.value.id)
    allPhotos.value = data.photos || []

    setTimeout(() => { uploadMessage.value = '' }, 3000)
  } catch (error) {
    console.error('Error:', error)
    uploadMessage.value = error.response?.data?.message || 'Error al subir la foto'
    uploadSuccess.value = false
  } finally {
    uploadingPhoto.value = false
  }
}

// ============================================
// ELIMINAR FOTO (CORREGIDO - CONFIRMACIÓN IN-SITU)
// ============================================
function toggleDeleteConfirm(photoId) {
  // Si ya está abierto, cerrarlo; si no, abrirlo
  if (deleteConfirmId.value === photoId) {
    deleteConfirmId.value = null
  } else {
    deleteConfirmId.value = photoId
  }
}

function cancelDeleteConfirm() {
  deleteConfirmId.value = null
}

async function confirmDeletePhoto(photo) {
  try {
    // Llamar al backend para eliminar
    await groomingAPI.deletePhoto(photo.id)
    
    // Eliminar del array local
    allPhotos.value = allPhotos.value.filter(p => p.id !== photo.id)
    
    // Cerrar confirmación
    deleteConfirmId.value = null
    
    // Mostrar mensaje de éxito
    Swal.fire({
      icon: 'success',
      title: 'Foto eliminada',
      timer: 1500,
      showConfirmButton: false
    })
  } catch (error) {
    console.error('Error eliminando foto:', error)
    
    // Si el error es 404, la foto ya no existe en el servidor
    if (error.response?.status === 404) {
      allPhotos.value = allPhotos.value.filter(p => p.id !== photo.id)
      deleteConfirmId.value = null
      Swal.fire({
        icon: 'info',
        title: 'Foto eliminada',
        text: 'La foto ya no existía en el servidor',
        timer: 2000,
        showConfirmButton: false
      })
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo eliminar la foto'
      })
    }
  }
}

// ============================================
// VISOR DE FOTOS
// ============================================
function openPhotoViewer(photo) {
  if (deleteConfirmId.value) return // No abrir si hay confirmación activa
  currentPhoto.value = photo
  currentPhotoIndex.value = filteredPhotos.value.findIndex(p => p.id === photo.id)
  showPhotoViewer.value = true
}

function closePhotoViewer() {
  showPhotoViewer.value = false
  currentPhoto.value = null
}

function nextPhoto() {
  currentPhotoIndex.value = (currentPhotoIndex.value + 1) % filteredPhotos.value.length
  currentPhoto.value = filteredPhotos.value[currentPhotoIndex.value]
}

function prevPhoto() {
  currentPhotoIndex.value = (currentPhotoIndex.value - 1 + filteredPhotos.value.length) % filteredPhotos.value.length
  currentPhoto.value = filteredPhotos.value[currentPhotoIndex.value]
}

function handlePhotoError(e) {
  e.target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#f1f3f5" width="200" height="200"/><text x="100" y="110" text-anchor="middle" font-size="50">📷</text></svg>')
}

// ============================================
// VER FOTOS DEL HISTORIAL
// ============================================
async function viewRecordPhotos(record) {
  selectedAppointment.value = record
  showPhotosModal.value = true
  allPhotos.value = record.photos || []
  photoFilter.value = 'all'
  currentRecordId.value = record.id
}

// ============================================
// UTILIDADES
// ============================================
function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('es-BO', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatTime(date) {
  if (!date) return '-'
  return new Date(date).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
}

function formatStatus(status) {
  return status ? status.replace(/_/g, ' ') : ''
}

function getStatusBadge(status) {
  const map = {
    'Completada': 'badge badge-success',
    'En_Proceso': 'badge badge-info',
    'Pendiente': 'badge badge-warning',
    'Cancelada': 'badge badge-danger'
  }
  return map[status] || 'badge badge-secondary'
}
</script>

<style scoped>
/* ============================================ */
/* GROOMING PAGE                                */
/* ============================================ */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-title { margin: 0; color: #5a5c69; }
.card { background: white; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 1.5rem; }
.card-header { padding: 1rem 1.25rem; border-bottom: 1px solid #e3e6f0; font-weight: 600; color: #4e73df; display: flex; align-items: center; gap: 8px; }
.card-body { padding: 1.25rem; }

.appointments-list { display: flex; flex-direction: column; gap: 0.75rem; }
.appointment-card { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; background: #f8f9fc; border-radius: 10px; border: 1px solid #e9ecef; transition: all 0.2s; }
.appointment-card:hover { border-color: #4e73df; }
.appt-info { display: flex; align-items: center; gap: 2rem; }
.appt-pet { display: flex; align-items: center; gap: 10px; }
.pet-icon { font-size: 2rem; }
.appt-details { display: flex; gap: 1.5rem; color: #6c757d; font-size: 0.85rem; }
.appt-details span { display: flex; align-items: center; gap: 4px; }
.appt-actions { display: flex; gap: 0.5rem; }

.history-list { display: flex; flex-direction: column; gap: 1rem; }
.history-card { border: 1px solid #e9ecef; border-radius: 10px; overflow: hidden; }
.history-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: #f8f9fc; border-bottom: 1px solid #e9ecef; }
.history-pet { display: flex; align-items: center; gap: 8px; }
.pet-emoji { font-size: 1.5rem; }
.history-body { padding: 0.75rem 1rem; }
.service-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem; }
.tag { padding: 0.2em 0.6em; border-radius: 50px; font-size: 0.75rem; background: #f1f4fb; }
.history-photos { color: #6c757d; font-size: 0.85rem; }
.history-actions { padding: 0.5rem 1rem; border-top: 1px solid #e9ecef; display: flex; justify-content: flex-end; }

/* Modales */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; }
.modal-content { background: white; border-radius: 12px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.4); animation: slideUp 0.3s ease; }
.grooming-modal { max-width: 650px; }
.photos-modal { max-width: 850px; }
@keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 1; }
.modal-header h3 { margin: 0; display: flex; align-items: center; gap: 8px; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #9ca3af; }
.modal-close:hover { color: #e74a3b; }
.modal-body { padding: 1.5rem; }
.modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 0.75rem; position: sticky; bottom: 0; background: white; }

/* Formularios */
.appointment-summary { background: #f8f9fc; padding: 1rem; border-radius: 8px; display: flex; gap: 1.5rem; flex-wrap: wrap; }
.check-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.check-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem; }
.services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
.service-check { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 10px; cursor: pointer; transition: all 0.2s; text-align: center; }
.service-check input { display: none; }
.service-check.active { border-color: #4e73df; background: #e8f0fe; }
.service-icon { font-size: 1.5rem; }
.form-group { margin-bottom: 1rem; }
.form-label { display: block; margin-bottom: 0.35rem; font-weight: 500; font-size: 0.85rem; color: #374151; }
.form-control { width: 100%; padding: 0.6rem 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-family: inherit; transition: all 0.2s; box-sizing: border-box; }
.form-control:focus { outline: none; border-color: #4e73df; box-shadow: 0 0 0 3px rgba(78,115,223,0.1); }
.form-select { width: 100%; padding: 0.6rem 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-family: inherit; box-sizing: border-box; }
hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.25rem 0; }
h5 { margin: 0 0 0.75rem; color: #1a1a2e; }

/* Subida de fotos */
.upload-section { background: #f8f9fc; padding: 1.25rem; border-radius: 10px; margin-bottom: 1rem; }
.upload-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.upload-tabs button { flex: 1; padding: 0.6rem; border: 2px solid #e5e7eb; background: white; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; }
.upload-tabs button.active { border-color: #4e73df; background: #e8f0fe; color: #4e73df; }
.file-upload-area { border: 2px dashed #d1d5db; border-radius: 10px; padding: 2rem; text-align: center; transition: all 0.3s; cursor: pointer; }
.file-upload-area.drag-over { border-color: #4e73df; background: #e8f0fe; }
.file-placeholder { color: #6b7280; }
.file-placeholder p { margin: 0.5rem 0; }
.file-preview { text-align: center; }
.preview-img { max-width: 100%; max-height: 250px; border-radius: 8px; margin-bottom: 0.75rem; }
.preview-info { display: flex; justify-content: center; align-items: center; gap: 1rem; }
.upload-method-content { margin-bottom: 0.5rem; }
.alert { padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; }
.alert-success { background: #d4edda; color: #155724; }
.alert-danger { background: #f8d7da; color: #721c24; }

/* Galería */
.photo-tabs { display: flex; gap: 0.25rem; margin-bottom: 1rem; flex-wrap: wrap; }
.photo-tabs button { padding: 0.4rem 0.75rem; border: 1px solid #e5e7eb; background: white; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: all 0.2s; }
.photo-tabs button.active { background: #4e73df; color: white; border-color: #4e73df; }
.photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }

/* ⬇️⬇️⬇️ WRAPPER DE FOTO CON CONFIRMACIÓN ⬇️⬇️⬇️ */
.photo-card-wrapper {
  position: relative;
}

.photo-card {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 1;
  border: 2px solid #e5e7eb;
  transition: all 0.2s;
}

.photo-card:hover {
  border-color: #4e73df;
  transform: scale(1.02);
}

.photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.photo-type-badge {
  padding: 0.15em 0.5em;
  border-radius: 50px;
  font-size: 0.7rem;
  background: rgba(255,255,255,0.2);
}

/* Botón eliminar */
.photo-delete-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(231,74,59,0.9);
  color: white;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
  z-index: 2;
}

.photo-card-wrapper:hover .photo-delete-btn {
  opacity: 1;
}

.photo-delete-btn:hover {
  background: #e74a3b;
  transform: scale(1.15);
}

/* ⬇️⬇️⬇️ CONFIRMACIÓN DE ELIMINACIÓN (ENCIMA DE LA FOTO) ⬇️⬇️⬇️ */
.delete-confirm-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.delete-confirm-box {
  background: white;
  border-radius: 10px;
  padding: 1.25rem;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  width: 90%;
  max-width: 200px;
}

.delete-confirm-box p {
  margin: 0 0 1rem;
  font-weight: 500;
  color: #1a1a2e;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.delete-confirm-box i {
  color: #f6c23e;
  font-size: 1.1rem;
}

.delete-confirm-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.delete-confirm-actions .btn {
  font-size: 0.75rem;
  padding: 0.4rem 0.75rem;
}

/* Visor de foto */
.photo-viewer-overlay { z-index: 10000; }
.photo-viewer { position: relative; max-width: 90vw; max-height: 90vh; }
.viewer-img { max-width: 85vw; max-height: 80vh; border-radius: 12px; object-fit: contain; }
.viewer-close { position: absolute; top: -15px; right: -15px; background: white; border: none; width: 40px; height: 40px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1; }
.viewer-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; width: 50px; height: 80px; font-size: 2rem; cursor: pointer; transition: all 0.2s; }
.viewer-nav:hover { background: rgba(0,0,0,0.8); }
.viewer-prev { left: -60px; border-radius: 8px 0 0 8px; }
.viewer-next { right: -60px; border-radius: 0 8px 8px 0; }
.viewer-info { position: absolute; bottom: -40px; left: 0; right: 0; text-align: center; color: white; display: flex; justify-content: center; gap: 1rem; }

/* Botones */
.btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; font-family: inherit; font-size: 0.85rem; }
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.btn-primary { background: #4e73df; color: white; }
.btn-success { background: #1cc88a; color: white; }
.btn-info { background: #36b9cc; color: white; }
.btn-secondary { background: #e5e7eb; color: #374151; }
.btn-danger { background: #e74a3b; color: white; }
.btn-outline-primary { background: white; color: #4e73df; border: 1px solid #4e73df; }
.btn-sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }
.badge { padding: 0.2em 0.6em; border-radius: 50px; font-size: 0.75rem; font-weight: 600; }
.badge-success { background: #1cc88a; color: white; }
.badge-info { background: #36b9cc; color: white; }
.text-center { text-align: center; }
.text-muted { color: #6b7280; }
.py-4 { padding: 2rem 0; }
.mb-4 { margin-bottom: 1.5rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 1rem; }
.spinner-small { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .appointment-card { flex-direction: column; gap: 1rem; }
  .appt-info { flex-direction: column; gap: 0.5rem; align-items: flex-start; }
  .services-grid { grid-template-columns: repeat(2, 1fr); }
  .photos-grid { grid-template-columns: repeat(2, 1fr); }
  .viewer-prev { left: -30px; }
  .viewer-next { right: -30px; }
}
</style>