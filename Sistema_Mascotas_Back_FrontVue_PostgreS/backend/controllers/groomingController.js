const db = require('../config/db');
const helpers = require('../utils/helpers');

class GroomingController {
    // Crear registro de grooming
    static async createRecord(req, res, next) {
        try {
            const { 
                appointment_id, knots_present, fleas_present, wounds_present,
                temperament_observed, chk_bath, chk_cut, chk_nails, chk_ears,
                chk_glands, chk_perfume, observations, recommendations, materials
            } = req.body;

            const result = await db.transaction(async (client) => {
                // Actualizar estado de la cita
                await client.query(
                    `UPDATE appointments 
                     SET status = 'Completada', updated_by = $1, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $2`,
                    [req.user.id, appointment_id]
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

            res.status(201).json({
                message: 'Registro de grooming creado exitosamente',
                record: result
            });

        } catch (error) {
            next(error);
        }
    }

    // Obtener registro por ID de cita
    static async getByAppointment(req, res, next) {
        try {
            const { appointmentId } = req.params;

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

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Registro de grooming no encontrado'
                });
            }

            // Obtener fotos
            const photos = await db.query(
                `SELECT * FROM photos WHERE record_id = $1 ORDER BY uploaded_at`,
                [result.rows[0].id]
            );

            res.json({
                record: result.rows[0],
                photos: photos.rows
            });

        } catch (error) {
            next(error);
        }
    }

    // Subir foto
    static async uploadPhoto(req, res, next) {
        try {
            const { record_id, photo_url, photo_type } = req.body;

            const result = await db.query(
                `INSERT INTO photos (record_id, photo_url, photo_type)
                 VALUES ($1, $2, $3)
                 RETURNING *`,
                [record_id, photo_url, photo_type]
            );

            res.status(201).json({
                message: 'Foto subida exitosamente',
                photo: result.rows[0]
            });

        } catch (error) {
            next(error);
        }
    }

    // Crear reseña
    static async createReview(req, res, next) {
        try {
            const { appointment_id, rating, nps_score, comments } = req.body;

            const result = await db.query(
                `INSERT INTO service_reviews (appointment_id, client_id, rating, nps_score, comments)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [appointment_id, req.user.id, rating, nps_score, comments]
            );

            res.status(201).json({
                message: 'Reseña creada exitosamente',
                review: result.rows[0]
            });

        } catch (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    error: 'Conflicto',
                    message: 'Ya existe una reseña para esta cita'
                });
            }
            next(error);
        }
    }
}

module.exports = GroomingController;