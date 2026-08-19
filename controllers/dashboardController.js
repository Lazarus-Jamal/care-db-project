
// controllers/dashboardController.js
'use strict';
const { Op, fn, col, literal } = require('sequelize');
const sequelize   = require('../config/database');
const activeUsers = require('../utils/activeUsers');
const { todayLocalStr, toLocalYearMonthStr, PHARMACY_PENDING_CUTOFF_DATE } = require('../utils/dateHelpers');
const {
    care_person,
    care_facilities,
    care_encounter,
    care_encounter_prescription,
    care_accesslog,
    care_billing_bill,
    care_billing_bill_payment,
    care_billing_bill_item,
    care_drugsandservices,
    care_department,
    care_pharma_dispensing,
    care_pharmacy_stock,
    care_patient_referral,
} = require('../models');

exports.getDashboard = async (req, res) => {
    try {
        const connectedUsersCount = activeUsers.size;
        const userPerms  = req.user?.permissions || [];
        const userFullName = (req.user?.firstName && req.user?.lastName)
            ? (req.user.firstName + ' ' + req.user.lastName).trim()
            : (req.user?.username || '');
        const userDeptNr = req.user?.dept_nr || null;

        // ── Role detection ────────────────────────────────────────
        const isCashierOnly  = userPerms.includes('Billing.Collect.Payment') &&
                               !userPerms.includes('Billing.Create.Bill');
        const isBillingStaff = userPerms.includes('Billing.Create.Bill');
        const isAdminUser    = res.locals.isAdmin || res.locals.isAppAdmin;

        // Pharmacy Agent/Manager and anyone else whose only relevant
        // permissions are pharmacy-related, not clinical/registration/
        // admission — verified against every real role in this system
        // (see MULTI_FACILITY_IMPLEMENTATION_PLAN.md-adjacent discussion):
        // Pharmacy Agent and Pharmacy Manager hold none of the
        // CLINICAL_WORKLIST_PERMISSIONS below, so this check is simply
        // "has a pharmacy permission and doesn't otherwise qualify for
        // the encounter worklist."
        const PHARMACY_DASH_PERMISSIONS = [
            'Pharmacy.Dispense.Medication',
            'Inventory.Order.ToPharmacy',
            'Pharmacy.Inventory.Count',
            'Pharmacy.Approve.InventoryCount',
        ];
        // Encounter Worklist access — medical (Doctor/Nurse
        // create/update permissions specifically, not the broader
        // MedicalRecord.Read.ClinicalData that Lab/Imaging Technicians
        // also hold for viewing patient context), registration, and
        // admission. Admin handled separately via isAdminUser. Verified
        // against every one of this system's 18 real roles — Pharmacy,
        // Billing, Lab, Imaging, Warehouse, Statistician, and Support
        // roles all correctly fall outside this list.
        const CLINICAL_WORKLIST_PERMISSIONS = [
            'MedicalRecord.Create.Diagnosis',
            'MedicalRecord.Create.Note',
            'MedicalRecord.Update.Note',
            'Patient.Create.PatientRecord',
            'Patient.Admit.Inpatient',
        ];
        const canSeeEncounterWorklist = isAdminUser ||
            userPerms.some(p => CLINICAL_WORKLIST_PERMISSIONS.includes(p));
        const isPharmacyOnly = !isAdminUser && !isCashierOnly && !isBillingStaff &&
            !canSeeEncounterWorklist &&
            userPerms.some(p => PHARMACY_DASH_PERMISSIONS.includes(p));

        // Referrals — deliberately narrower than CLINICAL_WORKLIST_PERMISSIONS
        // above. Confirmed with the project owner: strictly Doctor/Nurse for
        // the referral feature specifically, excluding
        // Patient.Create.PatientRecord/Patient.Admit.Inpatient (registration/
        // admission), which the broader worklist check above does include.
        // Matches referralController.js's REFERRAL_PERMISSIONS exactly.
        const REFERRAL_PERMISSIONS = [
            'MedicalRecord.Create.Diagnosis',
            'MedicalRecord.Create.Note',
            'MedicalRecord.Update.Note',
        ];
        const canSeeReferrals = isAdminUser ||
            userPerms.some(p => REFERRAL_PERMISSIONS.includes(p));

        // ── Base variables ────────────────────────────────────────
        let facilitiesCount          = 0;
        let totalPatientsCount       = 0;
        let activePrescriptionsCount = 0;
        let pendingEncountersCount   = 0;
        let myEncountersCount        = 0;
        let openBillsCount           = 0;
        let pendingBillsCount        = 0;
        let recentActivity           = [];
        // Cashier / billing specific
        let myPaidTodayCount         = 0;   // cashier: payments received_by=me today
        let allPaidTodayCount        = 0;   // billing clerk: all payments today
        let todayUnpaidCount         = 0;   // billing clerk: open+partial bills today
        let unpaidLast7              = [];  // billing clerk: chart data [{date,count}]
        let salesLast7               = [];  // daily collected [{date,total}]
        let openBillsList            = [];  // cashier + billing clerk: embedded table
        // Pharmacy-only specific — mirrors the cashier/billing pattern
        let pharmacyPendingCount     = 0;   // items awaiting dispensing (facility-scoped)
        let pharmacyPendingList      = [];  // embedded table, newest-first
        let pharmacyTodayCount       = 0;   // dispensed today (this unit)
        let pharmacyMonthCount       = 0;   // dispensed this month (this unit)
        let pharmacyLowStockCount    = 0;   // this unit's low-stock items
        let pharmacyOutOfStockCount  = 0;   // this unit's out-of-stock items

        const today     = new Date();
        today.setHours(0,0,0,0);
        const tomorrow  = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        // Local-date string helper (avoids UTC offset on toISOString)
        const localDateStr = (d) => d.getFullYear() + '-' +
            String(d.getMonth()+1).padStart(2,'0') + '-' +
            String(d.getDate()).padStart(2,'0');

        // ── Queries by role ───────────────────────────────────────
        // Multi-Facility Billing scoping — bills now carry their own
        // facility_id. System Administrators (req.user.facility is null)
        // bypass this, consistent with the exemption already established
        // for encounters.
        const billFacilityFilter = !req.user.isFacilityExempt ? { facility_id: req.user.facility.id } : {};

        if (isCashierOnly) {
            // Cashier sees: open bills count + their own paid payments today
            const [openR, myPaidR, openListR] = await Promise.allSettled([
                care_billing_bill.count({
                    where: { status: { [Op.in]: ['open','partial'] }, ...billFacilityFilter },
                }),
                care_billing_bill_payment.count({
                    where: {
                        received_by:  userFullName,
                        payment_date: { [Op.gte]: today, [Op.lt]: tomorrow },
                        ...billFacilityFilter,
                    },
                }),
                care_billing_bill.findAll({
                    where:  { status: { [Op.in]: ['open','partial'] }, ...billFacilityFilter },
                    order:  [['date','DESC']],
                    limit:  50,
                }),
            ]);
            if (openR.status      === 'fulfilled') openBillsCount    = openR.value;
            if (myPaidR.status    === 'fulfilled') myPaidTodayCount  = myPaidR.value;
            if (openListR.status  === 'fulfilled') openBillsList     = openListR.value;

        } else if (isBillingStaff || isAdminUser) {
            // Billing staff + admin: all billing stats
            // Current month window: from the 1st of this month to tomorrow
            const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const daysInMonth  = today.getDate(); // days elapsed so far (1-based)

            const [
                openR, allPaidR, todayUnpaidR,
                openListR, unpaid7R, sales7R,
                facilR, patR, prxR, actR, pendEncR, myEncR,
            ] = await Promise.allSettled([
                care_billing_bill.count({
                    where: { status: { [Op.in]: ['open','partial'] }, ...billFacilityFilter },
                }),
                care_billing_bill_payment.count({
                    where: { payment_date: { [Op.gte]: today, [Op.lt]: tomorrow }, ...billFacilityFilter },
                }),
                care_billing_bill.count({
                    where: {
                        status: { [Op.in]: ['open','partial'] },
                        date:   { [Op.gte]: today, [Op.lt]: tomorrow },
                        ...billFacilityFilter,
                    },
                }),
                care_billing_bill.findAll({
                    where:  { status: { [Op.in]: ['open','partial'] }, ...billFacilityFilter },
                    order:  [['date','DESC']],
                    limit:  50,
                }),
                // Current month: paid bills count per day
                sequelize.query(
                    `SELECT DATE(b.date) as day,
                            COUNT(DISTINCT b.bill_no) as cnt
                     FROM care_billing_bill b
                     WHERE b.status = 'paid'
                       AND b.date >= :start AND b.date < :end
                       ${!req.user.isFacilityExempt ? 'AND b.facility_id = :facilityId' : ''}
                     GROUP BY DATE(b.date)
                     ORDER BY day ASC`,
                    { replacements: { start: firstOfMonth, end: tomorrow, facilityId: req.user.isFacilityExempt ? null : req.user.facility.id },
                      type: sequelize.QueryTypes.SELECT }
                ),
                // Current month: daily collected payments
                sequelize.query(
                    `SELECT DATE(payment_date) as day,
                            SUM(payment_amount_total) as total
                     FROM care_billing_bill_payment
                     WHERE payment_date >= :start AND payment_date < :end
                       ${!req.user.isFacilityExempt ? 'AND facility_id = :facilityId' : ''}
                     GROUP BY DATE(payment_date)
                     ORDER BY day ASC`,
                    { replacements: { start: firstOfMonth, end: tomorrow, facilityId: req.user.isFacilityExempt ? null : req.user.facility.id },
                      type: sequelize.QueryTypes.SELECT }
                ),
                ...(isAdminUser ? [
                    care_facilities.count(),
                    care_person.count(),
                    care_encounter_prescription.count({
                        where: {
                            status: 'active',
                            ...(!req.user.isFacilityExempt ? { facility_id: req.user.facility.id } : {}),
                        },
                    }),
                    care_accesslog.findAll({
                        where:      { login_success: 1 },
                        order:      [['datetime','DESC']],
                        limit:      10,
                        attributes: ['username','lognote','datetime','ip'],
                    }),
                    care_encounter.count({
                        where: {
                            is_discharged:    0,
                            encounter_status: { [Op.in]: ['pending','active'] },
                            ...(userDeptNr ? { current_dept_nr: userDeptNr } : {}),
                            ...(!req.user.isFacilityExempt ? { facility_id: req.user.facility.id } : {}),
                        },
                    }),
                    care_encounter.count({
                        where: {
                            is_discharged:    0,
                            encounter_status: { [Op.in]: ['pending','active'] },
                            consulting_dr:    userFullName,
                            ...(!req.user.isFacilityExempt ? { facility_id: req.user.facility.id } : {}),
                        },
                    }),
                ] : [
                    Promise.resolve(0), Promise.resolve(0), Promise.resolve(0),
                    Promise.resolve([]), Promise.resolve(0), Promise.resolve(0),
                ]),
            ]);

            if (openR.status       === 'fulfilled') openBillsCount    = openR.value;
            if (allPaidR.status    === 'fulfilled') allPaidTodayCount = allPaidR.value;
            if (todayUnpaidR.status=== 'fulfilled') todayUnpaidCount  = todayUnpaidR.value;
            if (openListR.status   === 'fulfilled') openBillsList     = openListR.value;
            if (unpaid7R.status    === 'fulfilled') {
                // Fill in every day of the current month with 0 where no data
                const dayMap = {};
                (unpaid7R.value || []).forEach(r => {
                    if (!r.day) return;
                    const key = r.day instanceof Date
                        ? localDateStr(r.day)
                        : String(r.day).slice(0,10);
                    dayMap[key] = parseInt(r.cnt);
                });
                for (let d = 0; d < daysInMonth; d++) {
                    const dt = new Date(firstOfMonth);
                    dt.setDate(dt.getDate() + d);
                    const key = localDateStr(dt);
                    unpaidLast7.push({ date: key, count: dayMap[key] || 0 });
                }
            }
            if (sales7R.status     === 'fulfilled') {
                const salesMap = {};
                (sales7R.value || []).forEach(r => {
                    if (!r.day) return;
                    const key = r.day instanceof Date
                        ? localDateStr(r.day)
                        : String(r.day).slice(0,10);
                    salesMap[key] = parseFloat(r.total) || 0;
                });
                for (let d = 0; d < daysInMonth; d++) {
                    const dt = new Date(firstOfMonth);
                    dt.setDate(dt.getDate() + d);
                    const key = localDateStr(dt);
                    salesLast7.push({ date: key, total: salesMap[key] || 0 });
                }
            }
            if (isAdminUser) {
                if (facilR.status   === 'fulfilled') facilitiesCount          = facilR.value;
                if (patR.status     === 'fulfilled') totalPatientsCount       = patR.value;
                if (prxR.status     === 'fulfilled') activePrescriptionsCount = prxR.value;
                if (actR.status     === 'fulfilled') recentActivity           = actR.value;
                if (pendEncR.status === 'fulfilled') pendingEncountersCount   = pendEncR.value;
                if (myEncR.status   === 'fulfilled') myEncountersCount        = myEncR.value;
            }

        } else if (isPharmacyOnly) {
            // Pharmacy Agent / Pharmacy Manager — same treatment as
            // cashier/billing staff: this role's own activity stats on
            // the main dashboard, not the clinical Encounter Worklist
            // stats. Mirrors pharmacyController.dashboard's own logic
            // (same WAT-safe date pattern, same facility/unit scoping)
            // rather than inventing a third version of these same
            // numbers — a pharmacy-only user sees the same figures here
            // as on their full /pharmacy dashboard, just surfaced
            // earlier.
            const today = todayLocalStr();
            const monthStartStr = toLocalYearMonthStr(new Date()) + '-01';
            const facilityFilterSql = !req.user.isFacilityExempt
                ? `AND bi.facility_id = ${sequelize.escape(req.user.facility.id)}`
                : '';
            const dispensingFacilityFilter = !req.user.isFacilityExempt
                ? { facility_id: req.user.facility.id } : {};
            const unitId = req.user.pharmacyUnit ? req.user.pharmacyUnit.id : null;

            const pendingCountQuery = sequelize.query(`
                SELECT COUNT(*) AS cnt
                FROM care_billing_bill_item bi
                INNER JOIN care_drugsandservices ds ON ds.item_id = bi.item_id
                WHERE ds.item_number IN ('MED', 'SUP')
                  AND bi.status     = 'paid'
                  AND bi.payment_id IS NOT NULL
                  AND bi.livrer     = 0
                  AND bi.date       >= ${sequelize.escape(PHARMACY_PENDING_CUTOFF_DATE)}
                  ${facilityFilterSql}
            `, { type: sequelize.QueryTypes.SELECT }).then(rows => parseInt(rows[0].cnt, 10));

            // Same shape as the cashier's embedded open-bills table — a
            // limited, newest-first list on the dashboard itself, with a
            // "view all" link to the full queue.
            const pendingListQuery = sequelize.query(`
                SELECT
                    bi.id, bi.bill_no, bi.article, bi.units, bi.qtealivrer,
                    b.date AS bill_date,
                    p.name_first, p.name_last, p.hospital_file_nr AS file_nr
                FROM care_billing_bill_item bi
                INNER JOIN care_drugsandservices ds ON ds.item_id = bi.item_id
                INNER JOIN care_billing_bill       b  ON b.bill_no = bi.bill_no
                LEFT  JOIN care_encounter          e  ON e.encounter_nr = bi.encounter_nr
                LEFT  JOIN care_person             p  ON p.pid = e.pid
                WHERE ds.item_number IN ('MED', 'SUP')
                  AND bi.status     = 'paid'
                  AND bi.payment_id IS NOT NULL
                  AND bi.livrer     = 0
                  AND bi.date       >= ${sequelize.escape(PHARMACY_PENDING_CUTOFF_DATE)}
                  ${facilityFilterSql}
                ORDER BY b.date DESC
                LIMIT 10
            `, { type: sequelize.QueryTypes.SELECT });

            const [pendingCount, pendingList, todayCount, monthCount, lowStock, outOfStock] = await Promise.all([
                pendingCountQuery,
                pendingListQuery,
                care_pharma_dispensing.count({
                    where: { dispensed_at: { [Op.gte]: today + ' 00:00:00' }, ...dispensingFacilityFilter },
                }),
                care_pharma_dispensing.count({
                    where: { dispensed_at: { [Op.gte]: monthStartStr + ' 00:00:00' }, ...dispensingFacilityFilter },
                }),
                unitId ? care_pharmacy_stock.count({ where: {
                    pharmacy_unit_id: unitId, is_active: 1,
                    reorder_level: { [Op.gt]: 0 },
                    quantity: { [Op.lte]: literal('`reorder_level`'), [Op.gt]: 0 },
                }}) : Promise.resolve(0),
                unitId ? care_pharmacy_stock.count({ where: {
                    pharmacy_unit_id: unitId, is_active: 1, quantity: 0,
                }}) : Promise.resolve(0),
            ]);
            pharmacyPendingCount    = pendingCount;
            pharmacyPendingList     = pendingList;
            pharmacyTodayCount      = todayCount;
            pharmacyMonthCount      = monthCount;
            pharmacyLowStockCount   = lowStock;
            pharmacyOutOfStockCount = outOfStock;

        } else {
            // Clinical staff: Doctor, Nurse, Receptionist
            const [facilR, patR, prxR, pendEncR, myEncR, openBR] = await Promise.allSettled([
                care_facilities.count(),
                care_person.count(),
                care_encounter_prescription.count({
                    where: {
                        status: 'active',
                        ...(!req.user.isFacilityExempt ? { facility_id: req.user.facility.id } : {}),
                    },
                }),
                care_encounter.count({
                    where: {
                        is_discharged:    0,
                        encounter_status: { [Op.in]: ['pending','active'] },
                        ...(userDeptNr ? { current_dept_nr: userDeptNr } : {}),
                        ...(!req.user.isFacilityExempt ? { facility_id: req.user.facility.id } : {}),
                    },
                }),
                care_encounter.count({
                    where: {
                        is_discharged:    0,
                        encounter_status: { [Op.in]: ['pending','active'] },
                        consulting_dr:    userFullName,
                        ...(!req.user.isFacilityExempt ? { facility_id: req.user.facility.id } : {}),
                    },
                }),
                care_billing_bill.count({
                    where: { status: { [Op.in]: ['open','partial'] }, ...billFacilityFilter },
                }),
            ]);
            if (facilR.status  === 'fulfilled') facilitiesCount          = facilR.value;
            if (patR.status    === 'fulfilled') totalPatientsCount       = patR.value;
            if (prxR.status    === 'fulfilled') activePrescriptionsCount = prxR.value;
            if (pendEncR.status=== 'fulfilled') pendingEncountersCount   = pendEncR.value;
            if (myEncR.status  === 'fulfilled') myEncountersCount        = myEncR.value;
            if (openBR.status  === 'fulfilled') openBillsCount           = openBR.value;
        }

        // ── Enrich open bills list with patient info ──────────────
        let enrichedOpenBills = [];
        if (openBillsList.length > 0) {
            const encNrs = [...new Set(openBillsList.map(b => b.encounter_nr))];
            const encs   = await care_encounter.findAll({
                where:      { encounter_nr: { [Op.in]: encNrs } },
                attributes: ['encounter_nr','pid'],
            });
            const pids = [...new Set(encs.map(e => e.pid))];
            const pats = pids.length ? await care_person.findAll({
                where:      { pid: { [Op.in]: pids } },
                attributes: ['pid','hospital_file_nr','name_first','name_last'],
            }) : [];
            const encMap = {}; encs.forEach(e => { encMap[e.encounter_nr] = e; });
            const patMap = {}; pats.forEach(p => { patMap[p.pid] = p; });
            enrichedOpenBills = openBillsList.map(b => {
                const enc = encMap[b.encounter_nr];
                const pat = enc ? patMap[enc.pid] : null;
                return { bill: b, pat };
            });
        }

        // Incoming referrals -- strictly for canSeeReferrals (Doctor/Nurse),
        // matching the same visibility rule as referralController.js.
        // Admin has no specific facility to receive referrals for (see
        // MULTI_FACILITY_IMPLEMENTATION_PLAN.md §5 item 9) -- guarded by
        // !isAdminUser below, so the query is skipped entirely for admin
        // rather than run with a null facility_id.
        //
        // Includes 'sent'/'accepted'/'seen' (every non-terminal status),
        // not just 'sent' -- an accepted referral still needs to be
        // marked seen, and a seen one still needs to be marked completed;
        // filtering to 'sent' alone would make a referral disappear from
        // view the moment it's accepted, with nowhere left to advance it.
        // incomingReferralsCount (the dashboard badge) counts only 'sent'
        // -- that's the number that actually needs someone's attention
        // first; accepted/seen ones are already being worked, not new.
        let incomingReferralsList = [];
        let incomingReferralsCount = 0;
        if (canSeeReferrals && !isAdminUser) {
            incomingReferralsList = await care_patient_referral.findAll({
                where: { to_facility_id: req.user.facility.id, status: { [Op.in]: ['sent', 'accepted', 'seen'] } },
                include: [
                    { model: care_person, as: 'patient', attributes: ['pid', 'name_first', 'name_last', 'hospital_file_nr'] },
                    { model: care_facilities, as: 'fromFacility', attributes: ['id', 'name'] },
                ],
                order: [['created_at', 'DESC']],
                limit: 20,
            });
            incomingReferralsCount = incomingReferralsList.filter(r => r.status === 'sent').length;
        }

        res.render('index', {
            title: 'Tableau de bord',
            // Role flags
            isCashierOnly,
            isBillingStaff,
            isPharmacyOnly,
            canSeeEncounterWorklist,
            canSeeReferrals,
            incomingReferralsList,
            incomingReferralsCount,
            // Clinical
            connectedUsersCount,
            facilitiesCount,
            totalPatientsCount,
            activePrescriptionsCount,
            pendingBillsCount,
            pendingEncountersCount,
            myEncountersCount,
            openBillsCount,
            recentActivity,
            // Billing-specific
            myPaidTodayCount,
            allPaidTodayCount,
            todayUnpaidCount,
            unpaidLast7,
            salesLast7,
            enrichedOpenBills,
            cashierName: userFullName,
            // Pharmacy-only specific
            pharmacyPendingCount,
            pharmacyPendingList,
            pharmacyTodayCount,
            pharmacyMonthCount,
            pharmacyLowStockCount,
            pharmacyOutOfStockCount,
            csrfToken: req.csrfToken(),
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('Error fetching dashboard data');
    }
};

// ── GET /billing/sales-report ─────────────────────────────────────
// Report grouped by department → item_number, with count + total paid
exports.salesReport = async (req, res) => {
    try {
        const locale     = req.locale || 'en';
        const userPerms  = req.user?.permissions || [];
        const isCashierOnly = userPerms.includes('Billing.Collect.Payment') &&
                              !userPerms.includes('Billing.Create.Bill');
        const userFullName  = (req.user?.firstName && req.user?.lastName)
            ? (req.user.firstName + ' ' + req.user.lastName).trim()
            : (req.user?.username || '');

        // Date range — default to today in LOCAL time (not UTC)
        const today = new Date(); today.setHours(0,0,0,0);
        const todayStr = today.getFullYear() + '-' +
            String(today.getMonth() + 1).padStart(2,'0') + '-' +
            String(today.getDate()).padStart(2,'0');

        const fromStr  = req.query.from || todayStr;
        const toStr    = req.query.to   || todayStr;
        // Appending T00:00:00 (no TZ suffix) forces LOCAL midnight parse
        const fromDt   = new Date(fromStr + 'T00:00:00');
        const toDtExcl = new Date(toStr   + 'T00:00:00');
        toDtExcl.setDate(toDtExcl.getDate() + 1); // exclusive: start of next day

        // Cashier filter — only their own payments
        const receivedByFilter = isCashierOnly
            ? `AND p.received_by = ${sequelize.escape(userFullName)}`
            : '';

        // Multi-Facility Billing scoping — same exemption as elsewhere.
        // req.user.facility is ALWAYS a truthy object; admins get
        // { id: null } specifically, so this must check `.id`, not just
        // the object's truthiness (see hasEncounterFacilityAccess's own
        // comment for the full explanation — this was the same live bug).
        const facilityFilter = !req.user.isFacilityExempt
            ? `AND p.facility_id = ${sequelize.escape(req.user.facility.id)}`
            : '';

        // Main report query:
        // payment → bill_item → drugsandservices → encounter → department
        const rows = await sequelize.query(
            `SELECT
               d.nr                                                   AS dept_nr,
               MAX(d.name_short)                                      AS dept_name,
               COALESCE(ds.item_number, bi.class)                     AS item_number,
               COALESCE(
                 MAX(CASE WHEN :locale = 'fr'
                          THEN ds.item_description
                          ELSE COALESCE(ds.item_description_en, ds.item_description)
                     END),
                 MAX(bi.article)
               )                                                      AS item_description,
               COUNT(bi.id)                                           AS item_count,
               SUM(bi.amount)                                         AS total_amount
             FROM care_billing_bill_payment p
             JOIN care_billing_bill_item bi
               ON  bi.bill_no = p.bill_no
               AND bi.status  = 'paid'
             JOIN care_encounter enc
               ON enc.encounter_nr = bi.encounter_nr
             LEFT JOIN care_department d
               ON d.nr = enc.current_dept_nr
             LEFT JOIN care_drugsandservices ds
               ON ds.item_id = bi.item_id
             WHERE p.payment_date >= :from
               AND p.payment_date <  :to
               ${receivedByFilter}
               ${facilityFilter}
             GROUP BY d.nr, COALESCE(ds.item_number, bi.class)
             ORDER BY dept_name ASC, item_number ASC`,
            {
                replacements: { from: fromDt, to: toDtExcl, locale },
                type: sequelize.QueryTypes.SELECT,
            }
        );

        // Group by department for the view
        const byDept = {};
        let grandTotal = 0;
        let grandCount = 0;
        rows.forEach(r => {
            const key  = r.dept_nr || 'other';
            const name = r.dept_name || (locale === 'fr' ? 'Autre' : 'Other');
            if (!byDept[key]) byDept[key] = { name, items: [], subtotal: 0, subcount: 0 };
            byDept[key].items.push(r);
            byDept[key].subtotal += Number(r.total_amount) || 0;
            byDept[key].subcount += Number(r.item_count)  || 0;
            grandTotal += Number(r.total_amount) || 0;
            grandCount += Number(r.item_count)   || 0;
        });

        res.render('billing/sales_report', {
            title:      locale === 'fr' ? 'Rapport des ventes' : 'Sales Report',
            activePage: 'billing',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            byDept, grandTotal, grandCount,
            fromStr, toStr,
            isCashierOnly,
            cashierName: userFullName,
        });
    } catch (err) {
        console.error('Sales report error:', err);
        res.status(500).send('Error generating report: ' + err.message);
    }
};














