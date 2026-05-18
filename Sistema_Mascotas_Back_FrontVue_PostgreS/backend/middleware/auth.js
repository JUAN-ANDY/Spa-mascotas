const jwt = require('jsonwebtoken');

const auth = {
    verifyToken: (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ message: 'Token no proporcionado' });
            }

            const token = authHeader.split(' ')[1];
            // ⬇️ CORREGIDO: Usar la misma clave secreta que en authRoutes.js ⬇️
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'clave_secreta_super_segura_2024');
            
            req.user = {
                id: decoded.userId,
                role: decoded.role,
                email: decoded.email  // ⬇️ AGREGADO: email del token ⬇️
            };
            
            next();
        } catch (error) {
            // ⬇️ AGREGADO: Manejo específico de errores de token ⬇️
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expirado' });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Token inválido' });
            }
            return res.status(401).json({ message: 'Token inválido o expirado' });
        }
    },

    authorize: (...roles) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ message: 'No autenticado' });
            }

            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ message: 'Acceso denegado' });
            }
            
            next();
        };
    }
};

module.exports = auth;