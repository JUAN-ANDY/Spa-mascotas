const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/users
router.get('/', auth.verifyToken, async (req, res) => {
    try {
        const { search, role, page: p = 1, limit: l = 10 } = req.query;
        const page = parseInt(p);
        const limit = parseInt(l);
        const offset = (page - 1) * limit;
        const params = [];
        let paramCount = 1;

        let query = 'SELECT * FROM users WHERE deleted_at IS NULL';
        let countQuery = 'SELECT COUNT(*) FROM users WHERE deleted_at IS NULL';

        if (role) {
            query += ` AND role = $${paramCount}`;
            countQuery += ` AND role = $${paramCount}`;
            params.push(role);
            paramCount++;
        }

        if (search) {
            query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
            countQuery += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        const users = result.rows.map(u => {
            const { password_hash, two_factor_secret, ...user } = u;
            return user;
        });

        res.json({
            data: users,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('❌ Error obteniendo usuarios:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// GET /api/users/groomers
router.get('/groomers', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, first_name, last_name, email, phone, concurrent_capacity, turno
             FROM users WHERE role = 'Groomer' AND is_active = true AND deleted_at IS NULL`
        );
        res.json({ groomers: result.rows });
    } catch (error) {
        console.error('❌ Error obteniendo groomers:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// GET /api/users/:id
router.get('/:id', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
        const { password_hash, two_factor_secret, ...user } = result.rows[0];
        res.json({ user });
    } catch (error) {
        console.error('❌ Error obteniendo usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// PUT /api/users/:id
// ⬇️ CORREGIDO: Agregado campo turno ⬇️
router.put('/:id', auth.verifyToken, async (req, res) => {
    try {
        const { email, first_name, last_name, phone, role, branch_id, is_active, concurrent_capacity, turno } = req.body;
        
        console.log(`✏️ Actualizando usuario: ${req.params.id}`, { role, turno });
        
        const result = await db.query(
            `UPDATE users SET 
                email = COALESCE($1, email),
                first_name = COALESCE($2, first_name),
                last_name = COALESCE($3, last_name),
                phone = COALESCE($4, phone),
                role = COALESCE($5, role),
                branch_id = COALESCE($6, branch_id),
                is_active = COALESCE($7, is_active),
                concurrent_capacity = COALESCE($8, concurrent_capacity),
                turno = COALESCE($9, turno),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $10 AND deleted_at IS NULL RETURNING *`,
            [
                email || null,
                first_name || null,
                last_name || null,
                phone || null,
                role || null,
                branch_id || null,
                is_active,
                concurrent_capacity || null,
                turno || null,  // ⬇️ AGREGADO: parámetro turno ⬇️
                req.params.id
            ]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
        
        const { password_hash, two_factor_secret, ...user } = result.rows[0];
        
        console.log(`✅ Usuario actualizado: ${user.email} (${user.role})${user.turno ? ' - Turno: ' + user.turno : ''}`);
        res.json({ message: 'Usuario actualizado', user });
        
    } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
        // ⬇️ AGREGADO: Manejo de error si la columna turno no existe ⬇️
        if (error.code === '42703') {
            return res.status(500).json({ 
                message: 'Error: La columna turno no existe. Ejecuta: ALTER TABLE users ADD COLUMN IF NOT EXISTS turno VARCHAR(10)' 
            });
        }
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// DELETE /api/users/:id
router.delete('/:id', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE users SET deleted_at = CURRENT_TIMESTAMP, is_active = false WHERE id = $1 AND deleted_at IS NULL RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
        console.log(`🗑️ Usuario eliminado: ${req.params.id}`);
        res.json({ message: 'Usuario eliminado' });
    } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;