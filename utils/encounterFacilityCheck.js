
// utils/encounterFacilityCheck.js
// Multi-Facility — shared check for facility-scoped write/read actions.
// Originally built for encounter-level actions (activate, discharge,
// transfer, admit-inpatient, and anything mutating an existing encounter
// or its linked prescription/diagnosis rows) -- none of these previously
// checked facility ownership at all, since department numbers are a
// global catalog and two facilities sharing a department meant staff at
// one could see and act on the other's encounters with no check.
//
// Now also reused for billing (bills, bill items, payments, bill-final
// rows) -- the function is generic (anything with a facility_id property),
// so the same check applies unchanged; the name stays encounter-focused
// for historical reasons rather than "hasFacilityAccess", since renaming
// would touch every one of its many existing call sites for no functional
// gain.
//
// System Administrators (req.user.facility is null, confirmed exempt per
// MULTI_FACILITY_IMPLEMENTATION_PLAN.md §5 item 9) bypass this check --
// consistent with "sees everything, for now" already established for
// billing/pharmacy write actions in this same phase.
'use strict';

/**
 * @param {object} req - the Express request (needs req.user.facility)
 * @param {object} record - any instance with a facility_id property
 *   (care_encounter, care_encounter_prescription, care_encounter_diagnosis,
 *   care_billing_bill, and so on)
 * @returns {boolean} true if the action should be allowed
 */
function hasEncounterFacilityAccess(req, record) {
    // Uses the same dedicated isFacilityExempt flag already established
    // in authController.js/authMiddleware.js for exactly this purpose,
    // rather than re-deriving admin status from req.user.facility.id
    // directly. req.user.facility is ALWAYS a truthy object ({ id, name })
    // -- for admin/exempt accounts specifically it's { id: null }, never
    // `null`/`undefined` itself -- so checking the object's own
    // truthiness alone was a real, live bug (admins were being BLOCKED
    // from every encounter/billing action rather than exempted, the
    // opposite of the intended design). isFacilityExempt already encodes
    // this correctly and is the established, idiomatic way to check it
    // elsewhere in this codebase (see facilityMiddleware.js) -- using
    // anything else here was inconsistent with that, even once corrected.
    if (req.user.isFacilityExempt) return true; // admin exemption
    return record.facility_id === req.user.facility.id;
}

module.exports = { hasEncounterFacilityAccess };
