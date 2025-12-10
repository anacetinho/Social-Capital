const express = require('express');
const { body } = require('express-validator');
const AuthService = require('../services/AuthService');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.register(email, password);
      res.status(201).json(result);
    } catch (err) {
      if (err.message.includes('already registered')) {
        return res.status(409).json({ error: err.message });
      }
      next(err);
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.json(result);
    } catch (err) {
      if (err.message.includes('Invalid')) {
        return res.status(401).json({ error: err.message });
      }
      next(err);
    }
  }
);

// Logout (client-side token removal, but endpoint for consistency)
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
