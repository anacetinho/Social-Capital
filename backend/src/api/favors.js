const express = require('express');
const { body, query } = require('express-validator');
const Favor = require('../models/Favor');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// Create favor
router.post(
  '/',
  [
    body('giver_id').isUUID().withMessage('Valid giver_id required'),
    body('receiver_id').isUUID().withMessage('Valid receiver_id required'),
    body('giver_id').custom((value, { req }) => value !== req.body.receiver_id).withMessage('Giver and receiver must be different'),
    body('description').notEmpty().withMessage('Description is required'),
    body('date').isISO8601().withMessage('Valid date required'),
    body('status').isIn(['pending', 'completed', 'declined']).withMessage('Invalid status'),
    validate
  ],
  async (req, res, next) => {
    try {
      const favor = await Favor.create(req.userId, req.body);
      res.status(201).json(favor);
    } catch (err) {
      next(err);
    }
  }
);

// Get all favors
router.get(
  '/',
  [
    query('status').optional().isIn(['pending', 'completed', 'declined']),
    query('person_id').optional().isUUID(),
    query('direction').optional().isIn(['given', 'received']),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    validate
  ],
  async (req, res, next) => {
    try {
      const result = await Favor.findAll(req.userId, req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get favor by ID
router.get('/:id', async (req, res, next) => {
  try {
    const favor = await Favor.findById(req.params.id, req.userId);
    if (!favor) {
      return res.status(404).json({ error: 'Favor not found' });
    }
    res.json(favor);
  } catch (err) {
    next(err);
  }
});

// Update favor
router.put(
  '/:id',
  [
    body('status').optional().isIn(['pending', 'completed', 'declined']),
    validate
  ],
  async (req, res, next) => {
    try {
      const favor = await Favor.update(req.params.id, req.userId, req.body);
      if (!favor) {
        return res.status(404).json({ error: 'Favor not found' });
      }
      res.json(favor);
    } catch (err) {
      next(err);
    }
  }
);

// Delete favor
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Favor.delete(req.params.id, req.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Favor not found' });
    }
    res.json({ message: 'Favor deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Get reciprocity balance
router.get('/reciprocity/:person1_id/:person2_id', async (req, res, next) => {
  try {
    const { person1_id, person2_id } = req.params;
    const balance = await Favor.getReciprocityBalance(req.userId, person1_id, person2_id);
    res.json(balance);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
