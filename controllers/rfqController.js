
// controllers/rfqController.js
'use strict';
const { Op, fn, col } = require('sequelize');
const logActivity = require('../utils/activityLogger');
const { getCurrentFacilityDetails } = require('../utils/facilityHelper');
const { todayLocalStr, toLocalDateStr } = require('../utils/dateHelpers');
const {
    care_wh_rfq,
    care_wh_rfq_items,
    care_wh_rfq_supplier_quotes,
    care_wh_products,
    care_wh_product_categories,
    care_wh_suppliers,
    care_wh_purchase_orders,
    care_wh_po_items,
} = require('../models');

// ── Helpers ───────────────────────────────────────────────────────
const actor = (user) =>
    (user && user.firstName && user.lastName)
        ? (user.firstName + ' ' + user.lastName).trim()
        : (user && user.username) || 'unknown';

const fmtFCFA = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

// Add N business days to a date (skip Sat/Sun)
const addBusinessDays = (date, days) => {
    const d = new Date(date);
    let added = 0;
    while (added < days) {
        d.setDate(d.getDate() + 1);
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) added++;
    }
    return d;
};

// Generate RFQ number: RFQ-YYYYNNNN
const generateRfqNumber = async () => {
    const year   = new Date().getFullYear();
    const prefix = 'RFQ-' + year;
    const last   = await care_wh_rfq.findOne({
        where: { rfq_number: { [Op.like]: prefix + '%' } },
        order: [['rfq_id', 'DESC']],
        attributes: ['rfq_number'],
    });
    let seq = 1;
    if (last) {
        const n = parseInt(last.rfq_number.slice(prefix.length), 10);
        if (!isNaN(n)) seq = n + 1;
    }
    return prefix + String(seq).padStart(4, '0');
};

// Check and mark expired RFQs (called on list/dashboard)
const markExpiredRfqs = async () => {
    const today = todayLocalStr();
    await care_wh_rfq.update(
        { status: 'expired' },
        { where: { status: 'sent', expiry_date: { [Op.lt]: today } } }
    );
};

