const db = require('../config/db');
const helpers = require('../utils/helpers');

class PetController {
    // Obtener todas las mascotas
    static async getAll(req, res, next) {
        try {
            const { page, limit, offset } = helpers.getPaginationParams(req.query);
            const search = req.query.search || '';

            let query = `
                SELECT p.*, 
                       u.first_name as owner_first_name, 
                       u.last_name as owner_last_name
                FROM pets p
                JOIN clients c ON p.client_id = c.id AND c.deleted_at IS NULL
                LEFT JOIN users u ON c.user_id = u.id
                WHERE p.deleted_at IS NULL`;
            
            let countQuery = 'SELECT COUNT(*) FROM pets WHERE deleted_at IS NULL';
            const params = [];
            let paramCount = 1;

            if (search) {
                const searchCondition = ` AND p.name ILIKE $${paramCount}`;
                query += searchCondition;
                countQuery += searchCondition;
                params.push(`%${search}%`);
                paramCount++;
            }

            query += ` ORDER BY p.name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            
            const countResult = await db.query(countQuery, params.slice(0, paramCount - 1));
            const total = parseInt(countResult.rows[0].count);

            params.push(limit, offset);
            const result = await db.query(query, params);

            res.json(helpers.formatPaginatedResponse(result.rows, total, page, limit));

        } catch (error) {
            next(error);
        }
    }

    // Obtener mascota por ID
    static async getById(req, res, next) {
        try {
            const { id } = req.params;

            const result = await db.query(
                `SELECT p.*, 
                        u.first_name as owner_first_name, 
                        u.last_name as owner_last_name,
                        u.email as owner_email,
                        u.phone as owner_phone
                 FROM pets p
                 JOIN clients c ON p.client_id = c.id AND c.deleted_at IS NULL
                 LEFT JOIN users u ON c.user_id = u.id
                 WHERE p.id = $1 AND p.deleted_at IS NULL`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Mascota no encontrada'
                });
            }

            res.json({ pet: result.rows[0] });

        } catch (error) {
            next(error);
        }
    }

    // Crear mascota
    static async create(req, res, next) {
        try {
            const { client_id, name, species, breed, size, temperament, allergies, restrictions } = req.body;

            const result = await db.query(
                `INSERT INTO pets (client_id, name, species, breed, size, temperament, allergies, restrictions)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [client_id, name.trim(), species.trim(), breed?.trim(), size, 
                 temperament, allergies, restrictions]
            );

            res.status(201).json({
                message: 'Mascota creada exitosamente',
                pet: result.rows[0]
            });

        } catch (error) {
            next(error);
        }
    }

    // Actualizar mascota
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            const { name, species, breed, size, temperament, allergies, restrictions, vaccines_up_to_date } = req.body;

            const existing = await db.query('SELECT id FROM pets WHERE id = $1 AND deleted_at IS NULL', [id]);
            if (existing.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Mascota no encontrada'
                });
            }

            const result = await db.query(
                `UPDATE pets 
                 SET name = COALESCE($1, name),
                     species = COALESCE($2, species),
                     breed = COALESCE($3, breed),
                     size = COALESCE($4, size),
                     temperament = COALESCE($5, temperament),
                     allergies = COALESCE($6, allergies),
                     restrictions = COALESCE($7, restrictions),
                     vaccines_up_to_date = COALESCE($8, vaccines_up_to_date),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $9
                 RETURNING *`,
                [name?.trim(), species?.trim(), breed?.trim(), size, temperament, 
                 allergies, restrictions, vaccines_up_to_date, id]
            );

            res.json({
                message: 'Mascota actualizada exitosamente',
                pet: result.rows[0]
            });

        } catch (error) {
            next(error);
        }
    }

    // Eliminar mascota (soft delete)
    static async delete(req, res, next) {
        try {
            const { id } = req.params;

            const result = await db.query(
                `UPDATE pets SET deleted_at = CURRENT_TIMESTAMP 
                 WHERE id = $1 AND deleted_at IS NULL 
                 RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Mascota no encontrada'
                });
            }

            res.json({
                message: 'Mascota eliminada exitosamente'
            });

        } catch (error) {
            next(error);
        }
    }

    // Obtener mascotas por cliente
    static async getByClient(req, res, next) {
        try {
            const { clientId } = req.params;

            const result = await db.query(
                `SELECT * FROM pets 
                 WHERE client_id = $1 AND deleted_at IS NULL 
                 ORDER BY name`,
                [clientId]
            );

            res.json({ pets: result.rows });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = PetController;