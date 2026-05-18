const db = require('../config/db');

class Order {
    constructor(data) {
        this.id = data.id;
        this.branch_id = data.branch_id;
        this.client_id = data.client_id;
        this.created_by = data.created_by;
        this.updated_by = data.updated_by;
        this.status = data.status;
        this.total_amount = data.total_amount;
        this.payment_method = data.payment_method;
        this.whatsapp_link_generated = data.whatsapp_link_generated;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;

        // Datos relacionados
        this.branch_name = data.branch_name;
        this.client_name = data.client_name;
        this.items = data.items || [];
    }

    // Crear orden
    static async create(orderData) {
        const { branch_id, client_id, created_by, items, payment_method } = orderData;

        const result = await db.transaction(async (client) => {
            // Crear orden
            const orderResult = await client.query(
                `INSERT INTO orders (branch_id, client_id, created_by, total_amount, payment_method, status)
                 VALUES ($1, $2, $3, 0, $4, 'Pendiente')
                 RETURNING *`,
                [branch_id, client_id, created_by, payment_method]
            );

            const order = orderResult.rows[0];
            let totalAmount = 0;

            // Insertar items
            if (items && items.length > 0) {
                for (const item of items) {
                    const variantResult = await client.query(
                        'SELECT price FROM product_variants WHERE id = $1',
                        [item.variant_id]
                    );

                    if (variantResult.rows.length === 0) {
                        throw new Error(`Variante ${item.variant_id} no encontrada`);
                    }

                    const price = variantResult.rows[0].price;
                    
                    await client.query(
                        `INSERT INTO order_items (order_id, variant_id, quantity, unit_price)
                         VALUES ($1, $2, $3, $4)`,
                        [order.id, item.variant_id, item.quantity, price]
                    );

                    totalAmount += parseFloat(price) * parseFloat(item.quantity);
                }
            }

            // Actualizar total
            await client.query(
                'UPDATE orders SET total_amount = $1 WHERE id = $2',
                [totalAmount, order.id]
            );

            order.total_amount = totalAmount;
            return order;
        });

        return new Order(result);
    }

    // Buscar por ID
    static async findById(id) {
        const orderResult = await db.query(
            `SELECT o.*, b.name as branch_name,
                    u.first_name || ' ' || u.last_name as client_name
             FROM orders o
             JOIN branches b ON o.branch_id = b.id
             LEFT JOIN clients c ON o.client_id = c.id
             LEFT JOIN users u ON c.user_id = u.id
             WHERE o.id = $1`,
            [id]
        );

        if (orderResult.rows.length === 0) return null;

        // Obtener items
        const itemsResult = await db.query(
            `SELECT oi.*, pv.variant_name, pv.sku, p.name as product_name
             FROM order_items oi
             JOIN product_variants pv ON oi.variant_id = pv.id
             JOIN products p ON pv.product_id = p.id
             WHERE oi.order_id = $1`,
            [id]
        );

        const order = orderResult.rows[0];
        order.items = itemsResult.rows;

        return new Order(order);
    }

    // Obtener todas las órdenes
    static async findAll({ status, branch_id, client_id, page = 1, limit = 10 } = {}) {
        let query = `
            SELECT o.*, b.name as branch_name,
                   u.first_name || ' ' || u.last_name as client_name
            FROM orders o
            JOIN branches b ON o.branch_id = b.id
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN users u ON c.user_id = u.id
            WHERE 1=1`;
        
        let countQuery = 'SELECT COUNT(*) FROM orders WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (status) {
            const statusCondition = ` AND o.status = $${paramCount}`;
            query += statusCondition;
            countQuery += statusCondition;
            params.push(status);
            paramCount++;
        }

        if (branch_id) {
            const branchCondition = ` AND o.branch_id = $${paramCount}`;
            query += branchCondition;
            countQuery += branchCondition;
            params.push(branch_id);
            paramCount++;
        }

