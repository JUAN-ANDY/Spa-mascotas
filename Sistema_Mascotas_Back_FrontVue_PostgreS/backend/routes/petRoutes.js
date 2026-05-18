const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/pets
router.get('/', auth.verifyToken, async (req, res) => {
    try {
        const { search, species, size, client_id, page: p = 1, limit: l = 10 } = req.query;
        const page = parseInt(p);
        const limit = parseInt(l);
        const offset = (page - 1) * limit;
        const params = [];
        let paramCount = 1;

        let query = `
            SELECT p.*, u.first_name || ' ' || u.last_name as owner_name
            FROM pets p
            JOIN clients c ON p.client_id = c.id AND c.deleted_at IS NULL
            LEFT JOIN users u ON c.user_id = u.id
            WHERE p.deleted_at IS NULL`;
        
        let countQuery = 'SELECT COUNT(*) FROM pets WHERE deleted_at IS NULL';

        if (search) {
            query += ` AND (p.name ILIKE $${paramCount} OR p.breed ILIKE $${paramCount})`;
            countQuery += ` AND (name ILIKE $${paramCount} OR breed ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (species) {
            query += ` AND p.species = $${paramCount}`;
            countQuery += ` AND species = $${paramCount}`;
            params.push(species);
            paramCount++;
        }

        if (size) {
            query += ` AND p.size = $${paramCount}`;
            countQuery += ` AND size = $${paramCount}`;
            params.push(size);
            paramCount++;
        }

        if (client_id) {
            query += ` AND p.client_id = $${paramCount}`;
            countQuery += ` AND client_id = $${paramCount}`;
            params.push(client_id);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        query += ` ORDER BY p.name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        res.json({
            data: result.rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// GET /api/pets/client/:clientId
router.get('/client/:clientId', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM pets WHERE client_id = $1 AND deleted_at IS NULL ORDER BY name',
            [req.params.clientId]
        );
        res.json({ pets: result.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// GET /api/pets/:id
router.get('/:id', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.*, u.first_name || ' ' || u.last_name as owner_name
             FROM pets p
             JOIN clients c ON p.client_id = c.id
             LEFT JOIN users u ON c.user_id = u.id
             WHERE p.id = $1 AND p.deleted_at IS NULL`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Mascota no encontrada' });
        res.json({ pet: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// POST /api/pets
router.post('/', auth.verifyToken, async (req, res) => {
    try {
        const { client_id, name, species, breed, size, temperament, allergies, restrictions } = req.body;
        if (!client_id || !name || !species) {
            return res.status(400).json({ message: 'Campos requeridos: client_id, name, species' });
        }

        const result = await db.query(
            `INSERT INTO pets (client_id, name, species, breed, size, temperament, allergies, restrictions)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [client_id, name.trim(), species.trim(), breed?.trim(), size, temperament, allergies, restrictions]
        );
        res.status(201).json({ message: 'Mascota creada', pet: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// PUT /api/pets/:id
router.put('/:id', auth.verifyToken, async (req, res) => {
    try {
        const { name, species, breed, size, temperament, allergies, restrictions, vaccines_up_to_date } = req.body;
        const result = await db.query(
            `UPDATE pets SET 
                name = COALESCE($1, name),
                species = COALESCE($2, species),
                breed = COALESCE($3, breed),
                size = COALESCE($4, size),
                temperament = COALESCE($5, temperament),
                allergies = COALESCE($6, allergies),
                restrictions = COALESCE($7, restrictions),
                vaccines_up_to_date = COALESCE($8, vaccines_up_to_date),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $9 AND deleted_at IS NULL RETURNING *`,
            [name, species, breed, size, temperament, allergies, restrictions, vaccines_up_to_date, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Mascota no encontrada' });
        res.json({ message: 'Mascota actualizada', pet: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// DELETE /api/pets/:id
router.delete('/:id', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE pets SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Mascota no encontrada' });
        res.json({ message: 'Mascota eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;