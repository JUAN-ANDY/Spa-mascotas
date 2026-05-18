const db = require('../config/db');
const helpers = require('../utils/helpers');
const { validationResult } = require('express-validator');

class AuthController {
    // Login
    static async login(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password } = req.body;

            // Buscar usuario
            const result = await db.query(
                'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
                [email.toLowerCase().trim()]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    error: 'Credenciales inválidas',
                    message: 'Email o contraseña incorrectos'
                });
            }

            const user = result.rows[0];

            // Verificar si está activo
            if (!user.is_active) {
                return res.status(401).json({
                    error: 'Cuenta desactivada',
                    message: 'Tu cuenta ha sido desactivada'
                });
            }

            // Verificar contraseña
            const isValidPassword = await helpers.comparePassword(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    error: 'Credenciales inválidas',
                    message: 'Email o contraseña incorrectos'
                });
            }

            // Generar token
            const token = helpers.generateToken(user.id, user.role);

            // Respuesta
            res.json({
                message: 'Login exitoso',
                token,
                user: helpers.sanitizeUser(user)
            });

        } catch (error) {
            next(error);
        }
    }

    // Registro (solo admin puede crear usuarios)
    static async register(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password, first_name, last_name, role, phone, branch_id } = req.body;

            // Verificar si el email ya existe
            const existingUser = await db.query(
                'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
                [email.toLowerCase().trim()]
            );

            if (existingUser.rows.length > 0) {
                return res.status(409).json({
                    error: 'Conflicto',
                    message: 'El email ya está registrado'
                });
            }

            // Hash de contraseña
            const password_hash = await helpers.hashPassword(password);

            // Insertar usuario
            const result = await db.query(
                `INSERT INTO users (branch_id, role, email, password_hash, first_name, last_name, phone)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [branch_id, role, email.toLowerCase().trim(), password_hash, first_name.trim(), last_name.trim(), phone]
            );

            const user = result.rows[0];

            res.status(201).json({
                message: 'Usuario creado exitosamente',
                user: helpers.sanitizeUser(user)
            });

        } catch (error) {
            next(error);
        }
    }

    // Verificar token
    static async verifyToken(req, res) {
        res.json({
            valid: true,
            user: req.user
        });
    }

    // Obtener perfil actual
    static async getProfile(req, res, next) {
        try {
            const result = await db.query(
                'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Usuario no encontrado'
                });
            }

            res.json({
                user: helpers.sanitizeUser(result.rows[0])
            });

        } catch (error) {
            next(error);
        }
    }

    // Cambiar contraseña
    static async changePassword(req, res, next) {
        try {
            const { current_password, new_password } = req.body;

            if (!current_password || !new_password) {
                return res.status(400).json({
                    error: 'Datos incompletos',
                    message: 'Se requiere contraseña actual y nueva'
                });
            }

            if (new_password.length < 6) {
                return res.status(400).json({
                    error: 'Contraseña inválida',
                    message: 'La nueva contraseña debe tener al menos 6 caracteres'
                });
            }

            // Obtener usuario actual
            const result = await db.query(
                'SELECT password_hash FROM users WHERE id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Usuario no encontrado'
                });
            }

            // Verificar contraseña actual
            const isValid = await helpers.comparePassword(current_password, result.rows[0].password_hash);
            if (!isValid) {
                return res.status(401).json({
                    error: 'Contraseña incorrecta',
                    message: 'La contraseña actual es incorrecta'
                });
            }

            // Actualizar contraseña
            const newHash = await helpers.hashPassword(new_password);
            await db.query(
                'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [newHash, req.user.id]
            );

            res.json({
                message: 'Contraseña actualizada exitosamente'
            });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = AuthController;