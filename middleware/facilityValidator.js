// middleware/facilityValidator.js
const { body, validationResult } = require('express-validator');
const logActivity = require('../utils/activityLogger');
const { care_facilities, care_staff } = require('../models');
const { Op } = require('sequelize');

// Helper: get all facilities except self (for parent dropdown)
const getMainFacilities = (excludeId = null) => care_facilities.findAll({
    where: excludeId ? { id: { [Op.ne]: excludeId } } : {},
    order: [['name', 'ASC']],
});

const renderCreateErrorPage = async (req, res, errors) => {
    const staff = await care_staff.findAll({
        attributes: ['nr', 'job_function_title'],
        order: [['job_function_title', 'ASC']],
    });
    const facilities = await getMainFacilities();
    await logActivity(req,
        `Admin '${req.user.username}' failed to create facility: ${errors.join(', ')}`,
        false, 'admin-facilities-create');
    return res.render('facilities/create', {
        title:      'Create Facility',
        user:       req.user,
        staff,
        facilities,
        success:    false,
        errors,
        activePage: 'admin-facilities-create',
        csrfToken:  req.csrfToken(),
        name:       req.body.name,
        code:       req.body.code,
        type:       req.body.type,
        address:    req.body.address,
        city:       req.body.city,
        region:     req.body.region,
        country:    req.body.country,
        latitude:   req.body.latitude,
        longitude:  req.body.longitude,
        parent_id:  req.body.parent_id,
    });
};

const renderUpdateErrorPage = async (req, res, errors, facilityToUpdate) => {
    const staff        = await care_staff.findAll({ attributes: ['nr', 'job_function_title'] });
    const allFacilities = await care_facilities.findAll({ order: [['name', 'ASC']] });
    const mainFacilities = await getMainFacilities(facilityToUpdate.id);
    await logActivity(req,
        `Admin '${req.user.username}' failed to update facility: ${errors.join(', ')}`,
        false, 'admin-facilities-update');
    return res.status(400).render('facilities/updateFacility', {
        title:         'Update Facility',
        user:          req.user,
        facilities:    allFacilities,
        facility:      facilityToUpdate,
        staff,
        mainFacilities,
        errors,
        success:       false,
        activePage:    'admin-facilities-update',
        csrfToken:     req.csrfToken(),
    });
};

const facilityValidator = [
    body('name')
        .trim().escape()
        .notEmpty().withMessage('Facility Name is required.')
        .custom(async (value, { req }) => {
            const where = { name: value };
            if (req.body.facility_id) where.id = { [Op.ne]: req.body.facility_id };
            const existing = await care_facilities.findOne({ where });
            if (existing) throw new Error('A facility with this name already exists.');
        }),

    body('code')
        .trim().escape()
        .notEmpty().withMessage('Facility Code is required.')
        .isAlphanumeric().withMessage('Facility Code must be alphanumeric.')
        .custom(async (value, { req }) => {
            const where = { code: value };
            if (req.body.facility_id) where.id = { [Op.ne]: req.body.facility_id };
            const existing = await care_facilities.findOne({ where });
            if (existing) throw new Error('A facility with this code already exists.');
        }),

    body('type')
        .trim().escape()
        .notEmpty().withMessage('Facility Type is required.'),

    // parent_id is optional — only validate if provided
    body('parent_id')
        .optional({ nullable: true, checkFalsy: true })
        .custom(async (value) => {
            if (value) {
                const parent = await care_facilities.findByPk(value);
                if (!parent) throw new Error('Invalid parent facility selected.');
            }
        }),

    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(e => e.msg);
            const facilityToUpdate = req.body.facility_id
                ? await care_facilities.findByPk(req.body.facility_id)
                : null;
            if (facilityToUpdate) {
                return renderUpdateErrorPage(req, res, errorMessages, facilityToUpdate);
            }
            return renderCreateErrorPage(req, res, errorMessages);
        }
        next();
    },
];

module.exports = facilityValidator;
