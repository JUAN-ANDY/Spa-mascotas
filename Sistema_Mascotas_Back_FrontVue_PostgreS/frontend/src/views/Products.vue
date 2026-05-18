<template>
  <div class="products-page">
    <div class="page-header">
      <h2 class="page-title">Catálogo de Productos</h2>
      <div class="header-actions">
        <button class="btn btn-secondary mr-2" @click="showCategories = true">
          <i class="bi bi-tags"></i> Categorías
        </button>
        <button class="btn btn-primary" @click="openCreateModal">
          <i class="bi bi-plus-lg"></i> Nuevo Producto
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card mb-3">
      <div class="card-body">
        <div class="row">
          <div class="col-6">
            <input v-model="search" class="form-control" placeholder="Buscar producto..." @input="debounceSearch">
          </div>
          <div class="col-6">
            <select v-model="filterCategory" class="form-select" @change="loadProducts">
              <option value="">Todas las categorías</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loadingProducts" class="text-center py-4">
      <Loading />
    </div>

    <!-- Grid de productos -->
    <div v-else class="products-grid">
      <div v-for="product in products" :key="product.id" class="product-card">
        
        <!-- ⬇️⬇️⬇️ IMAGEN DEL PRODUCTO - CORREGIDA ⬇️⬇️⬇️ -->
        <div class="product-image-container">
          <img 
            v-if="product.image_url" 
            :src="product.image_url" 
            :alt="product.name" 
            class="product-image"
            @error="onImageError($event, product)"
          >
          <div v-else class="product-image-placeholder">
            <i class="bi bi-box-seam"></i>
          </div>
        </div>

        <div class="product-body">
          <h4 class="product-name">{{ product.name }}</h4>
          <span class="badge badge-info">{{ product.category_name || 'Sin categoría' }}</span>
          <p class="product-desc" v-if="product.description">{{ product.description }}</p>
          
          <!-- Variantes -->
          <div v-if="product.variants && product.variants.length > 0" class="variants-list">
            <div v-for="v in product.variants" :key="v.id" class="variant-row">
              <span class="variant-name">{{ v.variant_name }}</span>
              <span class="variant-price">Bs. {{ formatMoney(v.price) }}</span>
            </div>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="product-actions">
          <button class="btn btn-sm btn-info" @click="viewProduct(product)" title="Ver">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm btn-warning" @click="openEditModal(product)" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-danger" @click="deleteProduct(product.id)" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>

      <!-- Mensaje si no hay productos -->
      <div v-if="products.length === 0 && !loadingProducts" class="empty-products">
        <i class="bi bi-inbox" style="font-size:3rem;color:#ccc;"></i>
        <p>No se encontraron productos</p>
      </div>
    </div>

    <!-- Paginación -->
    <div class="pagination-container" v-if="totalPages > 1">
      <button :disabled="page === 1" @click="changePage(page - 1)">«</button>
      <button v-for="p in getVisiblePages()" :key="p" :class="{ active: p === page }" @click="changePage(p)">{{ p }}</button>
      <button :disabled="page === totalPages" @click="changePage(page + 1)">»</button>
    </div>

    <!-- ============================================ -->
    <!-- MODAL CREAR/EDITAR PRODUCTO                   -->
    <!-- ============================================ -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content product-modal">
        <div class="modal-header">
          <h3><i class="bi bi-box"></i> {{ modalTitle }}</h3>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveProduct">
            <!-- Nombre -->
            <div class="form-group">
              <label class="form-label">Nombre del Producto *</label>
              <input v-model="form.name" class="form-control" placeholder="Ej: Shampoo de Avena" required>
            </div>

            <!-- Categoría -->
            <div class="form-group">
              <label class="form-label">Categoría</label>
              <select v-model="form.category_id" class="form-select">
                <option value="">Seleccionar categoría</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>

            <!-- Descripción -->
            <div class="form-group">
              <label class="form-label">Descripción</label>
              <textarea v-model="form.description" class="form-control" rows="2" placeholder="Descripción del producto..."></textarea>
            </div>

            <!-- ============================================ -->
            <!-- FOTO DEL PRODUCTO                            -->
            <!-- ============================================ -->
            <div class="form-group">
              <label class="form-label">📸 Foto del Producto</label>
              
              <!-- Tabs de método -->
              <div class="upload-tabs">
                <button type="button" :class="{ active: imageMethod === 'file' }" @click="imageMethod = 'file'">
                  📁 Archivo
                </button>
                <button type="button" :class="{ active: imageMethod === 'url' }" @click="imageMethod = 'url'">
                  🔗 URL
                </button>
              </div>

              <!-- Método Archivo -->
              <div v-if="imageMethod === 'file'" class="upload-area">
                <input type="file" ref="productImageInput" @change="onFileSelected" accept="image/*" style="display:none;">
                
                <div v-if="!imagePreview && !currentImageUrl" class="upload-placeholder" @click="$refs.productImageInput.click()">
                  <i class="bi bi-cloud-upload" style="font-size:2rem;color:#adb5bd;"></i>
                  <p>Haz clic para seleccionar imagen</p>
                  <small>JPG, PNG, WEBP (máx 2MB)</small>
                </div>
                
                <div v-if="imagePreview" class="preview-container">
                  <img :src="imagePreview" alt="Preview" class="preview-image">
                  <button type="button" class="btn btn-sm btn-danger remove-btn" @click="removeImage">
                    <i class="bi bi-x"></i> Quitar
                  </button>
                </div>

                <div v-if="!imagePreview && currentImageUrl" class="preview-container">
                  <img :src="currentImageUrl" alt="Actual" class="preview-image">
                  <button type="button" class="btn btn-sm btn-danger remove-btn" @click="removeImage">
                    <i class="bi bi-x"></i> Quitar
                  </button>
                </div>
              </div>

              <!-- Método URL -->
              <div v-if="imageMethod === 'url'" class="upload-area">
                <input v-model="form.image_url" type="url" class="form-control" placeholder="https://ejemplo.com/imagen.jpg">
                <div v-if="form.image_url" class="preview-container mt-2">
                  <img :src="form.image_url" alt="Preview URL" class="preview-image" @error="e => e.target.style.display='none'">
                </div>
              </div>
            </div>

            <hr>
            <h5>📦 Variantes del Producto</h5>
            
            <!-- Variantes -->
            <div class="variants-section">
              <div v-for="(variant, index) in form.variants" :key="index" class="variant-box">
                <div class="variant-fields">
                  <div class="variant-field variant-name-field">
                    <label v-if="index === 0" class="form-label-sm">Nombre</label>
                    <input v-model="variant.variant_name" class="form-control" placeholder="Ej: Galón 5L">
                  </div>
                  <div class="variant-field variant-sku-field">
                    <label v-if="index === 0" class="form-label-sm">SKU</label>
                    <input v-model="variant.sku" class="form-control" placeholder="Ej: SH-5L">
                  </div>
                  <div class="variant-field variant-price-field">
                    <label v-if="index === 0" class="form-label-sm">Precio (Bs.)</label>
                    <input v-model.number="variant.price" type="number" class="form-control" step="0.01" min="0">
                  </div>
                  <div class="variant-field variant-action-field">
                    <button v-if="form.variants.length > 1" type="button" class="btn btn-sm btn-danger w-100" @click="removeVariant(index)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
              
              <button type="button" class="btn btn-sm btn-info mt-2" @click="addVariant">
                <i class="bi bi-plus"></i> Agregar Variante
              </button>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
          <button class="btn btn-primary" @click="saveProduct" :disabled="saving">
            <span v-if="saving" class="spinner-small"></span>
            <span v-else><i class="bi bi-check-lg"></i> Guardar Producto</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Categorías -->
    <div v-if="showCategories" class="modal-overlay" @click.self="showCategories = false">
      <div class="modal-content" style="max-width:480px;">
        <div class="modal-header">
          <h3><i class="bi bi-tags"></i> Categorías</h3>
          <button class="modal-close" @click="showCategories = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Nueva Categoría</label>
            <div class="d-flex gap-2">
              <input v-model="newCategoryName" class="form-control" placeholder="Nombre" @keyup.enter="addCategory">
              <button class="btn btn-primary" @click="addCategory">Agregar</button>
            </div>
          </div>
          <hr>
          <h5>Existentes</h5>
          <ul class="category-list">
            <li v-for="cat in categories" :key="cat.id">{{ cat.name }}</li>
          </ul>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCategories = false">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { productsAPI } from '../services/api'
