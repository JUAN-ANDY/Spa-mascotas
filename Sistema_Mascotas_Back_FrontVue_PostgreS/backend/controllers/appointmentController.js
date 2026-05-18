const db = require('../config/db');
const helpers = require('../utils/helpers');

class AppointmentController {
    // Obtener todas las citas
    static async getAll(req, res, next) {
        try {
            const { page, limit, offset } = helpers.getPaginationParams(req.query);
            const status = req.query.status;
            const date = req.query.date;

            let query = `
                SELECT a.*, 
                       b.name as branch_name,
                       u.first_name || ' ' || u.last_name as client_name,
                       p.name as pet_name,
                       p.species as pet_species,
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
            const params = [];
            let paramCount = 1;

            if (status) {
                const statusCondition = ` AND a.status = $${paramCount}`;
                query += statusCondition;
                countQuery += statusCondition;
                params.push(status);
                paramCount++;
            }

            if (date) {
                const dateCondition = ` AND DATE(a.scheduled_start) = $${paramCount}`;
                query += dateCondition;
                countQuery += dateCondition;
                params.push(date);
                paramCount++;
            }

            query += ` ORDER BY a.scheduled_start DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            
            const countResult = await db.query(countQuery, params.slice(0, paramCount - 1));
            const total = parseInt(countResult.rows[0].count);

            params.push(limit, offset);
            const result = await db.query(query, params);

            res.json(helpers.formatPaginatedResponse(result.rows, total, page, limit));

        } catch (error) {
            next(error);
        }
    }

    // Obtener cita por ID
    static async getById(req, res, next) {
        try {
            const { id } = req.params;

            const result = await db.query(
                `SELECT a.*, 
                        b.name as branch_name,
                        u.first_name || ' ' || u.last_name as client_name,
                        u.email as client_email,
                        u.phone as client_phone,
                        p.name as pet_name,
                        p.species, p.breed, p.size, p.temperament,
                        g.first_name || ' ' || g.last_name as groomer_name,
                        s.name as service_name,
                        s.base_duration_minutes
                 FROM appointments a
                 JOIN branches b ON a.branch_id = b.id
                 JOIN clients c ON a.client_id = c.id
                 JOIN pets p ON a.pet_id = p.id
                 JOIN users g ON a.groomer_id = g.id
                 JOIN services s ON a.service_id = s.id
                 JOIN users u ON c.user_id = u.id
                 WHERE a.id = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Cita no encontrada'
                });
            }

            res.json({ appointment: result.rows[0] });

        } catch (error) {
            next(error);
        }
    }

    // Crear cita
    static async create(req, res, next) {
        try {
            const { 
                branch_id, client_id, pet_id, groomer_id, service_id, 
                scheduled_start, total_price, status 
            } = req.body;

            // Obtener duración del servicio
            const serviceResult = await db.query(
                'SELECT base_duration_minutes FROM services WHERE id = $1',
                [service_id]
            );

            if (serviceResult.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Servicio no encontrado'
                });
            }

            const duration = serviceResult.rows[0].base_duration_minutes;
            const startTime = new Date(scheduled_start);
            const endTime = new Date(startTime.getTime() + duration * 60000);

            // Validar capacidad del groomer
            const hasCapacity = await db.query(
                'SELECT check_groomer_capacity($1, $2, $3) as available',
                [groomer_id, startTime.toISOString(), endTime.toISOString()]
            );

            if (!hasCapacity.rows[0].available) {
                return res.status(409).json({
                    error: 'Conflicto de horario',
                    message: 'El groomer no tiene disponibilidad en este horario'
                });
            }

            const result = await db.query(
                `INSERT INTO appointments 
                 (branch_id, client_id, pet_id, groomer_id, service_id, created_by,
                  scheduled_start, scheduled_end, total_price, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING *`,
                [branch_id, client_id, pet_id, groomer_id, service_id, req.user.id,
                 startTime.toISOString(), endTime.toISOString(), total_price, 
                 status || 'Pendiente']
            );

            res.status(201).json({
                message: 'Cita creada exitosamente',
                appointment: result.rows[0]
            });

        } catch (error) {
            next(error);
        }
    }

    // Actualizar cita
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            const { groomer_id, scheduled_start, status, actual_duration_minutes, total_price } = req.body;

            const existing = await db.query('SELECT * FROM appointments WHERE id = $1', [id]);
            if (existing.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Cita no encontrada'
                });
            }

            let updateQuery = `
                UPDATE appointments 
                SET groomer_id = COALESCE($1, groomer_id),
                    status = COALESCE($2, status),
                    actual_duration_minutes = COALESCE($3, actual_duration_minutes),
                    total_price = COALESCE($4, total_price),
                    updated_by = $5,
                    updated_at = CURRENT_TIMESTAMP`;

            const params = [groomer_id, status, actual_duration_minutes, total_price, req.user.id];
            let paramCount = 6;

            if (scheduled_start) {
                const startTime = new Date(scheduled_start);
                const duration = existing.rows[0].actual_duration_minutes || 
                                (await db.query('SELECT base_duration_minutes FROM services WHERE id = $1', 
                                [existing.rows[0].service_id])).rows[0].base_duration_minutes;
                const endTime = new Date(startTime.getTime() + duration * 60000);
                
                updateQuery += `, scheduled_start = $${paramCount}, scheduled_end = $${paramCount + 1}`;
                params.push(startTime.toISOString(), endTime.toISOString());
                paramCount += 2;
            }

            updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
            params.push(id);

            const result = await db.query(updateQuery, params);

            res.json({
                message: 'Cita actualizada exitosamente',
                appointment: result.rows[0]
            });

        } catch (error) {
            next(error);
        }
    }

    // Cancelar cita
    static async cancel(req, res, next) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const result = await db.query(
                `UPDATE appointments 
                 SET status = 'Cancelada', updated_at = CURRENT_TIMESTAMP, updated_by = $1
                 WHERE id = $2 AND status NOT IN ('Completada', 'Cancelada')
                 RETURNING *`,
                [req.user.id, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrada o ya cancelada',
                    message: 'Cita no encontrada o ya está cancelada/completada'
                });
            }

            // Registrar en auditoría
            await db.query(
                `INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by)
                 VALUES ('appointments', $1, 'UPDATE', $2, $3)`,
                [id, JSON.stringify({ status: 'Cancelada', reason }), req.user.id]
            );

            res.json({
                message: 'Cita cancelada exitosamente',
                appointment: result.rows[0]
            });

        } catch (error) {
            next(error);
        }
    }

    // Obtener citas del día
    static async getTodayAppointments(req, res, next) {
        try {
            const result = await db.query(
                `SELECT a.*, 
                        u.first_name || ' ' || u.last_name as client_name,
                        p.name as pet_name,
                        g.first_name || ' ' || g.last_name as groomer_name,
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
            next(error);
        }
    }
}

module.exports = AppointmentController;