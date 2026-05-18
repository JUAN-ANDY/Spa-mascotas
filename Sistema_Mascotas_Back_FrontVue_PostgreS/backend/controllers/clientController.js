const db = require('../config/db');
const helpers = require('../utils/helpers');

class ClientController {
    // Obtener todos los clientes
    static async getAll(req, res, next) {
        try {
            const { page, limit, offset } = helpers.getPaginationParams(req.query);
            const search = req.query.search || '';

            let query = `
                SELECT c.*, u.email, u.first_name, u.last_name, u.phone
                FROM clients c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.deleted_at IS NULL`;
            
            let countQuery = 'SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL';
            const params = [];
            let paramCount = 1;

            if (search) {
                const searchCondition = ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
                query += searchCondition;
                countQuery += ` AND (EXISTS (SELECT 1 FROM users u WHERE c.user_id = u.id AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})))`;
                params.push(`%${search}%`);
                paramCount++;
            }

            query += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            
            const countResult = await db.query(countQuery, params.slice(0, paramCount - 1));
            const total = parseInt(countResult.rows[0].count);

            params.push(limit, offset);
            const result = await db.query(query, params);

            res.json(helpers.formatPaginatedResponse(result.rows, total, page, limit));

        } catch (error) {
            next(error);
        }
    }

    // Obtener cliente por ID
    static async getById(req, res, next) {
        try {
            const { id } = req.params;

            const result = await db.query(
                `SELECT c.*, u.email, u.first_name, u.last_name, u.phone, u.is_active
                 FROM clients c
                 LEFT JOIN users u ON c.user_id = u.id
                 WHERE c.id = $1 AND c.deleted_at IS NULL`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Cliente no encontrado'
                });
            }

            // Obtener mascotas del cliente
            const pets = await db.query(
                `SELECT * FROM pets 
                 WHERE client_id = $1 AND deleted_at IS NULL 
                 ORDER BY name`,
                [id]
            );

            res.json({ 
                client: result.rows[0],
                pets: pets.rows 
            });

        } catch (error) {
            next(error);
        }
    }

    // Crear cliente
    static async create(req, res, next) {
        try {
            const { email, first_name, last_name, phone, preferences } = req.body;

            // Crear transacción
            const result = await db.transaction(async (client) => {
                // Crear usuario primero
                const userResult = await client.query(
                    `INSERT INTO users (role, email, password_hash, first_name, last_name, phone)
                     VALUES ('Cliente', $1, 'temporal_placeholder', $2, $3, $4)
                     RETURNING id`,
                    [email?.toLowerCase()?.trim(), first_name?.trim(), last_name?.trim(), phone]
                );

                // Crear cliente
                const clientResult = await client.query(
                    `INSERT INTO clients (user_id, preferences)
                     VALUES ($1, $2)
                     RETURNING *`,
                    [userResult.rows[0].id, preferences]
                );

                return clientResult.rows[0];
            });

            res.status(201).json({
                message: 'Cliente creado exitosamente',
                client: result
            });

        } catch (error) {
            next(error);
        }
    }

    // Actualizar cliente
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            const { email, first_name, last_name, phone, preferences } = req.body;

            const existing = await db.query('SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL', [id]);
            if (existing.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Cliente no encontrado'
                });
            }

            const result = await db.transaction(async (client) => {
                // Actualizar usuario
                if (email || first_name || last_name || phone) {
                    await client.query(
                        `UPDATE users 
                         SET email = COALESCE($1, email),
                             first_name = COALESCE($2, first_name),
                             last_name = COALESCE($3, last_name),
                             phone = COALESCE($4, phone),
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = $5`,
                        [email?.toLowerCase()?.trim(), first_name?.trim(), 
                         last_name?.trim(), phone, existing.rows[0].user_id]
                    );
                }

                // Actualizar cliente
                const clientResult = await client.query(
                    `UPDATE clients 
                     SET preferences = COALESCE($1, preferences),
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $2
                     RETURNING *`,
                    [preferences, id]
                );

                return clientResult.rows[0];
            });

            res.json({
                message: 'Cliente actualizado exitosamente',
                client: result
            });

        } catch (error) {
            next(error);
        }
    }

    // Eliminar cliente (soft delete)
    static async delete(req, res, next) {
        try {
            const { id } = req.params;

            const result = await db.query(
                `UPDATE clients SET deleted_at = CURRENT_TIMESTAMP 
                 WHERE id = $1 AND deleted_at IS NULL 
                 RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Cliente no encontrado'
                });
            }

            res.json({
                message: 'Cliente eliminado exitosamente'
            });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = ClientController;