
// controllers/billingController.js
'use strict';
const { Op, fn, col, literal } = require('sequelize');
const {
    care_billing_bill,
    care_billing_bill_item,
    care_billing_bill_final,
    care_billing_bill_payment,
    care_encounter,
    care_person,
} = require('../models');
const logActivity = require('../utils/activityLogger');
const { todayLocalStr, toLocalYearMonthStr } = require('../utils/dateHelpers');
const { getCurrentFacilityDetails } = require('../utils/facilityHelper');
const { hasEncounterFacilityAccess } = require('../utils/encounterFacilityCheck');

// ── Helpers ───────────────────────────────────────────────────────
const actorName = (user) =>
    (user.firstName && user.lastName)
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.username;

const fmtFCFA = (n) => {
    const num = Math.round(Number(n) || 0);
    return num.toLocaleString('fr-FR') + ' FCFA';
};

// Recalculate and persist bill + bill_final totals after any payment
async function recalcBill(billNo) {
    // Guard: never run on bill_no = 0 or invalid
    if (!billNo || billNo <= 0) {
        console.warn('recalcBill called with invalid billNo:', billNo);
        return { totalAmount: 0, paidAmount: 0, unpaidAmount: 0, billStatus: 'open' };
    }

    const items = await care_billing_bill_item.findAll({
        where: { bill_no: billNo },
        attributes: ['id', 'amount', 'status', 'insurance_pct'],
    });

    // Guard: if no items exist, leave bill status unchanged (do not mark paid)
    if (items.length === 0) {
        return { totalAmount: 0, paidAmount: 0, unpaidAmount: 0, billStatus: 'open' };
    }

    const totalAmount   = items.reduce((s, i) => s + (i.amount || 0), 0);
    const paidAmount    = items
        .filter(i => i.status === 'paid')
        .reduce((s, i) => s + (i.amount || 0), 0);
    const unpaidAmount  = totalAmount - paidAmount;

    // Use explicit checks — never rely on .every() on potentially empty arrays
    const paidCount   = items.filter(i => i.status === 'paid').length;
    const allPaid     = paidCount === items.length;
    const nonePaid    = paidCount === 0;
    const billStatus  = allPaid ? 'paid' : nonePaid ? 'open' : 'partial';

    await care_billing_bill.update(
        { amount: totalAmount, billgeneral: totalAmount, status: billStatus },
        { where: { bill_no: billNo } }
    );

    // Update or create bill_final
    const bill = await care_billing_bill.findByPk(billNo);
    const insurancePct   = bill ? (bill.insurance_pct || 0) : 0;
    const insuranceAmt   = Math.round(totalAmount * insurancePct / 100);
    const patientAmt     = totalAmount - insuranceAmt;

    const existing = await care_billing_bill_final.findOne({ where: { bill_no: billNo } });
    if (existing) {
        await existing.update({
            bill_amount:      totalAmount,
            receipt_amount:   paidAmount,
            amount_recieved:  paidAmount,
            amount_due:       unpaidAmount,
            patient_amount:   patientAmt,
            insurance_amount: insuranceAmt,
            status:           billStatus,
        });
    }
    return { totalAmount, paidAmount, unpaidAmount, billStatus };
}

