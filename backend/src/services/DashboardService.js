const pool = require('../db/connection');
const Person = require('../models/Person');
const Relationship = require('../models/Relationship');
const Event = require('../models/Event');
const Favor = require('../models/Favor');
const NetworkGraphService = require('./NetworkGraphService');

/**
 * Dashboard Service
 * Aggregates statistics and metrics for dashboard display
 */
class DashboardService {
  /**
   * Get comprehensive dashboard statistics
   * @param {string} userId - User ID
   * @param {string|null} personId - Optional person ID to filter stats
   */
  static async getStats(userId, personId = null) {
    if (personId) {
      return this.getPersonStats(userId, personId);
    }

    // Run all queries in parallel for performance
    const [
      totalPeople,
      totalRelationships,
      totalEvents,
      totalFavors,
      strengthDistribution,
      recentEvents,
      recentFavors,
      upcomingBirthdays,
      topConnections,
      networkHealthScore
    ] = await Promise.all([
      this.getTotalPeople(userId),
      this.getTotalRelationships(userId),
      this.getTotalEvents(userId),
      this.getTotalFavors(userId),
      Relationship.getStrengthDistribution(userId),
      Event.getRecent(userId, 10),
      Favor.getRecent(userId, 10),
      Person.getUpcomingBirthdays(userId, 30),
      this.getTopConnections(userId),
      this.calculateNetworkHealthScore(userId)
    ]);

    return {
      total_people: totalPeople,
      total_relationships: totalRelationships,
      total_events: totalEvents,
      total_favors: totalFavors,
      relationship_strength_distribution: strengthDistribution,
      recent_events: recentEvents,
      recent_favors: recentFavors,
      upcoming_birthdays: upcomingBirthdays,
      top_connections: topConnections,
      network_health_score: networkHealthScore
    };
  }

  /**
   * Get statistics for a specific person
   */
  static async getPersonStats(userId, personId) {
    const [
      personInfo,
      relationshipsCount,
      eventsCount,
      favorsGiven,
      favorsReceived,
      recentEvents,
      recentFavors,
      relationships,
      degreeConnections
    ] = await Promise.all([
      Person.findById(personId, userId),
      this.getPersonRelationshipsCount(userId, personId),
      this.getPersonEventsCount(userId, personId),
      this.getPersonFavorsGiven(userId, personId),
      this.getPersonFavorsReceived(userId, personId),
      this.getPersonRecentEvents(userId, personId, 10),
      this.getPersonRecentFavors(userId, personId, 10),
      this.getPersonRelationships(userId, personId),
      this.getDegreeConnections(userId, personId)
    ]);

    // Calculate relationship strength distribution for this person
    const strengthDistribution = {};
    relationships.forEach(rel => {
      const strength = rel.strength || 1;
      strengthDistribution[strength] = (strengthDistribution[strength] || 0) + 1;
    });

    return {
      person: personInfo,
      total_people: 1,
      total_relationships: relationshipsCount,
      total_events: eventsCount,
      total_favors: favorsGiven + favorsReceived,
      favors_given: favorsGiven,
      favors_received: favorsReceived,
      relationship_strength_distribution: strengthDistribution,
      recent_events: recentEvents,
      recent_favors: recentFavors,
      top_connections: relationships.slice(0, 5).map(r => ({
        id: r.person_id,
        name: r.person_name,
        connection_count: 1,
        strength: r.strength
      })),
      network_health_score: this.calculatePersonHealthScore(relationshipsCount, eventsCount, favorsGiven + favorsReceived),
      degree_connections: degreeConnections
    };
  }

