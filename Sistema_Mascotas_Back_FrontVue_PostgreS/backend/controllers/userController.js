const db = require('../config/db');
const helpers = require('../utils/helpers');

class UserController {
    // Obtener todos los usuarios
    static async getAll(req, res, next) {
        try {
            const { page, limit, offset } = helpers.getPaginationParams(req.query);
            const role = req.query.role;
            const search = req.query.search || '';

            let query = 'SELECT * FROM users WHERE deleted_at IS NULL';
            let countQuery = 'SELECT COUNT(*) FROM users WHERE deleted_at IS NULL';
            const params = [];
            let paramCount = 1;

            if (role) {
                const roleCondition = ` AND role = $${paramCount}`;
                query += roleCondition;
                countQuery += roleCondition;
                params.push(role);
                paramCount++;
            }

            if (search) {
                const searchCondition = ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
                query += searchCondition;
                countQuery += searchCondition;
                params.push(`%${search}%`);
                paramCount++;
            }

            query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            
            const countResult = await db.query(countQuery, params.slice(0, paramCount - 1));
            const total = parseInt(countResult.rows[0].count);

            params.push(limit, offset);
            const result = await db.query(query, params);

            const sanitizedUsers = result.rows.map(helpers.sanitizeUser);
            res.json(helpers.formatPaginatedResponse(sanitizedUsers, total, page, limit));

        } catch (error) {
            next(error);
        }
    }

    // Obtener usuario por ID
    static async getById(req, res, next) {
        try {
            const { id } = req.params;

            const result = await db.query(
                'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Usuario no encontrado'
                });
            }

            res.json({ user: helpers.sanitizeUser(result.rows[0]) });

        } catch (error) {
            next(error);
        }
    }

    // Actualizar usuario
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            const { email, first_name, last_name, phone, role, branch_id, is_active, concurrent_capacity } = req.body;

            // Verificar existencia
            const existing = await db.query('SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);
            if (existing.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Usuario no encontrado'
                });
            }

            // Si se cambia el email, verificar que no exista
            if (email) {
                const emailExists = await db.query(
                    'SELECT id FROM users WHERE email = $1 AND id != $2 AND deleted_at IS NULL',
                    [email.toLowerCase().trim(), id]
                );
                if (emailExists.rows.length > 0) {
                    return res.status(409).json({
                        error: 'Conflicto',
                        message: 'El email ya está en uso por otro usuario'
                    });
                }
            }

            const result = await db.query(
                `UPDATE users 
                 SET email = COALESCE($1, email),
                     first_name = COALESCE($2, first_name),
                     last_name = COALESCE($3, last_name),
                     phone = COALESCE($4, phone),
                     role = COALESCE($5, role),
                     branch_id = COALESCE($6, branch_id),
                     is_active = COALESCE($7, is_active),
                     concurrent_capacity = COALESCE($8, concurrent_capacity),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $9
                 RETURNING *`,
                [email?.toLowerCase()?.trim(), first_name?.trim(), last_name?.trim(), 
                 phone, role, branch_id, is_active, concurrent_capacity, id]
            );

            res.json({
                message: 'Usuario actualizado exitosamente',
                user: helpers.sanitizeUser(result.rows[0])
            });

        } catch (error) {
            next(error);
        }
    }

    // Eliminar usuario (soft delete)
    static async delete(req, res, next) {
        try {
            const { id } = req.params;

            const result = await db.query(
                `UPDATE users 
                 SET deleted_at = CURRENT_TIMESTAMP, is_active = false 
                 WHERE id = $1 AND deleted_at IS NULL 
                 RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Usuario no encontrado'
                });
            }

            res.json({
                message: 'Usuario eliminado exitosamente',
                user: helpers.sanitizeUser(result.rows[0])
            });

        } catch (error) {
            next(error);
        }
    }

    // Obtener groomers disponibles
    static async getGroomers(req, res, next) {
        try {
            const result = await db.query(
                `SELECT id, first_name, last_name, email, phone, concurrent_capacity 
                 FROM users 
                 WHERE role = 'Groomer' AND is_active = true AND deleted_at IS NULL
                 ORDER BY first_name, last_name`
            );

            res.json({ groomers: result.rows });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = UserController;