import Loading from '../components/common/Loading.vue'
import Swal from 'sweetalert2'

// ============================================
// DATOS
// ============================================
const products = ref([])
const categories = ref([])
const loadingProducts = ref(false)
const search = ref('')
const filterCategory = ref('')
const page = ref(1)
const totalPages = ref(0)

// ============================================
// MODAL PRODUCTO
// ============================================
const showModal = ref(false)
const modalTitle = ref('')
const editingId = ref(null)
const saving = ref(false)
const imageMethod = ref('file')
const imagePreview = ref(null)
const imageData = ref(null)
const currentImageUrl = ref('')
const productImageInput = ref(null)

const form = reactive({
  name: '',
  category_id: '',
  description: '',
  image_url: '',
  variants: [{ variant_name: '', sku: '', price: 0 }]
})

// ============================================
// MODAL CATEGORÍAS
// ============================================
const showCategories = ref(false)
const newCategoryName = ref('')

let searchTimeout

// ============================================
// CARGAR DATOS
// ============================================
onMounted(async () => {
  await loadCategories()
  loadProducts()
})

async function loadCategories() {
  try {
    const { data } = await productsAPI.getCategories()
    categories.value = data.categories || []
  } catch (e) { console.error('Error:', e) }
}

async function loadProducts() {
  loadingProducts.value = true
  try {
    const { data } = await productsAPI.getAll({
      search: search.value,
      category_id: filterCategory.value,
      page: page.value,
      limit: 12
    })
    products.value = data.data || data.products || []
    totalPages.value = data.pagination?.totalPages || 0
  } catch (e) {
    console.error('Error:', e)
  } finally {
    loadingProducts.value = false
  }
}

