const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/services
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM services WHERE deleted_at IS NULL AND is_active = true ORDER BY name'
        );
        res.json({ services: result.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// GET /api/services/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM services WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Servicio no encontrado' });
        res.json({ service: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// POST /api/services
router.post('/', auth.verifyToken, async (req, res) => {
    try {
        const { name, description, base_duration_minutes, base_price, allows_overlap } = req.body;
        if (!name || !base_duration_minutes || !base_price) {
            return res.status(400).json({ message: 'Nombre, duración y precio requeridos' });
        }
        const result = await db.query(
            `INSERT INTO services (name, description, base_duration_minutes, base_price, allows_overlap)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name.trim(), description, base_duration_minutes, base_price, allows_overlap || false]
        );
        res.status(201).json({ message: 'Servicio creado', service: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// PUT /api/services/:id
router.put('/:id', auth.verifyToken, async (req, res) => {
    try {
        const { name, description, base_duration_minutes, base_price, allows_overlap, is_active } = req.body;
        const result = await db.query(
            `UPDATE services SET 
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                base_duration_minutes = COALESCE($3, base_duration_minutes),
                base_price = COALESCE($4, base_price),
                allows_overlap = COALESCE($5, allows_overlap),
                is_active = COALESCE($6, is_active)
             WHERE id = $7 AND deleted_at IS NULL RETURNING *`,
            [name, description, base_duration_minutes, base_price, allows_overlap, is_active, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Servicio no encontrado' });
        res.json({ message: 'Servicio actualizado', service: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// DELETE /api/services/:id
router.delete('/:id', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE services SET deleted_at = CURRENT_TIMESTAMP, is_active = false WHERE id = $1 AND deleted_at IS NULL RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Servicio no encontrado' });
        res.json({ message: 'Servicio eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;