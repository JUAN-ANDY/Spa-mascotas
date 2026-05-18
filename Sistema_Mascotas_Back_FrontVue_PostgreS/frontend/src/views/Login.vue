<template>
  <div class="login-page" :style="backgroundStyle">
    <div class="login-overlay"></div>
    
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-circle"><span class="logo-emoji">🐾</span></div>
          <h2 class="app-title">SPA Mascotas</h2>
          <p class="app-subtitle">Sistema de Gestión</p>
          <p class="app-version">versión 1.0.0</p>
        </div>

        <!-- ============================================ -->
        <!-- FORMULARIO DE LOGIN                          -->
        <!-- ============================================ -->
        <form v-if="!showRegister" @submit.prevent="handleLogin" class="auth-form">
          <div class="form-group">
            <label class="form-label">Correo Electrónico</label>
            <div class="input-wrapper">
              <span class="input-icon-left"><i class="bi bi-envelope"></i></span>
              <input v-model="loginForm.email" type="email" class="form-input" placeholder="Ingresa tu email" required autocomplete="email">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <div class="input-wrapper">
              <span class="input-icon-left"><i class="bi bi-lock"></i></span>
              <input v-model="loginForm.password" :type="showPassword ? 'text' : 'password'" class="form-input" placeholder="••••••••" required autocomplete="current-password">
              <span class="input-icon-right" @click="showPassword = !showPassword"><i :class="showPassword ? 'bi-eye-slash' : 'bi-eye'"></i></span>
            </div>
          </div>

          <!-- CAPTCHA -->
          <div class="captcha-section">
            <label class="form-label">Código de Seguridad</label>
            <div class="captcha-box">
              <div class="captcha-canvas" @click="generateCaptcha" title="Clic para nuevo código"><canvas ref="captchaCanvas" width="160" height="48"></canvas></div>
              <button type="button" class="captcha-refresh" @click="generateCaptcha" title="Nuevo código"><i class="bi bi-arrow-repeat"></i></button>
            </div>
            <input v-model="loginForm.captcha" class="form-input mt-2" placeholder="Ingresa el código mostrado" required maxlength="6" autocomplete="off">
            <div v-if="captchaError" class="captcha-error"><i class="bi bi-exclamation-circle"></i> {{ captchaError }}</div>
          </div>

          <div class="forgot-password"><a href="#" @click.prevent="forgotPassword">¿Olvidaste tu contraseña?</a></div>

          <button type="submit" class="btn-submit" :disabled="loading">
            <span v-if="loading" class="spinner-small"></span>
            <span v-else>INICIAR SESIÓN</span>
          </button>

          <!-- ⬇️⬇️⬇️ SEPARADOR "O" ⬇️⬇️⬇️ -->
          <div class="divider">
            <span class="divider-line"></span>
            <span class="divider-text">o</span>
            <span class="divider-line"></span>
          </div>

          <!-- ⬇️⬇️⬇️ BOTÓN DE GOOGLE ⬇️⬇️⬇️ -->
          <button type="button" class="btn-google" @click="handleGoogleLogin" :disabled="googleLoading">
            <span v-if="googleLoading" class="spinner-small"></span>
            <span v-else>
              <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </span>
          </button>

          <!-- ⬇️ MENSAJE DE ERROR CON INTENTOS RESTANTES O BLOQUEO ⬇️ -->
          <div v-if="loginError" class="alert alert-danger mt-2">
            <i class="bi bi-exclamation-triangle"></i> {{ loginError }}
          </div>
          <!-- ⬇️ MENSAJE DE CUENTA BLOQUEADA ⬇️ -->
          <div v-if="isLocked" class="alert alert-danger mt-2" style="background: rgba(231,74,59,0.3); border-color: #e74a3b;">
            <i class="bi bi-lock-fill"></i> {{ lockMessage }}
          </div>
          <!-- ⬇️ CONTADOR DE INTENTOS ⬇️ -->
          <div v-if="attemptsLeft !== null && attemptsLeft > 0" class="attempts-warning mt-2">
            <i class="bi bi-exclamation-triangle-fill"></i> Te quedan <strong>{{ attemptsLeft }}</strong> intento(s) antes del bloqueo
          </div>
        </form>

        <!-- ============================================ -->
        <!-- FORMULARIO DE REGISTRO (SOLO CLIENTES)       -->
        <!-- ============================================ -->
        <form v-else @submit.prevent="handleRegister" class="auth-form">
          <h5 class="register-title">Crear Nueva Cuenta</h5>
          <p class="register-subtitle">Regístrate como cliente para agendar citas y comprar productos</p>
          
          <div class="form-row">
            <div class="form-group form-half"><label class="form-label">Nombre *</label><input v-model="registerForm.first_name" class="form-input" placeholder="Tu nombre" required></div>
            <div class="form-group form-half"><label class="form-label">Apellido *</label><input v-model="registerForm.last_name" class="form-input" placeholder="Tu apellido" required></div>
          </div>
          <div class="form-group"><label class="form-label">Correo Electrónico *</label><input v-model="registerForm.email" type="email" class="form-input" placeholder="tu@email.com" required></div>
          <div class="form-group"><label class="form-label">Teléfono</label><input v-model="registerForm.phone" class="form-input" placeholder="+591 77712345"></div>
          
          <!-- ⬇️⬇️⬇️ CONTRASEÑA CON MEDIDOR DE FORTALEZA ⬇️⬇️⬇️ -->
          <div class="form-row">
            <div class="form-group form-half">
              <label class="form-label">Contraseña *</label>
              <div class="input-wrapper">
                <input v-model="registerForm.password" :type="showRegPassword ? 'text' : 'password'" class="form-input" placeholder="Mín. 8 caracteres" required minlength="8" @input="checkPasswordStrength">
                <span class="input-icon-right" @click="showRegPassword = !showRegPassword"><i :class="showRegPassword ? 'bi-eye-slash' : 'bi-eye'"></i></span>
              </div>
              <!-- ⬇️ MEDIDOR DE FORTALEZA ⬇️ -->
              <div v-if="registerForm.password.length > 0" class="password-strength">
                <div class="strength-bar">
                  <div class="strength-fill" :class="strengthClass" :style="{ width: strengthPercent + '%' }"></div>
                </div>
                <div class="strength-info">
                  <span :class="'strength-text ' + strengthClass">{{ strengthLabel }}</span>
                  <div class="strength-criteria">
                    <span :class="{ met: hasMinLength }"><i :class="hasMinLength ? 'bi-check-circle-fill' : 'bi-circle'"></i> 8+ caracteres</span>
                    <span :class="{ met: hasUpperCase }"><i :class="hasUpperCase ? 'bi-check-circle-fill' : 'bi-circle'"></i> Mayúsculas</span>
                    <span :class="{ met: hasLowerCase }"><i :class="hasLowerCase ? 'bi-check-circle-fill' : 'bi-circle'"></i> Minúsculas</span>
                    <span :class="{ met: hasNumber }"><i :class="hasNumber ? 'bi-check-circle-fill' : 'bi-circle'"></i> Números</span>
                    <span :class="{ met: hasSymbol }"><i :class="hasSymbol ? 'bi-check-circle-fill' : 'bi-circle'"></i> Símbolos</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-group form-half">
              <label class="form-label">Confirmar *</label>
              <input v-model="registerForm.confirm_password" :type="showRegPassword ? 'text' : 'password'" class="form-input" placeholder="Repite la contraseña" required>
              <div v-if="registerForm.confirm_password && registerForm.password !== registerForm.confirm_password" class="text-danger mt-1">
                <i class="bi bi-exclamation-circle"></i> Las contraseñas no coinciden
              </div>
              <div v-else-if="registerForm.confirm_password && registerForm.password === registerForm.confirm_password" class="text-success mt-1">
                <i class="bi bi-check-circle"></i> Las contraseñas coinciden
              </div>
            </div>
          </div>

          <!-- CAPTCHA Registro -->
          <div class="captcha-section">
            <label class="form-label">Código de Seguridad</label>
            <div class="captcha-box">
              <div class="captcha-canvas" @click="generateRegCaptcha" title="Clic para nuevo código"><canvas ref="regCaptchaCanvas" width="160" height="48"></canvas></div>
              <button type="button" class="captcha-refresh" @click="generateRegCaptcha" title="Nuevo código"><i class="bi bi-arrow-repeat"></i></button>
            </div>
            <input v-model="registerForm.captcha" class="form-input mt-2" placeholder="Ingresa el código mostrado" required maxlength="6" autocomplete="off">
          </div>

          <!-- ⬇️⬇️⬇️ SEPARADOR "O" ⬇️⬇️⬇️ -->
          <div class="divider">
            <span class="divider-line"></span>
            <span class="divider-text">o</span>
            <span class="divider-line"></span>
          </div>

          <!-- ⬇️⬇️⬇️ BOTÓN DE GOOGLE EN REGISTRO ⬇️⬇️⬇️ -->
          <button type="button" class="btn-google" @click="handleGoogleLogin" :disabled="googleLoading">
            <span v-if="googleLoading" class="spinner-small"></span>
            <span v-else>
              <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Registrarse con Google
            </span>
          </button>

          <div v-if="registerError" class="alert alert-danger"><i class="bi bi-exclamation-triangle"></i> {{ registerError }}</div>
          <div v-if="registerSuccess" class="alert alert-success"><i class="bi bi-check-circle"></i> {{ registerSuccess }}</div>

          <!-- ⬇️ BOTÓN DESHABILITADO SI CONTRASEÑA DÉBIL ⬇️ -->
          <button type="submit" class="btn-submit" :disabled="registering || !isPasswordValid">
            <span v-if="registering" class="spinner-small"></span>
            <span v-else>CREAR CUENTA</span>
          </button>
        </form>

        <div class="toggle-form">
          <template v-if="!showRegister"><span>¿No tienes cuenta?</span><a href="#" @click.prevent="toggleRegister">Registrarse como Cliente</a></template>
          <template v-else><span>¿Ya tienes cuenta?</span><a href="#" @click.prevent="showRegister = false">Iniciar Sesión</a></template>
        </div>

        <div class="demo-credentials" v-if="!showRegister"><small>🔑 Demo: admin@spa.com / admin123</small></div>
      </div>

      <div class="login-footer"><p>© {{ currentYear }} SPA Mascotas - Todos los derechos reservados</p></div>
    </div>

    <div v-if="!backgroundImageUrl" class="background-gradient"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store'
