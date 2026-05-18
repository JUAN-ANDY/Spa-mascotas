import axios from 'axios'

// Crear instancia de axios
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
})

// ============================================
// INTERCEPTOR DE SOLICITUDES (REQUEST)
// ============================================
api.interceptors.request.use(
  config => {
    // Obtener token del localStorage
    const token = localStorage.getItem('token')
    
    // Si hay token, agregarlo al header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// ============================================
// INTERCEPTOR DE RESPUESTAS (RESPONSE)
// ============================================
api.interceptors.response.use(
  response => {
    // Retornar la respuesta directamente
    return response
  },
  error => {
    // Si el error es 401 (No autorizado), redirigir al login
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Solo redirigir si no estamos ya en el login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// ============================================
// ENDPOINTS DE AUTENTICACIÓN
// ============================================
export const authAPI = {
  // Iniciar sesión
  login: (data) => api.post('/auth/login', data),
  
  // ⬇️⬇️⬇️ INICIAR SESIÓN CON GOOGLE ⬇️⬇️⬇️
  /**
   * Envía el token JWT de Google al backend para verificación
   * @param {Object} data - { credential: string } Token JWT de Google Identity Services
   * @returns {Promise} Respuesta del backend con token JWT propio y datos del usuario
   */
  googleLogin: (data) => api.post('/auth/google', data),
  
  // Registrar usuario
  register: (data) => api.post('/auth/register', data),
  
  // Obtener perfil del usuario autenticado
  profile: () => api.get('/auth/profile'),
  
  // Cambiar contraseña (NUEVO)
  changePassword: (data) => api.put('/auth/change-password', data),
  
  // Verificar token
  verify: () => api.get('/auth/verify'),
  
  // Crear admin de emergencia
  seedAdmin: () => api.post('/auth/seed-admin')
}

// ============================================
// ENDPOINTS DE SUCURSALES
// ============================================
export const branchesAPI = {
  getAll: (params) => api.get('/branches', { params }),
  getById: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`)
}

// ============================================
// ENDPOINTS DE USUARIOS
// ============================================
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  getGroomers: () => api.get('/users/groomers'),
  create: (data) => api.post('/auth/register', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
}

// ============================================
// ENDPOINTS DE CLIENTES
// ============================================
export const clientsAPI = {
  getAll: (params) => api.get('/clients', { params }),
  getById: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`)
}

// ============================================
// ENDPOINTS DE MASCOTAS
// ============================================
export const petsAPI = {
  getAll: (params) => api.get('/pets', { params }),
  getById: (id) => api.get(`/pets/${id}`),
  getByClient: (clientId) => api.get(`/pets/client/${clientId}`),
  create: (data) => api.post('/pets', data),
  update: (id, data) => api.put(`/pets/${id}`, data),
  delete: (id) => api.delete(`/pets/${id}`)
}

// ============================================
// ENDPOINTS DE PRODUCTOS
// ============================================
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  createCategory: (data) => api.post('/products/categories', data),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getInventory: (branchId) => api.get(`/products/inventory/${branchId}`)
}

// ============================================
// ENDPOINTS DE SERVICIOS
// ============================================
export const servicesAPI = {
  getAll: () => api.get('/services'),
  getById: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`)
}

// ============================================
// ENDPOINTS DE CITAS
// ============================================
export const appointmentsAPI = {
  getAll: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  getToday: () => api.get('/appointments/today'),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  cancel: (id, data) => api.post(`/appointments/${id}/cancel`, data)
}

// ============================================
// ENDPOINTS DE ÓRDENES / VENTAS
// ============================================
export const ordersAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  cancel: (id, data) => api.post(`/orders/${id}/cancel`, data)
}

// ============================================
// ENDPOINTS DE GROOMING
// ============================================

export const groomingAPI = {
  getByAppointment: (appointmentId) => api.get(`/grooming/records/${appointmentId}`),
  createRecord: (data) => api.post('/grooming/records', data),
  uploadPhoto: (data) => api.post('/grooming/photos', data),
  deletePhoto: (photoId) => api.delete(`/grooming/photos/${photoId}`),
  createReview: (data) => api.post('/grooming/reviews', data)
}

// ============================================
// EXPORTAR INSTANCIA POR DEFECTO
// ============================================
export default api