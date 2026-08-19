
// controllers/admissionController.js
'use strict';
const { Op, fn, col } = require('sequelize');
const sequelize = require('../config/database');
const {
    care_person, care_encounter,
    care_department, care_staff, care_person: CarePersonAlias,
    care_drugsandservices, care_insurance_firm,
    care_billing_bill, care_billing_bill_item,
    care_encounter_prescription, care_facilities,
} = require('../models');
const logActivity = require('../utils/activityLogger');

const nullIfEmpty = (v) =>
    (v === '' || v === undefined || v === null) ? null : v;
const strOrEmpty = (v) =>
    (v === undefined || v === null) ? '' : String(v).trim();
const intOrNull = (v) => {
    if (v === '' || v == null) return null;
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
};

// Multi-Facility Phase 2 — a patient can only have one open encounter
// system-wide, not one per facility (a person can't be admitted in two
// places at once). Checked globally, regardless of which facility is
// currently in session — matches the same 'pending'/'active' definition
// of "open" already used elsewhere in this app (patientController.js).
// Returns { encounter, facilityName } if one exists anywhere, else null.
async function findGlobalOpenEncounter(pid) {
    const openEnc = await care_encounter.findOne({
        where: { pid, is_discharged: 0, encounter_status: { [Op.in]: ['pending', 'active'] } },
        order: [['encounter_date', 'DESC']],
    });
    if (!openEnc) return null;
    const facility = await care_facilities.findByPk(openEnc.facility_id, { attributes: ['id', 'name'] });
    return { encounter: openEnc, facilityName: facility ? facility.name : 'Unknown Facility' };
}

// ── Shared loader: departments, staff, consultations, insurers ────
const loadFormData = async (locale) => {
    const isFr = locale === 'fr';

    // Departments that admit outpatients and are active
    const departments = await care_department.findAll({
        where: {
            admit_outpatient: 1,
            [Op.or]: [
                { status: 'active' },
                { status: null },
                { is_inactive: 0 },
                { is_inactive: null },
            ],
        },
        order: [['name_formal', 'ASC']],
        attributes: ['nr', 'name_formal', 'name_short'],
    });

    // Consulting staff — active, linked to a person for full name
    const staffList = await care_staff.findAll({
        where: {
            [Op.or]: [{ status: '1' }, { status: 'active' }, { status: null }],
        },
        include: [{
            model: care_person,
            as:    'person',
            attributes: ['name_first', 'name_last'],
            required: true,
        }],
        order: [[{ model: care_person, as: 'person' }, 'name_last', 'ASC']],
        limit: 500,
    });

    // Consultation items (item_number = 'CON')
    const consultations = await care_drugsandservices.findAll({
        where: { item_number: 'CON' },
        order: [['item_description', 'ASC']],
        attributes: [
            'item_id', 'item_number',
            'item_description', 'item_description_en',
            'unit_price', 'unit_price_dec',
            'unit_price_2', 'unit_price_2_dec',
        ],
    });

    // Insurance firms
    const insurers = await care_insurance_firm.findAll({
        where: {
            [Op.or]: [{ status: 'active' }, { status: null }],
        },
        order: [['name', 'ASC']],
        attributes: ['firm_id', 'name'],
    });

    return { departments, staffList, consultations, insurers };
};

