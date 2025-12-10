const pool = require('../db/connection');

class Chat {
  /**
   * Find chat by ID for the current user
   */
  static async findById(chatId, userId) {
    const result = await pool.query(
      'SELECT * FROM chats WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );
    return result.rows[0];
  }

  /**
   * Get all chats for a user, ordered by most recent
   */
  static async findByUserId(userId, limit = 50) {
    const result = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM messages WHERE chat_id = c.id) as message_count
      FROM chats c
      WHERE c.user_id = $1
      ORDER BY c.updated_at DESC
      LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Create a new chat
   */
  static async create(userId, title, context = null) {
    const result = await pool.query(
      `INSERT INTO chats (user_id, title, context)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, title, context ? JSON.stringify(context) : null]
    );
    return result.rows[0];
  }

  /**
   * Create a new chat with an initial user message
   * Returns the chat with the message embedded
   */
  static async start(userId, messageContent, model, context = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create the chat with title from first 80 chars of message
      const title = messageContent.length > 80
        ? messageContent.substring(0, 80) + '...'
        : messageContent;

      const chatResult = await client.query(
        `INSERT INTO chats (user_id, title, context)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, title, context ? JSON.stringify(context) : null]
      );
      const chat = chatResult.rows[0];

      // Create the initial user message
      const messageResult = await client.query(
        `INSERT INTO messages (chat_id, role, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [chat.id, 'user', messageContent]
      );

      await client.query('COMMIT');

      return {
        ...chat,
        initialMessage: messageResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update chat (e.g., to change title)
   */
  static async update(chatId, userId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(updates.title);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(chatId, userId);

    const result = await pool.query(
      `UPDATE chats
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount++} AND user_id = $${paramCount++}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete a chat and all its messages (cascade)
   */
  static async delete(chatId, userId) {
    const result = await pool.query(
      'DELETE FROM chats WHERE id = $1 AND user_id = $2 RETURNING *',
      [chatId, userId]
    );
    return result.rows[0];
  }

  /**
   * Check if chat needs an assistant response
   * (i.e., the last message is from the user)
   */
  static async needsResponse(chatId) {
    const result = await pool.query(
      `SELECT role FROM messages
       WHERE chat_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [chatId]
    );
    return result.rows.length > 0 && result.rows[0].role === 'user';
  }

  /**
   * Touch the chat to update its updated_at timestamp
   */
  static async touch(chatId) {
    await pool.query(
      'UPDATE chats SET updated_at = NOW() WHERE id = $1',
      [chatId]
    );
  }
}

module.exports = Chat;
