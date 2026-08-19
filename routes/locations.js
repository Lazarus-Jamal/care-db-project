// routes/locations.js — mounted under /warehouse/locations
'use strict';
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const loc     = require('../controllers/locationController');

router.get('/',                          auth, loc.listLocations);
router.get('/new',                       auth, loc.createForm);
router.post('/new',                      auth, loc.createLocation);
router.get('/:location_id/edit',         auth, loc.editForm);
router.post('/:location_id/edit',        auth, loc.editLocation);

module.exports = router;
