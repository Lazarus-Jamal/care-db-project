
// routes/patient.js — updated with admission routes
'use strict';
const express              = require('express');
const router               = express.Router();
const authMiddleware       = require('../middleware/authMiddleware');
const patientController    = require('../controllers/patientController');
const admissionController  = require('../controllers/admissionController');
const plc                  = require('../controllers/patientListsController');
const path                 = require('path');
const upload               = require('../middleware/uploadMiddleware');

// Serve patient photos (saved to public/images/ by uploadMiddleware)
router.get('/photos/:filename', (req, res) => {
    const filePath = path.join(__dirname, '..', 'public', 'images', req.params.filename);
    res.sendFile(filePath, err => {
        if (err) res.status(404).send('File not found');
    });
});

// Patient list
router.get('/list', authMiddleware, patientController.listPatients);

// Patient record
router.get('/:pid/record', authMiddleware, patientController.getPatientRecord);

// Patient admission
router.get('/:pid/admit',  authMiddleware, admissionController.admitForm);
router.post('/:pid/admit', authMiddleware, admissionController.admitPatient);

// Patient referral to another facility -- see MULTI_FACILITY_IMPLEMENTATION_PLAN.md §2.5
router.post('/:pid/refer', authMiddleware, require('../controllers/referralController').referPatient);

// Patient edit
router.get('/:pid/edit',  authMiddleware, patientController.editPatientForm);
router.post('/:pid/edit', authMiddleware,
    (req, res, next) => {
        upload.single('photo')(req, res, err => {
            if (err) return res.redirect('/patients/' + req.params.pid + '/edit?error=upload');
            next();
        });
    },
    patientController.updatePatient
);

// Duplicate-patient check (advisory only — see patientController.checkDuplicate)
router.post('/check-duplicate', authMiddleware, patientController.checkDuplicate);

// Patient registration
router.get('/create', patientController.createPatientForm);
router.post('/create', authMiddleware,
    (req, res, next) => {
        upload.single('photo')(req, res, err => {
            if (err) {
                return res.render('patients/createPatient', {
                    title:      req.t.patients.createTitle,
                    user:       req.user,
                    errors:     [err.message],
                    success:    null,
                    activePage: 'patients/create',
                    csrfToken:  req.csrfToken(),
                    countries:  patientController.getCountriesList(),
                    tribes:     [],
                });
            }
            next();
        });
    },
    patientController.createPatient
);

// Prescription
router.get('/prescriptions/add/:pid', patientController.createPrescriptionForm);
router.post('/prescriptions/add',     patientController.addPrescription);

// Consultations list
router.get('/consultations', authMiddleware, plc.consultations);

// Prescriptions list
router.get('/prescriptions', authMiddleware, plc.prescriptions);

// Appointments list
router.get('/appointments', authMiddleware, plc.appointments);

module.exports = router;








