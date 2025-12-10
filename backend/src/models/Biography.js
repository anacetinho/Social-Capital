const pool = require('../db/connection');

class Biography {
  /**
   * Create a new biography note
   */
  static async create(userId, data) {
    const { person_id, title, note_date, note } = data;

    const result = await pool.query(
      `INSERT INTO biographies (user_id, person_id, title, note_date, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, person_id, title, note_date, note]
    );

    return result.rows[0];
  }

  /**
   * Find all biography notes with optional filters
   */
  static async findAll(userId, filters = {}) {
    const { person_id, limit = 50, offset = 0 } = filters;

    let query = `
      SELECT b.*, p.name as person_name
      FROM biographies b
      JOIN people p ON b.person_id = p.id
      WHERE b.user_id = $1
    `;
    const params = [userId];
    let paramCount = 1;

    if (person_id) {
      paramCount++;
      query += ` AND b.person_id = $${paramCount}`;
      params.push(person_id);
    }

    query += ` ORDER BY b.note_date DESC, b.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Find biography note by ID
   */
  static async findById(id, userId) {
    const result = await pool.query(
      `SELECT b.*, p.name as person_name
       FROM biographies b
       JOIN people p ON b.person_id = p.id
       WHERE b.id = $1 AND b.user_id = $2`,
      [id, userId]
    );

    return result.rows[0];
  }

  /**
   * Update biography note
   */
  static async update(id, userId, data) {
    const { title, note_date, note } = data;
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      params.push(title);
    }

    if (note_date !== undefined) {
      paramCount++;
      updates.push(`note_date = $${paramCount}`);
      params.push(note_date);
    }

    if (note !== undefined) {
      paramCount++;
      updates.push(`note = $${paramCount}`);
      params.push(note);
    }

    if (updates.length === 0) {
      return this.findById(id, userId);
    }

    paramCount++;
    params.push(new Date());
    updates.push(`updated_at = $${paramCount}`);

    paramCount++;
    params.push(id);
    const idParam = paramCount;

    paramCount++;
    params.push(userId);
    const userIdParam = paramCount;

    const result = await pool.query(
      `UPDATE biographies
       SET ${updates.join(', ')}
       WHERE id = $${idParam} AND user_id = $${userIdParam}
       RETURNING *`,
      params
    );

    return result.rows[0];
  }

  /**
   * Delete biography note
   */
  static async delete(id, userId) {
    const result = await pool.query(
      'DELETE FROM biographies WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    return result.rows[0];
  }
}

module.exports = Biography;
