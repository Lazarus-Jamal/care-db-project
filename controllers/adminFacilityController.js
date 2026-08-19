
// controllers/adminFacilityController.js
const { care_facilities, care_staff, care_person, care_department, care_facility_departments } = require('../models');
// const { get } = require('../routes/auth');
const logActivity = require('../utils/activityLogger');
const { validationResult } = require('express-validator');
const { Op, Sequelize } = require('sequelize');

//Helper functions
const getStaffList = () => care_staff.findAll({
    attributes: ['nr', 'job_function_title', 'pid'],
    include: [{
        model: care_person,
        as: 'person',
        attributes: ['name_last', 'name_first']
    }],
    order: [[{ model: care_person, as: 'person' }, 'name_last', 'ASC']],
});

const getMainFacilities = (excludeId = null) => care_facilities.findAll({
    where: {
        type: 'Hospital',
        parent_id: { [Op.not]: null },
        ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
    },
    order: [['name', 'ASC']],
});

// System Configuration — department assignment. Returns the full global
// department catalog plus a Set of dept_nr values currently active for
// this facility, so the view can render every department as a checkbox
// with the right ones pre-checked.
const getDepartmentAssignmentData = async (facilityId) => {
    const allDepartments = await care_department.findAll({
        where: { [Op.or]: [{ is_inactive: 0 }, { is_inactive: null }] },
        attributes: ['nr', 'name_formal', 'name_short', 'type'],
        order: [['name_formal', 'ASC']],
    });
    const assigned = await care_facility_departments.findAll({
        where: { facility_id: facilityId, is_active: 1 },
        attributes: ['dept_nr'],
    });
    const activeDeptNrs = new Set(assigned.map(a => a.dept_nr));
    return { allDepartments, activeDeptNrs };
};

// GET: Render the facility creation form
exports.getCreateFacilityForm = async (req, res) => {
    try {
        const staff = await getStaffList();
        const mainFacilities = await getMainFacilities();         // creation form

        res.render('facilities/create', {
            title: 'Create Facility',
            user: req.user,
            staff,
            mainFacilities, // <-- Changed the variable name for clarity
            errors: [],
            success: req.query.success === '1',
            activePage: 'admin-facilities-create',
            csrfToken: req.csrfToken(),
            name: '', code: '', type: '', address: '', city: '', region: '', country: '', latitude: '', longitude: '',
            parent_id: '',
            director_id: '',
            head_nurse_id: '',
            finance_officer_id: '',
        });
    } catch (error) {
        console.error('Error fetching data for create facility form:', error);
        res.status(500).send('Error loading page.');
    }
};

// POST: Handle facility creation
exports.createFacility = async (req, res) => {
    const {
        name, code, type, parent_id,
        director_id, head_nurse_id, finance_officer_id,
        address, city, region, country, latitude, longitude
    } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const staff = await getStaffList();
        const mainFacilities = await getMainFacilities();         // creation form

        return res.status(400).render('facilities/create', {
            title: 'Create Facility',
            user: req.user,
            staff,
            mainFacilities,
            errors: errors.array().map(e => e.msg),
            success: false,
            activePage: 'admin-facilities-create',
            csrfToken: req.csrfToken(),
            name, code, type, address, city, region, country, latitude, longitude,
            parent_id,
            director_id,
            head_nurse_id,
            finance_officer_id,
        });
    }

    try {
        let finalParentId = null;
        if (parent_id) {
            finalParentId = parent_id;
        }

        const newFacility = await care_facilities.create({
            name,
            code,
            type,
            parent_id: finalParentId,
            director_id: director_id || null,
            head_nurse_id: head_nurse_id || null,
            finance_officer_id: finance_officer_id || null,
            address,
            city,
            region,
            country,
            latitude,
            longitude,
        });

        if (!parent_id) {
            await newFacility.update({ parent_id: newFacility.id });
        }

        const lognote = `Admin '${req.user.username}' successfully created new facility '${name}'`;
        await logActivity(req, lognote, true, 'admin-facilities-create');

        res.redirect('/admin/facilities/create?success=1');
    } catch (error) {
        console.error('Facility creation failed:', error);
        const errorMessages = ['An error occurred while creating the facility.'];
        const lognote = `Admin '${req.user.username}' failed to create facility '${name}': ${error.message}`;
        await logActivity(req, lognote, false, 'admin-facilities-create');
        
        const staff = await getStaffList();
        const mainFacilities = await getMainFacilities();         // creation form

        res.status(500).render('facilities/create', {
            title: 'Create Facility',
            user: req.user,
            staff,
            mainFacilities,
            errors: errorMessages,
            success: false,
            activePage: 'admin-facilities-create',
            csrfToken: req.csrfToken(),
            name, code, type, address, city, region, country, latitude, longitude,
            parent_id,
            director_id,
            head_nurse_id,
            finance_officer_id,
        });
    }
};

// GET: Update Facility Form
exports.getUpdateFacilityForm = async (req, res) => {
    try {
        const { facility_id, success } = req.query;
        
        const allFacilities = await care_facilities.findAll({ order: [['name', 'ASC']] });
        let facility = null;
        let staff = [];
        let mainFacilities = [];
        let allDepartments = [];
        let activeDeptNrs = new Set();
        const errors = [];
        let csrfToken = req.csrfToken(); 

        if (facility_id) {
            facility = await care_facilities.findByPk(facility_id);
            if (!facility) {
                errors.push('Facility not found.');
            } else {
                staff = await getStaffList();
                mainFacilities = await getMainFacilities(facility_id);
                ({ allDepartments, activeDeptNrs } = await getDepartmentAssignmentData(facility_id));
            }
        }
        
        res.render('facilities/updateFacility', {
            title: 'Update Facility',
            user: req.user,
            facilities: allFacilities, 
            facility, 
            staff,
            mainFacilities,
            allDepartments,
            activeDeptNrs,
            errors,
            success: success === '1',
            activePage: 'admin-facilities-update',
            csrfToken,
        });
    } catch (error) {
        console.error('Error fetching data for update facility form:', error);
        res.status(500).send('Error loading page.');
    }
};

