const pool = require('../db/connection');

class Favor {
  /**
   * Create a new favor
   */
  static async create(userId, favorData) {
    const {
      giver_id,
      receiver_id,
      description,
      date,
      status,
      notes,
      estimated_value,
      time_commitment,
      favor_type
    } = favorData;

    const result = await pool.query(
      `INSERT INTO favors (user_id, giver_id, receiver_id, description, date, status, notes, estimated_value, time_commitment, favor_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [userId, giver_id, receiver_id, description, date, status, notes, estimated_value, time_commitment, favor_type]
    );

    return result.rows[0];
  }

  /**
   * Find all favors for a user with filters
   */
  static async findAll(userId, { status, person_id, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT * FROM favors WHERE user_id = $1';
    const params = [userId];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    if (person_id) {
      query += ` AND (giver_id = $${params.length + 1} OR receiver_id = $${params.length + 1})`;
      params.push(person_id);
    }

    query += ` ORDER BY date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM favors WHERE user_id = $1';
    const countParams = [userId];

    if (status) {
      countQuery += ` AND status = $2`;
      countParams.push(status);
    }

    if (person_id) {
      countQuery += ` AND (giver_id = $${countParams.length + 1} OR receiver_id = $${countParams.length + 1})`;
      countParams.push(person_id);
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
   * Find favor by ID
   */
  static async findById(id, userId) {
    const result = await pool.query(
      'SELECT * FROM favors WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return result.rows[0];
  }

  /**
   * Update favor
   */
  static async update(id, userId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) {
      return this.findById(id, userId);
    }

    const setClause = fields.map((field, idx) => `${field} = $${idx + 3}`).join(', ');

    const result = await pool.query(
      `UPDATE favors
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    return result.rows[0];
  }

  /**
   * Delete favor
   */
  static async delete(id, userId) {
    const result = await pool.query(
      'DELETE FROM favors WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return result.rowCount > 0;
  }

  /**
   * Get reciprocity balance between two people
   */
  static async getReciprocityBalance(userId, person1Id, person2Id) {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE giver_id = $2 AND receiver_id = $3) AS person1_given,
        COUNT(*) FILTER (WHERE giver_id = $3 AND receiver_id = $2) AS person2_given
       FROM favors
       WHERE user_id = $1
         AND ((giver_id = $2 AND receiver_id = $3) OR (giver_id = $3 AND receiver_id = $2))`,
      [userId, person1Id, person2Id]
    );

    const person1Given = parseInt(result.rows[0].person1_given);
    const person2Given = parseInt(result.rows[0].person2_given);

    return {
      person1_given: person1Given,
      person2_given: person2Given,
      balance: person1Given - person2Given
    };
  }

  /**
   * Get recent favors
   */
  static async getRecent(userId, limit = 10) {
    const result = await pool.query(
      `SELECT * FROM favors
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }
}

module.exports = Favor;
