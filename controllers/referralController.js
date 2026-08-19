
// controllers/referralController.js  -- FULL FILE
// Patient Referral System -- see MULTI_FACILITY_IMPLEMENTATION_PLAN.md
// section 2.5. A referral is a workflow signal between facilities, not a
// data-access gate -- cross-facility clinical history is already visible
// for continuity of care regardless of whether a referral exists.
//
// Permission model, confirmed with the project owner: strictly Doctor/
// Nurse (the three MedicalRecord.* permissions below), for BOTH
// initiating a referral at the sending facility AND accepting/declining/
// updating status at the receiving facility -- one consistent gate
// throughout this whole file, not a different set per action.
'use strict';
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const {
    care_patient_referral,
    care_encounter,
    care_person,
    care_facilities,
} = require('../models');
const logActivity = require('../utils/activityLogger');
const { hasEncounterFacilityAccess } = require('../utils/encounterFacilityCheck');

const fullName = (user) =>
    (user.firstName && user.lastName)
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.username;

// Strictly Doctor/Nurse -- matches the clinical subset of
// dashboardController.js's CLINICAL_WORKLIST_PERMISSIONS, deliberately
// excluding Patient.Create.PatientRecord / Patient.Admit.Inpatient
// (registration/admission roles), confirmed as out of scope for referrals
// specifically.
const REFERRAL_PERMISSIONS = [
    'MedicalRecord.Create.Diagnosis',
    'MedicalRecord.Create.Note',
    'MedicalRecord.Update.Note',
];

function hasReferralPermission(req) {
    if (req.user.permissions.includes('Admin.FullAccess')) return true;
    return req.user.permissions.some(p => REFERRAL_PERMISSIONS.includes(p));
}

