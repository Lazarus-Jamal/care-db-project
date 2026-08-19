
// controllers/patientController.js
'use strict';
const { countries }   = require('countries-list');
const { Op, fn, col, where: seqWhere } = require('sequelize');
const {
    care_person, care_tribes,
    care_encounter, care_encounter_prescription,
    care_encounter_diagnosis, care_encounter_measurement,
    care_encounter_notes,
    care_billing_bill, care_billing_bill_item, care_billing_bill_final,
    care_department, care_facilities,
    care_patient_referral,
} = require('../models');
const logActivity = require('../utils/activityLogger');

const PATIENTS_PER_PAGE = 20;

const getCountriesList = () =>
    Object.keys(countries)
        .sort((a, b) => countries[a].name.localeCompare(countries[b].name))
        .map(code => ({ name: countries[code].name, phone_code: countries[code].phone }));

exports.getCountriesList = getCountriesList;

const nullIfEmpty = (val) =>
    (val === '' || val === undefined || val === null) ? null : val;

const intOrNull = (val) => {
    if (val === '' || val === undefined || val === null) return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
};

// ── GET /patients/list ────────────────────────────────────────
exports.listPatients = async (req, res) => {
    try {
        const search    = (req.query.search    || '').trim();
        const sex       = (req.query.sex       || '').trim();
        const date_from = (req.query.date_from || '').trim();
        const date_to   = (req.query.date_to   || '').trim();
        const page      = Math.max(1, parseInt(req.query.page) || 1);

        const where = {};

        if (search) {
            const parts = search.split(/\s+/).filter(Boolean);
            if (parts.length >= 2) {
                const w1 = parts[0], w2 = parts[1];
                where[Op.or] = [
                    { [Op.and]: [{ name_last: { [Op.like]: '%' + w1 + '%' } }, { name_first: { [Op.like]: '%' + w2 + '%' } }] },
                    { [Op.and]: [{ name_first: { [Op.like]: '%' + w1 + '%' } }, { name_last: { [Op.like]: '%' + w2 + '%' } }] },
                    { hospital_file_nr: { [Op.like]: '%' + search + '%' } },
                ];
            } else {
                where[Op.or] = [
                    { name_last:        { [Op.like]: '%' + search + '%' } },
                    { name_first:       { [Op.like]: '%' + search + '%' } },
                    { hospital_file_nr: { [Op.like]: '%' + search + '%' } },
                ];
            }
        }

        if (sex === 'm' || sex === 'f') where.sex = sex;

        if (date_from || date_to) {
            where.date_reg = {};
            if (date_from) where.date_reg[Op.gte] = new Date(date_from);
            if (date_to) {
                const end = new Date(date_to);
                end.setHours(23, 59, 59, 999);
                where.date_reg[Op.lte] = end;
            }
        }

        const { count, rows: patients } = await care_person.findAndCountAll({
            where,
            attributes: [
                'pid', 'hospital_file_nr', 'name_last', 'name_first',
                'sex', 'date_birth', 'cellphone_1_nr', 'phone_1_nr',
                'addr_citytown_nr', 'date_reg', 'status',
            ],
            order:  [['name_last', 'ASC'], ['name_first', 'ASC']],
            limit:  PATIENTS_PER_PAGE,
            offset: (page - 1) * PATIENTS_PER_PAGE,
        });

        // Fetch open encounters for all patients on this page in one query
        const patientPids = patients.map(p => p.pid);
        const openEncounters = patientPids.length ? await care_encounter.findAll({
            where: {
                pid:              { [Op.in]: patientPids },
                is_discharged:    0,
                encounter_status: { [Op.in]: ['pending', 'active'] },
            },
            attributes: ['encounter_nr', 'pid', 'encounter_status', 'facility_id'],
            include: [{ model: care_facilities, as: 'facility', attributes: ['id', 'name'] }],
        }) : [];
        // Build a Set of pids that have an open encounter for O(1) lookup in EJS
        const openEncounterPids = new Set(openEncounters.map(e => e.pid));
        // Build pid -> {encounter_nr, encounter_status, facility_id, facility_name,
        // isOwnFacility} so the view can distinguish "your facility's open
        // encounter" from "another facility's" (Multi-Facility Phase 2, §5
        // item 8). System Administrators have no specific facility in
        // session (facility: null, confirmed exempt per §5 item 9) — for
        // them every open encounter reads as "own facility" since there's
        // nothing to compare against and they see everything regardless.
        const currentFacilityId = req.user.isFacilityExempt ? null : req.user.facility.id;
        const openEncounterByPid = {};
        openEncounters.forEach(e => {
            const existing = openEncounterByPid[e.pid];
            if (!existing || (existing.encounter_status !== 'active' && e.encounter_status === 'active')) {
                openEncounterByPid[e.pid] = {
                    encounter_nr: e.encounter_nr,
                    encounter_status: e.encounter_status,
                    facility_id: e.facility_id,
                    facility_name: e.facility ? e.facility.name : 'Unknown Facility',
                    isOwnFacility: currentFacilityId === null || e.facility_id === currentFacilityId,
                };
            }
        });

        // Open referrals for all patients on this page, same one-query
        // batch pattern as openEncounters above -- drives the "Referred"
        // badge (item 4 from the live-testing feedback: no visual
        // indicator existed at all before this).
        const openReferrals = patientPids.length ? await care_patient_referral.findAll({
            where: { pid: { [Op.in]: patientPids }, status: { [Op.in]: ['sent', 'accepted', 'seen'] } },
            include: [{ model: care_facilities, as: 'toFacility', attributes: ['id', 'name'] }],
        }) : [];
        const referralByPid = {};
        openReferrals.forEach(r => {
            referralByPid[r.pid] = {
                status: r.status,
                toFacilityName: r.toFacility ? r.toFacility.name : 'Unknown Facility',
            };
        });

        res.render('patients/list', {
            title:      req.t.patientList.title,
            patients, search, sex, date_from, date_to,
            currentPage:  page,
            totalPages:   Math.ceil(count / PATIENTS_PER_PAGE),
            totalCount:   count,
            activePage:   'patients',
            user:         req.user,
            csrfToken:    req.csrfToken(),
            openEncounterPids: Array.from(openEncounterPids),
            openEncounterByPid,
            referralByPid,
        });

    } catch (error) {
        console.error('Error fetching patient list:', error);
        res.status(500).send('Error loading patient list.');
    }
};

