const db = require('../config/db');
const helpers = require('../utils/helpers');

class ProductController {
    // Obtener categorías
    static async getCategories(req, res, next) {
        try {
            const result = await db.query(
                'SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name'
            );
            res.json({ categories: result.rows });
        } catch (error) {
            next(error);
        }
    }

    // Crear categoría
    static async createCategory(req, res, next) {
        try {
            const { name } = req.body;
            const result = await db.query(
                'INSERT INTO categories (name) VALUES ($1) RETURNING *',
                [name.trim()]
            );
            res.status(201).json({ message: 'Categoría creada', category: result.rows[0] });
        } catch (error) {
            next(error);
        }
    }

    // Obtener productos
    static async getAll(req, res, next) {
        try {
            const { page, limit, offset } = helpers.getPaginationParams(req.query);
            const categoryId = req.query.category_id;

            let query = `
                SELECT p.*, c.name as category_name,
                       json_agg(json_build_object(
                           'id', pv.id,
                           'variant_name', pv.variant_name,
                           'sku', pv.sku,
                           'price', pv.price
                       )) FILTER (WHERE pv.id IS NOT NULL) as variants
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.deleted_at IS NULL
                WHERE p.deleted_at IS NULL AND p.is_active = true`;
            
            let countQuery = 'SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND is_active = true';
            const params = [];
            let paramCount = 1;

            if (categoryId) {
                const catCondition = ` AND p.category_id = $${paramCount}`;
                query += catCondition;
                countQuery += catCondition;
                params.push(categoryId);
                paramCount++;
            }

            query += ` GROUP BY p.id, c.name ORDER BY p.name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            
            const countResult = await db.query(countQuery, params.slice(0, paramCount - 1));
            const total = parseInt(countResult.rows[0].count);

            params.push(limit, offset);
            const result = await db.query(query, params);

            res.json(helpers.formatPaginatedResponse(result.rows, total, page, limit));

        } catch (error) {
            next(error);
        }
    }

    // Obtener producto por ID
    static async getById(req, res, next) {
        try {
            const { id } = req.params;

            const result = await db.query(
                `SELECT p.*, c.name as category_name
                 FROM products p
                 LEFT JOIN categories c ON p.category_id = c.id
                 WHERE p.id = $1 AND p.deleted_at IS NULL`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Producto no encontrado'
                });
            }

            const variants = await db.query(
                'SELECT * FROM product_variants WHERE product_id = $1 AND deleted_at IS NULL',
                [id]
            );

            res.json({ 
                product: result.rows[0],
                variants: variants.rows 
            });

        } catch (error) {
            next(error);
        }
    }

    // Crear producto
    static async create(req, res, next) {
        try {
            const { category_id, name, description, variants } = req.body;

            const result = await db.transaction(async (client) => {
                const productResult = await client.query(
                    `INSERT INTO products (category_id, name, description)
                     VALUES ($1, $2, $3)
                     RETURNING *`,
                    [category_id, name.trim(), description]
                );

                const product = productResult.rows[0];

                // Insertar variantes
                if (variants && variants.length > 0) {
                    for (const variant of variants) {
                        await client.query(
                            `INSERT INTO product_variants (product_id, variant_name, sku, price)
                             VALUES ($1, $2, $3, $4)`,
                            [product.id, variant.variant_name, variant.sku, variant.price]
                        );
                    }
                }

                return product;
            });

            res.status(201).json({
                message: 'Producto creado exitosamente',
                product: result
            });

        } catch (error) {
            next(error);
        }
    }

    // Actualizar producto
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            const { category_id, name, description, is_active } = req.body;

            const result = await db.query(
                `UPDATE products 
                 SET category_id = COALESCE($1, category_id),
                     name = COALESCE($2, name),
                     description = COALESCE($3, description),
                     is_active = COALESCE($4, is_active)
                 WHERE id = $5 AND deleted_at IS NULL
                 RETURNING *`,
                [category_id, name?.trim(), description, is_active, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Producto no encontrado'
                });
            }

            res.json({
                message: 'Producto actualizado exitosamente',
                product: result.rows[0]
            });

        } catch (error) {
            next(error);
        }
    }

    // Eliminar producto (soft delete)
    static async delete(req, res, next) {
        try {
            const { id } = req.params;

            const result = await db.query(
                `UPDATE products SET deleted_at = CURRENT_TIMESTAMP 
                 WHERE id = $1 AND deleted_at IS NULL 
                 RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No encontrado',
                    message: 'Producto no encontrado'
                });
            }

            res.json({ message: 'Producto eliminado exitosamente' });

        } catch (error) {
            next(error);
        }
    }

    // Obtener inventario por sucursal
    static async getInventory(req, res, next) {
        try {
            const { branchId } = req.params;

            const result = await db.query(
                `SELECT bi.*, pv.variant_name, pv.sku, p.name as product_name,
                        pv.price
                 FROM branch_inventories bi
                 JOIN product_variants pv ON bi.variant_id = pv.id AND pv.deleted_at IS NULL
                 JOIN products p ON pv.product_id = p.id AND p.deleted_at IS NULL
                 WHERE bi.branch_id = $1
                 ORDER BY p.name, pv.variant_name`,
                [branchId]
            );

            res.json({ inventory: result.rows });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = ProductController;