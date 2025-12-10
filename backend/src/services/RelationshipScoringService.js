const pool = require('../db/connection');

/**
 * Relationship Scoring Service
 * Calculates relationship scores based on multiple factors:
 * - Base strength (1-5 scale)
 * - Interaction frequency (events)
 * - Reciprocity balance (favors)
 * - Recency of contact
 */
class RelationshipScoringService {
  /**
   * Calculate comprehensive relationship score
   * Returns a score from 0-100
   */
  static async calculateScore(userId, personAId, personBId) {
    // Get base relationship strength
    const baseStrength = await this.getBaseStrength(userId, personAId, personBId);
    if (!baseStrength) {
      return null; // No relationship exists
    }

    // Get interaction frequency (events together)
    const interactionScore = await this.calculateInteractionScore(userId, personAId, personBId);

    // Get reciprocity balance
    const reciprocityScore = await this.calculateReciprocityScore(userId, personAId, personBId);

    // Get recency score
    const recencyScore = await this.calculateRecencyScore(userId, personAId, personBId);

    // Weighted average (weights from research.md)
    const weights = {
      baseStrength: 0.40,    // 40% - declared relationship strength
      interaction: 0.25,      // 25% - frequency of interactions
      reciprocity: 0.20,      // 20% - balance of favors
      recency: 0.15          // 15% - recency of contact
    };

    const totalScore =
      (baseStrength / 5) * 100 * weights.baseStrength +
      interactionScore * weights.interaction +
      reciprocityScore * weights.reciprocity +
      recencyScore * weights.recency;

    return {
      total_score: Math.round(totalScore),
      components: {
        base_strength: baseStrength,
        interaction_score: Math.round(interactionScore),
        reciprocity_score: Math.round(reciprocityScore),
        recency_score: Math.round(recencyScore)
      }
    };
  }

  /**
   * Get base relationship strength (1-5)
   */
  static async getBaseStrength(userId, personAId, personBId) {
    const result = await pool.query(
      `SELECT strength FROM relationships
       WHERE user_id = $1
         AND ((person_a_id = $2 AND person_b_id = $3) OR (person_a_id = $3 AND person_b_id = $2))`,
      [userId, personAId, personBId]
    );

    return result.rows.length > 0 ? result.rows[0].strength : null;
  }

  /**
   * Calculate interaction score based on event frequency
   * Score: 0-100 based on number of shared events
   */
  static async calculateInteractionScore(userId, personAId, personBId) {
    const result = await pool.query(
      `SELECT COUNT(DISTINCT e.id) as event_count
       FROM events e
       JOIN event_participants ep1 ON e.id = ep1.event_id
       JOIN event_participants ep2 ON e.id = ep2.event_id
       WHERE e.user_id = $1
         AND ep1.person_id = $2
         AND ep2.person_id = $3`,
      [userId, personAId, personBId]
    );

    const eventCount = parseInt(result.rows[0].event_count);

    // Score calculation: 0 events = 0, 1-5 events = 20-60, 6-10 = 70-90, 11+ = 100
    if (eventCount === 0) return 0;
    if (eventCount <= 5) return Math.min(eventCount * 12, 60);
    if (eventCount <= 10) return 60 + (eventCount - 5) * 6;
    return 100;
  }

  /**
   * Calculate reciprocity score based on favor balance
   * Score: 100 = balanced, decreases with imbalance
   */
  static async calculateReciprocityScore(userId, personAId, personBId) {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE giver_id = $2 AND receiver_id = $3) AS a_to_b,
        COUNT(*) FILTER (WHERE giver_id = $3 AND receiver_id = $2) AS b_to_a
       FROM favors
       WHERE user_id = $1
         AND ((giver_id = $2 AND receiver_id = $3) OR (giver_id = $3 AND receiver_id = $2))`,
      [userId, personAId, personBId]
    );

    const aToB = parseInt(result.rows[0].a_to_b);
    const bToA = parseInt(result.rows[0].b_to_a);
    const total = aToB + bToA;

    if (total === 0) return 50; // Neutral - no favors exchanged

    // Perfect balance = 100, imbalance reduces score
    const balance = Math.min(aToB, bToA) / Math.max(aToB, bToA);
    return Math.round(balance * 100);
  }

  /**
   * Calculate recency score based on last contact
   * Score: 100 = contacted today, decreases over time
   */
  static async calculateRecencyScore(userId, personAId, personBId) {
    const result = await pool.query(
      `SELECT MAX(e.date) as last_contact
       FROM events e
       JOIN event_participants ep1 ON e.id = ep1.event_id
       JOIN event_participants ep2 ON e.id = ep2.event_id
       WHERE e.user_id = $1
         AND ep1.person_id = $2
         AND ep2.person_id = $3`,
      [userId, personAId, personBId]
    );

    const lastContact = result.rows[0].last_contact;

    if (!lastContact) return 0;

    const now = new Date();
    const lastContactDate = new Date(lastContact);
    const daysSinceContact = Math.floor((now - lastContactDate) / (1000 * 60 * 60 * 24));

    // Score calculation: 0-7 days = 100, 8-30 days = 80-50, 31-90 = 50-20, 91+ = 10-0
    if (daysSinceContact <= 7) return 100;
    if (daysSinceContact <= 30) return 100 - ((daysSinceContact - 7) * 2);
    if (daysSinceContact <= 90) return 50 - ((daysSinceContact - 30) * 0.5);
    if (daysSinceContact <= 180) return Math.max(20 - ((daysSinceContact - 90) * 0.2), 0);
    return 0;
  }

  /**
   * Get all relationship scores for a user
   */
  static async getAllScores(userId) {
    const relationships = await pool.query(
      'SELECT id, person_a_id, person_b_id FROM relationships WHERE user_id = $1',
      [userId]
    );

    const scores = [];

    for (const rel of relationships.rows) {
      const score = await this.calculateScore(userId, rel.person_a_id, rel.person_b_id);
      if (score) {
        scores.push({
          relationship_id: rel.id,
          person_a_id: rel.person_a_id,
          person_b_id: rel.person_b_id,
          ...score
        });
      }
    }

    return scores;
  }
}

module.exports = RelationshipScoringService;
