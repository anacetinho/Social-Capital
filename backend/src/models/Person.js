const pool = require('../db/connection');

class Person {
  /**
   * Create a new person
   */
  static async create(userId, personData) {
    const {
      name,
      gender,
      email,
      phone,
      birthday,
      address,
      linkedin_url,
      notes,
      importance
    } = personData;

    const result = await pool.query(
      `INSERT INTO people (user_id, name, gender, email, phone, birthday, address, linkedin_url, notes, importance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [userId, name, gender, email, phone, birthday, address, linkedin_url, notes, importance]
    );

    return result.rows[0];
  }

  /**
   * Find all people for a user with pagination and search
   */
  static async findAll(userId, { search, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT * FROM people WHERE user_id = $1';
    const params = [userId];

    if (search) {
      query += ` AND (name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM people WHERE user_id = $1';
    const countParams = [userId];

    if (search) {
      countQuery += ` AND (name ILIKE $2 OR email ILIKE $2)`;
      countParams.push(`%${search}%`);
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
   * Find person by ID (for specific user)
   */
  static async findById(id, userId) {
    const result = await pool.query(
      'SELECT * FROM people WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return result.rows[0];
  }

  /**
   * Update person information
   */
  static async update(id, userId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) {
      return this.findById(id, userId);
    }

    const setClause = fields.map((field, idx) => `${field} = $${idx + 3}`).join(', ');

    const result = await pool.query(
      `UPDATE people
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    return result.rows[0];
  }

  /**
   * Delete person
   */
  static async delete(id, userId) {
    const result = await pool.query(
      'DELETE FROM people WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return result.rowCount > 0;
  }

  /**
   * Update profile picture URL
   */
  static async updateProfilePicture(id, userId, pictureUrl) {
    const result = await pool.query(
      `UPDATE people
       SET photo_url = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, pictureUrl]
    );

    return result.rows[0];
  }

  /**
   * Get people with upcoming birthdays (next N days)
   */
  static async getUpcomingBirthdays(userId, days = 30) {
    const result = await pool.query(
      `SELECT * FROM people
       WHERE user_id = $1
         AND birthday IS NOT NULL
         AND (
           (EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(DAY FROM birthday) >= EXTRACT(DAY FROM CURRENT_DATE))
           OR
           (EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month')
            AND EXTRACT(DAY FROM birthday) < EXTRACT(DAY FROM CURRENT_DATE))
         )
       ORDER BY EXTRACT(MONTH FROM birthday), EXTRACT(DAY FROM birthday)
       LIMIT 5`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get people by importance level
   */
  static async findByImportance(userId, importance) {
    const result = await pool.query(
      `SELECT * FROM people
       WHERE user_id = $1 AND importance = $2
       ORDER BY name ASC`,
      [userId, importance]
    );

    return result.rows;
  }

  /**
   * Get people who haven't been contacted recently
   */
  static async getStaleContacts(userId, daysThreshold = 90) {
    const result = await pool.query(
      `SELECT * FROM people
       WHERE user_id = $1
         AND (
           last_contact_date IS NULL
           OR last_contact_date < NOW() - INTERVAL '${daysThreshold} days'
         )
       ORDER BY last_contact_date ASC NULLS LAST
       LIMIT 20`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get lightweight people list for dropdowns
   * Returns only id, name, and photo_url for efficient dropdown rendering
   */
  static async getDropdownList(userId) {
    const result = await pool.query(
      `SELECT id, name, photo_url
       FROM people
       WHERE user_id = $1
       ORDER BY name ASC`,
      [userId]
    );

    return result.rows;
  }
}

module.exports = Person;
