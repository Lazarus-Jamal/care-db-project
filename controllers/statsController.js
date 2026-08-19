
// controllers/statsController.js
'use strict';
const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const sequelize = require('../config/database');

// ── Helper: date range from query params ─────────────────────────
function dateRange(query, defaultDays = 30) {
    const now   = new Date();
    const to    = query.date_to   ? new Date(query.date_to   + 'T23:59:59') : now;
    const from  = query.date_from ? new Date(query.date_from + 'T00:00:00')
                                  : new Date(now.getTime() - defaultDays * 86400000);
    from.setHours(0,0,0,0);
    const pad = n => String(n).padStart(2,'0');
    const localStr = dt => dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());
    return { from, to, fromStr: localStr(from), toStr: localStr(to) };
}

// ── Helper: fill missing days in a date range with 0 ─────────────
function fillDays(rows, from, to, keyFn, valFn) {
    const map = {};
    rows.forEach(r => { map[keyFn(r)] = valFn(r); });
    const out = []; const cur = new Date(from);
    while (cur <= to) {
        // Use local date string to avoid UTC offset shifting the day
        const y = cur.getFullYear();
        const m = String(cur.getMonth()+1).padStart(2,'0');
        const d = String(cur.getDate()).padStart(2,'0');
        const k = y + '-' + m + '-' + d;
        out.push({ date: k, count: map[k] || 0 });
        cur.setDate(cur.getDate() + 1);
    }
    return out;
}

// ════════════════════════════════════════════════════════════════
// CONSULTATIONS — per-day histogram + table by doctor/dept
// ════════════════════════════════════════════════════════════════
exports.consultations = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const { from, to, fromStr, toStr } = dateRange(req.query, 30);
        const search = (req.query.search || '').trim();

        // Multi-Facility scoping — care_encounter carries its own
        // facility_id (Phase 2 foundation). Same isFacilityExempt check
        // as elsewhere, not the object's truthiness alone.
        const facilityFilter = !req.user.isFacilityExempt
            ? `AND facility_id = ${sequelize.escape(req.user.facility.id)}`
            : '';

        // Per-day counts for histogram
        const dailyRows = await sequelize.query(`
            SELECT DATE(encounter_date) AS day, COUNT(*) AS cnt
            FROM   care_encounter
            WHERE  encounter_date BETWEEN :from AND :to
              AND  encounter_class_nr = 1
              ${facilityFilter}
            GROUP  BY DATE(encounter_date)
            ORDER  BY day ASC
        `, { replacements: { from, to }, type: QueryTypes.SELECT });

        const histogram = fillDays(dailyRows, from, to,
            r => String(r.day).slice(0,10),
            r => parseInt(r.cnt, 10));

        // Table: consultations per doctor grouped
        const tableRows = await sequelize.query(`
            SELECT
                consulting_dr                   AS doctor,
                current_dept_nr                 AS dept_nr,
                COUNT(*)                        AS total,
                SUM(CASE WHEN is_discharged=0 THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN is_discharged=1 THEN 1 ELSE 0 END) AS closed
            FROM   care_encounter
            WHERE  encounter_date BETWEEN :from AND :to
              AND  encounter_class_nr = 1
              ${facilityFilter}
              ${search ? "AND consulting_dr LIKE :search" : ''}
            GROUP  BY consulting_dr, current_dept_nr
            ORDER  BY total DESC
        `, {
            replacements: { from, to, search: search ? '%'+search+'%' : null },
            type: QueryTypes.SELECT,
        });

        const total = histogram.reduce((s,d) => s+d.count, 0);

        res.render('stats/consultations', {
            title:     locale==='fr' ? 'Consultations' : 'Consultations',
            activePage:'stats', user: req.user, csrfToken: req.csrfToken(),
            histogram, tableRows, total, fromStr, toStr, search, locale,
        });
    } catch (err) { res.status(500).send('Stats error: '+err.message); }
};

