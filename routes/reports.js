// routes/reports.js — mounted under /warehouse/reports
'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const rc      = require('../controllers/reportsController');

router.get('/',              auth, rc.hub);
router.get('/valuation',     auth, rc.stockValuation);
router.get('/procurement',   auth, rc.procurement);
router.get('/suppliers',     auth, rc.supplierPerformance);
router.get('/consumption',   auth, rc.consumption);
router.get('/discrepancies', auth, rc.discrepancies);
router.get('/qc',            auth, rc.qcLog);

module.exports = router;
