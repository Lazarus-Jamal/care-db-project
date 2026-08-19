// routes/warehouse-pharmacy.js
'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const wpc     = require('../controllers/warehousePharmacyController');

router.get('/',          auth, wpc.listPharmacyOrders);
router.get('/:order_id', auth, wpc.pharmacyOrderDetail);

module.exports = router;
