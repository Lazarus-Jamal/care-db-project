
// controllers/stockController.js
'use strict';
const { Op, fn, col, literal } = require('sequelize');
const logActivity = require('../utils/activityLogger');
const sequelize   = require('../config/database');
const { todayLocalStr, addDaysLocalStr } = require('../utils/dateHelpers');
const {
    care_wh_stock,
    care_wh_stock_movements,
    care_wh_products,
    care_wh_product_categories,
    care_wh_locations,
    care_wh_pharmacy_orders,
    care_wh_pharmacy_order_items,
    care_pharma_transit,
} = require('../models');

const actor  = (u) => (u && u.firstName && u.lastName)
    ? (u.firstName + ' ' + u.lastName).trim() : (u && u.username) || 'unknown';
const fmtFCFA = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

const generateOrderNumber = async () => {
    const year   = new Date().getFullYear();
    const prefix = 'ISS-' + year;
    const last   = await care_wh_pharmacy_orders.findOne({
        where: { order_number: { [Op.like]: prefix + '%' } },
        order: [['order_id','DESC']], attributes: ['order_number'],
    });
    let seq = 1;
    if (last) {
        const n = parseInt(last.order_number.slice(prefix.length), 10);
        if (!isNaN(n)) seq = n + 1;
    }
    return prefix + String(seq).padStart(4, '0');
};