// ── GET /patients/create ──────────────────────────────────────
exports.createPatientForm = async (req, res) => {
    try {
        const tribes = await care_tribes.findAll({ order: [['tribe_name', 'ASC']] });
        res.render('patients/createPatient', {
            title:      req.t.patients.createTitle,
            user:       req.user,
            errors:     [],
            success:    req.query.success === '1',
            admitted:   req.query.admitted === '1',
            activePage: 'patients/create',
            csrfToken:  req.csrfToken(),
            countries:  getCountriesList(),
            tribes,
        });
    } catch (error) {
        console.error('Error rendering patient form:', error);
        res.status(500).send('Internal Server Error');
    }
};

// ── POST /patients/check-duplicate ────────────────────────────
// Multi-Facility Phase 1 (§2.6 of the implementation plan) — with
// registration now shared across facilities, the odds of the same person
// being registered twice under a slightly different spelling goes up. This
// is an advisory-only lookup: it never blocks registration, it just gives
// the registration form something to warn about before the record is
// created. Match logic: exact date of birth (a strong, low-noise anchor)
// combined with a phonetic match (MySQL's built-in SOUNDEX) on either the
// last or first name, so "Mohammed"/"Muhamed"-style spelling variants are
// still caught without requiring an exact string match.
exports.checkDuplicate = async (req, res) => {
    try {
        const nameLast  = (req.body.name_last  || '').trim();
        const nameFirst = (req.body.name_first || '').trim();
        const dateBirth = (req.body.date_birth || '').trim();

        if (!nameLast || !nameFirst || !dateBirth) {
            return res.json({ matches: [] });
        }

        const matches = await care_person.findAll({
            where: {
                status: 'active',
                date_birth: new Date(dateBirth),
                [Op.or]: [
                    seqWhere(fn('SOUNDEX', col('name_last')),  fn('SOUNDEX', nameLast)),
                    seqWhere(fn('SOUNDEX', col('name_first')), fn('SOUNDEX', nameFirst)),
                ],
            },
            attributes: ['pid', 'name_first', 'name_last', 'date_birth', 'sex', 'hospital_file_nr'],
            limit: 5,
        });

        res.json({
            matches: matches.map(m => ({
                pid:              m.pid,
                name_first:       m.name_first,
                name_last:        m.name_last,
                sex:              m.sex,
                hospital_file_nr: m.hospital_file_nr,
            })),
        });
    } catch (error) {
        console.error('Error in checkDuplicate:', error);
        // Advisory-only endpoint — fail quietly rather than surface an error
        // that could be mistaken for a registration problem.
        res.json({ matches: [] });
    }
};

