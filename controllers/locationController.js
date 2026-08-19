// controllers/locationController.js
'use strict';
const { Op } = require('sequelize');
const logActivity = require('../utils/activityLogger');
const { care_wh_locations, care_wh_stock } = require('../models');

const actor = (u) => (u && u.firstName && u.lastName)
    ? (u.firstName + ' ' + u.lastName).trim() : (u && u.username) || 'unknown';

// ── LIST ──────────────────────────────────────────────────────────
exports.listLocations = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const locs   = await care_wh_locations.findAll({
            order: [['aisle','ASC'],['shelf','ASC'],['label','ASC']],
        });
        // Group by aisle for display
        const grouped = {};
        locs.forEach(l => {
            const key = l.aisle || 'General';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(l);
        });
        res.render('warehouse/locations/list', {
            title:      locale === 'fr' ? 'Emplacements' : 'Stock Locations',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            locations: locs, grouped,
            success:   req.query.success || null,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ── CREATE FORM ───────────────────────────────────────────────────
exports.createForm = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const zones  = await care_wh_locations.findAll({
            where: { parent_id: null, is_active: 1 }, order: [['label','ASC']],
        });
        res.render('warehouse/locations/form', {
            title:      locale === 'fr' ? 'Nouvel emplacement' : 'New Location',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            loc: null, zones, errors: [], mode: 'create',
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ── CREATE POST ───────────────────────────────────────────────────
exports.createLocation = async (req, res) => {
    const locale = req.locale || 'en';
    const { label, aisle, shelf, description, parent_id } = req.body;
    const errors = [];
    if (!label || !label.trim()) errors.push(locale === 'fr' ? 'Étiquette requise.' : 'Label required.');
    if (!aisle || !aisle.trim()) errors.push(locale === 'fr' ? 'Allée requise.'     : 'Aisle required.');

    if (!errors.length) {
        const exists = await care_wh_locations.findOne({ where: { label: label.trim() } });
        if (exists) errors.push(locale === 'fr' ? 'Cet emplacement existe déjà.' : 'This label already exists.');
    }

    if (errors.length) {
        const zones = await care_wh_locations.findAll({ where: { parent_id: null, is_active: 1 }, order: [['label','ASC']] });
        return res.render('warehouse/locations/form', {
            title: locale === 'fr' ? 'Nouvel emplacement' : 'New Location',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            loc: req.body, zones, errors, mode: 'create',
        });
    }
    try {
        const loc = await care_wh_locations.create({
            label:       label.trim().toUpperCase(),
            aisle:       (aisle || '').trim().toUpperCase(),
            shelf:       (shelf || '').trim().toUpperCase(),
            description: description ? description.trim() : null,
            parent_id:   parent_id   ? parseInt(parent_id, 10) : null,
            is_active:   1,
        });
        await logActivity(req, 'Location ' + loc.label + ' created',
            true, 'locationController.js', req.user.user_id, req.user.username);
        res.redirect('/warehouse/locations?success=created');
    } catch (err) {
        const zones = await care_wh_locations.findAll({ where: { parent_id: null, is_active: 1 }, order: [['label','ASC']] });
        res.render('warehouse/locations/form', {
            title: locale === 'fr' ? 'Nouvel emplacement' : 'New Location',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            loc: req.body, zones, errors: [err.message], mode: 'create',
        });
    }
};

// ── EDIT FORM ─────────────────────────────────────────────────────
exports.editForm = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const locId  = parseInt(req.params.location_id, 10);
        const [loc, zones] = await Promise.all([
            care_wh_locations.findByPk(locId),
            care_wh_locations.findAll({ where: { parent_id: null, is_active: 1 }, order: [['label','ASC']] }),
        ]);
        if (!loc) return res.status(404).send('Not found');
        res.render('warehouse/locations/form', {
            title: locale === 'fr' ? 'Modifier emplacement' : 'Edit Location',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            loc, zones, errors: [], mode: 'edit',
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ── EDIT POST ─────────────────────────────────────────────────────
exports.editLocation = async (req, res) => {
    const locale = req.locale || 'en';
    const locId  = parseInt(req.params.location_id, 10);
    const { label, aisle, shelf, description, parent_id, is_active } = req.body;
    const errors = [];
    if (!label || !label.trim()) errors.push(locale === 'fr' ? 'Étiquette requise.' : 'Label required.');

    if (errors.length) {
        const loc   = await care_wh_locations.findByPk(locId);
        const zones = await care_wh_locations.findAll({ where: { parent_id: null, is_active: 1 }, order: [['label','ASC']] });
        return res.render('warehouse/locations/form', {
            title: locale === 'fr' ? 'Modifier emplacement' : 'Edit Location',
            activePage: 'warehouse', user: req.user, csrfToken: req.csrfToken(),
            loc: { ...loc?.dataValues, ...req.body }, zones, errors, mode: 'edit',
        });
    }
    try {
        await care_wh_locations.update({
            label:       label.trim().toUpperCase(),
            aisle:       (aisle || '').trim().toUpperCase(),
            shelf:       (shelf || '').trim().toUpperCase(),
            description: description ? description.trim() : null,
            parent_id:   parent_id   ? parseInt(parent_id, 10) : null,
            is_active:   is_active   ? 1 : 0,
        }, { where: { location_id: locId } });
        await logActivity(req, 'Location ' + label + ' updated',
            true, 'locationController.js', req.user.user_id, req.user.username);
        res.redirect('/warehouse/locations?success=updated');
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};