// ══════════════════════════════════════════════════════════════════
// STOCK STATUS — by product + by location tabs
// ══════════════════════════════════════════════════════════════════
exports.stockStatus = async (req, res) => {
    try {
        const locale  = req.locale || 'en';
        const tab     = req.query.tab || 'location';
        const search  = (req.query.search || '').trim();
        const TODAY   = todayLocalStr();
        const IN_30   = addDaysLocalStr(30);
        const IN_7    = addDaysLocalStr(7);

        // ── By product ───────────────────────────────────────────
        const productWhere = { is_active: 1 };
        if (search) productWhere[Op.or] = [
            { name:      { [Op.like]: '%' + search + '%' } },
            { item_code: { [Op.like]: '%' + search + '%' } },
        ];

        const products = await care_wh_products.findAll({
            where:   productWhere,
            include: [
                { model: care_wh_product_categories, as: 'category', attributes: ['name'] },
                { model: care_wh_stock, as: 'stockBatches',
                  required: false,
                  where:    { quantity: { [Op.gt]: 0 } },
                  include:  [{ model: care_wh_locations, as: 'location',
                      attributes: ['label','aisle'], required: false }],
                  order:    [['expiry_date','ASC']] },
            ],
            order: [['name','ASC']],
        });

        // ── By location ──────────────────────────────────────────
        const locations = await care_wh_locations.findAll({
            where:   { is_active: 1 },
            include: [{ model: care_wh_stock, as: 'stock',
                where:    { quantity: { [Op.gt]: 0 } },
                required: false,
                include:  [{ model: care_wh_products, as: 'product',
                    attributes: ['name','item_code','unit_of_measure','reorder_level'] }],
                order:    [['expiry_date','ASC']] }],
            order: [['aisle','ASC'],['label','ASC']],
        });

        // ── Recent movements (for ledger tab) ────────────────────
        const recentMovements = await care_wh_stock_movements.findAll({
            include: [{ model: care_wh_products, as: 'product',
                attributes: ['name','item_code'] }],
            order: [['performed_at','DESC']],
            limit:  20,
        });

        res.render('warehouse/stock/status', {
            title:      locale === 'fr' ? 'État du stock' : 'Stock Status',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            tab, search, products, locations, recentMovements,
            TODAY, IN_30, IN_7, fmtFCFA,
        });
    } catch (err) {
        console.error('Stock status error:', err);
        res.status(500).send('Error: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════
// FULL MOVEMENTS LEDGER
// ══════════════════════════════════════════════════════════════════
exports.movementsLedger = async (req, res) => {
    try {
        const locale   = req.locale || 'en';
        const page     = Math.max(1, parseInt(req.query.page, 10) || 1);
        const PER      = 50;
        const type     = req.query.type  || '';
        const search   = (req.query.search || '').trim();
        const dateFrom = req.query.date_from || '';
        const dateTo   = req.query.date_to   || '';

        const where = {};
        if (type)   where.movement_type = type;
        if (dateFrom || dateTo) {
            where.performed_at = {};
            if (dateFrom) where.performed_at[Op.gte] = dateFrom + ' 00:00:00';
            if (dateTo)   where.performed_at[Op.lte] = dateTo   + ' 23:59:59';
        }

        const { count, rows: movements } = await care_wh_stock_movements.findAndCountAll({
            where,
            include: [{ model: care_wh_products, as: 'product',
                where:    search ? { [Op.or]: [
                    { name:      { [Op.like]: '%' + search + '%' } },
                    { item_code: { [Op.like]: '%' + search + '%' } },
                ]} : undefined,
                attributes: ['name','item_code'] }],
            order:  [['performed_at','DESC']],
            limit:  PER,
            offset: (page - 1) * PER,
        });

        res.render('warehouse/stock/movements', {
            title:      locale === 'fr' ? 'Mouvements de stock' : 'Stock Movements',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            movements, count,
            totalPages: Math.ceil(count / PER), currentPage: page,
            typeFilter: type, search, dateFrom, dateTo,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// EXPIRY REPORT
// ══════════════════════════════════════════════════════════════════
exports.expiryReport = async (req, res) => {
    try {
        const locale  = req.locale || 'en';
        const TODAY   = todayLocalStr();
        const IN_7    = addDaysLocalStr(7);
        const IN_30   = addDaysLocalStr(30);

        const batches = await care_wh_stock.findAll({
            where:   { quantity: { [Op.gt]: 0 } },
            include: [
                { model: care_wh_products,  as: 'product',
                  attributes: ['name','item_code','unit_of_measure'] },
                { model: care_wh_locations, as: 'location',
                  attributes: ['label','aisle'], required: false },
            ],
            order: [['expiry_date','ASC']],
        });

        // Bucket: expired / critical (≤7d) / warning (≤30d) / ok
        const expired  = batches.filter(b => b.expiry_date <= TODAY);
        const critical = batches.filter(b => b.expiry_date > TODAY && b.expiry_date <= IN_7);
        const warning  = batches.filter(b => b.expiry_date > IN_7  && b.expiry_date <= IN_30);
        const ok       = batches.filter(b => b.expiry_date > IN_30);

        res.render('warehouse/stock/expiry', {
            title:      locale === 'fr' ? 'Rapport de péremption' : 'Expiry Report',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            expired, critical, warning, ok, TODAY, IN_7, IN_30,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// ISSUE TO PHARMACY — form
// ══════════════════════════════════════════════════════════════════
exports.issueForm = async (req, res) => {
    try {
        const locale   = req.locale || 'en';
        const products = await care_wh_products.findAll({
            where:   { is_active: 1, current_stock: { [Op.gt]: 0 } },
            order:   [['name','ASC']],
            attributes: ['product_id','name','item_code','unit_of_measure','current_stock'],
        });
        res.render('warehouse/stock/issue', {
            title:      locale === 'fr' ? 'Émission — Pharmacie' : 'Issue to Pharmacy',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            products, errors: [],
            success:   req.query.success || null,
            warning:   req.query.warning  || null,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// ISSUE TO PHARMACY — POST (FEFO deduction)
// ══════════════════════════════════════════════════════════════════
exports.issueStock = async (req, res) => {
    const locale = req.locale || 'en';
    const { reference_number, notes, items } = req.body;
    const rawItems = Array.isArray(items) ? items : (items ? [items] : []);
    const errors   = [];

    if (!req.user.permissions.includes('Warehouse.Fulfil.PharmacyOrder') &&
        !req.user.permissions.includes('Admin.FullAccess'))
        errors.push(locale === 'fr' ? 'Permission refusee.' : 'Permission denied.');

    if (!rawItems.length)
        errors.push(locale === 'fr' ? 'Aucun article.' : 'No items.');
    rawItems.forEach((item, idx) => {
        if (!(parseInt(item.quantity_requested, 10) > 0))
            errors.push('Item ' + (idx + 1) + ': ' + (locale === 'fr' ? 'Quantité invalide.' : 'Invalid quantity.'));
    });

    if (errors.length) {
        const products = await care_wh_products.findAll({
            where: { is_active: 1, current_stock: { [Op.gt]: 0 } }, order: [['name','ASC']],
            attributes: ['product_id','name','item_code','unit_of_measure','current_stock'],
        });
        return res.render('warehouse/stock/issue', {
            title: locale === 'fr' ? 'Émission — Pharmacie' : 'Issue to Pharmacy',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            products, errors,
        });
    }

    try {
        const orderNumber = await generateOrderNumber();
        const now         = new Date();
        const actorName   = actor(req.user);

        // Wrapped in a transaction: order/item creation, FEFO deduction, and
        // movement/transit writes must all succeed together — a crash mid-loop
        // previously could leave stock decremented with no matching transit row.
        // If nothing could be issued for ANY item, the whole thing rolls back
        // (nothing persists) instead of leaving an 'in_transit' order behind
        // with no transit rows for pharmacy to ever receive.
        let anyIssued = false;
        const order = await sequelize.transaction(async (t) => {
            const order = await care_wh_pharmacy_orders.create({
                order_number:  orderNumber,
                requested_by:  actorName,
                requested_at:  now,
                status:        'in_transit',
                approved_by:   actorName,
                approved_at:   now,
                notes:         notes ? notes.trim() : null,
            }, { transaction: t });

            for (const item of rawItems) {
                const productId   = parseInt(item.product_id, 10);
                const requestedQty = parseInt(item.quantity_requested, 10);
                let   qtyNeeded    = requestedQty;
                let   totalIssued  = 0;
                let   lastBatch    = '';
                let   lastExpiry   = null;

                // FEFO: pick batches oldest expiry first
                const batches = await care_wh_stock.findAll({
                    where:  { product_id: productId, quantity: { [Op.gt]: 0 } },
                    order:  [['expiry_date','ASC']],
                    transaction: t, lock: t.LOCK.UPDATE,
                });

                for (const batch of batches) {
                    if (qtyNeeded <= 0) break;
                    const deduct = Math.min(qtyNeeded, batch.quantity);

                    await batch.update({ quantity: batch.quantity - deduct }, { transaction: t });
                    await care_wh_stock_movements.create({
                        product_id:     productId,
                        stock_id:       batch.stock_id,
                        movement_type:  'issue',
                        quantity:       -deduct,
                        reference_id:   order.order_id,
                        reference_type: 'pharmacy_order',
                        batch_number:   batch.batch_number,
                        expiry_date:    batch.expiry_date,
                        performed_by:   actorName,
                        performed_at:   now,
                        notes:          'Issue to pharmacy — ' + orderNumber +
                                        (reference_number ? ' / Ref: ' + reference_number : ''),
                    }, { transaction: t });

                    // Write transit row so pharmacy can accept and update their stock
                    const whProduct = await care_wh_products.findByPk(productId,
                        { attributes: ['name','item_code'], transaction: t });
                    await care_pharma_transit.create({
                        order_id:       order.order_id,
                        order_number:   orderNumber,
                        order_item_id:  0,          // no order_item row in issueStock path
                        product_id:     productId,
                        item_code:      whProduct ? whProduct.item_code : '',
                        product_name:   whProduct ? whProduct.name : '',
                        qty_in_transit: deduct,
                        batch_number:   batch.batch_number || null,
                        expiry_date:    batch.expiry_date || null,
                        dispatched_by:  actorName,
                        dispatched_at:  now,
                        status:         'in_transit',
                    }, { transaction: t });

                    qtyNeeded    -= deduct;
                    totalIssued  += deduct;
                    lastBatch     = batch.batch_number || '';
                    lastExpiry    = batch.expiry_date;
                }

                if (totalIssued > 0) {
                    anyIssued = true;
                    await care_wh_products.decrement('current_stock', {
                        by:    totalIssued,
                        where: { product_id: productId },
                        transaction: t,
                    });
                }

                await care_wh_pharmacy_order_items.create({
                    order_id:           order.order_id,
                    product_id:         productId,
                    quantity_requested: requestedQty,
                    quantity_issued:    totalIssued,
                    batch_number:       lastBatch,
                    expiry_date:        lastExpiry,
                    status:             totalIssued >= requestedQty ? 'issued'
                                       : totalIssued > 0 ? 'partial' : 'unavailable',
                }, { transaction: t });
            }

            if (!anyIssued) {
                const abortErr = new Error('No stock available for any requested item.');
                abortErr.isNoStockAvailable = true;
                throw abortErr; // rolls back the whole transaction — nothing persists
            }

            return order;
        });

        await logActivity(req,
            'Pharmacy issue ' + orderNumber + ' — ' + rawItems.length + ' product(s)',
            true, 'stockController.js', req.user.user_id, req.user.username);

        // Check for under-issued items and build warning
        const underIssued = [];
        const allOrderItems = await care_wh_pharmacy_order_items.findAll({
            where: { order_id: order.order_id },
        });
        allOrderItems.forEach(function(oi) {
            if (oi.quantity_issued < oi.quantity_requested) {
                underIssued.push(oi.product_id + ':' + oi.quantity_issued + '/' + oi.quantity_requested);
            }
        });
        const successParam = underIssued.length > 0
            ? orderNumber + '&warning=' + encodeURIComponent(underIssued.join(','))
            : orderNumber;
        res.redirect('/warehouse/stock/issue?success=' + successParam);
    } catch (err) {
        if (err.isNoStockAvailable) {
            await logActivity(req,
                'Pharmacy issue attempted — no stock available for any requested item',
                false, 'stockController.js', req.user.user_id, req.user.username);
        } else {
            console.error('Issue stock error:', err);
        }
        const products = await care_wh_products.findAll({
            where: { is_active: 1, current_stock: { [Op.gt]: 0 } }, order: [['name','ASC']],
            attributes: ['product_id','name','item_code','unit_of_measure','current_stock'],
        });
        res.render('warehouse/stock/issue', {
            title: locale === 'fr' ? 'Émission — Pharmacie' : 'Issue to Pharmacy',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            products,
            errors: [err.isNoStockAvailable
                ? (locale === 'fr' ? 'Aucun stock disponible pour les articles demandes.' : 'No stock available for any requested item.')
                : err.message],
        });
    }
};