import { authAPI, clientsAPI } from '../services/api'
import Swal from 'sweetalert2'

const router = useRouter()
const authStore = useAuthStore()

const backgroundImageUrl = ref('/background.jpg')
const backgroundStyle = computed(() => {
  if (backgroundImageUrl.value) return { backgroundImage: `url(${backgroundImageUrl.value})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed' }
  return {}
})

const showRegister = ref(false)
const showPassword = ref(false)
const showRegPassword = ref(false)
const loading = ref(false)
const registering = ref(false)
const googleLoading = ref(false)
const loginError = ref('')
const registerError = ref('')
const registerSuccess = ref('')
const captchaError = ref('')
const currentYear = new Date().getFullYear()

// ⬇️⬇️⬇️ VARIABLES DE BLOQUEO ⬇️⬇️⬇️
const isLocked = ref(false)
const lockMessage = ref('')
const attemptsLeft = ref(null)

const loginForm = reactive({ email: '', password: '', captcha: '' })
const registerForm = reactive({ first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '', captcha: '' })

const captchaCanvas = ref(null)
const regCaptchaCanvas = ref(null)
let captchaCode = ''
let regCaptchaCode = ''

// ⬇️⬇️⬇️ FORTALEZA DE CONTRASEÑA ⬇️⬇️⬇️
const hasMinLength = computed(() => registerForm.password.length >= 8)
const hasUpperCase = computed(() => /[A-Z]/.test(registerForm.password))
const hasLowerCase = computed(() => /[a-z]/.test(registerForm.password))
const hasNumber = computed(() => /[0-9]/.test(registerForm.password))
const hasSymbol = computed(() => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(registerForm.password))

const strengthScore = computed(() => {
  let score = 0
  if (hasMinLength.value) score++
  if (hasUpperCase.value) score++
  if (hasLowerCase.value) score++
  if (hasNumber.value) score++
  if (hasSymbol.value) score++
  return score
})

const strengthPercent = computed(() => (strengthScore.value / 5) * 100)
const strengthLabel = computed(() => {
  if (strengthScore.value <= 1) return 'Muy Débil'
  if (strengthScore.value === 2) return 'Débil'
  if (strengthScore.value === 3) return 'Medio'
  if (strengthScore.value === 4) return 'Fuerte'
  if (strengthScore.value === 5) return 'Muy Fuerte'
  return ''
})
const strengthClass = computed(() => {
  if (strengthScore.value <= 1) return 'very-weak'
  if (strengthScore.value === 2) return 'weak'
  if (strengthScore.value === 3) return 'medium'
  if (strengthScore.value >= 4) return 'strong'
  return ''
})
const isPasswordValid = computed(() => hasMinLength.value && strengthScore.value >= 3)

function checkPasswordStrength() {}

function generateCode() { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = ''; for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length)); return code }

function drawCaptcha(canvas, code) {
  if (!canvas) return
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 160, 48)
  ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, 160, 48)
  for (let i = 0; i < 4; i++) { ctx.strokeStyle = `rgba(${100+Math.random()*155},${100+Math.random()*155},${100+Math.random()*155},0.4)`; ctx.beginPath(); ctx.moveTo(Math.random()*160, Math.random()*48); ctx.lineTo(Math.random()*160, Math.random()*48); ctx.stroke() }
  for (let i = 0; i < 20; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.3})`; ctx.fillRect(Math.random()*160, Math.random()*48, 2, 2) }
  ctx.font = 'bold 22px "Poppins", sans-serif'; ctx.fillStyle = '#1a1a2e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (let i = 0; i < code.length; i++) { const x = 25 + i * 28; const y = 24 + (Math.random()-0.5)*12; const angle = (Math.random()-0.5)*0.5; ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillText(code.charAt(i), 0, 0); ctx.restore() }
}

function generateCaptcha() { captchaCode = generateCode(); nextTick(() => drawCaptcha(captchaCanvas.value, captchaCode)) }
function generateRegCaptcha() { regCaptchaCode = generateCode(); nextTick(() => drawCaptcha(regCaptchaCanvas.value, regCaptchaCode)) }

function toggleRegister() {
  showRegister.value = true; registerError.value = ''; registerSuccess.value = ''; loginError.value = ''
  Object.assign(registerForm, { first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '', captcha: '' })
  nextTick(() => generateRegCaptcha())
}

// ⬇️⬇️⬇️ LOGIN CON GOOGLE ⬇️⬇️⬇️
async function handleGoogleLogin() {
  googleLoading.value = true
  loginError.value = ''
  registerError.value = ''

  try {
    // Usar la API de Google Identity Services
    const google = window.google

    if (!google) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El servicio de Google no está disponible. Verifica tu conexión a internet.'
      })
      googleLoading.value = false
      return
    }

    // Inicializar el cliente de Google
    google.accounts.id.initialize({
      client_id: 'TU_CLIENT_ID_DE_GOOGLE', // ⬅️ REEMPLAZAR CON TU CLIENT ID REAL
      callback: handleGoogleResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    })

    // Mostrar el popup de selección de cuenta
    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        console.log('Google prompt no mostrado:', notification.getNotDisplayedReason())
        googleLoading.value = false
      }
    })

  } catch (error) {
    console.error('Error en Google Login:', error)
    googleLoading.value = false
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error al iniciar sesión con Google. Intenta de nuevo.'
    })
  }
}

