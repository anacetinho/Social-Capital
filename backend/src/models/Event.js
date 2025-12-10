const pool = require('../db/connection');

class Event {
  /**
   * Create a new event with participants (transaction)
   */
  static async create(userId, eventData) {
    const {
      title,
      description,
      location,
      date,
      event_type,
      notes,
      participant_ids = []
    } = eventData;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create event
      const eventResult = await client.query(
        `INSERT INTO events (user_id, title, description, location, date, event_type, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, title, description, location, date, event_type, notes]
      );

      const event = eventResult.rows[0];

      // Add participants
      if (participant_ids.length > 0) {
        for (const personId of participant_ids) {
          await client.query(
            'INSERT INTO event_participants (event_id, person_id) VALUES ($1, $2)',
            [event.id, personId]
          );
        }
      }

      await client.query('COMMIT');
      return event;

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Find all events for a user with filters
   */
  static async findAll(userId, { event_type, person_id, start_date, end_date, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT DISTINCT e.* FROM events e';
    const params = [userId];

    if (person_id) {
      query += ' JOIN event_participants ep ON e.id = ep.event_id';
    }

    query += ' WHERE e.user_id = $1';

    if (event_type) {
      query += ` AND e.event_type = $${params.length + 1}`;
      params.push(event_type);
    }

    if (person_id) {
      query += ` AND ep.person_id = $${params.length + 1}`;
      params.push(person_id);
    }

    if (start_date) {
      query += ` AND e.date >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND e.date <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` ORDER BY e.date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT e.id) FROM events e';
    const countParams = [userId];

    if (person_id) {
      countQuery += ' JOIN event_participants ep ON e.id = ep.event_id';
    }

    countQuery += ' WHERE e.user_id = $1';

    if (event_type) {
      countQuery += ` AND e.event_type = $${countParams.length + 1}`;
      countParams.push(event_type);
    }

    if (person_id) {
      countQuery += ` AND ep.person_id = $${countParams.length + 1}`;
      countParams.push(person_id);
    }

    if (start_date) {
      countQuery += ` AND e.date >= $${countParams.length + 1}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countQuery += ` AND e.date <= $${countParams.length + 1}`;
      countParams.push(end_date);
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
   * Find event by ID with participants
   */
  static async findById(id, userId) {
    const eventResult = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (eventResult.rows.length === 0) {
      return null;
    }

    const event = eventResult.rows[0];

    // Get participants
    const participantsResult = await pool.query(
      `SELECT p.* FROM people p
       JOIN event_participants ep ON p.id = ep.person_id
       WHERE ep.event_id = $1`,
      [id]
    );

    event.participants = participantsResult.rows;

    return event;
  }

  /**
   * Update event (with participants)
   */
  static async update(id, userId, updates) {
    const { participant_ids, ...eventUpdates } = updates;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update event fields
      if (Object.keys(eventUpdates).length > 0) {
        const fields = Object.keys(eventUpdates);
        const values = Object.values(eventUpdates);
        const setClause = fields.map((field, idx) => `${field} = $${idx + 3}`).join(', ');

        await client.query(
          `UPDATE events
           SET ${setClause}, updated_at = NOW()
           WHERE id = $1 AND user_id = $2`,
          [id, userId, ...values]
        );
      }

      // Update participants if provided
      if (participant_ids) {
        await client.query('DELETE FROM event_participants WHERE event_id = $1', [id]);

        for (const personId of participant_ids) {
          await client.query(
            'INSERT INTO event_participants (event_id, person_id) VALUES ($1, $2)',
            [id, personId]
          );
        }
      }

      await client.query('COMMIT');

      // Return updated event
      const result = await client.query(
        'SELECT * FROM events WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      return result.rows[0];

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Delete event
   */
  static async delete(id, userId) {
    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return result.rowCount > 0;
  }

  /**
   * Get recent events
   */
  static async getRecent(userId, limit = 10) {
    const result = await pool.query(
      `SELECT * FROM events
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }
}

module.exports = Event;
