
// controllers/prescriptionController.js
'use strict';
const { Op } = require('sequelize');
const {
    care_encounter,
    care_encounter_prescription,
    care_person,
    care_drugsandservices,
    care_billing_bill,
    care_billing_bill_item,
    care_billing_bill_final,
    care_department,
} = require('../models');
const logActivity = require('../utils/activityLogger');
const { hasEncounterFacilityAccess } = require('../utils/encounterFacilityCheck');

// ── Helpers ───────────────────────────────────────────────────────
const actorName = (user) =>
    (user.firstName && user.lastName)
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.username;

// ── GET /prescriptions/encounter/:enc_nr ─────────────────────────
// Prescription form — only accessible when encounter is active
exports.prescribeForm = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        // Confirmed 2026-08-07: prescribing is gated by
        // Pharmacy.Create.Prescription — held by Doctor and (deliberately
        // granted) Billing Clerk for insurance/claim purposes. No other
        // role should reach this. This was previously enforced only by
        // hiding the button client-side, with no server-side check at
        // all — any authenticated user could call this directly.
        if (!req.user.permissions.includes('Pharmacy.Create.Prescription') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).send(
                locale === 'fr' ? 'Permission refusee.' : 'Permission denied.');

        const encNr  = parseInt(req.params.enc_nr, 10);
        if (isNaN(encNr)) return res.status(400).send('Invalid encounter number.');

        const encounter = await care_encounter.findByPk(encNr, {
            include: [{ model: care_department, as: 'department',
                        attributes: ['nr','name_short','name_formal'], required: false }],
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
                         'date_birth','sex','blood_group'],
        });

        // Existing prescriptions for this encounter
        const existing = await care_encounter_prescription.findAll({
            where: { encounter_nr: encNr, is_stopped: 0 },
            order: [['create_time','DESC']],
        });

        // Items for search — load on demand via JSON endpoint, not here
        res.render('prescriptions/form', {
            title:      locale === 'fr' ? 'Nouvelle prescription' : 'New Prescription',
            activePage: 'worklist',
            user:       req.user,
            csrfToken:  req.csrfToken(),
            encounter, patient, existing,
        });
    } catch (err) {
        console.error('Prescription form error:', err);
        res.status(500).send('Error: ' + err.message);
    }
};

