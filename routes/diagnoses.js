// routes/diagnoses.js
'use strict';
const express              = require('express');
const router               = express.Router();
const authMiddleware       = require('../middleware/authMiddleware');
const diagnosisController  = require('../controllers/diagnosisController');

// Diagnosis form for a specific encounter
router.get('/encounter/:enc_nr',
    authMiddleware, diagnosisController.diagnoseForm);

// Submit diagnosis cart
router.post('/encounter/:enc_nr',
    authMiddleware, diagnosisController.submitDiagnoses);

module.exports = router;
