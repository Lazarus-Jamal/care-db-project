
// controllers/authController.js
const { User, care_users_roles, care_staff, care_person, care_facilities, care_department, care_user_facilities, care_pharmacy_unit } = require('../models');
const bcrypt = require('bcrypt');
const logActivity = require('../utils/activityLogger');
const { getFacilityDepartmentMap } = require('../utils/facilityDepartmentHelper');
const { validationResult } = require('express-validator');

const activeUsers = require ('../utils/activeUsers'); // Import the activeUsers Set

// Multi-Facility Phase 1 — finalizes a fully-authenticated session once a
// facility has been resolved (either auto-selected, the only option, or
// explicitly chosen via the facility picker). Shared by both the
// single-facility fast path in login() and selectFacility(), so a user
// finishing either way ends up with an identically-shaped session.
// Pharmacy Scoping — which permissions mark someone as pharmacy staff for
// the purposes of the day/night unit picker. Deliberately the same 4
// permissions already used throughout pharmacyController.js /
// pharmacyInventoryCountController.js, not a new list invented here.
const PHARMACY_PERMISSIONS = [
    'Pharmacy.Dispense.Medication',
    'Pharmacy.Inventory.Count',
    'Pharmacy.Approve.InventoryCount',
    'Pharmacy.View.Reports',
    'Inventory.Order.ToPharmacy',
    // Found during whole-phase QA: adjustStock, addStockItem, createShelf,
    // deleteShelf, and updateStockSettings (pharmacyController.js) are all
    // gated by this permission, but it was missing from this list — a
    // role configured with ONLY Inventory.Update.Stock (a plausible
    // standalone "stock manager" role, not combined with dispensing or
    // counting permissions) would never be routed through the unit
    // picker at login, then get rejected by every one of those functions
    // for having no pharmacy unit selected, despite having exactly the
    // right permission to use them.
    'Inventory.Update.Stock',
];

function isPharmacyStaff(permissions) {
    return Array.isArray(permissions) && permissions.some(p => PHARMACY_PERMISSIONS.includes(p));
}

async function finalizeSession(req, user, facilityId, facilityName, pharmacyUnitId = null, pharmacyUnitName = null) {
    await User.update({ last_login: new Date() }, { where: { user_id: user.user_id } });

    const userForSession = {
        user_id:   user.user_id,
        username:  user.username,
        firstName: user.staff?.person?.name_first || '',
        lastName:  user.staff?.person?.name_last  || '',
        roleName:  user.userRole?.role_name || '',
        permissions: user.userRole?.permission ? JSON.parse(user.userRole.permission) : [],
        facility:  { id: facilityId, name: facilityName },
        dept_nr:   user.dept_nr  || user.staff?.dept_nr  || null,
        staff_nr:  user.staff_nr || user.staff?.nr       || null,
        isAdmin:   user.is_admin === 1,
        isAppAdmin: user.userRole?.role_name === 'System Administrator',
        // Dedicated flag for facility-scoping purposes specifically — kept
        // separate from isAdmin/isAppAdmin above, which may carry other
        // meaning elsewhere in the app that this fix shouldn't disturb.
        // facilityId is only ever null here for the deliberate admin-bypass
        // path in login()/selectFacility() below, never for a regular user.
        isFacilityExempt: facilityId === null,
        // Pharmacy Scoping — genuinely null (not { id: null }) when not
        // applicable, unlike facility's admin-exemption shape. There's no
        // "sees everything" concept for a pharmacy unit the way there is
        // for facility admins — a non-pharmacy-staff user simply has no
        // unit, full stop, so a plain null is unambiguous here and
        // doesn't risk the same always-truthy-object mistake.
        pharmacyUnit: pharmacyUnitId ? { id: pharmacyUnitId, name: pharmacyUnitName } : null,
    };

    req.session.user               = userForSession;
    req.session.authenticated       = true;
    req.session.selectedFacilityId   = facilityId;
    req.session.selectedFacilityName = facilityName;
    req.session.selectedPharmacyUnitId   = pharmacyUnitId;
    req.session.selectedPharmacyUnitName = pharmacyUnitName;
    delete req.session.pendingUser;
    delete req.session.pendingFacility;
    activeUsers.add(user.user_id);

    await logActivity(req,
        `Connexion réussie pour l'utilisateur '${user.username}' (établissement : ${facilityName})`,
        true, '/auth/login', user.user_id, user.username);
}