// ── GET /patients/:pid/admit ──────────────────────────────────
exports.admitForm = async (req, res) => {
    try {
        const pid = parseInt(req.params.pid, 10);
        if (isNaN(pid)) return res.status(400).send('Invalid patient ID.');

        const patient = await care_person.findByPk(pid, {
            attributes: ['pid', 'hospital_file_nr', 'name_first', 'name_last',
                         'date_birth', 'sex', 'blood_group', 'cellphone_1_nr',
                         'contact_person', 'contact_relation', 'relative_phone'],
        });
        if (!patient) return res.status(404).send('Patient not found.');

        // Multi-Facility Phase 2 — check globally before even showing the
        // form, not just at submit. A patient already admitted anywhere
        // (any facility) cannot be admitted again until discharged.
        const existingOpen = await findGlobalOpenEncounter(pid);
        if (existingOpen) {
            const msg = req.locale === 'fr'
                ? `Ce patient est déjà admis à ${existingOpen.facilityName}. Une nouvelle admission n'est possible qu'après la sortie de cette consultation.`
                : `This patient is already admitted at ${existingOpen.facilityName}. A new admission isn't possible until that encounter is discharged.`;
            const formData = await loadFormData(req.locale);
            return res.render('patients/admit', {
                title:    req.locale === 'fr' ? 'Admission Patient' : 'Patient Admission',
                activePage: 'patients',
                user:     req.user,
                csrfToken: req.csrfToken(),
                patient,
                fromRegistration: req.query.new === '1',
                errors:  [msg],
                alreadyAdmittedElsewhere: true,
                success: false,
                ...formData,
            });
        }

        const formData = await loadFormData(req.locale);
        const fromRegistration = req.query.new === '1';

        res.render('patients/admit', {
            title:    req.locale === 'fr' ? 'Admission Patient' : 'Patient Admission',
            activePage: 'patients',
            user:     req.user,
            csrfToken: req.csrfToken(),
            patient,
            fromRegistration,
            errors:  [],
            alreadyAdmittedElsewhere: false,
            success: false,
            ...formData,
        });
    } catch (error) {
        console.error('Error loading admit form:', error);
        res.status(500).send('Error loading admission form: ' + error.message);
    }
};

