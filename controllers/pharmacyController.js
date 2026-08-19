
// controllers/pharmacyController.js  — Phase 7 full redesign
'use strict';
const { Op, literal } = require('sequelize');
const sequelize     = require('../config/database');
const logActivity   = require('../utils/activityLogger');
const { getCurrentFacilityDetails } = require('../utils/facilityHelper');
const { hasEncounterFacilityAccess } = require('../utils/encounterFacilityCheck');
const { todayLocalStr, toLocalDateStr, toLocalYearMonthStr, PHARMACY_PENDING_CUTOFF_DATE } = require('../utils/dateHelpers');
const {
    care_drugsandservices,
    care_pharmacy_stock,
    care_pharmacy_shelf,
    care_billing_bill,
    care_billing_bill_item,
    care_billing_bill_final,
    care_encounter_prescription,
    care_pharma_dispensing,
    care_pharma_stock_movements,
    care_pharma_transit,
    care_wh_pharmacy_orders,
    care_wh_pharmacy_order_items,
    care_encounter,
    care_person,
} = require('../models');

const actor   = (u) => (u && u.firstName && u.lastName)
    ? (u.firstName + ' ' + u.lastName).trim()
    : (u && u.username) || 'unknown';
const isSupervisor = (u) =>
    u && u.permissions && (
        u.permissions.includes('Admin.FullAccess') ||
        u.permissions.includes('Inventory.Update.Stock') ||
        u.permissions.includes('Pharmacy.View.Reports')
    );

// Pharmacy Scoping — every stock-touching action needs a specific unit
// to attribute the change to. req.user.pharmacyUnit is set at login for
// pharmacy-role staff (see authController.js's resolvePharmacyUnitAndFinalize)
// and is genuinely null if missing, never an { id: null } placeholder --
// so a plain truthiness check here is safe, unlike the facility case.
// Admins bypass facility scoping generally, but there's no equivalent
// "sees everything" concept for a stock action that has to actually
// debit/credit a specific unit's quantity -- an admin attempting to
// dispense/adjust stock directly still needs a real unit selected. The
// only realistic way this is null for someone who reaches these
// functions is a session that predates this feature; asking them to
// re-login is the correct fix, not guessing which unit they meant.
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

// Pharmacy Scoping — does this order belong to the current session's own
// pharmacy unit? For pharmacy-side actions only (cancelOrder,
// submitReceivingCount, listOrders, viewing an order as pharmacy) — the
// warehouse-side actions (fulfilOrder, rejectOrder, confirmReceiving,
// writeOffRemainder) deliberately do NOT use this, since warehouse stays
// shared/central and its staff need to see and act on every unit's
// orders, not just one. Admins bypass via isFacilityExempt, consistent
// with the exemption used everywhere else in this app.
function hasOrderUnitAccess(req, order) {
    if (req.user.isFacilityExempt) return true;
    if (!req.user.pharmacyUnit) return false;
    return order.pharmacy_unit_id === req.user.pharmacyUnit.id;
}