function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 1; loadProducts() }, 400)
}

function changePage(p) { page.value = p; loadProducts() }

function getVisiblePages() {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, page.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

// ============================================
// IMAGEN
// ============================================
function onFileSelected(event) {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    Swal.fire({ icon: 'warning', title: 'Solo imágenes', text: 'JPG, PNG o WEBP' })
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    Swal.fire({ icon: 'warning', title: 'Muy grande', text: 'Máximo 2MB' })
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
    imageData.value = e.target.result
    form.image_url = e.target.result
    currentImageUrl.value = ''
  }
  reader.readAsDataURL(file)
}

function removeImage() {
  imagePreview.value = null
  imageData.value = null
  form.image_url = ''
  currentImageUrl.value = ''
  if (productImageInput.value) productImageInput.value.value = ''
}

function onImageError(e, product) {
  e.target.style.display = 'none'
  // Mostrar placeholder
  const placeholder = e.target.parentElement.querySelector('.product-image-placeholder')
  if (placeholder) placeholder.style.display = 'flex'
}

// ============================================
// MODAL
// ============================================
function openCreateModal() {
  modalTitle.value = 'Nuevo Producto'
  editingId.value = null
  form.name = ''
  form.category_id = ''
  form.description = ''
  form.image_url = ''
  form.variants = [{ variant_name: '', sku: '', price: 0 }]
  imagePreview.value = null
  imageData.value = null
  currentImageUrl.value = ''
  imageMethod.value = 'file'
  showModal.value = true
}

