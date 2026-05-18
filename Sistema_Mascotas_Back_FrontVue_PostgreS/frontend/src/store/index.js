import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI, clientsAPI } from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  // Estado
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)
  const loading = ref(false)
  const error = ref(null)
  const clientData = ref(null) // Datos del cliente (si es rol Cliente)

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role || null)
  const isAdmin = computed(() => userRole.value === 'Administrador')
  const isReceptionist = computed(() => userRole.value === 'Recepcion')
  const isGroomer = computed(() => userRole.value === 'Groomer')
  const isClient = computed(() => userRole.value === 'Cliente')
  
  const userName = computed(() => {
    if (!user.value) return 'Usuario'
    return `${user.value.first_name || ''} ${user.value.last_name || ''}`.trim() || 'Usuario'
  })

  const userEmail = computed(() => user.value?.email || '')

  // ⬇️⬇️⬇️ LOGIN CON MANEJO DE BLOQUEO E INTENTOS ⬇️⬇️⬇️
  async function login(email, password) {
    loading.value = true
    error.value = null
    
    try {
      const response = await authAPI.login({ email, password })
      const data = response.data
      
      token.value = data.token
      user.value = data.user
      
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // Si es cliente, cargar sus datos en segundo plano (no bloquea)
      if (data.user.role === 'Cliente') {
        loadClientData() // Sin await para no bloquear
      }
      
      return { success: true }
    } catch (err) {
      console.error('Error en login:', err)
      
      // ⬇️⬇️⬇️ MANEJAR BLOQUEO (423 LOCKED) ⬇️⬇️⬇️
      if (err.response?.status === 423) {
        const lockData = err.response.data
        return { 
          success: false, 
          locked: true,
          error: lockData.message || 'Cuenta bloqueada temporalmente.',
          minutesLeft: lockData.minutesLeft
        }
      }
      
      // ⬇️⬇️⬇️ MANEJAR INTENTOS RESTANTES ⬇️⬇️⬇️
      if (err.response?.data?.attemptsLeft !== undefined) {
        return { 
          success: false,
          attemptsLeft: err.response.data.attemptsLeft,
          error: err.response.data.message || 'Credenciales inválidas'
        }
      }
      
      error.value = err.response?.data?.message || 'Error al iniciar sesión'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // ⬇️⬇️⬇️ LOGIN CON GOOGLE ⬇️⬇️⬇️
  /**
   * Inicia sesión o registra un usuario usando Google Identity Services
   * @param {string} credential - Token JWT de Google (response.credential)
   * @returns {Object} { success: boolean, error?: string }
   */
  async function loginWithGoogle(credential) {
    loading.value = true
    error.value = null

    try {
      // Enviar el token de Google al backend para verificación
      const response = await authAPI.googleLogin({ credential })
      const data = response.data

      // Guardar token y datos del usuario
      token.value = data.token
      user.value = data.user

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Si es cliente, cargar sus datos en segundo plano
      if (data.user.role === 'Cliente') {
        loadClientData()
      }

      console.log('✅ Login con Google exitoso:', data.user.email)
      return { success: true }

    } catch (err) {
      console.error('Error en login con Google:', err)

      // Manejar error de cuenta bloqueada
      if (err.response?.status === 423) {
        const lockData = err.response.data
        return {
          success: false,
          locked: true,
          error: lockData.message || 'Cuenta bloqueada temporalmente.',
          minutesLeft: lockData.minutesLeft
        }
      }

      // Manejar otros errores
      error.value = err.response?.data?.message || 'Error al iniciar sesión con Google'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function loadClientData() {
    try {
      const { data } = await clientsAPI.getAll({ 
        search: user.value?.email, 
        limit: 1 
      })
      const clients = data.data || data.clients || []
      if (clients.length > 0) {
        clientData.value = clients[0]
      }
    } catch (e) {
      // Silencioso
    }
  }

  async function getClientId() {
    if (clientData.value?.id) return clientData.value.id
    await loadClientData()
    return clientData.value?.id || null
  }

  // ⬇️⬇️⬇️ LOGOUT INSTANTÁNEO - CON LIMPIEZA DE AUTO LOGOUT ⬇️⬇️⬇️
  function logout() {
    // ⬇️ DETENER EL SISTEMA DE AUTO LOGOUT ANTES DE CERRAR SESIÓN ⬇️
    // Esto evita que el temporizador siga corriendo después del logout
    try {
      // Import dinámico para evitar dependencia circular
      import('../utils/autoLogout').then(module => {
        module.stopAutoLogout()
      }).catch(() => {
        // Si falla la importación, continuar con el logout normalmente
        console.log('⚠️ No se pudo detener el auto-logout (posiblemente no estaba iniciado)')
      })
    } catch (e) {
      // Silencioso - el archivo puede no existir aún
    }

    // Limpiar estado de la aplicación
    token.value = null
    user.value = null
    error.value = null
    clientData.value = null
    
    // Limpiar almacenamiento local
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    // Redirección inmediata al login
    window.location.href = '/login'
  }

  // ⬇️⬇️⬇️ CORREGIDO: VERIFICAR EXPIRACIÓN DEL TOKEN ⬇️⬇️⬇️
  function checkAuth() {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (savedToken && savedUser) {
      try {
        // Verificar si el token expiró (decodificar payload sin verificar firma)
        const payload = JSON.parse(atob(savedToken.split('.')[1]))
        const isExpired = payload.exp * 1000 < Date.now()
        
        if (isExpired) {
          // Token expirado, limpiar sesión
          console.log('⚠️ Token expirado, cerrando sesión...')
          logout()
          return false
        }
        
        token.value = savedToken
        user.value = JSON.parse(savedUser)
        if (user.value?.role === 'Cliente') {
          loadClientData()
        }
        return true
      } catch (e) {
        logout()
        return false
      }
    }
    return false
  }

  function hasPermission(resource) {
    const permissions = {
      'Administrador': ['all'],
      'Recepcion': ['dashboard', 'clients', 'pets', 'appointments', 'orders', 'products'],
      'Groomer': ['dashboard', 'appointments', 'pets', 'grooming'],
      'Cliente': ['dashboard', 'appointments', 'orders', 'pets']
    }
    const rolePermissions = permissions[userRole.value] || []
    return rolePermissions.includes('all') || rolePermissions.includes(resource)
  }

  return {
    user, token, loading, error, clientData,
    isAuthenticated, userRole, isAdmin, isReceptionist, isGroomer, isClient,
    userName, userEmail,
    login, loginWithGoogle, logout, checkAuth, hasPermission, loadClientData, getClientId
  }
})