// ⬇️⬇️⬇️ RESPUESTA DE GOOGLE ⬇️⬇️⬇️
async function handleGoogleResponse(response) {
  try {
    const credential = response.credential

    if (!credential) {
      googleLoading.value = false
      return
    }

    // Enviar el token de Google al backend para verificarlo
    const result = await authStore.loginWithGoogle(credential)

    if (result.success) {
      Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        timer: 1500,
        showConfirmButton: false
      })
      setTimeout(() => router.push('/'), 500)
    } else {
      loginError.value = result.error || 'Error al iniciar sesión con Google'
    }
  } catch (error) {
    console.error('Error en respuesta de Google:', error)
    loginError.value = 'Error al procesar la respuesta de Google'
  } finally {
    googleLoading.value = false
  }
}

// ⬇️⬇️⬇️ LOGIN CON MANEJO DE BLOQUEO E INTENTOS ⬇️⬇️⬇️
async function handleLogin() {
  captchaError.value = ''; loginError.value = ''
  isLocked.value = false; lockMessage.value = ''; attemptsLeft.value = null

  if (!loginForm.captcha || loginForm.captcha.toUpperCase() !== captchaCode) { 
    captchaError.value = 'Código de seguridad incorrecto'
    generateCaptcha(); loginForm.captcha = ''; return 
  }
  if (!loginForm.email || !loginForm.password) { 
    loginError.value = 'Completa todos los campos'; return 
  }
  
  loading.value = true
  try {
    const result = await authStore.login(loginForm.email, loginForm.password)
    if (result.success) { 
      router.push('/') 
    } else {
      if (result.locked) {
        isLocked.value = true
        lockMessage.value = result.error || 'Cuenta bloqueada temporalmente.'
        loginError.value = ''
      } else if (result.attemptsLeft !== undefined) {
        attemptsLeft.value = result.attemptsLeft
        loginError.value = result.error || 'Credenciales inválidas'
      } else {
        loginError.value = result.error || 'Credenciales inválidas'
      }
      generateCaptcha()
      loginForm.captcha = ''
    }
  } catch (error) {
    if (error.response?.status === 423) {
      isLocked.value = true
      lockMessage.value = error.response.data.message || 'Cuenta bloqueada por seguridad.'
      loginError.value = ''
    } else {
      loginError.value = 'Error de conexión con el servidor'
    }
    generateCaptcha()
    loginForm.captcha = ''
  } finally { 
    loading.value = false 
  }
}

