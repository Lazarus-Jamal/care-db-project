
// middleware/authMiddleware.js
const { User, care_users_roles, care_facilities, care_staff, care_person } = require('../models');

/**
 * Middleware to handle user authentication and data population.
 */
const authMiddleware = async (req, res, next) => {
    // Check if the user is authenticated from the session
    if (req.session && req.session.user && req.session.user.user_id) { // Ensure user_id exists
        try {
            // Use Sequelize's findByPk method to find a record by its primary key
            const user = await User.findByPk(req.session.user.user_id, { // Use user_id from session
                include: [
                    { 
                        model: care_staff, as: 'staff', 
                        include: [
                            { model: care_person, as: 'person'}, {model: care_facilities, as: 'facility'}
                        ] 
                    },
                    { model: care_users_roles, as: 'userRole' }
                ]
            });

            if (!user) {
                // If the user document is no longer in the database, clear the session and redirect.
                req.session.destroy();
                return res.redirect('/auth/login');
            }
            
            // Expose the user object to all views via res.locals
            // res.locals.user = user;
            
            // Now, create the simplified session object for isAdmin, isAppAdmin checks.
            // Facility: prefer the facility chosen at login (Multi-Facility Phase 1 —
            // see authController.login / selectFacility). Checked by presence, not
            // truthiness — an admin account is deliberately given a null facility
            // (they're not tied to one), and `null || fallback` would have silently
            // replaced that intentional null with the staff record's facility on
            // every request after the first. Only fall back to the old staff-record
            // derivation when selection was never set at all (sessions predating
            // this change).
            const hasSelectedFacility = Object.prototype.hasOwnProperty.call(req.session, 'selectedFacilityId');
            const userForSession = {
                user_id: user.user_id,
                username: user.username,
                firstName: user.staff?.person?.name_first || '',
                lastName: user.staff?.person?.name_last || '',
                roleName: user.userRole?.role_name || '',
                permissions: user.userRole?.permission ? JSON.parse(user.userRole.permission) : [],
                facility: hasSelectedFacility
                    ? { id: req.session.selectedFacilityId, name: req.session.selectedFacilityName }
                    : { id: user.staff?.facility?.id || null, name: user.staff?.facility?.name || 'Unknown Facility' },
                isAdmin: user.is_admin === 1,
                isAppAdmin: user.userRole?.role_name === 'System Administrator',
                // Same dedicated flag as authController's finalizeSession —
                // true when this session was resolved to "no specific
                // facility" (the deliberate admin-bypass case), regardless
                // of which admin condition (is_admin, System Administrator,
                // Application Administrator) actually granted it.
                isFacilityExempt: hasSelectedFacility && req.session.selectedFacilityId === null,
                // Pharmacy Scoping — rebuilt from session on every request,
                // same as facility. Genuinely null (not an object) when not
                // applicable — sessions predating this feature, or any user
                // who was never routed through the pharmacy-unit picker,
                // simply have no selectedPharmacyUnitId at all.
                pharmacyUnit: req.session.selectedPharmacyUnitId
                    ? { id: req.session.selectedPharmacyUnitId, name: req.session.selectedPharmacyUnitName }
                    : null,
            };
            
            // Set req.user to this simplified session object for other middleware
            res.locals.user = userForSession;
            req.user = userForSession;

            // Continue to the next middleware or route handler
            next();
        } catch (err) {
            console.error('Error fetching user data in authMiddleware:', err);
            req.session.destroy();
            res.redirect('/auth/login');
        }
    } else {
        // No user in session, or session is incomplete
        res.redirect('/auth/login');
    }
};

module.exports = authMiddleware;