function openEditModal(product) {
  modalTitle.value = 'Editar Producto'
  editingId.value = product.id
  form.name = product.name || ''
  form.category_id = product.category_id || ''
  form.description = product.description || ''
  form.image_url = product.image_url || ''
  currentImageUrl.value = product.image_url || ''
  form.variants = (product.variants && product.variants.length > 0) 
    ? product.variants.map(v => ({ ...v }))
    : [{ variant_name: '', sku: '', price: 0 }]
  imagePreview.value = null
  imageData.value = null
  imageMethod.value = product.image_url ? 'url' : 'file'
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

// ============================================
// VARIANTES
// ============================================
function addVariant() {
  form.variants.push({ variant_name: '', sku: '', price: 0 })
}

function removeVariant(index) {
  if (form.variants.length > 1) {
    form.variants.splice(index, 1)
  }
}

// ============================================
// GUARDAR
// ============================================
async function saveProduct() {
  if (!form.name.trim()) {
    Swal.fire({ icon: 'warning', title: 'Nombre requerido' })
    return
  }

  const validVariants = form.variants.filter(v => v.variant_name && v.sku)
  if (validVariants.length === 0) {
    Swal.fire({ icon: 'warning', title: 'Variantes requeridas', text: 'Agrega al menos una variante con nombre y SKU' })
    return
  }

  saving.value = true

  try {
    const productData = {
      name: form.name.trim(),
      category_id: form.category_id || null,
      description: form.description || null,
      image_url: form.image_url || null,
      variants: validVariants.map(v => ({
        variant_name: v.variant_name,
        sku: v.sku,
        price: parseFloat(v.price) || 0
      }))
    }

    if (editingId.value) {
      await productsAPI.update(editingId.value, productData)
      Swal.fire({ icon: 'success', title: 'Producto actualizado', timer: 1500, showConfirmButton: false })
    } else {
      await productsAPI.create(productData)
      Swal.fire({ icon: 'success', title: 'Producto creado', timer: 1500, showConfirmButton: false })
    }
    closeModal()
    loadProducts()
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al guardar' })
  } finally {
    saving.value = false
  }
}

// ============================================
// ELIMINAR
// ============================================
async function deleteProduct(id) {
  const result = await Swal.fire({
    title: '¿Eliminar producto?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí',
    cancelButtonText: 'No'
  })
  if (result.isConfirmed) {
    await productsAPI.delete(id)
    Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false })
    loadProducts()
  }
}

// ============================================
// VER PRODUCTO
// ============================================
function viewProduct(product) {
  Swal.fire({
    title: product.name,
    html: `
      <div style="text-align:center;">
        ${product.image_url ? `<img src="${product.image_url}" style="max-width:200px;max-height:200px;border-radius:8px;margin-bottom:1rem;object-fit:contain;">` : ''}
        <p><strong>Categoría:</strong> ${product.category_name || 'Sin categoría'}</p>
        <p><strong>Descripción:</strong> ${product.description || 'N/A'}</p>
        ${product.variants ? product.variants.map(v => `<p>${v.variant_name} - Bs. ${formatMoney(v.price)}</p>`).join('') : ''}
      </div>
    `,
    showCloseButton: true,
    showConfirmButton: false
  })
}

// ============================================
// CATEGORÍAS
// ============================================
async function addCategory() {
  if (!newCategoryName.value.trim()) return
  try {
    await productsAPI.createCategory({ name: newCategoryName.value.trim() })
    newCategoryName.value = ''
    Swal.fire({ icon: 'success', title: 'Categoría creada', timer: 1500, showConfirmButton: false })
    loadCategories()
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message })
  }
}

function formatMoney(v) { return parseFloat(v || 0).toFixed(2) }
</script>

<style scoped>
/* ============================================ */
/* PRODUCTS PAGE                                */
/* ============================================ */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.page-title { margin: 0; color: #5a5c69; font-size: 1.4rem; }
.header-actions { display: flex; gap: 0.5rem; }

.card { background: white; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 1rem; }
.card-body { padding: 1.25rem; }

/* ============================================ */
/* GRID DE PRODUCTOS                            */
/* ============================================ */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.product-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  border: 1px solid #e9ecef;
  overflow: hidden;
  transition: all 0.3s;
  position: relative;
  display: flex;
  flex-direction: column;
}
.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.12);
}

/* ⬇️⬇️⬇️ CONTENEDOR DE IMAGEN - CORREGIDO ⬇️⬇️⬇️ */
.product-image-container {
  width: 100%;
  height: 220px;
  background: #f8f9fc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
  position: relative;
}

/* ⬇️⬇️⬇️ IMAGEN - OBJECT-FIT: COVER ⬇️⬇️⬇️ */
.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.4s ease;
}
.product-card:hover .product-image {
  transform: scale(1.08);
}

