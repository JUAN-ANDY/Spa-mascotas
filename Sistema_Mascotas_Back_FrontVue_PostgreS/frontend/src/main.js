import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// ⬇️ AGREGADO: Verificar autenticación antes de montar la app ⬇️
// Esto asegura que el token se cargue antes de cualquier petición API
import { useAuthStore } from './store'
const authStore = useAuthStore()
authStore.checkAuth()

// Configuración global para manejo de errores
// ⬇️ CORREGIDO: Debe estar ANTES de app.mount() ⬇️
app.config.errorHandler = (err, instance, info) => {
    console.error('Error global:', err, info)
}

app.mount('#app')