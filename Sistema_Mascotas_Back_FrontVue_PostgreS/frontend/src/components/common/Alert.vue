<template>
  <div v-if="visible" :class="['alert', `alert-${type}`]">
    <div class="alert-content">
      <i :class="iconClass"></i>
      <span>{{ message }}</span>
    </div>
    <button v-if="dismissible" class="alert-close" @click="close">
      <i class="bi bi-x"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'info',
    validator: (v) => ['success', 'danger', 'warning', 'info'].includes(v)
  },
  message: {
    type: String,
    required: true
  },
  dismissible: {
    type: Boolean,
    default: true
  },
  autoClose: {
    type: Number,
    default: 0
  },
  show: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close'])
const visible = ref(props.show)

watch(() => props.show, (val) => {
  visible.value = val
})

const iconClass = computed(() => {
  const icons = {
    success: 'bi bi-check-circle-fill',
    danger: 'bi bi-exclamation-triangle-fill',
    warning: 'bi bi-exclamation-circle-fill',
    info: 'bi bi-info-circle-fill'
  }
  return icons[props.type] || icons.info
})

function close() {
  visible.value = false
  emit('close')
}

if (props.autoClose > 0) {
  setTimeout(close, props.autoClose)
}
</script>

<style scoped>
.alert {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.alert-success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.alert-danger {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.alert-warning {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.alert-info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.alert-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  opacity: 0.7;
  padding: 0;
  color: inherit;
}

.alert-close:hover {
  opacity: 1;
}
</style>