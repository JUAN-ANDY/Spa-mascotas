const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /api/clients
router.get('/', auth.verifyToken, async (req, res) => {
    try {
        const { search, page: p = 1, limit: l = 10 } = req.query;
        const page = parseInt(p);
        const limit = parseInt(l);
        const offset = (page - 1) * limit;
        const params = [];
        let paramCount = 1;

        let query = `
            SELECT c.*, u.email, u.first_name, u.last_name, u.phone, u.is_active
            FROM clients c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.deleted_at IS NULL`;
        
        let countQuery = 'SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL';

        if (search) {
            query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
            countQuery += ` AND EXISTS (SELECT 1 FROM users u WHERE clients.user_id = u.id AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount}))`;
            params.push(`%${search}%`);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        query += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        res.json({
            data: result.rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('❌ Error obteniendo clientes:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// GET /api/clients/:id
router.get('/:id', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.*, u.email, u.first_name, u.last_name, u.phone
             FROM clients c LEFT JOIN users u ON c.user_id = u.id
             WHERE c.id = $1 AND c.deleted_at IS NULL`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Cliente no encontrado' });
        res.json({ client: result.rows[0] });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// POST /api/clients (CORREGIDO)
router.post('/', auth.verifyToken, async (req, res) => {
    try {
        const { email, first_name, last_name, phone, preferences } = req.body;

        if (!email || !first_name || !last_name) {
            return res.status(400).json({ message: 'Email, nombre y apellido requeridos' });
        }

        // Verificar si ya existe un usuario con ese email
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
            [email.toLowerCase().trim()]
        );

        let userId;

        if (existingUser.rows.length > 0) {
            // El usuario ya existe, usar su ID
            userId = existingUser.rows[0].id;
            
            // Verificar si ya tiene perfil de cliente
            const existingClient = await db.query(
                'SELECT id FROM clients WHERE user_id = $1 AND deleted_at IS NULL',
                [userId]
            );
            
            if (existingClient.rows.length > 0) {
                // Ya existe el cliente, devolverlo
                const clientData = await db.query(
                    `SELECT c.*, u.email, u.first_name, u.last_name, u.phone
                     FROM clients c LEFT JOIN users u ON c.user_id = u.id
                     WHERE c.id = $1`,
                    [existingClient.rows[0].id]
                );
                return res.json({ client: clientData.rows[0], message: 'Cliente ya existente' });
            }
        } else {
            // Crear nuevo usuario
            const tempPassword = 'Cliente123!';
            const salt = await bcrypt.genSalt(12);
            const password_hash = await bcrypt.hash(tempPassword, salt);

            const newUser = await db.query(
                `INSERT INTO users (role, email, password_hash, first_name, last_name, phone)
                 VALUES ('Cliente', $1, $2, $3, $4, $5) RETURNING id`,
                [email.toLowerCase().trim(), password_hash, first_name.trim(), last_name.trim(), phone || null]
            );
            userId = newUser.rows[0].id;
        }

        // Crear perfil de cliente
        const clientResult = await db.query(
            `INSERT INTO clients (user_id, preferences) VALUES ($1, $2) RETURNING *`,
            [userId, preferences || null]
        );

        // Obtener datos completos
        const fullClient = await db.query(
            `SELECT c.*, u.email, u.first_name, u.last_name, u.phone
             FROM clients c LEFT JOIN users u ON c.user_id = u.id
             WHERE c.id = $1`,
            [clientResult.rows[0].id]
        );

        console.log('✅ Cliente creado:', fullClient.rows[0].email);
        res.status(201).json({ client: fullClient.rows[0], message: 'Cliente creado exitosamente' });

    } catch (error) {
        console.error('❌ Error creando cliente:', error);
        
        if (error.code === '23505') {
            return res.status(409).json({ message: 'El email ya está registrado' });
        }
        
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// PUT /api/clients/:id
router.put('/:id', auth.verifyToken, async (req, res) => {
    try {
        const { email, first_name, last_name, phone, preferences } = req.body;
        
        const existing = await db.query('SELECT user_id FROM clients WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
        if (existing.rows.length === 0) return res.status(404).json({ message: 'Cliente no encontrado' });

        if (email || first_name || last_name || phone) {
            await db.query(
                `UPDATE users SET email = COALESCE($1, email), first_name = COALESCE($2, first_name),
                 last_name = COALESCE($3, last_name), phone = COALESCE($4, phone), updated_at = CURRENT_TIMESTAMP
                 WHERE id = $5`,
                [email?.toLowerCase()?.trim(), first_name?.trim(), last_name?.trim(), phone, existing.rows[0].user_id]
            );
        }

        const result = await db.query(
            `UPDATE clients SET preferences = COALESCE($1, preferences), updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 RETURNING *`,
            [preferences, req.params.id]
        );

        res.json({ message: 'Cliente actualizado', client: result.rows[0] });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// DELETE /api/clients/:id
router.delete('/:id', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Cliente no encontrado' });
        res.json({ message: 'Cliente eliminado' });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;