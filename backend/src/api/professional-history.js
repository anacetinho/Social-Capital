const express = require('express');
const { body, query } = require('express-validator');
const ProfessionalHistory = require('../models/ProfessionalHistory');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// Create professional history entry
router.post(
  '/',
  [
    body('person_id').isUUID().withMessage('Valid person_id required'),
    body('company').notEmpty().withMessage('Company is required'),
    body('position').notEmpty().withMessage('Position is required'),
    body('start_date').isISO8601().withMessage('Valid start_date required'),
    body('end_date').optional().isISO8601().withMessage('Valid end_date required'),
    validate
  ],
  async (req, res, next) => {
    try {
      const entry = await ProfessionalHistory.create(req.userId, req.body);
      res.status(201).json(entry);
    } catch (err) {
      next(err);
    }
  }
);

// Get all professional history
router.get(
  '/',
  [
    query('person_id').optional().isUUID(),
    validate
  ],
  async (req, res, next) => {
    try {
      const result = await ProfessionalHistory.findAll(req.userId, req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get by ID
router.get('/:id', async (req, res, next) => {
  try {
    const entry = await ProfessionalHistory.findById(req.params.id, req.userId);
    if (!entry) {
      return res.status(404).json({ error: 'Professional history entry not found' });
    }
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

// Update
router.put('/:id', async (req, res, next) => {
  try {
    const entry = await ProfessionalHistory.update(req.params.id, req.userId, req.body);
    if (!entry) {
      return res.status(404).json({ error: 'Professional history entry not found' });
    }
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

// Delete
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await ProfessionalHistory.delete(req.params.id, req.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Professional history entry not found' });
    }
    res.json({ message: 'Professional history entry deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
