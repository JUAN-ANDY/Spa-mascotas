const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// ============================================
// GET /api/products/categories
// Obtener todas las categorías
// ============================================
router.get('/categories', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name'
        );
        res.json({ categories: result.rows });
    } catch (error) {
        console.error('❌ Error obteniendo categorías:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// ============================================
// POST /api/products/categories
// Crear nueva categoría
// ============================================
router.post('/categories', auth.verifyToken, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Nombre de categoría requerido' });
        }

        // Verificar si ya existe
        const existing = await db.query(
            'SELECT id FROM categories WHERE name = $1 AND deleted_at IS NULL',
            [name.trim()]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'La categoría ya existe' });
        }

        const result = await db.query(
            'INSERT INTO categories (name) VALUES ($1) RETURNING *',
            [name.trim()]
        );

        console.log('✅ Categoría creada:', result.rows[0].name);
        res.status(201).json({ category: result.rows[0] });

    } catch (error) {
        console.error('❌ Error creando categoría:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// ============================================
// GET /api/products
// Obtener todos los productos con variantes e imagen
// ============================================
router.get('/', async (req, res) => {
    try {
        const { search, category_id, page: p = 1, limit: l = 10 } = req.query;
        const page = parseInt(p);
        const limit = parseInt(l);
        const offset = (page - 1) * limit;
        const params = [];
        let paramCount = 1;

        let query = `
            SELECT p.*, c.name as category_name,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', pv.id, 
                               'variant_name', pv.variant_name, 
                               'sku', pv.sku, 
                               'price', pv.price
                           )
                       ) FILTER (WHERE pv.id IS NOT NULL), 
                       '[]'::json
                   ) as variants
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.deleted_at IS NULL
            WHERE p.deleted_at IS NULL AND p.is_active = true`;
        
        let countQuery = 'SELECT COUNT(*) FROM products p WHERE p.deleted_at IS NULL AND p.is_active = true';

        if (search) {
            query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
            countQuery += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (category_id) {
            query += ` AND p.category_id = $${paramCount}`;
            countQuery += ` AND p.category_id = $${paramCount}`;
            params.push(category_id);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        query += ` GROUP BY p.id, c.name ORDER BY p.name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        res.json({
            data: result.rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo productos:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// ============================================
// GET /api/products/inventory/:branchId
// Obtener inventario por sucursal
// ============================================
router.get('/inventory/:branchId', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT bi.*, pv.variant_name, pv.sku, p.name as product_name, 
                    p.image_url as product_image, pv.price
             FROM branch_inventories bi
             JOIN product_variants pv ON bi.variant_id = pv.id
             JOIN products p ON pv.product_id = p.id
             WHERE bi.branch_id = $1 AND pv.deleted_at IS NULL AND p.deleted_at IS NULL`,
            [req.params.branchId]
        );
        res.json({ inventory: result.rows });
    } catch (error) {
        console.error('❌ Error obteniendo inventario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// ============================================
// GET /api/products/:id
// Obtener producto por ID con variantes
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = $1 AND p.deleted_at IS NULL`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const variants = await db.query(
            'SELECT * FROM product_variants WHERE product_id = $1 AND deleted_at IS NULL',
            [req.params.id]
        );

        res.json({ 
            product: { 
                ...result.rows[0], 
                variants: variants.rows 
            } 
        });

    } catch (error) {
        console.error('❌ Error obteniendo producto:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// ============================================
// POST /api/products
// Crear nuevo producto con imagen y variantes
// ============================================
router.post('/', auth.verifyToken, async (req, res) => {
    try {
        const { category_id, name, description, image_url, variants } = req.body;

        // Validar nombre
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Nombre del producto requerido' });
        }

        console.log('📦 Creando producto:', name.trim());
        console.log('🖼️ Tiene imagen:', !!image_url);

        // Insertar producto con image_url
        const productResult = await db.query(
            `INSERT INTO products (category_id, name, description, image_url)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
                category_id || null,
                name.trim(),
                description || null,
                image_url || null
            ]
        );

        const product = productResult.rows[0];
        console.log('✅ Producto creado:', product.id);

        // Insertar variantes si existen
        if (variants && variants.length > 0) {
            for (const v of variants) {
                if (v.variant_name && v.sku) {
                    await db.query(
                        `INSERT INTO product_variants (product_id, variant_name, sku, price)
                         VALUES ($1, $2, $3, $4)`,
                        [
                            product.id,
                            v.variant_name.trim(),
                            v.sku.trim(),
                            parseFloat(v.price) || 0
                        ]
                    );
                }
            }
            console.log(`📦 ${variants.length} variantes creadas`);
        }

        // Obtener producto completo con variantes
        const completeProduct = await db.query(
            `SELECT p.*, c.name as category_name,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', pv.id, 
                                'variant_name', pv.variant_name, 
                                'sku', pv.sku, 
                                'price', pv.price
                            )
                        ) FILTER (WHERE pv.id IS NOT NULL), 
                        '[]'::json
                    ) as variants
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.deleted_at IS NULL
             WHERE p.id = $1
             GROUP BY p.id, c.name`,
            [product.id]
        );

        res.status(201).json({
            message: 'Producto creado exitosamente',
            product: completeProduct.rows[0]
        });

    } catch (error) {
        console.error('❌ Error creando producto:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// ============================================
// PUT /api/products/:id
// Actualizar producto existente
// ============================================
router.put('/:id', auth.verifyToken, async (req, res) => {
    try {
        const { category_id, name, description, image_url, is_active } = req.body;

        console.log('✏️ Actualizando producto:', req.params.id);
        console.log('🖼️ Actualizar imagen:', !!image_url);

        // Verificar que el producto existe
        const existing = await db.query(
            'SELECT id FROM products WHERE id = $1 AND deleted_at IS NULL',
            [req.params.id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        // Actualizar producto
        const result = await db.query(
            `UPDATE products SET 
                category_id = COALESCE($1, category_id),
                name = COALESCE($2, name),
                description = COALESCE($3, description),
                image_url = COALESCE($4, image_url),
                is_active = COALESCE($5, is_active)
             WHERE id = $6 AND deleted_at IS NULL 
             RETURNING *`,
            [
                category_id || null,
                name?.trim() || null,
                description || null,
                image_url || null,
                is_active,
                req.params.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        console.log('✅ Producto actualizado:', result.rows[0].id);

        // Obtener producto actualizado con variantes
        const updatedProduct = await db.query(
            `SELECT p.*, c.name as category_name,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', pv.id, 
                                'variant_name', pv.variant_name, 
                                'sku', pv.sku, 
                                'price', pv.price
                            )
                        ) FILTER (WHERE pv.id IS NOT NULL), 
                        '[]'::json
                    ) as variants
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.deleted_at IS NULL
             WHERE p.id = $1
             GROUP BY p.id, c.name`,
            [req.params.id]
        );

        res.json({
            message: 'Producto actualizado exitosamente',
            product: updatedProduct.rows[0]
        });

    } catch (error) {
        console.error('❌ Error actualizando producto:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// ============================================
// DELETE /api/products/:id
// Eliminar producto (soft delete)
// ============================================
router.delete('/:id', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE products 
             SET deleted_at = CURRENT_TIMESTAMP, is_active = false 
             WHERE id = $1 AND deleted_at IS NULL 
             RETURNING *`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        console.log('🗑️ Producto eliminado:', req.params.id);
        res.json({ message: 'Producto eliminado exitosamente' });

    } catch (error) {
        console.error('❌ Error eliminando producto:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// ============================================
// POST /api/products/:id/variants
// Agregar variante a un producto existente
// ============================================
router.post('/:id/variants', auth.verifyToken, async (req, res) => {
    try {
        const { variant_name, sku, price } = req.body;

        if (!variant_name || !sku) {
            return res.status(400).json({ message: 'Nombre de variante y SKU requeridos' });
        }

        // Verificar que el producto existe
        const product = await db.query(
            'SELECT id FROM products WHERE id = $1 AND deleted_at IS NULL',
            [req.params.id]
        );

        if (product.rows.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        // Verificar SKU único
        const existingSku = await db.query(
            'SELECT id FROM product_variants WHERE sku = $1 AND deleted_at IS NULL',
            [sku.trim()]
        );

        if (existingSku.rows.length > 0) {
            return res.status(409).json({ message: 'El SKU ya existe' });
        }

        const result = await db.query(
            `INSERT INTO product_variants (product_id, variant_name, sku, price)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [req.params.id, variant_name.trim(), sku.trim(), parseFloat(price) || 0]
        );

        console.log('✅ Variante agregada:', result.rows[0].id);
        res.status(201).json({
            message: 'Variante agregada exitosamente',
            variant: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error agregando variante:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// ============================================
// DELETE /api/products/variants/:variantId
// Eliminar variante (soft delete)
// ============================================
router.delete('/variants/:variantId', auth.verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE product_variants 
             SET deleted_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND deleted_at IS NULL 
             RETURNING *`,
            [req.params.variantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Variante no encontrada' });
        }

        console.log('🗑️ Variante eliminada:', req.params.variantId);
        res.json({ message: 'Variante eliminada exitosamente' });

    } catch (error) {
        console.error('❌ Error eliminando variante:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;