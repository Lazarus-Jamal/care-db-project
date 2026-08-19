const express = require('express');
const router = express.Router();    
const staffController = require('../controllers/staffController');
const authMiddleware = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdminMiddleware');
const { care_staff, care_person } = require('../models');

// GET: Staff management page
router.get('/list', authMiddleware, isAdmin, staffController.listStaffWithPersonInfo);

module.exports = router;