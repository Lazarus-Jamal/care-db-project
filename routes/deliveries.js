// routes/deliveries.js — mounted under /warehouse/deliveries
'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const dc      = require('../controllers/deliveryController');

router.get('/',                          auth, dc.listDeliveries);
router.get('/:delivery_id',              auth, dc.deliveryDetail);
router.post('/:delivery_id/qc',          auth, dc.submitQC);
router.post('/:delivery_id/shelve',      auth, dc.shelveItems);

module.exports = router;