// Pharmacy Scoping — shared step run after a facility is resolved (either
// auto-selected or explicitly chosen), before the session is finalized.
// Non-pharmacy-staff and admins skip this entirely and finalize
// immediately with no pharmacy unit. Pharmacy staff at a facility with
// more than one active unit get sent to a second picker, mirroring the
// facility picker's own pendingUser/redirect pattern.
async function resolvePharmacyUnitAndFinalize(req, res, user, facilityId, facilityName) {
    const permissions = user.userRole?.permission ? JSON.parse(user.userRole.permission) : [];

    if (facilityId === null || !isPharmacyStaff(permissions)) {
        await finalizeSession(req, user, facilityId, facilityName);
        return res.redirect('/');
    }

    const units = await care_pharmacy_unit.findAll({
        where: { facility_id: facilityId, is_active: 1 },
        order: [['id', 'ASC']],
    });

    if (units.length <= 1) {
        const unit = units[0];
        await finalizeSession(req, user, facilityId, facilityName,
            unit ? unit.id : null, unit ? unit.name : null);
        return res.redirect('/');
    }

    // More than one active unit — don't finalize yet, send to the picker.
    req.session.pendingUser = { user_id: user.user_id, username: user.username };
    req.session.pendingFacility = { facility_id: facilityId, facility_name: facilityName };
    return res.redirect('/auth/select-pharmacy-unit');
}

// --- Login Logic ---
exports.login = async (req, res) => {
    const { username, password, localTime } = req.body;
    const errors = validationResult(req);
    let loginErrors = []; // Consolidate all errors into one array

    // FIX #1: Pass the validation errors as an array, not a single string
    if (!errors.isEmpty()) {
        loginErrors = errors.array().map(e => e.msg);
        return res.status(400).render('auth/login', {
            errors: loginErrors, // Use the 'errors' variable as expected by your EJS file
            username: username,
            csrfToken: req.csrfToken(),
        });
    }

    try {
        const user = await User.findOne({
            where: { username },
            include: [
                { model: care_users_roles, as: 'userRole' },
                {
                    model: care_staff,
                    as: 'staff',
                    include: [
                        { model: care_person, as: 'person' },
                        { model: care_facilities, as: 'facility' },
                    ],
                },
                // Direct facility on the user record (set by updateUser)
                { model: care_facilities, as: 'facility' },
            ],
        });

        const loginSuccess = user && await bcrypt.compare(password, user.password_hash);

        if (!loginSuccess) {
            loginErrors.push('Identifiants invalides');
        } else {
            if (user.userRole && user.userRole.role_name !== 'System Administrator') {
                const serverTime = new Date();
                const clientTime = new Date(localTime);
                const timeDifferenceMs = Math.abs(serverTime.getTime() - clientTime.getTime());
                const maxAllowedDiffMs = 1 * 60 * 1000; // confirmed 1-minute threshold — see MULTI_FACILITY_IMPLEMENTATION_PLAN.md §3.2

                // Time logic check
                if (timeDifferenceMs > maxAllowedDiffMs) {
                    loginErrors.push('Décalage horaire détecté. Veuillez synchroniser l\'heure de votre machine avec celle du serveur.');
                }
            }
        }
        
        // This is the correct logic you already had
        if (loginErrors.length > 0) {
            await logActivity(req, `Échec de connexion pour l'utilisateur '${username}': ${loginErrors.join(' ')}`, false, '/auth/login', null);
            return res.status(401).render('auth/login', {
                title: 'Connexion',
                user: null,
                activePage: 'login',
                errors: loginErrors, // Ensure 'errors' is used here
                username,
                csrfToken: req.csrfToken(),
            });
        }
        
        // Multi-Facility Phase 1 — admin accounts (is_admin flag, or the
        // 'System Administrator' / 'Application Administrator' roles — the
        // latter added per explicit confirmation) are NOT required to be
        // tied to a facility at all. They conceptually have access to every
        // facility, not a specific one — requiring a care_user_facilities
        // row for them would block exactly the accounts meant to see
        // everything. Confirmed bug: an existing System Administrator
        // account with facility_id NULL never gets a backfilled row, so it
        // hit the "0 facilities" block below.
        const isAdminAccount = user.is_admin === 1 ||
            user.userRole?.role_name === 'System Administrator' ||
            user.userRole?.role_name === 'Application Administrator';

        if (isAdminAccount) {
            await finalizeSession(req, user, null, 'Accès à l\'ensemble du système');
            return res.redirect('/');
        }

        // Multi-Facility Phase 1 — resolve which facility(ies) this user is
        // authorized for via care_user_facilities, rather than assuming one.
        const facilityRows = await care_user_facilities.findAll({
            where: { user_id: user.user_id },
            include: [{ model: care_facilities, as: 'facility' }],
            order: [['is_default', 'DESC']],
        });

        if (facilityRows.length === 0) {
            await logActivity(req,
                `Échec de connexion pour l'utilisateur '${username}': aucun établissement associé`,
                false, '/auth/login', user.user_id, user.username);
            return res.status(401).render('auth/login', {
                title: 'Connexion', user: null, activePage: 'login',
                errors: ["Aucun établissement n'est associé à ce compte. Contactez un administrateur."],
                username, csrfToken: req.csrfToken(),
            });
        }

        if (facilityRows.length === 1) {
            // Exactly one facility — identical experience to before this change,
            // just sourced from care_user_facilities instead of staff/user directly.
            const row = facilityRows[0];
            return await resolvePharmacyUnitAndFinalize(req, res, user, row.facility_id, row.facility?.name || 'Unknown Facility');
        }

        // More than one authorized facility — don't finalize the session yet,
        // send them to the picker. Deliberately minimal: just enough to look
        // the user's facilities back up after they choose.
        req.session.pendingUser = { user_id: user.user_id, username: user.username };
        return res.redirect('/auth/select-facility');

    } catch (error) {
        console.error('Login error:', error);
        await logActivity(req, `Échec de connexion: ${error.message}`, false, '/auth/login', null);
        // FIX #2: Pass the error message as an array here as well
        res.status(500).render('auth/login', { 
            title: 'Connexion',
            user: null,
            activePage: 'login',
            errors: ['An unexpected error occurred.'], // Use 'errors' array
            username: req.body.username || '',
            csrfToken: req.csrfToken(), 
        });
    }
};

