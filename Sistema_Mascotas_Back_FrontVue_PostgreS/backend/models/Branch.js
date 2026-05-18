const db = require('../config/db');

class Branch {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.address = data.address;
        this.phone = data.phone;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
    }

    // Crear sucursal
    static async create(branchData) {
        const { name, address, phone } = branchData;

        const result = await db.query(
            `INSERT INTO branches (name, address, phone)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [name.trim(), address?.trim(), phone?.trim()]
        );

        return new Branch(result.rows[0]);
    }

    // Buscar por ID
    static async findById(id) {
        const result = await db.query(
            'SELECT * FROM branches WHERE id = $1',
            [id]
        );
        return result.rows.length > 0 ? new Branch(result.rows[0]) : null;
    }

    // Obtener todas las sucursales
    static async findAll({ search, is_active, page = 1, limit = 10 } = {}) {
        let query = 'SELECT * FROM branches WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) FROM branches WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (search) {
            const searchCondition = ` AND (name ILIKE $${paramCount} OR address ILIKE $${paramCount})`;
            query += searchCondition;
            countQuery += searchCondition;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (is_active !== undefined) {
            const activeCondition = ` AND is_active = $${paramCount}`;
            query += activeCondition;
            countQuery += activeCondition;
            params.push(is_active);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        const offset = (page - 1) * limit;
        query += ` ORDER BY name ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        return {
            branches: result.rows.map(branch => new Branch(branch)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // Obtener sucursales activas
    static async findActive() {
        const result = await db.query(
            'SELECT * FROM branches WHERE is_active = true ORDER BY name'
        );
        return result.rows.map(branch => new Branch(branch));
    }

    // Actualizar sucursal
    async update(updateData) {
        const allowedFields = ['name', 'address', 'phone', 'is_active'];
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
        const query = `UPDATE branches SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await db.query(query, params);

        if (result.rows.length > 0) {
            Object.assign(this, result.rows[0]);
        }

        return this;
    }

    // Desactivar sucursal (soft delete)
    async deactivate() {
        const result = await db.query(
            'UPDATE branches SET is_active = false WHERE id = $1 RETURNING *',
            [this.id]
        );
        
        if (result.rows.length > 0) {
            this.is_active = false;
            return true;
        }
        return false;
    }

    // Activar sucursal
    async activate() {
        const result = await db.query(
            'UPDATE branches SET is_active = true WHERE id = $1 RETURNING *',
            [this.id]
        );
        
        if (result.rows.length > 0) {
            this.is_active = true;
            return true;
        }
        return false;
    }

    // Obtener inventario de la sucursal
    async getInventory() {
        const result = await db.query(
            `SELECT bi.*, pv.variant_name, pv.sku, p.name as product_name, pv.price
             FROM branch_inventories bi
             JOIN product_variants pv ON bi.variant_id = pv.id AND pv.deleted_at IS NULL
             JOIN products p ON pv.product_id = p.id AND p.deleted_at IS NULL
             WHERE bi.branch_id = $1
             ORDER BY p.name, pv.variant_name`,
            [this.id]
        );
        return result.rows;
    }

    // Obtener empleados de la sucursal
    async getEmployees() {
        const result = await db.query(
            `SELECT id, first_name, last_name, email, role, phone, is_active
             FROM users 
             WHERE branch_id = $1 AND deleted_at IS NULL
             ORDER BY role, first_name`,
            [this.id]
        );
        return result.rows;
    }

    // Obtener estadísticas de la sucursal
    async getStats() {
        const stats = await db.query(
            `SELECT 
                (SELECT COUNT(*) FROM appointments WHERE branch_id = $1 AND status = 'Pendiente') as pending_appointments,
                (SELECT COUNT(*) FROM appointments WHERE branch_id = $1 AND DATE(scheduled_start) = CURRENT_DATE) as today_appointments,
                (SELECT COUNT(*) FROM orders WHERE branch_id = $1 AND status = 'Pendiente') as pending_orders,
                (SELECT SUM(total_amount) FROM orders WHERE branch_id = $1 AND status = 'Pagado' AND DATE(created_at) = CURRENT_DATE) as today_revenue
            `,
            [this.id]
        );
        return stats.rows[0];
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            address: this.address,
            phone: this.phone,
            is_active: this.is_active,
            created_at: this.created_at
        };
    }
}

module.exports = Branch;