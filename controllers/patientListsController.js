
// controllers/patientListsController.js
// Consultations list, Prescriptions list, Appointments list
'use strict';
const { Op } = require('sequelize');
const { toLocalDateStr } = require('../utils/dateHelpers');
const {
    care_encounter,
    care_encounter_prescription,
    care_encounter_appointment,
    care_person,
    care_department,
} = require('../models');

// ══════════════════════════════════════════════════════════════
// CONSULTATIONS — active/pending outpatient encounters (class_nr=1)
// ══════════════════════════════════════════════════════════════
exports.consultations = async (req, res) => {
    try {
        const locale   = req.locale || 'en';
        const search   = (req.query.search   || '').trim();
        const tabFilter = req.query.tab      || 'all';   // all | mine
        const userFullName = (req.user?.firstName && req.user?.lastName)
            ? (req.user.firstName + ' ' + req.user.lastName).trim()
            : (req.user?.username || '');

        const where = {
            encounter_class_nr: 1,                              // outpatient only
            is_discharged:      0,
            encounter_status:   { [Op.in]: ['pending','active'] },
        };
        if (tabFilter === 'mine') where.consulting_dr = userFullName;

        const encounters = await care_encounter.findAll({
            where,
            order:   [['encounter_date','DESC']],
            limit:   300,
            include: [{
                model:      care_person,
                as:         'patient',
                attributes: ['pid','hospital_file_nr','name_first','name_last','date_birth','sex'],
                required:   false,
            }],
        });

        const filtered = search ? encounters.filter(e => {
            const p = e.patient; if (!p) return false;
            const q = search.toLowerCase();
            return (p.name_last   && p.name_last.toLowerCase().includes(q))  ||
                   (p.name_first  && p.name_first.toLowerCase().includes(q)) ||
                   (p.hospital_file_nr && String(p.hospital_file_nr).includes(q));
        }) : encounters;

        const allCount  = await care_encounter.count({
            where: { encounter_class_nr: 1, is_discharged: 0,
                     encounter_status: { [Op.in]: ['pending','active'] } },
        });
        const mineCount = await care_encounter.count({
            where: { encounter_class_nr: 1, is_discharged: 0,
                     encounter_status: { [Op.in]: ['pending','active'] },
                     consulting_dr: userFullName },
        });

        res.render('patients/consultations', {
            title:      locale === 'fr' ? 'Consultations' : 'Consultations',
            activePage: 'patients', user: req.user, csrfToken: req.csrfToken(),
            encounters: filtered, search, tabFilter, allCount, mineCount, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════
// PRESCRIPTIONS — all active prescriptions with patient info
// ══════════════════════════════════════════════════════════════
exports.prescriptions = async (req, res) => {
    try {
        const locale    = req.locale || 'en';
        const search    = (req.query.search    || '').trim();
        const tabFilter = req.query.tab        || 'active';  // active | all | mine
        const page      = Math.max(1, parseInt(req.query.page, 10) || 1);
        const PER       = 30;
        const userFullName = (req.user?.firstName && req.user?.lastName)
            ? (req.user.firstName + ' ' + req.user.lastName).trim()
            : (req.user?.username || '');

        const where = {};
        if (tabFilter === 'active')      where.is_stopped = 0;
        if (tabFilter === 'mine')        { where.is_stopped = 0; where.prescriber = userFullName; }
        if (search) {
            where[Op.or] = [
                { article:   { [Op.like]: '%' + search + '%' } },
                { prescriber:{ [Op.like]: '%' + search + '%' } },
            ];
        }

        const { count, rows: prescriptions } = await care_encounter_prescription.findAndCountAll({
            where,
            order:  [['create_time','DESC']],
            limit:  PER,
            offset: (page-1)*PER,
        });

        // Enrich with patient info via encounter
        const encNrs = [...new Set(prescriptions.map(p => p.encounter_nr))];
        let encMap = {};
        if (encNrs.length) {
            const encounters = await care_encounter.findAll({
                where: { encounter_nr: { [Op.in]: encNrs } },
                attributes: ['encounter_nr','pid','consulting_dr','encounter_date'],
                include: [{
                    model:      care_person, as: 'patient',
                    attributes: ['pid','hospital_file_nr','name_first','name_last'],
                    required:   false,
                }],
            });
            encounters.forEach(e => { encMap[e.encounter_nr] = e; });
        }

        const activeCount = await care_encounter_prescription.count({ where: { is_stopped: 0 } });
        const mineCount   = await care_encounter_prescription.count({
            where: { is_stopped: 0, prescriber: userFullName },
        });

        res.render('patients/prescriptions', {
            title:      locale === 'fr' ? 'Prescriptions' : 'Prescriptions',
            activePage: 'patients', user: req.user, csrfToken: req.csrfToken(),
            prescriptions, encMap, search, tabFilter,
            activeCount, mineCount, count,
            totalPages: Math.ceil(count/PER), currentPage: page, locale,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════
// APPOINTMENTS — upcoming and past appointments
// ══════════════════════════════════════════════════════════════
exports.appointments = async (req, res) => {
    try {
        const locale    = req.locale || 'en';
        const search    = (req.query.search    || '').trim();
        const tabFilter = req.query.tab        || 'upcoming';  // upcoming | today | all
        const page      = Math.max(1, parseInt(req.query.page, 10) || 1);
        const PER       = 30;
        const today     = new Date(); today.setHours(0,0,0,0);
        const tomorrow  = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

        const where = {};
        if (tabFilter === 'upcoming') {
            where.date            = { [Op.gte]: today };
            where.appt_status     = { [Op.notIn]: ['cancelled','completed'] };
        } else if (tabFilter === 'today') {
            where.date            = { [Op.gte]: today, [Op.lt]: tomorrow };
        }
        // 'all' = no date filter

        const { count, rows: appointments } = await care_encounter_appointment.findAndCountAll({
            where,
            order:  [['date','ASC'],['time','ASC']],
            limit:  PER,
            offset: (page-1)*PER,
        });

        // Enrich with patient info
        const pids = [...new Set(appointments.map(a => a.pid).filter(Boolean))];
        let patMap = {};
        if (pids.length) {
            const patients = await care_person.findAll({
                where:      { pid: { [Op.in]: pids } },
                attributes: ['pid','hospital_file_nr','name_first','name_last'],
            });
            patients.forEach(p => { patMap[p.pid] = p; });
        }

        const upcomingCount = await care_encounter_appointment.count({
            where: { date: { [Op.gte]: today },
                     appt_status: { [Op.notIn]: ['cancelled','completed'] } },
        });
        const todayCount = await care_encounter_appointment.count({
            where: { date: { [Op.gte]: today, [Op.lt]: tomorrow } },
        });

        res.render('patients/appointments', {
            title:      locale === 'fr' ? 'Rendez-vous' : 'Appointments',
            activePage: 'patients', user: req.user, csrfToken: req.csrfToken(),
            appointments, patMap, search, tabFilter,
            upcomingCount, todayCount, count,
            totalPages: Math.ceil(count/PER), currentPage: page, locale,
            today: toLocalDateStr(today),
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};


