
// routes/referrals.js
// Patient Referral System routes -- see controllers/referralController.js
'use strict';
const express            = require('express');
const router             = express.Router();
const authMiddleware      = require('../middleware/authMiddleware');
const referralController  = require('../controllers/referralController');

router.get('/incoming',            authMiddleware, referralController.incomingReferrals);
router.get('/outgoing',            authMiddleware, referralController.outgoingReferrals);
router.post('/:id/accept',         authMiddleware, referralController.acceptReferral);
router.post('/:id/decline',        authMiddleware, referralController.declineReferral);
router.post('/:id/mark-seen',      authMiddleware, referralController.markSeen);
router.post('/:id/complete',       authMiddleware, referralController.markCompleted);

module.exports = router;
