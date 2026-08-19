
// routes/auth.js
'use strict';
const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// GET: Login page — csrfToken injected by global middleware
router.get('/login', (req, res) => {
    res.render('auth/login', {
        title:      'Connexion',
        user:       null,
        activePage: 'login',
        csrfToken:  req.csrfToken(),
    });
});

// GET: Server time (read-only)
router.get('/server-time', authController.getServerTime);

// POST: Login — inherits CSRF protection from app-level middleware
router.post('/login', authController.login);

// Multi-Facility Phase 1 — facility picker (only reached when a user is
// authorized for more than one facility; see authController.login)
router.get('/select-facility',  authController.selectFacilityForm);
router.post('/select-facility', authController.selectFacility);
router.get('/select-pharmacy-unit',  authController.selectPharmacyUnitForm);
router.post('/select-pharmacy-unit', authController.selectPharmacyUnit);

// GET: Logout
router.get('/logout', authMiddleware, authController.logout);


module.exports = router;




