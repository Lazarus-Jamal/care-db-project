
// routes/updateUser.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController'); // NEW: Import the user controller
const userUpdateValidator = require('../middleware/userUpdateValidator'); // NEW: Import the validator

// GET: Show update form with user selection dropdown
router.get('/', userController.getUpdateUserForm);

// POST: Handle user update
// UPDATED: Now uses the validator middleware and a dedicated controller
router.post('/edit', userUpdateValidator, userController.updateUser);

// POST: Grant a user access to more than one facility
router.post('/facilities', userController.updateUserFacilities);

module.exports = router;


