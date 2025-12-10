const express = require('express');
const { body, query } = require('express-validator');
const Asset = require('../models/Asset');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// Create asset
router.post(
  '/',
  [
    body('owner_id').isUUID().withMessage('Valid owner_id required'),
    body('asset_type').notEmpty().withMessage('Asset type is required'),
    body('name').notEmpty().withMessage('Name is required'),
    validate
  ],
  async (req, res, next) => {
    try {
      const asset = await Asset.create(req.userId, req.body);
      res.status(201).json(asset);
    } catch (err) {
      next(err);
    }
  }
);

// Get all assets
router.get(
  '/',
  [
    query('asset_type').optional().isString(),
    query('owner_id').optional().isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    validate
  ],
  async (req, res, next) => {
    try {
      const result = await Asset.findAll(req.userId, req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get asset by ID
router.get('/:id', async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id, req.userId);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(asset);
  } catch (err) {
    next(err);
  }
});

// Update asset
router.put('/:id', async (req, res, next) => {
  try {
    const asset = await Asset.update(req.params.id, req.userId, req.body);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(asset);
  } catch (err) {
    next(err);
  }
});

// Delete asset
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Asset.delete(req.params.id, req.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json({ message: 'Asset deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
