const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

/**
 * GET /api/auditoria
 * Obtener registros de auditoría con filtros y paginación
 * Solo accesible para Administradores
 */
router.get('/', auth.verifyToken, auth.authorize('Administrador'), async (req, res) => {
    try {
        const { 
            search, 
            modulo, 
            accion, 
            usuario_id,
            fecha_desde,
            fecha_hasta,
            page: p = 1, 
            limit: l = 20 
        } = req.query;
        
        const page = parseInt(p);
        const limit = parseInt(l);
        const offset = (page - 1) * limit;
        const params = [];
        let paramCount = 1;

        let query = `
            SELECT a.*, 
                   u.first_name || ' ' || u.last_name as usuario_nombre,
                   u.email as usuario_email,
                   u.role as usuario_rol
            FROM auditoria a
            LEFT JOIN users u ON a.usuario_id = u.id
            WHERE 1=1`;
        
        let countQuery = 'SELECT COUNT(*) FROM auditoria WHERE 1=1';

        // Filtro por módulo
        if (modulo) {
            query += ` AND a.modulo = $${paramCount}`;
            countQuery += ` AND modulo = $${paramCount}`;
            params.push(modulo);
            paramCount++;
        }

        // Filtro por acción
        if (accion) {
            query += ` AND a.accion = $${paramCount}`;
            countQuery += ` AND accion = $${paramCount}`;
            params.push(accion);
            paramCount++;
        }

        // Filtro por usuario
        if (usuario_id) {
            query += ` AND a.usuario_id = $${paramCount}`;
            countQuery += ` AND usuario_id = $${paramCount}`;
            params.push(usuario_id);
            paramCount++;
        }

        // Filtro por fecha desde
        if (fecha_desde) {
            query += ` AND a.fecha_hora >= $${paramCount}`;
            countQuery += ` AND fecha_hora >= $${paramCount}`;
            params.push(fecha_desde);
            paramCount++;
        }

        // Filtro por fecha hasta
        if (fecha_hasta) {
            query += ` AND a.fecha_hora <= $${paramCount}`;
            countQuery += ` AND fecha_hora <= $${paramCount}`;
            params.push(fecha_hasta + ' 23:59:59');
            paramCount++;
        }

        // Búsqueda por texto
        if (search) {
            query += ` AND (a.modulo ILIKE $${paramCount} OR a.accion ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
            countQuery += ` AND (a.modulo ILIKE $${paramCount} OR a.accion ILIKE $${paramCount} OR EXISTS (SELECT 1 FROM users u WHERE a.usuario_id = u.id AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})))`;
            params.push(`%${search}%`);
            paramCount++;
        }

        // Obtener total
        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Ordenar y paginar
        query += ` ORDER BY a.fecha_hora DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Obtener lista de módulos únicos para filtros
        const modulosResult = await db.query(
            'SELECT DISTINCT modulo FROM auditoria ORDER BY modulo'
        );

        res.json({
            data: result.rows,
            modulos: modulosResult.rows.map(m => m.modulo),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo auditoría:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

/**
 * GET /api/auditoria/stats
 * Obtener estadísticas de auditoría
 */
router.get('/stats', auth.verifyToken, auth.authorize('Administrador'), async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total_registros,
                COUNT(DISTINCT usuario_id) as total_usuarios,
                COUNT(DISTINCT modulo) as total_modulos,
                MIN(fecha_hora) as primer_registro,
                MAX(fecha_hora) as ultimo_registro,
                (SELECT modulo FROM auditoria GROUP BY modulo ORDER BY COUNT(*) DESC LIMIT 1) as modulo_mas_activo,
                (SELECT accion FROM auditoria GROUP BY accion ORDER BY COUNT(*) DESC LIMIT 1) as accion_mas_frecuente
            FROM auditoria
        `);

        const accionesHoy = await db.query(`
            SELECT COUNT(*) as total
            FROM auditoria 
            WHERE DATE(fecha_hora) = CURRENT_DATE
        `);

        const topUsuarios = await db.query(`
            SELECT u.first_name || ' ' || u.last_name as nombre, u.email, COUNT(*) as total
            FROM auditoria a
            JOIN users u ON a.usuario_id = u.id
            GROUP BY u.id, u.first_name, u.last_name, u.email
            ORDER BY total DESC
            LIMIT 5
        `);

        res.json({
            stats: {
                ...stats.rows[0],
                acciones_hoy: parseInt(accionesHoy.rows[0].total)
            },
            topUsuarios: topUsuarios.rows
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;