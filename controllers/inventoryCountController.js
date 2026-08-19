
// controllers/inventoryCountController.js
'use strict';
const { Op, fn, col } = require('sequelize');
const logActivity = require('../utils/activityLogger');
const { getCurrentFacilityDetails } = require('../utils/facilityHelper');
const {
    care_wh_inventory_counts,
    care_wh_inventory_count_items,
    care_wh_products,
    care_wh_product_categories,
    care_wh_stock,
    care_wh_stock_movements,
    care_wh_locations,
} = require('../models');

// ── Helpers ───────────────────────────────────────────────────────
const actor = (user) =>
    (user && user.firstName && user.lastName)
        ? (user.firstName + ' ' + user.lastName).trim()
        : (user && user.username) || 'unknown';

// Generate count number: CNT-YYYYNNNN
const generateCountNumber = async () => {
    const year   = new Date().getFullYear();
    const prefix = 'CNT-' + year;
    const last   = await care_wh_inventory_counts.findOne({
        where: { count_number: { [Op.like]: prefix + '%' } },
        order: [['count_id', 'DESC']], attributes: ['count_number'],
    });
    let seq = 1;
    if (last) {
        const n = parseInt(last.count_number.slice(prefix.length), 10);
        if (!isNaN(n)) seq = n + 1;
    }
    return prefix + String(seq).padStart(4, '0');
};

// Check if any active lock exists
exports.isStockLocked = async () => {
    const locked = await care_wh_inventory_counts.findOne({
        where: { is_locked: 1, status: { [Op.in]: ['in_progress','pending_approval'] } },
    });
    return locked ? locked.count_number : null;
};

