// routes/prescriptions.js
'use strict';
const express                  = require('express');
const router                   = express.Router();
const authMiddleware           = require('../middleware/authMiddleware');
const prescriptionController   = require('../controllers/prescriptionController');

// Prescription form for a specific encounter
router.get('/encounter/:enc_nr',
    authMiddleware, prescriptionController.prescribeForm);

// Submit prescription cart (JSON)
router.post('/encounter/:enc_nr',
    authMiddleware, prescriptionController.submitPrescription);

// Item search (JSON)
router.get('/search',
    authMiddleware, prescriptionController.searchItems);

// Stop a prescription item
router.post('/:prx_nr/stop',
    authMiddleware, prescriptionController.stopPrescription);

module.exports = router;
