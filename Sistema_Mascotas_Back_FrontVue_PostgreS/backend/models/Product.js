const db = require('../config/db');

class Product {
    constructor(data) {
        this.id = data.id;
        this.category_id = data.category_id;
        this.name = data.name;
        this.description = data.description;
        this.is_active = data.is_active;
        this.deleted_at = data.deleted_at;
        this.category_name = data.category_name;
        this.variants = data.variants || [];
    }

    // Crear producto con variantes
    static async create(productData) {
        const { category_id, name, description, variants } = productData;

        const result = await db.transaction(async (client) => {
            // Crear producto
            const productResult = await client.query(
                `INSERT INTO products (category_id, name, description)
                 VALUES ($1, $2, $3)
                 RETURNING *`,
                [category_id, name.trim(), description]
            );

            const product = productResult.rows[0];

            // Crear variantes si existen
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

        return new Product(result);
    }

    // Buscar por ID
    static async findById(id) {
        const result = await db.query(
            `SELECT p.*, c.name as category_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.id = $1 AND p.deleted_at IS NULL`,
            [id]
        );

        if (result.rows.length === 0) return null;

        // Obtener variantes
        const variants = await db.query(
            `SELECT * FROM product_variants 
             WHERE product_id = $1 AND deleted_at IS NULL`,
            [id]
        );

        const product = result.rows[0];
        product.variants = variants.rows;

        return new Product(product);
    }

    // Buscar por SKU
    static async findBySKU(sku) {
        const result = await db.query(
            `SELECT p.*, pv.*, c.name as category_name
             FROM products p
             JOIN product_variants pv ON p.id = pv.product_id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE pv.sku = $1 AND p.deleted_at IS NULL AND pv.deleted_at IS NULL`,
            [sku]
        );
        return result.rows.length > 0 ? new Product(result.rows[0]) : null;
    }

    // Obtener todos los productos
    static async findAll({ search, category_id, page = 1, limit = 10 } = {}) {
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

        if (search) {
            const searchCondition = ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount} OR EXISTS (SELECT 1 FROM product_variants pv2 WHERE pv2.product_id = p.id AND pv2.sku ILIKE $${paramCount}))`;
            query += searchCondition;
            countQuery += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (category_id) {
            const catCondition = ` AND p.category_id = $${paramCount}`;
            query += catCondition;
            countQuery += catCondition;
            params.push(category_id);
            paramCount++;
        }

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        const offset = (page - 1) * limit;
        query += ` GROUP BY p.id, c.name ORDER BY p.name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        return {
            products: result.rows.map(product => new Product(product)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // Obtener categorías
    static async getCategories() {
        const result = await db.query(
            'SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name'
        );
        return result.rows;
    }

    // Actualizar producto
    async update(updateData) {
        const { category_id, name, description, is_active } = updateData;

        const result = await db.query(
            `UPDATE products 
             SET category_id = COALESCE($1, category_id),
                 name = COALESCE($2, name),
                 description = COALESCE($3, description),
                 is_active = COALESCE($4, is_active)
             WHERE id = $5 AND deleted_at IS NULL
             RETURNING *`,
            [category_id, name?.trim(), description, is_active, this.id]
        );

        if (result.rows.length > 0) {
            Object.assign(this, result.rows[0]);
        }

        return this;
    }

    // Soft delete
    async delete() {
        const result = await db.query(
            `UPDATE products SET deleted_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
            [this.id]
        );

        if (result.rows.length > 0) {
            this.deleted_at = result.rows[0].deleted_at;
            return true;
        }
        return false;
    }

    // Agregar variante
    async addVariant(variantData) {
        const { variant_name, sku, price } = variantData;

        const result = await db.query(
            `INSERT INTO product_variants (product_id, variant_name, sku, price)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [this.id, variant_name, sku, price]
        );

        this.variants.push(result.rows[0]);
        return result.rows[0];
    }

    // Obtener inventario por sucursal
    async getInventoryByBranch(branchId) {
        const result = await db.query(
            `SELECT bi.*, pv.variant_name, pv.sku
             FROM branch_inventories bi
             JOIN product_variants pv ON bi.variant_id = pv.id
             WHERE pv.product_id = $1 AND bi.branch_id = $2`,
            [this.id, branchId]
        );
        return result.rows;
    }

    toJSON() {
        return {
            id: this.id,
            category_id: this.category_id,
            category_name: this.category_name,
            name: this.name,
            description: this.description,
            is_active: this.is_active,
            variants: this.variants
        };
    }
}

module.exports = Product;