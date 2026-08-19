// controllers/warehouseController.js
'use strict';
const { Op }          = require('sequelize');
const sequelize       = require('../config/database');
const logActivity     = require('../utils/activityLogger');
const {
    care_wh_products,
    care_wh_product_categories,
    care_wh_suppliers,
    care_wh_product_suppliers,
    care_wh_stock,
    care_wh_stock_movements,
    care_wh_purchase_orders,
    care_wh_deliveries,
    care_wh_rfq,
    care_wh_inventory_counts,
    care_drugsandservices,
} = require('../models');

// ── Helper ────────────────────────────────────────────────────────
const actor = (user) =>
    (user && user.firstName && user.lastName)
        ? (user.firstName + ' ' + user.lastName).trim()
        : (user && user.username) || 'unknown';

// Determine item_number for care_drugsandservices from category
const itemNumberForCategory = async (categoryId) => {
    const cat = await care_wh_product_categories.findByPk(categoryId, {
        include: [{ model: care_wh_product_categories, as: 'parent' }],
    });
    if (!cat) return 'SUP';
    const topName = cat.parent ? cat.parent.name : cat.name;
    return topName.toLowerCase().includes('pharma') ? 'MED' : 'SUP';
};

// ══════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════
exports.dashboard = async (req, res) => {
    try {
        const locale = req.locale || 'en';

        // Stock value and counts
        const [products, lowStockProducts, categories] = await Promise.all([
            care_wh_products.count({ where: { is_active: 1 } }),
            care_wh_products.findAll({
                where: {
                    is_active:     1,
                    current_stock: { [Op.lte]: sequelize.col('reorder_level') },
                },
                include: [{ model: care_wh_product_categories, as: 'category', attributes: ['name'] }],
                order:   [['current_stock', 'ASC']],
                limit:   20,
            }),
            care_wh_product_categories.count({ where: { is_active: 1 } }),
        ]);

        // Draft / pending POs
        const pendingPOs = await care_wh_purchase_orders.count({
            where: { status: { [Op.in]: ['draft','pending_director','pending_finance','approved','sent'] } },
        });

        // Expiring within 90 days
        const today   = new Date();
        const in90    = new Date(today); in90.setDate(in90.getDate() + 90);
        const expiring = await care_wh_stock.count({
            where: {
                expiry_date: { [Op.lte]: in90 },
                quantity:    { [Op.gt]: 0 },
            },
        });

        // Total active suppliers
        const suppliers = await care_wh_suppliers.count({ where: { is_active: 1 } });

        // Pending deliveries awaiting QC / shelving
        const pendingDeliveries = await care_wh_deliveries.count({
            where: { status: { [Op.in]: ['pending_qc','qc_passed','qc_partial'] } },
        });

        // Pending RFQs needing action
        const pendingRfqs = await care_wh_rfq.count({
            where: { status: { [Op.in]: ['pending_manager','approved','sent','comparing'] } },
        });

        // Check for active inventory count (stock lock)
        const activeLock = await care_wh_inventory_counts.findOne({
            where: { is_locked: 1, status: { [Op.in]: ['in_progress','pending_approval'] } },
            attributes: ['count_number'],
        });

        res.render('warehouse/dashboard', {
            title:            locale === 'fr' ? 'Entrepôt' : 'Warehouse',
            activePage:       'warehouse',
            user:             req.user,
            csrfToken:        req.csrfToken(),
            products,
            categories,
            suppliers,
            pendingPOs,
            expiring,
            lowStockProducts,
            stockLocked:        activeLock ? activeLock.count_number : null,
            pendingDeliveries:  pendingDeliveries,
            pendingRfqs:        pendingRfqs,
        });
    } catch (err) {
        console.error('Warehouse dashboard error:', err);
        res.status(500).send('Error: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════
// PRODUCTS — list, form, create, edit
// ══════════════════════════════════════════════════════════════════
exports.listProducts = async (req, res) => {
    try {
        const locale   = req.locale || 'en';
        const search   = (req.query.search || '').trim();
        const catId    = parseInt(req.query.category_id, 10) || null;
        const showLow  = req.query.low_stock === '1';
        const page     = Math.max(1, parseInt(req.query.page, 10) || 1);
        const PER_PAGE = 25;

        const where = { is_active: 1 };
        if (search) where[Op.or] = [
            { name:         { [Op.like]: '%' + search + '%' } },
            { generic_name: { [Op.like]: '%' + search + '%' } },
            { item_code:    { [Op.like]: '%' + search + '%' } },
        ];
        if (catId) where.category_id = catId;
        if (showLow) where.current_stock = { [Op.lte]: sequelize.col('reorder_level') };

        const { count, rows: products } = await care_wh_products.findAndCountAll({
            where,
            include: [{ model: care_wh_product_categories, as: 'category', attributes: ['name','parent_id'] }],
            order:   [['name', 'ASC']],
            limit:   PER_PAGE,
            offset:  (page - 1) * PER_PAGE,
        });

        const categories = await care_wh_product_categories.findAll({
            where: { is_active: 1 },
            order: [['parent_id', 'ASC'], ['name', 'ASC']],
        });

        res.render('warehouse/products/list', {
            title:      locale === 'fr' ? 'Catalogue produits' : 'Product Catalogue',
            activePage: 'warehouse',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            products,
            categories,
            totalCount:  count,
            totalPages:  Math.ceil(count / PER_PAGE),
            currentPage: page,
            search,
            catId,
            showLow,
            success:     req.query.success || null,
        });
    } catch (err) {
        console.error('List products error:', err);
        res.status(500).send('Error: ' + err.message);
    }
};

exports.createProductForm = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const categories = await care_wh_product_categories.findAll({
            where: { is_active: 1 },
            order: [['parent_id', 'ASC'], ['name', 'ASC']],
        });
        const suppliers = await care_wh_suppliers.findAll({
            where: { is_active: 1 }, order: [['name', 'ASC']],
        });
        res.render('warehouse/products/form', {
            title:      locale === 'fr' ? 'Nouveau produit' : 'New Product',
            activePage: 'warehouse',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            product:    null,
            categories,
            suppliers,
            errors:     [],
        });
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
};

exports.createProduct = async (req, res) => {
    const locale = req.locale || 'en';
    const {
        item_code, name, generic_name, category_id,
        unit_of_measure, reorder_level, reorder_quantity,
        // Supplier linking
        supplier_id, unit_price, lead_time_days, is_preferred,
    } = req.body;

    const errors = [];
    if (!item_code || !item_code.trim()) errors.push(locale === 'fr' ? 'Code requis.' : 'Item code required.');
    if (!name || !name.trim())           errors.push(locale === 'fr' ? 'Nom requis.'  : 'Name required.');
    if (!category_id)                    errors.push(locale === 'fr' ? 'Catégorie requise.' : 'Category required.');
    if (!unit_of_measure || !unit_of_measure.trim()) errors.push(locale === 'fr' ? 'Unité requise.' : 'Unit of measure required.');

    if (errors.length) {
        const categories = await care_wh_product_categories.findAll({ where: { is_active: 1 }, order: [['parent_id','ASC'],['name','ASC']] });
        const suppliers  = await care_wh_suppliers.findAll({ where: { is_active: 1 }, order: [['name','ASC']] });
        return res.render('warehouse/products/form', {
            title: locale === 'fr' ? 'Nouveau produit' : 'New Product',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            product: req.body, categories, suppliers, errors,
        });
    }

    try {
        // ── 1. Insert into care_drugsandservices automatically ──────
        const itemNumber = await itemNumberForCategory(parseInt(category_id, 10));
        const dsRow = await care_drugsandservices.create({
            item_number:        itemNumber,
            item_description:   name.trim(),
            item_description_en: name.trim(),
            unit_price_dec:     parseFloat(unit_price) || 0,
            purchasing_class:   itemNumber === 'MED' ? 'DRUG' : 'SUPPLY',
            store_type:         'warehouse',
            is_adult:           1,
            is_pediatric:       0,
            is_other:           0,
            is_consumable:      itemNumber === 'SUP' ? 1 : 0,
            user:               actor(req.user),
            datemod:            new Date(),
        });

        // ── 2. Create warehouse product ─────────────────────────────
        const product = await care_wh_products.create({
            item_code:        item_code.trim().substring(0, 50),
            name:             name.trim().substring(0, 255),
            generic_name:     generic_name ? generic_name.trim().substring(0, 255) : null,
            category_id:      parseInt(category_id, 10),
            unit_of_measure:  unit_of_measure.trim().substring(0, 50),
            reorder_level:    parseInt(reorder_level, 10) || 0,
            reorder_quantity: parseInt(reorder_quantity, 10) || 0,
            current_stock:    0,
            pharmacy_item_id: dsRow.item_id,
            is_active:        1,
            created_by:       actor(req.user),
        });

        // ── 3. Link supplier if provided ────────────────────────────
        if (supplier_id && parseInt(supplier_id, 10) > 0) {
            await care_wh_product_suppliers.create({
                product_id:     product.product_id,
                supplier_id:    parseInt(supplier_id, 10),
                unit_price:     parseFloat(unit_price) || 0,
                lead_time_days: parseInt(lead_time_days, 10) || 0,
                is_preferred:   is_preferred === '1' ? 1 : 1, // first supplier = preferred
            });
        }

        await logActivity(req,
            'Warehouse product created: ' + name.trim() + ' (code: ' + item_code.trim() + ')',
            true, 'warehouseController.js', req.user.user_id, req.user.username);

        res.redirect('/warehouse/products?success=1');
    } catch (err) {
        console.error('Create product error:', err);
        const categories = await care_wh_product_categories.findAll({ where: { is_active: 1 }, order: [['parent_id','ASC'],['name','ASC']] });
        const suppliers  = await care_wh_suppliers.findAll({ where: { is_active: 1 }, order: [['name','ASC']] });
        res.render('warehouse/products/form', {
            title: locale === 'fr' ? 'Nouveau produit' : 'New Product',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            product: req.body, categories, suppliers,
            errors: [err.message],
        });
    }
};

exports.editProductForm = async (req, res) => {
    try {
        const locale   = req.locale || 'en';
        const product  = await care_wh_products.findByPk(req.params.product_id, {
            include: [
                { model: care_wh_product_categories, as: 'category' },
                { model: care_wh_product_suppliers,  as: 'productSuppliers',
                  include: [{ model: care_wh_suppliers, as: 'supplier' }] },
            ],
        });
        if (!product) return res.status(404).send(locale === 'fr' ? 'Produit introuvable.' : 'Product not found.');

        const categories = await care_wh_product_categories.findAll({ where: { is_active: 1 }, order: [['parent_id','ASC'],['name','ASC']] });
        const suppliers  = await care_wh_suppliers.findAll({ where: { is_active: 1 }, order: [['name','ASC']] });

        res.render('warehouse/products/form', {
            title:      locale === 'fr' ? 'Modifier produit' : 'Edit Product',
            activePage: 'warehouse',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            product,
            categories,
            suppliers,
            errors:     [],
        });
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
};

exports.updateProduct = async (req, res) => {
    const locale = req.locale || 'en';
    const productId = parseInt(req.params.product_id, 10);
    const { name, generic_name, category_id, unit_of_measure, reorder_level, reorder_quantity } = req.body;

    try {
        const product = await care_wh_products.findByPk(productId);
        if (!product) return res.status(404).send('Not found');

        await product.update({
            name:             name.trim().substring(0, 255),
            generic_name:     generic_name ? generic_name.trim().substring(0, 255) : null,
            category_id:      parseInt(category_id, 10),
            unit_of_measure:  unit_of_measure.trim().substring(0, 50),
            reorder_level:    parseInt(reorder_level, 10) || 0,
            reorder_quantity: parseInt(reorder_quantity, 10) || 0,
            modify_time:      new Date(),
        });

        // Sync name back to care_drugsandservices
        if (product.pharmacy_item_id) {
            await care_drugsandservices.update(
                { item_description: name.trim(), item_description_en: name.trim(), datemod: new Date() },
                { where: { item_id: product.pharmacy_item_id } }
            );
        }

        await logActivity(req, 'Warehouse product updated: ' + name.trim(), true,
            'warehouseController.js', req.user.user_id, req.user.username);

        res.redirect('/warehouse/products?success=2');
    } catch (err) {
        console.error('Update product error:', err);
        res.redirect('/warehouse/products/' + productId + '/edit?error=1');
    }
};

// ══════════════════════════════════════════════════════════════════
// SUPPLIERS — list, form, create, edit
// ══════════════════════════════════════════════════════════════════
exports.listSuppliers = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const search = (req.query.search || '').trim();
        const where  = { is_active: 1 };
        if (search) where[Op.or] = [
            { name:           { [Op.like]: '%' + search + '%' } },
            { contact_person: { [Op.like]: '%' + search + '%' } },
            { email:          { [Op.like]: '%' + search + '%' } },
        ];

        const suppliers = await care_wh_suppliers.findAll({
            where,
            order: [['name', 'ASC']],
        });

        res.render('warehouse/suppliers/list', {
            title:      locale === 'fr' ? 'Fournisseurs' : 'Suppliers',
            activePage: 'warehouse',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            suppliers,
            search,
            success:    req.query.success || null,
        });
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
};

exports.createSupplierForm = (req, res) => {
    const locale = req.locale || 'en';
    res.render('warehouse/suppliers/form', {
        title:      locale === 'fr' ? 'Nouveau fournisseur' : 'New Supplier',
        activePage: 'warehouse',
        user:       req.user,
        csrfToken:  req.csrfToken(),
        supplier:   null,
        errors:     [],
    });
};

exports.createSupplier = async (req, res) => {
    const locale = req.locale || 'en';
    const { name, contact_person, phone, email, address, tax_id, payment_terms, notes } = req.body;

    if (!name || !name.trim()) {
        return res.render('warehouse/suppliers/form', {
            title: locale === 'fr' ? 'Nouveau fournisseur' : 'New Supplier',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            supplier: req.body, errors: [locale === 'fr' ? 'Nom requis.' : 'Name required.'],
        });
    }

    try {
        await care_wh_suppliers.create({
            name:           name.trim().substring(0, 255),
            contact_person: contact_person ? contact_person.trim().substring(0, 100) : null,
            phone:          phone   ? phone.trim().substring(0, 30)   : null,
            email:          email   ? email.trim().substring(0, 100)  : null,
            address:        address ? address.trim()                   : null,
            tax_id:         tax_id  ? tax_id.trim().substring(0, 50)  : null,
            payment_terms:  payment_terms ? payment_terms.trim().substring(0, 100) : null,
            notes:          notes   ? notes.trim()                     : null,
            is_active:      1,
            created_by:     actor(req.user),
        });

        await logActivity(req, 'Supplier created: ' + name.trim(), true,
            'warehouseController.js', req.user.user_id, req.user.username);

        res.redirect('/warehouse/suppliers?success=1');
    } catch (err) {
        console.error('Create supplier error:', err);
        res.render('warehouse/suppliers/form', {
            title: locale === 'fr' ? 'Nouveau fournisseur' : 'New Supplier',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            supplier: req.body, errors: [err.message],
        });
    }
};

exports.editSupplierForm = async (req, res) => {
    const locale   = req.locale || 'en';
    const supplier = await care_wh_suppliers.findByPk(req.params.supplier_id);
    if (!supplier) return res.status(404).send(locale === 'fr' ? 'Fournisseur introuvable.' : 'Supplier not found.');
    res.render('warehouse/suppliers/form', {
        title:      locale === 'fr' ? 'Modifier fournisseur' : 'Edit Supplier',
        activePage: 'warehouse',
        user:       req.user,
        csrfToken:  req.csrfToken(),
        supplier,
        errors:     [],
    });
};

exports.updateSupplier = async (req, res) => {
    const locale     = req.locale || 'en';
    const supplierId = parseInt(req.params.supplier_id, 10);
    const { name, contact_person, phone, email, address, tax_id, payment_terms, notes } = req.body;

    try {
        const supplier = await care_wh_suppliers.findByPk(supplierId);
        if (!supplier) return res.status(404).send('Not found');

        await supplier.update({
            name:           name.trim().substring(0, 255),
            contact_person: contact_person ? contact_person.trim().substring(0, 100) : null,
            phone:          phone   ? phone.trim().substring(0, 30)   : null,
            email:          email   ? email.trim().substring(0, 100)  : null,
            address:        address ? address.trim()                   : null,
            tax_id:         tax_id  ? tax_id.trim().substring(0, 50)  : null,
            payment_terms:  payment_terms ? payment_terms.trim().substring(0, 100) : null,
            notes:          notes   ? notes.trim()                     : null,
            modify_time:    new Date(),
        });

        await logActivity(req, 'Supplier updated: ' + name.trim(), true,
            'warehouseController.js', req.user.user_id, req.user.username);

        res.redirect('/warehouse/suppliers?success=2');
    } catch (err) {
        console.error('Update supplier error:', err);
        res.redirect('/warehouse/suppliers/' + supplierId + '/edit?error=1');
    }
};

// ── Product supplier link (add/remove supplier from product) ──────
exports.addProductSupplier = async (req, res) => {
    const { product_id, supplier_id, unit_price, lead_time_days, supplier_item_code, is_preferred } = req.body;
    try {
        // If marking as preferred, unset any existing preferred for this product
        if (is_preferred === '1') {
            await care_wh_product_suppliers.update(
                { is_preferred: 0 },
                { where: { product_id: parseInt(product_id, 10) } }
            );
        }
        await care_wh_product_suppliers.upsert({
            product_id:         parseInt(product_id, 10),
            supplier_id:        parseInt(supplier_id, 10),
            unit_price:         parseFloat(unit_price) || 0,
            lead_time_days:     parseInt(lead_time_days, 10) || 0,
            supplier_item_code: supplier_item_code ? supplier_item_code.trim() : null,
            is_preferred:       is_preferred === '1' ? 1 : 0,
        });
        await logActivity(req,
            `Supplier #${supplier_id} linked to product #${product_id} by ${actor(req.user)}`,
            true, 'warehouseController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── Categories — JSON list for dropdowns ──────────────────────────
exports.categoriesJson = async (req, res) => {
    try {
        const cats = await care_wh_product_categories.findAll({
            where: { is_active: 1 },
            order: [['parent_id', 'ASC'], ['name', 'ASC']],
        });
        res.json({ ok: true, categories: cats });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};




