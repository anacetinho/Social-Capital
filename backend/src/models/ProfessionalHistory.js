const pool = require('../db/connection');

class ProfessionalHistory {
  /**
   * Transform database row to frontend-friendly format
   * Converts 'notes' field to 'description' for frontend compatibility
   */
  static _transformToFrontend(row) {
    if (!row) return row;

    const transformed = { ...row };
    // Map database 'notes' field to frontend 'description' field
    if (row.notes !== undefined) {
      transformed.description = row.notes;
      delete transformed.notes;
    }
    return transformed;
  }

  /**
   * Create a new professional history entry
   */
  static async create(userId, professionalHistoryData) {
    const {
      person_id,
      company,
      position,
      start_date,
      end_date,
      notes,
      description
    } = professionalHistoryData;

    // Validate that person_id belongs to the current user
    const personCheck = await pool.query(
      'SELECT id FROM people WHERE id = $1 AND user_id = $2',
      [person_id, userId]
    );

    if (personCheck.rows.length === 0) {
      throw new Error('Person not found or does not belong to user');
    }

    // Support both 'description' and 'notes' fields
    const notesValue = notes || description || null;

    const result = await pool.query(
      `INSERT INTO professional_history (person_id, company, position, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [person_id, company, position, start_date, end_date || null, notesValue]
    );

    return this._transformToFrontend(result.rows[0]);
  }

  /**
   * Find all professional history for a user (optionally filtered by person)
   */
  static async findAll(userId, { person_id } = {}) {
    let query = `
      SELECT ph.*
      FROM professional_history ph
      JOIN people p ON ph.person_id = p.id
      WHERE p.user_id = $1
    `;
    const params = [userId];

    if (person_id) {
      query += ` AND ph.person_id = $2`;
      params.push(person_id);
    }

    query += ' ORDER BY ph.start_date DESC';

    const result = await pool.query(query, params);

    return {
      data: result.rows.map(row => this._transformToFrontend(row))
    };
  }

  /**
   * Find professional history entry by ID
   */
  static async findById(id, userId) {
    const result = await pool.query(
      `SELECT ph.*
       FROM professional_history ph
       JOIN people p ON ph.person_id = p.id
       WHERE ph.id = $1 AND p.user_id = $2`,
      [id, userId]
    );

    return this._transformToFrontend(result.rows[0]);
  }

  /**
   * Update professional history entry
   */
  static async update(id, userId, updates) {
    // Map frontend field names to database column names
    const fieldMapping = {
      'description': 'notes'  // Frontend uses 'description', DB uses 'notes'
    };

    // Apply field mapping
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

    const setClause = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE professional_history ph
       SET ${setClause}
       FROM people p
       WHERE ph.id = $${fields.length + 1}
         AND ph.person_id = p.id
         AND p.user_id = $${fields.length + 2}
       RETURNING ph.*`,
      [...values, id, userId]
    );

    return this._transformToFrontend(result.rows[0]);
  }

  /**
   * Delete professional history entry
   */
  static async delete(id, userId) {
    const result = await pool.query(
      `DELETE FROM professional_history ph
       USING people p
       WHERE ph.id = $1
         AND ph.person_id = p.id
         AND p.user_id = $2`,
      [id, userId]
    );

    return result.rowCount > 0;
  }

  /**
   * Find people who worked at a specific company
   */
  static async findByCompany(userId, company) {
    const result = await pool.query(
      `SELECT DISTINCT p.*, ph.company, ph.position, ph.start_date, ph.end_date
       FROM people p
       JOIN professional_history ph ON p.id = ph.person_id
       WHERE p.user_id = $1 AND ph.company ILIKE $2
       ORDER BY ph.start_date DESC`,
      [userId, `%${company}%`]
    );

    return result.rows;
  }
}

module.exports = ProfessionalHistory;
