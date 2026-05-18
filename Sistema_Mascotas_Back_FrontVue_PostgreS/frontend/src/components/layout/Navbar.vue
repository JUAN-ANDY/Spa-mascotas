<template>
  <nav class="navbar">
    <div class="navbar-brand">
      <span class="brand-icon">🐾</span>
      <span class="brand-text">SPA Mascotas</span>
    </div>
    
    <div class="navbar-menu">
      <div class="user-info">
        <i class="bi bi-person-circle"></i>
        <div class="user-details">
          <span class="user-name">{{ authStore.userName || 'Usuario' }}</span>
          <span class="user-role">{{ authStore.userRole || 'Sin rol' }}</span>
        </div>
      </div>

      <div class="settings-dropdown" ref="settingsRef">
        <button class="btn-settings" @click="toggleSettings" title="Configuración"><i class="bi bi-gear-fill"></i></button>
        
        <div v-if="showSettings" class="dropdown-menu">
          <div class="dropdown-header"><i class="bi bi-gear"></i> Configuración</div>
          <button class="dropdown-item" @click="openChangePassword"><i class="bi bi-lock"></i> Cambiar Contraseña</button>
          <button class="dropdown-item" @click="openProfile"><i class="bi bi-person"></i> Mi Perfil</button>
          <div class="dropdown-divider"></div>
          <!-- ⬇️ LOGOUT INSTANTÁNEO: SIN CONFIRMACIÓN ⬇️ -->
          <button class="dropdown-item logout-item" @click="handleLogout"><i class="bi bi-box-arrow-right"></i> Cerrar Sesión</button>
        </div>
      </div>
    </div>

    <!-- Modal Cambiar Contraseña -->
    <div v-if="showPasswordModal" class="modal-overlay" @click.self="closePasswordModal">
      <div class="modal-content">
        <div class="modal-header"><h3><i class="bi bi-lock"></i> Cambiar Contraseña</h3><button class="modal-close" @click="closePasswordModal">&times;</button></div>
        <div class="modal-body">
          <form @submit.prevent="changePassword">
            <div class="form-group">
              <label class="form-label">Contraseña Actual *</label>
              <div class="input-wrapper">
                <span class="input-icon"><i class="bi bi-lock"></i></span>
                <input v-model="passwordForm.current_password" :type="showCurrentPass ? 'text' : 'password'" class="form-control" placeholder="••••••" required>
                <span class="toggle-pass" @click="showCurrentPass = !showCurrentPass"><i :class="showCurrentPass ? 'bi-eye-slash' : 'bi-eye'"></i></span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Nueva Contraseña *</label>
              <div class="input-wrapper">
                <span class="input-icon"><i class="bi bi-lock-fill"></i></span>
                <input v-model="passwordForm.new_password" :type="showNewPass ? 'text' : 'password'" class="form-control" placeholder="Mínimo 6 caracteres" required minlength="6">
                <span class="toggle-pass" @click="showNewPass = !showNewPass"><i :class="showNewPass ? 'bi-eye-slash' : 'bi-eye'"></i></span>
              </div>
              <small>Mínimo 6 caracteres</small>
            </div>
            <div class="form-group">
              <label class="form-label">Confirmar Nueva Contraseña *</label>
              <div class="input-wrapper">
                <span class="input-icon"><i class="bi bi-lock-fill"></i></span>
                <input v-model="passwordForm.confirm_password" :type="showConfirmPass ? 'text' : 'password'" class="form-control" placeholder="Repite la contraseña" required>
                <span class="toggle-pass" @click="showConfirmPass = !showConfirmPass"><i :class="showConfirmPass ? 'bi-eye-slash' : 'bi-eye'"></i></span>
              </div>
            </div>
            <div v-if="passwordError" class="alert alert-danger"><i class="bi bi-exclamation-triangle"></i> {{ passwordError }}</div>
            <div v-if="passwordSuccess" class="alert alert-success"><i class="bi bi-check-circle"></i> {{ passwordSuccess }}</div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closePasswordModal" :disabled="changingPassword">Cancelar</button>
              <button type="submit" class="btn btn-primary" :disabled="changingPassword">
                <span v-if="changingPassword" class="spinner-small"></span>
                <span v-else><i class="bi bi-check-lg"></i> Actualizar</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Perfil -->
    <div v-if="showProfileModal" class="modal-overlay" @click.self="showProfileModal = false">
      <div class="modal-content profile-modal">
        <div class="modal-header"><h3><i class="bi bi-person-badge"></i> Mi Perfil</h3><button class="modal-close" @click="showProfileModal = false">&times;</button></div>
        <div class="modal-body">
          <div v-if="profileLoading" class="text-center py-4"><div class="spinner"></div><p class="mt-2 text-muted">Cargando perfil...</p></div>
          <div v-else-if="profileData" class="profile-content">
            <div class="profile-avatar"><span class="avatar-text">{{ profileInitials }}</span></div>
            <div class="profile-details">
              <div class="detail-row"><span class="detail-label">Nombre completo</span><span class="detail-value">{{ profileData.first_name }} {{ profileData.last_name }}</span></div>
              <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">{{ profileData.email }}</span></div>
              <div class="detail-row"><span class="detail-label">Rol</span><span class="detail-value"><span :class="getRoleBadgeClass(profileData.role)">{{ profileData.role }}</span></span></div>
              <div class="detail-row"><span class="detail-label">Teléfono</span><span class="detail-value">{{ profileData.phone || 'No registrado' }}</span></div>
              <div class="detail-row"><span class="detail-label">Estado</span><span class="detail-value"><i v-if="profileData.is_active" class="bi bi-check-circle-fill text-success"></i><i v-else class="bi bi-x-circle-fill text-danger"></i> {{ profileData.is_active ? 'Activo' : 'Inactivo' }}</span></div>
              <div class="detail-row"><span class="detail-label">Miembro desde</span><span class="detail-value">{{ formatDate(profileData.created_at) }}</span></div>
            </div>
          </div>
          <div v-else class="text-center py-4"><i class="bi bi-exclamation-circle" style="font-size:2rem;color:#f6c23e;"></i><p class="mt-2 text-muted">No se pudo cargar la información del perfil</p></div>
        </div>
        <div class="modal-footer"><button class="btn btn-primary" @click="showProfileModal = false">Cerrar</button></div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../store'
