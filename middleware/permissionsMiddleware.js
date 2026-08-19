/**
 * Middleware to make user and permission-based helper functions available to all EJS templates.
 * This middleware should be used after your authentication middleware has attached the user object to the request (e.g., req.user).
 */
function permissionsMiddleware(req, res, next) {
    res.locals.user = req.user || null;
    // Check for a single, specific permission.
    // Grants full access if the user has the 'Admin.FullAccess' permission.
    if (res.locals.user && res.locals.user.roleName){

        res.locals.isAdmin = res.locals.user.roleName === 'System Administrator';

        const userPermissions = res.locals.user.permissions || [];

        // Check if the user has a specific permission.
        res.locals.hasPermission = function(permissionName) {
            return userPermissions.includes('Admin.FullAccess') || userPermissions.includes(permissionName);
        };

        // Check if the user has at least one permission from a given list.
        res.locals.hasAnyPermission = function(permissionNames) {
            if (userPermissions.includes ('Admin.FullAccess')) {
                return true;
            }
            return permissionNames.some(p => userPermissions.includes(p));
        };
      
        // A flag to check if the user is an application administrator (can manage users, facilities, etc.)
        // Role-specific billing flags
        res.locals.isCashierOnly = userPermissions.includes('Billing.Collect.Payment') &&
                                   !userPermissions.includes('Billing.Create.Invoice') &&
                                   !userPermissions.includes('Admin.FullAccess');
        res.locals.isBillingStaff = (userPermissions.includes('Billing.Create.Invoice') ||
                                     userPermissions.includes('Admin.FullAccess')) &&
                                    !res.locals.isAdmin &&
                                    res.locals.hasAnyPermission([
                                        'Billing.Create.Invoice',
                                        'Billing.Collect.Payment',
                                    ]);

        res.locals.isAppAdmin = res.locals.hasAnyPermission([
            'Admin.Create.User',
            'Admin.Update.User',
            'Admin.Create.Facility',
            'Admin.Update.Facility',
            'Admin.Manage.CashierConfig',
            'Admin.Manage.PharmacyShelves',
            'Admin.Manage.WarehouseShelves',
            'Admin.Manage.LabConfig',
            'Admin.Manage.ServicesConfig',
            'Admin.Manage.HospitalizationRooms'
        ]);

        // //debug
        // console.log('Permissions middleware executed:', {
        //     user: res.locals.user, 
        //     // userPermissions: userPermissions,
        //     isAdmin: res.locals.isAdmin,
        //     isAppAdmin: res.locals.isAppAdmin
        // });
    } else {
        res.locals.hasPermission = () => false;
        res.locals.hasAnyPermission = () => false;
        res.locals.isAdmin = false;
        res.locals.isAppAdmin = false;
        res.locals.isCashierOnly = false;
        res.locals.isBillingStaff = false; 
    }
    // Continue to the next middleware or route handler

    next();
}

module.exports = permissionsMiddleware;



