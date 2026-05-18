<template>
  <form @submit.prevent="handleSubmit" class="register-form">
    <div class="form-header">
      <h3>Registrar Usuario</h3>
    </div>

    <div class="row">
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Nombre *</label>
          <input 
            v-model="form.first_name" 
            class="form-control" 
            :class="{ 'is-invalid': errors.first_name }"
            placeholder="Nombre"
            required
          >
          <span v-if="errors.first_name" class="invalid-feedback">{{ errors.first_name }}</span>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Apellido *</label>
          <input 
            v-model="form.last_name" 
            class="form-control" 
            :class="{ 'is-invalid': errors.last_name }"
            placeholder="Apellido"
            required
          >
          <span v-if="errors.last_name" class="invalid-feedback">{{ errors.last_name }}</span>
        </div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Email *</label>
      <input 
        v-model="form.email" 
        type="email" 
        class="form-control" 
        :class="{ 'is-invalid': errors.email }"
        placeholder="correo@ejemplo.com"
        required
      >
      <span v-if="errors.email" class="invalid-feedback">{{ errors.email }}</span>
    </div>

    <div class="row">
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Contraseña *</label>
          <input 
            v-model="form.password" 
            type="password" 
            class="form-control" 
            :class="{ 'is-invalid': errors.password }"
            placeholder="Mínimo 6 caracteres"
            required
          >
          <span v-if="errors.password" class="invalid-feedback">{{ errors.password }}</span>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label class="form-label">Rol *</label>
          <select v-model="form.role" class="form-select" required>
            <option value="">Seleccionar rol</option>
            <option value="Administrador">Administrador</option>
            <option value="Recepcion">Recepcionista</option>
            <option value="Groomer">Groomer</option>
            <option value="Cliente">Cliente</option>
          </select>
        </div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Teléfono</label>
      <input 
        v-model="form.phone" 
        class="form-control" 
        placeholder="+591 77712345"
      >
    </div>

    <div class="form-group" v-if="form.role === 'Groomer'">
      <label class="form-label">Capacidad Concurrente</label>
      <input 
        v-model.number="form.concurrent_capacity" 
        type="number" 
        class="form-control" 
        min="1" 
        max="5"
        placeholder="1"
      >
    </div>

    <button type="submit" class="btn btn-primary submit-btn" :disabled="loading">
      <span v-if="loading" class="spinner-small"></span>
      <span v-else>Registrar Usuario</span>
    </button>
  </form>
</template>

<script setup>
import { reactive, ref } from 'vue'

const emit = defineEmits(['submit', 'cancel'])

const form = reactive({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: '',
  phone: '',
  concurrent_capacity: 1
})

const errors = reactive({
  first_name: '',
  last_name: '',
  email: '',
  password: ''
})

const loading = ref(false)

function validate() {
  let valid = true
  
  if (!form.first_name.trim()) {
    errors.first_name = 'Nombre requerido'
    valid = false
  }
  if (!form.last_name.trim()) {
    errors.last_name = 'Apellido requerido'
    valid = false
  }
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Email inválido'
    valid = false
  }
  if (form.password.length < 6) {
    errors.password = 'Mínimo 6 caracteres'
    valid = false
  }
  
  return valid
}

async function handleSubmit() {
  if (!validate()) return
  
  loading.value = true
  
  try {
    emit('submit', { ...form })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-form {
  width: 100%;
  max-width: 500px;
}

.form-header {
  margin-bottom: 1.5rem;
}

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  justify-content: center;
  margin-top: 1rem;
}

.spinner-small {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>