async function handleRegister() {
  registerError.value = ''; registerSuccess.value = ''

  if (!registerForm.captcha || registerForm.captcha.toUpperCase() !== regCaptchaCode) { registerError.value = 'Código de seguridad incorrecto'; generateRegCaptcha(); registerForm.captcha = ''; return }
  if (!registerForm.first_name || !registerForm.last_name || !registerForm.email || !registerForm.password) { registerError.value = 'Completa todos los campos requeridos (*)'; return }
  
  if (registerForm.password.length < 8) { registerError.value = 'La contraseña debe tener al menos 8 caracteres'; return }
  if (!isPasswordValid.value) { registerError.value = 'La contraseña debe contener al menos 3 de: mayúsculas, minúsculas, números y símbolos'; return }
  
  if (registerForm.password !== registerForm.confirm_password) { registerError.value = 'Las contraseñas no coinciden'; return }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)) { registerError.value = 'Ingresa un correo electrónico válido'; return }

  registering.value = true
  try {
    await authAPI.register({ email: registerForm.email.trim().toLowerCase(), password: registerForm.password, first_name: registerForm.first_name.trim(), last_name: registerForm.last_name.trim(), phone: registerForm.phone || null, role: 'Cliente' })
    try { await clientsAPI.create({ email: registerForm.email.trim().toLowerCase(), first_name: registerForm.first_name.trim(), last_name: registerForm.last_name.trim(), phone: registerForm.phone || null }) } catch (clientError) {}
    registerSuccess.value = '¡Cuenta creada! Ya puedes iniciar sesión.'
    setTimeout(() => { showRegister.value = false; registerSuccess.value = ''; loginForm.email = registerForm.email; loginForm.password = ''; generateCaptcha() }, 1000)
  } catch (error) {
    if (error.response?.status === 409) { registerError.value = 'El correo electrónico ya está registrado' }
    else { registerError.value = error.response?.data?.message || 'Error al crear la cuenta' }
    generateRegCaptcha(); registerForm.captcha = ''
  } finally { registering.value = false }
}

