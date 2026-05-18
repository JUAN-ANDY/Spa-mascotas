const db = require('../config/db');
const helpers = require('../utils/helpers');

class BranchController {
    // Obtener todas las sucursales
    static async getAll(req, res, next) {
        try {
            const { page, limit, offset } = helpers.getPaginationParams(req.query);
            const search = req.query.search || '';

            let query = 'SELECT * FROM branches WHERE 1=1';
            let countQuery = 'SELECT COUNT(*) FROM branches WHERE 1=1';
            const params = [];
            let paramCount = 1;

            if (search) {
                const searchCondition = ` AND (name ILIKE $${paramCount} OR address ILIKE $${paramCount})`;
                query += searchCondition;
                countQuery += searchCondition;
                params.push(`%${search}%`);
                paramCount++;
            }

            // Solo mostrar activos si no se especifica
            if (req.query.show_inactive !== 'true') {
                const activeCondition = ` AND is_active = true`;
                query += activeCondition;
                countQuery += activeCondition;
            }

            query += ` ORDER BY name ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            
            const countResult = await db.query(countQuery, params.slice(0, paramCount - 1));
            const total = parseInt(countResult.rows[0].count);

            params.push(limit, offset);
            const result = await db.query(query, params);

            res.json(helpers.formatPaginatedResponse(result.rows, total, page, limit));

        } catch (error) {
            next(error);
        }
    }

    // Obtener sucursal por ID
    static async getById(req, res, next) {
        try {
            const { id } = req.params;

            const result = await db.query('SELECT * FROM branches WHERE id = $1', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Sucursal no encontrada'
                });
            }

            res.json({ branch: result.rows[0] });

        } catch (error) {
            next(error);
        }
    }

    // Crear sucursal
    static async create(req, res, next) {
        try {
            const { name, address, phone } = req.body;

            if (!name) {
                return res.status(400).json({
                    error: 'Datos incompletos',
                    message: 'El nombre de la sucursal es requerido'
                });
            }

            const result = await db.query(
                `INSERT INTO branches (name, address, phone)
                 VALUES ($1, $2, $3)
                 RETURNING *`,
                [name.trim(), address?.trim(), phone?.trim()]
            );

            res.status(201).json({
                message: 'Sucursal creada exitosamente',
                branch: result.rows[0]
            });

        } catch (error) {
            next(error);
        }
    }

    // Actualizar sucursal
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            const { name, address, phone, is_active } = req.body;

            // Verificar que existe
            const existing = await db.query('SELECT id FROM branches WHERE id = $1', [id]);
            if (existing.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Sucursal no encontrada'
                });
            }

            const result = await db.query(
                `UPDATE branches 
                 SET name = COALESCE($1, name),
                     address = COALESCE($2, address),
                     phone = COALESCE($3, phone),
                     is_active = COALESCE($4, is_active)
                 WHERE id = $5
                 RETURNING *`,
                [name?.trim(), address?.trim(), phone?.trim(), is_active, id]
            );

            res.json({
                message: 'Sucursal actualizada exitosamente',
                branch: result.rows[0]
            });

        } catch (error) {
            next(error);
        }
    }

    // Eliminar sucursal (soft delete)
    static async delete(req, res, next) {
        try {
            const { id } = req.params;

            const result = await db.query(
                'UPDATE branches SET is_active = false WHERE id = $1 RETURNING *',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Sucursal no encontrada'
                });
            }

            res.json({
                message: 'Sucursal desactivada exitosamente',
                branch: result.rows[0]
            });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = BranchController;