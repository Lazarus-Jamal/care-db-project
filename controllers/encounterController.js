
// controllers/encounterController.js  — FULL FILE
'use strict';
const { Op }    = require('sequelize');
const sequelize = require('../config/database');
const {
    care_encounter,
    care_person,
    care_staff,
    care_ward,
    care_billing_bill,
    care_billing_bill_item,
    care_encounter_measurement,
    care_encounter_notes,
    care_encounter_diagnosis,
    care_diagnostics_cim10,
    care_department,
} = require('../models');
const logActivity = require('../utils/activityLogger');
const { hasEncounterFacilityAccess } = require('../utils/encounterFacilityCheck');

const fullName = (user) =>
    (user.firstName && user.lastName)
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.username;

// ── GET /encounters/worklist ──────────────────────────────────────
exports.worklist = async (req, res) => {
    try {
        const locale    = req.locale || 'en';
        const userPerms = req.user?.permissions || [];
        const deptNr    = req.user?.dept_nr     || null;
        const userFullName = (req.user?.firstName && req.user?.lastName)
            ? (req.user.firstName + ' ' + req.user.lastName).trim()
            : (req.user?.username || '');

        // Tab and search params (preserved from original controller)
        const filterTab = req.query.tab    || 'dept';
        const search    = (req.query.search || '').trim();

        // Base filter
        const where = {
            is_discharged:    0,
            encounter_status: { [Op.in]: ['pending', 'active'] },
        };

        // Multi-Facility Phase 2 — the worklist previously had no facility
        // filter at all, only department/consulting-doctor. Since
        // departments are a single global catalog (System Configuration
        // module), two facilities sharing the same department number
        // meant staff at one could see -- and act on -- the other's
        // encounters with zero check anywhere. System Administrators
        // bypass this, consistent with "sees everything, for now" already
        // established for this phase. req.user.facility is ALWAYS a
        // truthy object -- admins get { id: null } specifically -- so
        // this checks `.id`, not just the object's truthiness (this was
        // a real, live bug when written the other way: see
        // hasEncounterFacilityAccess's comment for the full explanation).
        if (!req.user.isFacilityExempt) {
            where.facility_id = req.user.facility.id;
        }

        // Tab filtering
        if (filterTab === 'mine') {
            where.consulting_dr = userFullName;
        } else if (deptNr) {
            where.current_dept_nr = deptNr;
        }

        const encounters = await care_encounter.findAll({
            where,
            order:   [['encounter_date', 'DESC']],
            limit:   200,
            include: [{
                model:      care_person,
                as:         'patient',
                attributes: ['pid', 'hospital_file_nr', 'name_first', 'name_last',
                             'date_birth', 'sex'],
                required: false,
            }],
        });

        // Apply search filter in JS (name or file number)
        const filtered = search ? encounters.filter(e => {
            const p = e.patient;
            if (!p) return false;
            const q = search.toLowerCase();
            return (p.name_last  && p.name_last.toLowerCase().includes(q))  ||
                   (p.name_first && p.name_first.toLowerCase().includes(q)) ||
                   (p.hospital_file_nr && String(p.hospital_file_nr).includes(q));
        }) : encounters;

        // Build billing warning map
        const encNrs = filtered.map(e => Number(e.encounter_nr));
        let billWarningMap = {};
        if (encNrs.length) {
            const openBills = await care_billing_bill.findAll({
                where: {
                    encounter_nr: { [Op.in]: encNrs },
                    status:       { [Op.in]: ['open', 'partial'] },
                },
                attributes: ['encounter_nr', 'bill_no', 'status'],
            });
            openBills.forEach(b => {
                billWarningMap[Number(b.encounter_nr)] = true;
            });
        }

        // Counts for tab badges — same facility filter as the main query,
        // so the badge numbers actually match what the tabs will show.
        const deptWhere = { is_discharged: 0, encounter_status: { [Op.in]: ['pending','active'] } };
        if (!req.user.isFacilityExempt) deptWhere.facility_id = req.user.facility.id;
        if (deptNr) deptWhere.current_dept_nr = deptNr;
        const mineWhere = { ...deptWhere, consulting_dr: userFullName };
        const [deptCount, mineCount] = await Promise.all([
            care_encounter.count({ where: deptWhere }),
            care_encounter.count({ where: mineWhere }),
        ]);

        // Staff list for transfer/assignment dropdown
        const staffList = await care_staff.findAll({
            where: { [Op.or]: [{ status: '1' }, { status: 'active' }, { status: null }] },
            include: [{
                model: care_person, as: 'person',
                attributes: ['name_first', 'name_last'], required: true,
            }],
            order: [[{ model: care_person, as: 'person' }, 'name_last', 'ASC']],
            limit: 500,
        });

        // Wards for inpatient modal
        const wards = await care_ward.findAll({
            where: { is_temp_closed: 0 },
            order: [['name', 'ASC']],
            attributes: ['nr', 'name', 'ward_type', 'dept_nr'],
        });

        // Context titles from navbar menu links
        const context = req.query.context || '';
        const contextTitles = {
            consultations:   locale === 'fr' ? 'Consultations'          : 'Consultations',
            prescriptions:   locale === 'fr' ? 'Prescriptions'          : 'Prescriptions',
            hospitalization: locale === 'fr' ? 'Hospitalisations'       : 'Hospitalization',
            appointments:    locale === 'fr' ? 'Rendez-vous'            : 'Appointments',
            actsexams:       locale === 'fr' ? 'Actes et examens'       : 'Acts & Exams',
        };
        const pageTitle = contextTitles[context] ||
            (locale === 'fr' ? 'File des consultations' : 'Encounter Worklist');

        res.render('encounters/worklist', {
            title:      pageTitle,
            activePage: 'worklist',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            encounters: filtered,
            billWarningMap,
            staffList,
            wards,
            filterTab,
            search,
            deptCount,
            mineCount,
        });
    } catch (err) {
        console.error('Worklist error:', err);
        res.status(500).send('Error loading worklist: ' + err.message);
    }
};

