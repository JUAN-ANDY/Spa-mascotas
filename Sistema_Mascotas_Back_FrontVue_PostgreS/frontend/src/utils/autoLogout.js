/**
 * ============================================
 * UTILIDAD DE CIERRE DE SESIÓN AUTOMÁTICO
 * ============================================
 * Cierra la sesión después de 30 minutos de inactividad
 * Aplica para: Admin, Groomer, Recepcionista, Cliente
 * ============================================
 */

// Tiempo de inactividad en milisegundos (30 minutos)
const INACTIVITY_TIME = 30 * 60 * 1000; // 30 minutos

// Variable para almacenar el temporizador
let inactivityTimer = null;

// Variable para almacenar el tiempo restante
let timeRemaining = INACTIVITY_TIME;

// Variable para el intervalo de actualización del contador
let countdownInterval = null;

// Callback que se ejecutará al cerrar sesión
let logoutCallback = null;

// Callback para actualizar el contador en la UI (opcional)
let countdownCallback = null;

/**
 * Eventos que se consideran como "actividad del usuario"
 * Cualquiera de estos eventos reinicia el temporizador
 */
const ACTIVITY_EVENTS = [
    'mousedown',      // Click del mouse
    'mousemove',      // Movimiento del mouse
    'keydown',        // Tecla presionada
    'scroll',         // Scroll de la página
    'touchstart',     // Toque en pantalla táctil
    'click',          // Click en cualquier elemento
    'input',          // Entrada en campos de formulario
    'change',         // Cambio en selects/inputs
    'focus',          // Foco en cualquier elemento
    'blur'            // Pérdida de foco
];

/**
 * Reinicia el temporizador de inactividad
 * Se llama cada vez que el usuario realiza alguna acción
 */
function resetTimer() {
    // Limpiar el temporizador anterior si existe
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }

    // Limpiar el intervalo de cuenta regresiva si existe
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    // Reiniciar el tiempo restante
    timeRemaining = INACTIVITY_TIME;

    // Iniciar un nuevo temporizador
    inactivityTimer = setTimeout(() => {
        // Cuando se cumple el tiempo, cerrar sesión
        handleLogout();
    }, INACTIVITY_TIME);

    // Actualizar el contador cada segundo (opcional, para mostrar tiempo restante)
    countdownInterval = setInterval(() => {
        timeRemaining -= 1000; // Restar 1 segundo

        // Si hay un callback para actualizar el contador, llamarlo
        if (countdownCallback) {
            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            countdownCallback(minutes, seconds);
        }

        // Si el tiempo llegó a 0, limpiar el intervalo
        if (timeRemaining <= 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);
}

/**
 * Maneja el cierre de sesión automático
 */
function handleLogout() {
    // Limpiar todos los temporizadores
    clearAllTimers();

    // Mostrar mensaje al usuario (si hay callback)
    if (logoutCallback) {
        logoutCallback();
    } else {
        // Si no hay callback, mostrar alerta y redirigir
        alert('Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.');
        
        // Limpiar localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirigir al login
        window.location.href = '/login';
    }
}

/**
 * Limpia todos los temporizadores activos
 */
function clearAllTimers() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

/**
 * Inicia el sistema de cierre de sesión automático
 * @param {Function} logoutFn - Función a ejecutar al cerrar sesión
 * @param {Function} countdownFn - Función para actualizar contador en UI (opcional)
 */
export function startAutoLogout(logoutFn, countdownFn) {
    // Guardar los callbacks
    logoutCallback = logoutFn;
    countdownCallback = countdownFn || null;

    // Limpiar cualquier temporizador anterior
    clearAllTimers();

    // Agregar listeners a todos los eventos de actividad
    ACTIVITY_EVENTS.forEach(event => {
        document.addEventListener(event, resetTimer, { passive: true });
    });

    // Iniciar el temporizador inicial
    resetTimer();

    console.log('⏰ Auto-logout iniciado: 30 minutos de inactividad');
}

/**
 * Detiene el sistema de cierre de sesión automático
 * Útil cuando el usuario cierra sesión manualmente
 */
export function stopAutoLogout() {
    // Limpiar todos los temporizadores
    clearAllTimers();

    // Remover los listeners de eventos
    ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, resetTimer);
    });

    // Limpiar callbacks
    logoutCallback = null;
    countdownCallback = null;

    console.log('⏰ Auto-logout detenido');
}

/**
 * Obtiene el tiempo restante en minutos y segundos
 * @returns {Object} { minutes: number, seconds: number }
 */
export function getTimeRemaining() {
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    return { minutes, seconds };
}

/**
 * Reinicia manualmente el temporizador
 * Útil después de acciones importantes
 */
export function refreshTimer() {
    resetTimer();
}