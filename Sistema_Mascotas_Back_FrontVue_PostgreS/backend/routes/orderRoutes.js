const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/orders
router.get('/', auth.verifyToken, async (req, res) => {
    try {
        const { status, page: p = 1, limit: l = 10 } = req.query;
        const page = parseInt(p);
        const limit = parseInt(l);
        const offset = (page - 1) * limit;
        const params = [];
        let paramCount = 1;

        let query = `
            SELECT o.*, b.name as branch_name,
                   u.first_name || ' ' || u.last_name as client_name
            FROM orders o
            JOIN branches b ON o.branch_id = b.id
            LEFT JOIN clients c ON o.client_id = c.id
            LEFT JOIN users u ON c.user_id = u.id
            WHERE 1=1`;
        
        let countQuery = 'SELECT COUNT(*) FROM orders WHERE 1=1';

        if (status) {
            query += ` AND o.status = $${paramCount}`;
            countQuery += ` AND status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        query += ` ORDER BY o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        res.json({
            data: result.rows,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// GET /api/orders/:id
router.get('/:id', auth.verifyToken, async (req, res) => {
    try {
        const orderResult = await db.query(
            `SELECT o.*, b.name as branch_name FROM orders o JOIN branches b ON o.branch_id = b.id WHERE o.id = $1`,
            [req.params.id]
        );
        if (orderResult.rows.length === 0) return res.status(404).json({ message: 'Orden no encontrada' });

        const items = await db.query(
            `SELECT oi.*, pv.variant_name, pv.sku, p.name as product_name
             FROM order_items oi
             JOIN product_variants pv ON oi.variant_id = pv.id
             JOIN products p ON pv.product_id = p.id
             WHERE oi.order_id = $1`,
            [req.params.id]
        );

        res.json({ order: orderResult.rows[0], items: items.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// POST /api/orders
router.post('/', auth.verifyToken, async (req, res) => {
    try {
        const { branch_id, client_id, items, payment_method } = req.body;

        if (!branch_id || !items || items.length === 0) {
            return res.status(400).json({ message: 'Sucursal y al menos un item requeridos' });
        }

        // Crear orden
        const orderResult = await db.query(
            `INSERT INTO orders (branch_id, client_id, created_by, total_amount, payment_method, status)
             VALUES ($1, $2, $3, 0, $4, 'Pendiente') RETURNING *`,
            [branch_id, client_id || null, req.user.id, payment_method || 'Efectivo']
        );

        const order = orderResult.rows[0];
        let totalAmount = 0;

        // Insertar items
        for (const item of items) {
            if (!item.variant_id || !item.quantity) continue;

            const variantResult = await db.query(
                'SELECT price FROM product_variants WHERE id = $1',
                [item.variant_id]
            );

            if (variantResult.rows.length === 0) continue;

            const price = parseFloat(variantResult.rows[0].price);
            const quantity = parseFloat(item.quantity);
            const subtotal = price * quantity;

            await db.query(
                `INSERT INTO order_items (order_id, variant_id, quantity, unit_price)
                 VALUES ($1, $2, $3, $4)`,
                [order.id, item.variant_id, quantity, price]
            );

            totalAmount += subtotal;

            // Descontar stock
            await db.query(
                `UPDATE branch_inventories SET stock = stock - $1
                 WHERE variant_id = $2 AND branch_id = $3`,
                [quantity, item.variant_id, branch_id]
            );
        }

        // Actualizar total
        await db.query('UPDATE orders SET total_amount = $1 WHERE id = $2', [totalAmount, order.id]);

        res.status(201).json({
            message: 'Venta creada exitosamente',
            order: { ...order, total_amount: totalAmount }
        });
    } catch (error) {
        console.error('Error creando orden:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// PUT /api/orders/:id/status
router.put('/:id/status', auth.verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pendiente', 'WhatsApp_Enviado', 'Pagado', 'Entregado', 'Cancelado'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }

        const result = await db.query(
            `UPDATE orders SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 RETURNING *`,
            [status, req.user.id, req.params.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Orden no encontrada' });
        res.json({ message: 'Estado actualizado', order: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE orders SET status = 'Cancelado', updated_by = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND status NOT IN ('Entregado', 'Cancelado') RETURNING *`,
            [req.user.id, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'La orden no se puede cancelar' });
        }

        res.json({ message: 'Orden cancelada', order: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;