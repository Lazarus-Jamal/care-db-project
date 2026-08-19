// routes/stats.js
'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const sc      = require('../controllers/statsController');

router.get('/consultations',    auth, sc.consultations);
router.get('/diagnostics',      auth, sc.diagnostics);
router.get('/hospitalisations', auth, sc.hospitalisations);
router.get('/finances',         auth, sc.finances);
router.get('/medication-orders',auth, sc.medOrders);
router.get('/lab',              auth, sc.lab);
router.get('/imaging',          auth, sc.imaging);

module.exports = router;
