<template>
  <aside class="sidebar">
    <!-- Logo / Cabecera del Sidebar -->
    <div class="sidebar-header">
      <span class="sidebar-logo">🐾</span>
      <div>
        <h4>SPA Mascotas</h4>
        <small>{{ authStore.userRole }}</small>
      </div>
    </div>

    <!-- Menú de navegación -->
    <ul class="sidebar-menu">
      
      <!-- ============ ADMINISTRADOR ============ -->
      <template v-if="authStore.isAdmin">
        <li>
          <router-link to="/">
            <i class="bi bi-speedometer2"></i>
            <span>Dashboard</span>
          </router-link>
        </li>
        <li>
          <router-link to="/branches">
            <i class="bi bi-building"></i>
            <span>Sucursales</span>
          </router-link>
        </li>
        <li>
          <router-link to="/users">
            <i class="bi bi-person-badge"></i>
            <span>Usuarios</span>
          </router-link>
        </li>
        <li>
          <router-link to="/clients">
            <i class="bi bi-people"></i>
            <span>Clientes</span>
          </router-link>
        </li>
        <li>
          <router-link to="/pets">
            <i class="bi bi-heart"></i>
            <span>Mascotas</span>
          </router-link>
        </li>
        <li>
          <router-link to="/appointments">
            <i class="bi bi-calendar-check"></i>
            <span>Citas</span>
          </router-link>
        </li>
        <li>
          <router-link to="/orders">
            <i class="bi bi-cart"></i>
            <span>Ventas</span>
          </router-link>
        </li>
        <li>
          <router-link to="/products">
            <i class="bi bi-box"></i>
            <span>Productos</span>
          </router-link>
        </li>
        <li>
          <router-link to="/services">
            <i class="bi bi-scissors"></i>
            <span>Servicios</span>
          </router-link>
        </li>
        <li>
          <router-link to="/grooming">
            <i class="bi bi-clipboard2-pulse"></i>
            <span>Grooming</span>
          </router-link>
        </li>
        <!-- ⬇️⬇️⬇️ NUEVO: AUDITORÍA (SOLO ADMIN) ⬇️⬇️⬇️ -->
        <li>
          <router-link to="/auditoria">
            <i class="bi bi-journal-check"></i>
            <span>Auditoría</span>
          </router-link>
        </li>
      </template>

      <!-- ============ RECEPCIONISTA ============ -->
      <template v-if="authStore.isReceptionist">
        <li>
          <router-link to="/">
            <i class="bi bi-speedometer2"></i>
            <span>Dashboard</span>
          </router-link>
        </li>
        <li>
          <router-link to="/clients">
            <i class="bi bi-people"></i>
            <span>Clientes</span>
          </router-link>
        </li>
        <li>
          <router-link to="/pets">
            <i class="bi bi-heart"></i>
            <span>Mascotas</span>
          </router-link>
        </li>
        <li>
          <router-link to="/appointments">
            <i class="bi bi-calendar-check"></i>
            <span>Citas</span>
          </router-link>
        </li>
        <!-- ⬇️ AGREGADO: Recepcionista puede vender -->
        <li>
          <router-link to="/orders">
            <i class="bi bi-cart"></i>
            <span>Ventas</span>
          </router-link>
        </li>
        <li>
          <router-link to="/products">
            <i class="bi bi-box"></i>
            <span>Productos</span>
          </router-link>
        </li>
      </template>

      <!-- ============ GROOMER ============ -->
      <template v-if="authStore.isGroomer">
        <li>
          <router-link to="/">
            <i class="bi bi-speedometer2"></i>
            <span>Dashboard</span>
          </router-link>
        </li>
        <li>
          <router-link to="/appointments">
            <i class="bi bi-calendar-check"></i>
            <span>Citas</span>
          </router-link>
        </li>
        <li>
          <router-link to="/pets">
            <i class="bi bi-heart"></i>
            <span>Mascotas</span>
          </router-link>
        </li>
        <!-- ⬇️ AGREGADO: Groomer puede vender productos -->
        <li>
          <router-link to="/orders">
            <i class="bi bi-cart"></i>
            <span>Vender Producto</span>
          </router-link>
        </li>
        <li>
          <router-link to="/grooming">
            <i class="bi bi-clipboard2-pulse"></i>
            <span>Grooming</span>
          </router-link>
        </li>
      </template>

      <!-- ============ CLIENTE ============ -->
      <template v-if="authStore.isClient">
        <li>
          <router-link to="/">
            <i class="bi bi-house"></i>
            <span>Inicio</span>
          </router-link>
        </li>
        <li>
          <router-link to="/appointments">
            <i class="bi bi-calendar-plus"></i>
            <span>Mis Citas</span>
          </router-link>
        </li>
        <!-- ⬇️ AGREGADO: Cliente puede comprar productos -->
        <li>
          <router-link to="/orders">
            <i class="bi bi-bag"></i>
            <span>Comprar Productos</span>
          </router-link>
        </li>
        <li>
          <router-link to="/pets">
            <i class="bi bi-heart"></i>
            <span>Mis Mascotas</span>
          </router-link>
        </li>
        <li>
          <router-link to="/appointments?action=new">
            <i class="bi bi-plus-circle"></i>
            <span>Agendar Cita</span>
          </router-link>
        </li>
      </template>

    </ul>

    <!-- Footer del Sidebar -->
    <div class="sidebar-footer">
      <div class="user-info-mini">
        <i class="bi bi-person-circle"></i>
        <span>{{ authStore.userName || 'Usuario' }}</span>
      </div>
      <button class="btn-logout" @click="handleLogout" title="Cerrar sesión">
        <i class="bi bi-box-arrow-right"></i>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { useAuthStore } from '../../store'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'