// ── GET /billing/worklist ─────────────────────────────────────────
exports.worklist = async (req, res) => {
    try {
        const locale  = req.locale || 'en';
        const search  = (req.query.search || '').trim();
        const statusF = req.query.status || 'open'; // open | partial | paid | all

        // Bills with linked encounter + patient
        const billWhere = {};
        if (statusF !== 'all') {
            billWhere.status = statusF === 'unpaid'
                ? { [Op.in]: ['open', 'partial'] }
                : statusF;
        }
        // Multi-Facility Billing scoping — bills now carry their own
        // facility_id, so this filters directly rather than joining
        // through the encounter. System Administrators bypass this,
        // consistent with the exemption already established for
        // encounters. IMPORTANT: req.user.facility is ALWAYS a truthy
        // object ({ id, name }) — for admins specifically it's
        // { id: null }, never `null`/`undefined` itself (see
        // authController.js's finalizeSession) — so this must check
        // `.id` specifically, not just the object's truthiness. Checking
        // the object alone was a real, live bug: it never actually
        // detected the admin case, so admins were being blocked from
        // seeing any bills at all rather than exempted.
        if (!req.user.isFacilityExempt) {
            billWhere.facility_id = req.user.facility.id;
        }

        const bills = await care_billing_bill.findAll({
            where: billWhere,
            order: [['date', 'DESC']],
            limit: 100,
        });

        const encNrs   = [...new Set(bills.map(b => b.encounter_nr))];
        const encounters = encNrs.length ? await care_encounter.findAll({
            where: { encounter_nr: { [Op.in]: encNrs } },
            attributes: ['encounter_nr', 'pid', 'encounter_date'],
        }) : [];

        const pids    = [...new Set(encounters.map(e => e.pid))];
        let patients  = [];
        if (pids.length) {
            if (search) {
                const parts = search.split(/\s+/).filter(Boolean);
                const where = parts.length >= 2
                    ? { [Op.or]: [
                        { [Op.and]: [{ name_last:  { [Op.like]: '%' + parts[0] + '%' } },
                                     { name_first: { [Op.like]: '%' + parts[1] + '%' } }] },
                        { [Op.and]: [{ name_first: { [Op.like]: '%' + parts[0] + '%' } },
                                     { name_last:  { [Op.like]: '%' + parts[1] + '%' } }] },
                        { hospital_file_nr: { [Op.like]: '%' + search + '%' } },
                      ] }
                    : { [Op.or]: [
                        { name_last:        { [Op.like]: '%' + search + '%' } },
                        { name_first:       { [Op.like]: '%' + search + '%' } },
                        { hospital_file_nr: { [Op.like]: '%' + search + '%' } },
                      ] };
                patients = await care_person.findAll({
                    where: { pid: { [Op.in]: pids }, ...where },
                    attributes: ['pid', 'hospital_file_nr', 'name_first', 'name_last'],
                });
            } else {
                patients = await care_person.findAll({
                    where: { pid: { [Op.in]: pids } },
                    attributes: ['pid', 'hospital_file_nr', 'name_first', 'name_last'],
                });
            }
        }

        // Build lookup maps
        const encMap = {};
        encounters.forEach(e => { encMap[e.encounter_nr] = e; });
        const patMap = {};
        patients.forEach(p => { patMap[p.pid] = p; });

        // Filter bills by search if needed
        const pidSet = new Set(patients.map(p => p.pid));
        const filteredBills = search
            ? bills.filter(b => {
                const enc = encMap[b.encounter_nr];
                return enc && pidSet.has(enc.pid);
              })
            : bills;

        // Attach patient info to each bill
        const enrichedBills = filteredBills.map(b => {
            const enc = encMap[b.encounter_nr] || null;
            const pat = enc ? patMap[enc.pid] : null;
            return { bill: b, enc, pat };
        });

        // Counts for status tabs — same facility filter as the main query
        const facilityFilter = !req.user.isFacilityExempt ? { facility_id: req.user.facility.id } : {};
        const [openCount, partialCount, paidCount] = await Promise.all([
            care_billing_bill.count({ where: { status: 'open', ...facilityFilter } }),
            care_billing_bill.count({ where: { status: 'partial', ...facilityFilter } }),
            care_billing_bill.count({ where: { status: 'paid', ...facilityFilter } }),
        ]);

        // Summary cards (ported from the finances/payments mockup) — same
        // WAT-safe date-boundary pattern already established elsewhere in
        // this app (see pharmacyController.dashboard): plain date strings
        // compared directly, never `new Date(dateString)` for a boundary.
        const today = todayLocalStr();
        const monthStartStr = toLocalYearMonthStr(new Date()) + '-01';
        const [todaySum, monthSum, pendingSum] = await Promise.all([
            care_billing_bill_payment.sum('payment_amount_total', {
                where: { payment_date: { [Op.gte]: today + ' 00:00:00' }, ...facilityFilter },
            }),
            care_billing_bill_payment.sum('payment_amount_total', {
                where: { payment_date: { [Op.gte]: monthStartStr + ' 00:00:00' }, ...facilityFilter },
            }),
            care_billing_bill_final.sum('amount_due', {
                where: { status: { [Op.in]: ['open', 'partial'] }, ...facilityFilter },
            }),
        ]);
        const todayTotal   = todaySum   || 0;
        const monthTotal   = monthSum   || 0;
        const pendingTotal = pendingSum || 0;

        res.render('billing/worklist', {
            title:      locale === 'fr' ? 'File de facturation' : 'Billing Worklist',
            activePage: 'finances',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            enrichedBills,
            search,
            statusF,
            openCount,
            partialCount,
            paidCount,
            todayTotal,
            monthTotal,
            pendingTotal,
        });
    } catch (err) {
        console.error('Billing worklist error:', err);
        res.status(500).send('Error loading billing worklist: ' + err.message);
    }
};

