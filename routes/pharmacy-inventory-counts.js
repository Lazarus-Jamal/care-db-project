
// routes/pharmacy-inventory-counts.js — mounted under /pharmacy/inventory-counts
'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const pic     = require('../controllers/pharmacyInventoryCountController');

router.get('/',                      auth, pic.listCounts);
router.get('/new',                   auth, pic.createCountForm);
router.post('/new',                  auth, pic.createCount);

// 20% cycle count — manual picker (must come before /:count_id routes)
router.get('/picker',                auth, pic.pickerForm);
router.get('/picker/search',         auth, pic.pickerSearch);

router.get('/:count_id',             auth, pic.countDetail);
router.get('/:count_id/print',       auth, pic.printCountSheet);

// Workflow
router.post('/:count_id/start',      auth, pic.startCount);
router.post('/:count_id/results',    auth, pic.saveResults);
router.post('/:count_id/submit',     auth, pic.submitCount);
router.post('/:count_id/approve',    auth, pic.approveCount);
router.post('/:count_id/cancel',     auth, pic.cancelCount);

module.exports = router;
