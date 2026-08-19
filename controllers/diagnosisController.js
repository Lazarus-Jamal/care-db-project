
// controllers/diagnosisController.js
'use strict';
const {
    care_encounter,
    care_person,
    care_department,
    care_encounter_diagnosis,
    care_diagnostics_cim10,
} = require('../models');
const { Op } = require('sequelize');
const logActivity = require('../utils/activityLogger');
const { hasEncounterFacilityAccess } = require('../utils/encounterFacilityCheck');

const fullName = (user) =>
    (user.firstName && user.lastName)
        ? (user.firstName + ' ' + user.lastName).trim()
        : (user.username || '');

// ── GET /diagnoses/encounter/:enc_nr ─────────────────────────────
exports.diagnoseForm = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        // Confirmed 2026-08-07: diagnosing is medical work, gated by
        // MedicalRecord.Create.Diagnosis (Doctor only). Previously
        // enforced only by hiding the button client-side, no server-side
        // check at all.
        if (!req.user.permissions.includes('MedicalRecord.Create.Diagnosis') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).send(
                locale === 'fr' ? 'Permission refusee.' : 'Permission denied.');

        const encNr  = parseInt(req.params.enc_nr, 10);
        if (isNaN(encNr)) return res.status(400).send('Invalid encounter number.');

        const encounter = await care_encounter.findByPk(encNr, {
            include: [{
                model:      care_department,
                as:         'department',
                attributes: ['nr','name_short','name_formal'],
                required:   false,
            }],
        });
        if (!encounter) return res.status(404).send('Encounter not found.');
        if (!hasEncounterFacilityAccess(req, encounter)) {
            return res.status(403).send(
                locale === 'fr'
                    ? 'Cette consultation appartient a un autre etablissement.'
                    : 'This encounter belongs to a different facility.');
        }
        if (encounter.is_discharged) {
            return res.status(400).send(
                locale === 'fr'
                    ? 'Cette consultation est cloturee.'
                    : 'This encounter is closed.');
        }

        const patient = await care_person.findByPk(encounter.pid, {
            attributes: ['pid','hospital_file_nr','name_first','name_last',
                         'date_birth','sex'],
        });

        // Existing diagnoses for this encounter
        const existing = await care_encounter_diagnosis.findAll({
            where: { encounter_nr: encNr, status: { [Op.ne]: 'deleted' } },
            order: [['date','DESC']],
        });

        res.render('diagnoses/form', {
            title:      locale === 'fr' ? 'Diagnositcs' : 'Diagnoses',
            activePage: 'worklist',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            encounter,
            patient,
            existing,
        });
    } catch (err) {
        console.error('Diagnosis form error:', err);
        res.status(500).send('Error: ' + err.message);
    }
};

// ── POST /diagnoses/encounter/:enc_nr ────────────────────────────
// Body: { diagnoses: [ { code, localcode, type } ] }
exports.submitDiagnoses = async (req, res) => {
    try {
        const locale   = req.locale || 'en';
        const encNr    = parseInt(req.params.enc_nr, 10);
        const actor    = fullName(req.user);
        const deptNr   = req.user?.dept_nr || 0;
        const { diagnoses } = req.body;

        if (!req.user.permissions.includes('MedicalRecord.Create.Diagnosis') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        if (!diagnoses || !Array.isArray(diagnoses) || diagnoses.length === 0) {
            return res.status(400).json({
                ok: false,
                error: locale === 'fr' ? 'Aucun diagnostic fourni.' : 'No diagnoses provided.',
            });
        }

        const encounter = await care_encounter.findByPk(encNr);
        if (!encounter) {
            return res.status(404).json({ ok: false, error: 'Encounter not found.' });
        }
        if (!hasEncounterFacilityAccess(req, encounter)) {
            return res.status(403).json({ ok: false, error: 'This encounter belongs to a different facility.' });
        }

        const now     = new Date();
        const created = [];

        for (const dx of diagnoses) {
            if (!dx.code) continue;

            // Look up parent code and label from CIM-10 table
            const cim = await care_diagnostics_cim10.findOne({
                where:      { code: dx.code },
                attributes: ['code','parent_code','libelle_court'],
            });

            // Truncate to match schema VARCHAR lengths exactly:
            // localcode(35), code(25), code_parent(25),
            // diagnosing_clinician(60), modify_id/create_id(35)
            var localLabel = (dx.localcode || (cim ? cim.libelle_court : dx.code) || '').substring(0, 35);
            var shortId    = actor.substring(0, 35);
            var clinName   = actor.substring(0, 60);

            const row = await care_encounter_diagnosis.create({
                encounter_nr:         encNr,
                facility_id:          encounter.facility_id,
                op_nr:                0,
                date:                 now,
                code:                 dx.code.substring(0, 25),
                code_parent:          (cim ? (cim.parent_code || '') : '').substring(0, 25),
                group_nr:             0,
                code_version:         0,
                localcode:            localLabel,
                category_nr:          0,
                type:                 (dx.type || 'main').substring(0, 35),
                localization:         '',
                diagnosing_clinician: clinName,
                diagnosing_dept_nr:   deptNr,
                status:               'active',
                history:              '[' + now.toISOString() + '] Added by ' + clinName,
                modify_id:            shortId,
                modify_time:          now,
                create_id:            shortId,
                create_time:          now,
            });
            created.push(row);
        }

        await logActivity(req,
            created.length + ' diagnosis(es) saved for Enc#' + encNr + ' by ' + actor,
            true, 'diagnosisController.js', req.user.user_id, req.user.username);

        // Redirect back to patient record Encounters tab
        const pid = encounter.pid;
        res.json({ ok: true, redirect: '/patients/' + pid + '/record?tab=enc' });

    } catch (err) {
        console.error('Submit diagnoses error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};


