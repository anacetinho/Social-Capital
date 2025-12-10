const express = require('express');
const { query } = require('express-validator');
const DashboardService = require('../services/DashboardService');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// Get dashboard stats
router.get('/stats',
  [
    query('person_id').optional().isUUID(),
    validate
  ],
  async (req, res, next) => {
    try {
      const stats = await DashboardService.getStats(req.userId, req.query.person_id || null);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  }
);

// Get activity timeline
router.get(
  '/activity',
  [
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validate
  ],
  async (req, res, next) => {
    try {
      const activity = await DashboardService.getActivity(req.userId, req.query);
      res.json(activity);
    } catch (err) {
      next(err);
    }
  }
);

// Get network health
router.get('/network-health', async (req, res, next) => {
  try {
    const health = await DashboardService.getNetworkHealth(req.userId);
    res.json(health);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
