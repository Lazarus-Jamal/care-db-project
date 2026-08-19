
// controllers/pharmacyInventoryCountController.js
// Pharmacy physical inventory counts — mirrors inventoryCountController.js
// (warehouse) for the shared workflow (draft -> in_progress -> pending_approval
// -> approved, blank print sheet, mandatory variance reasons, separate
// approval step), with one addition specific to pharmacy: the 20% cycle count
// is manually picked by the agent rather than filtered by ABC class, and
// whatever was picked last cycle is excluded from the eligible pool this time.
'use strict';
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const logActivity = require('../utils/activityLogger');
const { getCurrentFacilityDetails } = require('../utils/facilityHelper');
const {
    care_pharma_inventory_counts,
    care_pharma_inventory_count_items,
    care_drugsandservices,
    care_pharma_stock_movements,
    care_pharmacy_stock,
} = require('../models');

function requirePharmacyUnit(req, res) {
    if (!req.user.pharmacyUnit || !req.user.pharmacyUnit.id) {
        res.status(400).json({
            ok: false,
            error: 'No pharmacy unit selected for this session. Please log out and back in.',
        });
        return null;
    }
    return req.user.pharmacyUnit.id;
}

// Pharmacy Scoping — does this count belong to the current session's own
// unit? Admin-exempt, same pattern used throughout this app. Unlike the
// warehouse-order flow, there's no "shared, central" counterpart here —
// inventory counts are always pharmacy's own internal process, so this
// check applies to every function in this file, no warehouse-side
// exception needed.
function hasCountUnitAccess(req, count) {
    if (req.user.isFacilityExempt) return true;
    if (!req.user.pharmacyUnit) return false;
    return count.pharmacy_unit_id === req.user.pharmacyUnit.id;
}

// ── Helpers ───────────────────────────────────────────────────────
const actor = (user) =>
    (user && user.firstName && user.lastName)
        ? (user.firstName + ' ' + user.lastName).trim()
        : (user && user.username) || 'unknown';

const PHARMACY_ITEM_WHERE = { item_number: { [Op.in]: ['MED', 'SUP'] } };