  /**
   * Calculate degree connections (N1, N2, N3) for a person
   */
  static async getDegreeConnections(userId, personId) {
    // N1: Direct connections (1st degree)
    const n1Query = `
      SELECT DISTINCT
        CASE
          WHEN r.person_a_id = $2 THEN r.person_b_id
          ELSE r.person_a_id
        END as person_id
      FROM relationships r
      WHERE r.user_id = $1 AND (r.person_a_id = $2 OR r.person_b_id = $2)
    `;
    const n1Result = await pool.query(n1Query, [userId, personId]);
    const n1Ids = n1Result.rows.map(r => r.person_id);

    if (n1Ids.length === 0) {
      return { n1: 0, n2: 0, n3: 0 };
    }

    // N2: 2nd degree connections (connections of connections, excluding the person and N1)
    const n2Query = `
      SELECT DISTINCT
        CASE
          WHEN r.person_a_id = ANY($3::uuid[]) THEN r.person_b_id
          ELSE r.person_a_id
        END as person_id
      FROM relationships r
      WHERE r.user_id = $1
        AND (r.person_a_id = ANY($3::uuid[]) OR r.person_b_id = ANY($3::uuid[]))
        AND NOT (
          CASE
            WHEN r.person_a_id = ANY($3::uuid[]) THEN r.person_b_id
            ELSE r.person_a_id
          END = $2
          OR
          CASE
            WHEN r.person_a_id = ANY($3::uuid[]) THEN r.person_b_id
            ELSE r.person_a_id
          END = ANY($3::uuid[])
        )
    `;
    const n2Result = await pool.query(n2Query, [userId, personId, n1Ids]);
    const n2Ids = n2Result.rows.map(r => r.person_id);

    if (n2Ids.length === 0) {
      return { n1: n1Ids.length, n2: n1Ids.length, n3: n1Ids.length };
    }

    // N3: 3rd degree connections (connections of N2, excluding person, N1, and N2)
    const allN1N2 = [...n1Ids, ...n2Ids];
    const n3Query = `
      SELECT DISTINCT
        CASE
          WHEN r.person_a_id = ANY($3::uuid[]) THEN r.person_b_id
          ELSE r.person_a_id
        END as person_id
      FROM relationships r
      WHERE r.user_id = $1
        AND (r.person_a_id = ANY($3::uuid[]) OR r.person_b_id = ANY($3::uuid[]))
        AND NOT (
          CASE
            WHEN r.person_a_id = ANY($3::uuid[]) THEN r.person_b_id
            ELSE r.person_a_id
          END = $2
          OR
          CASE
            WHEN r.person_a_id = ANY($3::uuid[]) THEN r.person_b_id
            ELSE r.person_a_id
          END = ANY($4::uuid[])
        )
    `;
    const n3Result = await pool.query(n3Query, [userId, personId, n2Ids, allN1N2]);
    const n3Ids = n3Result.rows.map(r => r.person_id);

    // Return cumulative counts: N2 = N1 + N2, N3 = N1 + N2 + N3
    return {
      n1: n1Ids.length,
      n2: n1Ids.length + n2Ids.length,
      n3: n1Ids.length + n2Ids.length + n3Ids.length
    };
  }

