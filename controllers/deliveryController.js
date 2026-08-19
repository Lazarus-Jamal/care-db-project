// controllers/deliveryController.js
'use strict';
const { Op }      = require('sequelize');
const logActivity = require('../utils/activityLogger');
const {
    care_wh_deliveries,
    care_wh_delivery_items,
    care_wh_quality_checks,
    care_wh_stock,
    care_wh_stock_movements,
    care_wh_products,
    care_wh_locations,
    care_wh_purchase_orders,
    care_wh_po_items,
} = require('../models');

const actor = (u) => (u && u.firstName && u.lastName)
    ? (u.firstName + ' ' + u.lastName).trim() : (u && u.username) || 'unknown';

const fmtFCFA = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

// ── LIST ──────────────────────────────────────────────────────────
exports.listDeliveries = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const status = req.query.status || '';
        const where  = status ? { status } : {};
        const deliveries = await care_wh_deliveries.findAll({
            where,
            include: [{ model: care_wh_purchase_orders, as: 'po',
                attributes: ['po_number','supplier_id'],
                include: [{ model: require('../models').care_wh_suppliers,
                    as: 'supplier', attributes: ['name'] }] }],
            order: [['received_at','DESC']],
            limit:  50,
        });
        res.render('warehouse/deliveries/list', {
            title:      locale === 'fr' ? 'Livraisons' : 'Deliveries',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            deliveries, statusFilter: status,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ── DETAIL — 3-step pipeline view ────────────────────────────────
exports.deliveryDetail = async (req, res) => {
    try {
        const locale     = req.locale || 'en';
        const delivId    = parseInt(req.params.delivery_id, 10);
        const delivery   = await care_wh_deliveries.findByPk(delivId, {
            include: [
                { model: care_wh_purchase_orders, as: 'po',
                  attributes: ['po_id','po_number','total_amount'],
                  include: [{ model: require('../models').care_wh_suppliers,
                      as: 'supplier', attributes: ['name'] }] },
                { model: care_wh_delivery_items, as: 'items',
                  include: [
                      { model: care_wh_products, as: 'product',
                        attributes: ['name','item_code','unit_of_measure'] },
                      { model: care_wh_quality_checks, as: 'qcChecks',
                        required: false },
                      { model: care_wh_stock, as: 'stock',
                        required: false,
                        include: [{ model: care_wh_locations, as: 'location',
                            attributes: ['label','aisle','shelf'], required: false }] },
                  ]},
            ],
        });
        if (!delivery) return res.status(404).send('Not found');

        const locations = await care_wh_locations.findAll({
            where: { is_active: 1 }, order: [['aisle','ASC'],['label','ASC']],
        });

        res.render('warehouse/deliveries/detail', {
            title:      (locale === 'fr' ? 'Livraison #' : 'Delivery #') + delivId,
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            delivery, locations, fmtFCFA,
            success: req.query.success || null,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ── QC SUBMIT — pass/fail per item ────────────────────────────────
exports.submitQC = async (req, res) => {
    const locale  = req.locale || 'en';
    const delivId = parseInt(req.params.delivery_id, 10);
    const { results } = req.body;
    // results = [{ delivery_item_id, result, qty_accepted, qty_rejected,
    //              rejection_reason, temperature_ok, notes }]
    try {
        if (!req.user.permissions.includes('Warehouse.QC.Check') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const delivery = await care_wh_deliveries.findByPk(delivId, {
            include: [{ model: care_wh_delivery_items, as: 'items' }],
        });
        if (!delivery) return res.status(404).json({ ok: false, error: 'Not found' });
        if (!['pending_qc','qc_partial'].includes(delivery.status))
            return res.status(400).json({ ok: false, error: 'Delivery not in QC status.' });

        const now      = new Date();
        const actorName= actor(req.user);
        let allPassed  = true;
        let anyPassed  = false;

        for (const r of results) {
            const itemId      = parseInt(r.delivery_item_id, 10);
            const result      = r.result === 'pass' ? 'pass' : 'fail';
            const qtyAccepted = parseInt(r.qty_accepted, 10) || 0;
            const qtyRejected = parseInt(r.qty_rejected, 10) || 0;

            // Record QC check
            await care_wh_quality_checks.create({
                delivery_item_id:  itemId,
                checked_by:        actorName,
                checked_at:        now,
                result,
                quantity_accepted: qtyAccepted,
                quantity_rejected: qtyRejected,
                rejection_reason:  r.rejection_reason || null,
                temperature_ok:    r.temperature_ok   ? 1 : 0,
                notes:             r.notes            || null,
            });

            // Update delivery item qc_status
            const newQcStatus = result === 'pass' ? 'passed' : 'failed';
            await care_wh_delivery_items.update(
                { qc_status: newQcStatus },
                { where: { id: itemId } }
            );

            if (result === 'fail') {
                allPassed = false;
            } else {
                anyPassed = true;
            }
        }

        // Update delivery status
        const newDelivStatus = allPassed ? 'qc_passed' : (anyPassed ? 'qc_partial' : 'qc_failed');
        await delivery.update({ status: newDelivStatus });

        await logActivity(req,
            'QC completed for delivery #' + delivId + ' — status: ' + newDelivStatus,
            true, 'deliveryController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: newDelivStatus });
    } catch (err) {
        console.error('QC error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── SHELVE — assign location + add stock ─────────────────────────
exports.shelveItems = async (req, res) => {
    const locale  = req.locale || 'en';
    const delivId = parseInt(req.params.delivery_id, 10);
    const { shelves } = req.body;
    // shelves = [{ delivery_item_id, location_id }]
    try {
        if (!req.user.permissions.includes('Warehouse.Receive.Delivery') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const delivery = await care_wh_deliveries.findByPk(delivId, {
            include: [
                { model: care_wh_delivery_items, as: 'items' },
                { model: care_wh_purchase_orders, as: 'po' },
            ],
        });
        if (!delivery) return res.status(404).json({ ok: false, error: 'Not found' });
        if (!['qc_passed','qc_partial','shelved_partial'].includes(delivery.status))
            return res.status(400).json({ ok: false, error: 'Delivery must pass QC before shelving.' });

        const now       = new Date();
        const actorName = actor(req.user);
        let   shelvedCount = 0;

        for (const s of shelves) {
            const itemId    = parseInt(s.delivery_item_id, 10);
            const locationId= parseInt(s.location_id, 10);
            if (!locationId) continue;

            const item = delivery.items.find(i => i.id === itemId);
            if (!item || item.qc_status !== 'passed') continue;
            if (item.stock_id) continue; // already shelved

            // Create stock batch entry (FEFO)
            const stockEntry = await care_wh_stock.create({
                product_id:   item.product_id,
                location_id:  locationId,
                batch_number: item.batch_number || '',
                lot_number:   item.lot_number   || null,
                expiry_date:  item.expiry_date,
                quantity:     item.quantity_delivered,
                shelved_at:   now,
                shelved_by:   actorName,
            });

            // Link delivery item to stock entry
            await care_wh_delivery_items.update(
                { stock_id: stockEntry.stock_id },
                { where: { id: itemId } }
            );

            // Update product current_stock
            await care_wh_products.increment('current_stock', {
                by:    item.quantity_delivered,
                where: { product_id: item.product_id },
            });

            // Write stock movement ledger
            await care_wh_stock_movements.create({
                product_id:     item.product_id,
                stock_id:       stockEntry.stock_id,
                movement_type:  'receipt',
                quantity:       item.quantity_delivered,
                reference_id:   delivId,
                reference_type: 'delivery',
                batch_number:   item.batch_number || null,
                expiry_date:    item.expiry_date,
                performed_by:   actorName,
                performed_at:   now,
                notes:          'Shelved — ' + (delivery.po ? delivery.po.po_number : '') +
                                ' → Location #' + locationId,
            });

            shelvedCount++;
        }

        // Update PO item quantities received + PO status
        const allItems = delivery.items;
        for (const item of allItems) {
            if (item.qc_status !== 'passed') continue;
            const freshItem = await care_wh_delivery_items.findByPk(item.id);
            if (!freshItem.stock_id) continue;

            const poItem = await care_wh_po_items.findByPk(item.po_item_id);
            if (poItem) {
                const newQty    = (poItem.quantity_received || 0) + item.quantity_delivered;
                const newStatus = newQty >= poItem.quantity_ordered ? 'received' : 'partial';
                await poItem.update({ quantity_received: newQty, status: newStatus });
            }
        }

        // Update PO overall status
        if (delivery.po_id) {
            const allPoItems = await care_wh_po_items.findAll({ where: { po_id: delivery.po.po_id } });
            const allRcvd    = allPoItems.every(i => i.status === 'received');
            await care_wh_purchase_orders.update(
                { status: allRcvd ? 'received' : 'partial' },
                { where: { po_id: delivery.po.po_id } }
            );
        }

        // Update delivery status
        const freshItems  = await care_wh_delivery_items.findAll({ where: { delivery_id: delivId } });
        const allShelved  = freshItems.filter(i => i.qc_status === 'passed').every(i => i.stock_id);
        await delivery.update({ status: allShelved ? 'shelved' : 'shelved_partial' });

        await logActivity(req,
            'Delivery #' + delivId + ' shelved — ' + shelvedCount + ' batch(es) added to stock',
            true, 'deliveryController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, shelved: shelvedCount });
    } catch (err) {
        console.error('Shelve error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};