// ── POST /patients/create ─────────────────────────────────────
exports.createPatient = async (req, res) => {
    const createdBy = req.user.username;
    const createdId = req.user.user_id;
    const logSource = 'patientController.js';
    const getFormData = async () => ({
        countries: getCountriesList(),
        tribes:    await care_tribes.findAll({ order: [['tribe_name', 'ASC']] }),
    });

    try {
        const b = req.body;
        if (!b.name_last || !b.name_first || !b.date_birth || !b.sex || !b.citizenship) {
            const errors = [req.locale === 'fr'
                ? 'Nom, prénom, date de naissance et nationalité sont obligatoires.'
                : 'Last name, first name, date of birth and nationality are required.'];
            await logActivity(req, 'Patient registration failed: missing required fields.',
                false, logSource, createdId, createdBy);
            const fd = await getFormData();
            return res.render('patients/createPatient', {
                title: req.t.patients.createTitle, user: req.user,
                errors, success: null, activePage: 'patients/create',
                csrfToken: req.csrfToken(), ...fd,
            });
        }

        const newPatient = await care_person.create({
            hospital_file_nr: 'HFN-' + Date.now(),
            date_reg:         new Date(),
            name_last:        b.name_last.trim(),
            name_first:       b.name_first.trim(),
            name_maiden:      nullIfEmpty(b.name_maiden),
            date_birth:       new Date(b.date_birth),
            title:            nullIfEmpty(b.profession),
            sex:              b.sex,
            blood_group:      (nullIfEmpty(b.blood_group) || 'A') + (nullIfEmpty(b.rhesus) || '+'),
            civil_status:     nullIfEmpty(b.civil_status),
            addr_str:         nullIfEmpty(b.addr_str),
            addr_zip:         nullIfEmpty(b.addr_zip),
            citizenship:      nullIfEmpty(b.citizenship),
            phone_1_code:     nullIfEmpty(b.phone_1_code),
            phone_2_code:     nullIfEmpty(b.phone_2_code),
            cellphone_1_nr:   nullIfEmpty(b.cellphone_1_nr),
            cellphone_2_nr:   nullIfEmpty(b.cellphone_2_nr),
            email:            nullIfEmpty(b.email),
            ethnic_orig:      intOrNull(b.ethnic_orig),
            nat_id_nr:        nullIfEmpty(b.nat_id_nr),
            religion:         nullIfEmpty(b.religion),
            contact_person:   nullIfEmpty(b.contact_person),
            contact_relation: nullIfEmpty(b.contact_relation),
            relative_phone:   nullIfEmpty(b.relative_phone),
            photo_filename:   req.file ? req.file.filename : null,
            create_id:        createdId,
            create_time:      new Date(),
            status:           'active',
        });

        await logActivity(req,
            'New patient registered: ' + b.name_first + ' ' + b.name_last + ' (PID: ' + newPatient.pid + ')',
            true, logSource, createdId, createdBy);
        res.redirect('/patients/' + newPatient.pid + '/admit?new=1');

    } catch (error) {
        console.error('Error creating patient:', error);
        await logActivity(req, 'Patient registration error: ' + error.message,
            false, logSource, createdId, createdBy);
        const fd = await getFormData();
        res.render('patients/createPatient', {
            title: req.t.patients.createTitle, user: req.user,
            errors: [req.locale === 'fr'
                ? 'Une erreur est survenue lors de l\'enregistrement.'
                : 'An error occurred during registration.'],
            success: null, activePage: 'patients/create',
            csrfToken: req.csrfToken(), ...fd,
        });
    }
};