// ══════════════════════════════════════════════════════════════════
// LIST
// ══════════════════════════════════════════════════════════════════
exports.listRfqs = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        await markExpiredRfqs();

        const status = req.query.status || '';
        const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
        const PER    = 20;
        const where  = status ? { status } : {};

        const { count, rows: rfqs } = await care_wh_rfq.findAndCountAll({
            where,
            order:  [['rfq_id', 'DESC']],
            limit:  PER,
            offset: (page - 1) * PER,
        });

        const statusCounts = await care_wh_rfq.findAll({
            attributes: ['status', [fn('COUNT', col('rfq_id')), 'cnt']],
            group: ['status'], raw: true,
        });
        const countMap = {};
        statusCounts.forEach(r => { countMap[r.status] = parseInt(r.cnt, 10); });

        res.render('warehouse/rfq/list', {
            title: locale === 'fr' ? 'Demandes de cotation' : 'Requests for Quotation',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            rfqs, totalCount: count, totalPages: Math.ceil(count / PER),
            currentPage: page, statusFilter: status, countMap,
        });
    } catch (err) {
        console.error('List RFQs error:', err);
        res.status(500).send('Error: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════
// CREATE FORM
// ══════════════════════════════════════════════════════════════════
exports.createRfqForm = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const suppliers = await care_wh_suppliers.findAll({
            where: { is_active: 1 }, order: [['name', 'ASC']],
        });
        const allProducts = await care_wh_products.findAll({
            where: { is_active: 1 }, order: [['name', 'ASC']],
            attributes: ['product_id', 'name', 'item_code', 'unit_of_measure'],
        });
        res.render('warehouse/rfq/form', {
            title: locale === 'fr' ? 'Nouvelle demande de cotation' : 'New Request for Quotation',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            rfq: null, suppliers, allProducts, errors: [],
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// CREATE POST
// ══════════════════════════════════════════════════════════════════
exports.createRfq = async (req, res) => {
    const locale = req.locale || 'en';
    const { supplier_ids, product_ids, quantities, notes } = req.body;

    const sids = (Array.isArray(supplier_ids) ? supplier_ids : [supplier_ids]).filter(Boolean).map(Number);
    const pids = (Array.isArray(product_ids)  ? product_ids  : [product_ids]).filter(Boolean).map(Number);
    const qtys = (Array.isArray(quantities)   ? quantities   : [quantities]).filter(Boolean);

    const errors = [];
    if (sids.length === 0) errors.push(locale === 'fr' ? 'Au moins un fournisseur requis.' : 'At least one supplier required.');
    if (pids.length === 0) errors.push(locale === 'fr' ? 'Au moins un produit requis.'     : 'At least one product required.');

    if (errors.length) {
        const suppliers   = await care_wh_suppliers.findAll({ where: { is_active: 1 }, order: [['name','ASC']] });
        const allProducts = await care_wh_products.findAll({ where: { is_active: 1 }, order: [['name','ASC']], attributes: ['product_id','name','item_code','unit_of_measure'] });
        return res.render('warehouse/rfq/form', {
            title: locale === 'fr' ? 'Nouvelle demande de cotation' : 'New Request for Quotation',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            rfq: req.body, suppliers, allProducts, errors,
        });
    }

    try {
        const rfqNumber = await generateRfqNumber();
        const rfq = await care_wh_rfq.create({
            rfq_number:  rfqNumber,
            status:      'draft',
            created_by:  actor(req.user),
            notes:       notes ? notes.trim() : null,
        });

        // Create items
        const seen = new Set();
        for (let i = 0; i < pids.length; i++) {
            const pid = pids[i];
            if (!pid || seen.has(pid)) continue;
            seen.add(pid);
            await care_wh_rfq_items.create({
                rfq_id:             rfq.rfq_id,
                product_id:         pid,
                quantity_requested: Math.max(1, parseInt(qtys[i], 10) || 1),
            });
        }

        // Pre-create quote rows for each supplier × each product (no price yet)
        for (const sid of sids) {
            for (const pid of [...seen]) {
                await care_wh_rfq_supplier_quotes.create({
                    rfq_id: rfq.rfq_id, supplier_id: sid, product_id: pid,
                    unit_price: 0, quantity_available: 0, selected: 0,
                });
            }
        }

        await logActivity(req,
            'RFQ ' + rfqNumber + ' created — ' + pids.length + ' item(s) — ' + sids.length + ' supplier(s)',
            true, 'rfqController.js', req.user.user_id, req.user.username);

        res.redirect('/warehouse/rfq/' + rfq.rfq_id + '?success=created');
    } catch (err) {
        console.error('Create RFQ error:', err);
        const suppliers   = await care_wh_suppliers.findAll({ where: { is_active: 1 }, order: [['name','ASC']] });
        const allProducts = await care_wh_products.findAll({ where: { is_active: 1 }, order: [['name','ASC']], attributes: ['product_id','name','item_code','unit_of_measure'] });
        res.render('warehouse/rfq/form', {
            title: locale === 'fr' ? 'Nouvelle demande de cotation' : 'New Request for Quotation',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            rfq: req.body, suppliers, allProducts, errors: [err.message],
        });
    }
};

// ══════════════════════════════════════════════════════════════════
// DETAIL
// ══════════════════════════════════════════════════════════════════
exports.rfqDetail = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const rfqId  = parseInt(req.params.rfq_id, 10);
        await markExpiredRfqs();

        const rfq = await care_wh_rfq.findByPk(rfqId, {
            include: [
                { model: care_wh_rfq_items, as: 'items',
                  include: [{ model: care_wh_products, as: 'product',
                    attributes: ['name','item_code','unit_of_measure'] }] },
                { model: care_wh_rfq_supplier_quotes, as: 'quotes',
                  include: [{ model: care_wh_suppliers, as: 'supplier', attributes: ['name','supplier_id'] }] },
                { model: care_wh_purchase_orders, as: 'purchaseOrders',
                  attributes: ['po_id','po_number','supplier_id','total_amount','status'],
                  include: [{ model: care_wh_suppliers, as: 'supplier', attributes: ['name'] }] },
            ],
        });
        if (!rfq) return res.status(404).send(locale === 'fr' ? 'RFQ introuvable.' : 'RFQ not found.');

        // Organise quotes: map[supplier_id][product_id] = quote
        const quoteMap = {};
        const supplierIds = [];
        rfq.quotes.forEach(q => {
            if (!quoteMap[q.supplier_id]) { quoteMap[q.supplier_id] = {}; supplierIds.push(q.supplier_id); }
            quoteMap[q.supplier_id][q.product_id] = q;
        });
        // Unique suppliers
        const suppliers = [];
        const seenSup = new Set();
        rfq.quotes.forEach(q => {
            if (!seenSup.has(q.supplier_id)) {
                seenSup.add(q.supplier_id);
                suppliers.push({ supplier_id: q.supplier_id, name: q.supplier ? q.supplier.name : '#' + q.supplier_id });
            }
        });

        res.render('warehouse/rfq/detail', {
            title:      rfq.rfq_number,
            activePage: 'warehouse',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            rfq, suppliers, quoteMap, fmtFCFA,
            success: req.query.success || null,
        });
    } catch (err) {
        console.error('RFQ detail error:', err);
        res.status(500).send('Error: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════
// SUBMIT FOR MANAGER APPROVAL
// ══════════════════════════════════════════════════════════════════
exports.submitRfq = async (req, res) => {
    const rfqId = parseInt(req.params.rfq_id, 10);
    try {
        const rfq = await care_wh_rfq.findByPk(rfqId,
            { include: [{ model: care_wh_rfq_items, as: 'items' }] });
        if (!rfq) return res.status(404).json({ ok: false, error: 'Not found' });
        if (rfq.status !== 'draft') return res.status(400).json({ ok: false, error: 'Already submitted.' });
        if (!rfq.items || rfq.items.length === 0)
            return res.status(400).json({ ok: false, error: 'RFQ has no items.' });

        await rfq.update({ status: 'pending_manager', modify_time: new Date() });
        await logActivity(req, 'RFQ ' + rfq.rfq_number + ' submitted for manager approval',
            true, 'rfqController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: 'pending_manager' });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// MANAGER APPROVE RFQ
// ══════════════════════════════════════════════════════════════════
exports.approveRfq = async (req, res) => {
    const rfqId = parseInt(req.params.rfq_id, 10);
    try {
        if (!req.user.permissions.includes('Warehouse.Approve.RFQ') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const rfq = await care_wh_rfq.findByPk(rfqId);
        if (!rfq) return res.status(404).json({ ok: false, error: 'Not found' });
        if (rfq.status !== 'pending_manager')
            return res.status(400).json({ ok: false, error: 'Not awaiting manager approval.' });

        const now = new Date();
        await rfq.update({ status: 'approved', approved_by: actor(req.user), approved_at: now });
        await logActivity(req, 'RFQ ' + rfq.rfq_number + ' approved by manager',
            true, 'rfqController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: 'approved' });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// MARK AS SENT (approved → sent, set expiry)
// ══════════════════════════════════════════════════════════════════
exports.markRfqSent = async (req, res) => {
    const rfqId = parseInt(req.params.rfq_id, 10);
    try {
        const rfq = await care_wh_rfq.findByPk(rfqId);
        if (!rfq || rfq.status !== 'approved')
            return res.status(400).json({ ok: false, error: 'RFQ must be approved before sending.' });

        const now        = new Date();
        const expiry      = addBusinessDays(now, 6);
        const expiryStr   = toLocalDateStr(expiry);
        await rfq.update({
            status:      'sent',
            sent_at:     now,
            expiry_date: expiryStr,
        });
        await logActivity(req, 'RFQ ' + rfq.rfq_number + ' marked as sent, expires ' + expiryStr,
            true, 'rfqController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: 'sent', expiry_date: expiryStr });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// SAVE SUPPLIER QUOTE RESPONSE
// ══════════════════════════════════════════════════════════════════
exports.saveQuote = async (req, res) => {
    const rfqId = parseInt(req.params.rfq_id, 10);
    const { quotes } = req.body;
    // quotes = [{ supplier_id, product_id, unit_price, quantity_available, lead_time_days, notes }]
    try {
        const rfq = await care_wh_rfq.findByPk(rfqId);
        if (!rfq) return res.status(404).json({ ok: false, error: 'Not found' });
        if (!['sent','comparing','expired'].includes(rfq.status))
            return res.status(400).json({ ok: false, error: 'RFQ is not in a state to receive quotes.' });

        const now = new Date();
        for (const q of quotes) {
            await care_wh_rfq_supplier_quotes.update(
                {
                    unit_price:         parseFloat(q.unit_price) || 0,
                    quantity_available: parseInt(q.quantity_available, 10) || 0,
                    lead_time_days:     parseInt(q.lead_time_days, 10)  || 0,
                    notes:              q.notes || null,
                    responded_at:       now,
                },
                { where: { rfq_id: rfqId, supplier_id: q.supplier_id, product_id: q.product_id } }
            );
        }
        // Move to comparing if still in sent/expired
        if (rfq.status === 'sent' || rfq.status === 'expired') {
            await rfq.update({ status: 'comparing' });
        }
        await logActivity(req, 'Quotes entered for RFQ ' + rfq.rfq_number,
            true, 'rfqController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// SELECT QUOTES & GENERATE POs
// ══════════════════════════════════════════════════════════════════
exports.generatePos = async (req, res) => {
    const locale = req.locale || 'en';
    const rfqId  = parseInt(req.params.rfq_id, 10);
    const { selections } = req.body;
    // selections = [{ supplier_id, product_id }] — chosen combinations

    try {
        const rfq = await care_wh_rfq.findByPk(rfqId, {
            include: [
                { model: care_wh_rfq_items, as: 'items' },
                { model: care_wh_rfq_supplier_quotes, as: 'quotes',
                  include: [{ model: care_wh_suppliers, as: 'supplier' }] },
            ],
        });
        if (!rfq) return res.status(404).json({ ok: false, error: 'Not found' });
        if (rfq.status !== 'comparing')
            return res.status(400).json({ ok: false, error: 'RFQ must be in comparing status.' });

        if (!selections || selections.length === 0)
            return res.status(400).json({ ok: false, error: locale === 'fr' ? 'Aucune sélection.' : 'No selections made.' });

        // Mark selected quotes
        await care_wh_rfq_supplier_quotes.update({ selected: 0 }, { where: { rfq_id: rfqId } });
        for (const s of selections) {
            await care_wh_rfq_supplier_quotes.update(
                { selected: 1 },
                { where: { rfq_id: rfqId, supplier_id: s.supplier_id, product_id: s.product_id } }
            );
        }

        // Group selections by supplier → one PO per supplier
        const bySupplier = {};
        for (const s of selections) {
            if (!bySupplier[s.supplier_id]) bySupplier[s.supplier_id] = [];
            bySupplier[s.supplier_id].push(s.product_id);
        }

        const year   = new Date().getFullYear();
        const prefix = 'PO-' + year;
        const lastPo = await care_wh_purchase_orders.findOne({
            where: { po_number: { [Op.like]: prefix + '%' } },
            order: [['po_id', 'DESC']], attributes: ['po_number'],
        });
        let seq = lastPo ? (parseInt(lastPo.po_number.slice(prefix.length), 10) || 0) + 1 : 1;

        const createdPos = [];
        const creatorHasManagerPerm = req.user.permissions.includes('Warehouse.Approve.Manager') ||
                                      req.user.permissions.includes('Admin.FullAccess');

        for (const [supplierId, productIds] of Object.entries(bySupplier)) {
            const poNumber = prefix + String(seq++).padStart(4, '0');
            const poStatus = creatorHasManagerPerm ? 'pending_director' : 'draft';

            const po = await care_wh_purchase_orders.create({
                po_number:   poNumber,
                rfq_id:      rfqId,
                supplier_id: parseInt(supplierId, 10),
                status:      poStatus,
                created_by:  actor(req.user),
                total_amount: 0,
            });

            let total = 0;
            for (const pid of productIds) {
                const quote = rfq.quotes.find(q =>
                    q.supplier_id === parseInt(supplierId) && q.product_id === parseInt(pid));
                const rfqItem = rfq.items.find(i => i.product_id === parseInt(pid));
                const qty   = rfqItem ? rfqItem.quantity_requested : 1;
                const price = quote ? parseFloat(quote.unit_price) : 0;
                total += qty * price;
                await care_wh_po_items.create({
                    po_id:             po.po_id,
                    product_id:        parseInt(pid),
                    quantity_ordered:  qty,
                    quantity_received: 0,
                    unit_price:        price,
                    total_price:       qty * price,
                    status:            'pending',
                });
            }
            await po.update({ total_amount: total });
            createdPos.push({ po_id: po.po_id, po_number: poNumber });
        }

        // Close the RFQ
        await rfq.update({ status: 'closed' });
        await logActivity(req,
            'RFQ ' + rfq.rfq_number + ' closed — ' + createdPos.length + ' PO(s) generated',
            true, 'rfqController.js', req.user.user_id, req.user.username);

        res.json({ ok: true, pos: createdPos });
    } catch (err) {
        console.error('Generate POs error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════
// CANCEL / REJECT RFQ
// ══════════════════════════════════════════════════════════════════
exports.cancelRfq = async (req, res) => {
    const rfqId  = parseInt(req.params.rfq_id, 10);
    const reason = (req.body.reason || '').trim();
    try {
        const rfq = await care_wh_rfq.findByPk(rfqId);
        if (!rfq) return res.status(404).json({ ok: false, error: 'Not found' });
        if (['closed','cancelled'].includes(rfq.status))
            return res.status(400).json({ ok: false, error: 'Already closed.' });

        await rfq.update({
            status: 'cancelled',
            notes:  (rfq.notes || '') + '\n[' + new Date().toISOString() + '] Cancelled by ' + actor(req.user) + (reason ? ': ' + reason : ''),
        });
        await logActivity(req, 'RFQ ' + rfq.rfq_number + ' cancelled', true,
            'rfqController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// PRINT — one supplier's RFQ document
// ══════════════════════════════════════════════════════════════════
exports.printRfq = async (req, res) => {
    try {
        const rfqId     = parseInt(req.params.rfq_id, 10);
        const supplierId = parseInt(req.params.supplier_id, 10);

        const rfq = await care_wh_rfq.findByPk(rfqId, {
            include: [
                { model: care_wh_rfq_items, as: 'items',
                  include: [{ model: care_wh_products, as: 'product',
                    attributes: ['name','item_code','unit_of_measure'] }] },
            ],
        });
        const supplier = await care_wh_suppliers.findByPk(supplierId);
        if (!rfq || !supplier) return res.status(404).send('Not found');

        const facility = await getCurrentFacilityDetails(req);

        res.render('warehouse/rfq/print', {
            rfq, supplier, printDate: new Date(), user: req.user, facility,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};


