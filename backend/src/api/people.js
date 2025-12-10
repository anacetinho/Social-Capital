const express = require('express');
const { body, param, query } = require('express-validator');
const Person = require('../models/Person');
const ImageUploadService = require('../services/ImageUploadService');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const upload = ImageUploadService.getMulterConfig();

// All routes require authentication
router.use(authenticate);

// Create person
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('gender').notEmpty().withMessage('Gender is required').isIn(['male', 'female']).withMessage('Gender must be male or female'),
    body('email').optional().isEmail().withMessage('Valid email format required'),
    body('phone').optional().isString(),
    body('birthday').optional().isISO8601().withMessage('Valid date format required'),
    body('importance').optional().isInt({ min: 1, max: 5 }).withMessage('Importance must be between 1-5'),
    validate
  ],
  async (req, res, next) => {
    try {
      const person = await Person.create(req.userId, req.body);
      res.status(201).json(person);
    } catch (err) {
      next(err);
    }
  }
);

// Get all people
router.get(
  '/',
  [
    query('search').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    validate
  ],
  async (req, res, next) => {
    try {
      const result = await Person.findAll(req.userId, req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get lightweight people list for dropdowns
router.get('/dropdown/list', async (req, res, next) => {
  try {
    const result = await Person.getDropdownList(req.userId);
    res.json({
      success: true,
      people: result
    });
  } catch (err) {
    next(err);
  }
});

// Get person by ID
router.get('/:id', async (req, res, next) => {
  try {
    const person = await Person.findById(req.params.id, req.userId);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(person);
  } catch (err) {
    next(err);
  }
});

// Update person
router.put(
  '/:id',
  [
    body('gender').optional().isIn(['male', 'female']).withMessage('Gender must be male or female'),
    body('email').optional().isEmail().withMessage('Valid email format required'),
    body('importance').optional().isInt({ min: 1, max: 5 }).withMessage('Importance must be between 1-5'),
    validate
  ],
  async (req, res, next) => {
    try {
      const person = await Person.update(req.params.id, req.userId, req.body);
      if (!person) {
        return res.status(404).json({ error: 'Person not found' });
      }
      res.json(person);
    } catch (err) {
      next(err);
    }
  }
);

// Delete person
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Person.delete(req.params.id, req.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json({ message: 'Person deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Upload profile picture
router.post(
  '/:id/picture',
  upload.single('picture'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Process image
      const processedPath = await ImageUploadService.processImage(req.file.path);
      const publicUrl = ImageUploadService.getPublicUrl(processedPath);

      // Update person record
      const person = await Person.updateProfilePicture(req.params.id, req.userId, publicUrl);

      if (!person) {
        await ImageUploadService.deleteImage(publicUrl);
        return res.status(404).json({ error: 'Person not found' });
      }

      res.json(person);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
