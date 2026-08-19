
// middleware/facilityMiddleware.js
// Multi-Facility Phase 1 — exposes req.facilityId for every controller to use.
// Runs after authMiddleware. By the time a session is fully authenticated
// (req.session.authenticated === true), facility selection has already
// happened during login (see authController.login / selectFacility) — this
// middleware's job is just to surface that choice consistently, not to
// perform the selection itself.
'use strict';

module.exports = (req, res, next) => {
    // Not authenticated yet (or mid facility-selection) — nothing to expose,
    // let authMiddleware / the route itself handle it.
    if (!req.session || !req.session.authenticated || !req.user) {
        return next();
    }

    // Admin accounts (is_admin flag, or the System/Application Administrator
    // roles) are deliberately given facility: { id: null } at login — they're
    // not tied to one facility, they conceptually see everything (see
    // authController.login). Checking the dedicated isFacilityExempt flag
    // here, rather than isAdmin/isAppAdmin directly, since isAppAdmin only
    // ever means "System Administrator" specifically — an Application
    // Administrator without is_admin=1 also set would otherwise fail this
    // check and get bounced into a facility-picker redirect loop despite
    // having legitimately bypassed the facility requirement at login.
    if (req.user.isFacilityExempt) {
        // Already established as exempt above -- facilityId is simply
        // null for this session, no need to re-derive it from
        // req.user.facility.id via a ternary whose condition is always
        // true anyway (req.user.facility is never null/undefined itself).
        req.facilityId = null;
        res.locals.facilityId = null;
        return next();
    }

    // Not exempt at this point, so req.user.facility.id is expected to be
    // a real facility id -- the `!facilityId` check below is the actual
    // safety net for the unexpected case where it somehow isn't.
    const facilityId = req.user.facility.id;

    if (!facilityId) {
        // Authenticated, but somehow no facility on the session — shouldn't
        // normally happen given the new login flow, but don't silently let
        // facility-scoped queries run with an undefined filter. Send them
        // back through facility selection rather than guessing.
        if (req.path !== '/auth/select-facility' && !req.path.startsWith('/auth/')) {
            return res.redirect('/auth/select-facility');
        }
        return next();
    }

    req.facilityId = facilityId;
    res.locals.facilityId = facilityId;
    next();
};
