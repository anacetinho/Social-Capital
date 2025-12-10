const express = require('express');
const { query } = require('express-validator');
const NetworkGraphService = require('../services/NetworkGraphService');
const PathfindingService = require('../services/PathfindingService');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// Get network graph data
router.get(
  '/graph',
  [
    query('type').optional().isString(),
    query('min_strength').optional().isInt({ min: 1, max: 5 }).toInt(),
    validate
  ],
  async (req, res, next) => {
    try {
      const graph = await NetworkGraphService.getGraphData(req.userId, req.query);
      res.json(graph);
    } catch (err) {
      next(err);
    }
  }
);

// Get network clusters
router.get('/clusters', async (req, res, next) => {
  try {
    const clusters = await NetworkGraphService.getClusters(req.userId);
    res.json(clusters);
  } catch (err) {
    next(err);
  }
});

// Get central nodes
router.get(
  '/central-nodes',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    validate
  ],
  async (req, res, next) => {
    try {
      const limit = req.query.limit || 10;
      const centralNodes = await NetworkGraphService.getCentralNodes(req.userId, limit);
      res.json(centralNodes);
    } catch (err) {
      next(err);
    }
  }
);

// Get isolated people
router.get(
  '/isolated',
  [
    query('max_connections').optional().isInt({ min: 0, max: 5 }).toInt(),
    validate
  ],
  async (req, res, next) => {
    try {
      const maxConnections = req.query.max_connections || 1;
      const isolated = await NetworkGraphService.getIsolatedPeople(req.userId, maxConnections);
      res.json(isolated);
    } catch (err) {
      next(err);
    }
  }
);

// Find all paths between two people
router.get(
  '/path',
  [
    query('from').isUUID().withMessage('Valid from person_id required'),
    query('to').isUUID().withMessage('Valid to person_id required'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { from, to } = req.query;

      if (from === to) {
        return res.status(400).json({ error: 'Cannot find path to same person' });
      }

      // Find all paths between the two people
      const result = await PathfindingService.findAllPathsBetweenPeople(req.userId, from, to);

      if (!result.found) {
        // No path found, suggest intermediaries
        const intermediaries = await PathfindingService.suggestIntermediaries(req.userId, from, to);
        return res.json({
          found: false,
          totalFound: 0,
          paths: [],
          message: 'No connection found within 6 degrees of separation',
          suggestedIntermediaries: intermediaries
        });
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get focused graph - nodes within N degrees of a focal person
router.get(
  '/focus',
  [
    query('person_id').isUUID().withMessage('Valid person_id required'),
    query('degrees').optional().custom(value => {
      if (value === 'all') return true;
      const num = parseInt(value);
      return num >= 1 && num <= 6;
    }).withMessage('Degrees must be 1-6 or "all"'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { person_id, degrees = 3 } = req.query;
      const focusedGraph = await NetworkGraphService.getFocusedGraph(req.userId, person_id, degrees);
      res.json(focusedGraph);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
