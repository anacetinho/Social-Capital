const pool = require('../db/connection');

class Relationship {
  /**
   * Create a new relationship
   */
  static async create(userId, relationshipData) {
    const {
      person1_id,
      person2_id,
      person_a_id,
      person_b_id,
      relationship_type,
      strength,
      context,
      notes
    } = relationshipData;

    // Support both naming conventions (frontend uses person1_id/person2_id, DB uses person_a_id/person_b_id)
    const personA = person1_id || person_a_id;
    const personB = person2_id || person_b_id;

    const result = await pool.query(
      `INSERT INTO relationships (user_id, person_a_id, person_b_id, relationship_type, strength, context)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, personA, personB, relationship_type, strength, notes || context || '']
    );

    return result.rows[0];
  }

  /**
   * Find all relationships for a user with filters
   */
  static async findAll(userId, { person_id, relationship_type, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT r.*,
             p1.name as person1_name,
             p1.id as person1_id,
             p2.name as person2_name,
             p2.id as person2_id
      FROM relationships r
      JOIN people p1 ON r.person_a_id = p1.id
      JOIN people p2 ON r.person_b_id = p2.id
      WHERE r.user_id = $1
    `;
    const params = [userId];

    if (person_id) {
      query += ` AND (r.person_a_id = $${params.length + 1} OR r.person_b_id = $${params.length + 1})`;
      params.push(person_id);
    }

    if (relationship_type) {
      query += ` AND r.relationship_type = $${params.length + 1}`;
      params.push(relationship_type);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM relationships r WHERE r.user_id = $1';
    const countParams = [userId];

    if (person_id) {
      countQuery += ` AND (r.person_a_id = $2 OR r.person_b_id = $2)`;
      countParams.push(person_id);
    }

    if (relationship_type) {
      countQuery += ` AND r.relationship_type = $${countParams.length + 1}`;
      countParams.push(relationship_type);
    }

    const countResult = await pool.query(countQuery, countParams);

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Find relationship by ID
   */
  static async findById(id, userId) {
    const result = await pool.query(
      `SELECT r.*,
              r.person_a_id as person1_id,
              r.person_b_id as person2_id,
              r.context as notes
       FROM relationships r
       WHERE r.id = $1 AND r.user_id = $2`,
      [id, userId]
    );

    return result.rows[0];
  }

  /**
   * Find relationship between two people (bidirectional)
   */
  static async findBetweenPeople(userId, personAId, personBId) {
    const result = await pool.query(
      `SELECT * FROM relationships
       WHERE user_id = $1
         AND (
           (person_a_id = $2 AND person_b_id = $3)
           OR
           (person_a_id = $3 AND person_b_id = $2)
         )`,
      [userId, personAId, personBId]
    );

    return result.rows[0];
  }

  /**
   * Update relationship
   */
  static async update(id, userId, updates) {
    // Map frontend field names to database column names
    const fieldMapping = {
      'person1_id': 'person_a_id',
      'person2_id': 'person_b_id',
      'notes': 'context'
    };

    // Convert field names and build update data
    const mappedUpdates = {};
    Object.keys(updates).forEach(key => {
      const dbField = fieldMapping[key] || key;
      mappedUpdates[dbField] = updates[key];
    });

    const fields = Object.keys(mappedUpdates);
    const values = Object.values(mappedUpdates);

    if (fields.length === 0) {
      return this.findById(id, userId);
    }

    const setClause = fields.map((field, idx) => `${field} = $${idx + 3}`).join(', ');

    const result = await pool.query(
      `UPDATE relationships
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    return result.rows[0];
  }

  /**
   * Delete relationship
   */
  static async delete(id, userId) {
    const result = await pool.query(
      'DELETE FROM relationships WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return result.rowCount > 0;
  }

  /**
   * Get all relationships for user (for network graph)
   */
  static async getAllForUser(userId) {
    const result = await pool.query(
      'SELECT * FROM relationships WHERE user_id = $1',
      [userId]
    );

    return result.rows;
  }

  /**
   * Get relationship strength distribution
   */
  static async getStrengthDistribution(userId) {
    const result = await pool.query(
      `SELECT strength, COUNT(*) as count
       FROM relationships
       WHERE user_id = $1
       GROUP BY strength
       ORDER BY strength`,
      [userId]
    );

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    result.rows.forEach(row => {
      distribution[row.strength] = parseInt(row.count);
    });

    return distribution;
  }

  /**
   * Get average relationship strength
   */
  static async getAverageStrength(userId) {
    const result = await pool.query(
      `SELECT AVG(strength) as avg_strength
       FROM relationships
       WHERE user_id = $1`,
      [userId]
    );

    return parseFloat(result.rows[0].avg_strength) || 0;
  }

  /**
   * Get connection count for a person
   */
  static async getConnectionCount(userId, personId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM relationships
       WHERE user_id = $1
         AND (person_a_id = $2 OR person_b_id = $2)`,
      [userId, personId]
    );

    return parseInt(result.rows[0].count);
  }
}

module.exports = Relationship;
