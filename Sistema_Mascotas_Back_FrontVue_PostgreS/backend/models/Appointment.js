const db = require('../config/db');

class Appointment {
    constructor(data) {
        this.id = data.id;
        this.branch_id = data.branch_id;
        this.client_id = data.client_id;
        this.pet_id = data.pet_id;
        this.groomer_id = data.groomer_id;
        this.service_id = data.service_id;
        this.created_by = data.created_by;
        this.updated_by = data.updated_by;
        this.scheduled_start = data.scheduled_start;
        this.scheduled_end = data.scheduled_end;
        this.actual_duration_minutes = data.actual_duration_minutes;
        this.status = data.status;
        this.total_price = data.total_price;
        this.whatsapp_link_generated = data.whatsapp_link_generated;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;

        // Datos relacionados
        this.branch_name = data.branch_name;
        this.client_name = data.client_name;
        this.pet_name = data.pet_name;
        this.groomer_name = data.groomer_name;
        this.service_name = data.service_name;
    }

    // Crear cita
    static async create(appointmentData) {
        const {
            branch_id, client_id, pet_id, groomer_id, service_id,
            scheduled_start, total_price, created_by
        } = appointmentData;

        // Validar capacidad del groomer
        const service = await db.query(
            'SELECT base_duration_minutes FROM services WHERE id = $1',
            [service_id]
        );

        if (service.rows.length === 0) {
            throw new Error('Servicio no encontrado');
        }

        const duration = service.rows[0].base_duration_minutes;
        const startTime = new Date(scheduled_start);
        const endTime = new Date(startTime.getTime() + duration * 60000);

        // Verificar disponibilidad
        const hasCapacity = await db.query(
            'SELECT check_groomer_capacity($1, $2, $3) as available',
            [groomer_id, startTime.toISOString(), endTime.toISOString()]
        );

        if (!hasCapacity.rows[0].available) {
            throw new Error('El groomer no tiene disponibilidad en este horario');
        }

        const result = await db.query(
            `INSERT INTO appointments 
             (branch_id, client_id, pet_id, groomer_id, service_id, created_by,
              scheduled_start, scheduled_end, total_price, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pendiente')
             RETURNING *`,
            [branch_id, client_id, pet_id, groomer_id, service_id, created_by,
             startTime.toISOString(), endTime.toISOString(), total_price]
        );

        return new Appointment(result.rows[0]);
    }

    // Buscar por ID
    static async findById(id) {
        const result = await db.query(
            `SELECT a.*, 
                    b.name as branch_name,
                    u.first_name || ' ' || u.last_name as client_name,
                    p.name as pet_name,
                    g.first_name || ' ' || g.last_name as groomer_name,
                    s.name as service_name
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
        return result.rows.length > 0 ? new Appointment(result.rows[0]) : null;
    }

    // Obtener todas las citas
    static async findAll({ status, date, groomer_id, client_id, branch_id, page = 1, limit = 10 } = {}) {
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

        if (groomer_id) {
            const groomerCondition = ` AND a.groomer_id = $${paramCount}`;
            query += groomerCondition;
            countQuery += groomerCondition;
            params.push(groomer_id);
            paramCount++;
        }

        if (client_id) {
            const clientCondition = ` AND a.client_id = $${paramCount}`;
            query += clientCondition;
            countQuery += clientCondition;
            params.push(client_id);
            paramCount++;
        }

        if (branch_id) {
            const branchCondition = ` AND a.branch_id = $${paramCount}`;
            query += branchCondition;
            countQuery += branchCondition;
            params.push(branch_id);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        const offset = (page - 1) * limit;
        query += ` ORDER BY a.scheduled_start DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        return {
            appointments: result.rows.map(appointment => new Appointment(appointment)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // Obtener citas del día
    static async findToday(branch_id = null) {
        let query = `
            SELECT a.*, 
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
            WHERE DATE(a.scheduled_start) = CURRENT_DATE`;
        
        const params = [];

        if (branch_id) {
            query += ' AND a.branch_id = $1';
            params.push(branch_id);
        }

        query += ' ORDER BY a.scheduled_start';
        const result = await db.query(query, params);
        return result.rows.map(appointment => new Appointment(appointment));
    }

    // Actualizar cita
    async update(updateData) {
        const allowedFields = [
            'groomer_id', 'status', 'actual_duration_minutes', 
            'total_price', 'scheduled_start', 'updated_by'
        ];
        
        const updates = [];
        const params = [];
        let paramCount = 1;

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                if (field === 'scheduled_start') {
                    updates.push(`scheduled_start = $${paramCount}`);
                    params.push(new Date(updateData[field]).toISOString());
                    paramCount++;

                    // Calcular nuevo end time
                    const service = await db.query(
                        'SELECT base_duration_minutes FROM services WHERE id = $1',
                        [this.service_id]
                    );
                    const duration = updateData.actual_duration_minutes || service.rows[0].base_duration_minutes;
                    const endTime = new Date(new Date(updateData[field]).getTime() + duration * 60000);
                    updates.push(`scheduled_end = $${paramCount}`);
                    params.push(endTime.toISOString());
                    paramCount++;
                } else {
                    updates.push(`${field} = $${paramCount}`);
                    params.push(updateData[field]);
                    paramCount++;
                }
            }
        }

        if (updates.length === 0) return this;

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(this.id);

        const query = `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await db.query(query, params);

        if (result.rows.length > 0) {
            Object.assign(this, result.rows[0]);
        }

        return this;
    }

    // Cancelar cita
    async cancel(updated_by) {
        const result = await db.query(
            `UPDATE appointments 
             SET status = 'Cancelada', updated_at = CURRENT_TIMESTAMP, updated_by = $1
             WHERE id = $2 AND status NOT IN ('Completada', 'Cancelada')
             RETURNING *`,
            [updated_by, this.id]
        );

        if (result.rows.length === 0) {
            throw new Error('La cita no se puede cancelar');
        }

        Object.assign(this, result.rows[0]);
        return this;
    }

    // Marcar como completada
    async complete(actual_duration_minutes, updated_by) {
        const result = await db.query(
            `UPDATE appointments 
             SET status = 'Completada', actual_duration_minutes = $1, 
                 updated_at = CURRENT_TIMESTAMP, updated_by = $2
             WHERE id = $3 AND status = 'En_Proceso'
             RETURNING *`,
            [actual_duration_minutes, updated_by, this.id]
        );

        if (result.rows.length > 0) {
            Object.assign(this, result.rows[0]);
        }

        return this;
    }

    // Obtener registro de grooming
    async getGroomingRecord() {
        const result = await db.query(
            'SELECT * FROM grooming_records WHERE appointment_id = $1',
            [this.id]
        );
        return result.rows[0] || null;
    }

    toJSON() {
        return {
            ...this,
            scheduled_start: this.scheduled_start,
            scheduled_end: this.scheduled_end,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Appointment;