// ════════════════════════════════════════════════════════════════
// DIAGNOSTICS — per-day histogram + table by ICD code
// ════════════════════════════════════════════════════════════════
exports.diagnostics = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const { from, to, fromStr, toStr } = dateRange(req.query, 30);
        const search = (req.query.search || '').trim();

        // Multi-Facility scoping — care_encounter_diagnosis carries its
        // own facility_id (Phase 2 foundation). Same isFacilityExempt
        // check as elsewhere, not the object's truthiness alone.
        const facilityFilter = !req.user.isFacilityExempt
            ? `AND d.facility_id = ${sequelize.escape(req.user.facility.id)}`
            : '';

        const dailyRows = await sequelize.query(`
            SELECT DATE(d.date) AS day, COUNT(*) AS cnt
            FROM   care_encounter_diagnosis d
            WHERE  d.date BETWEEN :from AND :to
              ${facilityFilter}
            GROUP  BY DATE(d.date)
            ORDER  BY day ASC
        `, { replacements: { from, to }, type: QueryTypes.SELECT });

        const histogram = fillDays(dailyRows, from, to,
            r => String(r.day).slice(0,10),
            r => parseInt(r.cnt, 10));

        const tableRows = await sequelize.query(`
            SELECT
                d.code,
                d.localcode,
                d.type                              AS diag_type,
                COUNT(*)                            AS cases,
                COUNT(DISTINCT d.encounter_nr)      AS encounters,
                d.diagnosing_clinician              AS clinician
            FROM   care_encounter_diagnosis d
            WHERE  d.date BETWEEN :from AND :to
              ${facilityFilter}
              ${search ? "AND (d.code LIKE :search OR d.localcode LIKE :search)" : ''}
            GROUP  BY d.code, d.localcode, d.type, d.diagnosing_clinician
            ORDER  BY cases DESC
            LIMIT  100
        `, {
            replacements: { from, to, search: search ? '%'+search+'%' : null },
            type: QueryTypes.SELECT,
        });

        const total = histogram.reduce((s,d) => s+d.count, 0);

        res.render('stats/diagnostics', {
            title:     locale==='fr' ? 'Diagnostiques' : 'Diagnostics',
            activePage:'stats', user: req.user, csrfToken: req.csrfToken(),
            histogram, tableRows, total, fromStr, toStr, search, locale,
        });
    } catch (err) { res.status(500).send('Stats error: '+err.message); }
};

// ════════════════════════════════════════════════════════════════
// HOSPITALISATIONS
// ════════════════════════════════════════════════════════════════
exports.hospitalisations = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const { from, to, fromStr, toStr } = dateRange(req.query, 30);
        const search = (req.query.search || '').trim();

        // Multi-Facility scoping — same isFacilityExempt check as
        // elsewhere, not the object's truthiness alone.
        const facilityFilter = !req.user.isFacilityExempt
            ? `AND facility_id = ${sequelize.escape(req.user.facility.id)}`
            : '';

        const dailyRows = await sequelize.query(`
            SELECT DATE(encounter_date) AS day, COUNT(*) AS cnt
            FROM   care_encounter
            WHERE  encounter_date BETWEEN :from AND :to
              AND  encounter_class_nr = 2
              ${facilityFilter}
            GROUP  BY DATE(encounter_date)
            ORDER  BY day ASC
        `, { replacements: { from, to }, type: QueryTypes.SELECT });

        const histogram = fillDays(dailyRows, from, to,
            r => String(r.day).slice(0,10),
            r => parseInt(r.cnt, 10));

        const tableRows = await sequelize.query(`
            SELECT
                consulting_dr    AS doctor,
                current_ward_nr  AS ward_nr,
                COUNT(*)         AS total,
                SUM(CASE WHEN is_discharged=0 THEN 1 ELSE 0 END) AS currently_in,
                SUM(CASE WHEN is_discharged=1 THEN 1 ELSE 0 END) AS discharged
            FROM   care_encounter
            WHERE  encounter_date BETWEEN :from AND :to
              AND  encounter_class_nr = 2
              ${facilityFilter}
              ${search ? "AND consulting_dr LIKE :search" : ''}
            GROUP  BY consulting_dr, current_ward_nr
            ORDER  BY total DESC
        `, { replacements: { from, to, search: search ? '%'+search+'%' : null }, type: QueryTypes.SELECT });

        const total = histogram.reduce((s,d) => s+d.count, 0);

        res.render('stats/hospitalisations', {
            title:     locale==='fr' ? 'Hospitalisations' : 'Hospitalizations',
            activePage:'stats', user: req.user, csrfToken: req.csrfToken(),
            histogram, tableRows, total, fromStr, toStr, search, locale,
        });
    } catch (err) { res.status(500).send('Stats error: '+err.message); }
};

