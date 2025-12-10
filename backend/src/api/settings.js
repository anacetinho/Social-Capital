const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db/connection');
const LLMProviderService = require('../services/LLMProviderService');

/**
 * GET /api/v1/settings/ai
 * Get AI assistant settings for the current user
 */
router.get('/ai', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ai_assistant_enabled, ai_provider, ai_api_url, ai_model,
              ai_max_results, key_person_id
       FROM users
       WHERE id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = result.rows[0];

    // Fetch key person details if set
    if (settings.key_person_id) {
      const personResult = await pool.query(
        'SELECT id, name, photo_url FROM people WHERE id = $1 AND user_id = $2',
        [settings.key_person_id, req.userId]
      );
      settings.key_person = personResult.rows[0] || null;
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/v1/settings/ai
 * Update AI assistant settings for the current user
 */
router.put('/ai', auth, async (req, res) => {
  try {
    const {
      ai_assistant_enabled,
      ai_provider,
      ai_api_url,
      ai_model,
      ai_max_results,
      key_person_id
    } = req.body;

    // Validate settings
    if (ai_assistant_enabled) {
      if (!ai_api_url || !ai_model) {
        return res.status(400).json({
          error: 'LLM API URL and model are required when AI assistant is enabled'
        });
      }

      // Validate URL format
      try {
        new URL(ai_api_url);
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid LLM API URL format'
        });
      }

      // Validate provider
      const validProviders = ['mock', 'openai', 'local'];
      if (ai_provider && !validProviders.includes(ai_provider)) {
        return res.status(400).json({
          error: 'Invalid AI provider. Must be one of: mock, openai, local'
        });
      }
    }

    // Validate max results
    if (ai_max_results !== undefined) {
      const maxResults = parseInt(ai_max_results);
      if (isNaN(maxResults) || maxResults < 1 || maxResults > 1000) {
        return res.status(400).json({
          error: 'Max results must be between 1 and 1000'
        });
      }
    }

    // Validate key_person_id
    if (key_person_id !== undefined && key_person_id !== null) {
      const personCheck = await pool.query(
        'SELECT id FROM people WHERE id = $1 AND user_id = $2',
        [key_person_id, req.userId]
      );
      if (personCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid key_person_id' });
      }
    }

    // Update settings
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (ai_assistant_enabled !== undefined) {
      updateFields.push(`ai_assistant_enabled = $${paramCount++}`);
      values.push(ai_assistant_enabled);
    }

    if (ai_provider !== undefined) {
      updateFields.push(`ai_provider = $${paramCount++}`);
      values.push(ai_provider);
    }

    if (ai_api_url !== undefined) {
      updateFields.push(`ai_api_url = $${paramCount++}`);
      values.push(ai_api_url);
    }

    if (ai_model !== undefined) {
      updateFields.push(`ai_model = $${paramCount++}`);
      values.push(ai_model);
    }

    if (ai_max_results !== undefined) {
      updateFields.push(`ai_max_results = $${paramCount++}`);
      values.push(parseInt(ai_max_results));
    }

    if (key_person_id !== undefined) {
      updateFields.push(`key_person_id = $${paramCount++}`);
      values.push(key_person_id);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No settings to update' });
    }

    values.push(req.userId);

    const result = await pool.query(
      `UPDATE users
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING ai_assistant_enabled, ai_provider, ai_api_url, ai_model,
                 ai_max_results, key_person_id`,
      values
    );

    res.json({
      success: true,
      settings: result.rows[0],
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating AI settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * POST /api/v1/settings/ai/test-connection
 * Test connection to the LLM server
 */
router.post('/ai/test-connection', auth, async (req, res) => {
  try {
    const { base_url, model } = req.body;

    if (!base_url || !model) {
      return res.status(400).json({
        error: 'Base URL and model are required'
      });
    }

    // Validate URL
    try {
      new URL(base_url);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid base URL format'
      });
    }

    // Create provider and test connection
    const provider = new LLMProviderService(base_url, model);
    const result = await provider.testConnection();

    if (result.success) {
      res.json({
        success: true,
        message: 'Successfully connected to LLM server',
        models: result.models || []
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to connect to LLM server'
      });
    }
  } catch (error) {
    console.error('Error testing LLM connection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test connection'
    });
  }
});

module.exports = router;