// ── POST /encounters/:nr/activate ─────────────────────────────────
exports.activate = async (req, res) => {
    try {
        const encNr = parseInt(req.params.nr, 10);
        const actor = fullName(req.user);
        const enc   = await care_encounter.findByPk(encNr);
        if (!enc) return res.status(404).json({ ok: false, error: 'Not found' });
        if (!hasEncounterFacilityAccess(req, enc)) {
            return res.status(403).json({ ok: false, error: 'This encounter belongs to a different facility.' });
        }

        // Check whether the consultation bill has been paid
        let billWarning = null;
        const bill = await care_billing_bill.findOne({
            where: { encounter_nr: encNr },
            order: [['bill_no', 'DESC']],
        });
        if (bill && bill.status !== 'paid') {
            const unpaidItems = await care_billing_bill_item.count({
                where: { bill_no: bill.bill_no, status: 'open' },
            });
            if (unpaidItems > 0) {
                billWarning = 'Bill #' + bill.bill_no + ' has ' + unpaidItems +
                              ' unpaid item(s). Activating anyway.';
            }
        }

        await enc.update({
            encounter_status: 'active',
            status:           'active',
            modify_id:        actor,
            modify_time:      new Date(),
            history: (enc.history || '') +
                `\n[${new Date().toISOString()}] Activated by ${actor}`,
        });
        await logActivity(req, `Encounter #${encNr} activated by ${actor}`,
            true, 'encounterController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, billWarning });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── POST /encounters/:nr/discharge ────────────────────────────────
exports.discharge = async (req, res) => {
    try {
        const encNr = parseInt(req.params.nr, 10);
        const actor = fullName(req.user);
        const enc   = await care_encounter.findByPk(encNr);
        if (!enc) return res.status(404).json({ ok: false, error: 'Not found' });
        if (!hasEncounterFacilityAccess(req, enc)) {
            return res.status(403).json({ ok: false, error: 'This encounter belongs to a different facility.' });
        }

        // Warn if open bills exist (non-blocking — discharge still proceeds)
        let billWarning = null;
        const openBill = await care_billing_bill.findOne({
            where: { encounter_nr: encNr, status: { [Op.in]: ['open','partial'] } },
        });
        if (openBill) {
            const unpaidCount = await care_billing_bill_item.count({
                where: { bill_no: openBill.bill_no, status: 'open' },
            });
            if (unpaidCount > 0) {
                billWarning = 'Bill #' + openBill.bill_no + ' has ' + unpaidCount +
                              ' unpaid item(s).';
            }
        }

        await enc.update({
            encounter_status: 'closed',
            status:           'closed',
            is_discharged:    1,
            discharge_date:   new Date(),
            modify_id:        actor,
            modify_time:      new Date(),
            history: (enc.history || '') +
                `\n[${new Date().toISOString()}] Discharged by ${actor}`,
        });
        await logActivity(req, `Encounter #${encNr} discharged by ${actor}`,
            true, 'encounterController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, billWarning });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── POST /encounters/:nr/transfer ─────────────────────────────────
exports.transfer = async (req, res) => {
    try {
        const encNr  = parseInt(req.params.nr, 10);
        const actor  = fullName(req.user);
        const { dept_nr } = req.body;
        const enc    = await care_encounter.findByPk(encNr);
        if (!enc) return res.status(404).json({ ok: false, error: 'Not found' });
        if (!hasEncounterFacilityAccess(req, enc)) {
            return res.status(403).json({ ok: false, error: 'This encounter belongs to a different facility.' });
        }

        await enc.update({
            current_dept_nr: dept_nr || enc.current_dept_nr,
            modify_id:       actor,
            modify_time:     new Date(),
            history: (enc.history || '') +
                `\n[${new Date().toISOString()}] Transferred to dept ${dept_nr} by ${actor}`,
        });
        await logActivity(req, `Encounter #${encNr} transferred to dept ${dept_nr} by ${actor}`,
            true, 'encounterController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── POST /encounters/:nr/admit-inpatient ──────────────────────────
exports.admitInpatient = async (req, res) => {
    try {
        const encNr = parseInt(req.params.nr, 10);
        const actor = fullName(req.user);
        const { ward_nr, room_nr } = req.body;
        const enc = await care_encounter.findByPk(encNr);
        if (!enc) return res.status(404).json({ ok: false, error: 'Not found' });
        if (!hasEncounterFacilityAccess(req, enc)) {
            return res.status(403).json({ ok: false, error: 'This encounter belongs to a different facility.' });
        }

        await enc.update({
            encounter_class_nr: 2,
            current_ward_nr:    ward_nr || 0,
            current_room_nr:    room_nr || 0,
            in_ward:            1,
            modify_id:          actor,
            modify_time:        new Date(),
            history: (enc.history || '') +
                `\n[${new Date().toISOString()}] Admitted inpatient ward:${ward_nr} room:${room_nr} by ${actor}`,
        });
        await logActivity(req, `Encounter #${encNr} admitted inpatient by ${actor}`,
            true, 'encounterController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── GET /encounters/:nr/vitals-json ───────────────────────────────
// Returns vitals for a specific encounter
exports.vitalsJson = async (req, res) => {
    try {
        const encNr = parseInt(req.params.nr, 10);
        const vitals = await care_encounter_measurement.findAll({
            where: { encounter_nr: encNr },
            order: [['msr_date', 'DESC'], ['msr_time', 'DESC']],
        });
        res.json({ ok: true, vitals });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── POST /encounters/:nr/vitals ───────────────────────────────────
// Save one or more vital sign measurements at once. Accepts
// { vitals: [{ msr_type_nr, value }, ...] } — the comprehensive vitals
// form sends only the fields the user actually filled in, so this can be
// anywhere from 1 to 10 entries per call.
//
// Type reference: 1 temperature, 2 systolic BP, 3 pulse, 4 SpO2, 5 weight,
// 6 height, 7 respiratory rate, 8 blood sugar, 9 diastolic BP, 10 pain
// score. (2 previously meant a combined "Blood Pressure" reading stored as
// a single string like "120/80" — it's now Systolic specifically, split
// from Diastolic (new type 9) for proper independent reporting. Existing
// historical rows with msr_type_nr=2 predating this change may still hold
// combined "systolic/diastolic" strings rather than a systolic-only
// number — worth a one-time look at existing data before trusting type 2
// as purely numeric in any reporting built on top of this.)
const VITALS_RANGE = {
    1:  { min: 30,  max: 45,  label: 'temperature' },
    2:  { min: 40,  max: 260, label: 'systolic BP' },
    3:  { min: 20,  max: 250, label: 'pulse' },
    4:  { min: 0,   max: 100, label: 'SpO2' },
    5:  { min: 0.5, max: 300, label: 'weight' },
    6:  { min: 20,  max: 250, label: 'height' },
    7:  { min: 4,   max: 60,  label: 'respiratory rate' },
    8:  { min: 0.1, max: 10,  label: 'blood sugar' },
    9:  { min: 20,  max: 160, label: 'diastolic BP' },
    10: { min: 0,   max: 10,  label: 'pain score' },
};

exports.saveVital = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        // Confirmed 2026-08-07: recording vitals is medical work. No
        // dedicated "vitals" permission exists in the current role
        // schema, so this reuses MedicalRecord.Create.Note — held by
        // both Doctor and Nurse, correctly excludes every non-medical
        // role including Billing Clerk. Previously enforced only by
        // hiding the button client-side, no server-side check at all.
        if (!req.user.permissions.includes('MedicalRecord.Create.Note') &&
            !req.user.permissions.includes('Admin.FullAccess')) {
            await t.rollback();
            return res.status(403).json({ ok: false, error: 'Permission denied.' });
        }

        const encNr = parseInt(req.params.nr, 10);
        const actor = fullName(req.user);
        const vitals = Array.isArray(req.body.vitals) ? req.body.vitals : [];

        const encounter = await care_encounter.findByPk(encNr, { transaction: t });
        if (!encounter) {
            await t.rollback();
            return res.status(404).json({ ok: false, error: 'Encounter not found.' });
        }
        if (!hasEncounterFacilityAccess(req, encounter)) {
            await t.rollback();
            return res.status(403).json({ ok: false, error: 'This encounter belongs to a different facility.' });
        }

        if (vitals.length === 0) {
            await t.rollback();
            return res.status(400).json({ ok: false, error: 'At least one vital value is required.' });
        }

        // Validate every entry before writing any of them — an all-or-nothing
        // batch rather than silently skipping the bad ones.
        for (const v of vitals) {
            const typeNr = parseInt(v.msr_type_nr, 10);
            const range = VITALS_RANGE[typeNr];
            const val = parseFloat(v.value);
            if (!range) {
                await t.rollback();
                return res.status(400).json({ ok: false, error: `Unknown vital type: ${v.msr_type_nr}` });
            }
            if (isNaN(val) || val < range.min || val > range.max) {
                await t.rollback();
                return res.status(400).json({
                    ok: false,
                    error: `${range.label} value out of expected range (${range.min}-${range.max}).`,
                });
            }
        }

        const now  = new Date();
        const pad  = n => String(n).padStart(2, '0');
        const dateStr = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate());
        const timeStr = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':00';

        const created = [];
        for (const v of vitals) {
            const typeNr = parseInt(v.msr_type_nr, 10);
            const row = await care_encounter_measurement.create({
                encounter_nr: encNr,
                facility_id:  encounter.facility_id,
                msr_type_nr:  typeNr,
                value:        String(v.value).trim(),
                notes:        '',
                measured_by:  actor,
                msr_date:     dateStr,
                msr_time:     timeStr,
                status:       'active',
                history:      `[${now.toISOString()}] Recorded by ${actor}`,
                modify_id:    actor,
                modify_time:  now,
                create_id:    actor,
                create_time:  now,
                unit_nr:      0,
                unit_type_nr: 0,
            }, { transaction: t });
            created.push(row);
        }

        await t.commit();
        await logActivity(req,
            `Recorded ${created.length} vital(s) for encounter #${encNr} by ${actor}`,
            true, 'encounterController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, vitals: created });
    } catch (err) {
        await t.rollback();
        console.error('Save vital error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── GET /encounters/:nr/notes-json ────────────────────────────────
exports.notesJson = async (req, res) => {
    try {
        const encNr = parseInt(req.params.nr, 10);
        const notes = await care_encounter_notes.findAll({
            where: { encounter_nr: encNr },
            order: [['date', 'DESC']],
        });
        res.json({ ok: true, notes });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── POST /encounters/:nr/notes ────────────────────────────────────
// Save a clinical note
exports.saveNote = async (req, res) => {
    try {
        if (!req.user.permissions.includes('MedicalRecord.Create.Note') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const encNr  = parseInt(req.params.nr, 10);
        const actor  = fullName(req.user);
        const staffNr = req.user?.staff_nr || 0;
        const { notes, short_notes } = req.body;

        if (!notes || !notes.trim()) {
            return res.status(400).json({ ok: false, error: 'Note text required.' });
        }

        const encounter = await care_encounter.findByPk(encNr);
        if (!encounter) {
            return res.status(404).json({ ok: false, error: 'Encounter not found.' });
        }
        if (!hasEncounterFacilityAccess(req, encounter)) {
            return res.status(403).json({ ok: false, error: 'This encounter belongs to a different facility.' });
        }

        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const dateStr = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate());
        const timeStr = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':00';

        const note = await care_encounter_notes.create({
            encounter_nr:     encNr,
            facility_id:      encounter.facility_id,
            type_nr:          1,  // 1 = clinical note
            notes:            notes.trim(),
            short_notes:      short_notes || '',
            aux_notes:        '',
            ref_notes_nr:     0,
            staff_nr:         staffNr,
            staff_name:       actor,
            date:             dateStr,
            time:             timeStr,
            location_type:    'encounter',
            location_type_nr: 1,
            location_nr:      encNr,
            location_id:      '',
            ack_short_id:     '',
            send_by_mail:     0,
            send_by_email:    0,
            send_by_fax:      0,
            status:           'active',
            history:          `[${now.toISOString()}] Created by ${actor}`,
            modify_id:        actor,
            modify_time:      now,
            create_id:        actor,
            create_time:      now,
        });

        await logActivity(req,
            `Clinical note added to encounter #${encNr} by ${actor}`,
            true, 'encounterController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, note });
    } catch (err) {
        console.error('Save note error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── GET /encounters/:nr/diagnoses-json ────────────────────────────
exports.diagnosesJson = async (req, res) => {
    try {
        const encNr = parseInt(req.params.nr, 10);
        const dx = await care_encounter_diagnosis.findAll({
            where: { encounter_nr: encNr },
            order: [['date', 'DESC']],
        });
        res.json({ ok: true, diagnoses: dx });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── POST /encounters/:nr/diagnoses ────────────────────────────────
// Save one or more diagnoses for an encounter
// Body: { diagnoses: [ { code, localcode, type } ] }
exports.saveDiagnoses = async (req, res) => {
    try {
        if (!req.user.permissions.includes('MedicalRecord.Create.Diagnosis') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const encNr    = parseInt(req.params.nr, 10);
        const actor    = fullName(req.user);
        const deptNr   = req.user?.dept_nr || 0;
        const { diagnoses } = req.body;

        if (!diagnoses || !Array.isArray(diagnoses) || diagnoses.length === 0) {
            return res.status(400).json({ ok: false, error: 'No diagnoses provided.' });
        }

        const enc = await care_encounter.findByPk(encNr);
        if (!enc) return res.status(404).json({ ok: false, error: 'Encounter not found.' });
        if (!hasEncounterFacilityAccess(req, enc)) {
            return res.status(403).json({ ok: false, error: 'This encounter belongs to a different facility.' });
        }

        const now     = new Date();
        const created = [];

        for (const dx of diagnoses) {
            if (!dx.code) continue;

            // Lookup parent code from CIM10 table
            const cim = await care_diagnostics_cim10.findOne({
                where:      { code: dx.code },
                attributes: ['code', 'parent_code', 'libelle_court'],
            });

            const row = await care_encounter_diagnosis.create({
                encounter_nr:         encNr,
                facility_id:          enc.facility_id,
                op_nr:                0,
                date:                 now,
                code:                 dx.code,
                code_parent:          cim ? (cim.parent_code || '') : '',
                group_nr:             0,
                code_version:         2025,
                localcode:            dx.localcode || (cim ? cim.libelle_court : dx.code),
                category_nr:          0,
                type:                 dx.type || 'main',
                localization:         '',
                diagnosing_clinician: actor,
                diagnosing_dept_nr:   deptNr,
                status:               'active',
                history:              `[${now.toISOString()}] Added by ${actor}`,
                modify_id:            actor,
                modify_time:          now,
                create_id:            actor,
                create_time:          now,
            });
            created.push(row);
        }

        await logActivity(req,
            `${created.length} diagnosis(es) added to Enc#${encNr} by ${actor}`,
            true, 'encounterController.js', req.user.user_id, req.user.username);

        res.json({ ok: true, created });
    } catch (err) {
        console.error('Save diagnoses error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── DELETE /encounters/diagnoses/:dx_nr ───────────────────────────
exports.deleteDiagnosis = async (req, res) => {
    try {
        if (!req.user.permissions.includes('MedicalRecord.Create.Diagnosis') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const dxNr = parseInt(req.params.dx_nr, 10);
        const actor = fullName(req.user);
        const dx = await care_encounter_diagnosis.findByPk(dxNr);
        if (!dx) return res.status(404).json({ ok: false, error: 'Not found.' });
        if (!hasEncounterFacilityAccess(req, dx)) {
            return res.status(403).json({ ok: false, error: 'This encounter belongs to a different facility.' });
        }
        const dxCode = dx.code;
        await dx.destroy();
        await logActivity(req,
            `Diagnosis ${dxCode} (#${dxNr}) deleted by ${actor}`,
            true, 'encounterController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── GET /encounters/cim10/search ─────────────────────────────────
// Search CIM10 — terminal codes only — JSON
exports.cim10Search = async (req, res) => {
    try {
        const q      = (req.query.q || '').trim();
        const locale = req.locale || 'en';
        if (q.length < 2) return res.json({ ok: true, results: [] });

        const results = await care_diagnostics_cim10.findAll({
            where: {
                est_terminal: 1,
                [Op.or]: [
                    { code:          { [Op.like]: q + '%' } },
                    { libelle_court: { [Op.like]: '%' + q + '%' } },
                    { libelle_long:  { [Op.like]: '%' + q + '%' } },
                ],
            },
            attributes: ['id', 'code', 'libelle_court', 'libelle_long', 'parent_code'],
            order:      [['code', 'ASC']],
            limit:      20,
        });

        res.json({ ok: true, results: results.map(r => ({
            id:          r.id,
            code:        r.code,
            label:       r.libelle_court,
            label_long:  r.libelle_long || r.libelle_court,
            parent_code: r.parent_code,
        })) });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};








