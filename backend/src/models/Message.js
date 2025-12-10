const pool = require('../db/connection');

class Message {
  /**
   * Find message by ID
   */
  static async findById(messageId) {
    const result = await pool.query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId]
    );
    return result.rows[0];
  }

  /**
   * Get all messages for a chat, ordered chronologically
   */
  static async findByChatId(chatId, limit = 100) {
    const result = await pool.query(
      `SELECT * FROM messages
       WHERE chat_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [chatId, limit]
    );
    return result.rows;
  }

  /**
   * Get the last N messages from a chat (for context)
   */
  static async getRecentMessages(chatId, count = 10) {
    const result = await pool.query(
      `SELECT * FROM messages
       WHERE chat_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [chatId, count]
    );
    // Reverse to get chronological order
    return result.rows.reverse();
  }

  /**
   * Create a user message
   */
  static async createUserMessage(chatId, content) {
    const result = await pool.query(
      `INSERT INTO messages (chat_id, role, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [chatId, 'user', content]
    );
    return result.rows[0];
  }

  /**
   * Create an assistant message
   */
  static async createAssistantMessage(chatId, content, toolCalls = null) {
    const result = await pool.query(
      `INSERT INTO messages (chat_id, role, content, tool_calls)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [chatId, 'assistant', content, toolCalls ? JSON.stringify(toolCalls) : null]
    );
    return result.rows[0];
  }

  /**
   * Create a generic message
   */
  static async create(chatId, role, content, toolCalls = null) {
    if (!['user', 'assistant'].includes(role)) {
      throw new Error('Invalid role: must be "user" or "assistant"');
    }

    const result = await pool.query(
      `INSERT INTO messages (chat_id, role, content, tool_calls)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [chatId, role, content, toolCalls ? JSON.stringify(toolCalls) : null]
    );
    return result.rows[0];
  }

  /**
   * Update message content (e.g., for streaming updates)
   */
  static async updateContent(messageId, content) {
    const result = await pool.query(
      `UPDATE messages
       SET content = $1
       WHERE id = $2
       RETURNING *`,
      [content, messageId]
    );
    return result.rows[0];
  }

  /**
   * Append to message content (for streaming)
   */
  static async appendContent(messageId, chunk) {
    const result = await pool.query(
      `UPDATE messages
       SET content = content || $1
       WHERE id = $2
       RETURNING *`,
      [chunk, messageId]
    );
    return result.rows[0];
  }

  /**
   * Update tool calls
   */
  static async updateToolCalls(messageId, toolCalls) {
    const result = await pool.query(
      `UPDATE messages
       SET tool_calls = $1
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(toolCalls), messageId]
    );
    return result.rows[0];
  }

  /**
   * Delete a message
   */
  static async delete(messageId) {
    const result = await pool.query(
      'DELETE FROM messages WHERE id = $1 RETURNING *',
      [messageId]
    );
    return result.rows[0];
  }

  /**
   * Get message count for a chat
   */
  static async getCount(chatId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM messages WHERE chat_id = $1',
      [chatId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Format messages for LLM (OpenAI format)
   */
  static formatForLLM(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.tool_calls && msg.tool_calls.length > 0 && { tool_calls: msg.tool_calls })
    }));
  }
}

module.exports = Message;
