const pool = require('../../db/connection');

/**
 * GetFavorsFunction - Retrieve favor tracking data with relationship context
 */
class GetFavorsFunction {
  static get name() {
    return 'get_favors';
  }

  static get description() {
    return 'Retrieve favor tracking information including favors given, received, pending, completed, and canceled. Includes estimated value, time commitment, and relationship context. Use this to answer questions about favor balance, reciprocity, or outstanding favors.';
  }

  static get parameters() {
    return {
      type: 'object',
      properties: {
        person_id: {
          type: 'string',
          description: 'Filter favors involving a specific person (as giver or receiver)'
        },
        status: {
          type: 'string',
          enum: ['pending', 'completed', 'canceled'],
          description: 'Filter by favor status'
        },
        as_giver: {
          type: 'boolean',
          description: 'Only show favors where user is the giver (requires person_id)'
        },
        as_receiver: {
          type: 'boolean',
          description: 'Only show favors where user is the receiver (requires person_id)'
        },
        include_relationship_context: {
          type: 'boolean',
          description: 'Include relationship details between giver and receiver (default: true)',
          default: true
        },
        limit: {
          type: 'number',
          description: 'Maximum number of favors to return (default: 50)',
          default: 50
        }
      }
    };
  }

  static async execute(userId, params = {}) {
    const {
      person_id,
      status,
      as_giver,
      as_receiver,
      include_relationship_context = true,
      limit = 50
    } = params;

    try {
      const favors = await this.getFavors(userId, {
        person_id,
        status,
        as_giver,
        as_receiver,
        include_relationship_context,
        limit
      });

      // Get statistics
      const stats = await this.getFavorStats(userId, person_id);

      return {
        success: true,
        count: favors.length,
        stats,
        favors
      };
    } catch (error) {
      console.error('GetFavorsFunction error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get favors with optional filters
   */
  static async getFavors(userId, options) {
    const {
      person_id,
      status,
      as_giver,
      as_receiver,
      include_relationship_context,
      limit
    } = options;

    let query = `
      SELECT
        f.id,
        f.description,
        f.status,
        f.estimated_value,
        f.time_commitment,
        f.date,
        f.notes,
        f.created_at,
        giver.id as giver_id,
        giver.name as giver_name,
        receiver.id as receiver_id,
        receiver.name as receiver_name
      FROM favors f
      JOIN people giver ON giver.id = f.giver_id
      JOIN people receiver ON receiver.id = f.receiver_id
      WHERE f.user_id = $1
    `;

    const params = [userId];

    // Filter by person
    if (person_id) {
      if (as_giver) {
        query += ` AND f.giver_id = $${params.length + 1}`;
        params.push(person_id);
      } else if (as_receiver) {
        query += ` AND f.receiver_id = $${params.length + 1}`;
        params.push(person_id);
      } else {
        query += ` AND (f.giver_id = $${params.length + 1} OR f.receiver_id = $${params.length + 1})`;
        params.push(person_id);
      }
    }

    // Filter by status
    if (status) {
      query += ` AND f.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY
      CASE WHEN f.status = 'pending' THEN 0 ELSE 1 END,
      f.date DESC,
      f.created_at DESC`;
    query += ` LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    const favors = result.rows;

    // Add relationship context if requested
    if (include_relationship_context) {
      for (const favor of favors) {
        favor.relationship = await this.getRelationshipBetween(
          userId,
          favor.giver_id,
          favor.receiver_id
        );
      }
    }

    return favors;
  }

  /**
   * Get relationship between two people
   */
  static async getRelationshipBetween(userId, personAId, personBId) {
    const result = await pool.query(
      `SELECT r.relationship_type as type, r.strength, r.context as notes
       FROM relationships r
       JOIN people p1 ON p1.id = r.person_a_id
       JOIN people p2 ON p2.id = r.person_b_id
       WHERE ((r.person_a_id = $2 AND r.person_b_id = $3)
          OR (r.person_a_id = $3 AND r.person_b_id = $2))
       AND p1.user_id = $1 AND p2.user_id = $1
       LIMIT 1`,
      [userId, personAId, personBId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get favor statistics
   */
  static async getFavorStats(userId, personId = null) {
    const personFilter = personId
      ? `AND (f.giver_id = '${personId}' OR f.receiver_id = '${personId}')`
      : '';

    const query = `
      SELECT
        COUNT(*) as total_favors,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'canceled') as canceled_count,
        SUM(estimated_value) FILTER (WHERE estimated_value IS NOT NULL) as total_value,
        SUM(time_commitment) FILTER (WHERE time_commitment IS NOT NULL) as total_time_commitment,
        AVG(estimated_value) FILTER (WHERE estimated_value IS NOT NULL)::numeric(10,2) as avg_value
      FROM favors f
      WHERE f.user_id = $1 ${personFilter}
    `;

    const result = await pool.query(query, [userId]);
    const stats = result.rows[0];

    // Get given vs received breakdown
    const givenReceivedQuery = `
      SELECT
        COUNT(*) FILTER (WHERE f.giver_id ${personId ? '= $2' : 'IS NOT NULL'}) as given_count,
        COUNT(*) FILTER (WHERE f.receiver_id ${personId ? '= $2' : 'IS NOT NULL'}) as received_count,
        SUM(estimated_value) FILTER (WHERE f.giver_id ${personId ? '= $2' : 'IS NOT NULL'}) as given_value,
        SUM(estimated_value) FILTER (WHERE f.receiver_id ${personId ? '= $2' : 'IS NOT NULL'}) as received_value
      FROM favors f
      WHERE f.user_id = $1 ${personFilter}
    `;

    const givenReceivedParams = personId ? [userId, personId] : [userId];
    const givenReceivedResult = await pool.query(givenReceivedQuery, givenReceivedParams);

    stats.given = {
      count: parseInt(givenReceivedResult.rows[0].given_count || 0),
      total_value: parseFloat(givenReceivedResult.rows[0].given_value || 0)
    };

    stats.received = {
      count: parseInt(givenReceivedResult.rows[0].received_count || 0),
      total_value: parseFloat(givenReceivedResult.rows[0].received_value || 0)
    };

    stats.balance = {
      count_difference: stats.given.count - stats.received.count,
      value_difference: stats.given.total_value - stats.received.total_value
    };

    // Top favor givers/receivers (if not filtering by person)
    if (!personId) {
      const topGiversQuery = `
        SELECT p.id, p.name, COUNT(*) as favor_count
        FROM favors f
        JOIN people p ON p.id = f.giver_id
        WHERE f.user_id = $1 AND p.id != f.receiver_id
        GROUP BY p.id, p.name
        ORDER BY favor_count DESC
        LIMIT 5
      `;

      const topGiversResult = await pool.query(topGiversQuery, [userId]);
      stats.top_givers = topGiversResult.rows;

      const topReceiversQuery = `
        SELECT p.id, p.name, COUNT(*) as favor_count
        FROM favors f
        JOIN people p ON p.id = f.receiver_id
        WHERE f.user_id = $1
        GROUP BY p.id, p.name
        ORDER BY favor_count DESC
        LIMIT 5
      `;

      const topReceiversResult = await pool.query(topReceiversQuery, [userId]);
      stats.top_receivers = topReceiversResult.rows;
    }

    return stats;
  }
}

module.exports = GetFavorsFunction;
