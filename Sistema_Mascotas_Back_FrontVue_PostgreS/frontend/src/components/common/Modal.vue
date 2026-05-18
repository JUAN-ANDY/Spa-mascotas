<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content" :style="{ maxWidth: maxWidth }">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="btn btn-sm" @click="$emit('close')">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      <div class="modal-body">
        <slot></slot>
      </div>
      <div class="modal-footer" v-if="$slots.footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: Boolean,
  title: String,
  maxWidth: { type: String, default: '600px' }
})
defineEmits(['close'])
</script>