  /**
   * Get top connections (people with most relationships)
   */
  static async getTopConnections(userId) {
    const query = `
      SELECT
        p.id,
        p.name,
        COUNT(DISTINCT r.id) as connection_count
      FROM people p
      LEFT JOIN relationships r ON (r.person_a_id = p.id OR r.person_b_id = p.id) AND r.user_id = $1
      WHERE p.user_id = $1
      GROUP BY p.id, p.name
      ORDER BY connection_count DESC
      LIMIT 10
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Calculate overall network health score
   */
  static async calculateNetworkHealthScore(userId) {
    const [totalPeople, totalRelationships, totalEvents, avgStrength] = await Promise.all([
      this.getTotalPeople(userId),
      this.getTotalRelationships(userId),
      this.getTotalEvents(userId),
      Relationship.getAverageStrength(userId)
    ]);

    // Score based on: network size (30%), activity (30%), relationship quality (40%)
    const sizeScore = Math.min((totalPeople / 50) * 30, 30);
    const activityScore = Math.min((totalEvents / 100) * 30, 30);
    const qualityScore = (avgStrength / 5) * 40;

    return Math.round(sizeScore + activityScore + qualityScore);
  }

  /**
   * Calculate health score for a specific person
   */
  static calculatePersonHealthScore(relationshipsCount, eventsCount, favorsCount) {
    const relationshipScore = Math.min((relationshipsCount / 10) * 40, 40);
    const eventScore = Math.min((eventsCount / 20) * 35, 35);
    const favorScore = Math.min((favorsCount / 10) * 25, 25);

    return Math.round(relationshipScore + eventScore + favorScore);
  }

  /**
   * Get relationships count for a person
   */
  static async getPersonRelationshipsCount(userId, personId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM relationships WHERE user_id = $1 AND (person_a_id = $2 OR person_b_id = $2)',
      [userId, personId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get events count for a person
   */
  static async getPersonEventsCount(userId, personId) {
    const result = await pool.query(
      `SELECT COUNT(DISTINCT e.id)
       FROM events e
       INNER JOIN event_participants ep ON e.id = ep.event_id
       WHERE e.user_id = $1 AND ep.person_id = $2`,
      [userId, personId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get favors given by a person
   */
  static async getPersonFavorsGiven(userId, personId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM favors WHERE user_id = $1 AND giver_id = $2',
      [userId, personId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get favors received by a person
   */
  static async getPersonFavorsReceived(userId, personId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM favors WHERE user_id = $1 AND receiver_id = $2',
      [userId, personId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get recent events for a person
   */
  static async getPersonRecentEvents(userId, personId, limit = 10) {
    const result = await pool.query(
      `SELECT e.*
       FROM events e
       INNER JOIN event_participants ep ON e.id = ep.event_id
       WHERE e.user_id = $1 AND ep.person_id = $2
       ORDER BY e.date DESC
       LIMIT $3`,
      [userId, personId, limit]
    );
    return result.rows;
  }

  /**
   * Get recent favors for a person (given or received)
   */
  static async getPersonRecentFavors(userId, personId, limit = 10) {
    const result = await pool.query(
      `SELECT f.*,
        giver.name as giver_name,
        receiver.name as receiver_name
       FROM favors f
       LEFT JOIN people giver ON f.giver_id = giver.id
       LEFT JOIN people receiver ON f.receiver_id = receiver.id
       WHERE f.user_id = $1 AND (f.giver_id = $2 OR f.receiver_id = $2)
       ORDER BY f.date DESC
       LIMIT $3`,
      [userId, personId, limit]
    );
    return result.rows;
  }

  /**
   * Get all relationships for a person with details
   */
  static async getPersonRelationships(userId, personId) {
    const result = await pool.query(
      `SELECT
        r.*,
        CASE
          WHEN r.person_a_id = $2 THEN r.person_b_id
          ELSE r.person_a_id
        END as person_id,
        CASE
          WHEN r.person_a_id = $2 THEN p2.name
          ELSE p1.name
        END as person_name
       FROM relationships r
       LEFT JOIN people p1 ON r.person_a_id = p1.id
       LEFT JOIN people p2 ON r.person_b_id = p2.id
       WHERE r.user_id = $1 AND (r.person_a_id = $2 OR r.person_b_id = $2)
       ORDER BY r.strength DESC`,
      [userId, personId]
    );
    return result.rows;
  }

  /**
   * Get activity timeline
   */
  static async getActivity(userId, { start_date, end_date, limit = 20 } = {}) {
    let query = `
      SELECT 'event' as type, e.title as description, e.date as timestamp, e.id
      FROM events e
      WHERE e.user_id = $1

      UNION ALL

      SELECT 'favor' as type, f.description, f.date as timestamp, f.id
      FROM favors f
      WHERE f.user_id = $1

      UNION ALL

      SELECT 'person_added' as type, CONCAT('Added ', p.name) as description, p.created_at as timestamp, p.id
      FROM people p
      WHERE p.user_id = $1

      UNION ALL

      SELECT 'relationship_added' as type, 'New relationship created' as description, r.created_at as timestamp, r.id
      FROM relationships r
      WHERE r.user_id = $1
    `;

    const params = [userId];

    if (start_date) {
      query = query.replace(/WHERE e\.user_id = \$1/g, `WHERE e.user_id = $1 AND e.date >= $${params.length + 1}`);
      query = query.replace(/WHERE f\.user_id = \$1/g, `WHERE f.user_id = $1 AND f.date >= $${params.length + 1}`);
      query = query.replace(/WHERE p\.user_id = \$1/g, `WHERE p.user_id = $1 AND p.created_at >= $${params.length + 1}`);
      query = query.replace(/WHERE r\.user_id = \$1/g, `WHERE r.user_id = $1 AND r.created_at >= $${params.length + 1}`);
      params.push(start_date);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return {
      activities: result.rows
    };
  }

  /**
   * Get network health metrics
   */
  static async getNetworkHealth(userId) {
    const [
      avgStrength,
      totalConnections,
      staleContacts,
      density
    ] = await Promise.all([
      Relationship.getAverageStrength(userId),
      this.getTotalRelationships(userId),
      Person.getStaleContacts(userId, 90),
      NetworkGraphService.calculateNetworkDensity(userId)
    ]);

    return {
      average_relationship_strength: avgStrength,
      total_connections: totalConnections,
      stale_relationships_count: staleContacts.length,
      network_density: density
    };
  }

  /**
   * Helper: Get total people count
   */
  static async getTotalPeople(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM people WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Helper: Get total relationships count
   */
  static async getTotalRelationships(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM relationships WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Helper: Get total events count
   */
  static async getTotalEvents(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM events WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Helper: Get total favors count
   */
  static async getTotalFavors(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM favors WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = DashboardService;
