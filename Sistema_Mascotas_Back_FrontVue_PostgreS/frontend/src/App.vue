<template>
  <div id="app">
    <!-- Layout para rutas autenticadas -->
    <div v-if="authStore.isAuthenticated" class="authenticated-layout">
      <Navbar />
      <div class="main-container">
        <Sidebar />
        <main class="content">
          <router-view />
        </main>
      </div>
      <Footer />
    </div>
    
    <!-- Layout para login y registro -->
    <div v-else class="auth-layout">
      <router-view />
    </div>
  </div>
</template>

<script setup>
/**
 * ============================================
 * APP.VUE - COMPONENTE PRINCIPAL
 * ============================================
 * Maneja el layout según autenticación
 * Inicia el sistema de cierre de sesión automático
 * por inactividad después de 30 minutos
 * ============================================
 */

import { onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from './store'
import Navbar from './components/layout/Navbar.vue'
import Sidebar from './components/layout/Sidebar.vue'
import Footer from './components/layout/Footer.vue'

// ⬇️ IMPORTAR UTILIDAD DE AUTO LOGOUT ⬇️
import { startAutoLogout, stopAutoLogout } from './utils/autoLogout'
import Swal from 'sweetalert2'

const authStore = useAuthStore()

// ⬇️ VARIABLE PARA CONTROLAR ADVERTENCIAS ⬇️
let warningShown5min = false  // Evita mostrar advertencia de 5 min múltiples veces
let warningShown1min = false  // Evita mostrar advertencia de 1 min múltiples veces

// ⬇️ AGREGADO: Verificar auth al montar (por si el store aún no se inicializó) ⬇️
onMounted(() => {
  // Solo verificar si no está autenticado (evita llamadas innecesarias)
  if (!authStore.isAuthenticated) {
    authStore.checkAuth()
  }

  // ⬇️ INICIAR AUTO LOGOUT SI EL USUARIO ESTÁ AUTENTICADO ⬇️
  if (authStore.isAuthenticated) {
    iniciarAutoLogout()
  }
})

/**
 * ============================================
 * OBSERVAR CAMBIOS EN LA AUTENTICACIÓN
 * ============================================
 * Cuando el usuario inicia sesión, activa el auto-logout
 * Cuando cierra sesión, lo detiene
 */
watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (isAuth) {
      // Usuario acaba de iniciar sesión → iniciar auto-logout
      iniciarAutoLogout()
    } else {
      // Usuario cerró sesión → detener auto-logout
      stopAutoLogout()
      // Resetear advertencias
      warningShown5min = false
      warningShown1min = false
    }
  }
)

/**
 * ============================================
 * LIMPIEZA AL DESMONTAR LA APLICACIÓN
 * ============================================
 */
onUnmounted(() => {
  // Detener el sistema de auto logout
  stopAutoLogout()
  // Resetear advertencias
  warningShown5min = false
  warningShown1min = false
})

/**
 * ============================================
 * FUNCIÓN PARA INICIAR EL AUTO LOGOUT
 * ============================================
 * Configura el cierre de sesión después de 30 minutos de inactividad
 * Muestra advertencias a los 25 y 29 minutos
 */
function iniciarAutoLogout() {
  // Resetear advertencias al iniciar
  warningShown5min = false
  warningShown1min = false

  startAutoLogout(
    // ⬇️ CALLBACK DE CIERRE DE SESIÓN (CUANDO SE CUMPLEN LOS 30 MIN) ⬇️
    () => {
      console.log('⏰ Auto-logout: Sesión expirada por inactividad (30 minutos)')
      
      // Mostrar mensaje antes de cerrar sesión
      Swal.fire({
        icon: 'warning',
        title: 'Sesión Expirada',
        text: 'Tu sesión ha sido cerrada por inactividad después de 30 minutos. Por favor, inicia sesión nuevamente.',
        timer: 5000,
        showConfirmButton: true,
        confirmButtonText: 'Iniciar Sesión',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(() => {
        // Cerrar sesión y redirigir al login
        authStore.logout()
      })
    },
    
    // ⬇️ CALLBACK DE CUENTA REGRESIVA (SE EJECUTA CADA SEGUNDO) ⬇️
    (minutes, seconds) => {
      // ⬇️ ADVERTENCIA CUANDO QUEDAN 5 MINUTOS ⬇️
      if (minutes === 5 && seconds === 0 && !warningShown5min) {
        warningShown5min = true
        console.log('⏰ Auto-logout: 5 minutos restantes de inactividad')
        
        Swal.fire({
          icon: 'info',
          title: '¿Sigues ahí?',
          text: 'Tu sesión se cerrará en 5 minutos por inactividad. Realiza alguna acción para mantenerla activa.',
          timer: 8000,
          showConfirmButton: true,
          confirmButtonText: 'Estoy aquí',
          toast: true,
          position: 'top-end',
          showCloseButton: true
        }).then((result) => {
          // Si el usuario confirma que está presente, reiniciar advertencias
          if (result.isConfirmed) {
            warningShown5min = false
            warningShown1min = false
          }
        })
      }

      // ⬇️ ADVERTENCIA CUANDO QUEDA 1 MINUTO ⬇️
      if (minutes === 1 && seconds === 0 && !warningShown1min) {
        warningShown1min = true
        console.log('⏰ Auto-logout: 1 minuto restante de inactividad')
        
        Swal.fire({
          icon: 'warning',
          title: '¡Atención!',
          text: 'Tu sesión se cerrará en 1 minuto por inactividad. Realiza alguna acción ahora para mantenerla activa.',
          timer: 10000,
          showConfirmButton: true,
          confirmButtonText: 'Mantenerme conectado',
          toast: true,
          position: 'top-end',
          showCloseButton: true
        }).then((result) => {
          // Si el usuario confirma, reiniciar advertencias
          if (result.isConfirmed) {
            warningShown5min = false
            warningShown1min = false
          }
        })
      }

      // ⬇️ LOG CADA 5 MINUTOS PARA DEPURACIÓN ⬇️
      if (seconds === 0 && minutes % 5 === 0 && minutes > 0) {
        console.log(`⏰ Auto-logout: ${minutes} minutos restantes de inactividad`)
      }
    }
  )
}
</script>

<style scoped>
.authenticated-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-container {
  display: flex;
  flex: 1;
}

.content {
  flex: 1;
  padding: 20px;
  background-color: #f5f6fa;
  min-height: calc(100vh - 120px);
}

.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>