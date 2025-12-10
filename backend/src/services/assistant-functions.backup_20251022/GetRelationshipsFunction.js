const pool = require('../../db/connection');
const RelationshipScoringService = require('../RelationshipScoringService');

/**
 * GetRelationshipsFunction - Retrieve detailed relationship data with scoring and history
 */
class GetRelationshipsFunction {
  static get name() {
    return 'get_relationships';
  }

  static get description() {
    return 'Retrieve detailed relationship information including type, strength, computed scores, interaction history, and favor balance. Provides multi-factor relationship scoring based on base strength, interaction frequency, reciprocity, and recency. Use this to answer questions about relationship quality, connections, or social dynamics.';
  }

  static get parameters() {
    return {
      type: 'object',
      properties: {
        person_id: {
          type: 'string',
          description: 'Get relationships for a specific person'
        },
        relationship_type: {
          type: 'string',
          enum: ['family', 'friend', 'colleague', 'acquaintance', 'extended_family', 'other'],
          description: 'Filter by relationship type'
        },
        min_strength: {
          type: 'number',
          description: 'Minimum relationship strength (1-5)',
          minimum: 1,
          maximum: 5
        },
        include_scoring: {
          type: 'boolean',
          description: 'Include computed relationship scores (default: true)',
          default: true
        },
        include_interaction_history: {
          type: 'boolean',
          description: 'Include recent interaction history (default: true)',
          default: true
        },
        include_favor_balance: {
          type: 'boolean',
          description: 'Include favor balance between people (default: true)',
          default: true
        },
        limit: {
          type: 'number',
          description: 'Maximum number of relationships to return (default: 50)',
          default: 50
        }
      }
    };
  }