// ══════════════════════════════════════════════════════════════════
// Multi-Facility Phase 1 — facility picker, shown only when a user is
// authorized for more than one facility (see login() above).
// ══════════════════════════════════════════════════════════════════
exports.selectFacilityForm = async (req, res) => {
    if (!req.session.pendingUser) return res.redirect('/auth/login');
    try {
        const facilityRows = await care_user_facilities.findAll({
            where: { user_id: req.session.pendingUser.user_id },
            include: [{ model: care_facilities, as: 'facility' }],
            order: [['is_default', 'DESC']],
        });
        res.render('auth/select-facility', {
            title: 'Choisir un établissement',
            username: req.session.pendingUser.username,
            facilities: facilityRows.map(r => ({ id: r.facility_id, name: r.facility?.name || 'Établissement inconnu' })),
            csrfToken: req.csrfToken(),
            errors: [],
        });
    } catch (err) {
        console.error('selectFacilityForm error:', err);
        res.redirect('/auth/login');
    }
};

exports.selectFacility = async (req, res) => {
    if (!req.session.pendingUser) return res.redirect('/auth/login');
    const { facility_id } = req.body;

    try {
        // Re-validate against care_user_facilities server-side — never trust
        // the submitted facility_id just because it appeared in the form.
        const row = await care_user_facilities.findOne({
            where: { user_id: req.session.pendingUser.user_id, facility_id: parseInt(facility_id, 10) || 0 },
            include: [{ model: care_facilities, as: 'facility' }],
        });

        if (!row) {
            const facilityRows = await care_user_facilities.findAll({
                where: { user_id: req.session.pendingUser.user_id },
                include: [{ model: care_facilities, as: 'facility' }],
                order: [['is_default', 'DESC']],
            });
            return res.status(400).render('auth/select-facility', {
                title: 'Choisir un établissement',
                username: req.session.pendingUser.username,
                facilities: facilityRows.map(r => ({ id: r.facility_id, name: r.facility?.name || 'Établissement inconnu' })),
                csrfToken: req.csrfToken(),
                errors: ['Établissement invalide.'],
            });
        }

        const user = await User.findByPk(req.session.pendingUser.user_id, {
            include: [
                { model: care_users_roles, as: 'userRole' },
                { model: care_staff, as: 'staff', include: [{ model: care_person, as: 'person' }] },
            ],
        });
        if (!user) return res.redirect('/auth/login');

        await resolvePharmacyUnitAndFinalize(req, res, user, row.facility_id, row.facility?.name || 'Unknown Facility');
    } catch (err) {
        console.error('selectFacility error:', err);
        res.redirect('/auth/login');
    }
};

