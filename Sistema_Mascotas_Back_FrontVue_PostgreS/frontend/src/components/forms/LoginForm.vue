<template>
  <form @submit.prevent="handleSubmit" class="login-form">
    <div class="form-header">
      <i class="bi bi-heart-pulse logo-icon"></i>
      <h2>SPA Mascotas</h2>
      <p>Inicia sesión para continuar</p>
    </div>

    <Alert 
      v-if="error" 
      :message="error" 
      type="danger" 
      @close="error = ''" 
    />

    <div class="form-group">
      <label class="form-label">Correo Electrónico</label>
      <div class="input-with-icon">
        <i class="bi bi-envelope"></i>
        <input 
          v-model="form.email" 
          type="email" 
          class="form-control"
          :class="{ 'is-invalid': errors.email }"
          placeholder="tu@correo.com"
          required
          @input="validateField('email')"
        >
      </div>
      <span v-if="errors.email" class="invalid-feedback">{{ errors.email }}</span>
    </div>

    <div class="form-group">
      <label class="form-label">Contraseña</label>
      <div class="input-with-icon">
        <i class="bi bi-lock"></i>
        <input 
          v-model="form.password" 
          :type="showPassword ? 'text' : 'password'" 
          class="form-control"
          :class="{ 'is-invalid': errors.password }"
          placeholder="••••••"
          required
          @input="validateField('password')"
        >
        <button type="button" class="toggle-password" @click="showPassword = !showPassword">
          <i :class="showPassword ? 'bi-eye-slash' : 'bi-eye'"></i>
        </button>
      </div>
      <span v-if="errors.password" class="invalid-feedback">{{ errors.password }}</span>
    </div>

    <div class="form-options">
      <label class="checkbox-label">
        <input type="checkbox" v-model="rememberMe">
        Recordarme
      </label>
      <a href="#" class="forgot-link">¿Olvidaste tu contraseña?</a>
    </div>

    <button type="submit" class="btn btn-primary submit-btn" :disabled="loading">
      <span v-if="loading" class="spinner-small"></span>
      <span v-else>Iniciar Sesión</span>
    </button>

    <div class="demo-credentials">
      <small>Demo: admin@spa.com / admin123</small>
    </div>
  </form>
</template>

<script setup>
import { reactive, ref } from 'vue'
import Alert from '../common/Alert.vue'

const emit = defineEmits(['submit'])

const form = reactive({
  email: '',
  password: ''
})

const errors = reactive({
  email: '',
  password: ''
})

const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const rememberMe = ref(false)

function validateField(field) {
  errors[field] = ''
  
  if (field === 'email' && form.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      errors.email = 'Ingresa un correo válido'
    }
  }
  
  if (field === 'password' && form.password) {
    if (form.password.length < 6) {
      errors.password = 'Mínimo 6 caracteres'
    }
  }
}

function validateForm() {
  validateField('email')
  validateField('password')
  return !errors.email && !errors.password && form.email && form.password
}

async function handleSubmit() {
  error.value = ''
  
  if (!validateForm()) return
  
  loading.value = true
  
  try {
    emit('submit', { ...form, rememberMe: rememberMe.value })
  } catch (err) {
    error.value = err.message || 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-form {
  width: 100%;
  max-width: 400px;
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.form-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-icon {
  font-size: 3rem;
  color: var(--primary);
}

.form-header h2 {
  margin: 0.5rem 0 0.25rem;
  color: var(--dark);
}

.form-header p {
  color: var(--secondary);
  font-size: 0.9rem;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-icon > i:first-child {
  position: absolute;
  left: 12px;
  color: #999;
  z-index: 1;
}

.input-with-icon .form-control {
  padding-left: 38px;
  padding-right: 40px;
}

.toggle-password {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  padding: 4px;
}

.toggle-password:hover {
  color: #333;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  font-size: 0.85rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
}

.forgot-link {
  color: var(--primary);
  text-decoration: none;
}

.forgot-link:hover {
  text-decoration: underline;
}

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  justify-content: center;
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

.demo-credentials {
  text-align: center;
  margin-top: 1rem;
  color: #999;
  font-size: 0.8rem;
}
</style>