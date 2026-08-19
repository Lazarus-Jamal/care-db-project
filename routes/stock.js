// routes/stock.js — mounted under /warehouse/stock
'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const sc      = require('../controllers/stockController');

router.get('/',              auth, sc.stockStatus);
router.get('/movements',     auth, sc.movementsLedger);
router.get('/expiry',        auth, sc.expiryReport);
router.get('/issue',         auth, sc.issueForm);
router.post('/issue',        auth, sc.issueStock);

module.exports = router;
