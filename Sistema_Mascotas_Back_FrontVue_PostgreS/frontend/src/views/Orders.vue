<template>
  <div class="orders-page">
    <div class="page-header">
      <h2 class="page-title">
        {{ authStore.isClient ? 'Mis Compras' : 'Gestión de Ventas' }}
      </h2>
      <button class="btn btn-primary" @click="openCreateModal">
        <i class="bi bi-cart-plus"></i>
        {{ authStore.isClient ? 'Comprar Productos' : 'Nueva Venta' }}
      </button>
    </div>

    <!-- Filtros (SOLO admin/recepcion/groomer) -->
    <div class="card mb-3" v-if="!authStore.isClient">
      <div class="card-body">
        <div class="row">
          <div class="col-6 col-md-3 mb-2">
            <select v-model="filterStatus" class="form-select" @change="loadOrders">
              <option value="">Todos los estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="WhatsApp_Enviado">WhatsApp Enviado</option>
              <option value="Pagado">Pagado</option>
              <option value="Entregado">Entregado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de órdenes -->
    <div class="card">
      <div class="card-header">
        {{ authStore.isClient ? 'Historial de Compras' : 'Listado de Ventas' }}
        <span class="badge badge-primary">{{ total }} registros</span>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th v-if="!authStore.isClient">Cliente</th>
                <th v-if="!authStore.isClient">Sucursal</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th v-if="!authStore.isClient">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td :colspan="authStore.isClient ? 5 : 7" class="text-center py-4"><Loading /></td>
              </tr>
              <tr v-else-if="orders.length === 0">
                <td :colspan="authStore.isClient ? 5 : 7" class="text-center py-4 text-muted">
                  {{ authStore.isClient ? 'Aún no has realizado compras. ¡Compra algo para tu mascota!' : 'No se encontraron ventas' }}
                </td>
              </tr>
              <tr v-for="order in orders" :key="order.id">
                <td v-if="!authStore.isClient">{{ order.client_name || 'Ocasional' }}</td>
                <td v-if="!authStore.isClient">{{ order.branch_name || '-' }}</td>
                <td><strong>Bs. {{ formatMoney(order.total_amount) }}</strong></td>
                <td>
                  <span v-if="order.payment_method === 'QR'" class="badge badge-info"><i class="bi bi-qr-code"></i> QR</span>
                  <span v-else>{{ order.payment_method || 'Efectivo' }}</span>
                </td>
                <td><span :class="getStatusBadge(order.status)">{{ formatStatus(order.status) }}</span></td>
                <td>{{ formatDate(order.created_at) }}</td>
                <td v-if="!authStore.isClient">
                  <div class="btn-group">
                    <button v-if="order.payment_method === 'QR' && order.status === 'Pendiente'" class="btn btn-sm btn-info" @click="showQrModal(order)" title="Ver QR"><i class="bi bi-qr-code"></i></button>
                    <button v-if="order.status === 'Pendiente'" class="btn btn-sm btn-info" @click="updateStatus(order.id, 'WhatsApp_Enviado')" title="WhatsApp"><i class="bi bi-whatsapp"></i></button>
                    <button v-if="order.status === 'Pendiente' || order.status === 'WhatsApp_Enviado'" class="btn btn-sm btn-success" @click="updateStatus(order.id, 'Pagado')" title="Pagar"><i class="bi bi-cash"></i></button>
                    <button v-if="order.status === 'Pagado'" class="btn btn-sm btn-primary" @click="updateStatus(order.id, 'Entregado')" title="Entregar"><i class="bi bi-check-all"></i></button>
                    <button v-if="order.status !== 'Entregado' && order.status !== 'Cancelado'" class="btn btn-sm btn-danger" @click="cancelOrder(order.id)" title="Cancelar"><i class="bi bi-x-lg"></i></button>
                    <button class="btn btn-sm btn-secondary" @click="printInvoice(order)" title="Imprimir Factura"><i class="bi bi-printer"></i></button>
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
    <!-- MODAL NUEVA VENTA / COMPRA                    -->
    <!-- ============================================ -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content order-modal">
        <div class="modal-header">
          <h3><i class="bi bi-cart-plus"></i> {{ authStore.isClient ? 'Comprar Productos' : 'Nueva Venta' }}</h3>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <!-- Cliente y Sucursal (SOLO admin/recepcion/groomer) -->
          <div class="row" v-if="!authStore.isClient">
            <div class="col-6">
              <div class="form-group">
                <label class="form-label">Cliente</label>
                <select v-model="orderForm.client_id" class="form-select">
                  <option value="">Cliente ocasional</option>
                  <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.first_name }} {{ c.last_name }}</option>
                </select>
              </div>
            </div>
            <div class="col-6">
              <div class="form-group">
                <label class="form-label">Sucursal *</label>
                <select v-model="orderForm.branch_id" class="form-select" required>
                  <option value="">Seleccionar</option>
                  <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- ⬇️ CLIENTE: MENSAJE INFORMATIVO ⬇️ -->
          <div v-if="authStore.isClient" class="client-info-banner">
            <i class="bi bi-info-circle-fill"></i>
            <span>Selecciona los productos que deseas comprar y elige tu método de pago.</span>
          </div>

          <!-- Método de pago -->
          <div class="form-group">
            <label class="form-label">Método de Pago</label>
            <div class="payment-methods">
              <label class="payment-option" :class="{ active: orderForm.payment_method === 'Efectivo' }">
                <input type="radio" v-model="orderForm.payment_method" value="Efectivo"><span>💵 Efectivo</span>
              </label>
              <label class="payment-option" :class="{ active: orderForm.payment_method === 'QR' }">
                <input type="radio" v-model="orderForm.payment_method" value="QR"><span>📱 QR</span>
              </label>
              <label class="payment-option" :class="{ active: orderForm.payment_method === 'Transferencia' }">
                <input type="radio" v-model="orderForm.payment_method" value="Transferencia"><span>🏦 Transferencia</span>
              </label>
              <label class="payment-option" :class="{ active: orderForm.payment_method === 'Tarjeta' }">
                <input type="radio" v-model="orderForm.payment_method" value="Tarjeta"><span>💳 Tarjeta</span>
              </label>
            </div>
          </div>

          <div v-if="orderForm.payment_method === 'QR'" class="qr-preview-box">
            <div class="qr-info"><i class="bi bi-qr-code"></i><span>Se generará un código QR para que puedas pagar con tu app bancaria</span></div>
          </div>

          <hr>
          <h5>🛒 Productos</h5>

          <!-- ⬇️⬇️⬇️ GRID DE PRODUCTOS CON IMÁGENES ⬇️⬇️⬇️ -->
          <div class="products-grid">
            <div 
              v-for="product in productList" 
              :key="product.id" 
              class="product-card"
              :class="{ 'product-selected': isProductSelected(product) }"
              @click="toggleProductSelection(product)"
            >
              <!-- Imagen del producto -->
              <div class="product-image-container">
                <img 
                  v-if="product.image_url" 
                  :src="product.image_url" 
                  :alt="product.name" 
                  class="product-image"
                  @error="onImageError($event)"
                >
                <div v-else class="product-image-placeholder">
                  <i class="bi bi-box-seam"></i>
                </div>
                <!-- Check de selección -->
                <div v-if="isProductSelected(product)" class="selected-badge">
                  <i class="bi bi-check-circle-fill"></i>
                </div>
              </div>
              
              <!-- Info del producto -->
              <div class="product-body">
                <h4 class="product-name">{{ product.name }}</h4>
                <span class="badge badge-info">{{ product.category_name || 'Categoría' }}</span>
                <p class="product-desc" v-if="product.description">{{ product.description }}</p>
                
                <!-- Variantes -->
                <div v-if="product.variants && product.variants.length > 0" class="variants-list">
                  <div 
                    v-for="variant in product.variants" 
                    :key="variant.id" 
                    class="variant-item"
                    :class="{ 'variant-selected': isVariantSelected(variant.id) }"
                    @click.stop="toggleVariant(variant, product)"
                  >
                    <div class="variant-info">
                      <span class="variant-name">{{ variant.variant_name }}</span>
                      <span class="variant-sku">{{ variant.sku }}</span>
                    </div>
                    <div class="variant-price-qty">
                      <span class="variant-price">Bs. {{ formatMoney(variant.price) }}</span>
                      <!-- Control de cantidad -->
                      <div v-if="isVariantSelected(variant.id)" class="qty-control" @click.stop>
                        <button class="qty-btn" @click="decreaseQty(variant.id)">-</button>
                        <span class="qty-value">{{ getVariantQty(variant.id) }}</span>
                        <button class="qty-btn" @click="increaseQty(variant.id)">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mensaje si no hay productos -->
            <div v-if="productList.length === 0" class="no-products">
              <i class="bi bi-inbox"></i>
              <p>No hay productos disponibles</p>
            </div>
          </div>

          <!-- Resumen de items seleccionados -->
          <div v-if="selectedVariants.length > 0" class="selected-summary">
            <h6>📋 Productos Seleccionados ({{ selectedVariants.length }})</h6>
            <div v-for="item in selectedVariants" :key="item.variant_id" class="summary-item">
              <span>{{ item.product_name }} - {{ item.variant_name }}</span>
              <span>{{ item.quantity }} x Bs. {{ formatMoney(item.price) }} = <strong>Bs. {{ formatMoney(item.quantity * item.price) }}</strong></span>
            </div>
          </div>

          <!-- Total -->
          <div class="total-box">
            <div class="total-row"><span>Subtotal:</span><span>Bs. {{ formatMoney(totalAmount) }}</span></div>
            <hr>
            <div class="total-row final"><span>TOTAL A PAGAR:</span><span>Bs. {{ formatMoney(totalAmount) }}</span></div>
          </div>

          <div v-if="authStore.isClient" class="client-message">
            <i class="bi bi-check-circle"></i> Al confirmar, tu compra será registrada y podrás ver el estado en "Mis Compras".
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
          <button class="btn btn-success" @click="saveOrder" :disabled="!canSave || saving">
            <span v-if="saving" class="spinner-small"></span>
            <span v-else><i class="bi bi-check-lg"></i> {{ authStore.isClient ? 'Confirmar Compra' : 'Crear Venta' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal QR -->
    <div v-if="showQrModalOpen" class="modal-overlay" @click.self="showQrModalOpen = false">
      <div class="modal-content qr-payment-modal">
        <div class="modal-header">
          <h3><i class="bi bi-qr-code"></i> Pago con QR</h3>
          <button class="modal-close" @click="showQrModalOpen = false">&times;</button>
        </div>
        <div class="modal-body text-center">
          <div class="qr-container"><canvas ref="qrCanvas" width="280" height="280"></canvas></div>
          <div class="qr-details">
            <h4>Total a pagar: <span class="text-primary">Bs. {{ formatMoney(selectedOrder?.total_amount) }}</span></h4>
            <p class="text-muted">Escanea este código QR con tu aplicación bancaria</p>
            <div class="qr-order-info">
              <p><strong>Venta #:</strong> {{ selectedOrder?.id?.substring(0, 8) }}</p>
              <p><strong>Fecha:</strong> {{ formatDate(selectedOrder?.created_at) }}</p>
              <p><strong>Método:</strong> QR</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showQrModalOpen = false">Cerrar</button>
          <button class="btn btn-success" @click="markAsPaid"><i class="bi bi-check-lg"></i> Marcar como Pagado</button>
          <button class="btn btn-info" @click="printQrCode"><i class="bi bi-printer"></i> Imprimir QR</button>
        </div>
      </div>
    </div>

    <div id="printArea" style="display:none;"><div id="invoiceContent"></div></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useAuthStore } from '../store'
import { ordersAPI, clientsAPI, branchesAPI, productsAPI } from '../services/api'
import Loading from '../components/common/Loading.vue'
import Swal from 'sweetalert2'

const authStore = useAuthStore()

const orders = ref([])
const clients = ref([])
const branches = ref([])
const productList = ref([])
const loading = ref(false)
const saving = ref(false)
const filterStatus = ref('')
const page = ref(1)
const total = ref(0)
const totalPages = ref(0)

const showModal = ref(false)
const orderForm = reactive({
  client_id: '',
  branch_id: '',
  payment_method: 'Efectivo',
  items: []
})

// ⬇️ VARIABLES PARA EL NUEVO SISTEMA DE SELECCIÓN ⬇️
const selectedVariants = ref([]) // Array de { variant_id, product_name, variant_name, price, quantity }

const showQrModalOpen = ref(false)
const selectedOrder = ref(null)
const qrCanvas = ref(null)

// ⬇️ TOTAL CALCULADO DE selectedVariants ⬇️
const totalAmount = computed(() => {
  return selectedVariants.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const canSave = computed(() => {
  return orderForm.branch_id && selectedVariants.value.length > 0
})

onMounted(async () => {
  await Promise.all([loadClients(), loadBranches(), loadProducts()])
  loadOrders()
})

async function loadClients() { try { const { data } = await clientsAPI.getAll({ limit: 100 }); clients.value = data.data || [] } catch (e) {} }
async function loadBranches() { try { const { data } = await branchesAPI.getAll(); branches.value = data.data || []; if (branches.value.length > 0) orderForm.branch_id = branches.value[0].id } catch (e) {} }
async function loadProducts() { try { const { data } = await productsAPI.getAll({ limit: 200 }); productList.value = (data.data || data.products || []).filter(p => p.variants?.length > 0) } catch (e) {} }

async function loadOrders() {
  loading.value = true
  try {
    const params = { page: page.value, limit: 10 }
    if (filterStatus.value) params.status = filterStatus.value
    const { data } = await ordersAPI.getAll(params)
    orders.value = data.data || data.orders || []
    total.value = data.pagination?.total || 0
    totalPages.value = data.pagination?.totalPages || 0
  } catch (e) { console.error(e) } finally { loading.value = false }
}

function changePage(p) { page.value = p; loadOrders() }
function getVisiblePages() { const pages = []; for (let i = Math.max(1, page.value - 2); i <= Math.min(totalPages.value, page.value + 2); i++) pages.push(i); return pages }

// ⬇️⬇️⬇️ NUEVAS FUNCIONES DE SELECCIÓN DE PRODUCTOS ⬇️⬇️⬇️
function isProductSelected(product) {
  if (!product.variants) return false
  return product.variants.some(v => selectedVariants.value.some(sv => sv.variant_id === v.id))
}

function isVariantSelected(variantId) {
  return selectedVariants.value.some(sv => sv.variant_id === variantId)
}

function getVariantQty(variantId) {
  const item = selectedVariants.value.find(sv => sv.variant_id === variantId)
  return item ? item.quantity : 1
}

function toggleProductSelection(product) {
  if (!product.variants || product.variants.length === 0) return
  
  // Si el producto tiene una sola variante, seleccionarla directamente
  if (product.variants.length === 1) {
    toggleVariant(product.variants[0], product)
    return
  }
  // Si tiene múltiples variantes, expandir/colapsar (ya se hace con el click en variante)
}

function toggleVariant(variant, product) {
  const existingIndex = selectedVariants.value.findIndex(sv => sv.variant_id === variant.id)
  
  if (existingIndex >= 0) {
    // Ya está seleccionada, eliminar
    selectedVariants.value.splice(existingIndex, 1)
  } else {
    // Agregar nueva selección
    selectedVariants.value.push({
      variant_id: variant.id,
      product_name: product.name,
      variant_name: variant.variant_name,
      price: parseFloat(variant.price),
      quantity: 1
    })
  }
}

function increaseQty(variantId) {
  const item = selectedVariants.value.find(sv => sv.variant_id === variantId)
  if (item) item.quantity++
}

function decreaseQty(variantId) {
  const item = selectedVariants.value.find(sv => sv.variant_id === variantId)
  if (item) {
    if (item.quantity > 1) {
      item.quantity--
    } else {
      // Eliminar si la cantidad llega a 0
      const index = selectedVariants.value.findIndex(sv => sv.variant_id === variantId)
      if (index >= 0) selectedVariants.value.splice(index, 1)
    }
  }
}

function onImageError(e) {
  e.target.style.display = 'none'
  const placeholder = e.target.parentElement?.querySelector('.product-image-placeholder')
  if (placeholder) placeholder.style.display = 'flex'
}

// ============================================
// MODAL VENTA
// ============================================
function openCreateModal() {
  orderForm.client_id = ''
  orderForm.payment_method = 'Efectivo'
  selectedVariants.value = []
  if (branches.value.length > 0) orderForm.branch_id = branches.value[0].id
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function saveOrder() {
  if (selectedVariants.value.length === 0) { Swal.fire({ icon: 'warning', title: 'Selecciona al menos un producto' }); return }
  if (!orderForm.branch_id) { Swal.fire({ icon: 'warning', title: 'Selecciona una sucursal' }); return }

  saving.value = true
  try {
    const payload = {
      branch_id: orderForm.branch_id,
      client_id: orderForm.client_id || null,
      payment_method: orderForm.payment_method,
      items: selectedVariants.value.map(item => ({
        variant_id: item.variant_id,
        quantity: item.quantity
      }))
    }

    const { data } = await ordersAPI.create(payload)
    const newOrder = data.order || data

    if (authStore.isClient) {
      Swal.fire({ icon: 'success', title: '¡Compra Realizada!', text: `Total: Bs. ${formatMoney(totalAmount.value)}. Puedes ver el estado en "Mis Compras".`, timer: 3000, showConfirmButton: false })
    } else {
      Swal.fire({ icon: 'success', title: 'Venta creada', text: `Total: Bs. ${formatMoney(totalAmount.value)}`, timer: 2000, showConfirmButton: false })
    }
    closeModal()
    loadOrders()

    if (orderForm.payment_method === 'QR' && newOrder.id) {
      selectedOrder.value = newOrder
      setTimeout(() => { showQrModalOpen.value = true; nextTick(() => generateQrCode(newOrder)) }, 500)
    }
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al procesar' })
  } finally { saving.value = false }
}

// QR
function showQrModal(order) { selectedOrder.value = order; showQrModalOpen.value = true; nextTick(() => generateQrCode(order)) }
function generateQrCode(order) {
  if (!qrCanvas.value) return
  const canvas = qrCanvas.value; const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 280, 280); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 280, 280)
  const qrData = JSON.stringify({ id: order.id, total: order.total_amount, date: order.created_at, concept: `SPA Mascotas - Venta #${order.id?.substring(0, 8)}` })
  const size = 280; const moduleSize = size / 25; const qrMatrix = generateSimpleQR(qrData)
  for (let row = 0; row < 25; row++) for (let col = 0; col < 25; col++) {
    if (qrMatrix[row] && qrMatrix[row][col]) { ctx.fillStyle = '#000000'; ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize) }
  }
  drawPositionPattern(ctx, 0, 0, moduleSize); drawPositionPattern(ctx, 18 * moduleSize, 0, moduleSize); drawPositionPattern(ctx, 0, 18 * moduleSize, moduleSize)
  ctx.fillStyle = '#4e73df'; ctx.beginPath(); ctx.arc(size / 2, size / 2, 15, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'white'; ctx.font = 'bold 14px Poppins'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🐾', size / 2, size / 2)
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, size, size)
}
function generateSimpleQR(data) { const matrix = Array(25).fill().map(() => Array(25).fill(false)); const str = btoa(unescape(encodeURIComponent(data))); let idx = 0; for (let row = 0; row < 25; row++) for (let col = 0; col < 25; col++) { if (row < 8 && col < 8) continue; if (row < 8 && col > 16) continue; if (row > 16 && col < 8) continue; if (idx < str.length) { matrix[row][col] = str.charCodeAt(idx) % 2 === 0; idx++ } } return matrix }
function drawPositionPattern(ctx, x, y, size) { ctx.fillStyle = '#000000'; ctx.fillRect(x, y, size * 3, size * 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + size, y + size, size, size) }
function printQrCode() { const canvas = qrCanvas.value; if (!canvas) return; const dataUrl = canvas.toDataURL('image/png'); const w = window.open('', '_blank', 'width=400,height=600'); w.document.write(`<html><head><title>QR Pago</title></head><body style="text-align:center;font-family:sans-serif;padding:20px;"><h2>🐾 SPA Mascotas</h2><h3>Pago QR</h3><img src="${dataUrl}" style="width:280px;height:280px;"><p>Total: <strong>Bs. ${formatMoney(selectedOrder.value?.total_amount)}</strong></p><script>window.onload=function(){window.print();setTimeout(window.close,500);}<\/script></body></html>`); w.document.close() }

// Factura
async function printInvoice(order) { /* ... mismo código ... */ }

async function updateStatus(id, status) { try { await ordersAPI.updateStatus(id, { status }); Swal.fire({ icon: 'success', title: 'Actualizado', timer: 1500, showConfirmButton: false }); loadOrders() } catch (e) {} }
async function cancelOrder(id) { const r = await Swal.fire({ title: '¿Cancelar?', icon: 'warning', showCancelButton: true }); if (r.isConfirmed) { await ordersAPI.cancel(id, { reason: 'Cancelado' }); Swal.fire({ icon: 'success', title: 'Cancelada', timer: 1500, showConfirmButton: false }); loadOrders() } }
async function markAsPaid() { if (selectedOrder.value) { await updateStatus(selectedOrder.value.id, 'Pagado'); showQrModalOpen.value = false } }

function formatMoney(v) { return parseFloat(v || 0).toFixed(2) }
function formatDate(d) { return d ? new Date(d).toLocaleString('es-BO') : '-' }
function formatStatus(s) { return s ? s.replace(/_/g, ' ') : '' }
function getStatusBadge(s) { const m = { 'Pendiente': 'badge badge-warning', 'WhatsApp_Enviado': 'badge badge-info', 'Pagado': 'badge badge-success', 'Entregado': 'badge badge-primary', 'Cancelado': 'badge badge-danger' }; return m[s] || 'badge badge-secondary' }
</script>

<style scoped>
/* ============================================ */
/* ORDERS PAGE                                  */
/* ============================================ */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.5rem; }
.page-title { margin: 0; color: #5a5c69; }
.card { background: white; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 1rem; }
.card-header { padding: 1rem 1.25rem; border-bottom: 1px solid #e3e6f0; font-weight: 600; color: #4e73df; display: flex; justify-content: space-between; align-items: center; }
.card-body { padding: 1.25rem; }
.table-responsive { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 500px; }
.table th { background: #f8f9fc; padding: 10px 12px; text-align: left; font-weight: 600; color: #4e73df; border-bottom: 2px solid #e3e6f0; font-size: 0.8rem; text-transform: uppercase; }
.table td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 0.85rem; }
.table tbody tr:hover { background: #f8f9fc; }
.btn { padding: 0.45rem 0.85rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; display: inline-flex; align-items: center; gap: 5px; font-size: 0.82rem; transition: all 0.2s; }
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-primary { background: #4e73df; color: white; }
.btn-success { background: #1cc88a; color: white; }
.btn-info { background: #36b9cc; color: white; }
.btn-danger { background: #e74a3b; color: white; }
.btn-secondary { background: #858796; color: white; }
.btn-sm { padding: 0.3rem 0.5rem; font-size: 0.75rem; }
.btn-group { display: flex; gap: 3px; flex-wrap: wrap; }
.badge { padding: 0.2em 0.55em; border-radius: 50px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
.badge-primary { background: #4e73df; color: white; }
.badge-info { background: #36b9cc; color: white; }
.badge-success { background: #1cc88a; color: white; }
.badge-warning { background: #f6c23e; color: #5a5c69; }
.badge-danger { background: #e74a3b; color: white; }
.pagination-container { display: flex; justify-content: center; gap: 4px; margin-top: 1rem; }
.pagination-container button { padding: 0.35rem 0.7rem; border: 1px solid #e3e6f0; background: white; cursor: pointer; border-radius: 4px; }
.pagination-container button.active { background: #4e73df; color: white; border-color: #4e73df; }
.pagination-container button:disabled { opacity: 0.4; cursor: not-allowed; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
.modal-content { background: white; border-radius: 12px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.4); animation: slideUp 0.3s ease; }
.order-modal { max-width: 900px; }
.qr-payment-modal { max-width: 500px; }
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
.form-control, .form-select { width: 100%; padding: 0.55rem 0.7rem; border: 2px solid #e5e7eb; border-radius: 8px; font-family: inherit; font-size: 0.85rem; box-sizing: border-box; }
hr { border: none; border-top: 1px solid #e5e7eb; margin: 1rem 0; }
h5 { margin: 0 0 0.75rem; }

.client-info-banner { background: #e8f0fe; color: #4e73df; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; border: 1px solid #c5d5f7; }
.payment-methods { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.payment-option { flex: 1; min-width: 120px; padding: 0.6rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.2s; }
.payment-option input { display: none; }
.payment-option.active { border-color: #4e73df; background: #e8f0fe; }
.payment-option span { font-size: 0.85rem; }
.qr-preview-box { margin-top: 0.5rem; padding: 0.75rem; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0; }
.qr-info { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #16a34a; }
.qr-info i { font-size: 1.5rem; }

/* ⬇️⬇️⬇️ GRID DE PRODUCTOS CON IMÁGENES ⬇️⬇️⬇️ */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.product-card {
  background: white;
  border-radius: 10px;
  border: 2px solid #e5e7eb;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}
.product-card:hover { border-color: #4e73df; box-shadow: 0 4px 12px rgba(78,115,223,0.15); }
.product-card.product-selected { border-color: #1cc88a; background: #f0fdf4; }

.product-image-container {
  width: 100%;
  height: 160px;
  background: #f8f9fc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}
.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}
.product-card:hover .product-image { transform: scale(1.05); }
.product-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: #cbd5e0;
}

.selected-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #1cc88a;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

.product-body { padding: 0.75rem; flex: 1; display: flex; flex-direction: column; }
.product-name { margin: 0 0 0.25rem; font-size: 0.9rem; color: #1a1a2e; font-weight: 600; }
.product-desc { font-size: 0.75rem; color: #6b7280; margin: 0.25rem 0; }
.badge-info { background: #36b9cc; color: white; }

.variants-list { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 4px; }
.variant-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.5rem 0.6rem; border-radius: 6px;
  background: #f8f9fc; border: 1px solid #e9ecef;
  cursor: pointer; transition: all 0.15s;
}
.variant-item:hover { border-color: #4e73df; }
.variant-item.variant-selected { border-color: #1cc88a; background: #d4edda; }
.variant-info { display: flex; flex-direction: column; }
.variant-name { font-weight: 500; font-size: 0.8rem; }
.variant-sku { font-size: 0.65rem; color: #adb5bd; }
.variant-price-qty { display: flex; align-items: center; gap: 8px; }
.variant-price { font-weight: 600; color: #4e73df; font-size: 0.85rem; }

.qty-control { display: flex; align-items: center; gap: 4px; }
.qty-btn {
  width: 22px; height: 22px; border-radius: 50%;
  border: 1px solid #1cc88a; background: white; color: #1cc88a;
  cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; line-height: 1;
}
.qty-btn:hover { background: #1cc88a; color: white; }
.qty-value { font-weight: 600; font-size: 0.85rem; min-width: 20px; text-align: center; }

.no-products {
  grid-column: 1 / -1; text-align: center; padding: 2rem;
  color: #adb5bd;
}
.no-products i { font-size: 3rem; display: block; margin-bottom: 0.5rem; }

/* Resumen seleccionados */
.selected-summary {
  margin-top: 1rem; padding: 0.75rem 1rem;
  background: #f0fdf4; border-radius: 8px;
  border: 1px solid #bbf7d0;
}
.selected-summary h6 { margin: 0 0 0.5rem; color: #1cc88a; }
.summary-item { display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.8rem; }

.total-box { margin-top: 1rem; padding: 1rem; background: #f8f9fc; border-radius: 8px; }
.total-row { display: flex; justify-content: space-between; font-size: 0.9rem; }
.total-row.final { font-size: 1.2rem; font-weight: 700; }

.client-message { margin-top: 1rem; padding: 0.75rem 1rem; background: #d1ecf1; color: #0c5460; border-radius: 8px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; border: 1px solid #bee5eb; }

.qr-container { margin: 1rem 0; display: flex; justify-content: center; }
.qr-container canvas { border: 3px solid #e5e7eb; border-radius: 8px; }
.qr-details { margin-top: 1rem; }
.qr-details h4 { margin: 0 0 0.5rem; }

.text-center { text-align: center; }
.text-muted { color: #858796; }
.text-primary { color: #4e73df; }
.py-4 { padding: 2rem 0; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }

.spinner-small { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) { .products-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); } .payment-methods { flex-direction: column; } .btn-group { flex-wrap: wrap; } }
@media (max-width: 480px) { .page-header { flex-direction: column; align-items: stretch; } .page-header .btn { justify-content: center; } .products-grid { grid-template-columns: 1fr; } }
</style>