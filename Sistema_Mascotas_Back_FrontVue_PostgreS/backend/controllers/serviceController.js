const db = require('../config/db');
const helpers = require('../utils/helpers');

class ServiceController {
    // Obtener todos los servicios
    static async getAll(req, res, next) {
        try {
            const result = await db.query(
                `SELECT * FROM services 
                 WHERE deleted_at IS NULL AND is_active = true 
                 ORDER BY name`
            );
            res.json({ services: result.rows });
        } catch (error) {
            next(error);
        }
    }

    // Obtener servicio por ID
    static async getById(req, res, next) {
        try {
            const { id } = req.params;
            const result = await db.query(
                'SELECT * FROM services WHERE id = $1 AND deleted_at IS NULL',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Servicio no encontrado'
                });
            }

            res.json({ service: result.rows[0] });
        } catch (error) {
            next(error);
        }
    }

    // Crear servicio
    static async create(req, res, next) {
        try {
            const { name, description, base_duration_minutes, base_price, allows_overlap } = req.body;

            const result = await db.query(
                `INSERT INTO services (name, description, base_duration_minutes, base_price, allows_overlap)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [name.trim(), description, base_duration_minutes, base_price, allows_overlap]
            );

            res.status(201).json({
                message: 'Servicio creado exitosamente',
                service: result.rows[0]
            });
        } catch (error) {
            next(error);
        }
    }

    // Actualizar servicio
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            const { name, description, base_duration_minutes, base_price, allows_overlap, is_active } = req.body;

            const result = await db.query(
                `UPDATE services 
                 SET name = COALESCE($1, name),
                     description = COALESCE($2, description),
                     base_duration_minutes = COALESCE($3, base_duration_minutes),
                     base_price = COALESCE($4, base_price),
                     allows_overlap = COALESCE($5, allows_overlap),
                     is_active = COALESCE($6, is_active)
                 WHERE id = $7 AND deleted_at IS NULL
                 RETURNING *`,
                [name?.trim(), description, base_duration_minutes, base_price, 
                 allows_overlap, is_active, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Servicio no encontrado'
                });
            }

            res.json({
                message: 'Servicio actualizado exitosamente',
                service: result.rows[0]
            });
        } catch (error) {
            next(error);
        }
    }

    // Eliminar servicio (soft delete)
    static async delete(req, res, next) {
        try {
            const { id } = req.params;

            const result = await db.query(
                `UPDATE services SET deleted_at = CURRENT_TIMESTAMP, is_active = false 
                 WHERE id = $1 AND deleted_at IS NULL 
                 RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Servicio no encontrado'
                });
            }

            res.json({ message: 'Servicio eliminado exitosamente' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = ServiceController;