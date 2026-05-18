const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');

// ⬇️⬇️⬇️ CONFIGURACIÓN DE BLOQUEO ⬇️⬇️⬇️
const MAX_FAILED_ATTEMPTS = 5;        // Intentos máximos antes de bloquear
const LOCK_DURATION_MINUTES = 30;     // Minutos de bloqueo

// ⬇️⬇️⬇️ CONFIGURACIÓN DE GOOGLE AUTH ⬇️⬇️⬇️
const { OAuth2Client } = require('google-auth-library');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'TU_CLIENT_ID_DE_GOOGLE';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ⬇️⬇️⬇️ SERVICIO DE CORREOS (CON MANEJO DE ERROR SI NO EXISTE) ⬇️⬇️⬇️
let sendWelcomeEmail, sendNewUserNotificationToAdmin;
try {
    const emailService = require('../utils/emailService');
    sendWelcomeEmail = emailService.sendWelcomeEmail;
    sendNewUserNotificationToAdmin = emailService.sendNewUserNotificationToAdmin;
} catch (error) {
    console.log('⚠️ Servicio de correos no disponible');
    sendWelcomeEmail = () => Promise.resolve();
    sendNewUserNotificationToAdmin = () => Promise.resolve();
}

// ============================================
// POST /api/auth/login
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email y contraseña son requeridos' });
        }

        console.log(`🔑 Intento de login: ${email}`);

        const result = await db.query(
            'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
            [email.toLowerCase().trim()]
        );

        console.log(`📊 Usuarios encontrados: ${result.rows.length}`);

        if (result.rows.length === 0) {
            console.log('❌ Usuario no encontrado');
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const user = result.rows[0];
        console.log(`👤 Usuario: ${user.email} (${user.role})`);

        // ⬇️⬇️⬇️ VERIFICAR SI LA CUENTA ESTÁ BLOQUEADA ⬇️⬇️⬇️
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
            console.log(`🔒 Cuenta bloqueada: ${user.email}. Restan: ${minutesLeft} min`);
            return res.status(423).json({ 
                message: `Cuenta bloqueada por seguridad. Intenta de nuevo en ${minutesLeft} minuto(s).`,
                locked: true,
                minutesLeft: minutesLeft
            });
        }

        // ⬇️⬇️⬇️ SI ESTABA BLOQUEADA PERO YA PASÓ EL TIEMPO, DESBLOQUEAR ⬇️⬇️⬇️
        if (user.locked_until && new Date(user.locked_until) <= new Date()) {
            await db.query(
                'UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = $1',
                [user.id]
            );
            console.log(`🔓 Bloqueo expirado, cuenta desbloqueada: ${user.email}`);
        }

        if (!user.is_active) {
            console.log('❌ Usuario desactivado');
            return res.status(401).json({ message: 'Usuario desactivado. Contacte al administrador.' });
        }

        let validPassword = false;
        
        try {
            validPassword = await bcrypt.compare(password, user.password_hash);
            console.log(`🔐 ¿Contraseña válida?: ${validPassword}`);
        } catch (bcryptError) {
            console.error('❌ Error al comparar contraseñas:', bcryptError.message);
            return res.status(401).json({ message: 'Error al verificar credenciales' });
        }

        if (!validPassword) {
            // ⬇️⬇️⬇️ CONTRASEÑA INCORRECTA: AUMENTAR INTENTOS ⬇️⬇️⬇️
            const currentAttempts = user.failed_login_attempts || 0;
            const newFailedAttempts = currentAttempts + 1;
            const attemptsLeft = MAX_FAILED_ATTEMPTS - newFailedAttempts;
            
            console.log(`❌ Contraseña incorrecta. Intento ${newFailedAttempts} de ${MAX_FAILED_ATTEMPTS}`);

            if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
                const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000);
                await db.query(
                    'UPDATE users SET failed_login_attempts = $1, locked_until = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                    [newFailedAttempts, lockUntil.toISOString(), user.id]
                );
                console.log(`🔒 Cuenta BLOQUEADA: ${user.email} por ${LOCK_DURATION_MINUTES} minutos`);
                return res.status(423).json({ 
                    message: `Cuenta bloqueada por ${LOCK_DURATION_MINUTES} minutos después de ${MAX_FAILED_ATTEMPTS} intentos fallidos.`,
                    locked: true,
                    minutesLeft: LOCK_DURATION_MINUTES
                });
            } else {
                await db.query(
                    'UPDATE users SET failed_login_attempts = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                    [newFailedAttempts, user.id]
                );
                return res.status(401).json({ 
                    message: `Credenciales inválidas. Te quedan ${attemptsLeft} intento(s) antes del bloqueo.`,
                    attemptsLeft: attemptsLeft
                });
            }
        }

        // ⬇️⬇️⬇️ LOGIN EXITOSO: RESETEAR CONTADOR ⬇️⬇️⬇️
        await db.query(
            'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );
        console.log(`✅ Contador reseteado para: ${user.email}`);

        const token = jwt.sign(
            { userId: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET || 'clave_secreta_super_segura_2024',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        const { password_hash, two_factor_secret, failed_login_attempts, locked_until, ...userData } = user;

        console.log(`✅ Login exitoso: ${user.email}`);

        res.json({
            message: 'Login exitoso',
            token,
            user: userData
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// ============================================
// POST /api/auth/google (GOOGLE AUTH)
// ============================================
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: 'Token de Google requerido' });
        }

        console.log('🔵 Verificando token de Google...');

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const googleEmail = payload.email;
        const googleName = payload.given_name || '';
        const googleLastName = payload.family_name || '';

        console.log(`🔵 Google Auth: ${googleEmail} (${googleName} ${googleLastName})`);

        const existingUser = await db.query(
            'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
            [googleEmail.toLowerCase().trim()]
        );

        let user;

        if (existingUser.rows.length > 0) {
            user = existingUser.rows[0];
            console.log(`👤 Usuario existente: ${user.email} (${user.role})`);

            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
                return res.status(423).json({ 
                    message: `Cuenta bloqueada. Intenta de nuevo en ${minutesLeft} minuto(s).`,
                    locked: true,
                    minutesLeft: minutesLeft
                });
            }

            if (!user.is_active) {
                return res.status(401).json({ message: 'Usuario desactivado. Contacte al administrador.' });
            }

            await db.query(
                'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );

        } else {
            console.log(`📝 Creando nuevo usuario desde Google: ${googleEmail}`);

            const randomPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).toUpperCase().slice(-4);
            const salt = await bcrypt.genSalt(12);
            const password_hash = await bcrypt.hash(randomPassword, salt);

            const newUser = await db.query(
                `INSERT INTO users (role, email, password_hash, first_name, last_name, failed_login_attempts, locked_until)
                 VALUES ('Cliente', $1, $2, $3, $4, 0, NULL)
                 RETURNING *`,
                [googleEmail.toLowerCase().trim(), password_hash, googleName.trim(), googleLastName.trim()]
            );

            user = newUser.rows[0];
            console.log(`✅ Usuario creado desde Google: ${user.email} (Cliente)`);

            try {
                await db.query(`INSERT INTO clients (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [user.id]);
            } catch (clientError) {}

            // ⬇️ ENVIAR CORREOS ⬇️
            sendWelcomeEmail(user).catch(() => {});
            sendNewUserNotificationToAdmin(user).catch(() => {});
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET || 'clave_secreta_super_segura_2024',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        const { password_hash, two_factor_secret, failed_login_attempts, locked_until, ...userData } = user;

        console.log(`✅ Google Auth exitoso: ${user.email}`);

        res.json({
            message: existingUser.rows.length > 0 ? 'Inicio de sesión con Google exitoso' : 'Cuenta creada con Google exitosamente',
            token,
            user: userData
        });

    } catch (error) {
        console.error('❌ Error en Google Auth:', error);
        if (error.message?.includes('Token used too late') || error.message?.includes('Wrong number of segments')) {
            return res.status(401).json({ message: 'Token de Google inválido o expirado. Intenta de nuevo.' });
        }
        res.status(500).json({ message: 'Error al verificar la cuenta de Google' });
    }
});

// ============================================
// POST /api/auth/unlock-account (SOLO ADMIN)
// ============================================
router.post('/unlock-account', auth.verifyToken, auth.authorize('Administrador'), async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email requerido' });

        const result = await db.query(
            'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE email = $1 AND deleted_at IS NULL RETURNING id, email, role, first_name, last_name',
            [email.toLowerCase().trim()]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        console.log(`🔓 Cuenta desbloqueada por admin: ${email}`);
        res.json({ message: 'Cuenta desbloqueada exitosamente', user: result.rows[0] });
    } catch (error) {
        console.error('❌ Error desbloqueando:', error);
        res.status(500).json({ message: 'Error interno' });
    }
});

// ============================================
// POST /api/auth/register
// ============================================
router.post('/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, role, phone, branch_id, concurrent_capacity, turno } = req.body;

        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ message: 'Campos requeridos: email, password, first_name, last_name' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
        }

        console.log(`📝 Registrando usuario: ${email}`);

        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'El email ya está registrado' });
        }

        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(password, salt);

        const result = await db.query(
            `INSERT INTO users (branch_id, role, email, password_hash, first_name, last_name, phone, concurrent_capacity, turno, failed_login_attempts, locked_until)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, NULL)
             RETURNING *`,
            [branch_id || null, role || 'Cliente', email.toLowerCase().trim(), password_hash,
             first_name.trim(), last_name.trim(), phone || null, concurrent_capacity || 1, turno || null]
        );

        const { password_hash: pwd, two_factor_secret, failed_login_attempts, locked_until, ...userData } = result.rows[0];

        console.log(`✅ Usuario registrado: ${email} (${userData.role})${userData.turno ? ' - Turno: ' + userData.turno : ''}`);

        // ⬇️⬇️⬇️ ENVIAR CORREOS (NO BLOQUEA LA RESPUESTA) ⬇️⬇️⬇️
        sendWelcomeEmail(userData, password).catch(() => {});
        sendNewUserNotificationToAdmin(userData).catch(() => {});

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: userData
        });

    } catch (error) {
        console.error('❌ Error en registro:', error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'El email ya está registrado' });
        }
        if (error.code === '42703') {
            return res.status(500).json({ message: 'Error: La columna turno no existe.' });
        }
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// ============================================
// GET /api/auth/profile
// ============================================
router.get('/profile', auth.verifyToken, async (req, res) => {
    try {
        console.log(`👤 Obteniendo perfil: ${req.user.id}`);

        const result = await db.query(
            'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
            [req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const { password_hash, two_factor_secret, failed_login_attempts, locked_until, ...userData } = result.rows[0];

        res.json({ user: userData });

    } catch (error) {
        console.error('❌ Error obteniendo perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// ============================================
// PUT /api/auth/change-password
// ============================================
router.put('/change-password', auth.verifyToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ message: 'Contraseña actual y nueva son requeridas' });
        }

        if (new_password.length < 8) {
            return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres' });
        }

        if (current_password === new_password) {
            return res.status(400).json({ message: 'La nueva contraseña debe ser diferente a la actual' });
        }

        console.log(`🔐 Cambio de contraseña para usuario: ${req.user.id}`);

        const result = await db.query(
            'SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL',
            [req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const validPassword = await bcrypt.compare(current_password, result.rows[0].password_hash);

        if (!validPassword) {
            return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
        }

        const salt = await bcrypt.genSalt(12);
        const newHash = await bcrypt.hash(new_password, salt);

        await db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, req.user.id]);

        console.log(`✅ Contraseña actualizada para usuario: ${req.user.id}`);
        res.json({ message: 'Contraseña actualizada exitosamente' });

    } catch (error) {
        console.error('❌ Error cambiando contraseña:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// ============================================
// GET /api/auth/verify - Verificar token
// ============================================
router.get('/verify', auth.verifyToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ============================================
// POST /api/auth/seed-admin - Crear admin de emergencia
// ============================================
router.post('/seed-admin', async (req, res) => {
    try {
        const adminEmail = 'admin@spa.com';
        const adminPassword = 'admin123';

        console.log('🔧 Creando/actualizando usuario admin...');

        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(adminPassword, salt);

        let branchId = null;
        const branchResult = await db.query('SELECT id FROM branches LIMIT 1');
        if (branchResult.rows.length === 0) {
            const newBranch = await db.query(
                "INSERT INTO branches (name, address, phone) VALUES ('Sucursal Central', 'Av. Principal', '44412345') RETURNING id"
            );
            branchId = newBranch.rows[0].id;
        } else {
            branchId = branchResult.rows[0].id;
        }

        const result = await db.query(
            `INSERT INTO users (branch_id, role, email, password_hash, first_name, last_name, is_active, failed_login_attempts, locked_until)
             VALUES ($1, 'Administrador', $2, $3, 'Admin', 'Principal', true, 0, NULL)
             ON CONFLICT (email) 
             DO UPDATE SET password_hash = $3, is_active = true, failed_login_attempts = 0, locked_until = NULL, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
             RETURNING id, email, role, first_name, last_name`,
            [branchId, adminEmail, hash]
        );

        console.log('✅ Usuario admin creado/actualizado');

        res.json({
            message: 'Usuario admin creado/actualizado',
            credentials: { email: adminEmail, password: adminPassword },
            user: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ message: 'Error creando admin' });
    }
});

module.exports = router;