// ── POST /patients/:pid/admit ─────────────────────────────────
exports.admitPatient = async (req, res) => {
    const pid        = parseInt(req.params.pid, 10);
    const createdBy  = req.user.username;
    const actorName  = (req.user.firstName && req.user.lastName)
        ? `${req.user.firstName} ${req.user.lastName}`.trim()
        : req.user.username;
    const createdId  = req.user.user_id;

    try {
        const b = req.body;

        // ── Validate required fields
        const errors = [];
        if (!b.dept_nr)          errors.push(req.locale === 'fr'
            ? 'Veuillez sélectionner un département.'
            : 'Please select a department.');
        if (!b.consulting_dr_nr) errors.push(req.locale === 'fr'
            ? 'Veuillez sélectionner un médecin.'
            : 'Please select a consulting doctor.');
        if (!b.consultation_id)  errors.push(req.locale === 'fr'
            ? 'Veuillez sélectionner une consultation.'
            : 'Please select a consultation type.');

        if (errors.length > 0) {
            const patient   = await care_person.findByPk(pid);
            const formData  = await loadFormData(req.locale);
            return res.render('patients/admit', {
                title:    req.locale === 'fr' ? 'Admission Patient' : 'Patient Admission',
                activePage: 'patients',
                user:     req.user,
                csrfToken: req.csrfToken(),
                patient, errors, success: false,
                fromRegistration: false,
                ...formData,
            });
        }

        // Multi-Facility Phase 2 — re-check globally here too, not just in
        // admitForm. admitForm's check can be bypassed by posting directly,
        // so this is the check that actually enforces the rule; admitForm's
        // is purely the earlier, friendlier warning.
        const existingOpen = await findGlobalOpenEncounter(pid);
        if (existingOpen) {
            const msg = req.locale === 'fr'
                ? `Ce patient est déjà admis à ${existingOpen.facilityName}. Une nouvelle admission n'est possible qu'après la sortie de cette consultation.`
                : `This patient is already admitted at ${existingOpen.facilityName}. A new admission isn't possible until that encounter is discharged.`;
            const patient  = await care_person.findByPk(pid);
            const formData = await loadFormData(req.locale);
            return res.render('patients/admit', {
                title:    req.locale === 'fr' ? 'Admission Patient' : 'Patient Admission',
                activePage: 'patients',
                user:     req.user,
                csrfToken: req.csrfToken(),
                patient, errors: [msg], success: false,
                alreadyAdmittedElsewhere: true,
                fromRegistration: false,
                ...formData,
            });
        }

        // ── Resolve consulting doctor full name
        const staffMember = await care_staff.findOne({
            where: { nr: parseInt(b.consulting_dr_nr, 10) },
            include: [{ model: care_person, as: 'person',
                        attributes: ['name_first', 'name_last'] }],
        });
        const drName = staffMember && staffMember.person
            ? (staffMember.person.name_first + ' ' + staffMember.person.name_last).trim()
            : b.consulting_dr_nr;

        // ── Resolve consultation item
        const consult = await care_drugsandservices.findByPk(
            parseInt(b.consultation_id, 10)
        );
        if (!consult) throw new Error('Consultation item not found.');

        const hasInsurance = b.has_insurance === '1' || b.has_insurance === 'on';

        // Price: unit_price (no insurance) or unit_price_2 (with insurance)
        const price = hasInsurance
            ? (parseFloat(consult.unit_price_2_dec) || parseFloat(consult.unit_price_2) || 0)
            : (parseFloat(consult.unit_price_dec)   || parseFloat(consult.unit_price)   || 0);

        // financial_class_nr: 1=cash, 2=insurance, 3=indigent
        const financialClass = hasInsurance ? 2
            : (b.financial_class === '3' ? 3 : 1);

        // Admission is a facility-defining action -- unlike viewing or
        // acting on data that already has a facility_id, there's no
        // sensible "all facilities" answer for "which facility is this
        // patient being admitted to." An admin with no specific facility
        // selected (facility: null, per the Phase 1 exemption) can't
        // admit until they pick one -- this is different from the
        // confirmed "admins bypass scoping for existing data" rule (§5
        // item 9 of the plan), which is about acting on records that
        // already have a facility_id, not creating one with nothing to
        // attribute it to.
        if (req.user.isFacilityExempt) {
            const patient  = await care_person.findByPk(pid);
            const formData = await loadFormData(req.locale);
            const msg = req.locale === 'fr'
                ? "Veuillez sélectionner un établissement spécifique avant d'admettre un patient."
                : 'Please select a specific facility before admitting a patient.';
            return res.render('patients/admit', {
                title:    req.locale === 'fr' ? 'Admission Patient' : 'Patient Admission',
                activePage: 'patients',
                user:     req.user,
                csrfToken: req.csrfToken(),
                patient, errors: [msg], success: false,
                fromRegistration: false,
                ...formData,
            });
        }
        const facilityId = req.user.facility.id;

        const historyEntry = `[${new Date().toISOString()}] Admitted by ${createdBy}`;

        const t = await sequelize.transaction();
        let encNr, billNo;
        try {
            // ── 1. Create care_encounter
            const encounter = await care_encounter.create({
                pid,
                facility_id:       facilityId,
                encounter_date:    new Date(),
                encounter_class_nr: 1,            // 1 = Outpatient
                encounter_type:    'Outpatient',
                encounter_status:  'pending',
                current_dept_nr:   parseInt(b.dept_nr, 10),
                in_dept:           1,
                consulting_dr:     drName,
                financial_class_nr: financialClass,
                insurance_firm_id: hasInsurance ? (b.insurance_firm_id || '') : '',
                insurance_firm:    hasInsurance ? (b.insurance_firm_name || '') : '',
                insurance_nr:      hasInsurance ? nullIfEmpty(b.insurance_nr) : null,
                insurance_class_nr: hasInsurance ? 1 : 0,
                bonpercent:        hasInsurance ? intOrNull(b.insurance_pct) || 0 : 0,
                referrer_diagnosis: strOrEmpty(b.chief_complaint),
                referrer_dr:       strOrEmpty(b.referrer_dr),
                referrer_institution: strOrEmpty(b.referrer_institution),
                contact_name:      strOrEmpty(b.contact_name),
                is_discharged:     0,
                status:            'pending',
                history:           historyEntry,
                create_id:         actorName,
                create_time:       new Date(),
                modify_id:         actorName,
                modify_time:       new Date(),
                boncfg:            0,
                exclusion:         0,
                exclusion2:        0,
            }, { transaction: t });

            encNr = encounter.encounter_nr;

            // ── 2. Create care_billing_bill (now facility-scoped too,
            // per the Billing phase of the multi-facility rollout)
            const bill = await care_billing_bill.create({
                encounter_nr:         encNr,
                facility_id:          facilityId,
                date:                 new Date(),
                amount:               Math.round(price),
                billgeneral:          Math.round(price),
                insurance_provider_id: hasInsurance ? nullIfEmpty(b.insurance_provider_id) : null,
                insurance_pct:        hasInsurance ? (intOrNull(b.insurance_pct) || 0) : 0,
                agent:                createdBy,
                status:               'open',
            }, { transaction: t });

            billNo = bill.bill_no;

            // ── 3. Create care_billing_bill_item
            await care_billing_bill_item.create({
                encounter_nr: encNr,
                facility_id:  facilityId,
                code:         consult.item_id,
                item_id:      consult.item_id,
                article:      req.locale === 'fr'
                    ? consult.item_description
                    : (consult.item_description_en || consult.item_description),
                unit_cost:    Math.round(price),
                units:        1,
                amount:       Math.round(price),
                date:         new Date(),
                status:       'open',
                bill_no:      billNo,
                islab:        0,
                labpr:        0,
                class:        'CON',
                qtealivrer:   0,
                qtelivree:    0,
                livrer:       0,
                billtype:     'consultation',
                societe:      hasInsurance ? (b.insurance_firm_name || '') : '',
                percent:      hasInsurance ? (intOrNull(b.insurance_pct) || 0) : 0,
                down:         0,
                insurance_provider_id: hasInsurance ? nullIfEmpty(b.insurance_provider_id) : null,
                insurance_pct: hasInsurance ? (intOrNull(b.insurance_pct) || 0) : 0,
            }, { transaction: t });

            // 4. Write consultation to care_encounter_prescription
            await care_encounter_prescription.create({
                encounter_nr:              encNr,
                facility_id:               facilityId,
                prescription_type_nr:      0,
                article:                   req.locale === 'fr'
                    ? consult.item_description
                    : (consult.item_description_en || consult.item_description),
                article_item_number:       String(consult.item_number || consult.item_id),
                price:                     String(Math.round(price)),
                drug_class:                'CON',
                order_nr:                  0,
                dosage:                    0,
                application_type_nr:       7,
                notes:                     'Consultation',
                prescribe_date:            new Date(),
                prescriber:                actorName,
                color_marker:              '',
                is_stopped:                0,
                is_outpatient_prescription: 1,
                is_disabled:               null,
                stop_date:                 null,
                status:                    'active',
                history:                   '[' + new Date().toISOString() + '] Admitted by ' + actorName,
                bill_number:               billNo,
                bill_status:               'open',
                modify_id:                 actorName,
                modify_time:               new Date(),
                create_id:                 actorName,
                create_time:               new Date(),
                bon:                       0,
                livrer:                    0,
                caution:                   0,
            }, { transaction: t });

            await t.commit();
        } catch (innerError) {
            await t.rollback();
            throw innerError;
        }

        await logActivity(req,
            `Patient PID:${pid} admitted — Enc#${encNr}, Bill#${billNo}, Dr: ${drName}, Amount: ${price}, Facility: ${facilityId}`,
            true, 'admissionController.js', createdId, createdBy);

        // Redirect to patient record showing new encounter
        res.redirect('/patients/' + pid + '/record?admitted=1');

    } catch (error) {
        console.error('Error admitting patient:', error);
        await logActivity(req, 'Admission error: ' + error.message,
            false, 'admissionController.js', req.user.user_id, req.user.username);

        const patient  = await care_person.findByPk(pid);
        const formData = await loadFormData(req.locale);
        res.render('patients/admit', {
            title:    req.locale === 'fr' ? 'Admission Patient' : 'Patient Admission',
            activePage: 'patients',
            user:     req.user,
            csrfToken: req.csrfToken(),
            patient,
            errors:  [error.message],
            success: false,
            fromRegistration: false,
            ...formData,
        });
    }
};










