const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/branches
router.get('/', async (req, res) => {
    try {
        const search = req.query.search || '';
        const includeInactive = req.query.show_inactive === 'true';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM branches WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) FROM branches WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (!includeInactive) {
            query += ` AND is_active = true`;
            countQuery += ` AND is_active = true`;
        }

        if (search) {
            query += ` AND (name ILIKE $${paramCount} OR address ILIKE $${paramCount})`;
            countQuery += ` AND (name ILIKE $${paramCount} OR address ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        query += ` ORDER BY name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        res.json({
            data: result.rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// GET /api/branches/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM branches WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }
        res.json({ branch: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// POST /api/branches
router.post('/', auth.verifyToken, async (req, res) => {
    try {
        const { name, address, phone } = req.body;
        if (!name) return res.status(400).json({ message: 'Nombre requerido' });

        const result = await db.query(
            'INSERT INTO branches (name, address, phone) VALUES ($1, $2, $3) RETURNING *',
            [name.trim(), address?.trim(), phone?.trim()]
        );
        res.status(201).json({ message: 'Sucursal creada', branch: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// PUT /api/branches/:id
router.put('/:id', auth.verifyToken, async (req, res) => {
    try {
        const { name, address, phone, is_active } = req.body;
        const result = await db.query(
            `UPDATE branches SET 
                name = COALESCE($1, name),
                address = COALESCE($2, address),
                phone = COALESCE($3, phone),
                is_active = COALESCE($4, is_active)
             WHERE id = $5 RETURNING *`,
            [name?.trim(), address?.trim(), phone?.trim(), is_active, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }
        res.json({ message: 'Sucursal actualizada', branch: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// DELETE /api/branches/:id
router.delete('/:id', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE branches SET is_active = false WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }
        res.json({ message: 'Sucursal desactivada' });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;