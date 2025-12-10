const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db/connection');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const ChatAssistantService = require('../services/ChatAssistantService');
const AuthService = require('../services/AuthService');

/**
 * Auth middleware that supports both header and query param tokens
 * Needed for EventSource which doesn't support custom headers
 */
const authWithQueryParam = async (req, res, next) => {
  try {
    // Try header first
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token) {
      // Fallback to query parameter for EventSource
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = AuthService.verifyToken(token);

    // Attach user ID to request
    req.userId = decoded.userId;

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: err.message
    });
  }
};

/**
 * GET /api/v1/chats
 * Get all chats for the current user
 */
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.findByUserId(req.userId);

    res.json({
      success: true,
      count: chats.length,
      chats
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

/**
 * GET /api/v1/chats/:id
 * Get a specific chat with all messages and persona details
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id, req.userId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const messages = await Message.findByChatId(req.params.id);

    // Fetch persona details if set
    let askingAsPerson = null;
    let talkingToPerson = null;

    if (chat.asking_as_person_id) {
      const result = await pool.query(
        'SELECT id, name, photo_url FROM people WHERE id = $1 AND user_id = $2',
        [chat.asking_as_person_id, req.userId]
      );
      askingAsPerson = result.rows[0] || null;
    }

    if (chat.talking_to_person_id) {
      const result = await pool.query(
        'SELECT id, name, photo_url FROM people WHERE id = $1 AND user_id = $2',
        [chat.talking_to_person_id, req.userId]
      );
      talkingToPerson = result.rows[0] || null;
    }

    res.json({
      success: true,
      chat: {
        ...chat,
        asking_as_person: askingAsPerson,
        talking_to_person: talkingToPerson
      },
      messages
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

/**
 * POST /api/v1/chats
 * Create a new chat with an initial message and optional personas
 */
router.post('/', auth, async (req, res) => {
  try {
    const { message, context, askingAsPersonId, talkingToPersonId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if AI assistant is enabled and LLM is configured
    const userResult = await pool.query(
      'SELECT ai_assistant_enabled, ai_api_url, ai_model FROM users WHERE id = $1',
      [req.userId]
    );

    const userSettings = userResult.rows[0];

    if (!userSettings?.ai_assistant_enabled) {
      return res.status(403).json({
        error: 'AI assistant is not enabled. Please enable it in settings.'
      });
    }

    if (!userSettings.ai_api_url || !userSettings.ai_model) {
      return res.status(500).json({
        error: 'LLM not configured. Please set LLM API URL and model in settings.'
      });
    }

    // Validate persona IDs if provided
    if (askingAsPersonId) {
      const personCheck = await pool.query(
        'SELECT id FROM people WHERE id = $1 AND user_id = $2',
        [askingAsPersonId, req.userId]
      );
      if (personCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid asking_as_person_id' });
      }
    }

    if (talkingToPersonId) {
      const personCheck = await pool.query(
        'SELECT id FROM people WHERE id = $1 AND user_id = $2',
        [talkingToPersonId, req.userId]
      );
      if (personCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid talking_to_person_id' });
      }
    }

    // Create chat with initial message, personas, and optional context
    const chatResult = await pool.query(
      `INSERT INTO chats (user_id, title, context, asking_as_person_id, talking_to_person_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.userId,
        message.substring(0, 80), // Use first 80 chars as title
        context || null,
        askingAsPersonId || null,
        talkingToPersonId || null
      ]
    );

    const chat = chatResult.rows[0];

    // Create initial user message
    await Message.createUserMessage(chat.id, message);

    res.status(201).json({
      success: true,
      chat,
      message: 'Chat created successfully'
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

/**
 * POST /api/v1/chats/:id/messages
 * Add a message to a chat (user message)
 */
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify chat belongs to user
    const chat = await Chat.findById(req.params.id, req.userId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Create user message
    const message = await Message.createUserMessage(req.params.id, content);

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

/**
 * GET /api/v1/chats/:id/stream
 * Stream assistant response for a chat (Server-Sent Events)
 */
router.get('/:id/stream', authWithQueryParam, async (req, res) => {
  try {
    // Verify chat belongs to user
    const chat = await Chat.findById(req.params.id, req.userId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Get user settings
    const userResult = await pool.query(
      `SELECT ai_assistant_enabled, ai_api_url, ai_model, api_key
       FROM users
       WHERE id = $1`,
      [req.userId]
    );

    const userSettings = userResult.rows[0];

    if (!userSettings.ai_assistant_enabled) {
      return res.status(403).json({ error: 'AI assistant is not enabled' });
    }

    if (!userSettings.ai_api_url || !userSettings.ai_model) {
      return res.status(500).json({ error: 'LLM not configured' });
    }

    // Get chat history (last 10 messages)
    const messages = await Message.getRecentMessages(req.params.id, 10);

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'No user message to respond to' });
    }

    // Fetch persona details if set
    let askingAsPerson = null;
    let talkingToPerson = null;

    if (chat.asking_as_person_id) {
      const result = await pool.query(
        'SELECT id, name, photo_url FROM people WHERE id = $1 AND user_id = $2',
        [chat.asking_as_person_id, req.userId]
      );
      askingAsPerson = result.rows[0] || null;

      if (askingAsPerson) {
        console.log('Asking as person:', {
          id: askingAsPerson.id,
          name: askingAsPerson.name
        });
      }
    }

    if (chat.talking_to_person_id) {
      const result = await pool.query(
        'SELECT id, name, photo_url, summary_a FROM people WHERE id = $1 AND user_id = $2',
        [chat.talking_to_person_id, req.userId]
      );
      talkingToPerson = result.rows[0] || null;

      if (talkingToPerson && !talkingToPerson.summary_a) {
        return res.status(400).json({
          error: 'Cannot roleplay person without Summary A. Please generate summary first.'
        });
      }

      if (talkingToPerson) {
        console.log('Talking to person:', {
          id: talkingToPerson.id,
          name: talkingToPerson.name
        });
      }
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Create assistant service
    const assistant = new ChatAssistantService(
      userSettings.ai_api_url,
      userSettings.ai_model,
      userSettings.api_key || 'dummy-key'
    );

    // Format messages for LLM (remove id, created_at, etc.)
    const formattedMessages = Message.formatForLLM(messages);

    // Process message and stream response
    const stream = assistant.processMessage(
      req.userId,
      formattedMessages,
      askingAsPerson,
      talkingToPerson
    );

    let fullContent = '';

    for await (const chunk of stream) {
      // Accumulate content
      if (chunk.type === 'content') {
        fullContent += chunk.content;
      }

      // Send SSE event
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);

      // If done, save assistant message to database
      if (chunk.type === 'done') {
        // Log if content is empty for debugging
        if (!chunk.content || chunk.content.trim() === '') {
          console.warn('Assistant response is empty:', {
            chatId: req.params.id,
            fullContent: fullContent,
            chunkContent: chunk.content
          });
        }

        await Message.createAssistantMessage(req.params.id, chunk.content);
        // Update chat timestamp
        await Chat.touch(req.params.id);
      }
    }

    // Close the connection
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error streaming response:', error);

    // Send error event
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message
    })}\n\n`);

    res.end();
  }
});

/**
 * PATCH /api/v1/chats/:id
 * Update chat title or personas
 */
router.patch('/:id', auth, async (req, res) => {
  try {
    const { title, askingAsPersonId, talkingToPersonId } = req.body;

    // Verify chat belongs to user
    const chat = await Chat.findById(req.params.id, req.userId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Validate persona IDs if provided
    if (askingAsPersonId !== undefined && askingAsPersonId !== null) {
      const personCheck = await pool.query(
        'SELECT id FROM people WHERE id = $1 AND user_id = $2',
        [askingAsPersonId, req.userId]
      );
      if (personCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid asking_as_person_id' });
      }
    }

    if (talkingToPersonId !== undefined && talkingToPersonId !== null) {
      const personCheck = await pool.query(
        'SELECT id FROM people WHERE id = $1 AND user_id = $2',
        [talkingToPersonId, req.userId]
      );
      if (personCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid talking_to_person_id' });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }

    if (askingAsPersonId !== undefined) {
      updates.push(`asking_as_person_id = $${paramIndex++}`);
      values.push(askingAsPersonId);
    }

    if (talkingToPersonId !== undefined) {
      updates.push(`talking_to_person_id = $${paramIndex++}`);
      values.push(talkingToPersonId);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add updated_at and WHERE clause
    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(req.params.id);
    values.push(req.userId);

    const result = await pool.query(
      `UPDATE chats SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    res.json({
      success: true,
      chat: result.rows[0],
      message: 'Chat updated successfully'
    });
  } catch (error) {
    console.error('Error updating chat:', error);
    res.status(500).json({ error: 'Failed to update chat' });
  }
});

/**
 * GET /api/v1/chats/search?q=query
 * Search chats by title or message content
 */
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await pool.query(
      `SELECT DISTINCT c.id, c.title, c.created_at, c.updated_at,
              COUNT(m.id) as message_count
       FROM chats c
       LEFT JOIN messages m ON m.chat_id = c.id
       WHERE c.user_id = $1
         AND (c.title ILIKE $2 OR EXISTS (
           SELECT 1 FROM messages m2
           WHERE m2.chat_id = c.id AND m2.content ILIKE $2
         ))
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT 20`,
      [req.userId, `%${q}%`]
    );

    res.json({
      success: true,
      count: result.rows.length,
      chats: result.rows
    });
  } catch (error) {
    console.error('Error searching chats:', error);
    res.status(500).json({ error: 'Failed to search chats' });
  }
});

/**
 * DELETE /api/v1/chats/:id
 * Delete a chat
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.delete(req.params.id, req.userId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

module.exports = router;