// ══════════════════════════════════════════════════════════════════
// LIST
// ══════════════════════════════════════════════════════════════════
exports.listCounts = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const counts = await care_wh_inventory_counts.findAll({
            order: [['count_id', 'DESC']], limit: 50,
        });
        res.render('warehouse/inventory-count/list', {
            title:      locale === 'fr' ? 'Inventaires physiques' : 'Inventory Counts',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(), counts,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// CREATE FORM
// ══════════════════════════════════════════════════════════════════
exports.createCountForm = async (req, res) => {
    try {
        const locale     = req.locale || 'en';
        const categories = await care_wh_product_categories.findAll({
            where: { is_active: 1 }, order: [['parent_id','ASC'],['name','ASC']],
        });
        res.render('warehouse/inventory-count/form', {
            title:      locale === 'fr' ? 'Nouvel inventaire' : 'New Inventory Count',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            categories, errors: [],
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// CREATE POST — manager initiates, system builds the line list
// ══════════════════════════════════════════════════════════════════
exports.createCount = async (req, res) => {
    const locale = req.locale || 'en';
    const { count_type, count_date, category_id, abc_class, notes } = req.body;

    if (!count_type || !count_date) {
        const categories = await care_wh_product_categories.findAll({ where: { is_active: 1 }, order: [['parent_id','ASC'],['name','ASC']] });
        return res.render('warehouse/inventory-count/form', {
            title: locale === 'fr' ? 'Nouvel inventaire' : 'New Inventory Count',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            categories, errors: [locale === 'fr' ? 'Type et date requis.' : 'Type and date required.'],
        });
    }

    try {
        // Build product filter based on count type
        const productWhere = { is_active: 1 };
        if (category_id) productWhere.category_id = parseInt(category_id, 10);
        if (count_type === 'cycle_20pct') productWhere.abc_class = 'A'; // Count class A first
        if (abc_class)                    productWhere.abc_class = abc_class;

        const products = await care_wh_products.findAll({
            where: productWhere, order: [['name', 'ASC']],
            attributes: ['product_id', 'current_stock'],
        });

        if (products.length === 0) {
            const categories = await care_wh_product_categories.findAll({ where: { is_active: 1 }, order: [['parent_id','ASC'],['name','ASC']] });
            return res.render('warehouse/inventory-count/form', {
                title: locale === 'fr' ? 'Nouvel inventaire' : 'New Inventory Count',
                activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
                categories,
                errors: [locale === 'fr' ? 'Aucun produit correspond aux critères.' : 'No products match the criteria.'],
            });
        }

        const countNumber = await generateCountNumber();
        const count = await care_wh_inventory_counts.create({
            count_number: countNumber,
            count_type,
            status:       'draft',
            count_date,
            initiated_by: actor(req.user),
            is_locked:    0,
            notes:        notes ? notes.trim() : null,
        });

        // Build count lines — capture current system_qty from care_wh_products.current_stock
        for (const p of products) {
            await care_wh_inventory_count_items.create({
                count_id:   count.count_id,
                product_id: p.product_id,
                system_qty: p.current_stock || 0,
                counted_qty: null,
                adjustment_applied: 0,
            });
        }

        await logActivity(req,
            'Inventory count ' + countNumber + ' created — ' + products.length + ' products',
            true, 'inventoryCountController.js', req.user.user_id, req.user.username);

        res.redirect('/warehouse/inventory-counts/' + count.count_id + '?success=created');
    } catch (err) {
        console.error('Create count error:', err);
        const categories = await care_wh_product_categories.findAll({ where: { is_active: 1 }, order: [['parent_id','ASC'],['name','ASC']] });
        res.render('warehouse/inventory-count/form', {
            title: locale === 'fr' ? 'Nouvel inventaire' : 'New Inventory Count',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            categories, errors: [err.message],
        });
    }
};

// ══════════════════════════════════════════════════════════════════
// DETAIL / ENTER RESULTS
// ══════════════════════════════════════════════════════════════════
exports.countDetail = async (req, res) => {
    try {
        const locale  = req.locale || 'en';
        const countId = parseInt(req.params.count_id, 10);
        const count   = await care_wh_inventory_counts.findByPk(countId, {
            include: [{ model: care_wh_inventory_count_items, as: 'items',
                include: [{ model: care_wh_products, as: 'product',
                    attributes: ['name','item_code','unit_of_measure','abc_class'] }] }],
        });
        if (!count) return res.status(404).send('Not found');

        res.render('warehouse/inventory-count/detail', {
            title:      count.count_number,
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            count, success: req.query.success || null,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// START COUNT (draft → in_progress + lock stock)
// ══════════════════════════════════════════════════════════════════
exports.startCount = async (req, res) => {
    const countId = parseInt(req.params.count_id, 10);
    try {
        const count = await care_wh_inventory_counts.findByPk(countId);
        if (!count || count.status !== 'draft')
            return res.status(400).json({ ok: false, error: 'Count not in draft status.' });

        // Check no other count is locked
        const existingLock = await care_wh_inventory_counts.findOne({
            where: { is_locked: 1, count_id: { [Op.ne]: countId },
                     status: { [Op.in]: ['in_progress','pending_approval'] } },
        });
        if (existingLock)
            return res.status(400).json({ ok: false, error: 'Another count (' + existingLock.count_number + ') is already in progress. Complete it first.' });

        await count.update({ status: 'in_progress', is_locked: 1 });
        await logActivity(req, 'Inventory count ' + count.count_number + ' started — stock movements locked',
            true, 'inventoryCountController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// SAVE COUNT RESULTS (batch save)
// ══════════════════════════════════════════════════════════════════
exports.saveResults = async (req, res) => {
    const countId = parseInt(req.params.count_id, 10);
    const { results } = req.body;
    // results = [{ item_id, counted_qty, variance_reason }]
    try {
        const count = await care_wh_inventory_counts.findByPk(countId);
        if (!count || count.status !== 'in_progress')
            return res.status(400).json({ ok: false, error: 'Count is not in progress.' });

        const now = new Date();
        for (const r of results) {
            const qty = parseInt(r.counted_qty, 10);
            if (isNaN(qty)) continue;
            await care_wh_inventory_count_items.update(
                {
                    counted_qty:      qty,
                    variance_reason:  r.variance_reason || null,
                    counted_by:       actor(req.user),
                    counted_at:       now,
                },
                { where: { id: r.item_id, count_id: countId } }
            );
        }
        await logActivity(req,
            `Count results saved for inventory count #${countId} (${results.length} item(s)) by ${actor(req.user)}`,
            true, 'inventoryCountController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// SUBMIT FOR APPROVAL (in_progress → pending_approval)
// ══════════════════════════════════════════════════════════════════
exports.submitCount = async (req, res) => {
    const countId = parseInt(req.params.count_id, 10);
    try {
        const count = await care_wh_inventory_counts.findByPk(countId, {
            include: [{ model: care_wh_inventory_count_items, as: 'items' }],
        });
        if (!count || count.status !== 'in_progress')
            return res.status(400).json({ ok: false, error: 'Count not in progress.' });

        // All items must have counted_qty
        const uncounted = count.items.filter(i => i.counted_qty === null);
        if (uncounted.length > 0)
            return res.status(400).json({
                ok: false,
                error: uncounted.length + (req.locale === 'fr'
                    ? ' article(s) non comptés. Complétez le comptage.'
                    : ' item(s) not yet counted. Complete the count first.'),
            });

        // Check variances without reasons
        const missingReasons = count.items.filter(i =>
            i.counted_qty !== null && i.counted_qty !== i.system_qty && !i.variance_reason);
        if (missingReasons.length > 0)
            return res.status(400).json({
                ok: false,
                error: missingReasons.length + (req.locale === 'fr'
                    ? ' écart(s) sans raison. Veuillez expliquer les différences.'
                    : ' variance(s) without reason. Please explain the differences.'),
            });

        await count.update({ status: 'pending_approval' });
        await logActivity(req, 'Inventory count ' + count.count_number + ' submitted for approval',
            true, 'inventoryCountController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// APPROVE & APPLY ADJUSTMENTS (pending_approval → approved)
// ══════════════════════════════════════════════════════════════════
exports.approveCount = async (req, res) => {
    const countId = parseInt(req.params.count_id, 10);
    try {
        if (!req.user.permissions.includes('Warehouse.Approve.InventoryCount') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const count = await care_wh_inventory_counts.findByPk(countId, {
            include: [{ model: care_wh_inventory_count_items, as: 'items' }],
        });
        if (!count || count.status !== 'pending_approval')
            return res.status(400).json({ ok: false, error: 'Not awaiting approval.' });

        const now = new Date();
        let adjustmentsApplied = 0;

        for (const item of count.items) {
            if (item.counted_qty === null || item.adjustment_applied) continue;
            const variance = item.counted_qty - item.system_qty;
            if (variance === 0) { await item.update({ adjustment_applied: 1 }); continue; }

            // Apply adjustment to care_wh_products.current_stock
            await care_wh_products.update(
                { current_stock: item.counted_qty },
                { where: { product_id: item.product_id } }
            );

            // Write immutable ledger entry
            await care_wh_stock_movements.create({
                product_id:     item.product_id,
                movement_type:  'adjustment',
                quantity:       variance,
                reference_id:   countId,
                reference_type: 'inventory_count',
                performed_by:   actor(req.user),
                performed_at:   now,
                notes:          'Inventory count ' + count.count_number + ' — ' + (item.variance_reason || 'No reason given'),
            });

            await item.update({ adjustment_applied: 1 });
            adjustmentsApplied++;
        }

        await count.update({
            status:      'approved',
            is_locked:   0,
            approved_by: actor(req.user),
            approved_at: now,
        });

        await logActivity(req,
            'Inventory count ' + count.count_number + ' approved — ' + adjustmentsApplied + ' adjustment(s) applied',
            true, 'inventoryCountController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, adjustments: adjustmentsApplied });
    } catch (err) {
        console.error('Approve count error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// CANCEL COUNT (draft or in_progress → cancelled, releases lock)
// ══════════════════════════════════════════════════════════════════
exports.cancelCount = async (req, res) => {
    const countId = parseInt(req.params.count_id, 10);
    const reason  = (req.body.reason || '').trim();
    try {
        if (!req.user.permissions.includes('Warehouse.Initiate.InventoryCount') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });
        const count = await care_wh_inventory_counts.findByPk(countId);
        if (!count) return res.status(404).json({ ok: false, error: 'Not found' });
        if (['approved','cancelled'].includes(count.status))
            return res.status(400).json({ ok: false, error: 'Cannot cancel at this stage.' });
        await count.update({
            status:    'cancelled',
            is_locked: 0,
            notes:     (count.notes || '') + '\n[' + new Date().toISOString() + '] Cancelled by ' +
                       actor(req.user) + (reason ? ': ' + reason : ''),
        });
        await logActivity(req,
            'Inventory count ' + count.count_number + ' cancelled by ' + actor(req.user),
            true, 'inventoryCountController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// PRINT COUNT SHEET (blank — no system_qty shown)
// ══════════════════════════════════════════════════════════════════
exports.printCountSheet = async (req, res) => {
    try {
        const countId = parseInt(req.params.count_id, 10);
        const count   = await care_wh_inventory_counts.findByPk(countId, {
            include: [{ model: care_wh_inventory_count_items, as: 'items',
                include: [
                    { model: care_wh_products,  as: 'product',
                      attributes: ['name','item_code','unit_of_measure','abc_class'] },
                    { model: care_wh_locations, as: 'location', attributes: ['label'], required: false },
                ] }],
        });
        if (!count) return res.status(404).send('Not found');
        const facility = await getCurrentFacilityDetails(req);
        res.render('warehouse/inventory-count/print', {
            count, printDate: new Date(), user: req.user, facility,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};






