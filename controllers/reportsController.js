
// controllers/reportsController.js
'use strict';
const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const sequelize   = require('../config/database');
const { todayLocalStr, addDaysLocalStr, toLocalDateStr, toLocalYearMonthStr } = require('../utils/dateHelpers');
const {
    care_wh_products,
    care_wh_product_categories,
    care_wh_suppliers,
    care_wh_purchase_orders,
    care_wh_po_items,
    care_wh_deliveries,
    care_wh_delivery_items,
    care_wh_quality_checks,
    care_wh_stock,
    care_wh_stock_movements,
    care_wh_inventory_counts,
    care_wh_inventory_count_items,
    care_wh_pharmacy_orders,
    care_wh_pharmacy_order_items,
    care_wh_reimbursement_requests,
} = require('../models');

const fmtFCFA = (n) => Number(n || 0).toLocaleString('fr-FR');
const TODAY   = () => todayLocalStr();
const IN_DAYS = (n) => addDaysLocalStr(n);

// Default date range helpers
const defaultFrom = () => {
    const d = new Date(); d.setMonth(d.getMonth()-3);
    return toLocalDateStr(d);
};

// ══════════════════════════════════════════════════════════════════
// HUB
// ══════════════════════════════════════════════════════════════════
exports.hub = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        // Quick stats for each card
        const [totalProducts, lowStock, pendingPos, totalMovements,
               openCounts, pendingReimb] = await Promise.all([
            care_wh_products.count({ where: { is_active: 1 } }),
            care_wh_products.count({ where: { is_active: 1,
                current_stock: { [Op.lte]: sequelize.col('reorder_level') },
                reorder_level: { [Op.gt]: 0 } } }),
            care_wh_purchase_orders.count({ where: {
                status: { [Op.in]: ['pending_manager','pending_director','pending_finance','approved','sent'] } } }),
            care_wh_stock_movements.count(),
            care_wh_inventory_counts.count({ where: { status: { [Op.in]: ['in_progress','pending_approval'] } } }),
            care_wh_reimbursement_requests.count({ where: {
                status: { [Op.in]: ['pending','pending_director','approved_director'] } } }),
        ]);
        res.render('warehouse/reports/hub', {
            title:      locale === 'fr' ? 'Rapports & Analytiques' : 'Reports & Analytics',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            totalProducts, lowStock, pendingPos, totalMovements,
            openCounts, pendingReimb, fmtFCFA,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// REPORT 1 — STOCK VALUATION
// Uses last unit_price from care_wh_po_items per product
// ══════════════════════════════════════════════════════════════════
exports.stockValuation = async (req, res) => {
    try {
        const locale   = req.locale || 'en';
        const catId    = parseInt(req.query.category_id, 10) || null;
        const lowOnly  = req.query.low_stock === '1';
        const print    = req.query.print === '1';

        // Last known unit price per product from PO items
        const lastPrices = await sequelize.query(`
            SELECT poi.product_id,
                   poi.unit_price
            FROM   care_wh_po_items poi
            INNER JOIN (
                SELECT product_id, MAX(item_id) AS max_item_id
                FROM   care_wh_po_items
                GROUP  BY product_id
            ) latest ON poi.item_id = latest.max_item_id
        `, { type: QueryTypes.SELECT });
        const priceMap = {};
        lastPrices.forEach(r => { priceMap[r.product_id] = parseFloat(r.unit_price || 0); });

        const where = { is_active: 1 };
        if (catId)   where.category_id = catId;
        if (lowOnly) where.current_stock = { [Op.lte]: sequelize.col('reorder_level') };

        const products = await care_wh_products.findAll({
            where,
            include: [{ model: care_wh_product_categories, as: 'category',
                attributes: ['name'], required: false }],
            order: [['name','ASC']],
        });

        const categories = await care_wh_product_categories.findAll({
            where: { is_active: 1 }, order: [['name','ASC']] });

        // Enrich with price and value
        let totalValue = 0;
        const rows = products.map(p => {
            const price = priceMap[p.product_id] || 0;
            const value = p.current_stock * price;
            totalValue += value;
            return { ...p.dataValues,
                categoryName: p.category ? p.category.name : '—',
                lastPrice: price, totalValue: value };
        });

        // Group by category for summary
        const byCat = {};
        rows.forEach(r => {
            const k = r.categoryName;
            if (!byCat[k]) byCat[k] = { name: k, items: 0, qty: 0, value: 0 };
            byCat[k].items++;
            byCat[k].qty   += r.current_stock;
            byCat[k].value += r.totalValue;
        });

        const view = print ? 'warehouse/reports/print/valuation'
                           : 'warehouse/reports/valuation';
        res.render(view, {
            title:      locale === 'fr' ? 'Valorisation du stock' : 'Stock Valuation',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            rows, categories, byCat: Object.values(byCat).sort((a,b) => b.value-a.value),
            totalValue, catId, lowOnly, fmtFCFA,
            generatedAt: new Date(),
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// REPORT 2 — PROCUREMENT SUMMARY
// ══════════════════════════════════════════════════════════════════
exports.procurement = async (req, res) => {
    try {
        const locale    = req.locale || 'en';
        const dateFrom  = req.query.date_from  || defaultFrom();
        const dateTo    = req.query.date_to    || TODAY();
        const supplierId= parseInt(req.query.supplier_id, 10) || null;
        const print     = req.query.print === '1';

        const poWhere = {
            create_time: { [Op.between]: [dateFrom+' 00:00:00', dateTo+' 23:59:59'] },
        };
        if (supplierId) poWhere.supplier_id = supplierId;

        const pos = await care_wh_purchase_orders.findAll({
            where: poWhere,
            include: [{ model: care_wh_suppliers, as: 'supplier',
                attributes: ['name'], required: false }],
            order: [['create_time','ASC']],
            attributes: ['po_id','po_number','status','total_amount','is_paid',
                'paid_amount','create_time','supplier_id'],
        });

        // Status funnel
        const statusCount = {};
        ['draft','pending_manager','pending_director','pending_finance',
         'approved','sent','partial','received','closed','cancelled'].forEach(s => {
            statusCount[s] = pos.filter(p => p.status === s).length;
        });

        // Monthly totals
        const monthly = {};
        pos.forEach(p => {
            const ym = toLocalYearMonthStr(new Date(p.create_time));
            if (!monthly[ym]) monthly[ym] = { month: ym, count: 0, total: 0, paid: 0 };
            monthly[ym].count++;
            monthly[ym].total += parseFloat(p.total_amount || 0);
            if (p.is_paid) monthly[ym].paid += parseFloat(p.paid_amount || 0);
        });

        // By supplier
        const bySupplier = {};
        pos.forEach(p => {
            const k = p.supplier ? p.supplier.name : 'Inconnu';
            if (!bySupplier[k]) bySupplier[k] = { name: k, count: 0, total: 0 };
            bySupplier[k].count++;
            bySupplier[k].total += parseFloat(p.total_amount || 0);
        });

        // Reimbursements in same period
        const reimbs = await care_wh_reimbursement_requests.findAll({
            where: {
                create_time: { [Op.between]: [dateFrom+' 00:00:00', dateTo+' 23:59:59'] },
                status: 'paid',
            },
            attributes: ['amount','payment_method','paid_at'],
        });
        const reimbTotal = reimbs.reduce((s,r) => s + parseFloat(r.amount||0), 0);
        const reimbByMethod = {};
        reimbs.forEach(r => {
            const k = r.payment_method || 'unknown';
            reimbByMethod[k] = (reimbByMethod[k] || 0) + parseFloat(r.amount||0);
        });

        const suppliers  = await care_wh_suppliers.findAll({
            where: { is_active: 1 }, order: [['name','ASC']], attributes: ['supplier_id','name'] });
        const grandTotal = pos.reduce((s,p) => s + parseFloat(p.total_amount||0), 0);

        const view = print ? 'warehouse/reports/print/procurement'
                           : 'warehouse/reports/procurement';
        res.render(view, {
            title:      locale === 'fr' ? 'Synthese des achats' : 'Procurement Summary',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            pos, suppliers, supplierId, dateFrom, dateTo,
            statusCount, monthly: Object.values(monthly).sort((a,b)=>a.month.localeCompare(b.month)),
            bySupplier: Object.values(bySupplier).sort((a,b)=>b.total-a.total),
            grandTotal, reimbTotal, reimbByMethod, fmtFCFA,
            generatedAt: new Date(),
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// REPORT 3 — SUPPLIER PERFORMANCE
// ══════════════════════════════════════════════════════════════════
exports.supplierPerformance = async (req, res) => {
    try {
        const locale   = req.locale || 'en';
        const dateFrom = req.query.date_from || defaultFrom();
        const dateTo   = req.query.date_to   || TODAY();
        const print    = req.query.print === '1';

        const suppliers = await care_wh_suppliers.findAll({
            where: { is_active: 1 }, order: [['name','ASC']] });

        const rows = [];
        for (const sup of suppliers) {
            const pos = await care_wh_purchase_orders.findAll({
                where: { supplier_id: sup.supplier_id,
                    create_time: { [Op.between]: [dateFrom+' 00:00:00', dateTo+' 23:59:59'] } },
                attributes: ['po_id','total_amount','status','sent_at'],
            });
            if (!pos.length) continue;

            const poIds = pos.map(p => p.po_id);
            const totalValue = pos.reduce((s,p) => s+parseFloat(p.total_amount||0), 0);

            // Deliveries for these POs
            const deliveries = await care_wh_deliveries.findAll({
                where: { po_id: { [Op.in]: poIds } },
                attributes: ['delivery_id','po_id','received_at','status'],
            });
            const delivIds = deliveries.map(d => d.delivery_id);

            // Lead time: avg days from sent_at to received_at
            let leadDays = null;
            if (deliveries.length) {
                const poMap = {}; pos.forEach(p => { poMap[p.po_id] = p; });
                const diffs = deliveries
                    .filter(d => poMap[d.po_id] && poMap[d.po_id].sent_at)
                    .map(d => (new Date(d.received_at) - new Date(poMap[d.po_id].sent_at)) / 86400000);
                if (diffs.length) leadDays = Math.round(diffs.reduce((s,v)=>s+v,0)/diffs.length);
            }

            // QC: accepted vs rejected
            let qcAccepted = 0, qcRejected = 0;
            if (delivIds.length) {
                const items = await care_wh_delivery_items.findAll({
                    where: { delivery_id: { [Op.in]: delivIds } },
                    include: [{ model: care_wh_quality_checks, as: 'qcChecks',
                        attributes: ['quantity_accepted','quantity_rejected','temperature_ok'],
                        required: false }],
                    attributes: ['id'],
                });
                items.forEach(item => {
                    (item.qcChecks||[]).forEach(q => {
                        qcAccepted += (q.quantity_accepted||0);
                        qcRejected += (q.quantity_rejected||0);
                    });
                });
            }
            const qcTotal = qcAccepted + qcRejected;
            const rejRate = qcTotal > 0 ? ((qcRejected/qcTotal)*100).toFixed(1) : null;

            rows.push({
                supplier:   sup.name,
                supplier_id:sup.supplier_id,
                poCount:    pos.length,
                totalValue,
                delivCount: deliveries.length,
                leadDays,
                qcAccepted, qcRejected, rejRate,
            });
        }
        rows.sort((a,b) => b.totalValue - a.totalValue);

        const view = print ? 'warehouse/reports/print/suppliers'
                           : 'warehouse/reports/suppliers';
        res.render(view, {
            title:      locale === 'fr' ? 'Performance fournisseurs' : 'Supplier Performance',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            rows, dateFrom, dateTo, fmtFCFA, generatedAt: new Date(),
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// REPORT 4 — STOCK CONSUMPTION (Pharmacy Issues)
// ══════════════════════════════════════════════════════════════════
exports.consumption = async (req, res) => {
    try {
        const locale   = req.locale || 'en';
        const dateFrom = req.query.date_from || defaultFrom();
        const dateTo   = req.query.date_to   || TODAY();
        const catId    = parseInt(req.query.category_id, 10) || null;
        const print    = req.query.print === '1';

        // All issue movements in period
        const movements = await care_wh_stock_movements.findAll({
            where: {
                movement_type: 'issue',
                performed_at: { [Op.between]: [dateFrom+' 00:00:00', dateTo+' 23:59:59'] },
            },
            include: [{ model: care_wh_products, as: 'product',
                attributes: ['name','item_code','unit_of_measure','category_id'],
                include: [{ model: care_wh_product_categories, as: 'category',
                    attributes: ['name'], required: false }],
                required: false }],
            attributes: ['movement_id','product_id','quantity','performed_at'],
            order: [['performed_at','ASC']],
        });

        // Group by product
        const byProduct = {};
        movements.forEach(m => {
            const pid = m.product_id;
            if (!byProduct[pid]) byProduct[pid] = {
                product_id: pid,
                name:    m.product ? m.product.name        : '#'+pid,
                code:    m.product ? m.product.item_code   : '',
                unit:    m.product ? m.product.unit_of_measure : '',
                catName: m.product && m.product.category ? m.product.category.name : '—',
                cat_id:  m.product ? m.product.category_id : null,
                totalIssued: 0, issueCount: 0,
            };
            byProduct[pid].totalIssued += Math.abs(m.quantity);
            byProduct[pid].issueCount++;
        });

        // Filter by category
        let rows = Object.values(byProduct);
        if (catId) rows = rows.filter(r => r.cat_id === catId);
        rows.sort((a,b) => b.totalIssued - a.totalIssued);

        // Monthly trend (top 5 products)
        const top5ids = rows.slice(0,5).map(r => r.product_id);
        const monthly = {};
        movements.filter(m => top5ids.includes(m.product_id)).forEach(m => {
            const ym = m.performed_at ? toLocalYearMonthStr(new Date(m.performed_at)) : '';
            if (!monthly[ym]) monthly[ym] = { month: ym };
            monthly[ym][m.product_id] = (monthly[ym][m.product_id]||0) + Math.abs(m.quantity);
        });

        const categories = await care_wh_product_categories.findAll({
            where: { is_active: 1 }, order: [['name','ASC']] });

        const view = print ? 'warehouse/reports/print/consumption'
                           : 'warehouse/reports/consumption';
        res.render(view, {
            title:      locale === 'fr' ? 'Consommation stock' : 'Stock Consumption',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            rows, categories, catId, dateFrom, dateTo,
            monthly: Object.values(monthly).sort((a,b)=>a.month.localeCompare(b.month)),
            top5: rows.slice(0,5), fmtFCFA, generatedAt: new Date(),
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// REPORT 5 — INVENTORY DISCREPANCIES
// ══════════════════════════════════════════════════════════════════
exports.discrepancies = async (req, res) => {
    try {
        const locale   = req.locale || 'en';
        const dateFrom = req.query.date_from || defaultFrom();
        const dateTo   = req.query.date_to   || TODAY();
        const print    = req.query.print === '1';

        const counts = await care_wh_inventory_counts.findAll({
            where: {
                status: 'approved',
                count_date: { [Op.between]: [dateFrom, dateTo] },
            },
            include: [{
                model: care_wh_inventory_count_items, as: 'items',
                required: false,
                include: [
                    { model: care_wh_products, as: 'product',
                      attributes: ['name','item_code','unit_of_measure'], required: false },
                ],
            }],
            order: [['count_date','DESC']],
        });

        // Flatten all items with variance
        const allItems = [];
        counts.forEach(c => {
            (c.items||[]).forEach(item => {
                const sys     = item.system_qty || 0;
                const counted = item.counted_qty != null ? item.counted_qty : sys;
                const variance= counted - sys;
                if (variance !== 0) {
                    allItems.push({
                        count_number: c.count_number,
                        count_date:   c.count_date,
                        product:      item.product ? item.product.name : '#'+item.product_id,
                        item_code:    item.product ? item.product.item_code : '',
                        unit:         item.product ? item.product.unit_of_measure : '',
                        system_qty:   sys,
                        counted_qty:  counted,
                        variance,
                        variance_reason: item.variance_reason || '',
                        adjusted:     item.adjustment_applied,
                    });
                }
            });
        });
        allItems.sort((a,b) => Math.abs(b.variance) - Math.abs(a.variance));

        // Summary per count
        const countSummary = counts.map(c => {
            const items = c.items||[];
            const withVar = items.filter(i => {
                const v = (i.counted_qty||i.system_qty||0) - (i.system_qty||0);
                return v !== 0;
            });
            const totalVar = withVar.reduce((s,i) => s + Math.abs((i.counted_qty||i.system_qty||0)-(i.system_qty||0)), 0);
            return {
                count_number: c.count_number,
                count_date:   c.count_date,
                total_items:  items.length,
                with_variance:withVar.length,
                total_variance: totalVar,
                initiated_by: c.initiated_by,
            };
        });

        const view = print ? 'warehouse/reports/print/discrepancies'
                           : 'warehouse/reports/discrepancies';
        res.render(view, {
            title:      locale === 'fr' ? 'Ecarts inventaire' : 'Inventory Discrepancies',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            allItems, countSummary, dateFrom, dateTo, fmtFCFA,
            generatedAt: new Date(),
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// REPORT 6 — QC LOG
// ══════════════════════════════════════════════════════════════════
exports.qcLog = async (req, res) => {
    try {
        const locale   = req.locale || 'en';
        const dateFrom = req.query.date_from || defaultFrom();
        const dateTo   = req.query.date_to   || TODAY();
        const result   = req.query.result    || '';
        const print    = req.query.print === '1';

        const qcWhere = {
            checked_at: { [Op.between]: [dateFrom+' 00:00:00', dateTo+' 23:59:59'] },
        };
        if (result) qcWhere.result = result;

        const checks = await care_wh_quality_checks.findAll({
            where: qcWhere,
            include: [{
                model: care_wh_delivery_items, as: 'deliveryItem',
                attributes: ['delivery_id','product_id','quantity_delivered'],
                include: [
                    { model: care_wh_products, as: 'product',
                      attributes: ['name','item_code'], required: false },
                    { model: care_wh_deliveries, as: 'delivery',
                      attributes: ['delivery_id','po_id'],
                      include: [{ model: care_wh_purchase_orders, as: 'po',
                          attributes: ['po_number','supplier_id'],
                          include: [{ model: care_wh_suppliers, as: 'supplier',
                              attributes: ['name'], required: false }],
                          required: false }],
                      required: false },
                ],
                required: false,
            }],
            order: [['checked_at','DESC']],
        });

        // Summary stats
        const total    = checks.length;
        const passed   = checks.filter(q => q.result === 'pass').length;
        const failed   = checks.filter(q => q.result === 'fail').length;
        const tempFail = checks.filter(q => q.temperature_ok === 0).length;
        const totalAcc = checks.reduce((s,q) => s+(q.quantity_accepted||0), 0);
        const totalRej = checks.reduce((s,q) => s+(q.quantity_rejected||0), 0);

        // By supplier
        const bySupplier = {};
        checks.forEach(q => {
            const sup = q.deliveryItem && q.deliveryItem.delivery &&
                        q.deliveryItem.delivery.po &&
                        q.deliveryItem.delivery.po.supplier
                        ? q.deliveryItem.delivery.po.supplier.name : '—';
            if (!bySupplier[sup]) bySupplier[sup] = { name: sup, pass: 0, fail: 0, rejected: 0 };
            bySupplier[sup][q.result === 'pass' ? 'pass' : 'fail']++;
            bySupplier[sup].rejected += (q.quantity_rejected||0);
        });

        const view = print ? 'warehouse/reports/print/qc'
                           : 'warehouse/reports/qc';
        res.render(view, {
            title:      locale === 'fr' ? 'Journal QC' : 'QC Log',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            checks, total, passed, failed, tempFail, totalAcc, totalRej,
            bySupplier: Object.values(bySupplier).sort((a,b)=>(b.fail+b.pass)-(a.fail+a.pass)),
            dateFrom, dateTo, result, fmtFCFA, generatedAt: new Date(),
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};