// ── GET /patients/:pid/record ─────────────────────────────────
exports.getPatientRecord = async (req, res) => {
    try {
        const pid = parseInt(req.params.pid, 10);
        if (isNaN(pid)) return res.status(400).send('Invalid patient ID.');

        // Patient + tribe name
        const patient = await care_person.findByPk(pid, {
            include: [{
                model:      care_tribes,
                as:         'tribe',
                required:   false,
                attributes: ['tribe_id', 'tribe_name'],
            }],
        });

        if (!patient) return res.status(404).send(
            req.locale === 'fr' ? 'Dossier patient introuvable.' : 'Patient not found.'
        );

        // All encounters, most recent first, with department + prescriptions + diagnoses
        const encounters = await care_encounter.findAll({
            where:   { pid },
            order:   [['encounter_date', 'DESC']],
            include: [
                {
                    model:      care_facilities,
                    as:         'facility',
                    required:   false,
                    attributes: ['id', 'name'],
                },
                {
                    model:      care_department,
                    as:         'department',
                    required:   false,
                    attributes: ['nr', 'name_short', 'name_formal'],
                },
                {
                    model:      care_encounter_prescription,
                    as:         'prescriptions',
                    required:   false,
                    attributes: [
                        'nr', 'encounter_nr', 'article', 'drug_class',
                        'dosage', 'application_type_nr', 'prescriber',
                        'prescribe_date', 'is_stopped', 'stop_date',
                        'status', 'notes', 'price', 'bill_number',
                        'bill_status', 'bon', 'livrer',
                        'is_outpatient_prescription',
                    ],
                },
                {
                    model:      care_encounter_diagnosis,
                    as:         'diagnoses',
                    required:   false,
                    attributes: [
                        'diagnosis_nr', 'code', 'localcode', 'type',
                        'diagnosing_clinician', 'date', 'status',
                    ],
                },
            ],
            limit: 25,
        });

        // Calculate age
        let age = null;
        if (patient.date_birth) {
            const today = new Date();
            const dob   = new Date(patient.date_birth);
            age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        }

        const encounterNrs = encounters.map(e => Number(e.encounter_nr));

        // Vitals — latest measurements across recent encounters
        const measurements = encounterNrs.length ? await care_encounter_measurement.findAll({
            where: { encounter_nr: { [Op.in]: encounterNrs.slice(0, 5) } },
            order: [['msr_date', 'DESC'], ['msr_time', 'DESC']],
            limit: 30,
        }) : [];

        // Clinical notes — keyed by encounter_nr for display in encounter cards
        const notesRaw = encounterNrs.length ? await care_encounter_notes.findAll({
            where: { encounter_nr: { [Op.in]: encounterNrs } },
            order: [['date', 'DESC']],
            limit: 100,
        }) : [];
        // Build map: { enc_nr: [note, ...] }
        const notesByEnc = {};
        notesRaw.forEach(n => {
            const key = Number(n.encounter_nr);
            if (!notesByEnc[key]) notesByEnc[key] = [];
            notesByEnc[key].push(n);
        });
        // Keep flat array too for backward compat
        const notes = notesRaw;

        // Billing — bills, items, and finals. Now facility-scoped: per the
        // confirmed clinical-only cross-facility rule (plan §5 item 2),
        // billing has no cross-facility exception at all, unlike clinical
        // data. This used to be handled by hiding the entire Billing tab
        // whenever the patient's open encounter belonged to another
        // facility (a workaround, since billing itself had no facility_id
        // yet to filter on precisely). Now that it does, this filters the
        // actual bill data directly — so a patient with bills from both
        // their own facility (history) and another facility's current
        // open encounter correctly shows only their own facility's bills,
        // rather than hiding the whole tab because of one encounter.
        const billFacilityFilter = !req.user.isFacilityExempt ? { facility_id: req.user.facility.id } : {};

        const bills = encounterNrs.length ? await care_billing_bill.findAll({
            where: { encounter_nr: { [Op.in]: encounterNrs }, ...billFacilityFilter },
            order: [['date', 'DESC']],
            limit: 50,
        }) : [];

        const billNrs = bills.map(b => b.bill_no);

        const billItems = billNrs.length ? await care_billing_bill_item.findAll({
            where: { bill_no: { [Op.in]: billNrs }, ...billFacilityFilter },
            order: [['bill_no', 'ASC'], ['id', 'ASC']],
        }) : [];

        const billFinals = encounterNrs.length ? await care_billing_bill_final.findAll({
            where: { encounter_nr: { [Op.in]: encounterNrs }, ...billFacilityFilter },
            order: [['date', 'DESC']],
            limit: 50,
        }) : [];

        // Build prxByEnc map: { encounter_nr: { enc, items[] } }
        const prxByEnc = {};
        encounters.forEach(function(enc) {
            if (enc.prescriptions && enc.prescriptions.length > 0) {
                prxByEnc[enc.encounter_nr] = {
                    enc:   enc,
                    items: enc.prescriptions,
                };
            }
        });

        await logActivity(req,
            'Viewed patient record PID:' + pid,
            true, 'patientController.js', req.user.user_id, req.user.username);

        // Facility list for the new "Refer to another facility" modal --
        // the current facility is excluded client-side in the view
        // (referring a patient to their own current facility is
        // meaningless, already guarded server-side in referralController.js).
        const allFacilities = await care_facilities.findAll({
            attributes: ['id', 'name'],
            order: [['name', 'ASC']],
        });

        // Open referral, if any -- drives the visual indicator on this
        // page and the Refer button's disabled state (matches
        // referralController.js's own duplicate-referral block; this is
        // the same check, just surfaced to the UI so staff see it before
        // attempting to submit rather than only after a rejected request).
        const openReferral = await care_patient_referral.findOne({
            where: { pid, status: { [Op.in]: ['sent', 'accepted', 'seen'] } },
            include: [{ model: care_facilities, as: 'toFacility', attributes: ['id', 'name'] }],
        });

        // Full referral history (every status, not just open ones) --
        // confirmed with the project owner: visible from either facility
        // involved, matching the existing cross-facility clinical-
        // visibility rule (a referral inherently involves two
        // facilities, so it follows the same "clinical detail is not
        // facility-scoped" principle as diagnoses/notes). Deliberately
        // NOT filtered by req.user.facility.id -- unlike almost every
        // other query in this controller, this one is intentionally
        // unscoped. Gated in the view by MedicalRecord.Read.ClinicalData,
        // the same permission that already hides Vitals/Diagnoses/Notes
        // for non-clinical roles (§4 fix 41) -- referral reasons/notes
        // are clinically sensitive the same way.
        const referralHistory = await care_patient_referral.findAll({
            where: { pid },
            include: [
                { model: care_facilities, as: 'fromFacility', attributes: ['id', 'name'] },
                { model: care_facilities, as: 'toFacility', attributes: ['id', 'name'] },
            ],
            order: [['created_at', 'DESC']],
        });

        res.render('patients/record', {
            title:      patient.name_first + ' ' + patient.name_last,
            activePage: 'patients',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            patient,
            age,
            encounters,
            prxByEnc,
            measurements,
            notes,
            notesByEnc,
            bills,
            billItems,
            billFinals,
            currentFacilityId: req.user.isFacilityExempt ? null : req.user.facility.id,
            allFacilities,
            openReferral,
            referralHistory,
            success:    req.query.success === '1',
            admitted:   req.query.admitted === '1',
        });

    } catch (error) {
        console.error('Error loading patient record:', error);
        res.status(500).send('Error loading patient record: ' + error.message);
    }
};