/* ⬇️⬇️⬇️ PLACEHOLDER CUANDO NO HAY IMAGEN ⬇️⬇️⬇️ */
.product-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8f9fc 0%, #e9ecef 100%);
  color: #cbd5e0;
  font-size: 3.5rem;
}

/* ============================================ */
/* CUERPO DEL PRODUCTO                          */
/* ============================================ */
.product-body {
  padding: 1rem 1.15rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.product-name {
  margin: 0 0 0.4rem;
  color: #1a1a2e;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}

.product-desc {
  color: #6c757d;
  font-size: 0.83rem;
  margin: 0.4rem 0;
  line-height: 1.4;
  flex: 1;
}

/* Variantes */
.variants-list {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f1f3f5;
}
.variant-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
  font-size: 0.83rem;
}
.variant-name { color: #6c757d; }
.variant-price { font-weight: 600; color: #4e73df; }

/* ============================================ */
/* BOTONES DE ACCIÓN                            */
/* ============================================ */
.product-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 2;
}
.product-card:hover .product-actions { opacity: 1; }

/* ============================================ */
/* EMPTY STATE                                  */
/* ============================================ */
.empty-products {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4rem 2rem;
  color: #adb5bd;
}
.empty-products p { margin-top: 0.5rem; font-size: 1rem; }

/* ============================================ */
/* MODAL                                        */
/* ============================================ */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6); display: flex; align-items: center;
  justify-content: center; z-index: 9999; padding: 20px;
}
.modal-content {
  background: white; border-radius: 12px; width: 100%;
  max-height: 85vh; overflow-y: auto;
  box-shadow: 0 25px 60px rgba(0,0,0,0.4);
  animation: slideUp 0.3s ease;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.product-modal { max-width: 680px; }
.modal-header {
  padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb;
  display: flex; justify-content: space-between; align-items: center;
  position: sticky; top: 0; background: white; z-index: 1;
}
.modal-header h3 { margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #9ca3af; }
.modal-close:hover { color: #e74a3b; }
.modal-body { padding: 1.5rem; }
.modal-footer {
  padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb;
  display: flex; justify-content: flex-end; gap: 0.75rem;
  position: sticky; bottom: 0; background: white;
}

/* ============================================ */
/* FORMULARIOS                                  */
/* ============================================ */
.form-group { margin-bottom: 1rem; }
.form-label { display: block; margin-bottom: 0.3rem; font-weight: 500; font-size: 0.83rem; color: #374151; }
.form-label-sm { font-size: 0.73rem; color: #6b7280; margin-bottom: 0.2rem; display: block; }
.form-control {
  width: 100%; padding: 0.55rem 0.7rem; border: 2px solid #e5e7eb;
  border-radius: 8px; font-family: inherit; transition: all 0.2s;
  box-sizing: border-box; font-size: 0.85rem;
}
.form-control:focus { outline: none; border-color: #4e73df; box-shadow: 0 0 0 3px rgba(78,115,223,0.1); }
.form-select {
  width: 100%; padding: 0.55rem 0.7rem; border: 2px solid #e5e7eb;
  border-radius: 8px; font-family: inherit; box-sizing: border-box; font-size: 0.85rem;
}
hr { border: none; border-top: 1px solid #e5e7eb; margin: 1rem 0; }
h5 { margin: 0 0 0.75rem; color: #1a1a2e; font-size: 0.95rem; }

/* ============================================ */
/* UPLOAD IMAGEN                                */
/* ============================================ */
.upload-tabs { display: flex; gap: 0.5rem; margin-bottom: 0.6rem; }
.upload-tabs button {
  flex: 1; padding: 0.45rem; border: 2px solid #e5e7eb; background: white;
  border-radius: 8px; cursor: pointer; font-size: 0.82rem; transition: all 0.2s;
}
.upload-tabs button.active { border-color: #4e73df; background: #e8f0fe; color: #4e73df; }

.upload-area { margin-top: 0.3rem; }
.upload-placeholder {
  border: 2px dashed #d1d5db; border-radius: 10px; padding: 1.5rem;
  text-align: center; cursor: pointer; transition: all 0.2s;
}
.upload-placeholder:hover { border-color: #4e73df; background: #f8f9fc; }
.upload-placeholder p { margin: 0.5rem 0; font-size: 0.85rem; color: #6b7280; }
.upload-placeholder small { color: #adb5bd; font-size: 0.75rem; }

.preview-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f8f9fc;
  border-radius: 10px;
  padding: 0.5rem;
  border: 2px solid #e5e7eb;
}
.preview-image {
  max-width: 100%;
  max-height: 180px;
  border-radius: 6px;
  object-fit: contain;
}
.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}

/* ============================================ */
/* VARIANTES                                    */
/* ============================================ */
.variants-section { max-height: 250px; overflow-y: auto; padding-right: 4px; }
.variant-box {
  padding: 0.65rem; background: #f8f9fc;
  border-radius: 8px; margin-bottom: 0.5rem;
  border: 1px solid #e9ecef;
}
.variant-fields {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}
.variant-name-field { flex: 3; }
.variant-sku-field { flex: 2; }
.variant-price-field { flex: 2; }
.variant-action-field { flex: 0 0 40px; }

/* ============================================ */
/* CATEGORÍAS                                   */
/* ============================================ */
.category-list { list-style: none; padding: 0; max-height: 200px; overflow-y: auto; }
.category-list li { padding: 0.5rem 0; border-bottom: 1px solid #f1f3f5; font-size: 0.9rem; }

/* ============================================ */
/* PAGINACIÓN                                   */
/* ============================================ */
.pagination-container {
  display: flex; justify-content: center; gap: 4px; margin-top: 1.5rem;
}
.pagination-container button {
  padding: 0.4rem 0.8rem; border: 1px solid #e3e6f0; background: white;
  cursor: pointer; border-radius: 5px; font-size: 0.85rem; transition: all 0.2s;
}
.pagination-container button:hover { background: #f1f4fb; }
.pagination-container button.active { background: #4e73df; color: white; border-color: #4e73df; }
.pagination-container button:disabled { opacity: 0.4; cursor: not-allowed; }

/* ============================================ */
/* BOTONES Y UTILIDADES                         */
/* ============================================ */
.btn {
  padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer;
  font-weight: 500; display: inline-flex; align-items: center; gap: 5px;
  font-size: 0.84rem; transition: all 0.2s; font-family: inherit;
}
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.btn-primary { background: #4e73df; color: white; }
.btn-info { background: #36b9cc; color: white; }
.btn-warning { background: #f6c23e; color: #5a5c69; }
.btn-danger { background: #e74a3b; color: white; }
.btn-secondary { background: #e5e7eb; color: #374151; }
.btn-sm { padding: 0.3rem 0.55rem; font-size: 0.78rem; }

.badge {
  padding: 0.2em 0.55em; border-radius: 50px;
  font-size: 0.72rem; font-weight: 600; display: inline-block;
}
.badge-info { background: #36b9cc; color: white; }

.text-center { text-align: center; }
.py-4 { padding: 2rem 0; }
.mb-3 { margin-bottom: 1rem; }
.mt-2 { margin-top: 0.5rem; }
.mr-2 { margin-right: 0.5rem; }
.d-flex { display: flex; }
.gap-2 { gap: 0.5rem; }
.w-100 { width: 100%; }
.row { display: flex; flex-wrap: wrap; margin: 0 -0.5rem; }
.col-6 { flex: 0 0 50%; padding: 0 0.5rem; }

.spinner-small {
  display: inline-block; width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ============================================ */
/* RESPONSIVE                                   */
/* ============================================ */
@media (max-width: 768px) {
  .products-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
  .product-image-container { height: 180px; }
  .variant-fields { flex-wrap: wrap; }
  .variant-name-field, .variant-sku-field { flex: 1 1 45%; }
  .variant-price-field { flex: 1 1 45%; }
  .variant-action-field { flex: 0 0 35px; }
}

@media (max-width: 480px) {
  .products-grid { grid-template-columns: 1fr; }
  .product-image-container { height: 200px; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; flex-wrap: wrap; }
  .header-actions .btn { flex: 1; }
}
</style>