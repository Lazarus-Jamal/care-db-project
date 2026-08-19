// routes/billing.js
'use strict';
const express            = require('express');
const router             = express.Router();
const authMiddleware     = require('../middleware/authMiddleware');
const billingController  = require('../controllers/billingController');

// Billing worklist — billing clerk, cashier, finance officer
router.get('/worklist',
    authMiddleware, billingController.worklist);

// Bill detail page
router.get('/bill/:bill_no',
    authMiddleware, billingController.billDetail);

// Collect payment (POST — cashier or billing clerk)
router.post('/bill/:bill_no/pay',
    authMiddleware, billingController.collectPayment);

// Printable receipt
router.get('/receipt/:payment_id',
    authMiddleware, billingController.receipt);

// JSON endpoints for dashboard
router.get('/dashboard-data',
    authMiddleware, billingController.dashboardBills);

router.get('/bill/:bill_no/items-json',
    authMiddleware, billingController.billItemsJson);

// Sales report — cashier and billing staff
router.get('/sales-report',
    authMiddleware, billingController.salesReport);

module.exports = router;


