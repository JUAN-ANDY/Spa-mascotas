const db = require('../config/db');
const jwt = require('jsonwebtoken');

/**
 * Middleware de Auditoría
 * Registra automáticamente todas las acciones POST, PUT, DELETE
 * en la tabla 'auditoria' de la base de datos
 */
async function auditMiddleware(req, res, next) {
    // Solo auditar métodos que modifican datos
    const methodsToAudit = ['POST', 'PUT', 'DELETE'];
    
    if (!methodsToAudit.includes(req.method)) {
        return next();
    }

    // Capturar la respuesta original
    const originalJson = res.json.bind(res);
    
    res.json = async function(data) {
        // Solo auditar si la respuesta es exitosa (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                // Extraer información del usuario del token
                let userId = null;
                const authHeader = req.headers.authorization;
                
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    const token = authHeader.split(' ')[1];
                    try {
                        const decoded = jwt.verify(
                            token, 
                            process.env.JWT_SECRET || 'clave_secreta_super_segura_2024'
                        );
                        userId = decoded.userId;
                    } catch (err) {
                        // Token inválido, continuar sin userId
                    }
                }

                // Obtener la IP del cliente
                const ipCliente = req.headers['x-forwarded-for'] || 
                                  req.connection?.remoteAddress || 
                                  req.socket?.remoteAddress || 
                                  '127.0.0.1';

                // Determinar el módulo basado en la ruta
                const modulo = getModuleFromPath(req.path);
                
                // Determinar la acción basada en el método HTTP
                const accion = getActionFromMethod(req.method);
                
                // Extraer el ID del registro si existe
                const registroId = extractRecordId(req.path);
                
                // Crear el detalle en formato JSON
                const detalle = {
                    metodo: req.method,
                    ruta: req.originalUrl,
                    body: sanitizeBody(req.body),
                    params: req.params,
                    query: req.query,
                    statusCode: res.statusCode
                };

                // Insertar en la tabla de auditoría
                await db.query(
                    `INSERT INTO auditoria (usuario_id, modulo, accion, registro_id, detalle, ip_cliente)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        userId,
                        modulo,
                        accion,
                        registroId,
                        JSON.stringify(detalle),
                        ipCliente
                    ]
                );

                console.log(`📝 Auditoría: ${accion} en ${modulo} por usuario ${userId || 'anónimo'}`);

            } catch (auditError) {
                // Si falla la auditoría, no detener la respuesta
                console.error('❌ Error en auditoría:', auditError.message);
            }
        }

        // Continuar con la respuesta original
        return originalJson(data);
    };

    next();
}

/**
 * Determina el módulo basado en la ruta de la API
 */
function getModuleFromPath(path) {
    const modules = {
        '/api/auth': 'Autenticación',
        '/api/branches': 'Sucursales',
        '/api/users': 'Usuarios',
        '/api/clients': 'Clientes',
        '/api/pets': 'Mascotas',
        '/api/products': 'Productos',
        '/api/services': 'Servicios',
        '/api/appointments': 'Citas',
        '/api/orders': 'Ventas',
        '/api/grooming': 'Grooming'
    };

    for (const [route, moduleName] of Object.entries(modules)) {
        if (path.startsWith(route)) {
            return moduleName;
        }
    }

    return 'General';
}

/**
 * Determina la acción basada en el método HTTP
 */
function getActionFromMethod(method) {
    const actions = {
        'POST': 'CREAR',
        'PUT': 'ACTUALIZAR',
        'DELETE': 'ELIMINAR',
        'PATCH': 'ACTUALIZAR'
    };
    return actions[method] || method;
}

/**
 * Extrae el ID del registro de la URL
 */
function extractRecordId(path) {
    // Patrones comunes: /api/modulo/id, /api/modulo/id/accion
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = path.match(uuidPattern);
    return match ? match[0] : null;
}

/**
 * Sanitiza el body para no guardar contraseñas
 */
function sanitizeBody(body) {
    if (!body) return {};
    
    const sanitized = { ...body };
    
    // Eliminar campos sensibles
    const sensitiveFields = ['password', 'password_hash', 'current_password', 'new_password', 'confirm_password', 'token', 'credential'];
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '***PROTEGIDO***';
        }
    });

    return sanitized;
}

module.exports = auditMiddleware;