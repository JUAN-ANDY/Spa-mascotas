const db = require('../config/db');

class Client {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.preferences = data.preferences;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.deleted_at = data.deleted_at;
        
        // Datos del usuario relacionados
        this.email = data.email;
        this.first_name = data.first_name;
        this.last_name = data.last_name;
        this.phone = data.phone;
        this.is_active = data.is_active;
    }

    // Crear cliente con usuario
    static async create(clientData) {
        const { email, first_name, last_name, phone, preferences, password } = clientData;

        const result = await db.transaction(async (client) => {
            // Crear usuario primero
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(12);
            const tempPassword = password || 'Temp123!'; // Contraseña temporal si no se proporciona
            const password_hash = await bcrypt.hash(tempPassword, salt);

            const userResult = await client.query(
                `INSERT INTO users (role, email, password_hash, first_name, last_name, phone)
                 VALUES ('Cliente', $1, $2, $3, $4, $5)
                 RETURNING id`,
                [email?.toLowerCase()?.trim(), password_hash, first_name?.trim(), last_name?.trim(), phone]
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

        return new Client(result);
    }

    // Buscar por ID
    static async findById(id) {
        const result = await db.query(
            `SELECT c.*, u.email, u.first_name, u.last_name, u.phone, u.is_active
             FROM clients c
             LEFT JOIN users u ON c.user_id = u.id
             WHERE c.id = $1 AND c.deleted_at IS NULL`,
            [id]
        );
        return result.rows.length > 0 ? new Client(result.rows[0]) : null;
    }

    // Buscar por ID de usuario
    static async findByUserId(userId) {
        const result = await db.query(
            `SELECT c.*, u.email, u.first_name, u.last_name, u.phone, u.is_active
             FROM clients c
             LEFT JOIN users u ON c.user_id = u.id
             WHERE c.user_id = $1 AND c.deleted_at IS NULL`,
            [userId]
        );
        return result.rows.length > 0 ? new Client(result.rows[0]) : null;
    }

    // Obtener todos los clientes
    static async findAll({ search, page = 1, limit = 10 } = {}) {
        let query = `
            SELECT c.*, u.email, u.first_name, u.last_name, u.phone, u.is_active
            FROM clients c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.deleted_at IS NULL`;
        
        let countQuery = 'SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL';
        const params = [];
        let paramCount = 1;

        if (search) {
            const searchCondition = ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.phone ILIKE $${paramCount})`;
            query += searchCondition;
            countQuery += ` AND (EXISTS (SELECT 1 FROM users u WHERE clients.user_id = u.id AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.phone ILIKE $${paramCount})))`;
            params.push(`%${search}%`);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        const offset = (page - 1) * limit;
        query += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        return {
            clients: result.rows.map(client => new Client(client)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // Actualizar cliente
    async update(updateData) {
        const { email, first_name, last_name, phone, preferences } = updateData;

        const result = await db.transaction(async (client) => {
            // Actualizar usuario
            if (email || first_name || last_name || phone) {
                const userUpdates = [];
                const userParams = [];
                let paramCount = 1;

                if (email) {
                    userUpdates.push(`email = $${paramCount}`);
                    userParams.push(email.toLowerCase().trim());
                    paramCount++;
                }
                if (first_name) {
                    userUpdates.push(`first_name = $${paramCount}`);
                    userParams.push(first_name.trim());
                    paramCount++;
                }
                if (last_name) {
                    userUpdates.push(`last_name = $${paramCount}`);
                    userParams.push(last_name.trim());
                    paramCount++;
                }
                if (phone) {
                    userUpdates.push(`phone = $${paramCount}`);
                    userParams.push(phone);
                    paramCount++;
                }

                if (userUpdates.length > 0) {
                    userUpdates.push(`updated_at = CURRENT_TIMESTAMP`);
                    userParams.push(this.user_id);
                    await client.query(
                        `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${paramCount}`,
                        userParams
                    );
                }
            }

            // Actualizar cliente
            const clientResult = await client.query(
                `UPDATE clients 
                 SET preferences = COALESCE($1, preferences),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 AND deleted_at IS NULL
                 RETURNING *`,
                [preferences, this.id]
            );

            return clientResult.rows[0];
        });

        if (result) {
            Object.assign(this, result);
        }

        return this;
    }

    // Soft delete
    async delete() {
        const result = await db.query(
            `UPDATE clients SET deleted_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
            [this.id]
        );

        if (result.rows.length > 0) {
            this.deleted_at = result.rows[0].deleted_at;
            return true;
        }
        return false;
    }

    // Obtener mascotas del cliente
    async getPets() {
        const result = await db.query(
            `SELECT * FROM pets 
             WHERE client_id = $1 AND deleted_at IS NULL 
             ORDER BY name`,
            [this.id]
        );
        return result.rows;
    }

    // Obtener historial de citas
    async getAppointmentHistory(limit = 10) {
        const result = await db.query(
            `SELECT a.*, s.name as service_name, p.name as pet_name,
                    g.first_name || ' ' || g.last_name as groomer_name
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             JOIN pets p ON a.pet_id = p.id
             JOIN users g ON a.groomer_id = g.id
             WHERE a.client_id = $1
             ORDER BY a.scheduled_start DESC
             LIMIT $2`,
            [this.id, limit]
        );
        return result.rows;
    }

    // Obtener órdenes del cliente
    async getOrders(limit = 10) {
        const result = await db.query(
            `SELECT o.*, b.name as branch_name
             FROM orders o
             JOIN branches b ON o.branch_id = b.id
             WHERE o.client_id = $1
             ORDER BY o.created_at DESC
             LIMIT $2`,
            [this.id, limit]
        );
        return result.rows;
    }

    toJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            email: this.email,
            first_name: this.first_name,
            last_name: this.last_name,
            phone: this.phone,
            preferences: this.preferences,
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Client;