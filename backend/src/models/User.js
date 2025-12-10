const pool = require('../db/connection');
const bcrypt = require('bcryptjs'); // Note: using bcryptjs for ARM64 compatibility

class User {
  /**
   * Create a new user with hashed password
   */
  static async create(email, password, preferences = {}) {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, preferences)
       VALUES ($1, $2, $3)
       RETURNING id, email, created_at, preferences`,
      [email, passwordHash, JSON.stringify(preferences)]
    );

    return result.rows[0];
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const result = await pool.query(
      'SELECT id, email, created_at, preferences FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0];
  }

  /**
   * Verify user password
   */
  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(id, preferences) {
    const result = await pool.query(
      `UPDATE users
       SET preferences = $2
       WHERE id = $1
       RETURNING id, email, created_at, preferences`,
      [id, JSON.stringify(preferences)]
    );

    return result.rows[0];
  }

  /**
   * Delete user account
   */
  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );

    return result.rowCount > 0;
  }

  /**
   * Check if email already exists
   */
  static async emailExists(email) {
    const result = await pool.query(
      'SELECT 1 FROM users WHERE email = $1',
      [email]
    );

    return result.rows.length > 0;
  }
}

module.exports = User;
