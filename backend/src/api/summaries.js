const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SummaryGenerationService = require('../services/SummaryGenerationService');

/**
 * Get summary generation status
 * GET /api/v1/summaries/status
 */
router.get('/status', auth, async (req, res) => {
  try {
    const pool = require('../db/connection');

    // Get counts for Summary A and Summary B
    const result = await pool.query(
      `SELECT
         COUNT(*) as total_people,
         COUNT(summary_a) as summary_a_count,
         COUNT(summary_b) as summary_b_count,
         MAX(summary_a_generated_at) as last_summary_a_generated,
         MAX(summary_b_generated_at) as last_summary_b_generated
       FROM people
       WHERE user_id = $1`,
      [req.userId]
    );

    const status = {
      total_people: parseInt(result.rows[0].total_people),
      summary_a_count: parseInt(result.rows[0].summary_a_count),
      summary_b_count: parseInt(result.rows[0].summary_b_count),
      last_summary_a_generated: result.rows[0].last_summary_a_generated,
      last_summary_b_generated: result.rows[0].last_summary_b_generated
    };

    res.json({ success: true, status });
  } catch (error) {
    console.error('Error getting summary status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate summaries for all people (with SSE progress updates)
 * Generates BOTH Summary A and Summary B for each person
 * GET /api/v1/summaries/generate-all
 * IMPORTANT: Must be before /:personId routes to avoid matching "generate-all" as a personId
 */
router.get('/generate-all', auth, async (req, res) => {
  try {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    const userId = req.userId;

    // Get all people
    const people = await SummaryGenerationService.getPeopleNeedingSummaries(userId);
    const total = people.length;

    // Send initial status
    res.write(`data: ${JSON.stringify({
      type: 'start',
      total,
      message: `Starting summary generation for ${total} people...`
    })}\n\n`);

    // Generate summaries sequentially
    for (let i = 0; i < people.length; i++) {
      const person = people[i];

      // GENERATE SUMMARY A
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        current: i + 1,
        total,
        personId: person.id,
        personName: person.name,
        summaryType: 'A',
        message: `Generating Summary A for ${person.name}...`
      })}\n\n`);

      const resultA = await SummaryGenerationService.generateSummaryA(userId, person.id);

      res.write(`data: ${JSON.stringify({
        type: 'summary_a_complete',
        current: i + 1,
        total,
        personId: person.id,
        personName: person.name,
        success: resultA.success,
        error: resultA.error || null
      })}\n\n`);

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 300));

      // GENERATE SUMMARY B (only if Summary A succeeded)
      if (resultA.success) {
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          current: i + 1,
          total,
          personId: person.id,
          personName: person.name,
          summaryType: 'B',
          message: `Generating Summary B for ${person.name}...`
        })}\n\n`);

        const resultB = await SummaryGenerationService.generateSummaryB(userId, person.id);

        res.write(`data: ${JSON.stringify({
          type: 'summary_b_complete',
          current: i + 1,
          total,
          personId: person.id,
          personName: person.name,
          success: resultB.success,
          error: resultB.error || null
        })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({
          type: 'summary_b_skipped',
          current: i + 1,
          total,
          personId: person.id,
          personName: person.name,
          message: 'Skipping Summary B (Summary A failed)'
        })}\n\n`);
      }

      // Send person completion
      res.write(`data: ${JSON.stringify({
        type: 'person_complete',
        current: i + 1,
        total,
        personId: person.id,
        personName: person.name
      })}\n\n`);

      // Small delay to prevent overwhelming the LLM
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Send final completion
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      total,
      message: `Successfully generated summaries for ${total} people`
    })}\n\n`);

    res.end();
  } catch (error) {
    console.error('Error in generate-all:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message
    })}\n\n`);
    res.end();
  }
});

/**
 * Generate summary for a single person
 * POST /api/v1/summaries/:personId?type=a|b|both
 * Query params:
 *   - type: 'a' | 'b' | 'both' (default: 'both')
 */
router.post('/:personId', auth, async (req, res) => {
  try {
    const { personId } = req.params;
    const { type = 'both' } = req.query;

    const results = {};

    // Generate Summary A
    if (type === 'a' || type === 'both') {
      const resultA = await SummaryGenerationService.generateSummaryA(req.userId, personId);
      results.summary_a = resultA;

      if (!resultA.success && type === 'both') {
        // If Summary A fails, can't generate Summary B
        return res.status(500).json({
          success: false,
          error: 'Summary A generation failed. Cannot generate Summary B without Summary A.',
          results
        });
      }
    }

    // Generate Summary B
    if (type === 'b' || type === 'both') {
      const resultB = await SummaryGenerationService.generateSummaryB(req.userId, personId);
      results.summary_b = resultB;
    }

    // Check if all requested summaries succeeded
    const allSucceeded = Object.values(results).every(r => r.success);

    if (allSucceeded) {
      res.json({ success: true, results });
    } else {
      res.status(500).json({ success: false, results });
    }
  } catch (error) {
    console.error('Error generating person summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete ALL summaries for the current user
 * DELETE /api/v1/summaries/all?type=a|b|both
 * Query params:
 *   - type: 'a' | 'b' | 'both' (default: 'both')
 * IMPORTANT: Must be before /:personId route to avoid matching "all" as a personId
 */
router.delete('/all', auth, async (req, res) => {
  try {
    const { type = 'both' } = req.query;
    const pool = require('../db/connection');

    let updateQuery = 'UPDATE people SET ';
    const updates = [];

    if (type === 'a' || type === 'both') {
      updates.push('summary_a = NULL', 'summary_a_generated_at = NULL');
    }
    if (type === 'b' || type === 'both') {
      updates.push('summary_b = NULL', 'summary_b_generated_at = NULL');
    }

    updateQuery += updates.join(', ');
    updateQuery += ' WHERE user_id = $1 RETURNING id';

    const result = await pool.query(updateQuery, [req.userId]);
    const deletedCount = result.rowCount;

    res.json({
      success: true,
      message: `Successfully deleted ${type === 'both' ? 'all' : 'Summary ' + type.toUpperCase()} summaries for ${deletedCount} people`,
      deleted_count: deletedCount,
      type
    });
  } catch (error) {
    console.error('Error deleting all summaries:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete/clear summary for a single person
 * DELETE /api/v1/summaries/:personId?type=a|b|both
 * Query params:
 *   - type: 'a' | 'b' | 'both' (default: 'both')
 */
router.delete('/:personId', auth, async (req, res) => {
  try {
    const { personId } = req.params;
    const { type = 'both' } = req.query;
    const pool = require('../db/connection');

    let updateQuery = 'UPDATE people SET ';
    const updates = [];

    if (type === 'a' || type === 'both') {
      updates.push('summary_a = NULL', 'summary_a_generated_at = NULL');
    }
    if (type === 'b' || type === 'both') {
      updates.push('summary_b = NULL', 'summary_b_generated_at = NULL');
    }

    updateQuery += updates.join(', ');
    updateQuery += ' WHERE id = $1 AND user_id = $2';

    await pool.query(updateQuery, [personId, req.userId]);

    res.json({
      success: true,
      message: `Summary ${type.toUpperCase()} cleared successfully`,
      type
    });
  } catch (error) {
    console.error('Error clearing summary:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
