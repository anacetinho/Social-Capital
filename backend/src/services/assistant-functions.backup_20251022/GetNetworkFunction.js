const pool = require('../../db/connection');
const PathfindingService = require('../PathfindingService');
const DashboardService = require('../DashboardService');

/**
 * GetNetworkFunction - Retrieve network statistics, connections, pathfinding, and insights
 */
class GetNetworkFunction {
  static get name() {
    return 'get_network';
  }

  static get description() {
    return 'Retrieve network analysis and statistics including: total connections, network health score, relationship strength distribution, top connections, pathfinding between people, degree of separation, clusters, and central nodes. Use this to answer questions about network structure, connectivity, or to find connection paths between people.';
  }

  static get parameters() {
    return {
      type: 'object',
      properties: {
        include_stats: {
          type: 'boolean',
          description: 'Include overall network statistics (default: true)',
          default: true
        },
        include_top_connections: {
          type: 'boolean',
          description: 'Include top connections/most connected people (default: true)',
          default: true
        },
        include_health_score: {
          type: 'boolean',
          description: 'Include network health score (default: true)',
          default: true
        },
        find_path_from: {
          type: 'string',
          description: 'Person ID to find path from (requires find_path_to)'
        },
        find_path_to: {
          type: 'string',
          description: 'Person ID to find path to (requires find_path_from)'
        },
        person_connections: {
          type: 'string',
          description: 'Get N1/N2/N3 connections for a specific person ID'
        }
      }
    };
  }

  static async execute(userId, params = {}) {
    const {
      include_stats = true,
      include_top_connections = true,
      include_health_score = true,
      find_path_from,
      find_path_to,
      person_connections
    } = params;

    try {
      const result = {};

      // Get overall network stats
      if (include_stats) {
        result.network_stats = await this.getNetworkStats(userId);
      }

      // Get network health score
      if (include_health_score) {
        result.health_score = await DashboardService.calculateNetworkHealthScore(userId);
      }

      // Get top connections
      if (include_top_connections) {
        result.top_connections = await this.getTopConnections(userId, 10);
      }

      // Find path between two people
      if (find_path_from && find_path_to) {
        result.path = await PathfindingService.findPath(userId, find_path_from, find_path_to);
      }

      // Get N1/N2/N3 connections for a person
      if (person_connections) {
        result.person_connections = await this.getPersonDegreeConnections(userId, person_connections);
      }

      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error('GetNetworkFunction error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get comprehensive network statistics
   */
  static async getNetworkStats(userId) {
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM people WHERE user_id = $1) as total_people,
        (SELECT COUNT(*) FROM relationships r
         WHERE r.person_a_id IN (SELECT id FROM people WHERE user_id = $1)) as total_relationships,
        (SELECT COUNT(*) FROM events WHERE user_id = $1) as total_events,
        (SELECT COUNT(*) FROM favors WHERE user_id = $1) as total_favors,
        (SELECT AVG(strength)::numeric(10,2) FROM relationships r
         WHERE r.person_a_id IN (SELECT id FROM people WHERE user_id = $1)) as avg_relationship_strength
    `;

    const result = await pool.query(statsQuery, [userId]);
    const stats = result.rows[0];

    // Get relationship strength distribution
    const distributionResult = await pool.query(
      `SELECT strength, COUNT(*) as count
       FROM relationships r
       WHERE r.person_a_id IN (SELECT id FROM people WHERE user_id = $1)
       GROUP BY strength
       ORDER BY strength DESC`,
      [userId]
    );

    stats.strength_distribution = distributionResult.rows;

    // Get relationship type distribution
    const typeDistResult = await pool.query(
      `SELECT relationship_type as type, COUNT(*) as count
       FROM relationships r
       WHERE r.person_a_id IN (SELECT id FROM people WHERE user_id = $1)
       GROUP BY relationship_type
       ORDER BY count DESC`,
      [userId]
    );

    stats.type_distribution = typeDistResult.rows;

    // Calculate network density (actual edges / possible edges)
    const totalPeople = parseInt(stats.total_people);
    const totalRelationships = parseInt(stats.total_relationships);
    const possibleEdges = (totalPeople * (totalPeople - 1)) / 2;
    stats.network_density = possibleEdges > 0
      ? (totalRelationships / possibleEdges).toFixed(4)
      : 0;

    return stats;
  }

  /**
   * Get top connections (most connected people)
   */
  static async getTopConnections(userId, limit = 10) {
    const result = await pool.query(
      `SELECT
        p.id,
        p.name,
        COUNT(r.id) as connection_count,
        AVG(r.strength)::numeric(10,2) as avg_strength,
        MAX(r.strength) as max_strength
       FROM people p
       LEFT JOIN relationships r ON (r.person_a_id = p.id OR r.person_b_id = p.id)
       WHERE p.user_id = $1
       GROUP BY p.id, p.name
       HAVING COUNT(r.id) > 0
       ORDER BY connection_count DESC, avg_strength DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Get N1/N2/N3 degree connections for a specific person
   */
  static async getPersonDegreeConnections(userId, personId) {
    // N1: Direct connections
    const n1Result = await pool.query(
      `SELECT DISTINCT
        CASE
          WHEN r.person_a_id = $2 THEN p2.id
          ELSE p1.id
        END as person_id,
        CASE
          WHEN r.person_a_id = $2 THEN p2.name
          ELSE p1.name
        END as name,
        r.relationship_type as type,
        r.strength
       FROM relationships r
       JOIN people p1 ON p1.id = r.person_a_id
       JOIN people p2 ON p2.id = r.person_b_id
       WHERE (r.person_a_id = $2 OR r.person_b_id = $2)
       AND p1.user_id = $1 AND p2.user_id = $1
       ORDER BY r.strength DESC`,
      [userId, personId]
    );

    const n1Connections = n1Result.rows;
    const n1Ids = n1Connections.map(c => c.person_id);

    // N2: Friends of friends (excluding self and N1)
    let n2Connections = [];
    if (n1Ids.length > 0) {
      const placeholders = n1Ids.map((_, i) => `$${i + 3}`).join(',');
      const n2Result = await pool.query(
        `SELECT DISTINCT
          CASE
            WHEN r.person_a_id = ANY($3::uuid[]) THEN p2.id
            ELSE p1.id
          END as person_id,
          CASE
            WHEN r.person_a_id = ANY($3::uuid[]) THEN p2.name
            ELSE p1.name
          END as name,
          'N2' as degree
         FROM relationships r
         JOIN people p1 ON p1.id = r.person_a_id
         JOIN people p2 ON p2.id = r.person_b_id
         WHERE (r.person_a_id = ANY($3::uuid[]) OR r.person_b_id = ANY($3::uuid[]))
         AND p1.user_id = $1 AND p2.user_id = $1
         AND CASE
           WHEN r.person_a_id = ANY($3::uuid[]) THEN p2.id
           ELSE p1.id
         END != $2
         AND CASE
           WHEN r.person_a_id = ANY($3::uuid[]) THEN p2.id
           ELSE p1.id
         END != ALL($3::uuid[])`,
        [userId, personId, n1Ids]
      );
      n2Connections = n2Result.rows;
    }

    return {
      person_id: personId,
      n1: {
        count: n1Connections.length,
        connections: n1Connections
      },
      n2: {
        count: n2Connections.length,
        connections: n2Connections.slice(0, 20) // Limit N2 to first 20 for brevity
      },
      total_network_reach: n1Connections.length + n2Connections.length
    };
  }
}

module.exports = GetNetworkFunction;
