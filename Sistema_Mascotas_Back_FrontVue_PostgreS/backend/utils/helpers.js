const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const helpers = {
    // Generar hash de contraseña
    hashPassword: async (password) => {
        const salt = await bcrypt.genSalt(12);
        return await bcrypt.hash(password, salt);
    },

    // Comparar contraseñas
    comparePassword: async (password, hash) => {
        return await bcrypt.compare(password, hash);
    },

    // Generar token JWT
    generateToken: (userId, role) => {
        return jwt.sign(
            { userId, role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
    },

    // Paginación
    getPaginationParams: (query) => {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const offset = (page - 1) * limit;
        return { page, limit, offset };
    },

    // Formatear respuesta con paginación
    formatPaginatedResponse: (data, total, page, limit) => {
        return {
            data,
            pagination: {
                current_page: page,
                per_page: limit,
                total_items: total,
                total_pages: Math.ceil(total / limit),
                has_next_page: page * limit < total,
                has_previous_page: page > 1
            }
        };
    },

    // Sanitizar outputs
    sanitizeUser: (user) => {
        const { password_hash, two_factor_secret, ...safeUser } = user;
        return safeUser;
    },

    // Formatear fecha
    formatDate: (date) => {
        return new Date(date).toISOString();
    }
};

module.exports = helpers;