function forgotPassword() {
  Swal.fire({ title: 'Recuperar Contraseña', html: `<p style="text-align:left;">Ingresa tu email:</p><input id="rec-email" class="swal2-input" placeholder="tu@email.com" type="email">`, showCancelButton: true, confirmButtonText: 'Enviar', cancelButtonText: 'Cancelar', preConfirm: () => { const email = document.getElementById('rec-email')?.value; if (!email) { Swal.showValidationMessage('Ingresa un email'); return false }; return email } }).then((result) => { if (result.isConfirmed) Swal.fire({ icon: 'success', title: 'Instrucciones enviadas', timer: 3000 }) })
}

onMounted(() => generateCaptcha())
</script>

<style scoped>
.login-page { position: relative; width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; overflow-y: auto; background-color: #1a1a2e; padding: 15px; }
.background-gradient { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 20%, #0f3460 40%, #1a5276 60%, #1a1a2e 80%, #0d1b2a 100%); background-size: 400% 400%; animation: gradientShift 15s ease infinite; z-index: 0; }
@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
.login-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%); z-index: 1; }
.login-container { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 460px; }
.login-card { width: 100%; background: rgba(255,255,255,0.22); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 18px; padding: 2rem 1.75rem; border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 20px 50px rgba(0,0,0,0.35); animation: cardAppear 0.3s ease; }
@keyframes cardAppear { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.login-header { text-align: center; margin-bottom: 1.5rem; }
.logo-circle { width: 70px; height: 70px; border-radius: 50%; background: rgba(78,115,223,0.25); backdrop-filter: blur(10px); margin: 0 auto 0.75rem; display: flex; align-items: center; justify-content: center; border: 2px solid rgba(255,255,255,0.3); }
.logo-emoji { font-size: 2.2rem; animation: bounce 2s ease infinite; }
@keyframes bounce { 0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)} }
.app-title { font-size: 1.35rem; font-weight: 700; color: #fff; margin: 0 0 0.15rem; text-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.app-subtitle { font-size: 0.8rem; color: rgba(255,255,255,0.85); margin: 0 0 0.35rem; }
.app-version { font-size: 0.65rem; color: rgba(255,255,255,0.5); margin: 0; }
.auth-form { margin-top: 0.25rem; }
.register-title { color: #fff; margin: 0 0 0.25rem; font-size: 0.95rem; text-align: center; font-weight: 600; }
.register-subtitle { color: rgba(255,255,255,0.7); font-size: 0.75rem; text-align: center; margin: 0 0 1rem; }
.form-group { margin-bottom: 0.85rem; position: relative; }
.form-label { display: block; font-size: 0.78rem; font-weight: 500; color: rgba(255,255,255,0.9); margin-bottom: 0.25rem; }
.input-wrapper { position: relative; display: flex; align-items: center; }
.input-icon-left { position: absolute; left: 11px; color: rgba(255,255,255,0.65); font-size: 0.95rem; z-index: 1; pointer-events: none; }
.input-icon-right { position: absolute; right: 11px; color: rgba(255,255,255,0.65); cursor: pointer; z-index: 1; padding: 2px; font-size: 0.95rem; }
.input-icon-right:hover { color: #fff; }
.form-input { width: 100%; padding: 0.55rem 2.3rem; border: 2px solid rgba(255,255,255,0.25); border-radius: 8px; font-size: 0.85rem; color: #fff; background: rgba(255,255,255,0.12); backdrop-filter: blur(5px); transition: all 0.2s; font-family: inherit; box-sizing: border-box; }
.form-input::placeholder { color: rgba(255,255,255,0.45); }
.form-input:focus { outline: none; border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.2); }
.form-row { display: flex; gap: 0.6rem; }
.form-half { flex: 1; }
.form-half .form-input { padding: 0.55rem 0.7rem; }
.captcha-section { margin-bottom: 0.75rem; }
.captcha-box { display: flex; align-items: center; gap: 0.4rem; background: rgba(255,255,255,0.08); border-radius: 8px; padding: 3px; }
.captcha-canvas { flex: 1; cursor: pointer; border-radius: 6px; overflow: hidden; }
.captcha-canvas canvas { display: block; width: 100%; height: 46px; }
.captcha-refresh { width: 38px; height: 38px; border-radius: 6px; border: none; background: rgba(78,115,223,0.35); color: white; cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
.captcha-refresh:hover { background: rgba(78,115,223,0.55); }
.captcha-error { color: #ff6b6b; font-size: 0.75rem; margin-top: 0.2rem; display: flex; align-items: center; gap: 4px; }
.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.4rem; }
.forgot-password { text-align: right; margin-bottom: 1rem; margin-top: -0.3rem; }
.forgot-password a { font-size: 0.75rem; color: rgba(255,255,255,0.75); text-decoration: none; }
.forgot-password a:hover { color: #fff; text-decoration: underline; }
.btn-submit { width: 100%; padding: 0.7rem; background: linear-gradient(135deg, #4e73df 0%, #3a5ccc 100%); color: white; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; letter-spacing: 1.5px; cursor: pointer; transition: all 0.2s; text-transform: uppercase; font-family: inherit; border: 1px solid rgba(255,255,255,0.15); }
.btn-submit:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(78,115,223,0.45); }
.btn-submit:disabled { opacity: 0.65; cursor: not-allowed; transform: none; box-shadow: none; }

/* ⬇️⬇️⬇️ SEPARADOR "O" ⬇️⬇️⬇️ */
.divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.2);
}
.divider-text {
  color: rgba(255,255,255,0.5);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* ⬇️⬇️⬇️ BOTÓN DE GOOGLE ⬇️⬇️⬇️ */
.btn-google {
  width: 100%;
  padding: 0.6rem;
  background: rgba(255,255,255,0.9);
  color: #3c4043;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: inherit;
}
.btn-google:hover {
  background: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.btn-google:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.google-icon {
  flex-shrink: 0;
}

.toggle-form { text-align: center; margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid rgba(255,255,255,0.15); display: flex; justify-content: center; gap: 0.4rem; flex-wrap: wrap; }
.toggle-form span { color: rgba(255,255,255,0.7); font-size: 0.82rem; }
.toggle-form a { color: #fff; font-weight: 600; text-decoration: none; font-size: 0.82rem; }
.toggle-form a:hover { text-decoration: underline; }
.demo-credentials { text-align: center; margin-top: 0.75rem; padding-top: 0.6rem; border-top: 1px solid rgba(255,255,255,0.12); }
.demo-credentials small { font-size: 0.7rem; color: rgba(255,255,255,0.55); font-family: monospace; background: rgba(255,255,255,0.08); padding: 0.25rem 0.5rem; border-radius: 4px; }
.alert { padding: 0.55rem 0.75rem; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.78rem; display: flex; align-items: center; gap: 5px; }
.alert-danger { background: rgba(220,53,69,0.18); color: #ff6b6b; border: 1px solid rgba(220,53,69,0.25); }
.alert-success { background: rgba(25,135,84,0.18); color: #75b798; border: 1px solid rgba(25,135,84,0.25); }
.login-footer { margin-top: 1.25rem; text-align: center; color: rgba(255,255,255,0.45); font-size: 0.7rem; }
.login-footer p { margin: 0; }
.spinner-small { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.5s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.password-strength { margin-top: 0.5rem; }
.strength-bar { height: 6px; background: rgba(255,255,255,0.15); border-radius: 10px; overflow: hidden; margin-bottom: 0.4rem; }
.strength-fill { height: 100%; border-radius: 10px; transition: all 0.3s ease; }
.strength-fill.very-weak { background: #e74a3b; }
.strength-fill.weak { background: #e67e22; }
.strength-fill.medium { background: #f6c23e; }
.strength-fill.strong { background: #1cc88a; }
.strength-info { display: flex; flex-direction: column; gap: 0.3rem; }
.strength-text { font-size: 0.75rem; font-weight: 600; }
.strength-text.very-weak { color: #e74a3b; }
.strength-text.weak { color: #e67e22; }
.strength-text.medium { color: #f6c23e; }
.strength-text.strong { color: #1cc88a; }
.strength-criteria { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 0.68rem; color: rgba(255,255,255,0.5); }
.strength-criteria span { display: flex; align-items: center; gap: 3px; }
.strength-criteria span.met { color: #1cc88a; }
.strength-criteria span i { font-size: 0.65rem; }
.text-danger { color: #ff6b6b; font-size: 0.72rem; display: flex; align-items: center; gap: 4px; margin-top: 0.25rem; }
.text-success { color: #75b798; font-size: 0.72rem; display: flex; align-items: center; gap: 4px; margin-top: 0.25rem; }
.attempts-warning { color: #f6c23e; font-size: 0.78rem; display: flex; align-items: center; gap: 6px; padding: 0.5rem 0.75rem; background: rgba(246,194,62,0.15); border-radius: 6px; border: 1px solid rgba(246,194,62,0.3); }
.attempts-warning strong { font-size: 0.85rem; }

@media (max-width: 480px) { .login-page { padding: 10px; align-items: flex-start; padding-top: 30px; } .login-container { max-width: 100%; } .login-card { padding: 1.5rem 1.25rem; border-radius: 14px; } .logo-circle { width: 58px; height: 58px; } .logo-emoji { font-size: 1.8rem; } .app-title { font-size: 1.2rem; } .form-row { flex-direction: column; gap: 0; } .form-input { font-size: 0.82rem; padding: 0.5rem 2rem; } .btn-submit { padding: 0.65rem; font-size: 0.85rem; } }
@media (min-width: 768px) { .login-page { padding: 20px; } }
@media (min-height: 900px) { .login-card { padding: 2.5rem 2rem; } }
@media (max-height: 700px) { .login-page { align-items: flex-start; padding-top: 20px; } .login-card { padding: 1.25rem 1.5rem; } .login-header { margin-bottom: 1rem; } .logo-circle { width: 55px; height: 55px; } .form-group { margin-bottom: 0.6rem; } }
</style>