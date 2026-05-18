const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ============================================
// POST /api/grooming/records
// Crear registro de grooming
// ============================================
router.post('/records', auth.verifyToken, async (req, res) => {
    try {
        const {
            appointment_id, knots_present, fleas_present, wounds_present,
            temperament_observed, chk_bath, chk_cut, chk_nails, chk_ears,
            chk_glands, chk_perfume, observations, recommendations,
            actual_duration
        } = req.body;

        // Validar campos requeridos
        if (!appointment_id) {
            return res.status(400).json({ message: 'ID de cita requerido' });
        }

        console.log('📝 Creando registro de grooming para cita:', appointment_id);

        // Verificar que la cita existe
        const appointmentCheck = await db.query(
            "SELECT id, status FROM appointments WHERE id = $1",
            [appointment_id]
        );

        if (appointmentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        // Verificar si ya existe un registro para esta cita
        const existingRecord = await db.query(
            'SELECT id FROM grooming_records WHERE appointment_id = $1',
            [appointment_id]
        );

        if (existingRecord.rows.length > 0) {
            return res.status(409).json({ 
                message: 'Ya existe un registro de grooming para esta cita' 
            });
        }

        // Actualizar estado de la cita a Completada
        await db.query(
            `UPDATE appointments 
             SET status = 'Completada', 
                 actual_duration_minutes = COALESCE($1, actual_duration_minutes),
                 updated_at = CURRENT_TIMESTAMP, 
                 updated_by = $2
             WHERE id = $3`,
            [actual_duration || null, req.user.id, appointment_id]
        );

        // Crear registro de grooming
        const result = await db.query(
            `INSERT INTO grooming_records 
             (appointment_id, knots_present, fleas_present, wounds_present,
              temperament_observed, chk_bath, chk_cut, chk_nails, chk_ears,
              chk_glands, chk_perfume, observations, recommendations)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [
                appointment_id,
                knots_present || false,
                fleas_present || false,
                wounds_present || false,
                temperament_observed || null,
                chk_bath || false,
                chk_cut || false,
                chk_nails || false,
                chk_ears || false,
                chk_glands || false,
                chk_perfume || false,
                observations || null,
                recommendations || null
            ]
        );

        const record = result.rows[0];
        console.log('✅ Registro de grooming creado:', record.id);

        res.status(201).json({
            message: 'Registro de grooming creado exitosamente',
            record: record
        });

    } catch (error) {
        console.error('❌ Error creando registro de grooming:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// GET /api/grooming/records/:appointmentId
// Obtener registro de grooming por ID de cita
// ============================================
router.get('/records/:appointmentId', auth.verifyToken, async (req, res) => {
    try {
        const { appointmentId } = req.params;

        console.log('🔍 Buscando registro para cita:', appointmentId);

        // Buscar el registro de grooming con datos relacionados
        const result = await db.query(
            `SELECT gr.*, 
                    a.pet_id, a.client_id, a.groomer_id, a.service_id,
                    a.scheduled_start, a.scheduled_end, a.status as appointment_status,
                    p.name as pet_name, p.species as pet_species, p.breed as pet_breed,
                    s.name as service_name,
                    u.first_name || ' ' || u.last_name as client_name
             FROM grooming_records gr
             JOIN appointments a ON gr.appointment_id = a.id
             JOIN pets p ON a.pet_id = p.id
             JOIN services s ON a.service_id = s.id
             JOIN clients c ON a.client_id = c.id
             JOIN users u ON c.user_id = u.id
             WHERE gr.appointment_id = $1`,
            [appointmentId]
        );

        // Si no hay registro, devolver arrays vacíos
        if (result.rows.length === 0) {
            return res.json({
                record: null,
                photos: [],
                materials: []
            });
        }

        const record = result.rows[0];

        // Obtener fotos del registro
        const photosResult = await db.query(
            `SELECT id, record_id, photo_url, photo_type, uploaded_at 
             FROM photos 
             WHERE record_id = $1 
             ORDER BY uploaded_at DESC`,
            [record.id]
        );

        // Obtener materiales usados
        const materialsResult = await db.query(
            `SELECT gmu.*, pv.variant_name, pv.sku, p.name as product_name
             FROM grooming_materials_used gmu
             JOIN product_variants pv ON gmu.variant_id = pv.id
             JOIN products p ON pv.product_id = p.id
             WHERE gmu.record_id = $1`,
            [record.id]
        );

        console.log(`✅ Registro ID: ${record.id} | Fotos: ${photosResult.rows.length} | Materiales: ${materialsResult.rows.length}`);

        res.json({
            record: record,
            photos: photosResult.rows,
            materials: materialsResult.rows
        });

    } catch (error) {
        console.error('❌ Error obteniendo registro:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// POST /api/grooming/photos
// Subir foto al registro de grooming
// Soporta Base64 y URLs
// ============================================
router.post('/photos', auth.verifyToken, async (req, res) => {
    try {
        const { record_id, photo_url, photo_type } = req.body;

        // Validar campos requeridos
        if (!record_id) {
            return res.status(400).json({ message: 'ID del registro requerido (record_id)' });
        }

        if (!photo_url || !photo_url.trim()) {
            return res.status(400).json({ message: 'URL de la foto requerida (photo_url)' });
        }

        // Validar tipo de foto
        const validTypes = ['Antes', 'Despues', 'Detalle'];
        const finalPhotoType = validTypes.includes(photo_type) ? photo_type : 'Despues';

        // Verificar tamaño de la imagen (máximo 10MB en Base64)
        if (photo_url.length > 15 * 1024 * 1024) {
            return res.status(400).json({ 
                message: 'La imagen es demasiado grande. Máximo 10MB permitido.' 
            });
        }

        console.log('📸 Subiendo foto:', { 
            record_id, 
            photo_type: finalPhotoType,
            size: (photo_url.length / 1024).toFixed(2) + ' KB'
        });

        // Verificar que el registro existe
        const recordCheck = await db.query(
            'SELECT id FROM grooming_records WHERE id = $1',
            [record_id]
        );

        if (recordCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Registro de grooming no encontrado' });
        }

        // Insertar la foto
        const result = await db.query(
            `INSERT INTO photos (record_id, photo_url, photo_type)
             VALUES ($1, $2, $3)
             RETURNING id, record_id, photo_type, uploaded_at`,
            [record_id, photo_url.trim(), finalPhotoType]
        );

        const photo = result.rows[0];
        console.log('✅ Foto subida exitosamente:', photo.id);

        res.status(201).json({
            message: 'Foto subida exitosamente',
            photo: {
                ...photo,
                photo_url: photo_url.trim() // Devolver la URL completa
            }
        });

    } catch (error) {
        console.error('❌ Error subiendo foto:', error);
        
        // Manejar errores específicos
        if (error.code === '23505') {
            return res.status(409).json({ message: 'La foto ya existe' });
        }
        
        res.status(500).json({ 
            message: 'Error interno del servidor al subir la foto',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// DELETE /api/grooming/photos/:photoId
// Eliminar una foto
// ============================================
router.delete('/photos/:photoId', auth.verifyToken, async (req, res) => {
    try {
        const { photoId } = req.params;

        console.log('🗑️ Eliminando foto:', photoId);

        // Verificar que la foto existe
        const photoCheck = await db.query(
            'SELECT id FROM photos WHERE id = $1',
            [photoId]
        );

        if (photoCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Foto no encontrada' });
        }

        // Eliminar la foto
        await db.query('DELETE FROM photos WHERE id = $1', [photoId]);

        console.log('✅ Foto eliminada:', photoId);
        res.json({ message: 'Foto eliminada exitosamente' });

    } catch (error) {
        console.error('❌ Error eliminando foto:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// POST /api/grooming/reviews
// Crear reseña de servicio
// ============================================
router.post('/reviews', auth.verifyToken, async (req, res) => {
    try {
        const { appointment_id, rating, nps_score, comments } = req.body;

        // Validar campos requeridos
        if (!appointment_id) {
            return res.status(400).json({ message: 'ID de cita requerido' });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating debe ser entre 1 y 5' });
        }

        // Validar NPS score
        if (nps_score && (nps_score < 0 || nps_score > 10)) {
            return res.status(400).json({ message: 'NPS Score debe ser entre 0 y 10' });
        }

        console.log('⭐ Creando reseña para cita:', appointment_id);

        // Verificar que la cita existe y está completada
        const apptCheck = await db.query(
            "SELECT id, status, client_id FROM appointments WHERE id = $1",
            [appointment_id]
        );

        if (apptCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        // Verificar que el usuario es el cliente de la cita o es admin
        const appointment = apptCheck.rows[0];
        if (appointment.client_id !== req.user.id && req.user.role !== 'Administrador') {
            return res.status(403).json({ message: 'Solo el cliente puede crear una reseña' });
        }

        // Insertar reseña
        const result = await db.query(
            `INSERT INTO service_reviews (appointment_id, client_id, rating, nps_score, comments)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [appointment_id, appointment.client_id, rating, nps_score || null, comments || null]
        );

        console.log('✅ Reseña creada:', result.rows[0].id);

        res.status(201).json({
            message: 'Reseña creada exitosamente',
            review: result.rows[0]
        });

    } catch (error) {
        // Manejar error de reseña duplicada
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Ya existe una reseña para esta cita' });
        }
        
        console.error('❌ Error creando reseña:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// GET /api/grooming/reviews/:appointmentId
// Obtener reseña de una cita
// ============================================
router.get('/reviews/:appointmentId', auth.verifyToken, async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const result = await db.query(
            `SELECT sr.*, 
                    u.first_name || ' ' || u.last_name as client_name
             FROM service_reviews sr
             JOIN clients c ON sr.client_id = c.id
             JOIN users u ON c.user_id = u.id
             WHERE sr.appointment_id = $1`,
            [appointmentId]
        );

        if (result.rows.length === 0) {
            return res.json({ review: null });
        }

        res.json({ review: result.rows[0] });

    } catch (error) {
        console.error('❌ Error obteniendo reseña:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================
// GET /api/grooming/stats
// Obtener estadísticas de grooming
// ============================================
router.get('/stats', auth.verifyToken, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT a.client_id) as total_clients,
                COUNT(DISTINCT a.pet_id) as total_pets,
                AVG(sr.rating)::numeric(10,2) as avg_rating,
                AVG(sr.nps_score)::numeric(10,2) as avg_nps
            FROM grooming_records gr
            JOIN appointments a ON gr.appointment_id = a.id
            LEFT JOIN service_reviews sr ON a.id = sr.appointment_id
        `);

        res.json({ stats: stats.rows[0] });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;