// ── GET /billing/bill/:bill_no ────────────────────────────────────
exports.billDetail = async (req, res) => {
    try {
        const locale  = req.locale || 'en';
        const billNo  = parseInt(req.params.bill_no, 10);
        if (isNaN(billNo)) return res.status(400).send('Invalid bill number.');

        const bill = await care_billing_bill.findByPk(billNo);
        if (!bill) return res.status(404).send('Bill not found.');
        if (!hasEncounterFacilityAccess(req, bill)) {
            return res.status(403).send(
                locale === 'fr'
                    ? 'Cette facture appartient a un autre etablissement.'
                    : 'This bill belongs to a different facility.');
        }

        const items = await care_billing_bill_item.findAll({
            where: { bill_no: billNo },
            order: [['id', 'ASC']],
        });

        const enc = await care_encounter.findOne({
            where: { encounter_nr: bill.encounter_nr },
            attributes: ['encounter_nr', 'pid', 'encounter_date',
                         'consulting_dr', 'encounter_status'],
        });

        const patient = enc ? await care_person.findByPk(enc.pid, {
            attributes: ['pid', 'hospital_file_nr', 'name_first', 'name_last',
                         'date_birth', 'sex'],
        }) : null;

        const billFinal = await care_billing_bill_final.findOne({
            where: { bill_no: billNo },
        });

        const payments = await care_billing_bill_payment.findAll({
            where: { bill_no: billNo },
            order: [['payment_date', 'DESC']],
        });

        // Totals
        const totalAmount  = items.reduce((s, i) => s + (i.amount || 0), 0);
        const paidAmount   = items.filter(i => i.status === 'paid')
                                  .reduce((s, i) => s + (i.amount || 0), 0);
        const unpaidAmount = totalAmount - paidAmount;
        const insurancePct = bill.insurance_pct || 0;
        const insuranceAmt = Math.round(unpaidAmount * insurancePct / 100);
        const patientDue   = unpaidAmount - insuranceAmt;

        res.render('billing/bill_detail', {
            title:      (locale === 'fr' ? 'Facture #' : 'Bill #') + billNo,
            activePage: 'finances',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            bill, items, enc, patient, billFinal, payments,
            totalAmount, paidAmount, unpaidAmount,
            insurancePct, insuranceAmt, patientDue,
            fmtFCFA,
        });
    } catch (err) {
        console.error('Bill detail error:', err);
        res.status(500).send('Error loading bill: ' + err.message);
    }
};