// -- POST /patients/:pid/refer -----------------------------------------
// Create a new referral from the current encounter to another facility.
exports.referPatient = async (req, res) => {
    try {
        if (!hasReferralPermission(req))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        // Admin accounts (isFacilityExempt) have no specific facility to
        // refer FROM -- req.user.facility.id is null for them, which
        // would otherwise hit care_patient_referral.from_facility_id's
        // NOT NULL constraint as a raw, unhandled database error rather
        // than a clean, expected block. Same reasoning already applied
        // to incomingReferrals/outgoingReferrals below.
        if (req.user.isFacilityExempt)
            return res.status(400).json({ ok: false, error: 'Admin accounts have no specific facility to refer from.' });

        const pid = parseInt(req.params.pid, 10);
        const { to_facility_id, from_encounter_nr, reason, urgency } = req.body;

        if (!reason || !reason.trim())
            return res.status(400).json({ ok: false, error: 'A reason for the referral is required.' });

        const toFacilityId = parseInt(to_facility_id, 10);
        if (!toFacilityId)
            return res.status(400).json({ ok: false, error: 'A receiving facility is required.' });

        // Cross-module check: the receiving facility must be a real,
        // currently-active facility, and must not be the same facility
        // the referral is being sent from (a same-facility "referral"
        // is meaningless -- that's just a normal internal handoff).
        const toFacility = await care_facilities.findByPk(toFacilityId);
        if (!toFacility)
            return res.status(404).json({ ok: false, error: 'Receiving facility not found.' });
        if (toFacilityId === req.user.facility.id)
            return res.status(400).json({ ok: false, error: 'Cannot refer a patient to their own current facility.' });

        const patient = await care_person.findByPk(pid);
        if (!patient)
            return res.status(404).json({ ok: false, error: 'Patient not found.' });

        // Confirmed with the project owner: block ANY new referral while
        // one is already open for this patient, regardless of
        // destination facility -- not just a duplicate to the same
        // facility. "Open" means not yet at a terminal status
        // (declined/completed are terminal; sent/accepted/seen are not).
        const existingOpenReferral = await care_patient_referral.findOne({
            where: { pid, status: { [Op.in]: ['sent', 'accepted', 'seen'] } },
        });
        if (existingOpenReferral)
            return res.status(400).json({
                ok: false,
                error: 'This patient already has an open referral (#' + existingOpenReferral.id + '). It must be declined or completed before a new one can be sent.',
            });

        // If an encounter is cited, it must genuinely belong to the
        // referring facility -- reusing the same generic
        // hasEncounterFacilityAccess helper used everywhere else in this
        // codebase for exactly this class of check, not a bespoke one.
        let encNr = null;
        if (from_encounter_nr) {
            encNr = parseInt(from_encounter_nr, 10);
            const encounter = await care_encounter.findByPk(encNr);
            if (!encounter)
                return res.status(404).json({ ok: false, error: 'Encounter not found.' });
            if (!hasEncounterFacilityAccess(req, encounter))
                return res.status(403).json({ ok: false, error: 'This encounter belongs to a different facility.' });
        }

        const referral = await care_patient_referral.create({
            pid,
            from_facility_id: req.user.facility.id,
            to_facility_id: toFacilityId,
            from_encounter_nr: encNr,
            reason: reason.trim(),
            urgency: ['routine', 'urgent', 'emergency'].includes(urgency) ? urgency : 'routine',
            status: 'sent',
            referring_staff: fullName(req.user),
            created_at: new Date(),
        });

        await logActivity(req,
            `Referral #${referral.id} created for patient #${pid} from facility #${req.user.facility.id} to facility #${toFacilityId} by ${fullName(req.user)}`,
            true, 'referralController.js', req.user.user_id, req.user.username);

        res.json({ ok: true, referral });
    } catch (err) {
        console.error('referPatient error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// -- GET /referrals/incoming --------------------------------------------
// Referrals sent TO the current session facility, for the dashboard
// widget. Admins see nothing here by design (no facility to receive
// referrals as) -- consistent with the rest of this app's admin-exemption
// pattern not being a blanket "see everything" for facility-owned lists.
exports.incomingReferrals = async (req, res) => {
    try {
        if (req.user.isFacilityExempt) {
            return res.json({ ok: true, referrals: [] });
        }
        const referrals = await care_patient_referral.findAll({
            where: { to_facility_id: req.user.facility.id, status: { [Op.in]: ['sent', 'accepted', 'seen'] } },
            include: [
                { model: care_person, as: 'patient' },
                { model: care_facilities, as: 'fromFacility' },
            ],
            order: [['created_at', 'DESC']],
        });
        res.json({ ok: true, referrals });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// -- GET /referrals/outgoing ----------------------------------------------
// Referrals sent FROM the current session facility, so referring staff
// can track status without needing to ask the other side. Renders a
// page directly -- no other consumer needs this as a JSON API.
exports.outgoingReferrals = async (req, res) => {
    try {
        const referrals = req.user.isFacilityExempt ? [] : await care_patient_referral.findAll({
            where: { from_facility_id: req.user.facility.id },
            include: [
                { model: care_person, as: 'patient' },
                { model: care_facilities, as: 'toFacility' },
            ],
            order: [['created_at', 'DESC']],
            limit: 50,
        });
        res.render('referrals/sent', {
            title: req.locale === 'fr' ? 'Referrals envoyes' : 'Sent Referrals',
            activePage: 'patients',
            user: req.user,
            referrals,
            locale: req.locale,
        });
    } catch (err) {
        console.error('outgoingReferrals error:', err);
        res.status(500).send('Error loading sent referrals: ' + err.message);
    }
};

// -- POST /referrals/:id/accept -------------------------------------------
exports.acceptReferral = async (req, res) => {
    try {
        if (!hasReferralPermission(req))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const id = parseInt(req.params.id, 10);
        const referral = await care_patient_referral.findByPk(id);
        if (!referral)
            return res.status(404).json({ ok: false, error: 'Referral not found.' });
        if (!req.user.isFacilityExempt && referral.to_facility_id !== req.user.facility.id)
            return res.status(403).json({ ok: false, error: 'This referral was not sent to your facility.' });
        if (referral.status !== 'sent')
            return res.status(400).json({ ok: false, error: `Referral is already ${referral.status}.` });

        await referral.update({
            status: 'accepted',
            receiving_staff: fullName(req.user),
            updated_at: new Date(),
        });

        await logActivity(req,
            `Referral #${id} accepted by ${fullName(req.user)}`,
            true, 'referralController.js', req.user.user_id, req.user.username);

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// -- POST /referrals/:id/decline -------------------------------------------
// Reason required, matching this project's established convention on
// every other reject/decline action (rejectOrder, writeOffRemainder).
exports.declineReferral = async (req, res) => {
    try {
        if (!hasReferralPermission(req))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const { reason } = req.body;
        if (!reason || !reason.trim())
            return res.status(400).json({ ok: false, error: 'A reason is required to decline a referral.' });

        const id = parseInt(req.params.id, 10);
        const referral = await care_patient_referral.findByPk(id);
        if (!referral)
            return res.status(404).json({ ok: false, error: 'Referral not found.' });
        if (!req.user.isFacilityExempt && referral.to_facility_id !== req.user.facility.id)
            return res.status(403).json({ ok: false, error: 'This referral was not sent to your facility.' });
        if (referral.status !== 'sent')
            return res.status(400).json({ ok: false, error: `Referral is already ${referral.status}.` });

        await referral.update({
            status: 'declined',
            receiving_staff: fullName(req.user),
            decline_reason: reason.trim(),
            updated_at: new Date(),
        });

        await logActivity(req,
            `Referral #${id} declined by ${fullName(req.user)}: ${reason.trim()}`,
            true, 'referralController.js', req.user.user_id, req.user.username);

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// Appends a timestamped note to receiving_notes, matching this project's
// existing history-field style (see care_encounter.history) but as a
// genuine append -- multiple notes across Mark Seen/Mark Completed
// accumulate rather than overwrite each other.
function appendNote(existing, label, actor, text) {
    if (!text || !text.trim()) return existing || null;
    const line = `[${new Date().toISOString()}] ${label} by ${actor}: ${text.trim()}`;
    return existing ? `${existing}\n${line}` : line;
}

// -- POST /referrals/:id/mark-seen -------------------------------------------
// Manual only -- confirmed with the project owner, no automatic linking
// when a new encounter is created for this patient at the receiving
// facility. to_encounter_nr is optional: staff may link the resulting
// encounter if they want it for later reporting, but it's not required
// to mark a referral as seen. notes is also optional -- confirmed
// needed even though referral and admission stay fully separate: the
// receiving doctor may examine the patient before deciding whether/when
// to open a full encounter, and still needs somewhere to record what
// they found.
exports.markSeen = async (req, res) => {
    try {
        if (!hasReferralPermission(req))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const id = parseInt(req.params.id, 10);
        const { to_encounter_nr, notes } = req.body;
        const referral = await care_patient_referral.findByPk(id);
        if (!referral)
            return res.status(404).json({ ok: false, error: 'Referral not found.' });
        if (!req.user.isFacilityExempt && referral.to_facility_id !== req.user.facility.id)
            return res.status(403).json({ ok: false, error: 'This referral was not sent to your facility.' });
        if (referral.status !== 'accepted')
            return res.status(400).json({ ok: false, error: 'Referral must be accepted before it can be marked seen.' });

        let encNr = null;
        if (to_encounter_nr) {
            encNr = parseInt(to_encounter_nr, 10);
            const encounter = await care_encounter.findByPk(encNr);
            if (!encounter)
                return res.status(404).json({ ok: false, error: 'Encounter not found.' });
            if (!hasEncounterFacilityAccess(req, encounter))
                return res.status(403).json({ ok: false, error: 'This encounter belongs to a different facility.' });
        }

        await referral.update({
            status: 'seen',
            to_encounter_nr: encNr,
            receiving_notes: appendNote(referral.receiving_notes, 'Seen', fullName(req.user), notes),
            updated_at: new Date(),
        });

        await logActivity(req,
            `Referral #${id} marked seen by ${fullName(req.user)}${encNr ? ` (linked to encounter #${encNr})` : ''}`,
            true, 'referralController.js', req.user.user_id, req.user.username);

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// -- POST /referrals/:id/complete -------------------------------------------
exports.markCompleted = async (req, res) => {
    try {
        if (!hasReferralPermission(req))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const id = parseInt(req.params.id, 10);
        const { notes } = req.body;
        const referral = await care_patient_referral.findByPk(id);
        if (!referral)
            return res.status(404).json({ ok: false, error: 'Referral not found.' });
        if (!req.user.isFacilityExempt && referral.to_facility_id !== req.user.facility.id)
            return res.status(403).json({ ok: false, error: 'This referral was not sent to your facility.' });
        if (referral.status !== 'seen')
            return res.status(400).json({ ok: false, error: 'Referral must be marked seen before it can be completed.' });

        await referral.update({
            status: 'completed',
            receiving_notes: appendNote(referral.receiving_notes, 'Completed', fullName(req.user), notes),
            updated_at: new Date(),
        });

        await logActivity(req,
            `Referral #${id} marked completed by ${fullName(req.user)}`,
            true, 'referralController.js', req.user.user_id, req.user.username);

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};
