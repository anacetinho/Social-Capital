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
   * Returns favors with person names and direction calculated from user perspective
   */
  static async findAll(userId, { status, person_id, direction, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT 
        f.*,
        pg.name as giver_name,
        pr.name as receiver_name
      FROM favors f
      LEFT JOIN people pg ON f.giver_id = pg.id
      LEFT JOIN people pr ON f.receiver_id = pr.id
      WHERE f.user_id = $1
    `;
    const params = [userId];

    if (status) {
      query += ` AND f.status = $${params.length + 1}`;
      params.push(status);
    }

    if (person_id) {
      query += ` AND (f.giver_id = $${params.length + 1} OR f.receiver_id = $${params.length + 1})`;
      params.push(person_id);
    }

    if (direction) {
      if (direction === 'given') {
        query += ` AND f.giver_id = $1`;
      } else if (direction === 'received') {
        query += ` AND f.receiver_id = $1`;
      }
    }

    query += ` ORDER BY f.date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Calculate direction and person info from user perspective
    const processedData = result.rows.map(favor => ({
      ...favor,
      // Calculate direction based on whether user is giver or receiver
      direction: favor.giver_id === userId ? 'given' : 'received',
      // Set person_id and person_name to the OTHER person in the favor
      person_id: favor.giver_id === userId ? favor.receiver_id : favor.giver_id,
      person_name: favor.giver_id === userId ? favor.receiver_name : favor.giver_name
    }));

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM favors f WHERE f.user_id = $1';
    const countParams = [userId];

    if (status) {
      countQuery += ` AND f.status = $2`;
      countParams.push(status);
    }

    if (person_id) {
      countQuery += ` AND (f.giver_id = $${countParams.length + 1} OR f.receiver_id = $${countParams.length + 1})`;
      countParams.push(person_id);
    }

    if (direction) {
      if (direction === 'given') {
        countQuery += ` AND f.giver_id = $1`;
      } else if (direction === 'received') {
        countQuery += ` AND f.receiver_id = $1`;
      }
    }

    const countResult = await pool.query(countQuery, countParams);

    return {
      data: processedData,
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
