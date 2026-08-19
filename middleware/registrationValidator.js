// middleware/registrationValidator.js
const { body, validationResult } = require('express-validator');
const logActivity = require('../utils/activityLogger');
const { User, care_users_roles, care_facilities, care_department, care_person } = require('../models');

const renderErrorPage = async (req, res, errors) => {
  const [roles, facilities, departments] = await Promise.all([
    care_users_roles.findAll(),
    care_facilities.findAll({ order: [['name', 'ASC']] }),
    care_department.findAll({ where: { is_inactive: false }, order: [['name_formal', 'ASC']] })
  ]);

  try {
    const lognote = `Admin '${req.user.username}' failed to create user '${req.body.username}': ${errors.join(', ')}`;
    await logActivity(req, lognote, false, '/admin/users/create');
  } catch (logError) {
    console.error('Failed to log failed registration attempt:', logError);
  }

  return res.render('users/register', {
    title: 'Register User',
    roles,
    facilities,
    departments,
    care_person: [], // Pass an empty array as the frontend handles the search
    success: false,
    errors,
    user: req.user,
    activePage: 'admin-users-create'
  });
};

const registrationValidator = [
  body('username')
    .trim()
    .escape()
    .notEmpty().withMessage('Username is required.')
    .isLength({ min: 4, max: 255 }).withMessage('Username must be between 4 and 255 characters.')
    .isAlphanumeric().withMessage('Username must be alphanumeric.')
    .custom(async (value) => {
      const existingUser = await User.findOne({ where: { username: value } });
      if (existingUser) {
        throw new Error('Username already exists.');
      }
    }),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),

  body('role_id')
    .escape()
    .notEmpty().withMessage('Role is required.')
    .isInt().withMessage('Invalid role ID.'),

  body('person_id')
    .escape()
    .notEmpty().withMessage('Personnel is required.')
    .isInt().withMessage('Invalid personnel ID.')
    .custom(async (value) => {
      const person = await care_person.findByPk(value);
      if (!person) {
        throw new Error('Selected personnel not found.');
      }
    }),

  body('facility_id')
    .escape()
    .notEmpty().withMessage('Facility is required.')
    .isInt().withMessage('Invalid facility ID.')
    .custom(async (value) => {
      const facility = await care_facilities.findByPk(value);
      if (!facility) {
        throw new Error('Selected facility not found.');
      }
    }),

  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg);
      return renderErrorPage(req, res, errorMessages);
    }
    
    next();
  }
];

module.exports = registrationValidator;