        if (client_id) {
            const clientCondition = ` AND o.client_id = $${paramCount}`;
            query += clientCondition;
            countQuery += clientCondition;
            params.push(client_id);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        const offset = (page - 1) * limit;
        query += ` ORDER BY o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        return {
            orders: result.rows.map(order => new Order(order)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // Actualizar estado
    async updateStatus(status, updated_by) {
        const validStatuses = ['Pendiente', 'WhatsApp_Enviado', 'Pagado', 'Entregado', 'Cancelado'];
        
        if (!validStatuses.includes(status)) {
            throw new Error(`Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`);
        }

        const result = await db.query(
            `UPDATE orders 
             SET status = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
             WHERE id = $3
             RETURNING *`,
            [status, updated_by, this.id]
        );

        if (result.rows.length > 0) {
            Object.assign(this, result.rows[0]);
        }

        return this;
    }

    // Cancelar orden con devolución de stock
    async cancel(updated_by) {
        const result = await db.transaction(async (client) => {
            // Cancelar orden
            const orderResult = await client.query(
                `UPDATE orders 
                 SET status = 'Cancelado', updated_at = CURRENT_TIMESTAMP, updated_by = $1
                 WHERE id = $2 AND status NOT IN ('Entregado', 'Cancelado')
                 RETURNING *`,
                [updated_by, this.id]
            );

            if (orderResult.rows.length === 0) {
                throw new Error('La orden no se puede cancelar');
            }

            // Devolver stock
            const items = await client.query(
                'SELECT variant_id, quantity FROM order_items WHERE order_id = $1',
                [this.id]
            );

            for (const item of items.rows) {
                await client.query(
                    `UPDATE branch_inventories 
                     SET stock = stock + $1 
                     WHERE variant_id = $2 AND branch_id = $3`,
                    [item.quantity, item.variant_id, this.branch_id]
                );
            }

            return orderResult.rows[0];
        });

        Object.assign(this, result);
        return this;
    }

    // Agregar item a orden existente
    async addItem(variant_id, quantity) {
        const result = await db.transaction(async (client) => {
            const variantResult = await client.query(
                'SELECT price FROM product_variants WHERE id = $1',
                [variant_id]
            );

            if (variantResult.rows.length === 0) {
                throw new Error('Variante no encontrada');
            }

            const price = variantResult.rows[0].price;
            
            await client.query(
                `INSERT INTO order_items (order_id, variant_id, quantity, unit_price)
                 VALUES ($1, $2, $3, $4)`,
                [this.id, variant_id, quantity, price]
            );

            const newTotal = parseFloat(this.total_amount) + (parseFloat(price) * quantity);
            await client.query(
                'UPDATE orders SET total_amount = $1 WHERE id = $2',
                [newTotal, this.id]
            );

            this.total_amount = newTotal;
            return this;
        });

        return result;
    }

    // Calcular total
    async calculateTotal() {
        const result = await db.query(
            'SELECT SUM(subtotal) as total FROM order_items WHERE order_id = $1',
            [this.id]
        );
        this.total_amount = parseFloat(result.rows[0].total) || 0;
        return this.total_amount;
    }

    // Generar enlace de WhatsApp
    async generateWhatsAppLink(phone) {
        const message = encodeURIComponent(
            `¡Hola! Tu pedido #${this.id.toString().slice(0, 8)} está listo. ` +
            `Total: Bs. ${this.total_amount}. ¡Te esperamos! 🐾`
        );
        const link = `https://wa.me/${phone}?text=${message}`;
        
        await db.query(
            'UPDATE orders SET whatsapp_link_generated = $1 WHERE id = $2',
            [link, this.id]
        );

        this.whatsapp_link_generated = link;
        return link;
    }

    toJSON() {
        return {
            id: this.id,
            branch_id: this.branch_id,
            branch_name: this.branch_name,
            client_id: this.client_id,
            client_name: this.client_name,
            status: this.status,
            total_amount: this.total_amount,
            payment_method: this.payment_method,
            whatsapp_link_generated: this.whatsapp_link_generated,
            items: this.items,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Order;