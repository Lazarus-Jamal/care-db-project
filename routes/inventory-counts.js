// routes/inventory-counts.js — mounted under /warehouse/inventory-counts
'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const ic      = require('../controllers/inventoryCountController');

router.get('/',                      auth, ic.listCounts);
router.get('/new',                   auth, ic.createCountForm);
router.post('/new',                  auth, ic.createCount);
router.get('/:count_id',             auth, ic.countDetail);
router.get('/:count_id/print',       auth, ic.printCountSheet);

// Workflow
router.post('/:count_id/start',      auth, ic.startCount);
router.post('/:count_id/results',    auth, ic.saveResults);
router.post('/:count_id/submit',     auth, ic.submitCount);
router.post('/:count_id/approve',    auth, ic.approveCount);

router.post('/:count_id/cancel',     auth, ic.cancelCount);

module.exports = router;


