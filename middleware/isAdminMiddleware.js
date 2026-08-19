// middleware/isAdminMiddleware.js
const logActivity = require('../utils/activityLogger');

/**
 * Middleware to check if the user has the necessary administrative permissions.
 * This is an updated version that checks for a set of permissions rather than a single one,
 * allowing for more granular control over what an "admin" can do.
 * * The middleware checks for permissions related to managing users, roles, and facilities.
 * This allows both a "System Administrator" (with full access) and a more
 * restricted "Application Administrator" (with a subset of these permissions) to pass.
 */
module.exports = async (req, res, next) => {
  // Define an array of permissions that grant administrative access.
  // We check for any of these to determine if a user is an admin.
  // This can be expanded as needed to include other admin-related tasks.
  const requiredAdminPermissions = [
    'Admin.Create.User',
    'Admin.Update.User',
    'Admin.Assign.Role',
    'Admin.Create.Role',
    'Admin.Audit.Logs',
    'Admin.Create.Facility',
    'Admin.Update.Facility',
    'Admin.Manage.Users', // The original permission
    'Admin.Manage.ServicesConfig',
    'Admin.Manage.PharmacyConfig',
    'Admin.Manage.LabConfig',
    // ... add any other relevant permissions for admin-level access here
  ];

  // Check if the user is authenticated and has permissions.
  // We use .some() to check if the user's permissions array contains at least one
  // of the required administrative permissions.
  const hasAdminPermission = req.user && req.user.permissions && req.user.permissions.some(permission =>
    requiredAdminPermissions.includes(permission)
  );

  if (hasAdminPermission) {
    // If the user has at least one required permission, grant access.
    return next();
  }

  // Log the denied access attempt for auditing.
  const lognote = `Access denied for '${req.user?.username}' to '${req.originalUrl}': Insufficient privileges.`;
  await logActivity(req, lognote, false, 'isAdminMiddleware.js');

  // If no required permission is found, deny access.
  // Use a status code of 403 (Forbidden) for unauthorized access.
  return res.status(403).send('Access denied: Insufficient privileges.');
};

