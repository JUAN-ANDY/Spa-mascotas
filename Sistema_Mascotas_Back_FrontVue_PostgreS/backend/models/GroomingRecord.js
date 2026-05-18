const db = require('../config/db');

class GroomingRecord {
    constructor(data) {
        this.id = data.id;
        this.appointment_id = data.appointment_id;
        this.knots_present = data.knots_present;
        this.fleas_present = data.fleas_present;
        this.wounds_present = data.wounds_present;
        this.temperament_observed = data.temperament_observed;
        this.chk_bath = data.chk_bath;
        this.chk_cut = data.chk_cut;
        this.chk_nails = data.chk_nails;
        this.chk_ears = data.chk_ears;
        this.chk_glands = data.chk_glands;
        this.chk_perfume = data.chk_perfume;
        this.observations = data.observations;
        this.recommendations = data.recommendations;
        this.created_at = data.created_at;

        // Datos relacionados
        this.materials = data.materials || [];
        this.photos = data.photos || [];
    }

    // Crear registro de grooming
    static async create(recordData) {
        const {
            appointment_id, knots_present, fleas_present, wounds_present,
            temperament_observed, chk_bath, chk_cut, chk_nails, chk_ears,
            chk_glands, chk_perfume, observations, recommendations, materials
        } = recordData;

        const result = await db.transaction(async (client) => {
            // Actualizar estado de la cita
            await client.query(
                `UPDATE appointments 
                 SET status = 'Completada', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [appointment_id]
            );

            // Crear registro
            const recordResult = await client.query(
                `INSERT INTO grooming_records 
                 (appointment_id, knots_present, fleas_present, wounds_present,
                  temperament_observed, chk_bath, chk_cut, chk_nails, chk_ears,
                  chk_glands, chk_perfume, observations, recommendations)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 RETURNING *`,
                [appointment_id, knots_present, fleas_present, wounds_present,
                 temperament_observed, chk_bath, chk_cut, chk_nails, chk_ears,
                 chk_glands, chk_perfume, observations, recommendations]
            );

            const record = recordResult.rows[0];

            // Registrar materiales usados
            if (materials && materials.length > 0) {
                for (const material of materials) {
                    await client.query(
                        `INSERT INTO grooming_materials_used (record_id, variant_id, quantity_used)
                         VALUES ($1, $2, $3)`,
                        [record.id, material.variant_id, material.quantity_used]
                    );
                }
            }

            return record;
        });

        return new GroomingRecord(result);
    }

    // Buscar por ID
    static async findById(id) {
        const result = await db.query(
            `SELECT * FROM grooming_records WHERE id = $1`,
            [id]
        );
        return result.rows.length > 0 ? new GroomingRecord(result.rows[0]) : null;
    }

    // Buscar por ID de cita
    static async findByAppointmentId(appointmentId) {
        const result = await db.query(
            `SELECT gr.*, 
                    json_agg(json_build_object(
                        'id', gmu.id,
                        'variant_id', gmu.variant_id,
                        'variant_name', pv.variant_name,
                        'product_name', p.name,
                        'quantity_used', gmu.quantity_used
                    )) FILTER (WHERE gmu.id IS NOT NULL) as materials
             FROM grooming_records gr
             LEFT JOIN grooming_materials_used gmu ON gr.id = gmu.record_id
             LEFT JOIN product_variants pv ON gmu.variant_id = pv.id
             LEFT JOIN products p ON pv.product_id = p.id
             WHERE gr.appointment_id = $1
             GROUP BY gr.id`,
            [appointmentId]
        );

        if (result.rows.length === 0) return null;

        // Obtener fotos
        const photos = await db.query(
            `SELECT * FROM photos WHERE record_id = $1 ORDER BY uploaded_at`,
            [result.rows[0].id]
        );

        const record = result.rows[0];
        record.photos = photos.rows;

        return new GroomingRecord(record);
    }

    // Agregar foto
    async addPhoto(photo_url, photo_type) {
        const result = await db.query(
            `INSERT INTO photos (record_id, photo_url, photo_type)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [this.id, photo_url, photo_type || 'Despues']
        );

        if (!this.photos) this.photos = [];
        this.photos.push(result.rows[0]);
        return result.rows[0];
    }

    // Obtener fotos
    async getPhotos() {
        const result = await db.query(
            `SELECT * FROM photos WHERE record_id = $1 ORDER BY uploaded_at`,
            [this.id]
        );
        this.photos = result.rows;
        return this.photos;
    }

    // Obtener materiales usados
    async getMaterials() {
        const result = await db.query(
            `SELECT gmu.*, pv.variant_name, pv.sku, p.name as product_name
             FROM grooming_materials_used gmu
             JOIN product_variants pv ON gmu.variant_id = pv.id
             JOIN products p ON pv.product_id = p.id
             WHERE gmu.record_id = $1`,
            [this.id]
        );
        this.materials = result.rows;
        return this.materials;
    }

    // Obtener resumen del servicio
    getSummary() {
        const services = [];
        if (this.chk_bath) services.push('Baño');
        if (this.chk_cut) services.push('Corte');
        if (this.chk_nails) services.push('Uñas');
        if (this.chk_ears) services.push('Oídos');
        if (this.chk_glands) services.push('Glándulas');
        if (this.chk_perfume) services.push('Perfume');

        return {
            services_performed: services,
            has_issues: this.knots_present || this.fleas_present || this.wounds_present,
            issues: {
                knots: this.knots_present,
                fleas: this.fleas_present,
                wounds: this.wounds_present
            },
            temperament: this.temperament_observed,
            observations: this.observations,
            recommendations: this.recommendations
        };
    }

    // Obtener estadísticas de materiales
    async getMaterialStats() {
        const result = await db.query(
            `SELECT 
                COUNT(DISTINCT gmu.variant_id) as unique_materials,
                SUM(gmu.quantity_used) as total_quantity,
                p.name as most_used_product
             FROM grooming_materials_used gmu
             JOIN product_variants pv ON gmu.variant_id = pv.id
             JOIN products p ON pv.product_id = p.id
             WHERE gmu.record_id = $1
             GROUP BY p.name
             ORDER BY SUM(gmu.quantity_used) DESC
             LIMIT 1`,
            [this.id]
        );
        return result.rows[0] || null;
    }

    toJSON() {
        return {
            id: this.id,
            appointment_id: this.appointment_id,
            knots_present: this.knots_present,
            fleas_present: this.fleas_present,
            wounds_present: this.wounds_present,
            temperament_observed: this.temperament_observed,
            services_performed: {
                bath: this.chk_bath,
                cut: this.chk_cut,
                nails: this.chk_nails,
                ears: this.chk_ears,
                glands: this.chk_glands,
                perfume: this.chk_perfume
            },
            observations: this.observations,
            recommendations: this.recommendations,
            materials: this.materials,
            photos: this.photos,
            created_at: this.created_at
        };
    }
}

module.exports = GroomingRecord;