import { authAPI } from '../../services/api'
import Swal from 'sweetalert2'

const authStore = useAuthStore()

const showSettings = ref(false)
const settingsRef = ref(null)

function toggleSettings() { showSettings.value = !showSettings.value }
function closeSettingsOutside(e) { if (settingsRef.value && !settingsRef.value.contains(e.target)) showSettings.value = false }
onMounted(() => document.addEventListener('click', closeSettingsOutside))
onUnmounted(() => document.removeEventListener('click', closeSettingsOutside))

const showPasswordModal = ref(false)
const changingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')
const showCurrentPass = ref(false)
const showNewPass = ref(false)
const showConfirmPass = ref(false)

const passwordForm = reactive({ current_password: '', new_password: '', confirm_password: '' })

function openChangePassword() { showSettings.value = false; passwordForm.current_password = ''; passwordForm.new_password = ''; passwordForm.confirm_password = ''; passwordError.value = ''; passwordSuccess.value = ''; showPasswordModal.value = true }
function closePasswordModal() { showPasswordModal.value = false }

async function changePassword() {
  passwordError.value = ''; passwordSuccess.value = ''
  if (!passwordForm.current_password) { passwordError.value = 'Ingresa tu contraseña actual'; return }
  if (!passwordForm.new_password) { passwordError.value = 'Ingresa la nueva contraseña'; return }
  if (passwordForm.new_password.length < 6) { passwordError.value = 'Mínimo 6 caracteres'; return }
  if (passwordForm.new_password !== passwordForm.confirm_password) { passwordError.value = 'Las contraseñas no coinciden'; return }
  changingPassword.value = true
  try {
    await authAPI.changePassword({ current_password: passwordForm.current_password, new_password: passwordForm.new_password })
    passwordSuccess.value = '¡Contraseña actualizada!'
    setTimeout(() => { closePasswordModal(); Swal.fire({ icon: 'success', title: 'Contraseña actualizada', timer: 2000, showConfirmButton: false }) }, 1000)
  } catch (error) { passwordError.value = error.response?.data?.message || 'Error al cambiar la contraseña' }
  finally { changingPassword.value = false }
}

const showProfileModal = ref(false)
const profileData = ref(null)
const profileLoading = ref(false)

const profileInitials = computed(() => { if (!profileData.value) return '?'; const first = (profileData.value.first_name || '').charAt(0); const last = (profileData.value.last_name || '').charAt(0); return (first + last).toUpperCase() })

async function openProfile() {
  showSettings.value = false; showProfileModal.value = true; profileLoading.value = true; profileData.value = null
  try { const { data } = await authAPI.profile(); profileData.value = data.user || data }
  catch (error) { profileData.value = authStore.user }
  finally { profileLoading.value = false }
}

// ⬇️⬇️⬇️ LOGOUT INSTANTÁNEO - SIN CONFIRMACIÓN ⬇️⬇️⬇️
function handleLogout() {
  showSettings.value = false
  authStore.logout()
}

