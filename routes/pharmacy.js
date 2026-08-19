
// routes/pharmacy.js — Phase 7 redesign
'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const pc      = require('../controllers/pharmacyController');

// Dashboard
router.get('/',                                auth, pc.dashboard);

// Dispensing queue
router.get('/dispense',                        auth, pc.dispensingQueue);
router.get('/dispense/:bill_no',               auth, pc.dispenseBill);
router.post('/dispense/:bill_no/all',          auth, pc.dispenseAll);
router.post('/dispense/item/:bill_item_id',    auth, pc.dispenseItem);

// Stock
router.get('/stock',                           auth, pc.stockView);
router.post('/stock/:item_id/adjust',          auth, pc.adjustStock);
router.post('/stock/:item_id/settings',        auth, pc.updateStockSettings);
router.get('/stock/add',                       auth, pc.newStockItemForm);
router.post('/stock/add',                      auth, pc.addStockItem);
router.get('/stock/search-catalog',            auth, pc.stockItemSearch);

// Shelves
router.get('/shelves',                         auth, pc.listShelves);
router.post('/shelves',                        auth, pc.createShelf);
router.post('/shelves/:shelf_id/delete',       auth, pc.deleteShelf);

// Warehouse orders (pharmacy ordering from warehouse)
router.get('/orders',                          auth, pc.listOrders);
router.get('/orders/new',                      auth, pc.newOrderForm);
router.post('/orders/new',                     auth, pc.submitOrder);
router.get('/orders/:order_id',                auth, pc.orderDetail);
router.post('/orders/:order_id/cancel',        auth, pc.cancelOrder);
router.post('/orders/:order_id/reject',        auth, pc.rejectOrder);
router.post('/orders/:order_id/fulfil',        auth, pc.fulfilOrder);
router.post('/orders/:order_id/collect',       auth, pc.submitReceivingCount);
router.post('/orders/:order_id/confirm-receipt', auth, pc.confirmReceiving);
router.post('/orders/:order_id/write-off',     auth, pc.writeOffRemainder);

// Inventory count
router.get('/inventory-count',                 auth, pc.inventoryCount);
router.post('/inventory-count',                auth, pc.submitInventoryCount);

// Reports
router.get('/reports',                         auth, pc.reports);

module.exports = router;