const authStore = useAuthStore()
const router = useRouter()

// ⬇️ CORREGIDO: Logout instantáneo sin confirmación (más rápido) ⬇️
function handleLogout() {
  // Cerrar sesión directamente sin confirmación para mayor velocidad
  authStore.logout()
  // La redirección la hace el store internamente
}
</script>

<style scoped>
/* ============ SIDEBAR ============ */
.sidebar {
  width: 260px;
  min-height: calc(100vh - 60px);
  background: #1a1a2e;
  color: #c8c8d4;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 15px rgba(0,0,0,0.1);
}

/* ============ HEADER ============ */
.sidebar-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-logo {
  font-size: 2rem;
}

.sidebar-header h4 {
  color: white;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.sidebar-header small {
  color: #9ca3af;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* ============ MENÚ ============ */
.sidebar-menu {
  list-style: none;
  padding: 0.75rem 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.sidebar-menu li a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.7rem 1.5rem;
  color: #9ca3af;
  text-decoration: none;
  transition: all 0.2s ease;
  font-size: 0.88rem;
  border-left: 3px solid transparent;
  margin: 2px 0;
}

.sidebar-menu li a:hover {
  background: rgba(255,255,255,0.05);
  color: #e0e0e0;
  border-left-color: rgba(255,255,255,0.3);
}

.sidebar-menu li a.router-link-active {
  background: rgba(78, 115, 223, 0.15);
  color: #ffffff;
  font-weight: 500;
  border-left-color: #4e73df;
}

.sidebar-menu li a i {
  font-size: 1.15rem;
  width: 22px;
  text-align: center;
}

/* ============ SEPARADOR ============ */
.sidebar-divider {
  padding: 0.5rem 1.5rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #6b7280;
  font-weight: 600;
  border-top: 1px solid rgba(255,255,255,0.06);
  margin-top: 0.5rem;
}

/* ============ FOOTER ============ */
.sidebar-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0,0,0,0.2);
}

.user-info-mini {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: #9ca3af;
}

.user-info-mini i {
  font-size: 1.3rem;
}

.btn-logout {
  background: rgba(231, 74, 59, 0.15);
  color: #e74a3b;
  border: 1px solid rgba(231, 74, 59, 0.3);
  width: 35px;
  height: 35px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-logout:hover {
  background: #e74a3b;
  color: white;
}

/* ============ SCROLLBAR ============ */
.sidebar-menu::-webkit-scrollbar {
  width: 4px;
}

.sidebar-menu::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-menu::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
}

.sidebar-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.2);
}

/* ============ RESPONSIVE ============ */
@media (max-width: 768px) {
  .sidebar {
    width: 70px;
  }
  
  .sidebar-header h4,
  .sidebar-header small,
  .sidebar-menu li a span,
  .user-info-mini span {
    display: none;
  }
  
  .sidebar-header {
    justify-content: center;
    padding: 1rem;
  }
  
  .sidebar-menu li a {
    justify-content: center;
    padding: 0.75rem;
  }
  
  .sidebar-menu li a i {
    font-size: 1.3rem;
  }
  
  .sidebar-footer {
    justify-content: center;
  }
}
</style>