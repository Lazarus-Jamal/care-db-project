
// utils/facilityDepartmentHelper.js
// Shared helper for user creation/update forms — departments are now
// facility-scoped via care_facility_departments (System Configuration
// module), so the department dropdown needs to be filtered to whichever
// facility is currently selected. Returns the full active mapping in one
// query, keyed by facility_id, so the view can filter client-side as soon
// as the facility changes — same pre-load-and-filter pattern already used
// for facility search on the update-facility page, rather than an AJAX
// round-trip per change.
'use strict';
const { care_facility_departments } = require('../models');

/**
 * @returns {Promise<Object>} { [facility_id]: [dept_nr, dept_nr, ...] }
 */
async function getFacilityDepartmentMap() {
    const rows = await care_facility_departments.findAll({
        where: { is_active: 1 },
        attributes: ['facility_id', 'dept_nr'],
    });
    const map = {};
    rows.forEach(row => {
        if (!map[row.facility_id]) map[row.facility_id] = [];
        map[row.facility_id].push(row.dept_nr);
    });
    return map;
}

module.exports = { getFacilityDepartmentMap };
