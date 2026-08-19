// routes/test.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

router.get('/test-auth', authMiddleware, (req, res) => {
  res.send({
    message: 'Authenticated user info',
    user: req.user,
  });
});

module.exports = router;