// ════════════════════════════════════════════════════════════════
// FINANCES — payments per day
// ════════════════════════════════════════════════════════════════
exports.finances = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const { from, to, fromStr, toStr } = dateRange(req.query, 30);
        const search = (req.query.search || '').trim();

        // Multi-Facility Billing scoping — req.user.facility is ALWAYS a
        // truthy object; admins get { id: null } specifically, so this
        // checks the dedicated isFacilityExempt flag (established in
        // authController.js/authMiddleware.js), not the object's
        // truthiness alone -- see hasEncounterFacilityAccess's own
        // comment for the full explanation of why that distinction
        // matters here.
        const facilityFilter = !req.user.isFacilityExempt
            ? `AND facility_id = ${sequelize.escape(req.user.facility.id)}`
            : '';

        const dailyRows = await sequelize.query(`
            SELECT DATE(payment_date) AS day,
                   COUNT(*)           AS transactions,
                   SUM(payment_amount_total) AS total_fcfa
            FROM   care_billing_bill_payment
            WHERE  payment_date BETWEEN :from AND :to
              AND  status = 'completed'
              ${facilityFilter}
            GROUP  BY DATE(payment_date)
            ORDER  BY day ASC
        `, { replacements: { from, to }, type: QueryTypes.SELECT });

        const histogram = fillDays(dailyRows, from, to,
            r => String(r.day).slice(0,10),
            r => parseInt(r.transactions, 10));

        const tableRows = await sequelize.query(`
            SELECT
                DATE(payment_date)          AS day,
                payment_mode,
                COUNT(*)                    AS transactions,
                SUM(payment_amount_total)   AS total_fcfa,
                received_by                 AS cashier
            FROM   care_billing_bill_payment
            WHERE  payment_date BETWEEN :from AND :to
              AND  status = 'completed'
              ${facilityFilter}
              ${search ? "AND received_by LIKE :search" : ''}
            GROUP  BY DATE(payment_date), payment_mode, received_by
            ORDER  BY day DESC, total_fcfa DESC
        `, { replacements: { from, to, search: search ? '%'+search+'%' : null }, type: QueryTypes.SELECT });

        const grandTotal = dailyRows.reduce((s,d) => s + (parseFloat(d.total_fcfa)||0), 0);
        const total      = dailyRows.reduce((s,d) => s + parseInt(d.transactions,10), 0);

        res.render('stats/finances', {
            title:     locale==='fr' ? 'Statistiques financières' : 'Financial Statistics',
            activePage:'stats', user: req.user, csrfToken: req.csrfToken(),
            histogram, tableRows, total, grandTotal, fromStr, toStr, search, locale,
        });
    } catch (err) { res.status(500).send('Stats error: '+err.message); }
};

// ════════════════════════════════════════════════════════════════
// MEDICATION ORDERS — prescriptions per day
// ════════════════════════════════════════════════════════════════
exports.medOrders = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const { from, to, fromStr, toStr } = dateRange(req.query, 30);
        const search = (req.query.search || '').trim();

        // Multi-Facility scoping — care_encounter_prescription carries its
        // own facility_id (Phase 2 foundation). Same isFacilityExempt
        // check as elsewhere, not the object's truthiness alone.
        const facilityFilter = !req.user.isFacilityExempt
            ? `AND facility_id = ${sequelize.escape(req.user.facility.id)}`
            : '';

        const dailyRows = await sequelize.query(`
            SELECT DATE(prescribe_date) AS day, COUNT(*) AS cnt
            FROM   care_encounter_prescription
            WHERE  prescribe_date BETWEEN :from AND :to
              ${facilityFilter}
            GROUP  BY DATE(prescribe_date)
            ORDER  BY day ASC
        `, { replacements: { from, to }, type: QueryTypes.SELECT });

        const histogram = fillDays(dailyRows, from, to,
            r => String(r.day).slice(0,10),
            r => parseInt(r.cnt, 10));

        const tableRows = await sequelize.query(`
            SELECT
                article                     AS drug,
                drug_class,
                COUNT(*)                    AS prescribed,
                SUM(CASE WHEN is_stopped=0 THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN is_stopped=1 THEN 1 ELSE 0 END) AS stopped,
                prescriber
            FROM   care_encounter_prescription
            WHERE  prescribe_date BETWEEN :from AND :to
              ${facilityFilter}
              ${search ? "AND (article LIKE :search OR prescriber LIKE :search)" : ''}
            GROUP  BY article, drug_class, prescriber
            ORDER  BY prescribed DESC
            LIMIT  100
        `, { replacements: { from, to, search: search ? '%'+search+'%' : null }, type: QueryTypes.SELECT });

        const total = histogram.reduce((s,d) => s+d.count, 0);

        res.render('stats/medication-orders', {
            title:     locale==='fr' ? 'Commandes médicaments' : 'Medication Orders',
            activePage:'stats', user: req.user, csrfToken: req.csrfToken(),
            histogram, tableRows, total, fromStr, toStr, search, locale,
        });
    } catch (err) { res.status(500).send('Stats error: '+err.message); }
};

