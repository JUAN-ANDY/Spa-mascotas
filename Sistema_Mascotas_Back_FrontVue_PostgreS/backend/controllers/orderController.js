const db = require('../config/db');
const helpers = require('../utils/helpers');

class OrderController {
    // Obtener todas las órdenes
    static async getAll(req, res, next) {
        try {
            const { page, limit, offset } = helpers.getPaginationParams(req.query);
            const status = req.query.status;

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

            query += ` ORDER BY o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            
            const countResult = await db.query(countQuery, params.slice(0, paramCount - 1));
            const total = parseInt(countResult.rows[0].count);

            params.push(limit, offset);
            const result = await db.query(query, params);

            res.json(helpers.formatPaginatedResponse(result.rows, total, page, limit));

        } catch (error) {
            next(error);
        }
    }

    // Obtener orden por ID
    static async getById(req, res, next) {
        try {
            const { id } = req.params;

            const orderResult = await db.query(
                `SELECT o.*, b.name as branch_name
                 FROM orders o
                 JOIN branches b ON o.branch_id = b.id
                 WHERE o.id = $1`,
                [id]
            );

            if (orderResult.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Orden no encontrada'
                });
            }

            // Obtener items
            const itemsResult = await db.query(
                `SELECT oi.*, pv.variant_name, pv.sku, p.name as product_name
                 FROM order_items oi
                 JOIN product_variants pv ON oi.variant_id = pv.id
                 JOIN products p ON pv.product_id = p.id
                 WHERE oi.order_id = $1`,
                [id]
            );

            res.json({
                order: orderResult.rows[0],
                items: itemsResult.rows
            });

        } catch (error) {
            next(error);
        }
    }

    // Crear orden
    static async create(req, res, next) {
        try {
            const { branch_id, client_id, items, payment_method } = req.body;

            const result = await db.transaction(async (client) => {
                // Crear orden
                const orderResult = await client.query(
                    `INSERT INTO orders (branch_id, client_id, created_by, total_amount, payment_method, status)
                     VALUES ($1, $2, $3, 0, $4, 'Pendiente')
                     RETURNING *`,
                    [branch_id, client_id, req.user.id, payment_method]
                );

                const order = orderResult.rows[0];
                let totalAmount = 0;

                // Insertar items
                for (const item of items) {
                    const variantResult = await client.query(
                        'SELECT price, product_id FROM product_variants WHERE id = $1',
                        [item.variant_id]
                    );

                    if (variantResult.rows.length === 0) {
                        throw new Error(`Variante ${item.variant_id} no encontrada`);
                    }

                    const price = variantResult.rows[0].price;
                    const subtotal = price * item.quantity;

                    await client.query(
                        `INSERT INTO order_items (order_id, variant_id, quantity, unit_price)
                         VALUES ($1, $2, $3, $4)`,
                        [order.id, item.variant_id, item.quantity, price]
                    );

                    totalAmount += subtotal;
                }

                // Actualizar total
                await client.query(
                    'UPDATE orders SET total_amount = $1 WHERE id = $2',
                    [totalAmount, order.id]
                );

                return { ...order, total_amount: totalAmount };
            });

            res.status(201).json({
                message: 'Orden creada exitosamente',
                order: result
            });

        } catch (error) {
            next(error);
        }
    }

    // Actualizar estado de orden
    static async updateStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['Pendiente', 'WhatsApp_Enviado', 'Pagado', 'Entregado', 'Cancelado'].includes(status)) {
                return res.status(400).json({
                    error: 'Estado inválido',
                    message: 'El estado proporcionado no es válido'
                });
            }

            const result = await db.query(
                `UPDATE orders 
                 SET status = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
                 WHERE id = $3
                 RETURNING *`,
                [status, req.user.id, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Orden no encontrada'
                });
            }

            res.json({
                message: 'Estado de orden actualizado exitosamente',
                order: result.rows[0]
            });

        } catch (error) {
            next(error);
        }
    }

    // Cancelar orden
    static async cancel(req, res, next) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const result = await db.transaction(async (client) => {
                // Cancelar orden
                const orderResult = await client.query(
                    `UPDATE orders 
                     SET status = 'Cancelado', updated_at = CURRENT_TIMESTAMP, updated_by = $1
                     WHERE id = $2 AND status NOT IN ('Entregado', 'Cancelado')
                     RETURNING *`,
                    [req.user.id, id]
                );

                if (orderResult.rows.length === 0) {
                    throw new Error('Orden no encontrada o ya está cancelada/entregada');
                }

                // Devolver stock
                const items = await client.query(
                    'SELECT variant_id, quantity FROM order_items WHERE order_id = $1',
                    [id]
                );

                for (const item of items.rows) {
                    await client.query(
                        `UPDATE branch_inventories 
                         SET stock = stock + $1 
                         WHERE variant_id = $2 AND branch_id = $3`,
                        [item.quantity, item.variant_id, orderResult.rows[0].branch_id]
                    );
                }

                return orderResult.rows[0];
            });

            res.json({
                message: 'Orden cancelada exitosamente',
                order: result
            });

        } catch (error) {
            if (error.message.includes('no encontrada')) {
                return res.status(404).json({ error: 'No encontrado', message: error.message });
            }
            next(error);
        }
    }
}

module.exports = OrderController;