function formatDate(date) { if (!date) return 'No disponible'; return new Date(date).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' }) }

function getRoleBadgeClass(role) {
  const map = { 'Administrador': 'badge badge-primary', 'Recepcion': 'badge badge-info', 'Groomer': 'badge badge-warning', 'Cliente': 'badge badge-secondary' }
  return map[role] || 'badge badge-secondary'
}
</script>

<style scoped>
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 60px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; box-shadow: 0 2px 15px rgba(0,0,0,0.3); z-index: 100; position: sticky; top: 0; }
.navbar-brand { display: flex; align-items: center; gap: 10px; }
.brand-icon { font-size: 1.8rem; }
.brand-text { font-size: 1.2rem; font-weight: 700; letter-spacing: 1px; }
.navbar-menu { display: flex; align-items: center; gap: 20px; }
.user-info { display: flex; align-items: center; gap: 10px; }
.user-info > i { font-size: 1.5rem; color: #9ca3af; }
.user-details { display: flex; flex-direction: column; }
.user-name { font-size: 0.88rem; font-weight: 500; }
.user-role { font-size: 0.7rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
.settings-dropdown { position: relative; }
.btn-settings { width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: #9ca3af; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; transition: all 0.3s; }
.btn-settings:hover { background: rgba(255,255,255,0.15); color: white; transform: rotate(90deg); }
.dropdown-menu { position: absolute; top: calc(100% + 10px); right: 0; background: white; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.25); min-width: 220px; z-index: 1000; overflow: hidden; animation: dropdownIn 0.2s ease; }
@keyframes dropdownIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
.dropdown-header { padding: 0.75rem 1rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; font-weight: 600; background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
.dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 0.7rem 1rem; border: none; background: none; cursor: pointer; font-size: 0.88rem; color: #374151; transition: all 0.15s; text-align: left; font-family: inherit; }
.dropdown-item:hover { background: #f3f4f6; color: #4e73df; }
.dropdown-item i { width: 20px; text-align: center; }
.logout-item { color: #e74a3b; }
.logout-item:hover { background: #fef2f2; color: #dc2626; }
.dropdown-divider { height: 1px; background: #e5e7eb; margin: 0.25rem 0; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal-content { background: white; border-radius: 12px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.4); animation: slideUp 0.3s ease; }
@keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.profile-modal { max-width: 500px; }
.modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 1; border-radius: 12px 12px 0 0; }
.modal-header h3 { margin: 0; color: #1a1a2e; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; }
.modal-header h3 i { color: #4e73df; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #9ca3af; padding: 4px 8px; border-radius: 4px; line-height: 1; }
.modal-close:hover { background: #f1f3f5; color: #e74a3b; }
.modal-body { padding: 1.5rem; }
.modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 0.75rem; position: sticky; bottom: 0; background: white; border-radius: 0 0 12px 12px; }
.profile-content { text-align: center; }
.profile-avatar { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #4e73df 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
.avatar-text { color: white; font-size: 1.8rem; font-weight: 700; }
.profile-details { text-align: left; background: #f9fafb; border-radius: 10px; padding: 1rem; }
.detail-row { padding: 0.75rem 0.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
.detail-row:last-child { border-bottom: none; }
.detail-label { font-weight: 500; color: #6b7280; font-size: 0.85rem; }
.detail-value { color: #1a1a2e; font-size: 0.9rem; text-align: right; }
.form-group { margin-bottom: 1rem; }
.form-label { display: block; margin-bottom: 0.35rem; font-weight: 500; font-size: 0.85rem; color: #374151; }
.input-wrapper { position: relative; display: flex; align-items: center; }
.input-wrapper .input-icon { position: absolute; left: 12px; color: #9ca3af; z-index: 1; }
.input-wrapper .form-control { padding-left: 38px; padding-right: 40px; width: 100%; padding-top: 0.6rem; padding-bottom: 0.6rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.9rem; transition: all 0.2s; font-family: inherit; }
.form-control:focus { outline: none; border-color: #4e73df; box-shadow: 0 0 0 3px rgba(78,115,223,0.1); }
.toggle-pass { position: absolute; right: 10px; cursor: pointer; color: #9ca3af; padding: 4px; }
.toggle-pass:hover { color: #4e73df; }
small { color: #6b7280; font-size: 0.75rem; margin-top: 0.25rem; display: block; }
.alert { padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
.alert-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.alert-success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.btn { padding: 0.55rem 1.1rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; font-family: inherit; }
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.btn-primary { background: #4e73df; color: white; }
.btn-primary:hover { background: #3a5ccc; }
.btn-secondary { background: #e5e7eb; color: #374151; }
.btn-secondary:hover { background: #d1d5db; }
.badge { padding: 0.2em 0.6em; border-radius: 50px; font-size: 0.75rem; font-weight: 600; }
.badge-primary { background: #4e73df; color: white; }
.badge-info { background: #36b9cc; color: white; }
.badge-warning { background: #f6c23e; color: #5a5c69; }
.badge-secondary { background: #858796; color: white; }
.text-center { text-align: center; }
.text-muted { color: #6b7280; }
.text-success { color: #16a34a; }
.text-danger { color: #dc2626; }
.py-4 { padding: 2rem 0; }
.mt-2 { margin-top: 0.5rem; }
.spinner { display: inline-block; width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #4e73df; border-radius: 50%; animation: spin 0.8s linear infinite; }
.spinner-small { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) { .user-details { display: none; } .brand-text { font-size: 1rem; } }
</style>