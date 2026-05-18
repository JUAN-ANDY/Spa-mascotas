const db = require('../config/db');

class Service {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.base_duration_minutes = data.base_duration_minutes;
        this.base_price = data.base_price;
        this.allows_overlap = data.allows_overlap;
        this.is_active = data.is_active;
        this.deleted_at = data.deleted_at;
    }

    // Crear servicio
    static async create(serviceData) {
        const { name, description, base_duration_minutes, base_price, allows_overlap } = serviceData;

        const result = await db.query(
            `INSERT INTO services (name, description, base_duration_minutes, base_price, allows_overlap)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name.trim(), description, base_duration_minutes, base_price, allows_overlap || false]
        );

        return new Service(result.rows[0]);
    }

    // Buscar por ID
    static async findById(id) {
        const result = await db.query(
            'SELECT * FROM services WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        return result.rows.length > 0 ? new Service(result.rows[0]) : null;
    }

    // Obtener todos los servicios
    static async findAll({ include_inactive = false } = {}) {
        let query = 'SELECT * FROM services WHERE deleted_at IS NULL';
        
        if (!include_inactive) {
            query += ' AND is_active = true';
        }
        
        query += ' ORDER BY name';
        
        const result = await db.query(query);
        return result.rows.map(service => new Service(service));
    }

    // Actualizar servicio
    async update(updateData) {
        const allowedFields = [
            'name', 'description', 'base_duration_minutes', 
            'base_price', 'allows_overlap', 'is_active'
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

        params.push(this.id);
        const query = `UPDATE services SET ${updates.join(', ')} WHERE id = $${paramCount} AND deleted_at IS NULL RETURNING *`;
        const result = await db.query(query, params);

        if (result.rows.length > 0) {
            Object.assign(this, result.rows[0]);
        }

        return this;
    }

    // Soft delete
    async delete() {
        const result = await db.query(
            `UPDATE services 
             SET deleted_at = CURRENT_TIMESTAMP, is_active = false 
             WHERE id = $1 AND deleted_at IS NULL 
             RETURNING *`,
            [this.id]
        );

        if (result.rows.length > 0) {
            this.deleted_at = result.rows[0].deleted_at;
            this.is_active = false;
            return true;
        }
        return false;
    }

    // Activar/desactivar servicio
    async toggleActive() {
        const newStatus = !this.is_active;
        const result = await db.query(
            'UPDATE services SET is_active = $1 WHERE id = $2 RETURNING *',
            [newStatus, this.id]
        );

        if (result.rows.length > 0) {
            this.is_active = newStatus;
            return true;
        }
        return false;
    }

    // Calcular precio final (puede tener recargos según tamaño de mascota)
    calculatePrice(petSize = null) {
        let price = parseFloat(this.base_price);

        if (petSize) {
            const sizeMultipliers = {
                'Pequeño': 0.8,
                'Mediano': 1.0,
                'Grande': 1.3,
                'Gigante': 1.6
            };

            if (sizeMultipliers[petSize]) {
                price *= sizeMultipliers[petSize];
            }
        }

        return Math.round(price * 100) / 100;
    }

    // Calcular hora de finalización
    calculateEndTime(startTime) {
        const start = new Date(startTime);
        const end = new Date(start.getTime() + this.base_duration_minutes * 60000);
        return end;
    }

    // Obtener estadísticas del servicio
    async getStats() {
        const result = await db.query(
            `SELECT 
                COUNT(*) as total_appointments,
                AVG(sr.rating) as avg_rating,
                AVG(sr.nps_score) as avg_nps
             FROM appointments a
             LEFT JOIN service_reviews sr ON a.id = sr.appointment_id
             WHERE a.service_id = $1 AND a.status = 'Completada'`,
            [this.id]
        );
        return result.rows[0];
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            base_duration_minutes: this.base_duration_minutes,
            base_price: this.base_price,
            allows_overlap: this.allows_overlap,
            is_active: this.is_active
        };
    }
}

module.exports = Service;