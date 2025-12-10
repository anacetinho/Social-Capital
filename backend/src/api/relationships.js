const express = require('express');
const { body, query } = require('express-validator');
const Relationship = require('../models/Relationship');
const PathfindingService = require('../services/PathfindingService');
const RelationshipScoringService = require('../services/RelationshipScoringService');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// Create relationship
router.post(
  '/',
  [
    body('person1_id').isUUID().withMessage('Valid person1_id required'),
    body('person2_id').isUUID().withMessage('Valid person2_id required'),
    body('person1_id').custom((value, { req }) => value !== req.body.person2_id).withMessage('Cannot create self-relationship'),
    body('relationship_type').notEmpty().withMessage('Relationship type is required'),
    body('strength').isInt({ min: 1, max: 5 }).withMessage('Strength must be between 1-5'),
    validate
  ],
  async (req, res, next) => {
    try {
      const relationship = await Relationship.create(req.userId, req.body);
      res.status(201).json(relationship);
    } catch (err) {
      next(err);
    }
  }
);

// Get all relationships
router.get(
  '/',
  [
    query('person_id').optional().isUUID(),
    query('relationship_type').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    validate
  ],
  async (req, res, next) => {
    try {
      const result = await Relationship.findAll(req.userId, req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get relationship score between two people (MUST come before /:id)
router.get(
  '/score',
  [
    query('person1_id').isUUID().withMessage('Valid person1_id required'),
    query('person2_id').isUUID().withMessage('Valid person2_id required'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { person1_id, person2_id } = req.query;
      const score = await RelationshipScoringService.calculateScore(req.userId, person1_id, person2_id);

      if (!score) {
        return res.status(404).json({ error: 'No relationship found between these people' });
      }

      res.json(score);
    } catch (err) {
      next(err);
    }
  }
);

// Get all relationship scores (MUST come before /:id)
router.get('/scores', async (req, res, next) => {
  try {
    const scores = await RelationshipScoringService.getAllScores(req.userId);
    res.json(scores);
  } catch (err) {
    next(err);
  }
});

// Get relationship by ID
router.get('/:id', async (req, res, next) => {
  try {
    const relationship = await Relationship.findById(req.params.id, req.userId);
    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    res.json(relationship);
  } catch (err) {
    next(err);
  }
});

// Update relationship
router.put(
  '/:id',
  [
    body('strength').optional().isInt({ min: 1, max: 5 }).withMessage('Strength must be between 1-5'),
    validate
  ],
  async (req, res, next) => {
    try {
      const relationship = await Relationship.update(req.params.id, req.userId, req.body);
      if (!relationship) {
        return res.status(404).json({ error: 'Relationship not found' });
      }
      res.json(relationship);
    } catch (err) {
      next(err);
    }
  }
);

// Delete relationship
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Relationship.delete(req.params.id, req.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    res.json({ message: 'Relationship deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Find connection path
router.post(
  '/path',
  [
    body('from_person_id').isUUID().withMessage('Valid from_person_id required'),
    body('to_person_id').isUUID().withMessage('Valid to_person_id required'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { from_person_id, to_person_id } = req.body;
      const path = await PathfindingService.findPath(req.userId, from_person_id, to_person_id);

      if (!path) {
        return res.status(404).json({ error: 'No connection path found within 3 degrees' });
      }

      res.json(path);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