  static async execute(userId, params = {}) {
    const {
      person_id,
      relationship_type,
      min_strength,
      include_scoring = true,
      include_interaction_history = true,
      include_favor_balance = true,
      limit = 50
    } = params;

    try {
      const relationships = await this.getRelationships(userId, {
        person_id,
        relationship_type,
        min_strength,
        include_scoring,
        include_interaction_history,
        include_favor_balance,
        limit
      });

      // Get statistics
      const stats = await this.getRelationshipStats(userId, person_id);

      return {
        success: true,
        count: relationships.length,
        stats,
        relationships
      };
    } catch (error) {
      console.error('GetRelationshipsFunction error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get relationships with filters and enrichment
   */
  static async getRelationships(userId, options) {
    const {
      person_id,
      relationship_type,
      min_strength,
      include_scoring,
      include_interaction_history,
      include_favor_balance,
      limit
    } = options;

    let query = `
      SELECT
        r.id,
        r.person_a_id,
        r.person_b_id,
        r.relationship_type as type,
        r.strength,
        r.context as notes,
        r.created_at,
        p1.name as person_a_name,
        p2.name as person_b_name
      FROM relationships r
      JOIN people p1 ON p1.id = r.person_a_id
      JOIN people p2 ON p2.id = r.person_b_id
      WHERE p1.user_id = $1 AND p2.user_id = $1
    `;

    const params = [userId];

    // Filter by person
    if (person_id) {
      query += ` AND (r.person_a_id = $${params.length + 1} OR r.person_b_id = $${params.length + 1})`;
      params.push(person_id);
    }

    // Filter by type
    if (relationship_type) {
      query += ` AND r.relationship_type = $${params.length + 1}`;
      params.push(relationship_type);
    }

    // Filter by minimum strength
    if (min_strength) {
      query += ` AND r.strength >= $${params.length + 1}`;
      params.push(min_strength);
    }

    query += ` ORDER BY r.strength DESC, r.created_at DESC`;
    query += ` LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    const relationships = result.rows;

    // Enrich relationships
    for (const rel of relationships) {
      // Compute relationship score if requested
      if (include_scoring) {
        try {
          const scoreData = await RelationshipScoringService.calculateScore(
            userId,
            rel.person_a_id,
            rel.person_b_id
          );
          rel.computed_score = scoreData;
        } catch (error) {
          console.error('Error computing score:', error);
          rel.computed_score = null;
        }
      }

      // Get interaction history if requested
      if (include_interaction_history) {
        rel.recent_interactions = await this.getRecentInteractions(
          userId,
          rel.person_a_id,
          rel.person_b_id,
          5
        );
      }

      // Get favor balance if requested
      if (include_favor_balance) {
        rel.favor_balance = await this.getFavorBalance(
          userId,
          rel.person_a_id,
          rel.person_b_id
        );
      }
    }

    return relationships;
  }

  /**
   * Get recent interactions between two people
   */
  static async getRecentInteractions(userId, personAId, personBId, limit = 5) {
    const result = await pool.query(
      `SELECT DISTINCT e.id, e.event_type, e.description, e.date, e.created_at
       FROM events e
       JOIN event_participants ep1 ON ep1.event_id = e.id
       JOIN event_participants ep2 ON ep2.event_id = e.id
       WHERE e.user_id = $1
       AND ep1.person_id = $2
       AND ep2.person_id = $3
       AND ep1.person_id != ep2.person_id
       ORDER BY e.date DESC, e.created_at DESC
       LIMIT $4`,
      [userId, personAId, personBId, limit]
    );

    return result.rows;
  }

  /**
   * Get favor balance between two people
   */
  static async getFavorBalance(userId, personAId, personBId) {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE giver_id = $2 AND receiver_id = $3) as a_to_b_count,
        COUNT(*) FILTER (WHERE giver_id = $3 AND receiver_id = $2) as b_to_a_count,
        SUM(estimated_value) FILTER (WHERE giver_id = $2 AND receiver_id = $3) as a_to_b_value,
        SUM(estimated_value) FILTER (WHERE giver_id = $3 AND receiver_id = $2) as b_to_a_value,
        COUNT(*) FILTER (WHERE giver_id = $2 AND receiver_id = $3 AND status = 'pending') as a_to_b_pending,
        COUNT(*) FILTER (WHERE giver_id = $3 AND receiver_id = $2 AND status = 'pending') as b_to_a_pending
       FROM favors
       WHERE user_id = $1
       AND ((giver_id = $2 AND receiver_id = $3) OR (giver_id = $3 AND receiver_id = $2))`,
      [userId, personAId, personBId]
    );

    const data = result.rows[0];

    return {
      a_to_b: {
        count: parseInt(data.a_to_b_count || 0),
        value: parseFloat(data.a_to_b_value || 0),
        pending: parseInt(data.a_to_b_pending || 0)
      },
      b_to_a: {
        count: parseInt(data.b_to_a_count || 0),
        value: parseFloat(data.b_to_a_value || 0),
        pending: parseInt(data.b_to_a_pending || 0)
      },
      balance: {
        count_difference: parseInt(data.a_to_b_count || 0) - parseInt(data.b_to_a_count || 0),
        value_difference: parseFloat(data.a_to_b_value || 0) - parseFloat(data.b_to_a_value || 0)
      }
    };
  }

  /**
   * Get relationship statistics
   */
  static async getRelationshipStats(userId, personId = null) {
    const personFilter = personId
      ? `AND (r.person_a_id = '${personId}' OR r.person_b_id = '${personId}')`
      : '';

    const query = `
      SELECT
        COUNT(*) as total_relationships,
        AVG(strength)::numeric(10,2) as avg_strength,
        MAX(strength) as max_strength,
        MIN(strength) as min_strength
      FROM relationships r
      JOIN people p1 ON p1.id = r.person_a_id
      JOIN people p2 ON p2.id = r.person_b_id
      WHERE p1.user_id = $1 AND p2.user_id = $1 ${personFilter}
    `;

    const result = await pool.query(query, [userId]);
    const stats = result.rows[0];

    // Get distribution by type
    const typeQuery = `
      SELECT relationship_type as type, COUNT(*) as count, AVG(strength)::numeric(10,2) as avg_strength
      FROM relationships r
      JOIN people p1 ON p1.id = r.person_a_id
      JOIN people p2 ON p2.id = r.person_b_id
      WHERE p1.user_id = $1 AND p2.user_id = $1 ${personFilter}
      GROUP BY relationship_type
      ORDER BY count DESC
    `;

    const typeResult = await pool.query(typeQuery, [userId]);
    stats.by_type = typeResult.rows;

    // Get distribution by strength
    const strengthQuery = `
      SELECT strength, COUNT(*) as count
      FROM relationships r
      JOIN people p1 ON p1.id = r.person_a_id
      JOIN people p2 ON p2.id = r.person_b_id
      WHERE p1.user_id = $1 AND p2.user_id = $1 ${personFilter}
      GROUP BY strength
      ORDER BY strength DESC
    `;

    const strengthResult = await pool.query(strengthQuery, [userId]);
    stats.by_strength = strengthResult.rows;

    return stats;
  }
}

module.exports = GetRelationshipsFunction;
