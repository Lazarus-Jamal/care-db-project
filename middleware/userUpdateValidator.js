// middleware/userUpdateValidator.js
const { body, validationResult } = require('express-validator');
const logActivity = require('../utils/activityLogger');
const { User, care_users_roles, care_department, care_facilities, care_staff } = require('../models');

const renderErrorPage = async (req, res, errors) => {
  const users = await User.findAll({
    order: [['username', 'ASC']],
    include: [{ model: care_users_roles, as: 'userRole' }]
  });
  const roles = await care_users_roles.findAll();
  const departments = await care_department.findAll({ where: { is_inactive: false } });
  const facilities = await care_facilities.findAll({ order: [['name', 'ASC']] });
  const userToEdit = await User.findByPk(req.body.user_id);
  
  // Log the failed update attempt
  const lognote = `Admin '${req.user.username}' failed to update user '${req.body.username}': ${errors.join(', ')}`;
  await logActivity(req, lognote, false, '/admin/users/update/edit');

  return res.render('users/updateUser', {
    title: 'Update Account',
    users,
    userToEdit,
    roles,
    departments,
    facilities,
    errors,
    success: false,
    user: req.user,
    activePage: 'admin-update-user'
  });
};

const userUpdateValidator = [
  body('user_id')
    .escape()
    .notEmpty().withMessage('User ID is required.')
    .isInt().withMessage('Invalid user ID.'),
    
  body('username')
    .trim()
    .escape()
    .notEmpty().withMessage('Username is required.'),

  body('email')
    .trim()
    .escape()
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Invalid email address.'),
    
  body('password')
    .optional({ checkFalsy: true })
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
    
  body('role_id')
    .escape()
    .notEmpty().withMessage('Role is required.'),
    
  body('dept_nr')
    .escape()
    .optional({ checkFalsy: true }),

  body('facility_id')
    .escape()
    .notEmpty().withMessage('Facility is required.'),

  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg);
      return renderErrorPage(req, res, errorMessages);
    }
    next();
  }
];

module.exports = userUpdateValidator;

