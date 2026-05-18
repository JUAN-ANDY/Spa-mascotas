<template>
  <div class="data-table-container">
    <!-- Búsqueda y filtros -->
    <div class="table-toolbar" v-if="showSearch || $slots.toolbar">
      <div class="search-box" v-if="showSearch">
        <i class="bi bi-search"></i>
        <input 
          v-model="searchQuery" 
          class="form-control" 
          :placeholder="searchPlaceholder"
          @input="onSearch"
        >
      </div>
      <slot name="toolbar"></slot>
    </div>

    <!-- Tabla -->
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th v-if="selectable" width="50">
              <input type="checkbox" @change="toggleAll" v-model="allSelected">
            </th>
            <th 
              v-for="column in columns" 
              :key="column.key"
              :width="column.width"
              :class="{ sortable: column.sortable }"
              @click="column.sortable && sort(column.key)"
            >
              {{ column.label }}
              <span v-if="column.sortable" class="sort-icon">
                <i :class="sortColumn === column.key ? (sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-arrow-down-up'"></i>
              </span>
            </th>
            <th v-if="$slots.actions" width="120">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length + (selectable ? 1 : 0) + ($slots.actions ? 1 : 0)" class="loading-cell">
              <Loading />
            </td>
          </tr>
          <tr v-else-if="data.length === 0">
            <td :colspan="columns.length + (selectable ? 1 : 0) + ($slots.actions ? 1 : 0)" class="empty-cell">
              <i class="bi bi-inbox" style="font-size: 2rem; display: block; color: #ccc;"></i>
              <span>{{ emptyMessage }}</span>
            </td>
          </tr>
          <tr 
            v-for="(row, index) in data" 
            :key="row.id || index"
            :class="{ selected: selectedRows.includes(row.id) }"
            @click="selectable && toggleRow(row.id)"
          >
            <td v-if="selectable">
              <input type="checkbox" :checked="selectedRows.includes(row.id)" @click.stop>
            </td>
            <td v-for="column in columns" :key="column.key">
              <slot :name="'cell-' + column.key" :row="row" :value="row[column.key]">
                <!-- Badge para estados -->
                <span v-if="column.type === 'badge'" :class="getBadgeClass(row[column.key])">
                  {{ formatValue(row[column.key], column) }}
                </span>
                <!-- Fecha formateada -->
                <span v-else-if="column.type === 'date'">
                  {{ formatDate(row[column.key]) }}
                </span>
                <!-- Precio formateado -->
                <span v-else-if="column.type === 'price'">
                  Bs. {{ formatPrice(row[column.key]) }}
                </span>
                <!-- Valor por defecto -->
                <span v-else>{{ formatValue(row[column.key], column) }}</span>
              </slot>
            </td>
            <td v-if="$slots.actions">
              <slot name="actions" :row="row"></slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginación -->
    <div class="table-footer" v-if="showPagination && totalPages > 1">
      <div class="pagination-info">
        Mostrando {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, total) }} de {{ total }} registros
      </div>
      <div class="pagination">
        <button 
          class="btn btn-sm" 
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          <i class="bi bi-chevron-left"></i>
        </button>
        <button 
          v-for="page in visiblePages" 
          :key="page" 
          :class="{ active: page === currentPage }"
          class="btn btn-sm"
          @click="changePage(page)"
        >{{ page }}</button>
        <button 
          class="btn btn-sm" 
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
      <div class="page-size-selector">
        <select v-model="pageSizeModel" class="form-select form-select-sm" @change="changePageSize">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Loading from './Loading.vue'

const props = defineProps({
  columns: {
    type: Array,
    required: true
  },
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  total: {
    type: Number,
    default: 0
  },
  currentPage: {
    type: Number,
    default: 1
  },
  pageSize: {
    type: Number,
    default: 10
  },
  totalPages: {
    type: Number,
    default: 0
  },
  showSearch: {
    type: Boolean,
    default: false
  },
  showPagination: {
    type: Boolean,
    default: true
  },
  searchPlaceholder: {
    type: String,
    default: 'Buscar...'
  },
  emptyMessage: {
    type: String,
    default: 'No se encontraron registros'
  },
  selectable: {
    type: Boolean,
    default: false
  },
  selected: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['search', 'sort', 'page-change', 'update:selected'])
const searchQuery = ref('')
const sortColumn = ref('')
const sortDirection = ref('asc')
const allSelected = ref(false)
const selectedRows = ref([...props.selected])
const pageSizeModel = ref(props.pageSize)

watch(() => props.selected, (newVal) => {
  selectedRows.value = [...newVal]
})

const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, props.currentPage - Math.floor(maxVisible / 2))
  let end = Math.min(props.totalPages, start + maxVisible - 1)
  
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

function onSearch() {
  emit('search', searchQuery.value)
}

function sort(column) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
  emit('sort', { column: sortColumn.value, direction: sortDirection.value })
}

function changePage(page) {
  emit('page-change', page)
}

function changePageSize() {
  emit('page-change', 1, pageSizeModel.value)
}

function toggleAll() {
  if (allSelected.value) {
    selectedRows.value = props.data.map(row => row.id)
  } else {
    selectedRows.value = []
  }
  emit('update:selected', selectedRows.value)
}

function toggleRow(id) {
  const index = selectedRows.value.indexOf(id)
  if (index > -1) {
    selectedRows.value.splice(index, 1)
  } else {
    selectedRows.value.push(id)
  }
  allSelected.value = selectedRows.value.length === props.data.length
  emit('update:selected', selectedRows.value)
}

function formatValue(value, column) {
  if (value === null || value === undefined) return '-'
  if (column.format) return column.format(value)
  return value
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function formatPrice(price) {
  if (price === null || price === undefined) return '0.00'
  return parseFloat(price).toFixed(2)
}

function getBadgeClass(value) {
  const statusMap = {
    'Pendiente': 'badge-pendiente',
    'Confirmada': 'badge-success',
    'En_Proceso': 'badge-info',
    'Completada': 'badge-completada',
    'Cancelada': 'badge-cancelada',
    'No_Asistio': 'badge-danger',
    'WhatsApp_Enviado': 'badge-info',
    'Pagado': 'badge-success',
    'Entregado': 'badge-primary',
    'cancelado': 'badge-cancelada',
    'Administrador': 'badge-primary',
    'Recepcion': 'badge-info',
    'Groomer': 'badge-warning',
    'Cliente': 'badge-secondary'
  }
  return `badge ${statusMap[value] || 'badge-secondary'}`
}
</script>

<style scoped>
.data-table-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.search-box {
  position: relative;
  width: 300px;
}

.search-box i {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
}

.search-box input {
  padding-left: 35px;
}

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: #f8f9fc;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--primary);
  border-bottom: 2px solid var(--border);
  white-space: nowrap;
  font-size: 0.85rem;
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.data-table th.sortable:hover {
  background: #e8ecf4;
}

.sort-icon {
  margin-left: 5px;
  font-size: 0.8rem;
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  font-size: 0.9rem;
}

.data-table tbody tr:hover {
  background: #f8f9fc;
}

.data-table tbody tr.selected {
  background: #e8f0fe;
}

.loading-cell,
.empty-cell {
  text-align: center;
  padding: 3rem !important;
  color: #999;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
  gap: 1rem;
}

.pagination-info {
  font-size: 0.85rem;
  color: #666;
}

.pagination {
  display: flex;
  gap: 0.25rem;
}

.pagination .btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--border);
  background: white;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.85rem;
}

.pagination .btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.pagination .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-size-selector select {
  padding: 0.375rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 0.85rem;
}
</style>