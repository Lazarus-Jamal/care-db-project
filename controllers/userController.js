
// controllers/userController.js
const bcrypt = require('bcrypt');
const logActivity = require('../utils/activityLogger');
const { User, care_users_roles, care_department, care_staff, care_person, care_facilities, care_user_facilities } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { getFacilityDepartmentMap } = require('../utils/facilityDepartmentHelper');

exports.searchStaff = async (req, res) => {
    const { query } = req.query;
    try {
        const staff = await care_staff.findAll({
            where: {
                '$person.name_first$': { [Op.like]: `%${query}%` }
            },
            include: [{
                model: care_person,
                as: 'person',
                attributes: ['pid', 'name_first', 'name_last', 'email']
            }],
            limit: 20
        });
        res.json(staff);
    } catch (error) {
        console.error('Error searching for staff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// CORRECTED: User search function now uses the 'personData' alias
exports.searchUsers = async (req, res) => {
    const { query } = req.query;
    try {
        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { username: { [Op.like]: `%${query}%` } },
                    { '$personData.name_first$': { [Op.like]: `%${query}%` } },
                    { '$personData.name_last$': { [Op.like]: `%${query}%` } }
                ]
            },
            include: [{
                model: care_person,
                as: 'personData',
                attributes: ['name_first', 'name_last'],
            }],
            limit: 20
        });
        res.json(users);
    } catch (error) {
        console.error('Error searching for users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getUpdateUserForm = async (req, res) => {
    const { user_id, success } = req.query;

    try {
        let userToEdit = null;
        let grantedFacilityIds = [];

        if (user_id) {
            userToEdit = await User.findByPk(user_id, {
                include: [
                    { model: care_users_roles, as: 'userRole' },
                    { model: care_person, as: 'personData' }
                ]
            });
            if (userToEdit) {
                const grants = await care_user_facilities.findAll({
                    where: { user_id },
                    attributes: ['facility_id'],
                });
                grantedFacilityIds = grants.map(g => g.facility_id);
            }
        }

        const roles = await care_users_roles.findAll();
        const departments = await care_department.findAll({ where: { is_inactive: false } });
        const facilities = await care_facilities.findAll({ order: [['name', 'ASC']] });
        const facilityDeptMap = await getFacilityDepartmentMap();

        // Pre-loaded, client-side-filtered user list — same pattern as
        // facility search on the update-facility page, replacing the old
        // AJAX-search-as-you-type (empty until you'd typed 2+ characters,
        // 300ms debounce per keystroke).
        const allUsers = await User.findAll({
            attributes: ['user_id', 'username'],
            include: [{ model: care_person, as: 'personData', attributes: ['name_first', 'name_last'] }],
            order: [['username', 'ASC']],
        });

        res.render('users/updateUser', {
            title: 'Update Account',
            userToEdit,
            roles,
            departments,
            facilities,
            facilityDeptMap,
            allUsers,
            grantedFacilityIds,
            errors: [],
            success: success === '1',
            user: req.user,
            activePage: 'admin-update-user',
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.error('Error loading update user form:', error);
        res.status(500).send('Failed to load update form.');
    }
};

exports.updateUser = async (req, res) => {
    const { user_id, username, email, password, role_id, dept_nr, facility_id } = req.body;

    try {
        const userToUpdate = await User.findByPk(user_id);
        if (!userToUpdate) {
            const lognote = `Admin '${req.user.username}' failed to update user '${username}': User ID not found.`;
            await logActivity(req, lognote, false, '/admin/users/update/edit');
            return res.status(404).send('User not found.');
        }

        userToUpdate.username = username;
        userToUpdate.email = email;
        userToUpdate.role_id = role_id;
        userToUpdate.dept_nr = dept_nr || null;
        userToUpdate.facility_id = facility_id;

        if (password) {
            userToUpdate.password_hash = await bcrypt.hash(password, 10);
        }

        // Multi-Facility — this dropdown sets the user's *primary/default*
        // facility (care_users.facility_id), not their only one. Now that
        // a genuine multi-select "additional facilities" screen exists
        // (see updateUserFacilities below), this can no longer destroy
        // every care_user_facilities row for the user whenever the
        // primary changes — that would silently wipe out any additional
        // facility grants an admin had deliberately set up, just because
        // an unrelated field on this same form (role, department,
        // username) got saved. Instead: demote whichever row was
        // previously marked default (without deleting it — it may still
        // be a valid additional grant), and ensure a row for the new
        // primary facility exists and is marked default. Wrapped in a
        // transaction with the user save so a failure partway through
        // can't leave the two out of sync.
        await sequelize.transaction(async (t) => {
            await userToUpdate.save({ transaction: t });

            if (facility_id) {
                await care_user_facilities.update(
                    { is_default: 0 },
                    { where: { user_id, is_default: 1 }, transaction: t }
                );

                const existingRow = await care_user_facilities.findOne({
                    where: { user_id, facility_id }, transaction: t,
                });
                if (existingRow) {
                    if (!existingRow.is_default) {
                        await existingRow.update({ is_default: 1 }, { transaction: t });
                    }
                } else {
                    await care_user_facilities.create({
                        user_id, facility_id, is_default: 1,
                    }, { transaction: t });
                }
            }
        });

        const lognote = `Admin '${req.user.username}' successfully updated user '${username}'.`;
        await logActivity(req, lognote, true, '/admin/users/update/edit');

        res.redirect(`/admin/users/update?success=1&user_id=${user_id}`);

    } catch (error) {
        console.error('Error updating user:', error);
        let errorMessage = 'Failed to update user.';
        if (error.name === 'SequelizeValidationError') {
            errorMessage = error.errors.map(e => e.message).join(', ');
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            errorMessage = 'A user with this username or email already exists.';
        }
        
        const lognote = `Admin '${req.user.username}' failed to update user '${username}': ${errorMessage}`;
        await logActivity(req, lognote, false, '/admin/users/update/edit');

        const roles = await care_users_roles.findAll();
        const departments = await care_department.findAll({ where: { is_inactive: false } });
        const facilities = await care_facilities.findAll({ order: [['name', 'ASC']] });
        const facilityDeptMap = await getFacilityDepartmentMap();
        const allUsers = await User.findAll({
            attributes: ['user_id', 'username'],
            include: [{ model: care_person, as: 'personData', attributes: ['name_first', 'name_last'] }],
            order: [['username', 'ASC']],
        });
        const userToEdit = await User.findByPk(user_id, {
            include: [
                { model: care_users_roles, as: 'userRole' },
                { model: care_person, as: 'personData' }
            ]
        });
        let grantedFacilityIds = [];
        if (userToEdit) {
            const grants = await care_user_facilities.findAll({
                where: { user_id }, attributes: ['facility_id'],
            });
            grantedFacilityIds = grants.map(g => g.facility_id);
        }

        res.status(500).render('users/updateUser', {
            title: 'Update Account',
            userToEdit,
            roles,
            departments,
            facilities,
            facilityDeptMap,
            allUsers,
            grantedFacilityIds,
            errors: [errorMessage],
            success: false,
            user: req.user,
            activePage: 'admin-update-user',
            csrfToken: req.csrfToken()
        });
    }
};




// POST /admin/users/update/facilities — grant a user access to more than
// one facility. The user's primary facility (care_users.facility_id, set
// via the main update form above) is always kept granted with
// is_default=1 — this screen only manages *additional* facilities beyond
// that one. Soft concept, hard storage: unchecking a facility here simply
// removes its care_user_facilities row (no soft-deactivate flag on this
// table, unlike care_facility_departments) — losing an access grant isn't
// the same category of "history worth keeping" as losing a department
// configuration.
exports.updateUserFacilities = async (req, res) => {
    const { user_id } = req.body;
    const userToEdit = await User.findByPk(user_id);
    if (!userToEdit) return res.status(404).send('User not found.');

    try {
        const submitted = req.body.facility_ids;
        const checkedIds = new Set(
            (Array.isArray(submitted) ? submitted : (submitted ? [submitted] : []))
                .map(n => parseInt(n, 10))
                .filter(n => !isNaN(n))
        );
        // The primary facility is always implicitly granted, regardless
        // of whether its checkbox was included in what was submitted —
        // this screen manages additions on top of it, not a replacement
        // for it.
        if (userToEdit.facility_id) checkedIds.add(userToEdit.facility_id);

        await sequelize.transaction(async (t) => {
            const existingRows = await care_user_facilities.findAll({
                where: { user_id }, transaction: t,
            });
            const existingByFacility = {};
            existingRows.forEach(row => { existingByFacility[row.facility_id] = row; });

            for (const facilityId of checkedIds) {
                if (!existingByFacility[facilityId]) {
                    await care_user_facilities.create({
                        user_id,
                        facility_id: facilityId,
                        is_default: facilityId === userToEdit.facility_id ? 1 : 0,
                    }, { transaction: t });
                }
            }
            // Remove grants that were unchecked — except the primary,
            // which can never be removed from here (only by changing the
            // primary facility dropdown itself on the main form).
            for (const row of existingRows) {
                if (!checkedIds.has(row.facility_id) && row.facility_id !== userToEdit.facility_id) {
                    await row.destroy({ transaction: t });
                }
            }
        });

        const lognote = `Admin '${req.user.username}' updated facility grants for user '${userToEdit.username}' (ID: ${user_id})`;
        await logActivity(req, lognote, true, 'admin-user-facilities');

        res.redirect(`/admin/users/update?success=1&user_id=${user_id}`);
    } catch (error) {
        console.error('User facility grant update failed:', error);
        const lognote = `Admin '${req.user.username}' failed to update facility grants for user ID ${user_id}: ${error.message}`;
        await logActivity(req, lognote, false, 'admin-user-facilities');
        res.status(500).send('Error updating facility grants.');
    }
};