// ══════════════════════════════════════════════════════════════════
// Pharmacy Scoping — day/night unit picker, shown only to pharmacy-role
// staff at a facility with more than one active pharmacy unit (see
// resolvePharmacyUnitAndFinalize above). Mirrors the facility picker
// exactly: pendingUser/pendingFacility just carry enough to look the
// options back up after the choice, and the submitted value is
// re-validated server-side rather than trusted from the form.
// ══════════════════════════════════════════════════════════════════
exports.selectPharmacyUnitForm = async (req, res) => {
    if (!req.session.pendingUser || !req.session.pendingFacility) return res.redirect('/auth/login');
    try {
        const units = await care_pharmacy_unit.findAll({
            where: { facility_id: req.session.pendingFacility.facility_id, is_active: 1 },
            order: [['id', 'ASC']],
        });
        res.render('auth/select-pharmacy-unit', {
            title: 'Choisir une unité de pharmacie',
            username: req.session.pendingUser.username,
            facilityName: req.session.pendingFacility.facility_name,
            units: units.map(u => ({ id: u.id, name: u.name, unit_type: u.unit_type })),
            csrfToken: req.csrfToken(),
            errors: [],
        });
    } catch (err) {
        console.error('selectPharmacyUnitForm error:', err);
        res.redirect('/auth/login');
    }
};

exports.selectPharmacyUnit = async (req, res) => {
    if (!req.session.pendingUser || !req.session.pendingFacility) return res.redirect('/auth/login');
    const { pharmacy_unit_id } = req.body;

    try {
        const unit = await care_pharmacy_unit.findOne({
            where: {
                id: parseInt(pharmacy_unit_id, 10) || 0,
                facility_id: req.session.pendingFacility.facility_id,
                is_active: 1,
            },
        });

        if (!unit) {
            const units = await care_pharmacy_unit.findAll({
                where: { facility_id: req.session.pendingFacility.facility_id, is_active: 1 },
                order: [['id', 'ASC']],
            });
            return res.status(400).render('auth/select-pharmacy-unit', {
                title: 'Choisir une unité de pharmacie',
                username: req.session.pendingUser.username,
                facilityName: req.session.pendingFacility.facility_name,
                units: units.map(u => ({ id: u.id, name: u.name, unit_type: u.unit_type })),
                csrfToken: req.csrfToken(),
                errors: ['Unité invalide.'],
            });
        }

        const user = await User.findByPk(req.session.pendingUser.user_id, {
            include: [
                { model: care_users_roles, as: 'userRole' },
                { model: care_staff, as: 'staff', include: [{ model: care_person, as: 'person' }] },
            ],
        });
        if (!user) return res.redirect('/auth/login');

        await finalizeSession(req, user,
            req.session.pendingFacility.facility_id, req.session.pendingFacility.facility_name,
            unit.id, unit.name);
        res.redirect('/');
    } catch (err) {
        console.error('selectPharmacyUnit error:', err);
        res.redirect('/auth/login');
    }
};

// --- Logout Logic ---
exports.logout = (req, res) => {
    // Log the logout activity
    if (req.session.user) {
        activeUsers.delete(req.session.user.user_id); // Remove the user from activeUsers set
        const lognote = `Déconnexion réussie pour l'utilisateur '${req.session.user.username}'`;
        logActivity(req, lognote, true, '/auth/logout', req.session.user.user_id, req.session.user.username);
    }

    // Destroy the session
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).send('Could not log out.');
        }
        // Redirect to the login page
        res.clearCookie('connect.sid'); // Clears the session ID cookie
        res.redirect('/auth/login');
    });
};

/**
 * Controller function for user registration (Admin only).
 */
