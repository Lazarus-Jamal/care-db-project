// routes/encounters.js
'use strict';
const express             = require('express');
const router              = express.Router();
const authMiddleware      = require('../middleware/authMiddleware');
const encounterController = require('../controllers/encounterController');

// Worklist page
router.get('/worklist', authMiddleware, encounterController.worklist);

// JSON action endpoints (worklist)
router.post('/:nr/activate',       authMiddleware, encounterController.activate);
router.post('/:nr/discharge',      authMiddleware, encounterController.discharge);
router.post('/:nr/transfer',       authMiddleware, encounterController.transfer);
router.post('/:nr/admit-inpatient',authMiddleware, encounterController.admitInpatient);

// CIM10 diagnostic search
router.get('/cim10/search',        authMiddleware, encounterController.cim10Search);

// Vitals
router.get( '/:nr/vitals-json',    authMiddleware, encounterController.vitalsJson);
router.post('/:nr/vitals',         authMiddleware, encounterController.saveVital);

// Clinical notes
router.get( '/:nr/notes-json',     authMiddleware, encounterController.notesJson);
router.post('/:nr/notes',          authMiddleware, encounterController.saveNote);

// Diagnoses
router.get( '/:nr/diagnoses-json', authMiddleware, encounterController.diagnosesJson);
router.post('/:nr/diagnoses',      authMiddleware, encounterController.saveDiagnoses);
router.delete('/diagnoses/:dx_nr', authMiddleware, encounterController.deleteDiagnosis);

module.exports = router;
