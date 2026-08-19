const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { care_accesslog } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdminMiddleware');

// GET: /admin/logs/
router.get('/', authMiddleware, isAdmin, async (req, res) => {
  const { username, from, to, success } = req.query;

  const where = {};

  if (username) {
    where.username = { [Op.like]: `%${username}%` };
  }

  if (from || to) {
    where.datetime = {};
    if (from) where.datetime[Op.gte] = new Date(from);
    if (to) where.datetime[Op.lte] = new Date(to);
  }

  if (success === '1' || success === '0') {
    where.login_success = success === '1';
  }

  try {
    const logs = await care_accesslog.findAll({
      where,
      order: [['datetime', 'DESC']],
      limit: 100,
    });

    res.render('admin/logs', {
      title: 'Access Logs',
      logs,
      filters: { username, from, to, success },
      activePage: 'admin-logs',
      user: req.user,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).send('Failed to load access logs.');
  }
});

module.exports = router;
