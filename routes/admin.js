
// routes/admin.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const registrationValidator = require('../middleware/registrationValidator');
const isAdmin = require('../middleware/isAdminMiddleware');
const authController = require('../controllers/authController');
const updateUserRoutes = require('./updateUser');
const logActivity = require('../utils/activityLogger');
const facilityValidator = require('../middleware/facilityValidator');
const staffController = require('../controllers/staffController');
const adminFacilityController = require('../controllers/adminFacilityController');
const userController = require('../controllers/userController');


const { care_users_roles, care_department, care_staff, care_person, care_facilities } = require('../models');
const { getFacilityDepartmentMap } = require('../utils/facilityDepartmentHelper');

// GET: User registration form (Admin only)
router.get('/users/create', authMiddleware, isAdmin, async (req, res) => {
  try {
    const roles = await care_users_roles.findAll({ order: [['role_name', 'ASC']] });
    const facilities = await care_facilities.findAll({ order: [['name', 'ASC']] });
    const departments = await care_department.findAll({
      where: { is_inactive: false },
      order: [['name_formal', 'ASC']],
    });

    // Departments are now facility-scoped via care_facility_departments —
    // fetch the full active mapping once, so the department dropdown can
    // be filtered client-side as soon as a facility is picked, same
    // pre-load-and-filter pattern already used for facility search on the
    // update-facility page, rather than an AJAX round-trip per change.
    const facilityDeptMap = await getFacilityDepartmentMap();

    // // Fetch all persons, including those already linked to staff records
    // const care_personnel = await care_person.findAll({
    //   order: [['name_last', 'ASC'], ['name_first', 'ASC']],
    //   attributes: ['pid', 'name_first', 'name_last', 'email'], // Ensure email is fetched here
    // });

    res.render('users/register', {
      title: 'Register User',
      user: req.user,
      roles,
      facilities,
      departments,
      facilityDeptMap,
      care_person: [], //care_personnel, // Pass the list of all personnel
      success: req.query.success,
      errors: [],
      activePage: 'admin-users-create',
    });
  } catch (error) {
    console.error('Error loading registration form:', error);
    res.status(500).send('Failed to load registration form.');
  }
});

//This route is called by the javascript to get a filtered list of personnel
router.get('/users/personnel-search', authMiddleware, isAdmin, staffController.listPersonnel);

// GET: User management page (Admin only)
router.get('/users/user-search', authMiddleware, isAdmin, userController.searchUsers);

//Registration validation middleware
router.post('/users/create', authMiddleware, isAdmin, registrationValidator, authController.register);

// The corrected line to apply isAdmin middleware to all updateUserRoutes
router.use('/users/update', authMiddleware, isAdmin, updateUserRoutes);

// // GET: Search staff by name (Admin only)
// router.get('/users/staff-search', authMiddleware, isAdmin, userController.searchStaff);

// Logout route
router.get('/logout', authMiddleware, authController.logout);

// GET: Create Facility Form (Admin only)
router.get('/facilities/create', authMiddleware, isAdmin, adminFacilityController.getCreateFacilityForm);

// POST: Handle Facility Creation (Admin only)
router.post('/facilities/create', authMiddleware, isAdmin, facilityValidator, adminFacilityController.createFacility);

// GET: Update Facility Form (Admin only) - corrected route
router.get('/facilities/update', authMiddleware, isAdmin, adminFacilityController.getUpdateFacilityForm);

// POST: Handle Facility Update (Admin only)
router.post('/facilities/update', authMiddleware, isAdmin, facilityValidator, adminFacilityController.updateFacility);

// POST: Save a facility's department assignments (System Configuration)
router.post('/facilities/update-departments', authMiddleware, isAdmin, adminFacilityController.updateFacilityDepartments);

// GET: List all facilities
router.get('/facilities', authMiddleware, isAdmin, adminFacilityController.getFacilitiesManagement);

module.exports = router;



