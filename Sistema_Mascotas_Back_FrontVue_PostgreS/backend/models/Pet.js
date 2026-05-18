const db = require('../config/db');

class Pet {
    constructor(data) {
        this.id = data.id;
        this.client_id = data.client_id;
        this.name = data.name;
        this.species = data.species;
        this.breed = data.breed;
        this.size = data.size;
        this.temperament = data.temperament;
        this.allergies = data.allergies;
        this.restrictions = data.restrictions;
        this.vaccines_up_to_date = data.vaccines_up_to_date;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.deleted_at = data.deleted_at;
        
        // Datos del dueño
        this.owner_name = data.owner_first_name && data.owner_last_name ? 
            `${data.owner_first_name} ${data.owner_last_name}` : null;
        this.owner_email = data.owner_email;
        this.owner_phone = data.owner_phone;
    }

    // Crear mascota
    static async create(petData) {
        const { 
            client_id, name, species, breed, size, 
            temperament, allergies, restrictions, vaccines_up_to_date 
        } = petData;

        const result = await db.query(
            `INSERT INTO pets (client_id, name, species, breed, size, temperament, allergies, restrictions, vaccines_up_to_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [client_id, name.trim(), species.trim(), breed?.trim(), size, 
             temperament, allergies, restrictions, vaccines_up_to_date || false]
        );

        return new Pet(result.rows[0]);
    }

    // Buscar por ID
    static async findById(id) {
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
        return result.rows.length > 0 ? new Pet(result.rows[0]) : null;
    }

    // Obtener todas las mascotas
    static async findAll({ search, client_id, species, size, page = 1, limit = 10 } = {}) {
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
            const searchCondition = ` AND (p.name ILIKE $${paramCount} OR p.breed ILIKE $${paramCount})`;
            query += searchCondition;
            countQuery += searchCondition;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (client_id) {
            const clientCondition = ` AND p.client_id = $${paramCount}`;
            query += clientCondition;
            countQuery += clientCondition;
            params.push(client_id);
            paramCount++;
        }

        if (species) {
            const speciesCondition = ` AND p.species = $${paramCount}`;
            query += speciesCondition;
            countQuery += speciesCondition;
            params.push(species);
            paramCount++;
        }

        if (size) {
            const sizeCondition = ` AND p.size = $${paramCount}`;
            query += sizeCondition;
            countQuery += sizeCondition;
            params.push(size);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        const offset = (page - 1) * limit;
        query += ` ORDER BY p.name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        return {
            pets: result.rows.map(pet => new Pet(pet)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // Obtener mascotas por cliente
    static async findByClientId(clientId) {
        const result = await db.query(
            `SELECT * FROM pets 
             WHERE client_id = $1 AND deleted_at IS NULL 
             ORDER BY name`,
            [clientId]
        );
        return result.rows.map(pet => new Pet(pet));
    }

    // Actualizar mascota
    async update(updateData) {
        const allowedFields = [
            'name', 'species', 'breed', 'size', 'temperament',
            'allergies', 'restrictions', 'vaccines_up_to_date'
        ];
        
        const updates = [];
        const params = [];
        let paramCount = 1;

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = $${paramCount}`);
                params.push(updateData[field]);
                paramCount++;
            }
        }

        if (updates.length === 0) return this;

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(this.id);

        const query = `UPDATE pets SET ${updates.join(', ')} WHERE id = $${paramCount} AND deleted_at IS NULL RETURNING *`;
        const result = await db.query(query, params);

        if (result.rows.length > 0) {
            Object.assign(this, result.rows[0]);
        }

        return this;
    }

    // Soft delete
    async delete() {
        const result = await db.query(
            `UPDATE pets SET deleted_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
            [this.id]
        );

        if (result.rows.length > 0) {
            this.deleted_at = result.rows[0].deleted_at;
            return true;
        }
        return false;
    }

    // Obtener historial de grooming
    async getGroomingHistory(limit = 10) {
        const result = await db.query(
            `SELECT gr.*, a.scheduled_start, a.scheduled_end, s.name as service_name
             FROM grooming_records gr
             JOIN appointments a ON gr.appointment_id = a.id
             JOIN services s ON a.service_id = s.id
             WHERE a.pet_id = $1
             ORDER BY a.scheduled_start DESC
             LIMIT $2`,
            [this.id, limit]
        );
        return result.rows;
    }

    // Actualizar vacunas
    async updateVaccines(status) {
        const result = await db.query(
            `UPDATE pets 
             SET vaccines_up_to_date = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 RETURNING *`,
            [status, this.id]
        );

        if (result.rows.length > 0) {
            this.vaccines_up_to_date = status;
            this.updated_at = result.rows[0].updated_at;
        }

        return this;
    }

    toJSON() {
        return {
            id: this.id,
            client_id: this.client_id,
            name: this.name,
            species: this.species,
            breed: this.breed,
            size: this.size,
            temperament: this.temperament,
            allergies: this.allergies,
            restrictions: this.restrictions,
            vaccines_up_to_date: this.vaccines_up_to_date,
            owner_name: this.owner_name,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Pet;