exports.register = async (req, res) => {
    const { username, password, role_id, person_id, facility_id, dept_nr } = req.body;
    const createdBy = req.user.username; // Get the username of the logged-in admin
    const createdId = req.user.user_id; // Get the user ID of the logged-in admin

    // Start a transaction to ensure all operations succeed or fail together
    const t = await User.sequelize.transaction();

    try {
        // 1. Get the facility code and count existing staff to generate a new staff number
        const facility = await care_facilities.findByPk(facility_id, { transaction: t });
        if (!facility) {
            throw new Error('Facility not found.');
        }

        const staffCount = await care_staff.count({
            where: { facility_id },
            transaction: t
        });
        
        // Generate the new staff number (e.g., 'HPN' + padded incremented count)
        const nextStaffNumber = staffCount + 1;
        const paddedStaffNumber = String(nextStaffNumber).padStart(3, '0');
        const short_id = `${facility.code}${paddedStaffNumber}`;

        // 2. Check for an existing staff record and create it if it doesn't exist
        const [staffRecord, staffCreated] = await care_staff.findOrCreate({
            where: { pid: person_id },
            defaults: {
                short_id: short_id,
                job_type_nr: 0, // Default value
                facility_id: facility_id,
                dept_nr: dept_nr || null, // Allow null if not provided
                status: 1, // '1' for active staff
                job_function_title: 'Staff Member', // Default title
            },
            transaction: t
        });
        
        // If the staff record already existed, ensure its fields are updated
        if (!staffCreated) {
            await staffRecord.update({
                short_id: short_id,
                facility_id: facility_id,
                dept_nr: dept_nr || null,
                status: 1,
            }, { transaction: t });
        }

        // 3. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create the user record with all required fields
        const newUser = await User.create({
            username,
            password_hash: hashedPassword,
            role_id,
            pid: person_id,
            is_admin: role_id === 1 ? 1 : 0,
            dept_nr: dept_nr,
            staff_nr: staffRecord.nr, // Use the primary key from the care_staff table
            facility_id: facility_id,
            created_by: createdId, // Logged-in user's user_id
        }, { transaction: t });

        // Multi-Facility Phase 1 — keep care_user_facilities in sync with
        // facility_id at creation time. Without this, a newly-created user
        // would have facility_id set on care_users but zero rows in
        // care_user_facilities — the exact "0 facilities" login block found
        // and fixed for existing users would otherwise recur for every new
        // one going forward. Admin accounts (role_id 1 = System
        // Administrator) don't strictly need this row since login bypasses
        // the check for them, but adding it is harmless and keeps the data
        // consistent either way.
        await care_user_facilities.create({
            user_id: newUser.user_id,
            facility_id: facility_id,
            is_default: 1,
        }, { transaction: t });

        // Commit the transaction
        await t.commit();

        // Log the successful registration
        await logActivity(req, `Admin '${createdBy}' created new user '${newUser.username}'`, true, 'authController.js');

        res.redirect('/admin/users/create?success=1');
    } catch (error) {
        // If any operation fails, roll back the transaction
        await t.rollback();
        console.error('Error during user and staff creation:', error);

        // Log the failure
        await logActivity(req, `Admin '${createdBy}' failed to create user '${username}' due to error: ${error.message}`, false, 'authController.js');

        // Render the registration form with the error message
        // res.status(500).send('Registration failed: ' + error.message);

        const roles = await care_users_roles.findAll({ order: [['role_name', 'ASC']] });
        const facilities = await care_facilities.findAll({ order: [['name', 'ASC']] });
        const departments = await care_department.findAll({ where: { is_inactive: false }, order: [['name_formal', 'ASC']] });
        const facilityDeptMap = await getFacilityDepartmentMap();

        res.status(500).render('users/register', {
            title: 'Register User',
            roles,
            facilities,
            departments,
            facilityDeptMap,
            care_person: [],
            success: false,
            errors: ['An error occurred while creating the user. Please try again.'],
            user: req.user,
            activePage: 'admin-users-create'
        });
    }
};

/**
 * Controller function to fetch user's facility and role based on username.
 */
exports.getUserFacilityAndRole = async (req, res) => {
    const { username } = req.body;
    try {
        const user = await User.findOne({
            where: { username },
            include: [
                { model: care_staff, as: 'staff', include: [{ model: care_facilities, as: 'facility' }] },
                { model: care_users_roles, as: 'userRole' },
                { model: care_facilities, as: 'facility' },
            ],
        });

        if (!user) {
            return res.json({ success: false, message: 'Utilisateur non trouvé.' });
        }
        
        let facilityName;
        let roleName = user.userRole?.role_name || 'Pas de rôle';

        // Check for the same admin condition login() now uses (is_admin
        // flag OR 'System Administrator' role), so what's shown here before
        // login matches what actually happens after.
        if (user.is_admin === 1 || roleName === 'System Administrator' || roleName === 'Application Administrator') {
            facilityName = 'Accès à l\'ensemble du système';
        } else if (user.facility) {
            // Prefer facility_id stored directly on the user record (updated by updateUser)
            facilityName = user.facility.name;
        } else if (user.staff?.facility) {
            // Fall back to the facility on the staff record
            facilityName = user.staff.facility.name;
        } else {
            facilityName = 'Non assigné';
        }

        res.json({
            success: true,
            facilityName: facilityName,
            roleName: roleName
        });
    } catch (error) {
        console.error('Sequelize Error in getUserFacilityAndRole:', error);
        res.status(500).json({ success: false, message: 'Erreur du serveur' });
    }
};

/**
 * Controller function to get server time.
 */
exports.getServerTime = (req, res) => {
    res.json({ serverTime: new Date() });
};










