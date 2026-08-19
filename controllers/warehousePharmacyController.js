// controllers/warehousePharmacyController.js
// Warehouse-side view of pharmacy orders — stock manager processes them
'use strict';
const { Op } = require('sequelize');
const {
    care_wh_pharmacy_orders,
    care_wh_pharmacy_order_items,
    care_wh_products,
    care_pharma_transit,
} = require('../models');

// ══════════════════════════════════════════════════════════════════
// LIST — all pharmacy orders visible to warehouse
// ══════════════════════════════════════════════════════════════════
exports.listPharmacyOrders = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const status = req.query.status || 'pending';
        const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
        const PER    = 25;
        const where  = status === 'all' ? {} : { status };

        const { count, rows: orders } = await care_wh_pharmacy_orders.findAndCountAll({
            where,
            include: [{
                model: care_wh_pharmacy_order_items, as: 'items',
                include: [{
                    model: care_wh_products, as: 'product',
                    attributes: ['name','item_code','current_stock','unit_of_measure'],
                    required: false,
                }],
            }],
            order:  [['order_id','DESC']],
            limit:  PER,
            offset: (page - 1) * PER,
        });

        // Status counts for tabs
        const rawCounts = await care_wh_pharmacy_orders.findAll({
            attributes: ['status',[require('sequelize').fn('COUNT','*'),'cnt']],
            group: ['status'], raw: true,
        });
        const countMap = {};
        rawCounts.forEach(r => { countMap[r.status] = parseInt(r.cnt,10); });

        res.render('warehouse/pharmacy-orders/list', {
            title:      locale === 'fr' ? 'Commandes pharmacie' : 'Pharmacy Orders',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            orders, count, countMap, statusFilter: status,
            totalPages: Math.ceil(count / PER), currentPage: page, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// DETAIL — warehouse view of one pharmacy order
// ══════════════════════════════════════════════════════════════════
exports.pharmacyOrderDetail = async (req, res) => {
    try {
        const locale  = req.locale || 'en';
        const orderId = parseInt(req.params.order_id, 10);

        const order = await care_wh_pharmacy_orders.findByPk(orderId, {
            include: [{
                model: care_wh_pharmacy_order_items, as: 'items',
                include: [{
                    model: care_wh_products, as: 'product',
                    attributes: ['name','item_code','current_stock','unit_of_measure'],
                    required: false,
                }],
            }],
        });
        if (!order) return res.status(404).send('Not found.');

        // Transit rows if already fulfilled
        const transitRows = await care_pharma_transit.findAll({
            where: { order_id: orderId },
            order: [['id','ASC']],
        });

        res.render('warehouse/pharmacy-orders/detail', {
            title:      order.order_number,
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            order, transitRows, success: req.query.success || null, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};
