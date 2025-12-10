const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db/connection');
const authenticate = require('../middleware/auth');

/**
 * GET /api/v1/preferences
 * Get current user's UI preferences
 * Auto-creates preferences with defaults if not exists
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.userId;

    // Try to get existing preferences
    let result = await pool.query(
      'SELECT id, user_id, show_summary_a, show_summary_b, created_at, updated_at FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    // If no preferences exist, create them with defaults
    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO user_preferences (user_id, show_summary_a, show_summary_b)
         VALUES ($1, TRUE, TRUE)
         RETURNING id, user_id, show_summary_a, show_summary_b, created_at, updated_at`,
        [userId]
      );
    }

    res.json({
      success: true,
      preferences: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/preferences
 * Update current user's UI preferences
 */
router.put('/',
  authenticate,
  [
    body('show_summary_a')
      .optional()
      .isBoolean()
      .withMessage('show_summary_a must be a boolean'),
    body('show_summary_b')
      .optional()
      .isBoolean()
      .withMessage('show_summary_b must be a boolean')
  ],
  async (req, res, next) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const userId = req.userId;
      const { show_summary_a, show_summary_b } = req.body;

      // Build dynamic UPDATE query based on provided fields
      const updates = [];
      const values = [userId];
      let paramCounter = 2;

      if (show_summary_a !== undefined) {
        updates.push(`show_summary_a = $${paramCounter}`);
        values.push(show_summary_a);
        paramCounter++;
      }

      if (show_summary_b !== undefined) {
        updates.push(`show_summary_b = $${paramCounter}`);
        values.push(show_summary_b);
        paramCounter++;
      }

      // If no updates provided, return error
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields provided for update'
        });
      }

      // First, ensure preferences record exists
      await pool.query(
        `INSERT INTO user_preferences (user_id, show_summary_a, show_summary_b)
         VALUES ($1, TRUE, TRUE)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      // Update preferences
      const query = `
        UPDATE user_preferences
        SET ${updates.join(', ')}
        WHERE user_id = $1
        RETURNING id, user_id, show_summary_a, show_summary_b, created_at, updated_at
      `;

      const result = await pool.query(query, values);

      res.json({
        success: true,
        preferences: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
