// routes/reimbursements.js — mounted under /finances/reimbursements
'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const upload  = require('../middleware/uploadMiddleware');
const rc      = require('../controllers/reimbursementController');

router.get('/',                      auth, rc.listReimbursements);
router.get('/new',                   auth, rc.createForm);
router.post('/new',                  auth, upload.array('receipts', 5), rc.createReimbursement);
router.get('/:reimb_id',             auth, rc.reimbDetail);

// Workflow
router.post('/:reimb_id/submit',     auth, rc.submitRequest);
router.post('/:reimb_id/approve',    auth, rc.directorApprove);
router.post('/:reimb_id/pay',        auth, rc.markPaid);
router.post('/:reimb_id/reject',     auth, rc.rejectRequest);
router.post('/:reimb_id/cancel',     auth, rc.cancelRequest);
router.post('/:reimb_id/receipt',    auth, upload.single('receipt'), rc.uploadReceipt);

module.exports = router;