// POST: Handle facility update
exports.updateFacility = async (req, res) => {
    const {
        facility_id, name, code, type, parent_id,
        director_id, head_nurse_id, finance_officer_id,
        address, city, region, country, latitude, longitude
    } = req.body;

    const facilityToUpdate = await care_facilities.findByPk(facility_id);
    if (!facilityToUpdate) {
        return res.status(404).send('Facility not found.');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const staff = await getStaffList();
        const allFacilities = await care_facilities.findAll({ order: [['name', 'ASC']] });
        const mainFacilities = await getMainFacilities(facility_id);

        return res.status(400).render('facilities/updateFacility', {
            title: 'Update Facility',
            user: req.user,
            facilities: allFacilities,
            facility: facilityToUpdate,
            staff,
            mainFacilities,
            errors: errors.array().map(e => e.msg),
            success: false,
            activePage: 'admin-facilities-update',
            csrfToken: req.csrfToken(),
        });
    }

    try {
        let finalParentId = null;
        if (!parent_id) {
            finalParentId = facilityToUpdate.id;
        } else if (parent_id) {
            finalParentId = parent_id;
        }

        await facilityToUpdate.update({
            name,
            code,
            type,
            parent_id: finalParentId,
            director_id: director_id || null,
            head_nurse_id: head_nurse_id || null,
            finance_officer_id: finance_officer_id || null,
            address,
            city,
            region,
            country,
            latitude,
            longitude,
        });

        const lognote = `Admin '${req.user.username}' successfully updated facility '${name}' (ID: ${facility_id})`;
        await logActivity(req, lognote, true, 'admin-facilities-update');

        res.redirect(`/admin/facilities/update?success=1&facility_id=${facility_id}`);
    } catch (error) {
        console.error('Facility update failed:', error);
        let errorMessage = 'An error occurred while updating the facility.';
        if (error.name === 'SequelizeValidationError') {
            errorMessage = error.errors.map(e => e.message).join(', ');
        }
        
        const lognote = `Admin '${req.user.username}' failed to update facility '${name}': ${errorMessage}`;
        await logActivity(req, lognote, false, 'admin-facilities-update');

        const staff = await getStaffList();
        const allFacilities = await care_facilities.findAll({ order: [['name', 'ASC']] });
        const mainFacilities = await getMainFacilities(facility_id);

        res.status(500).render('facilities/updateFacility', {
            title: 'Update Facility',
            user: req.user,
            facilities: allFacilities,
            facility: facilityToUpdate,
            staff,
            mainFacilities,
            errors: [errorMessage],
            success: false,
            activePage: 'admin-facilities-update',
            csrfToken: req.csrfToken(),
        });
    }
};

// POST: Save which global departments are active for a facility.
// Soft-deactivate on uncheck (is_active=0, row stays) rather than
// deleting — matches how is_active is already used elsewhere in this
// schema, and keeps the assignment history rather than just losing it if
// a box gets unchecked by mistake.
exports.updateFacilityDepartments = async (req, res) => {
    const { facility_id } = req.body;
    const facility = await care_facilities.findByPk(facility_id);
    if (!facility) return res.status(404).send('Facility not found.');

    try {
        const submitted = req.body.dept_nrs;
        const checkedNrs = new Set(
            (Array.isArray(submitted) ? submitted : (submitted ? [submitted] : []))
                .map(n => parseInt(n, 10))
                .filter(n => !isNaN(n))
        );

        const allDepartments = await care_department.findAll({ attributes: ['nr'] });
        const existingRows = await care_facility_departments.findAll({ where: { facility_id } });
        const existingByNr = {};
        existingRows.forEach(row => { existingByNr[row.dept_nr] = row; });

        for (const dept of allDepartments) {
            const isChecked = checkedNrs.has(dept.nr);
            const existingRow = existingByNr[dept.nr];
            if (existingRow) {
                const wantActive = isChecked ? 1 : 0;
                if (existingRow.is_active !== wantActive) {
                    await existingRow.update({ is_active: wantActive });
                }
            } else if (isChecked) {
                await care_facility_departments.create({
                    facility_id, dept_nr: dept.nr, is_active: 1,
                });
            }
            // No existing row and not checked -> nothing to do, correctly
            // stays "never configured" rather than creating an inactive row.
        }

        const lognote = `Admin '${req.user.username}' updated department assignments for facility '${facility.name}' (ID: ${facility_id})`;
        await logActivity(req, lognote, true, 'admin-facility-departments');

        res.redirect(`/admin/facilities/update?success=1&facility_id=${facility_id}`);
    } catch (error) {
        console.error('Facility department update failed:', error);
        const lognote = `Admin '${req.user.username}' failed to update department assignments for facility ID ${facility_id}: ${error.message}`;
        await logActivity(req, lognote, false, 'admin-facility-departments');
        res.status(500).send('Error updating department assignments.');
    }
};

// GET: Render the main facilities management form (with filtering options)
exports.getFacilitiesManagement = async (req, res) => {
    try {
        const allFacilities = await care_facilities.findAll({ order: [['name', 'ASC']] });
        res.render('facilities/listFacilities', {
            title: 'Gérer les Etablissements',
            user: req.user,
            facilities: allFacilities,
            activePage: 'admin-facilities-list',
            csrfToken: req.csrfToken(),
        });
    } catch (error) {
        console.error('Error fetching facilities for management page:', error);
        res.status(500).send('Error loading page.');
    }
};