// ════════════════════════════════════════════════════════════════
// LAB & IMAGING — no dedicated request tables in schema, so lab vs
// imaging bill items are identified via care_drugsandservices, the
// same way the pharmacy module identifies MED/SUP items. bi.islab is
// a plain tinyint(1) boolean (0/1 only) and can never distinguish an
// "imaging" category on its own — confirmed against real data: lab
// items carry item_number='LAB'; imaging items (X-ray AND echography)
// both carry purchasing_class='xray'.
// ════════════════════════════════════════════════════════════════
async function actsStats(req, res, isLab) {
    const locale = req.locale || 'en';
    const { from, to, fromStr, toStr } = dateRange(req.query, 30);
    const search = (req.query.search || '').trim();
    const viewName = isLab ? 'stats/lab' : 'stats/imaging';
    const title    = isLab
        ? (locale==='fr' ? 'Laboratoire' : 'Laboratory')
        : (locale==='fr' ? 'Imagerie'    : 'Imaging');
    const categoryFilter = isLab
        ? "ds.item_number = 'LAB'"
        : "ds.purchasing_class = 'xray'";

    // Multi-Facility Billing scoping — care_billing_bill_item carries its
    // own facility_id. Same isFacilityExempt check as elsewhere in this
    // app, not the object's truthiness alone.
    const facilityFilter = !req.user.isFacilityExempt
        ? `AND bi.facility_id = ${sequelize.escape(req.user.facility.id)}`
        : '';

    const dailyRows = await sequelize.query(`
        SELECT DATE(bi.date) AS day, COUNT(*) AS cnt
        FROM   care_billing_bill_item bi
        INNER JOIN care_drugsandservices ds ON ds.item_id = bi.item_id
        WHERE  bi.date BETWEEN :from AND :to
          AND  ${categoryFilter}
          ${facilityFilter}
        GROUP  BY DATE(bi.date)
        ORDER  BY day ASC
    `, { replacements: { from, to }, type: QueryTypes.SELECT });

    const histogram = fillDays(dailyRows, from, to,
        r => String(r.day).slice(0,10),
        r => parseInt(r.cnt, 10));

    const tableRows = await sequelize.query(`
        SELECT
            bi.article,
            COUNT(*)            AS requests,
            bi.status,
            DATE(bi.date)       AS day
        FROM   care_billing_bill_item bi
        INNER JOIN care_drugsandservices ds ON ds.item_id = bi.item_id
        WHERE  bi.date BETWEEN :from AND :to
          AND  ${categoryFilter}
          ${facilityFilter}
          ${search ? "AND bi.article LIKE :search" : ''}
        GROUP  BY bi.article, bi.status, DATE(bi.date)
        ORDER  BY requests DESC
        LIMIT  100
    `, { replacements: { from, to, search: search ? '%'+search+'%' : null }, type: QueryTypes.SELECT });

    const total = histogram.reduce((s,d) => s+d.count, 0);

    res.render(viewName, {
        title, activePage:'stats', user: req.user, csrfToken: req.csrfToken(),
        histogram, tableRows, total, fromStr, toStr, search, locale,
    });
}

exports.lab     = async (req, res) => { try { await actsStats(req, res, true);  } catch(e){ res.status(500).send('Stats error: '+e.message); } };
exports.imaging = async (req, res) => { try { await actsStats(req, res, false); } catch(e){ res.status(500).send('Stats error: '+e.message); } };




