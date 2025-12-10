const express = require('express');
const { body, query } = require('express-validator');
const Biography = require('../models/Biography');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// Create biography note
router.post(
  '/',
  [
    body('person_id').isUUID().withMessage('Valid person_id required'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('note_date').isDate().withMessage('Valid date required'),
    body('note').trim().notEmpty().withMessage('Note is required')
      .isLength({ max: 5000 }).withMessage('Note must be max 5000 characters'),
    validate
  ],
  async (req, res, next) => {
    try {
      const biography = await Biography.create(req.userId, req.body);
      res.status(201).json(biography);
    } catch (err) {
      next(err);
    }
  }
);

// Get all biography notes
router.get(
  '/',
  [
    query('person_id').optional().isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    validate
  ],
  async (req, res, next) => {
    try {
      const biographies = await Biography.findAll(req.userId, req.query);
      res.json(biographies);
    } catch (err) {
      next(err);
    }
  }
);

// Get biography note by ID
router.get('/:id', async (req, res, next) => {
  try {
    const biography = await Biography.findById(req.params.id, req.userId);
    if (!biography) {
      return res.status(404).json({ error: 'Biography note not found' });
    }
    res.json(biography);
  } catch (err) {
    next(err);
  }
});

// Update biography note
router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('note_date').optional().isDate(),
    body('note').optional().trim().notEmpty()
      .isLength({ max: 5000 }).withMessage('Note must be max 5000 characters'),
    validate
  ],
  async (req, res, next) => {
    try {
      const biography = await Biography.update(req.params.id, req.userId, req.body);
      if (!biography) {
        return res.status(404).json({ error: 'Biography note not found' });
      }
      res.json(biography);
    } catch (err) {
      next(err);
    }
  }
);

// Delete biography note
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Biography.delete(req.params.id, req.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Biography note not found' });
    }
    res.json({ message: 'Biography note deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
