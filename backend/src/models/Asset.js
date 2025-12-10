const pool = require('../db/connection');

class Asset {
  /**
   * Create a new asset
   */
  static async create(userId, assetData) {
    const {
      owner_id,
      asset_type,
      name,
      description,
      availability,
      estimated_value,
      address,
      notes
    } = assetData;

    const result = await pool.query(
      `INSERT INTO assets (user_id, owner_id, asset_type, name, description, availability, estimated_value, address, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, owner_id, asset_type, name, description, availability, estimated_value || null, address, notes]
    );

    return result.rows[0];
  }

  /**
   * Find all assets for a user with filters
   */
  static async findAll(userId, { asset_type, owner_id, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT * FROM assets WHERE user_id = $1';
    const params = [userId];

    if (asset_type) {
      query += ` AND asset_type = $${params.length + 1}`;
      params.push(asset_type);
    }

    if (owner_id) {
      query += ` AND owner_id = $${params.length + 1}`;
      params.push(owner_id);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM assets WHERE user_id = $1';
    const countParams = [userId];

    if (asset_type) {
      countQuery += ` AND asset_type = $2`;
      countParams.push(asset_type);
    }

    if (owner_id) {
      countQuery += ` AND owner_id = $${countParams.length + 1}`;
      countParams.push(owner_id);
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
   * Find asset by ID
   */
  static async findById(id, userId) {
    const result = await pool.query(
      'SELECT * FROM assets WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return result.rows[0];
  }

  /**
   * Update asset
   */
  static async update(id, userId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) {
      return this.findById(id, userId);
    }

    const setClause = fields.map((field, idx) => `${field} = $${idx + 3}`).join(', ');

    const result = await pool.query(
      `UPDATE assets
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values]
    );

    return result.rows[0];
  }

  /**
   * Delete asset
   */
  static async delete(id, userId) {
    const result = await pool.query(
      'DELETE FROM assets WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return result.rowCount > 0;
  }

  /**
   * Search assets by name or description
   */
  static async search(userId, searchTerm) {
    const result = await pool.query(
      `SELECT * FROM assets
       WHERE user_id = $1
         AND (name ILIKE $2 OR description ILIKE $2)
       ORDER BY name ASC`,
      [userId, `%${searchTerm}%`]
    );

    return result.rows;
  }
}

module.exports = Asset;