// ── POST /billing/bill/:bill_no/pay ───────────────────────────────
// Body: { item_ids: [1,2,3], payment_mode: 'cash', payment_cash_amount: 5000 }
exports.collectPayment = async (req, res) => {
    try {
        const locale    = req.locale || 'en';
        const billNo    = parseInt(req.params.bill_no, 10);
        const actor     = actorName(req.user);

        const bill = await care_billing_bill.findByPk(billNo);
        if (!bill) return res.status(404).json({ ok: false, error: 'Bill not found' });
        if (!hasEncounterFacilityAccess(req, bill)) {
            return res.status(403).json({ ok: false, error: 'This bill belongs to a different facility.' });
        }

        const {
            item_ids,
            payment_mode,
            payment_cash_amount,
            payment_cheque_no,
            payment_cheque_amount,
            payment_creditcard_no,
            payment_creditcard_amount,
        } = req.body;

        // Normalise item_ids to array of integers
        const ids = (Array.isArray(item_ids) ? item_ids : [item_ids])
            .map(id => parseInt(id, 10))
            .filter(id => !isNaN(id));

        if (ids.length === 0) {
            return res.status(400).json({ ok: false, error: 'No items selected.' });
        }

        // Fetch selected items
        const items = await care_billing_bill_item.findAll({
            where: { id: { [Op.in]: ids }, bill_no: billNo, status: 'open' },
        });

        if (items.length === 0) {
            return res.status(400).json({ ok: false, error: 'No open items found for selection.' });
        }

        const totalPaid = items.reduce((s, i) => s + (i.amount || 0), 0);

        // Cashier can only use cash — enforce
        const userPerms = req.user?.permissions || [];
        const isCashier = userPerms.includes('Billing.Collect.Payment') &&
                         !userPerms.includes('Billing.Create.Bill');
        const mode = isCashier ? 'cash' : (payment_mode || 'cash');

        // Create payment record
        const payment = await care_billing_bill_payment.create({
            payment_encounter_nr:   bill.encounter_nr,
            facility_id:            bill.facility_id,
            bill_no:                billNo,
            payment_receipt_no:     0,  // updated to payment_id after creation
            payment_mode:           mode,
            payment_date:           new Date(),
            payment_cash_amount:    mode === 'cash'   ? totalPaid : 0,
            payment_cheque_no:      payment_cheque_no || 0,
            payment_cheque_amount:  payment_cheque_amount || 0,
            payment_creditcard_no:  payment_creditcard_no || 0,
            payment_creditcard_amount: payment_creditcard_amount || 0,
            payment_amount_total:   totalPaid,
            received_by:            actor,
            status:                 'completed',
        });

        const paymentId = payment.payment_id;
        // Use the auto-increment PK as the unique receipt number
        await payment.update({ payment_receipt_no: paymentId });

        // Mark selected items as paid and link to payment
        // Include bill_no in WHERE for extra safety — prevents accidental cross-bill updates
        await care_billing_bill_item.update(
            { status: 'paid', payment_id: paymentId },
            { where: { id: { [Op.in]: ids }, bill_no: billNo } }
        );

        // Recalculate bill totals + update/create bill_final
        const { totalAmount, paidAmount, unpaidAmount, billStatus } =
            await recalcBill(billNo);

        // Create or update bill_final
        const insurancePct = bill.insurance_pct || 0;
        const insuranceAmt = Math.round(totalAmount * insurancePct / 100);
        const patientAmt   = totalAmount - insuranceAmt;

        const existing = await care_billing_bill_final.findOne({ where: { bill_no: billNo } });
        if (!existing) {
            await care_billing_bill_final.create({
                encounter_nr:     bill.encounter_nr,
                facility_id:      bill.facility_id,
                bill_no:          billNo,
                date:             new Date(),
                bill_amount:      totalAmount,
                discount:         0,
                receipt_amount:   paidAmount,
                patient_amount:   patientAmt,
                insurance_amount: insuranceAmt,
                amount_due:       unpaidAmount,
                amount_recieved:  paidAmount,
                agent:            actor,
                status:           billStatus,
                fact:             0,
            });
        } else {
            await existing.update({
                bill_amount:     totalAmount,
                receipt_amount:  paidAmount,
                amount_recieved: paidAmount,
                amount_due:      unpaidAmount,
                status:          billStatus,
            });
        }

        await logActivity(req,
            `Payment #${paymentId} collected on Bill #${billNo} — ${fmtFCFA(totalPaid)} by ${actor}`,
            true, 'billingController.js', req.user.user_id, req.user.username);

        res.json({
            ok: true,
            paymentId,
            billStatus,
            totalPaid,
            paidAmount,
            unpaidAmount,
            receiptUrl: `/billing/receipt/${paymentId}`,
        });
    } catch (err) {
        console.error('Collect payment error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── GET /billing/receipt/:payment_id ─────────────────────────────
exports.receipt = async (req, res) => {
    try {
        const locale    = req.locale || 'en';
        const paymentId = parseInt(req.params.payment_id, 10);
        if (isNaN(paymentId)) return res.status(400).send('Invalid payment ID.');

        const payment = await care_billing_bill_payment.findByPk(paymentId);
        if (!payment) return res.status(404).send('Payment not found.');
        if (!hasEncounterFacilityAccess(req, payment)) {
            return res.status(403).send(
                locale === 'fr'
                    ? 'Ce recu appartient a un autre etablissement.'
                    : 'This receipt belongs to a different facility.');
        }

        const items = await care_billing_bill_item.findAll({
            where: { payment_id: paymentId },
            order: [['id', 'ASC']],
        });

        const bill = await care_billing_bill.findByPk(payment.bill_no);
        const enc  = bill ? await care_encounter.findOne({
            where: { encounter_nr: bill.encounter_nr },
            attributes: ['encounter_nr', 'pid', 'encounter_date', 'consulting_dr'],
        }) : null;
        const patient = enc ? await care_person.findByPk(enc.pid, {
            attributes: ['pid', 'hospital_file_nr', 'name_first', 'name_last', 'date_birth'],
        }) : null;

        const facility = await getCurrentFacilityDetails(req);

        res.render('billing/receipt', {
            title:    (locale === 'fr' ? 'Reçu #' : 'Receipt #') + paymentId,
            user:     req.user,
            payment, items, bill, enc, patient, fmtFCFA,
            facility,
            printMode: true,
        });
    } catch (err) {
        console.error('Receipt error:', err);
        res.status(500).send('Error loading receipt: ' + err.message);
    }
};

// ── GET /billing/dashboard-data ───────────────────────────────────
// JSON endpoint for dashboard bills tab
exports.dashboardBills = async (req, res) => {
    try {
        const userPerms = req.user?.permissions || [];
        const canSeeBilling = userPerms.includes('Billing.Collect.Payment') ||
                              userPerms.includes('Billing.Create.Bill')  ||
                              userPerms.includes('Billing.Read.Bill');
        if (!canSeeBilling) return res.json({ ok: true, bills: [] });

        const bills = await care_billing_bill.findAll({
            where: {
                status: { [Op.in]: ['open', 'partial'] },
                ...(!req.user.isFacilityExempt ? { facility_id: req.user.facility.id } : {}),
            },
            order: [['date', 'DESC']],
            limit: 50,
        });

        const encNrs = [...new Set(bills.map(b => b.encounter_nr))];
        const encounters = encNrs.length ? await care_encounter.findAll({
            where: { encounter_nr: { [Op.in]: encNrs } },
            attributes: ['encounter_nr', 'pid'],
        }) : [];
        const pids = [...new Set(encounters.map(e => e.pid))];
        const patients = pids.length ? await care_person.findAll({
            where: { pid: { [Op.in]: pids } },
            attributes: ['pid', 'hospital_file_nr', 'name_first', 'name_last'],
        }) : [];

        const encMap = {};
        encounters.forEach(e => { encMap[e.encounter_nr] = e; });
        const patMap = {};
        patients.forEach(p => { patMap[p.pid] = p; });

        const result = bills.map(b => {
            const enc = encMap[b.encounter_nr];
            const pat = enc ? patMap[enc.pid] : null;
            return {
                bill_no:      b.bill_no,
                encounter_nr: b.encounter_nr,
                amount:       b.amount,
                status:       b.status,
                date:         b.date,
                patient_name: pat ? pat.name_last + ', ' + pat.name_first : '-',
                file_nr:      pat ? pat.hospital_file_nr : '-',
            };
        });

        res.json({ ok: true, bills: result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── GET /billing/sales-report ────────────────────────────────────
// Delegated to dashboardController.salesReport
exports.salesReport = require('./dashboardController').salesReport;

// ── GET /billing/bill/:bill_no/items-json ────────────────────────
// JSON endpoint: returns items for a bill (for dashboard detail pane)
exports.billItemsJson = async (req, res) => {
    try {
        const billNo = parseInt(req.params.bill_no, 10);
        const bill   = await care_billing_bill.findByPk(billNo);
        if (!bill) return res.status(404).json({ ok: false, error: 'Not found' });
        if (!hasEncounterFacilityAccess(req, bill)) {
            return res.status(403).json({ ok: false, error: 'This bill belongs to a different facility.' });
        }

        const items = await care_billing_bill_item.findAll({
            where: { bill_no: billNo },
            order: [['id', 'ASC']],
            attributes: ['id', 'article', 'unit_cost', 'units', 'amount',
                         'status', 'class', 'billtype', 'date', 'payment_id'],
        });

        const payments = await care_billing_bill_payment.findAll({
            where: { bill_no: billNo },
            attributes: ['payment_id', 'payment_date', 'payment_amount_total',
                         'payment_mode', 'received_by', 'status'],
        });

        res.json({ ok: true, bill: {
            bill_no:       bill.bill_no,
            encounter_nr:  bill.encounter_nr,
            amount:        bill.amount,
            status:        bill.status,
            insurance_pct: bill.insurance_pct,
        }, items, payments });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};








