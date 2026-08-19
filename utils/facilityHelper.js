
// utils/facilityHelper.js
// Shared helper for printable/official documents that need the current
// facility's full details (address, phone, email) — not just the {id,name}
// already on req.user.facility from login.
//
// Called explicitly by each controller that renders a printable document
// (matching this project's stated preference for explicit data-fetching
// over "invisible" middleware magic — see MULTI_FACILITY_IMPLEMENTATION_PLAN.md
// §3.4), rather than injected globally into every request.
//
// NOTE for when Multi-Facility Phase 2/3 lands: this currently reflects the
// *session's* current facility, since bills/purchase-orders/RFQs/etc. don't
// carry their own facility_id yet. Once they do, printable documents should
// prefer the document's own facility_id over the session's, so a document
// always shows the facility it actually belongs to — even if the person
// printing it has since switched facilities. Revisit this helper's callers
// at that point, not this file itself.
'use strict';
const { care_facilities } = require('../models');

/**
 * @param {object} req - the Express request (needs req.user.facility.id)
 * @returns {Promise<object|null>} the full facility row, or null if the
 *   session has no specific facility (e.g. an admin in "all facilities"
 *   mode) or the lookup fails for any reason — callers should handle null
 *   gracefully (documents still render, just without facility details).
 */
async function getCurrentFacilityDetails(req) {
    try {
        const facilityId = req.user?.facility?.id;
        if (!facilityId) return null;
        return await care_facilities.findByPk(facilityId, {
            attributes: ['id', 'name', 'address', 'city', 'region', 'country', 'phone', 'email'],
        });
    } catch (err) {
        console.error('getCurrentFacilityDetails error:', err);
        return null;
    }
}

module.exports = { getCurrentFacilityDetails };
