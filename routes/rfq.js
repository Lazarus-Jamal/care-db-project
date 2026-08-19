// routes/rfq.js — mounted under /warehouse/rfq
'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const rfq     = require('../controllers/rfqController');

router.get('/',                          auth, rfq.listRfqs);
router.get('/new',                       auth, rfq.createRfqForm);
router.post('/new',                      auth, rfq.createRfq);
router.get('/:rfq_id',                   auth, rfq.rfqDetail);
router.get('/:rfq_id/print/:supplier_id',auth, rfq.printRfq);

// Workflow
router.post('/:rfq_id/submit',           auth, rfq.submitRfq);
router.post('/:rfq_id/approve',          auth, rfq.approveRfq);
router.post('/:rfq_id/send',             auth, rfq.markRfqSent);
router.post('/:rfq_id/cancel',           auth, rfq.cancelRfq);

// Quote entry + PO generation
router.post('/:rfq_id/quotes',           auth, rfq.saveQuote);
router.post('/:rfq_id/generate-pos',     auth, rfq.generatePos);

module.exports = router;
