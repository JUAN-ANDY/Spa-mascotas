const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
    constructor(data) {
        this.id = data.id;
        this.branch_id = data.branch_id;
        this.role = data.role;
        this.email = data.email;
        this.password_hash = data.password_hash;
        this.first_name = data.first_name;
        this.last_name = data.last_name;
        this.phone = data.phone;
        this.is_active = data.is_active;
        this.concurrent_capacity = data.concurrent_capacity;
        this.is_2fa_enabled = data.is_2fa_enabled;
        this.two_factor_secret = data.two_factor_secret;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.deleted_at = data.deleted_at;
    }

    // Crear nuevo usuario
    static async create(userData) {
        const { branch_id, role, email, password, first_name, last_name, phone, concurrent_capacity } = userData;
        
        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(password, salt);

        const result = await db.query(
            `INSERT INTO users (branch_id, role, email, password_hash, first_name, last_name, phone, concurrent_capacity)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [branch_id, role, email.toLowerCase().trim(), password_hash, first_name.trim(), 
             last_name.trim(), phone, concurrent_capacity || 1]
        );

        return new User(result.rows[0]);
    }

    // Buscar usuario por ID
    static async findById(id) {
        const result = await db.query(
            'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        return result.rows.length > 0 ? new User(result.rows[0]) : null;
    }

    // Buscar usuario por email
    static async findByEmail(email) {
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
            [email.toLowerCase().trim()]
        );
        return result.rows.length > 0 ? new User(result.rows[0]) : null;
    }

    // Obtener todos los usuarios con filtros
    static async findAll({ role, search, branch_id, is_active, page = 1, limit = 10 }) {
        let query = 'SELECT * FROM users WHERE deleted_at IS NULL';
        let countQuery = 'SELECT COUNT(*) FROM users WHERE deleted_at IS NULL';
        const params = [];
        let paramCount = 1;

        if (role) {
            query += ` AND role = $${paramCount}`;
            countQuery += ` AND role = $${paramCount}`;
            params.push(role);
            paramCount++;
        }

        if (branch_id) {
            query += ` AND branch_id = $${paramCount}`;
            countQuery += ` AND branch_id = $${paramCount}`;
            params.push(branch_id);
            paramCount++;
        }

        if (is_active !== undefined) {
            query += ` AND is_active = $${paramCount}`;
            countQuery += ` AND is_active = $${paramCount}`;
            params.push(is_active);
            paramCount++;
        }

        if (search) {
            query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
            countQuery += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        const offset = (page - 1) * limit;
        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        return {
            users: result.rows.map(user => new User(user)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // Obtener groomers
    static async findGroomers(branch_id = null) {
        let query = `SELECT id, first_name, last_name, email, phone, concurrent_capacity 
                     FROM users 
                     WHERE role = 'Groomer' AND is_active = true AND deleted_at IS NULL`;
        const params = [];

        if (branch_id) {
            query += ' AND branch_id = $1';
            params.push(branch_id);
        }

        query += ' ORDER BY first_name, last_name';
        const result = await db.query(query, params);
        return result.rows;
    }

    // Actualizar usuario
    async update(updateData) {
        const allowedFields = [
            'branch_id', 'role', 'email', 'first_name', 'last_name', 
            'phone', 'is_active', 'concurrent_capacity'
        ];
        
        const updates = [];
        const params = [];
        let paramCount = 1;

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = $${paramCount}`);
                params.push(field === 'email' ? updateData[field].toLowerCase().trim() : updateData[field]);
                paramCount++;
            }
        }

        if (updateData.password) {
            const salt = await bcrypt.genSalt(12);
            const hash = await bcrypt.hash(updateData.password, salt);
            updates.push(`password_hash = $${paramCount}`);
            params.push(hash);
            paramCount++;
        }

        if (updates.length === 0) return this;

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(this.id);

        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await db.query(query, params);

        if (result.rows.length > 0) {
            Object.assign(this, result.rows[0]);
        }

        return this;
    }

    // Soft delete
    async delete() {
        const result = await db.query(
            `UPDATE users SET deleted_at = CURRENT_TIMESTAMP, is_active = false 
             WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
            [this.id]
        );
        return result.rows.length > 0;
    }

    // Verificar contraseña
    async verifyPassword(password) {
        return await bcrypt.compare(password, this.password_hash);
    }

    // Obtener permisos del rol
    getPermissions() {
        const permissions = {
            'Administrador': ['all'],
            'Recepcion': ['clients', 'pets', 'appointments', 'orders', 'products'],
            'Groomer': ['appointments', 'grooming_records', 'pets'],
            'Cliente': ['profile', 'pets', 'appointments', 'reviews']
        };
        return permissions[this.role] || [];
    }

    // Verificar si tiene un permiso específico
    hasPermission(resource) {
        const permissions = this.getPermissions();
        return permissions.includes('all') || permissions.includes(resource);
    }

    // To JSON (sin datos sensibles)
    toJSON() {
        return {
            id: this.id,
            branch_id: this.branch_id,
            role: this.role,
            email: this.email,
            first_name: this.first_name,
            last_name: this.last_name,
            phone: this.phone,
            is_active: this.is_active,
            concurrent_capacity: this.concurrent_capacity,
            is_2fa_enabled: this.is_2fa_enabled,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = User;