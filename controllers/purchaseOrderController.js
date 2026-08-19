
// controllers/purchaseOrderController.js
'use strict';
const { Op, fn, col, literal } = require('sequelize');
const sequelize   = require('../config/database');
const { getCurrentFacilityDetails } = require('../utils/facilityHelper');
const logActivity = require('../utils/activityLogger');
const { todayLocalStr } = require('../utils/dateHelpers');
const {
    care_wh_purchase_orders,
    care_wh_po_items,
    care_wh_products,
    care_wh_product_categories,
    care_wh_suppliers,
    care_wh_product_suppliers,
    care_wh_stock,
    care_wh_stock_movements,
    care_wh_deliveries,
    care_wh_delivery_items,
    care_wh_rfq,
} = require('../models');

// ── Helpers ───────────────────────────────────────────────────────
const actor = (user) =>
    (user && user.firstName && user.lastName)
        ? (user.firstName + ' ' + user.lastName).trim()
        : (user && user.username) || 'unknown';

const fmtFCFA = (n) =>
    Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

// Generate PO number: PO-YYYYNNNN (e.g. PO-20260001)
const generatePoNumber = async () => {
    const year = new Date().getFullYear();
    const prefix = 'PO-' + year;
    const last = await care_wh_purchase_orders.findOne({
        where: { po_number: { [Op.like]: prefix + '%' } },
        order: [['po_id', 'DESC']],
        attributes: ['po_number'],
    });
    let seq = 1;
    if (last) {
        const n = parseInt(last.po_number.slice(prefix.length), 10);
        if (!isNaN(n)) seq = n + 1;
    }
    return prefix + String(seq).padStart(4, '0');
};

// Recalculate and save PO total from its items
const recalcPoTotal = async (poId) => {
    const items = await care_wh_po_items.findAll({
        where: { po_id: poId, status: { [Op.ne]: 'cancelled' } },
        attributes: ['total_price'],
    });
    const total = items.reduce((s, i) => s + parseFloat(i.total_price || 0), 0);
    await care_wh_purchase_orders.update(
        { total_amount: total },
        { where: { po_id: poId } }
    );
    return total;
};

