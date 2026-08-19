// routes/purchase-orders.js  (mounted under /warehouse/purchase-orders)
'use strict';
const express     = require('express');
const router      = express.Router();
const auth        = require('../middleware/authMiddleware');
const po          = require('../controllers/purchaseOrderController');

// ── List ──────────────────────────────────────────────────────────
router.get('/',              auth, po.listPOs);

// ── Create ────────────────────────────────────────────────────────
router.get('/new',           auth, po.createPoForm);
router.post('/new',          auth, po.createPo);

// ── Detail ────────────────────────────────────────────────────────
router.get('/:po_id',        auth, po.poDetail);

// ── Print (must come before :po_id catch-all sub-routes) ─────────
router.get('/:po_id/print',  auth, po.printPo);

// ── Item management (draft only) ─────────────────────────────────
router.post('/:po_id/items',             auth, po.addPoItem);
router.delete('/:po_id/items/:item_id',  auth, po.removePoItem);

// ── Workflow actions (JSON) ───────────────────────────────────────
router.post('/:po_id/submit',            auth, po.submitPo);
router.post('/:po_id/approve/manager',   auth, po.managerApprove);
router.post('/:po_id/approve/director',  auth, po.directorApprove);
router.post('/:po_id/approve/finance',   auth, po.financeApprove);
router.post('/:po_id/reject',            auth, po.rejectPo);
router.post('/:po_id/send',              auth, po.markSent);
router.post('/:po_id/cancel',            auth, po.cancelPo);

// ── Receive delivery ─────────────────────────────────────────────
router.get('/:po_id/receive',            auth, po.receiveForm);
router.post('/:po_id/receive',           auth, po.receiveDelivery);

// ── Close partial PO ─────────────────────────────────────────────
router.post('/:po_id/close',             auth, po.closePo);

// ── Product price lookup ──────────────────────────────────────────
router.get('/product/:product_id/price', auth, po.productPriceJson);

module.exports = router;