// Generate count number: CNTPH-YYYYNNNN
const generateCountNumber = async () => {
    const year   = new Date().getFullYear();
    const prefix = 'CNTPH-' + year;
    const last   = await care_pharma_inventory_counts.findOne({
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

// Items excluded from this cycle's 20% pool: whatever was in the most
// recently APPROVED cycle_20pct count. A cancelled/abandoned count doesn't
// count — only a completed cycle actually "used up" those items.
const getLastCycleItemIds = async (unitId) => {
    const lastCycle = await care_pharma_inventory_counts.findOne({
        where: { count_type: 'cycle_20pct', status: 'approved', pharmacy_unit_id: unitId },
        order: [['count_id', 'DESC']],
    });
    if (!lastCycle) return [];
    const items = await care_pharma_inventory_count_items.findAll({
        where: { count_id: lastCycle.count_id },
        attributes: ['item_id'],
    });
    return items.map(i => i.item_id);
};

// ══════════════════════════════════════════════════════════════════
// LIST
// ══════════════════════════════════════════════════════════════════
exports.listCounts = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const where = !req.user.isFacilityExempt
            ? { pharmacy_unit_id: req.user.pharmacyUnit ? req.user.pharmacyUnit.id : -1 }
            : {};
        const counts = await care_pharma_inventory_counts.findAll({
            where, order: [['count_id', 'DESC']], limit: 50,
        });
        res.render('pharmacy/inventory-counts/list', {
            title:      locale === 'fr' ? 'Inventaires pharmacie' : 'Pharmacy Inventory Counts',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(), counts, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// CREATE FORM — choose count type
// ══════════════════════════════════════════════════════════════════
exports.createCountForm = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        res.render('pharmacy/inventory-counts/form', {
            title:      locale === 'fr' ? 'Nouvel inventaire' : 'New Inventory Count',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            errors: [], locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// PICKER — for cycle_20pct only: agent manually selects items.
// Shows eligible pool size (catalog minus last cycle's picks) and the
// 20% target as guidance; search is scoped to the eligible pool only,
// so last cycle's items can't accidentally be re-picked.
// ══════════════════════════════════════════════════════════════════
exports.pickerForm = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const unitId = requirePharmacyUnit(req, res);
        if (!unitId) return;
        const excludedIds = await getLastCycleItemIds(unitId);

        // Pharmacy Scoping — eligible pool is what THIS unit actually
        // carries (care_pharmacy_stock), not the entire global catalog —
        // a 20% sample of items this unit doesn't even stock would be
        // meaningless.
        const totalEligible = await care_pharmacy_stock.count({
            where: {
                pharmacy_unit_id: unitId,
                is_active: 1,
                ...(excludedIds.length ? { item_id: { [Op.notIn]: excludedIds } } : {}),
            },
        });
        const target = Math.round(totalEligible * 0.20);

        res.render('pharmacy/inventory-counts/picker', {
            title:      locale === 'fr' ? 'Selection du comptage 20%' : '20% Count — Pick Items',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            totalEligible, excludedCount: excludedIds.length, target,
            countDate: req.query.count_date || new Date().toISOString().slice(0, 10),
            notes: req.query.notes || '',
            errors: [], locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// GET /pharmacy/inventory-counts/picker/search — JSON, eligible items only
exports.pickerSearch = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (q.length < 2) return res.json({ ok: true, items: [] });

        const unitId = requirePharmacyUnit(req, res);
        if (!unitId) return;
        const excludedIds = await getLastCycleItemIds(unitId);

        const stockWhere = {
            pharmacy_unit_id: unitId,
            is_active: 1,
        };
        if (excludedIds.length) stockWhere.item_id = { [Op.notIn]: excludedIds };

        const stockRows = await care_pharmacy_stock.findAll({
            where: stockWhere,
            include: [{
                model: care_drugsandservices, as: 'drug',
                where: {
                    [Op.or]: [
                        { item_description:    { [Op.like]: '%' + q + '%' } },
                        { item_description_en: { [Op.like]: '%' + q + '%' } },
                    ],
                },
                attributes: ['item_id', 'item_description', 'item_description_en'],
            }],
            limit: 30,
        });
        const locale = req.locale || 'en';
        res.json({
            ok: true,
            items: stockRows.map(s => ({
                item_id: s.drug.item_id,
                description: locale === 'fr' ? s.drug.item_description : (s.drug.item_description_en || s.drug.item_description),
            })),
        });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// CREATE — POST. full/year_end: builds the whole eligible catalog.
// cycle_20pct: builds from the manually-picked item_id list.
// ══════════════════════════════════════════════════════════════════
exports.createCount = async (req, res) => {
    const locale = req.locale || 'en';
    const { count_type, count_date, notes, item_ids } = req.body;

    if (!req.user.permissions.includes('Pharmacy.Inventory.Count') &&
        !req.user.permissions.includes('Admin.FullAccess'))
        return res.status(403).send('Permission denied.');

    const unitId = requirePharmacyUnit(req, res);
    if (!unitId) return;

    if (!count_type || !count_date) {
        return res.render('pharmacy/inventory-counts/form', {
            title: locale === 'fr' ? 'Nouvel inventaire' : 'New Inventory Count',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            errors: [locale === 'fr' ? 'Type et date requis.' : 'Type and date required.'], locale,
        });
    }

    try {
        // Pharmacy Scoping — items now come from care_pharmacy_stock for
        // this unit specifically, not the global care_drugsandservices
        // catalog. system_qty is this unit's own quantity.
        let stockItems; // [{item_id, quantity}]
        if (count_type === 'cycle_20pct') {
            const rawIds = Array.isArray(item_ids) ? item_ids : (item_ids ? [item_ids] : []);
            const ids = [...new Set(rawIds.map(i => parseInt(i, 10)).filter(i => !isNaN(i)))];
            if (ids.length === 0) {
                return res.render('pharmacy/inventory-counts/form', {
                    title: locale === 'fr' ? 'Nouvel inventaire' : 'New Inventory Count',
                    activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
                    errors: [locale === 'fr' ? 'Aucun article selectionne.' : 'No items selected.'], locale,
                });
            }
            stockItems = await care_pharmacy_stock.findAll({
                where: { pharmacy_unit_id: unitId, item_id: { [Op.in]: ids } },
                attributes: ['item_id', 'quantity'],
            });
        } else {
            // full or year_end — everything this unit currently carries
            stockItems = await care_pharmacy_stock.findAll({
                where: { pharmacy_unit_id: unitId, is_active: 1 },
                attributes: ['item_id', 'quantity'],
            });
        }

        if (stockItems.length === 0) {
            return res.render('pharmacy/inventory-counts/form', {
                title: locale === 'fr' ? 'Nouvel inventaire' : 'New Inventory Count',
                activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
                errors: [locale === 'fr' ? 'Aucun article correspondant.' : 'No matching items.'], locale,
            });
        }

        const countNumber = await generateCountNumber();

        // Wrapped in a transaction: the count record and every one of its item
        // rows must all be created together, or none should be — otherwise a
        // failure partway through the items loop leaves an orphaned count with
        // no items, exactly like the bugs fixed earlier this session in
        // fulfilOrder/receiveOrder/issueStock.
        const count = await sequelize.transaction(async (t) => {
            const newCount = await care_pharma_inventory_counts.create({
                count_number:     countNumber,
                pharmacy_unit_id: unitId,
                count_type,
                status:       'draft',
                count_date,
                initiated_by: actor(req.user),
                is_locked:    0,
                notes:        notes ? notes.trim() : null,
            }, { transaction: t });

            for (const it of stockItems) {
                await care_pharma_inventory_count_items.create({
                    count_id:    newCount.count_id,
                    item_id:     it.item_id,
                    system_qty:  it.quantity || 0,
                    counted_qty: null,
                    adjustment_applied: 0,
                }, { transaction: t });
            }

            return newCount;
        });

        await logActivity(req,
            'Pharmacy inventory count ' + countNumber + ' created (' + count_type + ') — ' + stockItems.length + ' item(s)',
            true, 'pharmacyInventoryCountController.js', req.user.user_id, req.user.username);

        res.redirect('/pharmacy/inventory-counts/' + count.count_id + '?success=created');
    } catch (err) {
        console.error('Create pharmacy count error:', err);
        await logActivity(req,
            'Pharmacy inventory count creation FAILED (' + (count_type || 'unknown type') + '): ' + err.message,
            false, 'pharmacyInventoryCountController.js', req.user.user_id, req.user.username);
        res.render('pharmacy/inventory-counts/form', {
            title: locale === 'fr' ? 'Nouvel inventaire' : 'New Inventory Count',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            errors: [err.message], locale,
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
        const count   = await care_pharma_inventory_counts.findByPk(countId, {
            include: [{ model: care_pharma_inventory_count_items, as: 'items',
                include: [{ model: care_drugsandservices, as: 'drug',
                    attributes: ['item_description', 'item_description_en', 'item_number'] }] }],
        });
        if (!count) return res.status(404).send('Not found');
        if (!hasCountUnitAccess(req, count)) {
            return res.status(403).send(locale === 'fr'
                ? 'Cet inventaire appartient a une autre unite de pharmacie.'
                : 'This count belongs to a different pharmacy unit.');
        }

        res.render('pharmacy/inventory-counts/detail', {
            title:      count.count_number,
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            count, success: req.query.success || null, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// START COUNT (draft → in_progress + lock)
// ══════════════════════════════════════════════════════════════════
exports.startCount = async (req, res) => {
    const countId = parseInt(req.params.count_id, 10);
    try {
        if (!req.user.permissions.includes('Pharmacy.Inventory.Count') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const count = await care_pharma_inventory_counts.findByPk(countId);
        if (!count) return res.status(404).json({ ok: false, error: 'Not found.' });
        if (!hasCountUnitAccess(req, count)) {
            return res.status(403).json({ ok: false, error: 'This count belongs to a different pharmacy unit.' });
        }
        if (count.status !== 'draft')
            return res.status(400).json({ ok: false, error: 'Count not in draft status.' });

        const existingLock = await care_pharma_inventory_counts.findOne({
            where: { is_locked: 1, count_id: { [Op.ne]: countId },
                     status: { [Op.in]: ['in_progress', 'pending_approval'] } },
        });
        if (existingLock)
            return res.status(400).json({
                ok: false,
                error: 'Another count (' + existingLock.count_number + ') is already in progress. Complete it first.',
            });

        await count.update({ status: 'in_progress', is_locked: 1 });
        await logActivity(req, 'Pharmacy inventory count ' + count.count_number + ' started',
            true, 'pharmacyInventoryCountController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// SAVE RESULTS (batch save — callable repeatedly while in_progress)
// ══════════════════════════════════════════════════════════════════
exports.saveResults = async (req, res) => {
    const countId = parseInt(req.params.count_id, 10);
    const { results } = req.body; // [{ item_id (row id), counted_qty, variance_reason }]
    try {
        if (!req.user.permissions.includes('Pharmacy.Inventory.Count') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const count = await care_pharma_inventory_counts.findByPk(countId);
        if (!count) return res.status(404).json({ ok: false, error: 'Not found.' });
        if (!hasCountUnitAccess(req, count)) {
            return res.status(403).json({ ok: false, error: 'This count belongs to a different pharmacy unit.' });
        }
        if (count.status !== 'in_progress')
            return res.status(400).json({ ok: false, error: 'Count is not in progress.' });

        const now = new Date();
        const rows = Array.isArray(results) ? results : [];
        for (const r of rows) {
            const qty = parseInt(r.counted_qty, 10);
            if (isNaN(qty)) continue;
            await care_pharma_inventory_count_items.update(
                {
                    counted_qty:     qty,
                    variance_reason: r.variance_reason || null,
                    counted_by:      actor(req.user),
                    counted_at:      now,
                },
                { where: { id: r.item_id, count_id: countId } }
            );
        }
        await logActivity(req,
            `Count results saved for pharmacy inventory count #${countId} (${rows.length} item(s)) by ${actor(req.user)}`,
            true, 'pharmacyInventoryCountController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// SUBMIT FOR APPROVAL (in_progress → pending_approval)
// ══════════════════════════════════════════════════════════════════
exports.submitCount = async (req, res) => {
    const countId = parseInt(req.params.count_id, 10);
    try {
        if (!req.user.permissions.includes('Pharmacy.Inventory.Count') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const count = await care_pharma_inventory_counts.findByPk(countId, {
            include: [{ model: care_pharma_inventory_count_items, as: 'items' }],
        });
        if (!count) return res.status(404).json({ ok: false, error: 'Not found.' });
        if (!hasCountUnitAccess(req, count)) {
            return res.status(403).json({ ok: false, error: 'This count belongs to a different pharmacy unit.' });
        }
        if (count.status !== 'in_progress')
            return res.status(400).json({ ok: false, error: 'Count not in progress.' });

        const uncounted = count.items.filter(i => i.counted_qty === null);
        if (uncounted.length > 0)
            return res.status(400).json({
                ok: false,
                error: uncounted.length + (req.locale === 'fr'
                    ? ' article(s) non comptes. Completez le comptage.'
                    : ' item(s) not yet counted. Complete the count first.'),
            });

        const missingReasons = count.items.filter(i =>
            i.counted_qty !== null && i.counted_qty !== i.system_qty && !i.variance_reason);
        if (missingReasons.length > 0)
            return res.status(400).json({
                ok: false,
                error: missingReasons.length + (req.locale === 'fr'
                    ? ' ecart(s) sans raison. Veuillez expliquer les differences.'
                    : ' variance(s) without reason. Please explain the differences.'),
            });

        await count.update({ status: 'pending_approval' });
        await logActivity(req, 'Pharmacy inventory count ' + count.count_number + ' submitted for approval',
            true, 'pharmacyInventoryCountController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// APPROVE & APPLY ADJUSTMENTS (pending_approval → approved)
// Separate permission from initiating/counting — a different person
// must sign off before drug.quantity actually changes.
// ══════════════════════════════════════════════════════════════════
exports.approveCount = async (req, res) => {
    const countId = parseInt(req.params.count_id, 10);
    try {
        if (!req.user.permissions.includes('Pharmacy.Approve.InventoryCount') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const now = new Date();
        const agentName = actor(req.user);

        // Wrapped in a transaction: crediting/debiting pharmacy stock, writing
        // the movement record, and marking each item adjusted must all succeed
        // together — a crash mid-loop previously could apply some adjustments
        // but not others while still marking the whole count approved.
        const result = await sequelize.transaction(async (t) => {
            const count = await care_pharma_inventory_counts.findByPk(countId, {
                include: [{ model: care_pharma_inventory_count_items, as: 'items' }],
                transaction: t, lock: t.LOCK.UPDATE,
            });
            if (!count) return { notFound: true };
            if (!hasCountUnitAccess(req, count)) return { wrongUnit: true };
            if (count.status !== 'pending_approval') return { badState: true };

            let adjustmentsApplied = 0;

            for (const item of count.items) {
                if (item.counted_qty === null || item.adjustment_applied) continue;
                const variance = item.counted_qty - item.system_qty;
                if (variance === 0) { await item.update({ adjustment_applied: 1 }, { transaction: t }); continue; }

                // Pharmacy Scoping — adjusts care_pharmacy_stock for this
                // count's own unit, not the old global
                // care_drugsandservices.quantity.
                const drug = await care_drugsandservices.findByPk(item.item_id, { transaction: t });
                const stock = await care_pharmacy_stock.findOne({
                    where: { pharmacy_unit_id: count.pharmacy_unit_id, item_id: item.item_id },
                    transaction: t, lock: t.LOCK.UPDATE,
                });
                if (drug && stock) {
                    await stock.update(
                        { quantity: item.counted_qty, updated_at: now },
                        { transaction: t }
                    );
                    await care_pharma_stock_movements.create({
                        item_id:          item.item_id,
                        pharmacy_unit_id: count.pharmacy_unit_id,
                        item_number:    drug.item_number || '',
                        movement_type:  'count_adjustment',
                        quantity:       variance,
                        qty_before:     item.system_qty,
                        qty_after:      item.counted_qty,
                        reference_type: 'inventory',
                        reference_id:   countId,
                        performed_by:   agentName,
                        performed_at:   now,
                        notes:          'Inventory count ' + count.count_number + ' — ' + (item.variance_reason || 'No reason given'),
                    }, { transaction: t });
                }

                await item.update({ adjustment_applied: 1 }, { transaction: t });
                adjustmentsApplied++;
            }

            await count.update({
                status: 'approved', is_locked: 0, approved_by: agentName, approved_at: now,
            }, { transaction: t });

            return { count, adjustmentsApplied };
        });

        if (result.notFound) return res.status(404).json({ ok: false, error: 'Not found.' });
        if (result.wrongUnit) return res.status(403).json({ ok: false, error: 'This count belongs to a different pharmacy unit.' });
        if (result.badState) return res.status(400).json({ ok: false, error: 'Not awaiting approval.' });

        await logActivity(req,
            'Pharmacy inventory count ' + result.count.count_number + ' approved — ' + result.adjustmentsApplied + ' adjustment(s) applied',
            true, 'pharmacyInventoryCountController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, adjustments: result.adjustmentsApplied });
    } catch (err) {
        console.error('Approve pharmacy count error:', err);
        await logActivity(req,
            'Pharmacy inventory count #' + countId + ' approval FAILED: ' + err.message,
            false, 'pharmacyInventoryCountController.js', req.user.user_id, req.user.username);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// CANCEL COUNT
// ══════════════════════════════════════════════════════════════════
exports.cancelCount = async (req, res) => {
    const countId = parseInt(req.params.count_id, 10);
    const reason  = (req.body.reason || '').trim();
    try {
        if (!req.user.permissions.includes('Pharmacy.Inventory.Count') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const count = await care_pharma_inventory_counts.findByPk(countId);
        if (!count) return res.status(404).json({ ok: false, error: 'Not found' });
        if (!hasCountUnitAccess(req, count)) {
            return res.status(403).json({ ok: false, error: 'This count belongs to a different pharmacy unit.' });
        }
        if (['approved', 'cancelled'].includes(count.status))
            return res.status(400).json({ ok: false, error: 'Cannot cancel at this stage.' });

        await count.update({
            status:    'cancelled',
            is_locked: 0,
            notes:     (count.notes || '') + '\n[' + new Date().toISOString() + '] Cancelled by ' +
                       actor(req.user) + (reason ? ': ' + reason : ''),
        });
        await logActivity(req,
            'Pharmacy inventory count ' + count.count_number + ' cancelled by ' + actor(req.user),
            true, 'pharmacyInventoryCountController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// PRINT COUNT SHEET — blank, no system_qty shown
// ══════════════════════════════════════════════════════════════════
exports.printCountSheet = async (req, res) => {
    try {
        const countId = parseInt(req.params.count_id, 10);
        const count   = await care_pharma_inventory_counts.findByPk(countId, {
            include: [{ model: care_pharma_inventory_count_items, as: 'items',
                include: [{ model: care_drugsandservices, as: 'drug',
                    attributes: ['item_description', 'item_description_en', 'item_number'] }] }],
        });
        if (!count) return res.status(404).send('Not found');
        if (!hasCountUnitAccess(req, count)) {
            return res.status(403).send('This count belongs to a different pharmacy unit.');
        }
        // Pharmacy stock is genuinely per-unit as of Phase 3 -- this print
        // template previously always showed the generic "Oseel Care" name
        // because pharmacy stock wasn't facility/unit-scoped when it was
        // built. That reasoning no longer holds; use the real facility
        // now, same helper already used by warehouse's equivalent print
        // template.
        const facility = await getCurrentFacilityDetails(req);
        res.render('pharmacy/inventory-counts/print', {
            count, printDate: new Date(), user: req.user, locale: req.locale || 'en', facility,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};