// Auto-generate PHR-YYYY-NNNN for warehouse orders
const generateOrderNumber = async () => {
    const year   = new Date().getFullYear();
    const prefix = 'PHR-' + year + '-';
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
// DASHBOARD
// ══════════════════════════════════════════════════════════════════
exports.dashboard = async (req, res) => {
    try {
        const locale    = req.locale || 'en';
        const agentName = actor(req.user);
        const isSup     = isSupervisor(req.user);
        const today     = todayLocalStr();

        // Items pending dispensing (paid MED/SUP not yet delivered).
        // Deliberately NOT a plain bill_item WHERE — matches the dispensingQueue
        // query exactly (JOIN to care_drugsandservices, item_number IN ('MED','SUP')).
        // The old billtype='prescription' filter counted ANY item a doctor
        // searched for in the prescription form — including lab tests, imaging,
        // or other services, since that search has no category restriction —
        // so it could (and did) disagree with the real queue, which correctly
        // only shows items pharmacy can actually dispense. See PROJECT_BRIEF.md.
        // Pharmacy Scoping — dispensing queue count, now facility-scoped
        // like the real queue it mirrors. Admins see the system-wide total,
        // consistent with the exemption used everywhere else in this app.
        const facilityFilterSql = !req.user.isFacilityExempt
            ? `AND bi.facility_id = ${sequelize.escape(req.user.facility.id)}`
            : '';
        const pendingCountQuery = sequelize.query(`
            SELECT COUNT(*) AS cnt
            FROM care_billing_bill_item bi
            INNER JOIN care_drugsandservices ds ON ds.item_id = bi.item_id
            WHERE ds.item_number IN ('MED', 'SUP')
              AND bi.status     = 'paid'
              AND bi.payment_id IS NOT NULL
              AND bi.livrer     = 0
              AND bi.date       >= ${sequelize.escape(PHARMACY_PENDING_CUTOFF_DATE)}
              ${facilityFilterSql}
        `, { type: require('sequelize').QueryTypes.SELECT })
            .then(rows => parseInt(rows[0].cnt, 10));

        // Build independent where clauses for parallel queries.
        // Using plain date strings (not `new Date(dateString)`) for the
        // boundary — passing a date-only string to `new Date()` is always
        // parsed as UTC midnight per the JS spec, which combined with this
        // app's WAT (+01:00) convention shifted the boundary an hour late,
        // silently excluding the first hour after WAT midnight each day.
        // Pharmacy Scoping — dispensing events now carry facility_id;
        // filtered here the same way as everywhere else in this app.
        const facilityFilterObj = !req.user.isFacilityExempt
            ? { facility_id: req.user.facility.id } : {};
        const todayWhere = { dispensed_at: { [Op.gte]: today + ' 00:00:00' }, ...facilityFilterObj };
        if (!isSup) todayWhere.dispensed_by = agentName;
        const monthStartStr = toLocalYearMonthStr(new Date()) + '-01';
        const monthWhere = { dispensed_at: { [Op.gte]: monthStartStr + ' 00:00:00' }, ...facilityFilterObj };
        if (!isSup) monthWhere.dispensed_by = agentName;
        const recentWhere = { ...facilityFilterObj };
        if (!isSup) recentWhere.dispensed_by = agentName;

        // Pharmacy Scoping — low/out-of-stock now read from
        // care_pharmacy_stock for the session's current unit, not the old
        // global care_drugsandservices.quantity/ReorderLevel.
        const unitId = req.user.pharmacyUnit ? req.user.pharmacyUnit.id : null;
        const lowStockQuery = unitId ? care_pharmacy_stock.count({ where: {
            pharmacy_unit_id: unitId,
            is_active:        1,
            reorder_level:    { [Op.gt]: 0 },
            quantity:         { [Op.lte]: literal('`reorder_level`'), [Op.gt]: 0 },
        }}) : Promise.resolve(0);
        const outOfStockQuery = unitId ? care_pharmacy_stock.count({ where: {
            pharmacy_unit_id: unitId,
            is_active:        1,
            quantity:         0,
        }}) : Promise.resolve(0);

        // Run all 7 independent queries in parallel — fixes sequential await slowness
        const [
            pendingCount, todayDispensed, monthDispensed,
            lowStock, outOfStock, pendingOrders, recentDispensings,
        ] = await Promise.all([
            pendingCountQuery,
            care_pharma_dispensing.count({ where: todayWhere }),
            care_pharma_dispensing.count({ where: monthWhere }),
            lowStockQuery,
            outOfStockQuery,
            // NOT YET unit-scoped — care_wh_pharmacy_orders doesn't carry
            // pharmacy_unit_id yet (that lands with the warehouse-order
            // rewiring, the next piece of this phase). This is a known,
            // temporary gap: shows the system-wide pending count for now,
            // not this unit's own orders specifically.
            care_wh_pharmacy_orders.count({
                where: { status: { [Op.in]: ['pending','in_transit','partially_collected'] } },
            }),
            care_pharma_dispensing.findAll({
                where:      recentWhere,
                order:      [['dispensed_at','DESC']],
                limit:      8,
                attributes: ['id','article','qty_dispensed','dispensed_by','dispensed_at','bill_no','encounter_nr'],
            }),
        ]);

        res.render('pharmacy/dashboard', {
            title:      locale === 'fr' ? 'Pharmacie — Tableau de bord' : 'Pharmacy — Dashboard',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            pendingCount, todayDispensed, monthDispensed,
            lowStock, outOfStock, pendingOrders,
            recentDispensings, isSup, agentName, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// DISPENSING QUEUE — paid MED/SUP items awaiting dispensing
// Grouped by bill (patient)
// ══════════════════════════════════════════════════════════════════
exports.dispensingQueue = async (req, res) => {
    try {
        const locale  = req.locale || 'en';
        const search  = (req.query.search || '').trim();
        const page    = Math.max(1, parseInt(req.query.page,10)||1);
        const PER     = 20;

        // Pharmacy Scoping — the queue previously had zero facility filter
        // at all, showing every facility's pending items mixed together;
        // and its stock display read the old global
        // care_drugsandservices.quantity, which is now stale since
        // dispensing deducts from care_pharmacy_stock instead. The queue
        // itself is facility-wide (any pharmacy staff at this facility
        // sees the whole facility's pending queue, matching the confirmed
        // design — cross-unit dispensing is allowed), but the *stock
        // number shown* is specific to the session's current unit, since
        // that's the pool an actual dispense action would draw from.
        const unitId = req.user.pharmacyUnit ? req.user.pharmacyUnit.id : null;
        const facilityFilter = !req.user.isFacilityExempt
            ? `AND bi.facility_id = ${sequelize.escape(req.user.facility.id)}`
            : '';

        const rawRows = await sequelize.query(`
            SELECT
                bi.id, bi.bill_no, bi.encounter_nr, bi.article,
                bi.units, bi.qtealivrer, bi.billtype, bi.item_id,
                bi.status AS item_status,
                bi.livrer,
                ds.item_number, ds.item_description,
                ps.quantity AS ph_stock,
                b.date   AS bill_date,
                b.status AS bill_status,
                p.pid, p.hospital_file_nr AS file_nr,
                p.name_first, p.name_last
            FROM care_billing_bill_item bi
            INNER JOIN care_drugsandservices  ds ON ds.item_id    = bi.item_id
            INNER JOIN care_billing_bill       b  ON b.bill_no    = bi.bill_no
            LEFT  JOIN care_encounter          e  ON e.encounter_nr = bi.encounter_nr
            LEFT  JOIN care_person             p  ON p.pid         = e.pid
            LEFT  JOIN care_pharmacy_stock     ps ON ps.item_id = bi.item_id AND ps.pharmacy_unit_id = :unitId
            WHERE ds.item_number IN ('MED', 'SUP')
              AND bi.status      = 'paid'
              AND bi.payment_id  IS NOT NULL
              AND bi.livrer      = 0
              AND bi.date        >= :cutoffDate
              ${facilityFilter}
            ORDER BY bi.bill_no ASC, bi.id ASC
        `, { replacements: { unitId, cutoffDate: PHARMACY_PENDING_CUTOFF_DATE }, type: require('sequelize').QueryTypes.SELECT });

        // Group by bill_no
        const billMap = {};
        rawRows.forEach(row => {
            const bn = row.bill_no;
            if (!billMap[bn]) {
                billMap[bn] = {
                    bill_no:      bn,
                    encounter_nr: row.encounter_nr,
                    bill_date:    row.bill_date,
                    bill_status:  row.bill_status,   // 'paid' | 'partial' | 'open'
                    patient_name: row.name_first
                        ? (row.name_first + ' ' + row.name_last).trim() : '—',
                    file_nr:      row.file_nr || '',
                    item_count:   0,
                    total_units:  0,
                    items:        [],
                };
            }
            billMap[bn].item_count++;
            billMap[bn].total_units += row.qtealivrer || row.units || 0;
            billMap[bn].items.push(row);
        });

        let rows = Object.values(billMap);

        // Search filter
        if (search) {
            const sl = search.toLowerCase();
            rows = rows.filter(r =>
                r.patient_name.toLowerCase().includes(sl) ||
                String(r.bill_no).includes(sl) ||
                String(r.file_nr).includes(sl)
            );
        }

        // Paginate
        const totalCount = rows.length;
        const paginated  = rows.slice((page-1)*PER, page*PER);

        const totalPartial = rows.filter(r => r.bill_status === 'partial').length;

        res.render('pharmacy/dispensing', {
            title:      locale === 'fr' ? 'File de distribution' : 'Dispensing Queue',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            rows: paginated, totalCount, totalPartial, search,
            totalPages: Math.ceil(totalCount/PER), currentPage: page, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// DISPENSE BILL — detail view for one bill (all MED/SUP items)
// ══════════════════════════════════════════════════════════════════
exports.dispenseBill = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const billNo = parseInt(req.params.bill_no, 10);

        const bill = await care_billing_bill.findByPk(billNo);
        if (!bill) return res.status(404).send('Bill not found.');
        if (!hasEncounterFacilityAccess(req, bill)) {
            return res.status(403).send(
                locale === 'fr'
                    ? 'Cette facture appartient a un autre etablissement.'
                    : 'This bill belongs to a different facility.');
        }

        const enc = await care_encounter.findOne({
            where:      { encounter_nr: bill.encounter_nr },
            attributes: ['encounter_nr','pid'],
        });
        const patient = enc ? await care_person.findByPk(enc.pid, {
            attributes: ['pid','hospital_file_nr','name_first','name_last','date_birth','sex'],
        }) : null;

        // Pharmacy Scoping — stock/reorder level now come from
        // care_pharmacy_stock for the session's current unit, not the old
        // global care_drugsandservices.quantity/ReorderLevel.
        const unitId = req.user.pharmacyUnit ? req.user.pharmacyUnit.id : null;
        const rawItems = await sequelize.query(`
            SELECT
                bi.id, bi.bill_no, bi.encounter_nr, bi.article,
                bi.units, bi.qtealivrer, bi.item_id, bi.status,
                bi.livrer, bi.payment_id,
                ds.item_id   AS drug_item_id,
                ds.item_number,
                ps.quantity       AS current_stock,
                ps.reorder_level  AS reorder_level
            FROM care_billing_bill_item bi
            INNER JOIN care_drugsandservices ds ON ds.item_id = bi.item_id
            LEFT  JOIN care_pharmacy_stock   ps ON ps.item_id = bi.item_id AND ps.pharmacy_unit_id = :unitId
            WHERE bi.bill_no     = :billNo
              AND ds.item_number IN ('MED','SUP')
              AND bi.status      = 'paid'
              AND bi.payment_id  IS NOT NULL
              AND bi.livrer      = 0
              AND bi.date        >= :cutoffDate
            ORDER BY bi.id ASC
        `, {
            replacements: { billNo, unitId, cutoffDate: PHARMACY_PENDING_CUTOFF_DATE },
            type: require('sequelize').QueryTypes.SELECT,
        });

        const enriched = rawItems.map(row => ({
            ...row,
            qty_to_dispense: row.qtealivrer || row.units || 0,
        }));

        res.render('pharmacy/dispense_bill', {
            title:      locale === 'fr'
                ? 'Distribution — Facture #' + billNo
                : 'Dispense — Bill #' + billNo,
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            bill, patient, enc, items: enriched, billNo,
            success: req.query.success || null, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// DISPENSE ITEM — POST — single item dispensing
// ══════════════════════════════════════════════════════════════════
exports.dispenseItem = async (req, res) => {
    const billItemId = parseInt(req.params.bill_item_id, 10);
    const { qty_dispensed, notes } = req.body;
    try {
        if (!req.user.permissions.includes('Pharmacy.Dispense.Medication') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const unitId = requirePharmacyUnit(req, res);
        if (!unitId) return;

        const billItem = await care_billing_bill_item.findByPk(billItemId);
        if (!billItem)
            return res.status(404).json({ ok: false, error: 'Item not found.' });
        if (!hasEncounterFacilityAccess(req, billItem)) {
            return res.status(403).json({ ok: false, error: 'This bill belongs to a different facility.' });
        }
        // Verify item is a pharmacy drug/supply via drugsandservices (catalog
        // metadata check only -- item_number classification lives on the
        // global catalog regardless of which unit's stock is being touched)
        const dsCheck = await care_drugsandservices.findOne({
            where: { item_id: billItem.item_id },
            attributes: ['item_id','item_number'],
        });
        if (!dsCheck || !['MED','SUP'].includes(dsCheck.item_number || ''))
            return res.status(400).json({ ok: false, error: 'Not a pharmacy item.' });
        if (billItem.livrer === 1)
            return res.status(400).json({ ok: false, error: 'Already dispensed.' });

        const qty = parseInt(qty_dispensed, 10) || (billItem.qtealivrer || billItem.units || 0);
        if (qty <= 0)
            return res.status(400).json({ ok: false, error: 'Invalid quantity.' });

        const now       = new Date();
        const agentName = actor(req.user);

        // Pharmacy Scoping — stock now lives in care_pharmacy_stock, scoped
        // to the session's selected unit, not care_drugsandservices.quantity
        // directly. Wrapped in a transaction: this was a real gap even
        // before this rewrite (5 separate writes with no atomicity), and
        // this project's own convention calls for transactions on any
        // multi-step stock/money write -- worth fixing while every line
        // here is already being touched for scoping anyway.
        const result = await sequelize.transaction(async (t) => {
            const stock = await care_pharmacy_stock.findOne({
                where: { pharmacy_unit_id: unitId, item_id: billItem.item_id },
                transaction: t, lock: t.LOCK.UPDATE,
            });
            if (!stock || !stock.is_active) {
                return { error: 'not_carried' };
            }
            if (stock.quantity < qty) {
                return { error: 'insufficient', available: stock.quantity };
            }

            const qtyBefore = stock.quantity;
            await stock.update(
                { quantity: qtyBefore - qty, updated_at: now },
                { transaction: t }
            );

            await care_pharma_stock_movements.create({
                item_id:          dsCheck.item_id,
                pharmacy_unit_id: unitId,
                item_number:      dsCheck.item_number || '',
                movement_type:    'dispensed',
                quantity:         -qty,
                qty_before:       qtyBefore,
                qty_after:        qtyBefore - qty,
                reference_type:   'bill_item',
                reference_id:     billItemId,
                performed_by:     agentName,
                performed_at:     now,
                notes:            notes ? notes.trim() : null,
            }, { transaction: t });

            await care_pharma_dispensing.create({
                bill_item_id:     billItemId,
                bill_no:          billItem.bill_no,
                encounter_nr:     billItem.encounter_nr,
                facility_id:      req.user.facility ? req.user.facility.id : null,
                pharmacy_unit_id: unitId,
                item_id:          dsCheck.item_id,
                item_number:      dsCheck.item_number || '',
                article:          billItem.article,
                qty_to_dispense:  billItem.qtealivrer || billItem.units || 0,
                qty_dispensed:    qty,
                dispensed_by:     agentName,
                dispensed_at:     now,
                notes:            notes ? notes.trim() : null,
            }, { transaction: t });

            await care_billing_bill_item.update({
                livrer:    1,
                qtelivree: qty,
                livrerpar: agentName,
                livrerle:  now,
            }, { where: { id: billItemId }, transaction: t });

            // Sync encounter_prescription.livrer to keep prescription status
            // consistent. Match on bill_number + article — livrer=0 guard
            // prevents double-update.
            await care_encounter_prescription.update(
                { livrer: 1 },
                { where: {
                    bill_number: billItem.bill_no,
                    article:     billItem.article,
                    encounter_nr: billItem.encounter_nr,
                    livrer:      0,
                }, transaction: t }
            );

            return { ok: true, qtyBefore, qtyAfter: qtyBefore - qty };
        });

        if (result.error === 'not_carried') {
            return res.status(400).json({ ok: false, error: 'This item is not carried by your pharmacy unit.' });
        }
        if (result.error === 'insufficient') {
            return res.status(400).json({
                ok: false,
                error: (req.locale==='fr'
                    ? 'Stock insuffisant: ' + result.available + ' disponible(s)'
                    : 'Insufficient stock: ' + result.available + ' available'),
            });
        }

        await logActivity(req,
            'Dispensed ' + qty + 'x ' + billItem.article + ' (bill #' + billItem.bill_no + ')',
            true, 'pharmacyController.js', req.user.user_id, req.user.username);

        res.json({ ok: true, qty_dispensed: qty, qty_after: result.qtyAfter });
    } catch (err) {
        console.error('dispenseItem error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// DISPENSE ALL — POST — dispense all pending items for a bill
// ══════════════════════════════════════════════════════════════════
exports.dispenseAll = async (req, res) => {
    const billNo = parseInt(req.params.bill_no, 10);
    try {
        if (!req.user.permissions.includes('Pharmacy.Dispense.Medication') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const bill = await care_billing_bill.findByPk(billNo);
        if (!bill) return res.status(404).json({ ok: false, error: 'Bill not found.' });
        if (!hasEncounterFacilityAccess(req, bill)) {
            return res.status(403).json({ ok: false, error: 'This bill belongs to a different facility.' });
        }

        const unitId = requirePharmacyUnit(req, res);
        if (!unitId) return;

        // Use raw SQL to join care_drugsandservices for reliable MED/SUP filter
        const items = await sequelize.query(`
            SELECT bi.*, ds.item_number AS ds_item_number
            FROM care_billing_bill_item bi
            INNER JOIN care_drugsandservices ds ON ds.item_id = bi.item_id
            WHERE bi.bill_no     = :billNo
              AND ds.item_number IN ('MED','SUP')
              AND bi.status      = 'paid'
              AND bi.payment_id  IS NOT NULL
              AND bi.livrer      = 0
              AND bi.date        >= :cutoffDate
        `, {
            replacements: { billNo, cutoffDate: PHARMACY_PENDING_CUTOFF_DATE },
            type: require('sequelize').QueryTypes.SELECT,
        });
        if (!items.length)
            return res.status(400).json({ ok: false, error: 'No pending items.' });

        const now       = new Date();
        const agentName = actor(req.user);
        const results   = [];
        const errors    = [];

        // Pharmacy Scoping — same treatment as dispenseItem: stock now
        // lives in care_pharmacy_stock scoped to the session's unit, and
        // this whole loop is wrapped in a transaction (a pre-existing gap
        // even before this rewrite — a crash partway through previously
        // could leave some items dispensed and others not, with no
        // record of where it stopped).
        await sequelize.transaction(async (t) => {
            for (const billItem of items) {
                const qty = billItem.qtealivrer || billItem.units || 0;
                if (qty <= 0) continue;

                const stock = await care_pharmacy_stock.findOne({
                    where: { pharmacy_unit_id: unitId, item_id: billItem.item_id },
                    transaction: t, lock: t.LOCK.UPDATE,
                });
                if (!stock || !stock.is_active) {
                    errors.push(billItem.article + ': not carried by your pharmacy unit');
                    continue;
                }
                if (stock.quantity < qty) {
                    errors.push(billItem.article + ': ' +
                        (req.locale==='fr' ? 'stock insuffisant ('+stock.quantity+')' : 'low stock ('+stock.quantity+')'));
                    continue;
                }

                const qtyBefore = stock.quantity;
                await stock.update(
                    { quantity: qtyBefore - qty, updated_at: now },
                    { transaction: t }
                );
                await care_pharma_stock_movements.create({
                    item_id: billItem.item_id, pharmacy_unit_id: unitId,
                    item_number: billItem.ds_item_number || '',
                    movement_type: 'dispensed', quantity: -qty,
                    qty_before: qtyBefore, qty_after: qtyBefore - qty,
                    reference_type: 'bill_item', reference_id: billItem.id,
                    performed_by: agentName, performed_at: now,
                }, { transaction: t });
                await care_pharma_dispensing.create({
                    bill_item_id: billItem.id, bill_no: billNo,
                    encounter_nr: billItem.encounter_nr,
                    facility_id: req.user.facility ? req.user.facility.id : null,
                    pharmacy_unit_id: unitId,
                    item_id: billItem.item_id, item_number: billItem.ds_item_number || '',
                    article: billItem.article,
                    qty_to_dispense: qty, qty_dispensed: qty,
                    dispensed_by: agentName, dispensed_at: now,
                }, { transaction: t });
                await care_billing_bill_item.update({
                    livrer: 1, qtelivree: qty, livrerpar: agentName, livrerle: now,
                }, { where: { id: billItem.id }, transaction: t });

                // Sync encounter_prescription.livrer, matching dispenseItem
                await care_encounter_prescription.update(
                    { livrer: 1 },
                    { where: {
                        bill_number: billNo,
                        article:     billItem.article,
                        encounter_nr: billItem.encounter_nr,
                        livrer:      0,
                    }, transaction: t }
                );

                results.push(billItem.article);
            }
        });

        await logActivity(req,
            'Dispensed all items for bill #' + billNo +
            (errors.length ? ' (' + errors.length + ' skipped)' : ''),
            true, 'pharmacyController.js', req.user.user_id, req.user.username);

        res.json({ ok: true, dispensed: results.length, skipped: errors, errors });
    } catch (err) {
        console.error('dispenseAll error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// STOCK VIEW
// ══════════════════════════════════════════════════════════════════
exports.stockView = async (req, res) => {
    try {
        const locale  = req.locale || 'en';
        const search  = (req.query.search || '').trim();
        const filter  = req.query.filter || '';  // low | out | all
        const page    = Math.max(1, parseInt(req.query.page,10)||1);
        const PER     = 30;

        // Pharmacy Scoping — stock is now per-unit (care_pharmacy_stock),
        // not a global row on care_drugsandservices. Raw SQL join, with
        // columns aliased to match exactly what views/pharmacy/stock.ejs
        // already expects (item_description, quantity, ReorderLevel,
        // etc.) — the view needed zero changes this way, same approach
        // already used for the dispensing queue and bill detail view.
        const unitId = req.user.pharmacyUnit ? req.user.pharmacyUnit.id : null;
        if (!unitId) {
            return res.status(400).send(locale === 'fr'
                ? 'Aucune unite de pharmacie selectionnee pour cette session. Veuillez vous reconnecter.'
                : 'No pharmacy unit selected for this session. Please log out and back in.');
        }

        let searchClause = '';
        const replacements = { unitId };
        if (search) {
            searchClause = `AND (ds.item_description LIKE :search OR ds.item_description_en LIKE :search)`;
            replacements.search = '%' + search + '%';
        }
        let filterClause = '';
        if (filter === 'low') filterClause = `AND ps.quantity > 0 AND ps.reorder_level > 0 AND ps.quantity <= ps.reorder_level`;
        if (filter === 'out') filterClause = `AND ps.quantity = 0`;

        const countRows = await sequelize.query(`
            SELECT COUNT(*) AS cnt
            FROM care_pharmacy_stock ps
            INNER JOIN care_drugsandservices ds ON ds.item_id = ps.item_id
            WHERE ps.pharmacy_unit_id = :unitId AND ps.is_active = 1
              ${searchClause} ${filterClause}
        `, { replacements, type: require('sequelize').QueryTypes.SELECT });
        const count = countRows[0].cnt;

        const rows = await sequelize.query(`
            SELECT
                ds.item_id, ds.item_number, ds.item_description, ds.item_description_en,
                ps.quantity            AS quantity,
                ps.minimum_level       AS Minimumlevel,
                ps.reorder_level       AS ReorderLevel,
                ps.maximum_level       AS Maximumlevel
            FROM care_pharmacy_stock ps
            INNER JOIN care_drugsandservices ds ON ds.item_id = ps.item_id
            WHERE ps.pharmacy_unit_id = :unitId AND ps.is_active = 1
              ${searchClause} ${filterClause}
            ORDER BY ds.item_description ASC
            LIMIT ${PER} OFFSET ${(page-1)*PER}
        `, { replacements, type: require('sequelize').QueryTypes.SELECT });

        res.render('pharmacy/stock', {
            title:      locale === 'fr' ? 'Stock pharmacie' : 'Pharmacy Stock',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            rows, count, search, filter,
            totalPages: Math.ceil(count/PER), currentPage: page, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// STOCK ADJUSTMENT — manual correction (manager only)
// ══════════════════════════════════════════════════════════════════
exports.adjustStock = async (req, res) => {
    const itemId = parseInt(req.params.item_id, 10);
    const { qty_adjustment, reason } = req.body;
    try {
        if (!req.user.permissions.includes('Inventory.Update.Stock') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const unitId = requirePharmacyUnit(req, res);
        if (!unitId) return;

        // Flagged back when this scoping work started: manual adjustments
        // accepted an optional reason while the formal inventory count
        // process required one for any variance. Tightened to match now
        // that this function is already being rewritten — "if discrepancy
        // there is, need to provide proof" applies here too, not just to
        // counts.
        if (!reason || !reason.trim()) {
            return res.status(400).json({
                ok: false,
                error: req.locale === 'fr'
                    ? 'Un motif est requis pour tout ajustement manuel.'
                    : 'A reason is required for any manual adjustment.',
            });
        }

        const drug = await care_drugsandservices.findOne({
            where: { item_id: itemId },
            attributes: ['item_id', 'item_number', 'item_description'],
        });
        if (!drug) return res.status(404).json({ ok: false, error: 'Not found.' });

        const adj = parseInt(qty_adjustment, 10);
        if (isNaN(adj) || adj === 0)
            return res.status(400).json({ ok: false, error: 'Invalid adjustment.' });

        const now       = new Date();
        const agentName = actor(req.user);

        const result = await sequelize.transaction(async (t) => {
            const stock = await care_pharmacy_stock.findOne({
                where: { pharmacy_unit_id: unitId, item_id: itemId },
                transaction: t, lock: t.LOCK.UPDATE,
            });
            if (!stock) return { error: 'not_carried' };

            const qtyBefore = stock.quantity;
            const qtyAfter  = Math.max(0, qtyBefore + adj);

            await stock.update(
                { quantity: qtyAfter, updated_at: now },
                { transaction: t }
            );
            await care_pharma_stock_movements.create({
                item_id: itemId, pharmacy_unit_id: unitId,
                item_number: drug.item_number || '',
                movement_type: 'adjusted', quantity: adj,
                qty_before: qtyBefore, qty_after: qtyAfter,
                reference_type: 'manual',
                performed_by: agentName, performed_at: now,
                notes: reason.trim(),
            }, { transaction: t });

            return { ok: true, qtyBefore, qtyAfter };
        });

        if (result.error === 'not_carried') {
            return res.status(400).json({ ok: false, error: 'This item is not carried by your pharmacy unit.' });
        }

        await logActivity(req,
            'Stock adjustment: ' + drug.item_description + ' ' +
            (adj > 0 ? '+'+adj : adj) + ' ('+result.qtyBefore+'→'+result.qtyAfter+')',
            true, 'pharmacyController.js', req.user.user_id, req.user.username);

        res.json({ ok: true, qty_before: result.qtyBefore, qty_after: result.qtyAfter });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// FULFIL ORDER — warehouse stock manager processes the order
// Deducts warehouse stock (FEFO), creates care_pharma_transit rows.
// Re-callable: if some items were unavailable last time, calling this
// again only processes the still-outstanding quantity on those items —
// this is how a partially-shipped order gets its remainder retried once
// stock arrives, without re-touching items already fully issued.
// ══════════════════════════════════════════════════════════════════
exports.fulfilOrder = async (req, res) => {
    const orderId = parseInt(req.params.order_id, 10);
    try {
        if (!req.user.permissions.includes('Warehouse.Fulfil.PharmacyOrder') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const {
            care_wh_stock,
            care_wh_stock_movements,
            care_wh_products,
        } = require('../models');

        const now       = new Date();
        const agentName = actor(req.user);

        // Wrapped in a transaction: the FEFO deduction, movement/transit writes, and
        // item/order status updates must all succeed or all roll back together — a
        // crash mid-loop previously could leave warehouse stock decremented with no
        // matching transit record, or let a retry double-deduct already-processed items.
        const result = await sequelize.transaction(async (t) => {
            const order = await care_wh_pharmacy_orders.findByPk(orderId, {
                include: [{ model: care_wh_pharmacy_order_items, as: 'items' }],
                transaction: t, lock: t.LOCK.UPDATE,
            });
            if (!order) return { notFound: true };
            // Fulfillable while pending (first attempt), or in_transit / partially_collected
            // (retrying the still-outstanding remainder of a partially-shipped order).
            if (!['pending','approved','in_transit','partially_collected'].includes(order.status))
                return { badState: true };

            const isRetry = order.status !== 'pending' && order.status !== 'approved';
            let anyIssuedThisRound = false;

            for (const item of order.items || []) {
                // Skip lines that are already fully issued, or that the warehouse
                // has explicitly written off — nothing left to do for those.
                if (item.status === 'issued' || item.status === 'cancelled') continue;

                let qtyNeeded   = item.quantity_requested - item.quantity_issued;
                if (qtyNeeded <= 0) continue;
                let totalIssuedNow = 0;

                // FEFO: oldest expiry first
                const batches = await care_wh_stock.findAll({
                    where: { product_id: item.product_id, quantity: { [Op.gt]: 0 } },
                    order: [['expiry_date','ASC']],
                    transaction: t, lock: t.LOCK.UPDATE,
                });

                for (const batch of batches) {
                    if (qtyNeeded <= 0) break;
                    const deduct = Math.min(qtyNeeded, batch.quantity);
                    await batch.update({ quantity: batch.quantity - deduct }, { transaction: t });

                    // Write warehouse stock movement (deduction)
                    await care_wh_stock_movements.create({
                        product_id:    item.product_id,
                        stock_id:      batch.stock_id,
                        movement_type: 'issue',
                        quantity:      -deduct,
                        reference_id:  orderId,
                        reference_type:'pharmacy_order',
                        batch_number:  batch.batch_number,
                        expiry_date:   batch.expiry_date,
                        performed_by:  agentName,
                        performed_at:  now,
                        notes:         'Pharmacy order ' + order.order_number +
                                       (isRetry ? ' (retry)' : ''),
                    }, { transaction: t });

                    // Write transit record for tracking
                    const product = await care_wh_products.findByPk(item.product_id,
                        { attributes: ['name','item_code'], transaction: t });
                    await care_pharma_transit.create({
                        order_id:       orderId,
                        order_number:   order.order_number,
                        order_item_id:  item.id,
                        product_id:     item.product_id,
                        item_code:      product ? product.item_code : '',
                        product_name:   product ? product.name : '',
                        qty_in_transit: deduct,
                        batch_number:   batch.batch_number || null,
                        expiry_date:    batch.expiry_date || null,
                        dispatched_by:  agentName,
                        dispatched_at:  now,
                        status:         'in_transit',
                    }, { transaction: t });

                    qtyNeeded      -= deduct;
                    totalIssuedNow += deduct;
                }

                if (totalIssuedNow > 0) {
                    anyIssuedThisRound = true;
                    await care_wh_products.decrement('current_stock',
                        { by: totalIssuedNow, where: { product_id: item.product_id }, transaction: t });
                }

                const newQtyIssued = item.quantity_issued + totalIssuedNow;
                const itemStatus   = newQtyIssued >= item.quantity_requested ? 'issued'
                                    : newQtyIssued > 0 ? 'partial' : 'unavailable';
                await item.update({
                    quantity_issued: newQtyIssued,
                    status:          itemStatus,
                }, { transaction: t });
            }

            // Something new shipped this round → order has fresh stock in transit,
            // whatever its prior status was.
            if (anyIssuedThisRound) {
                await order.update({
                    status:      'in_transit',
                    approved_by: agentName,
                    approved_at: now,
                }, { transaction: t });
            }

            return { order, anyIssuedThisRound, isRetry };
        });

        if (result.notFound) return res.status(404).json({ ok: false, error: 'Not found.' });
        if (result.badState) return res.status(400).json({ ok: false, error: 'Order cannot be fulfilled in its current state.' });

        if (!result.anyIssuedThisRound) {
            await logActivity(req,
                'Pharmacy order ' + result.order.order_number +
                (result.isRetry ? ' — retry attempted, still nothing new available'
                                 : ' — fulfilment attempted, no stock available for any item'),
                false, 'pharmacyController.js', req.user.user_id, req.user.username);

            // A first attempt with literally nothing available is a hard error (order
            // stays pending). A retry that still finds nothing new is not an error —
            // the order already has a status reflecting what happened before; just say so.
            if (result.isRetry) {
                return res.json({ ok: true, status: result.order.status, unchanged: true,
                    message: 'Still nothing new available for the outstanding item(s).' });
            }
            return res.status(400).json({
                ok: false,
                error: 'No stock available for any item — order not fulfilled. Items are marked unavailable; retry once stock arrives.',
            });
        }

        await logActivity(req,
            'Pharmacy order ' + result.order.order_number +
            (result.isRetry ? ' — remainder fulfilled, items in transit' : ' fulfilled — items in transit'),
            true, 'pharmacyController.js', req.user.user_id, req.user.username);

        res.json({ ok: true, status: 'in_transit' });
    } catch (err) {
        console.error('fulfilOrder error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// STEP 2a: PHARMACY SUBMITS RECEIVING COUNT
// Pharmacy physically counts what arrived and submits the count —
// this does NOT credit stock yet. That only happens once the warehouse
// confirms it (confirmReceiving below). Any difference between what
// was shipped and what was counted is recorded as a discrepancy.
// Order status: in_transit → in_transit (unchanged; transit rows move
// in_transit → counted)
// ══════════════════════════════════════════════════════════════════
exports.submitReceivingCount = async (req, res) => {
    const orderId = parseInt(req.params.order_id, 10);
    try {
        if (!req.user.permissions.includes('Pharmacy.Dispense.Medication') &&
            !req.user.permissions.includes('Inventory.Order.ToPharmacy') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const { counts } = req.body; // [{ transit_id, counted_qty }]
        const rawCounts  = Array.isArray(counts) ? counts : (counts ? [counts] : []);
        const agentName  = actor(req.user);
        const now        = new Date();

        const result = await sequelize.transaction(async (t) => {
            const order = await care_wh_pharmacy_orders.findByPk(orderId,
                { transaction: t, lock: t.LOCK.UPDATE });
            if (!order) return { notFound: true };
            if (!hasOrderUnitAccess(req, order)) return { wrongUnit: true };
            if (order.status !== 'in_transit') return { badState: true };

            const transitRows = await care_pharma_transit.findAll({
                where: { order_id: orderId, status: 'in_transit' },
                transaction: t, lock: t.LOCK.UPDATE,
            });
            if (!transitRows.length) return { nothingToCount: true };

            const countMap = {};
            rawCounts.forEach(c => {
                const tid = parseInt(c.transit_id, 10);
                const q   = parseInt(c.counted_qty, 10);
                if (!isNaN(tid) && !isNaN(q)) countMap[tid] = Math.max(0, q);
            });

            let anyDiscrepancy = false;
            for (const row of transitRows) {
                const counted = countMap.hasOwnProperty(row.id) ? countMap[row.id] : row.qty_in_transit;
                const discrepancy = counted - row.qty_in_transit;
                if (discrepancy !== 0) anyDiscrepancy = true;

                await row.update({
                    accepted_qty: counted,
                    status:       'counted',
                    notes: (row.notes ? row.notes + '\n' : '') +
                        '[' + now.toISOString() + '] Counted by ' + agentName + ': ' + counted +
                        ' of ' + row.qty_in_transit + ' shipped' +
                        (discrepancy !== 0
                            ? ' — DISCREPANCY: ' + (discrepancy > 0 ? '+' : '') + discrepancy
                            : ''),
                }, { transaction: t });
            }

            return { order, anyDiscrepancy };
        });

        if (result.notFound) return res.status(404).json({ ok: false, error: 'Not found.' });
        if (result.wrongUnit) return res.status(403).json({ ok: false, error: 'This order belongs to a different pharmacy unit.' });
        if (result.badState) return res.status(400).json({ ok: false, error: 'Order is not awaiting a receiving count.' });
        if (result.nothingToCount) return res.status(400).json({ ok: false, error: 'Nothing in transit to count for this order.' });

        await logActivity(req,
            'Pharmacy submitted receiving count for order ' + result.order.order_number +
            (result.anyDiscrepancy ? ' — discrepancy noted' : '') +
            ' — awaiting warehouse confirmation',
            true, 'pharmacyController.js', req.user.user_id, req.user.username);

        res.json({ ok: true, status: 'counted' });
    } catch (err) {
        console.error('submitReceivingCount error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// STEP 2b: WAREHOUSE CONFIRMS RECEIVING COUNT
// The warehouse agent reviews the count pharmacy submitted and confirms
// it. THIS is the point pharmacy stock is actually credited — a two-
// party sign-off, not a single unilateral accept. Discrepancies noted
// in step 2a are not disputed here, just acknowledged; the counted
// (physically verified) quantity is what gets credited.
// Order status: in_transit → collected (fully resolved) or
//               partially_collected (some line items still outstanding)
// ══════════════════════════════════════════════════════════════════
exports.confirmReceiving = async (req, res) => {
    const orderId = parseInt(req.params.order_id, 10);
    try {
        if (!req.user.permissions.includes('Warehouse.Fulfil.PharmacyOrder') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const { care_wh_products } = require('../models');
        const agentName    = actor(req.user);
        const now          = new Date();
        const missingLinks = [];

        // Wrapped in a transaction: crediting pharmacy stock, writing the movement
        // record, marking transit rows accepted, and closing out the order must all
        // succeed together, or none should.
        const result = await sequelize.transaction(async (t) => {
            const order = await care_wh_pharmacy_orders.findByPk(orderId, {
                include: [{ model: care_wh_pharmacy_order_items, as: 'items' }],
                transaction: t, lock: t.LOCK.UPDATE,
            });
            if (!order) return { notFound: true };
            if (order.status !== 'in_transit') return { badState: true };

            const transitRows = await care_pharma_transit.findAll({
                where: { order_id: orderId, status: 'counted' },
                transaction: t, lock: t.LOCK.UPDATE,
            });
            if (!transitRows.length) return { nothingToConfirm: true };

            for (const row of transitRows) {
                const qty = row.accepted_qty; // the physically counted quantity
                if (qty > 0) {
                    // Real bridge: care_wh_products.pharmacy_item_id -> care_drugsandservices.item_id
                    const whProduct = await care_wh_products.findByPk(row.product_id,
                        { attributes: ['product_id', 'pharmacy_item_id'], transaction: t });
                    const drug = whProduct && whProduct.pharmacy_item_id
                        ? await care_drugsandservices.findOne({
                            where: { item_id: whProduct.pharmacy_item_id }, transaction: t })
                        : null;

                    if (!drug) {
                        missingLinks.push(row.product_name || ('product #' + row.product_id));
                    } else {
                        // Pharmacy Scoping — credits care_pharmacy_stock for
                        // the order's own pharmacy_unit_id, not the old
                        // global care_drugsandservices.quantity. If this
                        // unit has never carried this item before (no
                        // existing stock row), one is created here —
                        // receiving stock from an order is itself a valid
                        // way a unit starts carrying something new.
                        let stock = await care_pharmacy_stock.findOne({
                            where: { pharmacy_unit_id: order.pharmacy_unit_id, item_id: drug.item_id },
                            transaction: t, lock: t.LOCK.UPDATE,
                        });
                        const qtyBefore = stock ? stock.quantity : 0;
                        if (stock) {
                            await stock.update({ quantity: qtyBefore + qty, updated_at: now }, { transaction: t });
                        } else {
                            await care_pharmacy_stock.create({
                                pharmacy_unit_id: order.pharmacy_unit_id,
                                item_id:          drug.item_id,
                                quantity:         qty,
                                is_active:        1,
                            }, { transaction: t });
                        }
                        await care_pharma_stock_movements.create({
                            item_id:          drug.item_id,
                            pharmacy_unit_id: order.pharmacy_unit_id,
                            item_number:      drug.item_number || '',
                            movement_type:    'received',
                            quantity:         qty,
                            qty_before:       qtyBefore,
                            qty_after:        qtyBefore + qty,
                            reference_type:   'wh_order',
                            reference_id:     orderId,
                            performed_by:     agentName,
                            performed_at:     now,
                            notes:            'Received from warehouse order ' + order.order_number +
                                            ' (confirmed by warehouse)',
                        }, { transaction: t });
                    }
                }

                await row.update({
                    accepted_by: agentName,
                    accepted_at: now,
                    status:      'accepted',
                    notes: (row.notes ? row.notes + '\n' : '') +
                        '[' + now.toISOString() + '] Confirmed by warehouse (' + agentName + ')',
                }, { transaction: t });
            }

            // Fully resolved (every line issued or written off) vs still-outstanding
            const freshItems = await care_wh_pharmacy_order_items.findAll({
                where: { order_id: orderId }, transaction: t,
            });
            const stillOutstanding = freshItems.some(i => i.status === 'partial' || i.status === 'unavailable');
            const newStatus = stillOutstanding ? 'partially_collected' : 'collected';

            await order.update({
                status:       newStatus,
                collected_by: agentName,
                collected_at: now,
            }, { transaction: t });

            return { order, newStatus };
        });

        if (result.notFound) return res.status(404).json({ ok: false, error: 'Not found.' });
        if (result.badState) return res.status(400).json({ ok: false, error: 'Order is not awaiting confirmation.' });
        if (result.nothingToConfirm)
            return res.status(400).json({ ok: false, error: 'Nothing pending confirmation — has pharmacy submitted a count yet?' });

        for (const name of missingLinks) {
            await logActivity(req,
                'WARNING: order ' + result.order.order_number + ' — no linked pharmacy item for ' +
                name + '; stock NOT incremented, manual reconciliation needed',
                false, 'pharmacyController.js', req.user.user_id, req.user.username);
        }

        await logActivity(req,
            'Warehouse confirmed receipt for order ' + result.order.order_number +
            ' — status: ' + result.newStatus,
            true, 'pharmacyController.js', req.user.user_id, req.user.username);

        res.json({ ok: true, status: result.newStatus });
    } catch (err) {
        console.error('confirmReceiving error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// PHARMACY CANCELS A PENDING ORDER — only before the warehouse has
// touched it. Once fulfilment has started (in_transit or later), stock
// has already moved and pharmacy can no longer unilaterally cancel.
// ══════════════════════════════════════════════════════════════════
exports.cancelOrder = async (req, res) => {
    const orderId = parseInt(req.params.order_id, 10);
    try {
        if (!req.user.permissions.includes('Inventory.Order.ToPharmacy') &&
            !req.user.permissions.includes('Pharmacy.Dispense.Medication') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const { reason } = req.body;
        const agentName  = actor(req.user);
        const now        = new Date();

        const order = await care_wh_pharmacy_orders.findByPk(orderId);
        if (!order) return res.status(404).json({ ok: false, error: 'Not found.' });
        if (!hasOrderUnitAccess(req, order)) {
            return res.status(403).json({ ok: false, error: 'This order belongs to a different pharmacy unit.' });
        }
        if (order.status !== 'pending')
            return res.status(400).json({ ok: false, error: 'Only a pending order can be cancelled.' });

        await order.update({
            status: 'cancelled',
            notes: (order.notes ? order.notes + '\n' : '') +
                '[' + now.toISOString() + '] Cancelled by pharmacy (' + agentName + ')' +
                (reason && reason.trim() ? ': ' + reason.trim() : ''),
        });

        await logActivity(req,
            'Pharmacy order ' + order.order_number + ' cancelled by pharmacy (' + agentName + ')' +
            (reason && reason.trim() ? ' — ' + reason.trim() : ''),
            true, 'pharmacyController.js', req.user.user_id, req.user.username);

        res.json({ ok: true, status: 'cancelled' });
    } catch (err) {
        console.error('cancelOrder error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// WAREHOUSE REJECTS A PENDING ORDER — the warehouse-side counterpart
// to cancelOrder. A reason is required, since pharmacy needs to know
// why in order to decide what to do next (substitute, re-order, etc).
// ══════════════════════════════════════════════════════════════════
exports.rejectOrder = async (req, res) => {
    const orderId = parseInt(req.params.order_id, 10);
    try {
        if (!req.user.permissions.includes('Warehouse.Fulfil.PharmacyOrder') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const { reason } = req.body;
        if (!reason || !reason.trim())
            return res.status(400).json({ ok: false, error: 'A reason is required to reject an order.' });

        const agentName = actor(req.user);
        const now        = new Date();

        const order = await care_wh_pharmacy_orders.findByPk(orderId);
        if (!order) return res.status(404).json({ ok: false, error: 'Not found.' });
        if (order.status !== 'pending')
            return res.status(400).json({ ok: false, error: 'Only a pending order can be rejected.' });

        await order.update({
            status: 'cancelled',
            notes: (order.notes ? order.notes + '\n' : '') +
                '[' + now.toISOString() + '] Rejected by warehouse (' + agentName + '): ' + reason.trim(),
        });

        await logActivity(req,
            'Pharmacy order ' + order.order_number + ' rejected by warehouse (' + agentName + ') — ' + reason.trim(),
            true, 'pharmacyController.js', req.user.user_id, req.user.username);

        res.json({ ok: true, status: 'cancelled' });
    } catch (err) {
        console.error('rejectOrder error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// WAREHOUSE WRITES OFF THE OUTSTANDING REMAINDER of a partially
// collected order — for when the still-unavailable item(s) will never
// be fulfilled (discontinued, etc). Closes the order out as 'collected'
// rather than leaving it in limbo. A reason is required.
// ══════════════════════════════════════════════════════════════════
exports.writeOffRemainder = async (req, res) => {
    const orderId = parseInt(req.params.order_id, 10);
    try {
        if (!req.user.permissions.includes('Warehouse.Fulfil.PharmacyOrder') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const { reason } = req.body;
        if (!reason || !reason.trim())
            return res.status(400).json({ ok: false, error: 'A reason is required to write off outstanding items.' });

        const agentName = actor(req.user);
        const now        = new Date();

        const order = await care_wh_pharmacy_orders.findByPk(orderId, {
            include: [{ model: care_wh_pharmacy_order_items, as: 'items' }],
        });
        if (!order) return res.status(404).json({ ok: false, error: 'Not found.' });
        if (order.status !== 'partially_collected')
            return res.status(400).json({ ok: false, error: 'Order has no outstanding items to write off.' });

        for (const item of order.items || []) {
            if (item.status === 'partial' || item.status === 'unavailable') {
                await item.update({
                    status: 'cancelled',
                    notes: (item.notes ? item.notes + '\n' : '') +
                        '[' + now.toISOString() + '] Remainder written off by ' + agentName + ': ' + reason.trim(),
                });
            }
        }

        await order.update({
            status: 'collected',
            notes: (order.notes ? order.notes + '\n' : '') +
                '[' + now.toISOString() + '] Outstanding items written off by ' + agentName + ': ' + reason.trim(),
        });

        await logActivity(req,
            'Order ' + order.order_number + ' — outstanding items written off by ' + agentName +
            ' — ' + reason.trim(),
            true, 'pharmacyController.js', req.user.user_id, req.user.username);

        res.json({ ok: true, status: 'collected' });
    } catch (err) {
        console.error('writeOffRemainder error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};


// ══════════════════════════════════════════════════════════════════
// WAREHOUSE ORDERS LIST
// ══════════════════════════════════════════════════════════════════
exports.listOrders = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const status = req.query.status || '';
        const page   = Math.max(1, parseInt(req.query.page,10)||1);
        const PER    = 25;
        // Pharmacy Scoping — this is pharmacy's own order list (as
        // opposed to the warehouse's view of the same orders, which
        // stays unrestricted since warehouse is shared/central). Admins
        // bypass via isFacilityExempt, same as everywhere else.
        const where  = status ? { status } : {};
        if (!req.user.isFacilityExempt) {
            where.pharmacy_unit_id = req.user.pharmacyUnit ? req.user.pharmacyUnit.id : -1;
        }

        const { count, rows: orders } = await care_wh_pharmacy_orders.findAndCountAll({
            where, include: [{ model: care_wh_pharmacy_order_items, as: 'items', required: false,
                attributes: ['id','status','quantity_requested','quantity_issued'] }],
            order: [['order_id','DESC']], limit: PER, offset: (page-1)*PER,
        });

        const countWhere = !req.user.isFacilityExempt
            ? { pharmacy_unit_id: req.user.pharmacyUnit ? req.user.pharmacyUnit.id : -1 }
            : {};
        const rawCounts = await care_wh_pharmacy_orders.findAll({
            where: countWhere,
            attributes: ['status',[require('sequelize').fn('COUNT','*'),'cnt']],
            group: ['status'], raw: true,
        });
        const countMap = {};
        rawCounts.forEach(r => { countMap[r.status] = parseInt(r.cnt,10); });

        res.render('pharmacy/orders', {
            title:      locale === 'fr' ? 'Commandes entrepot' : 'Warehouse Orders',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            orders, count, countMap, statusFilter: status,
            totalPages: Math.ceil(count/PER), currentPage: page, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// NEW WAREHOUSE ORDER FORM
// ══════════════════════════════════════════════════════════════════
exports.newOrderForm = async (req, res) => {
    try {
        const locale   = req.locale || 'en';
        const products = await require('../models').care_wh_products.findAll({
            where: { is_active: 1, current_stock: { [Op.gt]: 0 } },
            order: [['name','ASC']],
            attributes: ['product_id','name','item_code','unit_of_measure','current_stock'],
        });
        res.render('pharmacy/orders/new', {
            title:      locale === 'fr' ? 'Nouvelle commande entrepot' : 'New Warehouse Order',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            products, errors: [], locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// SUBMIT WAREHOUSE ORDER
// ══════════════════════════════════════════════════════════════════
exports.submitOrder = async (req, res) => {
    const locale    = req.locale || 'en';
    const { notes, items } = req.body;
    const rawItems  = Array.isArray(items) ? items : (items ? [items] : []);
    const errors    = [];

    if (!req.user.permissions.includes('Inventory.Order.ToPharmacy') &&
        !req.user.permissions.includes('Pharmacy.Dispense.Medication') &&
        !req.user.permissions.includes('Admin.FullAccess'))
        errors.push(locale === 'fr' ? 'Permission refusee.' : 'Permission denied.');

    const unitId = req.user.pharmacyUnit ? req.user.pharmacyUnit.id : null;
    if (!unitId)
        errors.push(locale === 'fr'
            ? 'Aucune unite de pharmacie selectionnee pour cette session.'
            : 'No pharmacy unit selected for this session.');

    if (!rawItems.length)
        errors.push(locale === 'fr' ? 'Aucun article.' : 'No items.');

    rawItems.forEach((item, idx) => {
        if (!(parseInt(item.quantity_requested,10) > 0))
            errors.push('Item ' + (idx+1) + ': invalid quantity');
    });

    if (errors.length) {
        const products = await require('../models').care_wh_products.findAll({
            where: { is_active: 1, current_stock: { [Op.gt]: 0 } },
            order: [['name','ASC']],
            attributes: ['product_id','name','item_code','unit_of_measure','current_stock'],
        });
        return res.render('pharmacy/orders/new', {
            title: locale === 'fr' ? 'Nouvelle commande entrepot' : 'New Warehouse Order',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            products, errors, locale,
        });
    }

    try {
        const orderNumber = await generateOrderNumber();
        const order = await care_wh_pharmacy_orders.create({
            order_number:     orderNumber,
            pharmacy_unit_id: unitId,
            requested_by:     actor(req.user),
            requested_at:     new Date(),
            status:           'pending',
            notes:            notes ? notes.trim() : null,
        });
        for (const item of rawItems) {
            await care_wh_pharmacy_order_items.create({
                order_id:           order.order_id,
                product_id:         parseInt(item.product_id,10),
                quantity_requested: parseInt(item.quantity_requested,10),
                quantity_issued:    0,
                status:             'pending',
            });
        }
        await logActivity(req,
            'Pharmacy order ' + orderNumber + ' submitted to warehouse',
            true, 'pharmacyController.js', req.user.user_id, req.user.username);
        res.redirect('/pharmacy/orders/' + order.order_id + '?success=created');
    } catch (err) {
        console.error('submitOrder error:', err);
        res.redirect('/pharmacy/orders');
    }
};

// ══════════════════════════════════════════════════════════════════
// ORDER DETAIL (warehouse order)
// ══════════════════════════════════════════════════════════════════
exports.orderDetail = async (req, res) => {
    try {
        const locale  = req.locale || 'en';
        const orderId = parseInt(req.params.order_id,10);
        const order   = await care_wh_pharmacy_orders.findByPk(orderId, {
            include: [{ model: care_wh_pharmacy_order_items, as: 'items',
                include: [{ model: require('../models').care_wh_products, as: 'product',
                    attributes: ['name','item_code','unit_of_measure'], required: false }],
            }],
        });
        if (!order) return res.status(404).send('Not found.');
        if (!hasOrderUnitAccess(req, order)) {
            return res.status(403).send(
                locale === 'fr'
                    ? 'Cette commande appartient a une autre unite de pharmacie.'
                    : 'This order belongs to a different pharmacy unit.');
        }

        const transitRows = await care_pharma_transit.findAll({
            where: { order_id: orderId },
            order: [['id','ASC']],
        });

        res.render('pharmacy/orders/detail', {
            title:      order.order_number,
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            order, transitRows, success: req.query.success || null, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// RECEIVE ORDER (POST — legacy alias, kept as a safety net)
// ══════════════════════════════════════════════════════════════════
exports.collectOrder = async (req, res) => {
    // Delegates to submitReceivingCount, the first step of the two-party
    // count → confirm receiving flow.
    return exports.submitReceivingCount(req, res);
};

// ══════════════════════════════════════════════════════════════════
// REPORTS — distribution + stats
// ══════════════════════════════════════════════════════════════════
exports.reports = async (req, res) => {
    try {
        const locale    = req.locale || 'en';
        const dateFrom  = req.query.date_from ||
            (() => { const d=new Date(); d.setMonth(d.getMonth()-1); return toLocalDateStr(d); })();
        const dateTo    = req.query.date_to || todayLocalStr();
        const agentFilter = req.query.agent || '';
        const isSup     = isSupervisor(req.user);
        const print     = req.query.print === '1';

        const where = {
            dispensed_at: { [Op.between]: [dateFrom+' 00:00:00', dateTo+' 23:59:59'] },
        };
        if (!isSup) where.dispensed_by = actor(req.user);
        else if (agentFilter) where.dispensed_by = agentFilter;

        const dispensings = await care_pharma_dispensing.findAll({
            where, order: [['dispensed_at','DESC']],
        });

        // Summary by article
        const byArticle = {};
        dispensings.forEach(d => {
            if (!byArticle[d.item_number||d.article]) byArticle[d.item_number||d.article] = {
                article: d.article, item_number: d.item_number,
                total_dispensed: 0, count: 0,
            };
            byArticle[d.item_number||d.article].total_dispensed += d.qty_dispensed;
            byArticle[d.item_number||d.article].count++;
        });

        // Summary by agent (supervisors only)
        const byAgent = {};
        if (isSup) {
            dispensings.forEach(d => {
                if (!byAgent[d.dispensed_by]) byAgent[d.dispensed_by] = { agent: d.dispensed_by, count: 0, total: 0 };
                byAgent[d.dispensed_by].count++;
                byAgent[d.dispensed_by].total += d.qty_dispensed;
            });
        }

        // Get distinct agents for filter dropdown
        const agents = isSup ? await care_pharma_dispensing.findAll({
            attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('dispensed_by')),'dispensed_by']],
            raw: true,
        }) : [];

        const view = print ? 'pharmacy/reports/print' : 'pharmacy/reports';
        // Pharmacy stock is genuinely per-unit as of Phase 3 -- only the
        // print view needs the real facility name (the normal reports
        // page already shows the session facility elsewhere), so this is
        // fetched conditionally rather than on every reports page load.
        const facility = print ? await getCurrentFacilityDetails(req) : null;
        res.render(view, {
            title:      locale === 'fr' ? 'Rapports pharmacie' : 'Pharmacy Reports',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            dispensings, dateFrom, dateTo, agentFilter,
            byArticle: Object.values(byArticle).sort((a,b)=>b.total_dispensed-a.total_dispensed),
            byAgent: Object.values(byAgent).sort((a,b)=>b.count-a.count),
            agents, isSup, generatedAt: new Date(), locale, facility,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// INVENTORY COUNT — legacy single-step version, superseded 2026-07-27
// by controllers/pharmacyInventoryCountController.js (count types, blank
// print sheet, separate results-entry step, mandatory variance reasons,
// separate supervisor approval before adjustments apply). Kept only as a
// redirect-only safety net in case anything still links here directly.
// ══════════════════════════════════════════════════════════════════
exports.inventoryCount = async (req, res) => {
    res.redirect('/pharmacy/inventory-counts');
};

exports.submitInventoryCount = async (req, res) => {
    res.redirect('/pharmacy/inventory-counts');
};

/* Legacy implementation kept here for reference only — no longer reachable.
exports.inventoryCount = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        // Load all pharmacy items with current system qty
        const items = await care_drugsandservices.findAll({
            where: { ReorderLevel: { [Op.gt]: 0 } }, // only items that have stock levels set
            order: [['item_description','ASC']],
            attributes: ['item_id','item_number','item_description','quantity',
                'ReorderLevel','Minimumlevel','Maximumlevel'],
        });
        res.render('pharmacy/inventory_count', {
            title:      locale === 'fr' ? 'Comptage inventaire' : 'Inventory Count',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            items, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

exports.submitInventoryCount = async (req, res) => {
    try {
        const { counts, notes } = req.body;
        const agentName = actor(req.user);
        const now       = new Date();
        let   adjusted  = 0;

        const countArr = Array.isArray(counts) ? counts : (counts ? [counts] : []);
        for (const c of countArr) {
            const itemId  = parseInt(c.item_id, 10);
            const counted = parseInt(c.counted_qty, 10);
            if (isNaN(itemId) || isNaN(counted)) continue;

            const drug = await care_drugsandservices.findByPk(itemId);
            if (!drug) continue;

            const diff = counted - drug.quantity;
            if (diff === 0) continue;

            await care_drugsandservices.update(
                { quantity: counted, user: agentName, datemod: now },
                { where: { item_id: itemId } }
            );
            await care_pharma_stock_movements.create({
                item_id: itemId, item_number: drug.item_number || '',
                movement_type: 'count_adjustment', quantity: diff,
                qty_before: drug.quantity, qty_after: counted,
                reference_type: 'inventory',
                performed_by: agentName, performed_at: now,
                notes: notes ? notes.trim() : 'Inventory count adjustment',
            });
            adjusted++;
        }

        await logActivity(req,
            'Pharmacy inventory count submitted — ' + adjusted + ' adjustment(s)',
            true, 'pharmacyController.js', req.user.user_id, req.user.username);

        res.redirect('/pharmacy/stock?success=count_submitted');
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};
*/













// ══════════════════════════════════════════════════════════════════
// ADD ITEM TO UNIT'S CATALOG — a unit doesn't automatically carry
// everything in the global care_drugsandservices catalog; this is how
// it starts carrying something new. Confirmed design: pick from the
// shared reference list (for consistent naming/pricing across
// facilities), not free-form entry.
// ══════════════════════════════════════════════════════════════════
exports.newStockItemForm = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const unitId = requirePharmacyUnit(req, res);
        if (!unitId) return;

        res.render('pharmacy/stock-add', {
            title:      locale === 'fr' ? 'Ajouter un article au stock' : 'Add Item to Stock',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(), locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// GET /pharmacy/stock/search-catalog — JSON, catalog items this unit
// does NOT already carry (active stock row), MED/SUP only.
exports.stockItemSearch = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (q.length < 2) return res.json({ ok: true, items: [] });

        const unitId = requirePharmacyUnit(req, res);
        if (!unitId) return;

        const existing = await care_pharmacy_stock.findAll({
            where: { pharmacy_unit_id: unitId, is_active: 1 },
            attributes: ['item_id'],
        });
        const existingIds = existing.map(s => s.item_id);

        const where = {
            item_number: { [Op.in]: ['MED', 'SUP'] },
            [Op.or]: [
                { item_description:    { [Op.like]: '%' + q + '%' } },
                { item_description_en: { [Op.like]: '%' + q + '%' } },
            ],
        };
        if (existingIds.length) where.item_id = { [Op.notIn]: existingIds };

        const items = await care_drugsandservices.findAll({
            where, limit: 30, order: [['item_description', 'ASC']],
            attributes: ['item_id', 'item_description', 'item_description_en', 'item_number'],
        });
        const locale = req.locale || 'en';
        res.json({
            ok: true,
            items: items.map(i => ({
                item_id: i.item_id,
                item_number: i.item_number,
                description: locale === 'fr' ? i.item_description : (i.item_description_en || i.item_description),
            })),
        });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// POST /pharmacy/stock/add
exports.addStockItem = async (req, res) => {
    try {
        if (!req.user.permissions.includes('Inventory.Update.Stock') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const unitId = requirePharmacyUnit(req, res);
        if (!unitId) return;

        const itemId = parseInt(req.body.item_id, 10);
        const initialQty      = Math.max(0, parseInt(req.body.initial_quantity, 10) || 0);
        const reorderLevel    = Math.max(0, parseInt(req.body.reorder_level, 10) || 0);
        const minimumLevel    = Math.max(0, parseInt(req.body.minimum_level, 10) || 0);
        const maximumLevel    = Math.max(0, parseInt(req.body.maximum_level, 10) || 0);
        const shelfId         = req.body.shelf_id ? parseInt(req.body.shelf_id, 10) : null;

        if (isNaN(itemId)) return res.status(400).json({ ok: false, error: 'Invalid item.' });

        const drug = await care_drugsandservices.findOne({
            where: { item_id: itemId, item_number: { [Op.in]: ['MED', 'SUP'] } },
        });
        if (!drug) return res.status(400).json({ ok: false, error: 'Item not found in catalog.' });

        const existing = await care_pharmacy_stock.findOne({
            where: { pharmacy_unit_id: unitId, item_id: itemId },
        });
        if (existing) {
            if (existing.is_active) {
                return res.status(400).json({ ok: false, error: 'This item is already carried by your pharmacy unit.' });
            }
            // Was carried before, deactivated, now being re-added — reactivate
            // rather than create a duplicate row (unique key on unit+item).
            await existing.update({
                is_active: 1, quantity: initialQty,
                reorder_level: reorderLevel, minimum_level: minimumLevel, maximum_level: maximumLevel,
                shelf_id: shelfId, updated_at: new Date(),
            });
        } else {
            await care_pharmacy_stock.create({
                pharmacy_unit_id: unitId, item_id: itemId,
                quantity: initialQty,
                reorder_level: reorderLevel, minimum_level: minimumLevel, maximum_level: maximumLevel,
                shelf_id: shelfId, is_active: 1,
            });
        }

        if (initialQty > 0) {
            await care_pharma_stock_movements.create({
                item_id: itemId, pharmacy_unit_id: unitId,
                item_number: drug.item_number || '',
                movement_type: 'added_to_catalog', quantity: initialQty,
                qty_before: 0, qty_after: initialQty,
                reference_type: 'manual',
                performed_by: actor(req.user), performed_at: new Date(),
                notes: 'Item newly added to this unit\'s catalog',
            });
        }

        await logActivity(req,
            'Added ' + drug.item_description + ' to pharmacy unit #' + unitId + '\'s catalog',
            true, 'pharmacyController.js', req.user.user_id, req.user.username);

        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// SHELVES — aisle/shelf reference list, per unit
// ══════════════════════════════════════════════════════════════════
exports.listShelves = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const unitId = requirePharmacyUnit(req, res);
        if (!unitId) return;

        const shelves = await care_pharmacy_shelf.findAll({
            where: { pharmacy_unit_id: unitId, is_active: 1 },
            order: [['label', 'ASC']],
        });

        res.render('pharmacy/shelves', {
            title:      locale === 'fr' ? 'Rayons de pharmacie' : 'Pharmacy Shelves',
            activePage: 'pharmacy', user: req.user, csrfToken: req.csrfToken(),
            shelves, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

exports.createShelf = async (req, res) => {
    try {
        if (!req.user.permissions.includes('Inventory.Update.Stock') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const unitId = requirePharmacyUnit(req, res);
        if (!unitId) return;

        const label = (req.body.label || '').trim();
        if (!label) return res.status(400).json({ ok: false, error: 'A shelf name is required.' });

        const existing = await care_pharmacy_shelf.findOne({
            where: { pharmacy_unit_id: unitId, label },
        });
        if (existing) {
            if (existing.is_active) {
                return res.status(400).json({ ok: false, error: 'A shelf with this name already exists.' });
            }
            await existing.update({ is_active: 1 });
            await logActivity(req,
                `Shelf "${existing.label}" reactivated for pharmacy unit #${unitId} by ${actor(req.user)}`,
                true, 'pharmacyController.js', req.user.user_id, req.user.username);
            return res.json({ ok: true, shelf: { id: existing.id, label: existing.label } });
        }

        const shelf = await care_pharmacy_shelf.create({
            pharmacy_unit_id: unitId, label, is_active: 1,
        });
        await logActivity(req,
            `Shelf "${label}" created for pharmacy unit #${unitId} by ${actor(req.user)}`,
            true, 'pharmacyController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, shelf: { id: shelf.id, label: shelf.label } });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

exports.deleteShelf = async (req, res) => {
    try {
        if (!req.user.permissions.includes('Inventory.Update.Stock') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const unitId = requirePharmacyUnit(req, res);
        if (!unitId) return;

        const shelfId = parseInt(req.params.shelf_id, 10);
        const shelf = await care_pharmacy_shelf.findOne({
            where: { id: shelfId, pharmacy_unit_id: unitId },
        });
        if (!shelf) return res.status(404).json({ ok: false, error: 'Not found.' });

        // Soft-deactivate, matching care_facility_departments' pattern —
        // items already assigned to this shelf keep their shelf_id
        // pointing at a now-inactive shelf rather than being silently
        // unset; that's a data-quality nudge to reassign them, not a bug.
        await shelf.update({ is_active: 0 });
        await logActivity(req,
            `Shelf "${shelf.label}" deactivated for pharmacy unit #${unitId} by ${actor(req.user)}`,
            true, 'pharmacyController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// POST /pharmacy/stock/:item_id/settings — update shelf/reorder levels
// without touching quantity (that's adjustStock's job, with its
// mandatory-reason requirement; this is pure configuration).
exports.updateStockSettings = async (req, res) => {
    try {
        if (!req.user.permissions.includes('Inventory.Update.Stock') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const unitId = requirePharmacyUnit(req, res);
        if (!unitId) return;

        const itemId = parseInt(req.params.item_id, 10);
        const stock = await care_pharmacy_stock.findOne({
            where: { pharmacy_unit_id: unitId, item_id: itemId },
        });
        if (!stock) return res.status(404).json({ ok: false, error: 'Not carried by your pharmacy unit.' });

        const update = { updated_at: new Date() };
        if (req.body.reorder_level !== undefined) update.reorder_level = Math.max(0, parseInt(req.body.reorder_level, 10) || 0);
        if (req.body.minimum_level !== undefined) update.minimum_level = Math.max(0, parseInt(req.body.minimum_level, 10) || 0);
        if (req.body.maximum_level !== undefined) update.maximum_level = Math.max(0, parseInt(req.body.maximum_level, 10) || 0);
        if (req.body.shelf_id !== undefined) update.shelf_id = req.body.shelf_id ? parseInt(req.body.shelf_id, 10) : null;

        await stock.update(update);
        await logActivity(req,
            `Stock settings updated for item #${itemId} (unit #${unitId}) by ${actor(req.user)}: ${JSON.stringify(update)}`,
            true, 'pharmacyController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};