// ══════════════════════════════════════════════════════════════════
// LIST — all POs with filters
// ══════════════════════════════════════════════════════════════════
exports.listPOs = async (req, res) => {
    try {
        const locale   = req.locale || 'en';
        const status   = req.query.status || '';
        const search   = (req.query.search || '').trim();
        const page     = Math.max(1, parseInt(req.query.page, 10) || 1);
        const PER_PAGE = 20;

        const where = {};
        if (status) where.status = status;
        if (search) where.po_number = { [Op.like]: '%' + search + '%' };

        const { count, rows: pos } = await care_wh_purchase_orders.findAndCountAll({
            where,
            include: [{ model: care_wh_suppliers, as: 'supplier', attributes: ['name'] }],
            order:   [['po_id', 'DESC']],
            limit:   PER_PAGE,
            offset:  (page - 1) * PER_PAGE,
        });

        // Counts per status for tab badges
        const statusCounts = await care_wh_purchase_orders.findAll({
            attributes: ['status', [fn('COUNT', col('po_id')), 'cnt']],
            group: ['status'],
            raw: true,
        });
        const countMap = {};
        statusCounts.forEach(r => { countMap[r.status] = parseInt(r.cnt, 10); });

        res.render('warehouse/purchase-orders/list', {
            title:      locale === 'fr' ? 'Bons de commande' : 'Purchase Orders',
            activePage: 'warehouse',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            pos,
            totalCount:  count,
            totalPages:  Math.ceil(count / PER_PAGE),
            currentPage: page,
            statusFilter: status,
            search,
            countMap,
            fmtFCFA,
        });
    } catch (err) {
        console.error('List POs error:', err);
        res.status(500).send('Error: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════
// CREATE FORM — new PO (optionally pre-filled with low-stock products)
// ══════════════════════════════════════════════════════════════════
exports.createPoForm = async (req, res) => {
    try {
        const locale = req.locale || 'en';

        // Pre-fill: gather ALL low-stock products grouped by preferred supplier
        const lowStock = await care_wh_products.findAll({
            where: {
                is_active:     1,
                reorder_level: { [Op.gt]: 0 },
                current_stock: { [Op.lte]: sequelize.col('reorder_level') },
            },
            include: [
                { model: care_wh_product_categories, as: 'category', attributes: ['name'] },
                { model: care_wh_product_suppliers,  as: 'productSuppliers',
                  where:    { is_preferred: 1 },
                  required: false,
                  include:  [{ model: care_wh_suppliers, as: 'supplier', attributes: ['name','supplier_id'] }] },
            ],
            order: [['name', 'ASC']],
        });

        // Build pre-fill items: product + suggested qty + price from preferred supplier
        const prefillItems = lowStock.map(p => {
            const ps = p.productSuppliers && p.productSuppliers[0];
            return {
                product_id:    p.product_id,
                name:          p.name,
                item_code:     p.item_code,
                unit_of_measure: p.unit_of_measure,
                current_stock: p.current_stock,
                reorder_level: p.reorder_level,
                reorder_quantity: p.reorder_quantity || 0,
                unit_price:    ps ? parseFloat(ps.unit_price || 0) : 0,
                supplier_id:   ps ? ps.supplier_id : null,
                supplier_name: ps && ps.supplier ? ps.supplier.name : null,
            };
        });

        const suppliers = await care_wh_suppliers.findAll({
            where: { is_active: 1 }, order: [['name', 'ASC']],
        });

        // All active products for the add-line dropdown
        const allProducts = await care_wh_products.findAll({
            where: { is_active: 1 },
            order: [['name', 'ASC']],
            attributes: ['product_id','name','item_code','unit_of_measure','reorder_quantity'],
        });

        res.render('warehouse/purchase-orders/form', {
            title:       locale === 'fr' ? 'Nouveau bon de commande' : 'New Purchase Order',
            activePage:  'warehouse',
            user:        req.user,
            csrfToken:   req.csrfToken(),
            po:          null,
            poItems:     [],
            prefillItems,
            suppliers,
            allProducts,
            errors:      [],
            mode:        'create',
        });
    } catch (err) {
        console.error('Create PO form error:', err);
        res.status(500).send('Error: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════
// CREATE — POST
// ══════════════════════════════════════════════════════════════════
exports.createPo = async (req, res) => {
    const locale = req.locale || 'en';
    const {
        supplier_id,
        expected_delivery_date,
        notes,
        product_ids,       // array
        quantities,        // array
        unit_prices,       // array
    } = req.body;

    // Normalise arrays
    const pids   = (Array.isArray(product_ids)   ? product_ids   : [product_ids]).filter(Boolean);
    const qtys   = (Array.isArray(quantities)    ? quantities    : [quantities]).filter(Boolean);
    const prices = (Array.isArray(unit_prices)   ? unit_prices   : [unit_prices]).filter(Boolean);

    const errors = [];
    if (!supplier_id)     errors.push(locale === 'fr' ? 'Fournisseur requis.'  : 'Supplier required.');
    if (pids.length === 0) errors.push(locale === 'fr' ? 'Au moins un produit requis.' : 'At least one product required.');

    if (errors.length) {
        const suppliers    = await care_wh_suppliers.findAll({ where: { is_active: 1 }, order: [['name','ASC']] });
        const allProducts  = await care_wh_products.findAll({ where: { is_active: 1 }, order: [['name','ASC']], attributes: ['product_id','name','item_code','unit_of_measure','reorder_quantity'] });
        return res.render('warehouse/purchase-orders/form', {
            title: locale === 'fr' ? 'Nouveau bon de commande' : 'New Purchase Order',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            po: req.body, poItems: [], prefillItems: [], suppliers, allProducts, errors, mode: 'create',
        });
    }

    try {
        const poNumber = await generatePoNumber();

        const po = await care_wh_purchase_orders.create({
            po_number:              poNumber,
            supplier_id:            parseInt(supplier_id, 10),
            status:                 'draft',
            created_by:             actor(req.user),
            expected_delivery_date: expected_delivery_date || null,
            notes:                  notes ? notes.trim() : null,
            total_amount:           0,
        });

        // Create line items
        let total = 0;
        const seen = new Set();
        for (let i = 0; i < pids.length; i++) {
            const pid = parseInt(pids[i], 10);
            if (isNaN(pid) || seen.has(pid)) continue;
            seen.add(pid);
            const qty   = Math.max(1, parseInt(qtys[i], 10) || 1);
            const price = parseFloat(prices[i]) || 0;
            const lineTotal = qty * price;
            total += lineTotal;
            await care_wh_po_items.create({
                po_id:             po.po_id,
                product_id:        pid,
                quantity_ordered:  qty,
                quantity_received: 0,
                unit_price:        price,
                total_price:       lineTotal,
                status:            'pending',
            });
        }

        await po.update({ total_amount: total });

        await logActivity(req,
            'Purchase Order ' + poNumber + ' created — ' + pids.length + ' item(s) — ' + fmtFCFA(total),
            true, 'purchaseOrderController.js', req.user.user_id, req.user.username);

        res.redirect('/warehouse/purchase-orders/' + po.po_id + '?success=created');
    } catch (err) {
        console.error('Create PO error:', err);
        const suppliers   = await care_wh_suppliers.findAll({ where: { is_active: 1 }, order: [['name','ASC']] });
        const allProducts = await care_wh_products.findAll({ where: { is_active: 1 }, order: [['name','ASC']], attributes: ['product_id','name','item_code','unit_of_measure','reorder_quantity'] });
        res.render('warehouse/purchase-orders/form', {
            title: locale === 'fr' ? 'Nouveau bon de commande' : 'New Purchase Order',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            po: req.body, poItems: [], prefillItems: [], suppliers, allProducts,
            errors: [err.message], mode: 'create',
        });
    }
};

// ══════════════════════════════════════════════════════════════════
// DETAIL VIEW
// ══════════════════════════════════════════════════════════════════
exports.poDetail = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const poId   = parseInt(req.params.po_id, 10);

        const po = await care_wh_purchase_orders.findByPk(poId, {
            include: [
                { model: care_wh_suppliers,  as: 'supplier' },
                { model: care_wh_rfq,        as: 'rfq', attributes: ['rfq_id','rfq_number'], required: false },
                { model: care_wh_deliveries, as: 'deliveries',
                  attributes: ['delivery_id','delivery_ref','received_by','received_at','status'],
                  required: false },
                { model: care_wh_po_items,  as: 'items',
                  include: [{ model: care_wh_products, as: 'product',
                    include: [{ model: care_wh_product_categories, as: 'category', attributes: ['name'] }] }] },
            ],
        });
        if (!po) return res.status(404).send(locale === 'fr' ? 'Commande introuvable.' : 'PO not found.');

        // Products not yet on this PO (for add-item)
        const usedIds = po.items.map(i => i.product_id);
        const availableProducts = await care_wh_products.findAll({
            where: {
                is_active:  1,
                product_id: { [Op.notIn]: usedIds.length ? usedIds : [0] },
            },
            order: [['name', 'ASC']],
            attributes: ['product_id','name','item_code','unit_of_measure'],
        });

        const success = req.query.success || null;

        res.render('warehouse/purchase-orders/detail', {
            title:             (locale === 'fr' ? 'Commande ' : 'Purchase Order ') + po.po_number,
            activePage:        'warehouse',
            user:              req.user,
            csrfToken:         req.csrfToken(),
            po,
            availableProducts,
            fmtFCFA,
            success,
        });
    } catch (err) {
        console.error('PO detail error:', err);
        res.status(500).send('Error: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════
// ADD ITEM to existing draft PO
// ══════════════════════════════════════════════════════════════════
exports.addPoItem = async (req, res) => {
    const locale = req.locale || 'en';
    const poId   = parseInt(req.params.po_id, 10);
    const { product_id, quantity_ordered, unit_price } = req.body;

    try {
        const po = await care_wh_purchase_orders.findByPk(poId);
        if (!po) return res.status(404).json({ ok: false, error: 'PO not found' });
        if (po.status !== 'draft')
            return res.status(400).json({ ok: false, error: locale === 'fr' ? 'Seuls les brouillons sont modifiables.' : 'Only draft POs can be modified.' });

        const pid = parseInt(product_id, 10);
        // Guard: no duplicates
        const existing = await care_wh_po_items.findOne({ where: { po_id: poId, product_id: pid } });
        if (existing) return res.status(400).json({ ok: false, error: locale === 'fr' ? 'Ce produit est déjà dans la commande.' : 'Product already in this PO.' });

        const qty   = Math.max(1, parseInt(quantity_ordered, 10) || 1);
        const price = parseFloat(unit_price) || 0;
        const item  = await care_wh_po_items.create({
            po_id:             poId,
            product_id:        pid,
            quantity_ordered:  qty,
            quantity_received: 0,
            unit_price:        price,
            total_price:       qty * price,
            status:            'pending',
        });

        const total = await recalcPoTotal(poId);
        await logActivity(req,
            `Item added to PO #${poId} (product #${pid}, qty ${qty}) by ${actor(req.user)}`,
            true, 'purchaseOrderController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, item_id: item.item_id, total });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// REMOVE ITEM from draft PO
// ══════════════════════════════════════════════════════════════════
exports.removePoItem = async (req, res) => {
    const locale  = req.locale || 'en';
    const poId    = parseInt(req.params.po_id, 10);
    const itemId  = parseInt(req.params.item_id, 10);

    try {
        const po = await care_wh_purchase_orders.findByPk(poId);
        if (!po || po.status !== 'draft')
            return res.status(400).json({ ok: false, error: locale === 'fr' ? 'Non modifiable.' : 'Not editable.' });

        await care_wh_po_items.destroy({ where: { item_id: itemId, po_id: poId } });
        const total = await recalcPoTotal(poId);
        await logActivity(req,
            `Item #${itemId} removed from PO #${poId} by ${actor(req.user)}`,
            true, 'purchaseOrderController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, total });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// SUBMIT FOR APPROVAL (draft → pending_director)
// ══════════════════════════════════════════════════════════════════
exports.submitPo = async (req, res) => {
    const locale = req.locale || 'en';
    const poId   = parseInt(req.params.po_id, 10);
    try {
        const po = await care_wh_purchase_orders.findByPk(poId, {
            include: [{ model: care_wh_po_items, as: 'items' }],
        });
        if (!po) return res.status(404).json({ ok: false, error: 'Not found' });
        if (po.status !== 'draft') return res.status(400).json({ ok: false, error: 'Already submitted.' });
        if (!po.items || po.items.length === 0)
            return res.status(400).json({ ok: false, error: locale === 'fr' ? 'La commande est vide.' : 'PO has no items.' });

        // If creator has Warehouse.Approve.Manager permission, skip pending_manager step
        const hasManagerPerm = req.user.permissions.includes('Warehouse.Approve.Manager') ||
                               req.user.permissions.includes('Admin.FullAccess');
        const nextStatus = hasManagerPerm ? 'pending_director' : 'pending_manager';
        await po.update({ status: nextStatus, modify_time: new Date() });
        await logActivity(req,
            'PO ' + po.po_number + ' submitted by ' + actor(req.user) +
            ' -> ' + (hasManagerPerm ? 'pending_director (self-approved)' : 'pending_manager'),
            true, 'purchaseOrderController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: nextStatus });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// MANAGER APPROVE (pending_manager → pending_director)
// ══════════════════════════════════════════════════════════════════
exports.managerApprove = async (req, res) => {
    const poId = parseInt(req.params.po_id, 10);
    try {
        if (!req.user.permissions.includes('Warehouse.Approve.Manager') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const po = await care_wh_purchase_orders.findByPk(poId);
        if (!po) return res.status(404).json({ ok: false, error: 'Not found' });
        if (po.status !== 'pending_manager')
            return res.status(400).json({ ok: false, error: 'Not awaiting manager approval.' });

        const now = new Date();
        await po.update({
            status:              'pending_director',
            manager_approved_by: actor(req.user),
            manager_approved_at: now,
            modify_time:         now,
        });
        await logActivity(req,
            'PO ' + po.po_number + ' approved by warehouse manager ' + actor(req.user),
            true, 'purchaseOrderController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: 'pending_director' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// DIRECTOR APPROVE (pending_director → pending_finance)
// ══════════════════════════════════════════════════════════════════
exports.directorApprove = async (req, res) => {
    const poId = parseInt(req.params.po_id, 10);
    try {
        // Permission check
        if (!req.user.permissions.includes('Warehouse.Approve.Director') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const po = await care_wh_purchase_orders.findByPk(poId);
        if (!po) return res.status(404).json({ ok: false, error: 'Not found' });
        if (po.status !== 'pending_director')
            return res.status(400).json({ ok: false, error: 'Not awaiting director approval.' });

        const now = new Date();
        await po.update({
            status:                'pending_finance',
            director_approved_by:  actor(req.user),
            director_approved_at:  now,
            modify_time:           now,
        });
        await logActivity(req,
            'PO ' + po.po_number + ' approved by director ' + actor(req.user),
            true, 'purchaseOrderController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: 'pending_finance' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// FINANCE APPROVE (pending_finance → approved)
// ══════════════════════════════════════════════════════════════════
exports.financeApprove = async (req, res) => {
    const poId = parseInt(req.params.po_id, 10);
    try {
        if (!req.user.permissions.includes('Warehouse.Approve.Finance') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const po = await care_wh_purchase_orders.findByPk(poId);
        if (!po) return res.status(404).json({ ok: false, error: 'Not found' });
        if (po.status !== 'pending_finance')
            return res.status(400).json({ ok: false, error: 'Not awaiting finance approval.' });

        const now = new Date();
        await po.update({
            status:               'approved',
            finance_approved_by:  actor(req.user),
            finance_approved_at:  now,
            modify_time:          now,
        });
        await logActivity(req,
            'PO ' + po.po_number + ' approved by finance ' + actor(req.user),
            true, 'purchaseOrderController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: 'approved' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// REJECT — Director or Finance can reject back to draft
// ══════════════════════════════════════════════════════════════════
exports.rejectPo = async (req, res) => {
    const poId   = parseInt(req.params.po_id, 10);
    const reason = (req.body.reason || '').trim();
    try {
        const po = await care_wh_purchase_orders.findByPk(poId);
        if (!po) return res.status(404).json({ ok: false, error: 'Not found' });
        if (!['pending_director','pending_finance'].includes(po.status))
            return res.status(400).json({ ok: false, error: 'Cannot reject at this stage.' });

        const note = reason ? ' — Reason: ' + reason : '';
        await po.update({
            status:      'draft',
            notes:       (po.notes || '') + '\n[' + new Date().toISOString() + '] Rejected by ' + actor(req.user) + note,
            modify_time: new Date(),
        });
        await logActivity(req,
            'PO ' + po.po_number + ' rejected by ' + actor(req.user) + note,
            true, 'purchaseOrderController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: 'draft' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// MARK AS SENT (approved → sent) — Warehouse Manager
// ══════════════════════════════════════════════════════════════════
exports.markSent = async (req, res) => {
    const locale = req.locale || 'en';
    const poId   = parseInt(req.params.po_id, 10);
    try {
        if (!req.user.permissions.includes('Warehouse.Create.PurchaseOrder') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const po = await care_wh_purchase_orders.findByPk(poId);
        if (!po) return res.status(404).json({ ok: false, error: 'Not found' });
        if (po.status !== 'approved')
            return res.status(400).json({
                ok: false,
                error: locale === 'fr' ? 'La commande doit être approuvée avant envoi.' : 'PO must be approved before sending.'
            });

        const now = new Date();
        await po.update({ status: 'sent', sent_at: now, modify_time: now });
        await logActivity(req,
            'PO ' + po.po_number + ' marked as sent by ' + actor(req.user),
            true, 'purchaseOrderController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: 'sent' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// CANCEL
// ══════════════════════════════════════════════════════════════════
exports.cancelPo = async (req, res) => {
    const poId   = parseInt(req.params.po_id, 10);
    const reason = (req.body.reason || '').trim();
    try {
        const po = await care_wh_purchase_orders.findByPk(poId);
        if (!po) return res.status(404).json({ ok: false, error: 'Not found' });
        if (['received','closed','cancelled'].includes(po.status))
            return res.status(400).json({ ok: false, error: 'Cannot cancel at this stage.' });

        await po.update({
            status:      'cancelled',
            notes:       (po.notes || '') + '\n[' + new Date().toISOString() + '] Cancelled by ' + actor(req.user) + (reason ? ': ' + reason : ''),
            modify_time: new Date(),
        });
        await care_wh_po_items.update(
            { status: 'cancelled' },
            { where: { po_id: poId, status: 'pending' } }
        );
        await logActivity(req,
            'PO ' + po.po_number + ' cancelled by ' + actor(req.user),
            true, 'purchaseOrderController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// PRINT — render printable PO document
// ══════════════════════════════════════════════════════════════════
exports.printPo = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const poId   = parseInt(req.params.po_id, 10);

        const po = await care_wh_purchase_orders.findByPk(poId, {
            include: [
                { model: care_wh_suppliers,  as: 'supplier' },
                { model: care_wh_rfq,        as: 'rfq', attributes: ['rfq_id','rfq_number'], required: false },
                { model: care_wh_deliveries, as: 'deliveries',
                  attributes: ['delivery_id','delivery_ref','received_by','received_at','status'],
                  required: false },
                { model: care_wh_po_items,  as: 'items',
                  include: [{ model: care_wh_products, as: 'product',
                    attributes: ['name','item_code','unit_of_measure'] }] },
            ],
        });
        if (!po) return res.status(404).send('Not found');

        const facility = await getCurrentFacilityDetails(req);

        res.render('warehouse/purchase-orders/print', {
            title:     po.po_number,
            po,
            fmtFCFA,
            printDate: new Date(),
            user:      req.user,
            facility,
        });
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════
// PRODUCT PRICE JSON — get preferred price for a product
// ══════════════════════════════════════════════════════════════════
exports.productPriceJson = async (req, res) => {
    try {
        const pid = parseInt(req.params.product_id, 10);
        const ps = await care_wh_product_suppliers.findOne({
            where: { product_id: pid, is_preferred: 1 },
            attributes: ['unit_price','lead_time_days','supplier_id'],
        });
        const product = await care_wh_products.findByPk(pid, {
            attributes: ['reorder_quantity','unit_of_measure'],
        });
        res.json({
            ok: true,
            unit_price:       ps ? parseFloat(ps.unit_price) : 0,
            reorder_quantity: product ? product.reorder_quantity : 0,
            unit_of_measure:  product ? product.unit_of_measure : '',
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// RECEIVE FORM — GET /warehouse/purchase-orders/:po_id/receive
// ══════════════════════════════════════════════════════════════════
exports.receiveForm = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const poId   = parseInt(req.params.po_id, 10);

        const po = await care_wh_purchase_orders.findByPk(poId, {
            include: [
                { model: care_wh_suppliers, as: 'supplier' },
                { model: care_wh_po_items,  as: 'items',
                  where:  { status: { [Op.in]: ['pending','partial'] } },
                  required: false,
                  include: [{ model: care_wh_products, as: 'product',
                    attributes: ['name','item_code','unit_of_measure'] }] },
            ],
        });
        if (!po) return res.status(404).send(locale === 'fr' ? 'Commande introuvable.' : 'PO not found.');
        if (!['sent','partial'].includes(po.status))
            return res.status(400).send(locale === 'fr'
                ? 'Seules les commandes envoyées ou partielles peuvent être réceptionnées.'
                : 'Only sent or partial POs can be received.');

        // Previous deliveries for reference
        const deliveries = await care_wh_deliveries.findAll({
            where:   { po_id: poId },
            include: [{ model: care_wh_delivery_items, as: 'items',
                include: [{ model: care_wh_products, as: 'product',
                    attributes: ['name','item_code'] }] }],
            order:   [['received_at','DESC']],
        });

        res.render('warehouse/purchase-orders/receive', {
            title:      (locale === 'fr' ? 'Réception — ' : 'Receive — ') + po.po_number,
            activePage: 'warehouse',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            po,
            deliveries,
            fmtFCFA,
            today:      todayLocalStr(),
        });
    } catch (err) {
        console.error('Receive form error:', err);
        res.status(500).send('Error: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════
// RECEIVE POST — POST /warehouse/purchase-orders/:po_id/receive
// Records delivery, updates stock, updates PO status
// ══════════════════════════════════════════════════════════════════
exports.receiveDelivery = async (req, res) => {
    const locale = req.locale || 'en';
    const poId   = parseInt(req.params.po_id, 10);
    const {
        delivery_ref,
        delivered_by,
        notes,
        items,          // array of { po_item_id, product_id, qty_received, batch_number, lot_number, expiry_date }
    } = req.body;

    // Normalise items array
    const rawItems = Array.isArray(items) ? items : (items ? [items] : []);

    const errors = [];
    if (!rawItems.length)
        errors.push(locale === 'fr' ? 'Aucun article saisi.' : 'No items entered.');

    // Validate: expiry_date required, qty > 0
    rawItems.forEach((item, idx) => {
        const qty = parseInt(item.qty_received, 10) || 0;
        if (qty <= 0) errors.push('Item ' + (idx + 1) + ': ' + (locale === 'fr' ? 'Quantité invalide.' : 'Invalid quantity.'));
        if (!item.expiry_date) errors.push('Item ' + (idx + 1) + ': ' + (locale === 'fr' ? 'Date de péremption requise.' : 'Expiry date required.'));
    });

    if (errors.length) {
        // Re-render form with errors
        const po = await care_wh_purchase_orders.findByPk(poId, {
            include: [
                { model: care_wh_suppliers, as: 'supplier' },
                { model: care_wh_po_items,  as: 'items',
                  where: { status: { [Op.in]: ['pending','partial'] } }, required: false,
                  include: [{ model: care_wh_products, as: 'product', attributes: ['name','item_code','unit_of_measure'] }] },
            ],
        });
        const deliveries = await care_wh_deliveries.findAll({ where: { po_id: poId }, order: [['received_at','DESC']] });
        return res.render('warehouse/purchase-orders/receive', {
            title: (locale === 'fr' ? 'Réception — ' : 'Receive — ') + (po ? po.po_number : poId),
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            po, deliveries, fmtFCFA, today: todayLocalStr(), errors,
        });
    }

    try {
        const po = await care_wh_purchase_orders.findByPk(poId, {
            include: [{ model: care_wh_po_items, as: 'items' }],
        });
        if (!po) return res.status(404).json({ ok: false, error: 'Not found' });

        const now  = new Date();
        const actorName = actor(req.user);

        // ── Create delivery record ────────────────────────────────
        const delivery = await care_wh_deliveries.create({
            po_id:        poId,
            delivery_ref: delivery_ref ? delivery_ref.trim() : null,
            delivered_by: delivered_by ? delivered_by.trim() : null,
            received_by:  actorName,
            received_at:  now,
            status:       'pending_qc',
            notes:        notes ? notes.trim() : null,
        });

        // ── Process each item ─────────────────────────────────────
        let allFulfilled   = true;
        let anyReceived    = false;

        for (const item of rawItems) {
            const poItemId  = parseInt(item.po_item_id, 10);
            const productId = parseInt(item.product_id, 10);
            const qtyRcvd   = parseInt(item.qty_received, 10) || 0;
            const batch     = (item.batch_number || '').trim() || null;
            const lot       = (item.lot_number   || '').trim() || null;
            const expiry    = item.expiry_date || null;

            if (qtyRcvd <= 0) continue;
            anyReceived = true;

            // Create delivery item
            const delivItem = await care_wh_delivery_items.create({
                delivery_id:        delivery.delivery_id,
                po_item_id:         poItemId,
                product_id:         productId,
                quantity_delivered: qtyRcvd,
                batch_number:       batch,
                lot_number:         lot,
                expiry_date:        expiry,
            });

            // Update po_item quantity_received and status
            const poItem = po.items.find(i => i.item_id === poItemId);
            if (poItem) {
                const newQtyRcvd = (poItem.quantity_received || 0) + qtyRcvd;
                const newStatus  = newQtyRcvd >= poItem.quantity_ordered ? 'received' : 'partial';
                if (newStatus !== 'received') allFulfilled = false;
                await poItem.update({ quantity_received: newQtyRcvd, status: newStatus });
            }

            // Stock added after QC pass + shelving (deliveryController.shelveItems)
        }

        // PO remains 'sent' — status updates to partial/received after QC+shelving
        await logActivity(req,
            'Delivery received for PO ' + po.po_number + ' — pending QC',
            true, 'purchaseOrderController.js', req.user.user_id, req.user.username);

        res.redirect('/warehouse/purchase-orders/' + poId + '?success=received');
    } catch (err) {
        console.error('Receive delivery error:', err);
        res.status(500).send('Error: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════
// CLOSE PO — POST /warehouse/purchase-orders/:po_id/close
// Manager closes partial PO when vendor cannot fulfil remainder
// ══════════════════════════════════════════════════════════════════
exports.closePo = async (req, res) => {
    const poId  = parseInt(req.params.po_id, 10);
    const reason = (req.body.reason || '').trim();
    try {
        if (!req.user.permissions.includes('Warehouse.Approve.Manager') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const po = await care_wh_purchase_orders.findByPk(poId);
        if (!po) return res.status(404).json({ ok: false, error: 'Not found' });
        if (!['partial','received'].includes(po.status))
            return res.status(400).json({ ok: false, error: 'Only partial or received POs can be closed.' });

        await po.update({
            status:      'closed',
            notes:       (po.notes || '') + '\n[' + new Date().toISOString() + '] Closed by ' +
                         actor(req.user) + (reason ? ': ' + reason : ''),
            modify_time: new Date(),
        });
        await logActivity(req,
            'PO ' + po.po_number + ' closed by ' + actor(req.user) + (reason ? ' — ' + reason : ''),
            true, 'purchaseOrderController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};






