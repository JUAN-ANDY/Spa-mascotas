const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/appointments
router.get('/', auth.verifyToken, async (req, res) => {
    try {
        const { status, date, page: p = 1, limit: l = 50 } = req.query;
        const page = parseInt(p);
        const limit = parseInt(l);
        const offset = (page - 1) * limit;
        const params = [];
        let paramCount = 1;

        let query = `
            SELECT a.*, b.name as branch_name,
                   u.first_name || ' ' || u.last_name as client_name,
                   p.name as pet_name, p.species as pet_species,
                   g.first_name || ' ' || g.last_name as groomer_name,
                   s.name as service_name
            FROM appointments a
            JOIN branches b ON a.branch_id = b.id
            JOIN clients c ON a.client_id = c.id
            JOIN pets p ON a.pet_id = p.id
            JOIN users g ON a.groomer_id = g.id
            JOIN services s ON a.service_id = s.id
            JOIN users u ON c.user_id = u.id
            WHERE 1=1`;
        
        let countQuery = 'SELECT COUNT(*) FROM appointments WHERE 1=1';

        if (status) {
            query += ` AND a.status = $${paramCount}`;
            countQuery += ` AND status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (date) {
            query += ` AND DATE(a.scheduled_start) = $${paramCount}`;
            countQuery += ` AND DATE(scheduled_start) = $${paramCount}`;
            params.push(date);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        query += ` ORDER BY a.scheduled_start DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
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

// GET /api/appointments/today
router.get('/today', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT a.*, u.first_name || ' ' || u.last_name as client_name,
                    p.name as pet_name, g.first_name || ' ' || g.last_name as groomer_name,
                    s.name as service_name
             FROM appointments a
             JOIN clients c ON a.client_id = c.id
             JOIN pets p ON a.pet_id = p.id
             JOIN users g ON a.groomer_id = g.id
             JOIN services s ON a.service_id = s.id
             JOIN users u ON c.user_id = u.id
             WHERE DATE(a.scheduled_start) = CURRENT_DATE
             ORDER BY a.scheduled_start`
        );
        res.json({ appointments: result.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// GET /api/appointments/:id
router.get('/:id', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT a.*, b.name as branch_name,
                    u.first_name || ' ' || u.last_name as client_name,
                    p.name as pet_name, g.first_name || ' ' || g.last_name as groomer_name,
                    s.name as service_name, s.base_duration_minutes
             FROM appointments a
             JOIN branches b ON a.branch_id = b.id
             JOIN clients c ON a.client_id = c.id
             JOIN pets p ON a.pet_id = p.id
             JOIN users g ON a.groomer_id = g.id
             JOIN services s ON a.service_id = s.id
             JOIN users u ON c.user_id = u.id
             WHERE a.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Cita no encontrada' });
        res.json({ appointment: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// POST /api/appointments
router.post('/', auth.verifyToken, async (req, res) => {
    try {
        const { branch_id, client_id, pet_id, groomer_id, service_id, scheduled_start, total_price } = req.body;
        
        if (!branch_id || !client_id || !pet_id || !groomer_id || !service_id || !scheduled_start || !total_price) {
            return res.status(400).json({ message: 'Todos los campos son requeridos' });
        }

        const serviceResult = await db.query('SELECT base_duration_minutes FROM services WHERE id = $1', [service_id]);
        if (serviceResult.rows.length === 0) return res.status(404).json({ message: 'Servicio no encontrado' });

        const duration = serviceResult.rows[0].base_duration_minutes;
        const startTime = new Date(scheduled_start);
        const endTime = new Date(startTime.getTime() + duration * 60000);

        const result = await db.query(
            `INSERT INTO appointments (branch_id, client_id, pet_id, groomer_id, service_id, created_by,
              scheduled_start, scheduled_end, total_price, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pendiente') RETURNING *`,
            [branch_id, client_id, pet_id, groomer_id, service_id, req.user.id,
             startTime.toISOString(), endTime.toISOString(), total_price]
        );

        res.status(201).json({ message: 'Cita creada', appointment: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// PUT /api/appointments/:id
router.put('/:id', auth.verifyToken, async (req, res) => {
    try {
        const { status, groomer_id, scheduled_start, actual_duration_minutes, total_price } = req.body;

        let query = `UPDATE appointments SET 
                        status = COALESCE($1, status),
                        groomer_id = COALESCE($2, groomer_id),
                        actual_duration_minutes = COALESCE($3, actual_duration_minutes),
                        total_price = COALESCE($4, total_price),
                        updated_by = $5,
                        updated_at = CURRENT_TIMESTAMP`;
        const params = [status, groomer_id, actual_duration_minutes, total_price, req.user.id];
        let paramCount = 6;

        if (scheduled_start) {
            query += `, scheduled_start = $${paramCount}`;
            params.push(new Date(scheduled_start).toISOString());
            paramCount++;
        }

        query += ` WHERE id = $${paramCount} RETURNING *`;
        params.push(req.params.id);

        const result = await db.query(query, params);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Cita no encontrada' });
        res.json({ message: 'Cita actualizada', appointment: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// POST /api/appointments/:id/cancel
router.post('/:id/cancel', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE appointments SET status = 'Cancelada', updated_by = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND status NOT IN ('Completada', 'Cancelada') RETURNING *`,
            [req.user.id, req.params.id]
        );
        if (result.rows.length === 0) return res.status(400).json({ message: 'La cita no se puede cancelar' });
        res.json({ message: 'Cita cancelada', appointment: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;