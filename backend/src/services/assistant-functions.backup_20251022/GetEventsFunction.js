const pool = require('../../db/connection');

/**
 * GetEventsFunction - Retrieve event history with participants and relationship context
 */
class GetEventsFunction {
  static get name() {
    return 'get_events';
  }

  static get description() {
    return 'Retrieve event history including meetings, calls, emails, and social interactions. Returns events with participant details, locations, dates, and relationship context. Use this to answer questions about interactions, meeting history, or activity patterns.';
  }

  static get parameters() {
    return {
      type: 'object',
      properties: {
        person_id: {
          type: 'string',
          description: 'Filter events involving a specific person'
        },
        event_type: {
          type: 'string',
          enum: ['meeting', 'call', 'email', 'social', 'other'],
          description: 'Filter by event type'
        },
        start_date: {
          type: 'string',
          description: 'Filter events after this date (YYYY-MM-DD format)'
        },
        end_date: {
          type: 'string',
          description: 'Filter events before this date (YYYY-MM-DD format)'
        },
        include_participants: {
          type: 'boolean',
          description: 'Include participant details (default: true)',
          default: true
        },
        limit: {
          type: 'number',
          description: 'Maximum number of events to return (default: 50)',
          default: 50
        }
      }
    };
  }

  static async execute(userId, params = {}) {
    const {
      person_id,
      event_type,
      start_date,
      end_date,
      include_participants = true,
      limit = 50
    } = params;

    try {
      const events = await this.getEvents(userId, {
        person_id,
        event_type,
        start_date,
        end_date,
        include_participants,
        limit
      });

      // Get statistics
      const stats = await this.getEventStats(userId, {
        person_id,
        event_type,
        start_date,
        end_date
      });

      return {
        success: true,
        count: events.length,
        stats,
        events
      };
    } catch (error) {
      console.error('GetEventsFunction error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get events with optional filters
   */
  static async getEvents(userId, options) {
    const {
      person_id,
      event_type,
      start_date,
      end_date,
      include_participants,
      limit
    } = options;

    let query = `
      SELECT DISTINCT e.id, e.event_type, e.description, e.date, e.location, e.notes,
             e.created_at
      FROM events e
    `;

    const params = [userId];
    const conditions = ['e.user_id = $1'];

    // Join with participants if filtering by person
    if (person_id) {
      query += ` JOIN event_participants ep ON ep.event_id = e.id`;
      conditions.push(`ep.person_id = $${params.length + 1}`);
      params.push(person_id);
    }

    // Add event type filter
    if (event_type) {
      conditions.push(`e.event_type = $${params.length + 1}`);
      params.push(event_type);
    }

    // Add date range filters
    if (start_date) {
      conditions.push(`e.date >= $${params.length + 1}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`e.date <= $${params.length + 1}`);
      params.push(end_date);
    }

    query += ` WHERE ${conditions.join(' AND ')}`;
    query += ` ORDER BY e.date DESC, e.created_at DESC`;
    query += ` LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    const events = result.rows;

    // Enrich with participants if requested
    if (include_participants) {
      for (const event of events) {
        event.participants = await this.getEventParticipants(event.id);
      }
    }

    return events;
  }

  /**
   * Get participants for an event
   */
  static async getEventParticipants(eventId) {
    const result = await pool.query(
      `SELECT p.id, p.name, p.email
       FROM event_participants ep
       JOIN people p ON p.id = ep.person_id
       WHERE ep.event_id = $1
       ORDER BY p.name`,
      [eventId]
    );

    return result.rows;
  }

  /**
   * Get event statistics
   */
  static async getEventStats(userId, filters) {
    const { person_id, event_type, start_date, end_date } = filters;

    let query = `
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT e.event_type) as event_types_count,
        MIN(e.date) as earliest_event,
        MAX(e.date) as latest_event
      FROM events e
    `;

    const params = [userId];
    const conditions = ['e.user_id = $1'];

    if (person_id) {
      query += ` JOIN event_participants ep ON ep.event_id = e.id`;
      conditions.push(`ep.person_id = $${params.length + 1}`);
      params.push(person_id);
    }

    if (event_type) {
      conditions.push(`e.event_type = $${params.length + 1}`);
      params.push(event_type);
    }

    if (start_date) {
      conditions.push(`e.date >= $${params.length + 1}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`e.date <= $${params.length + 1}`);
      params.push(end_date);
    }

    query += ` WHERE ${conditions.join(' AND ')}`;

    const result = await pool.query(query, params);
    const stats = result.rows[0];

    // Get event type breakdown
    let typeQuery = `
      SELECT event_type, COUNT(*) as count
      FROM events e
    `;

    const typeParams = [userId];
    const typeConditions = ['e.user_id = $1'];

    if (person_id) {
      typeQuery += ` JOIN event_participants ep ON ep.event_id = e.id`;
      typeConditions.push(`ep.person_id = $${typeParams.length + 1}`);
      typeParams.push(person_id);
    }

    if (start_date) {
      typeConditions.push(`e.date >= $${typeParams.length + 1}`);
      typeParams.push(start_date);
    }

    if (end_date) {
      typeConditions.push(`e.date <= $${typeParams.length + 1}`);
      typeParams.push(end_date);
    }

    typeQuery += ` WHERE ${typeConditions.join(' AND ')}`;
    typeQuery += ` GROUP BY event_type ORDER BY count DESC`;

    const typeResult = await pool.query(typeQuery, typeParams);
    stats.by_type = typeResult.rows;

    // Get most frequent participants
    if (!person_id) {
      const participantQuery = `
        SELECT p.id, p.name, COUNT(*) as event_count
        FROM event_participants ep
        JOIN events e ON e.id = ep.event_id
        JOIN people p ON p.id = ep.person_id
        WHERE e.user_id = $1
        ${start_date ? `AND e.date >= $2` : ''}
        ${end_date ? `AND e.date <= $${start_date ? 3 : 2}` : ''}
        GROUP BY p.id, p.name
        ORDER BY event_count DESC
        LIMIT 10
      `;

      const partParams = [userId];
      if (start_date) partParams.push(start_date);
      if (end_date) partParams.push(end_date);

      const partResult = await pool.query(participantQuery, partParams);
      stats.most_frequent_participants = partResult.rows;
    }

    return stats;
  }
}

module.exports = GetEventsFunction;