// ── GET /prescriptions/search ─────────────────────────────────────
// JSON — search care_drugsandservices, returns items matching query
exports.searchItems = async (req, res) => {
    try {
        const q      = (req.query.q || '').trim();
        const locale = req.locale || 'en';
        if (q.length < 2) return res.json({ ok: true, items: [] });

        const items = await care_drugsandservices.findAll({
            where: {
                [Op.or]: [
                    { item_description:    { [Op.like]: '%' + q + '%' } },
                    { item_description_en: { [Op.like]: '%' + q + '%' } },
                    { item_number:         { [Op.like]: '%' + q + '%' } },
                ],
            },
            attributes: ['item_id','item_number','item_description','item_description_en',
                         'unit_price_dec','unit_price_2_dec','purchasing_class',
                         'is_pediatric','is_adult'],
            order: [['item_description','ASC']],
            limit: 30,
        });

        const result = items.map(i => ({
            item_id:      i.item_id,
            item_number:  i.item_number,
            description:  locale === 'fr'
                ? i.item_description
                : (i.item_description_en || i.item_description),
            drug_class:   i.purchasing_class || '',
            price:        parseFloat(i.unit_price_dec)   || 0,
            price_ins:    parseFloat(i.unit_price_2_dec) || 0,
        }));

        res.json({ ok: true, items: result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── POST /prescriptions/encounter/:enc_nr ────────────────────────
// Submit cart — creates prescription rows + bill + bill_items
// Body: { items: [ { item_id, dosage, application_type_nr, notes, units } ] }
exports.submitPrescription = async (req, res) => {
    try {
        const locale  = req.locale || 'en';
        const encNr   = parseInt(req.params.enc_nr, 10);
        const actor   = actorName(req.user);

        if (!req.user.permissions.includes('Pharmacy.Create.Prescription') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        if (isNaN(encNr)) return res.status(400).json({ ok: false, error: 'Invalid encounter.' });

        const encounter = await care_encounter.findByPk(encNr);
        if (!encounter) return res.status(404).json({ ok: false, error: 'Encounter not found.' });
        if (!hasEncounterFacilityAccess(req, encounter)) {
            return res.status(403).json({ ok: false, error: 'This encounter belongs to a different facility.' });
        }
        if (encounter.is_discharged || encounter.encounter_status === 'closed') {
            return res.status(400).json({ ok: false, error: 'Encounter is closed.' });
        }

        const { items } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ ok: false, error: 'No items submitted.' });
        }

        // Validate required fields — only item_id is strictly required
        for (const item of items) {
            if (!item.item_id) return res.status(400).json({ ok: false, error: 'item_id required.' });
        }

        // Merge duplicate item_id lines into one before anything else is built.
        // The cart UI already avoids adding the same drug twice, but this is the
        // authoritative guarantee — without it, prescribing the same drug via two
        // cart lines (e.g. a morning + evening dose) would create two bill_items
        // with identical article text in the same bill, and stopPrescription's
        // lookup (by description text, not a stable ID) would then be ambiguous
        // about which line's charge to remove. Merging here means there is only
        // ever at most one bill_item — and one prescription row — per drug per
        // submission, so that lookup can never be ambiguous. See PROJECT_BRIEF.md
        // §5 for the full history of this fix.
        const mergedByItemId = {};
        const mergedOrder    = [];
        for (const item of items) {
            const key = parseInt(item.item_id, 10);
            const addUnits = Math.max(1, parseInt(item.units, 10) || 1);
            const noteText = String(item.notes || '').trim();
            if (!mergedByItemId[key]) {
                mergedByItemId[key] = {
                    item_id: key,
                    units: addUnits,
                    dosage: item.dosage,
                    application_type_nr: item.application_type_nr,
                    notesParts: noteText ? [noteText] : [],
                };
                mergedOrder.push(key);
            } else {
                const m = mergedByItemId[key];
                const sameDosage = String(item.dosage) === String(m.dosage) &&
                                   String(item.application_type_nr) === String(m.application_type_nr);
                m.units += addUnits;
                if (noteText) {
                    m.notesParts.push(sameDosage ? noteText
                        : ('[' + (item.dosage || '') + '/' + (item.application_type_nr || '') + '] ' + noteText));
                }
            }
        }
        const mergedItems = mergedOrder.map(key => {
            const m = mergedByItemId[key];
            return {
                item_id: m.item_id,
                units: m.units,
                dosage: m.dosage,
                application_type_nr: m.application_type_nr,
                notes: m.notesParts.join(' | '),
            };
        });

        // Load drugsandservices for all item_ids
        const itemIds = mergedItems.map(i => parseInt(i.item_id, 10));
        const drugs   = await care_drugsandservices.findAll({
            where: { item_id: { [Op.in]: itemIds } },
        });
        const drugMap = {};
        drugs.forEach(d => { drugMap[d.item_id] = d; });

        const hasInsurance = encounter.insurance_pct > 0;
        const isOutpatient = encounter.encounter_class_nr !== 2;

        // ── Create a new bill for this prescription batch ─────────
        let totalAmount = 0;
        const billItemsData = [];

        for (const item of mergedItems) {
            const drug   = drugMap[parseInt(item.item_id, 10)];
            if (!drug) continue;

            const units  = Math.max(1, parseInt(item.units, 10) || 1);
            const price  = hasInsurance
                ? (parseFloat(drug.unit_price_2_dec) || parseFloat(drug.unit_price_dec) || 0)
                : (parseFloat(drug.unit_price_dec) || 0);
            const amount = Math.round(price * units);
            totalAmount += amount;

            const descr = locale === 'fr'
                ? drug.item_description
                : (drug.item_description_en || drug.item_description);

            billItemsData.push({ drug, units, price, amount, descr, item });
        }

        const bill = await care_billing_bill.create({
            encounter_nr:          encNr,
            facility_id:           encounter.facility_id,
            date:                  new Date(),
            amount:                totalAmount,
            billgeneral:           totalAmount,
            insurance_provider_id: hasInsurance ? (encounter.insurance_provider_id || null) : null,
            insurance_pct:         hasInsurance ? (encounter.bonpercent || 0) : 0,
            agent:                 actor,
            status:                'open',
        });
        const billNo = bill.bill_no;

        // ── Create bill_items + prescription rows ─────────────────
        const prxRows = [];
        for (const bd of billItemsData) {
            const { drug, units, price, amount, descr, item } = bd;

            // Bill item
            const billItem = await care_billing_bill_item.create({
                encounter_nr:  encNr,
                facility_id:   encounter.facility_id,
                code:          drug.item_id,
                item_id:       drug.item_id,
                article:       descr,
                unit_cost:     Math.round(price),
                units,
                amount,
                date:          new Date(),
                status:        'open',
                bill_no:       billNo,
                islab:         0,
                labpr:         0,
                class:         drug.purchasing_class || '',
                qtealivrer:    units,
                qtelivree:     0,
                livrer:        0,
                billtype:      'prescription',
                societe:       hasInsurance ? (encounter.insurance_firm || '') : '',
                percent:       hasInsurance ? (encounter.bonpercent || 0) : 0,
                down:          0,
                insurance_pct: hasInsurance ? (encounter.bonpercent || 0) : 0,
            });

            // Prescription row
            const prx = await care_encounter_prescription.create({
                encounter_nr:              encNr,
                facility_id:               encounter.facility_id,
                prescription_type_nr:      0,
                article:                   descr,
                article_item_number:       String(drug.item_number || drug.item_id),
                price:                     String(Math.round(amount)),
                drug_class:                drug.purchasing_class || '',
                order_nr:                  0,
                dosage:                    parseInt(item.dosage, 10) || 0,
                application_type_nr:       parseInt(item.application_type_nr, 10) || 0,
                notes:                     item.notes || '',
                prescribe_date:            new Date(),
                prescriber:                actor,
                color_marker:              '',
                is_stopped:                0,
                is_outpatient_prescription: isOutpatient ? 1 : 0,
                is_disabled:               null,
                stop_date:                 null,
                status:                    'active',
                history:                   `[${new Date().toISOString()}] Prescribed by ${actor}`,
                bill_number:               billNo,
                bill_status:               'open',
                modify_id:                 actor,
                modify_time:               new Date(),
                create_id:                 actor,
                create_time:               new Date(),
                bon:                       0,
                livrer:                    0,
                caution:                   0,
            });
            prxRows.push(prx);
        }

        await logActivity(req,
            `Prescription submitted Enc#${encNr} — Bill#${billNo} — ${billItemsData.length} item(s) — ${totalAmount} FCFA by ${actor}`,
            true, 'prescriptionController.js', req.user.user_id, req.user.username);

        res.json({
            ok: true,
            bill_no:    billNo,
            item_count: prxRows.length,
            total:      totalAmount,
            redirect:   '/patients/' + encounter.pid + '/record?tab=prx',
        });
    } catch (err) {
        console.error('Submit prescription error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// ── POST /prescriptions/:prx_nr/stop ─────────────────────────────
// Stop a prescription item and remove its bill item
exports.stopPrescription = async (req, res) => {
    try {
        const prxNr = parseInt(req.params.prx_nr, 10);
        const actor = actorName(req.user);

        if (!req.user.permissions.includes('Pharmacy.Create.Prescription') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });

        const prx = await care_encounter_prescription.findByPk(prxNr);
        if (!prx) return res.status(404).json({ ok: false, error: 'Prescription not found.' });
        if (!hasEncounterFacilityAccess(req, prx)) {
            return res.status(403).json({ ok: false, error: 'This encounter belongs to a different facility.' });
        }
        if (prx.is_stopped) return res.json({ ok: true, already: true });

        // Only remove bill item if it is still open (not yet paid)
        let removedBillItem = false;
        if (prx.bill_number && prx.bill_number > 0) {
            // Find the matching bill item: same bill_no + same item description + status open.
            // This match is safe from ambiguity because submitPrescription merges
            // duplicate item_id cart lines into a single bill_item before creating
            // anything — a bill can never contain two lines with identical article
            // text, so this lookup always resolves to at most one row. (Previously
            // it could match either of two identical lines if the same drug was
            // prescribed twice in one submission — fixed at the source, not here.)
            const billItem = await care_billing_bill_item.findOne({
                where: {
                    bill_no:     prx.bill_number,
                    encounter_nr: prx.encounter_nr,
                    article:     prx.article,
                    status:      'open',
                },
            });
            if (billItem) {
                await billItem.destroy();
                removedBillItem = true;

                // Recalculate bill total
                const remaining = await care_billing_bill_item.findAll({
                    where: { bill_no: prx.bill_number },
                    attributes: ['amount', 'status'],
                });
                if (remaining.length === 0) {
                    // No items left — void the bill
                    await care_billing_bill.update(
                        { amount: 0, billgeneral: 0, status: 'void' },
                        { where: { bill_no: prx.bill_number } }
                    );
                    // Sync bill_final so billing tab shows correct totals
                    const bf0 = await care_billing_bill_final.findOne({ where: { bill_no: prx.bill_number } });
                    if (bf0) await bf0.update({ bill_amount: 0, amount_due: 0, status: 'void' });
                } else {
                    const newTotal   = remaining.reduce((s, i) => s + (i.amount || 0), 0);
                    const paidAmount = remaining.filter(i => i.status === 'paid')
                                                .reduce((s, i) => s + (i.amount || 0), 0);
                    const paidCount  = remaining.filter(i => i.status === 'paid').length;
                    const allPaid    = remaining.length > 0 && paidCount === remaining.length;
                    const nonePaid   = paidCount === 0;
                    const newStatus  = allPaid ? 'paid' : nonePaid ? 'open' : 'partial';
                    await care_billing_bill.update(
                        { amount: newTotal, billgeneral: newTotal, status: newStatus },
                        { where: { bill_no: prx.bill_number } }
                    );
                    // Sync bill_final so billing tab shows correct totals
                    const bf = await care_billing_bill_final.findOne({ where: { bill_no: prx.bill_number } });
                    if (bf) {
                        await bf.update({
                            bill_amount:     newTotal,
                            amount_due:      newTotal - paidAmount,
                            amount_recieved: paidAmount,
                            status:          newStatus,
                        });
                    }
                }
            }
        }

        // Mark prescription stopped
        await prx.update({
            is_stopped:  1,
            stop_date:   new Date(),
            status:      'stopped',
            bill_status: removedBillItem ? 'removed' : prx.bill_status,
            modify_id:   actor,
            modify_time: new Date(),
            history:     (prx.history || '') +
                `\n[${new Date().toISOString()}] Stopped by ${actor}`,
        });

        await logActivity(req,
            `Prescription #${prxNr} stopped by ${actor}` +
            (removedBillItem ? ` — bill item removed from Bill#${prx.bill_number}` : ''),
            true, 'prescriptionController.js', req.user.user_id, req.user.username);

        res.json({ ok: true, removedBillItem });
    } catch (err) {
        console.error('Stop prescription error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
};