// ── GET /patients/:pid/edit ───────────────────────────────────
exports.editPatientForm = async (req, res) => {
    try {
        const pid = parseInt(req.params.pid, 10);
        const patient = await care_person.findByPk(pid);
        if (!patient) return res.status(404).send('Patient not found.');
        const tribes = await care_tribes.findAll({ order: [['tribe_name', 'ASC']] });
        res.render('patients/editPatient', {
            title:      req.locale === 'fr' ? 'Modifier le Dossier' : 'Edit Patient Record',
            user:       req.user,
            activePage: 'patients',
            csrfToken:  req.csrfToken(),
            patient,
            tribes,
            countries:  getCountriesList(),
            errors:     [],
            success:    req.query.success === '1',
            admitted:   req.query.admitted === '1',
        });
    } catch (error) {
        console.error('Error loading edit form:', error);
        res.status(500).send('Internal Server Error');
    }
};

// ── POST /patients/:pid/edit ──────────────────────────────────
exports.updatePatient = async (req, res) => {
    const pid       = parseInt(req.params.pid, 10);
    const createdBy = req.user.username;
    const createdId = req.user.user_id;

    const getFormData = async () => ({
        countries: getCountriesList(),
        tribes:    await care_tribes.findAll({ order: [['tribe_name', 'ASC']] }),
    });

    try {
        const patient = await care_person.findByPk(pid);
        if (!patient) return res.status(404).send('Patient not found.');

        const b = req.body;
        if (!b.name_last || !b.name_first || !b.date_birth || !b.sex || !b.citizenship) {
            const fd = await getFormData();
            return res.render('patients/editPatient', {
                title: req.locale === 'fr' ? 'Modifier le Dossier' : 'Edit Patient Record',
                user: req.user, activePage: 'patients',
                csrfToken: req.csrfToken(),
                patient, errors: [req.locale === 'fr'
                    ? 'Nom, prénom, date de naissance et nationalité sont obligatoires.'
                    : 'Required fields missing.'],
                success: false, ...fd,
            });
        }

        const updates = {
            name_last:        b.name_last.trim(),
            name_first:       b.name_first.trim(),
            name_maiden:      nullIfEmpty(b.name_maiden),
            date_birth:       new Date(b.date_birth),
            title:            nullIfEmpty(b.profession),
            sex:              b.sex,
            blood_group:      (nullIfEmpty(b.blood_group) || 'A') + (nullIfEmpty(b.rhesus) || '+'),
            civil_status:     nullIfEmpty(b.civil_status),
            citizenship:      nullIfEmpty(b.citizenship),
            nat_id_nr:        nullIfEmpty(b.nat_id_nr),
            religion:         nullIfEmpty(b.religion),
            ethnic_orig:      intOrNull(b.ethnic_orig),
            email:            nullIfEmpty(b.email),
            addr_str:         nullIfEmpty(b.addr_str),
            cellphone_1_nr:   nullIfEmpty(b.cellphone_1_nr),
            cellphone_2_nr:   nullIfEmpty(b.cellphone_2_nr),
            contact_person:   nullIfEmpty(b.contact_person),
            contact_relation: nullIfEmpty(b.contact_relation),
            relative_phone:   nullIfEmpty(b.relative_phone),
            modify_id:        createdId,
            modify_time:      new Date(),
        };
        if (req.file) updates.photo_filename = req.file.filename;

        await patient.update(updates);
        await logActivity(req, 'Patient updated PID:' + pid,
            true, 'patientController.js', createdId, createdBy);

        res.redirect('/patients/' + pid + '/record?success=1');

    } catch (error) {
        console.error('Error updating patient:', error);
        const fd = await getFormData();
        const patient = await care_person.findByPk(pid);
        res.render('patients/editPatient', {
            title: req.locale === 'fr' ? 'Modifier le Dossier' : 'Edit Patient Record',
            user: req.user, activePage: 'patients',
            csrfToken: req.csrfToken(),
            patient, errors: [error.message], success: false, ...fd,
        });
    }
};

// ── GET /patients/prescriptions/add/:pid ─────────────────────
// Legacy route, no longer linked from the UI (see patients/list.ejs) —
// this used to render a freetext prescription form that posted to a
// no-op handler and silently discarded everything. Kept only as a safety
// net in case something still links here directly: redirect to the real,
// billing-integrated prescribing flow when possible.
exports.createPrescriptionForm = async (req, res) => {
    try {
        const pid = parseInt(req.params.pid, 10);
        const patient = await care_person.findByPk(pid);
        if (!patient) return res.status(404).send('Patient not found.');

        const openEnc = await care_encounter.findOne({
            where: { pid, is_discharged: 0, encounter_status: { [Op.in]: ['pending', 'active'] } },
            order: [['encounter_date', 'DESC']],
        });
        if (openEnc && openEnc.encounter_status === 'active') {
            return res.redirect('/prescriptions/encounter/' + openEnc.encounter_nr);
        }
        return res.redirect('/patients/' + pid + '/record');
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
};

exports.addPrescription = async (req, res) => {
    const pid = parseInt(req.body.pid, 10);
    res.redirect(pid ? ('/patients/' + pid + '/record') : '/patients/list');
};












