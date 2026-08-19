// controllers/reimbursementController.js
'use strict';
const { Op }      = require('sequelize');
const path        = require('path');
const fs          = require('fs');
const logActivity = require('../utils/activityLogger');
const {
    care_wh_reimbursement_requests,
    care_wh_reimb_receipts,
    care_wh_purchase_orders,
    care_wh_suppliers,
} = require('../models');

const actor = (u) => (u && u.firstName && u.lastName)
    ? (u.firstName + ' ' + u.lastName).trim()
    : (u && u.username) || 'unknown';

const fmtFCFA = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

// Auto-generate RMB-YYYYNNNN
const generateNumber = async () => {
    const year   = new Date().getFullYear();
    const prefix = 'RMB-' + year;
    const last   = await care_wh_reimbursement_requests.findOne({
        where: { request_number: { [Op.like]: prefix + '%' } },
        order: [['reimb_id','DESC']], attributes: ['request_number'],
    });
    let seq = 1;
    if (last) {
        const n = parseInt(last.request_number.slice(prefix.length), 10);
        if (!isNaN(n)) seq = n + 1;
    }
    return prefix + String(seq).padStart(4, '0');
};

// ══════════════════════════════════════════════════════════════════
// LIST
// ══════════════════════════════════════════════════════════════════
exports.listReimbursements = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        const status = req.query.status || '';
        const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
        const PER    = 25;
        const where  = status ? { status } : {};

        const { count, rows: reqs } = await care_wh_reimbursement_requests.findAndCountAll({
            where,
            include: [{ model: care_wh_purchase_orders, as: 'po',
                attributes: ['po_number','supplier_id','total_amount'],
                include:    [{ model: care_wh_suppliers, as: 'supplier', attributes: ['name'] }],
                required: false }],
            order:  [['reimb_id','DESC']],
            limit:  PER,
            offset: (page - 1) * PER,
        });

        // Status counts for tabs
        const statusCounts = await care_wh_reimbursement_requests.findAll({
            attributes: ['status', [require('sequelize').fn('COUNT','*'), 'cnt']],
            group: ['status'], raw: true,
        });
        const countMap = {};
        statusCounts.forEach(r => { countMap[r.status] = parseInt(r.cnt, 10); });

        res.render('finances/reimbursements/list', {
            title:      locale === 'fr' ? 'Remboursements' : 'Reimbursements',
            activePage: 'finances',
            user: req.user, csrfToken: req.csrfToken(),
            reqs, totalCount: count,
            totalPages: Math.ceil(count / PER), currentPage: page,
            statusFilter: status, countMap, fmtFCFA,
        });
    } catch (err) {
        console.error('List reimbursements error:', err);
        res.status(500).send('Error: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════
// CREATE FORM
// ══════════════════════════════════════════════════════════════════
exports.createForm = async (req, res) => {
    try {
        const locale = req.locale || 'en';
        // Pre-fill from a PO if po_id query param given
        const poId = parseInt(req.query.po_id, 10) || null;
        let po = null;
        if (poId) {
            po = await care_wh_purchase_orders.findByPk(poId, {
                include: [{ model: care_wh_suppliers, as: 'supplier', attributes: ['name'] }],
                attributes: ['po_id','po_number','total_amount','status'],
            });
        }
        // Get all approved/received POs not yet fully reimbursed
        const eligiblePos = await care_wh_purchase_orders.findAll({
            where: { status: { [Op.in]: ['approved','sent','partial','received','closed'] } },
            include: [{ model: care_wh_suppliers, as: 'supplier', attributes: ['name'] }],
            order:   [['create_time','DESC']],
            attributes: ['po_id','po_number','total_amount'],
        });

        res.render('finances/reimbursements/form', {
            title:      locale === 'fr' ? 'Nouvelle demande de remboursement' : 'New Reimbursement Request',
            activePage: 'finances',
            user: req.user, csrfToken: req.csrfToken(),
            prefilledPo: po, eligiblePos, errors: [], fmtFCFA,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// CREATE POST
// ══════════════════════════════════════════════════════════════════
exports.createReimbursement = async (req, res) => {
    const locale = req.locale || 'en';
    const { po_id, amount, reason, purchase_description, notes } = req.body;
    const uploadedFiles = req.files || [];

    const errors = [];
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) errors.push(locale === 'fr' ? 'Montant invalide.' : 'Invalid amount.');
    if (!po_id && !purchase_description)
        errors.push(locale === 'fr'
            ? 'Décrivez l\'achat ou sélectionnez un bon de commande.'
            : 'Describe the purchase or select a purchase order.');

    if (errors.length) {
        const eligiblePos = await care_wh_purchase_orders.findAll({
            where: { status: { [Op.in]: ['approved','sent','partial','received','closed'] } },
            include: [{ model: care_wh_suppliers, as: 'supplier', attributes: ['name'] }],
            order:   [['create_time','DESC']], attributes: ['po_id','po_number','total_amount'],
        });
        return res.render('finances/reimbursements/form', {
            title: locale === 'fr' ? 'Nouvelle demande de remboursement' : 'New Reimbursement Request',
            activePage: 'finances', user: req.user, csrfToken: req.csrfToken(),
            prefilledPo: null, eligiblePos, errors, fmtFCFA,
        });
    }

    try {
        const number = await generateNumber();
        const reimb  = await care_wh_reimbursement_requests.create({
            request_number:       number,
            po_id:                po_id ? parseInt(po_id, 10) : null,
            purchase_description: purchase_description ? purchase_description.trim() : null,
            amount:               amt,
            total_amount:         amt,
            reason:               reason ? reason.trim() : null,
            notes:                notes  ? notes.trim()  : null,
            status:               'pending',
            created_by:           actor(req.user),
            create_time:          new Date(),
        });

        // Save uploaded receipts
        for (const file of uploadedFiles) {
            await care_wh_reimb_receipts.create({
                reimb_id:      reimb.reimb_id,
                filename:      file.filename,
                original_name: file.originalname,
                file_path:     file.path,
                uploaded_by:   actor(req.user),
                uploaded_at:   new Date(),
            });
        }

        await logActivity(req,
            'Reimbursement request ' + number + ' created — ' + fmtFCFA(amt),
            true, 'reimbursementController.js', req.user.user_id, req.user.username);

        res.redirect('/finances/reimbursements/' + reimb.reimb_id + '?success=created');
    } catch (err) {
        console.error('Create reimbursement error:', err);
        const eligiblePos = await care_wh_purchase_orders.findAll({
            where: { status: { [Op.in]: ['approved','sent','partial','received','closed'] } },
            include: [{ model: care_wh_suppliers, as: 'supplier', attributes: ['name'] }],
            order: [['create_time','DESC']], attributes: ['po_id','po_number','total_amount'],
        });
        res.render('finances/reimbursements/form', {
            title: locale === 'fr' ? 'Nouvelle demande de remboursement' : 'New Reimbursement Request',
            activePage: 'finances', user: req.user, csrfToken: req.csrfToken(),
            prefilledPo: null, eligiblePos, errors: [err.message], fmtFCFA,
        });
    }
};

// ══════════════════════════════════════════════════════════════════
// DETAIL
// ══════════════════════════════════════════════════════════════════
exports.reimbDetail = async (req, res) => {
    try {
        const locale  = req.locale || 'en';
        const reimbId = parseInt(req.params.reimb_id, 10);
        const reimb   = await care_wh_reimbursement_requests.findByPk(reimbId, {
            include: [
                { model: care_wh_purchase_orders, as: 'po', required: false,
                  attributes: ['po_id','po_number','total_amount','is_paid','status'],
                  include: [{ model: care_wh_suppliers, as: 'supplier', attributes: ['name'] }] },
                { model: care_wh_reimb_receipts, as: 'receipts', required: false },
            ],
        });
        if (!reimb) return res.status(404).send(locale === 'fr' ? 'Introuvable.' : 'Not found.');

        res.render('finances/reimbursements/detail', {
            title:      reimb.request_number,
            activePage: 'finances',
            user: req.user, csrfToken: req.csrfToken(),
            reimb, fmtFCFA, success: req.query.success || null,
        });
    } catch (err) { res.status(500).send('Error: ' + err.message); }
};

// ══════════════════════════════════════════════════════════════════
// SUBMIT (pending → pending_director)
// ══════════════════════════════════════════════════════════════════
exports.submitRequest = async (req, res) => {
    const reimbId = parseInt(req.params.reimb_id, 10);
    try {
        const reimb = await care_wh_reimbursement_requests.findByPk(reimbId);
        if (!reimb) return res.status(404).json({ ok: false, error: 'Not found' });
        if (reimb.status !== 'pending')
            return res.status(400).json({ ok: false, error: 'Already submitted.' });
        await reimb.update({ status: 'pending_director' });
        await logActivity(req, 'Reimbursement ' + reimb.request_number + ' submitted for director approval',
            true, 'reimbursementController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: 'pending_director' });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// DIRECTOR APPROVE (pending_director → approved_director)
// ══════════════════════════════════════════════════════════════════
exports.directorApprove = async (req, res) => {
    const reimbId = parseInt(req.params.reimb_id, 10);
    const { notes } = req.body;
    try {
        if (!req.user.permissions.includes('Finance.Approve.Director') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });
        const reimb = await care_wh_reimbursement_requests.findByPk(reimbId);
        if (!reimb || reimb.status !== 'pending_director')
            return res.status(400).json({ ok: false, error: 'Not awaiting director approval.' });
        const now = new Date();
        await reimb.update({
            status:               'approved_director',
            director_approved_by: actor(req.user),
            director_approved_at: now,
            director_notes:       notes ? notes.trim() : null,
        });
        await logActivity(req, 'Reimbursement ' + reimb.request_number + ' approved by director',
            true, 'reimbursementController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: 'approved_director' });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// FINANCE PAY (approved_director → paid) + auto-sync PO
// ══════════════════════════════════════════════════════════════════
exports.markPaid = async (req, res) => {
    const reimbId = parseInt(req.params.reimb_id, 10);
    const { payment_method, payment_reference, notes } = req.body;
    try {
        if (!req.user.permissions.includes('Finance.Process.Reimbursement') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });
        if (!payment_method)
            return res.status(400).json({ ok: false, error: 'Payment method required.' });

        const reimb = await care_wh_reimbursement_requests.findByPk(reimbId, {
            include: [{ model: care_wh_purchase_orders, as: 'po', required: false }],
        });
        if (!reimb || reimb.status !== 'approved_director')
            return res.status(400).json({ ok: false, error: 'Not ready for payment.' });

        const now = new Date();
        await reimb.update({
            status:            'paid',
            finance_approved_by: actor(req.user),
            finance_approved_at: now,
            payment_method,
            payment_reference: payment_reference ? payment_reference.trim() : null,
            paid_at:           now,
            paid_by:           actor(req.user),
            notes:             notes ? notes.trim() : null,
        });

        // Auto-sync PO payment fields
        if (reimb.po_id) {
            await care_wh_purchase_orders.update({
                is_paid:    1,
                paid_amount: reimb.amount,
                paid_at:    now,
            }, { where: { po_id: reimb.po_id } });
        }

        await logActivity(req,
            'Reimbursement ' + reimb.request_number + ' paid via ' + payment_method +
            (payment_reference ? ' ref: ' + payment_reference : ''),
            true, 'reimbursementController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: 'paid' });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// REJECT (pending_director → rejected)
// ══════════════════════════════════════════════════════════════════
exports.rejectRequest = async (req, res) => {
    const reimbId = parseInt(req.params.reimb_id, 10);
    const { reason } = req.body;
    try {
        if (!req.user.permissions.includes('Finance.Approve.Director') &&
            !req.user.permissions.includes('Admin.FullAccess'))
            return res.status(403).json({ ok: false, error: 'Permission denied.' });
        const reimb = await care_wh_reimbursement_requests.findByPk(reimbId);
        if (!reimb || !['pending_director','approved_director'].includes(reimb.status))
            return res.status(400).json({ ok: false, error: 'Cannot reject at this stage.' });
        const now = new Date();
        await reimb.update({
            status:           'rejected',
            rejected_by:      actor(req.user),
            rejected_at:      now,
            rejection_reason: reason ? reason.trim() : null,
        });
        await logActivity(req, 'Reimbursement ' + reimb.request_number + ' rejected by ' + actor(req.user),
            true, 'reimbursementController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, status: 'rejected' });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// CANCEL (pending only — by creator)
// ══════════════════════════════════════════════════════════════════
exports.cancelRequest = async (req, res) => {
    const reimbId = parseInt(req.params.reimb_id, 10);
    try {
        const reimb = await care_wh_reimbursement_requests.findByPk(reimbId);
        if (!reimb) return res.status(404).json({ ok: false, error: 'Not found' });
        if (!['pending','pending_director'].includes(reimb.status))
            return res.status(400).json({ ok: false, error: 'Cannot cancel at this stage.' });
        await reimb.update({ status: 'cancelled' });
        await logActivity(req, 'Reimbursement ' + reimb.request_number + ' cancelled',
            true, 'reimbursementController.js', req.user.user_id, req.user.username);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// ══════════════════════════════════════════════════════════════════
// UPLOAD RECEIPT (POST to existing request)
// ══════════════════════════════════════════════════════════════════
exports.uploadReceipt = async (req, res) => {
    const reimbId = parseInt(req.params.reimb_id, 10);
    try {
        if (!req.file)
            return res.status(400).json({ ok: false, error: 'No file uploaded.' });
        await care_wh_reimb_receipts.create({
            reimb_id:      reimbId,
            filename:      req.file.filename,
            original_name: req.file.originalname,
            file_path:     req.file.path,
            uploaded_by:   actor(req.user),
            uploaded_at:   new Date(),
        });
        await logActivity(req,
            `Receipt "${req.file.originalname}" uploaded for reimbursement #${reimbId} by ${actor(req.user)}`,
            true, 'reimbursementController.js', req.user.user_id, req.user.username);
        res.json({ ok: true, filename: req.file.filename, original: req.file.originalname });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};


