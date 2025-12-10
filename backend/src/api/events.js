const express = require('express');
const { body, query } = require('express-validator');
const Event = require('../models/Event');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// Create event
router.post(
  '/',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('participant_ids').optional().isArray(),
    validate
  ],
  async (req, res, next) => {
    try {
      const event = await Event.create(req.userId, req.body);
      res.status(201).json(event);
    } catch (err) {
      next(err);
    }
  }
);

// Get all events
router.get(
  '/',
  [
    query('event_type').optional().isString(),
    query('person_id').optional().isUUID(),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    validate
  ],
  async (req, res, next) => {
    try {
      const result = await Event.findAll(req.userId, req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get event by ID
router.get('/:id', async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id, req.userId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    next(err);
  }
});

// Update event
router.put('/:id', async (req, res, next) => {
  try {
    const event = await Event.update(req.params.id, req.userId, req.body);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    next(err);
  }
});

// Delete event
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Event.delete(req.params.id, req.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
