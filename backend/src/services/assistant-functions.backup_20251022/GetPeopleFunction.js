const pool = require('../../db/connection');

/**
 * GetPeopleFunction - Retrieve comprehensive information about people in the user's network
 * Includes: basic info, relationships, assets, professional history, biography, events, network position
 */
class GetPeopleFunction {
  static get name() {
    return 'get_people';
  }

  static get description() {
    return 'Retrieve detailed information about people in the user\'s network. Returns comprehensive data including relationships, assets owned, professional history, biography notes, recent events, and network connections. Use this to answer questions about specific people or to get an overview of contacts.';
  }

  static get parameters() {
    return {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Search term to filter people by name (optional) - supports partial matching'
        },
        person_id: {
          type: 'string',
          description: 'Person identifier - accepts either UUID or person name (partial names supported)'
        },
        include_relationships: {
          type: 'boolean',
          description: 'Include relationship details (default: true)',
          default: true
        },
        include_assets: {
          type: 'boolean',
          description: 'Include assets owned by the person (default: true)',
          default: true
        },
        include_professional: {
          type: 'boolean',
          description: 'Include professional history (default: true)',
          default: true
        },
        include_biography: {
          type: 'boolean',
          description: 'Include biography notes (default: true)',
          default: true
        },
        include_events: {
          type: 'boolean',
          description: 'Include recent events with this person (default: true)',
          default: true
        },
        limit: {
          type: 'number',
          description: 'Maximum number of people to return (default: 50)',
          default: 50
        }
      }
    };
  }

  /**
   * Check if a string is a valid UUID format
   */
  static isUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  static async execute(userId, params = {}) {
    const {
      search,
      person_id,
      include_relationships = true,
      include_assets = true,
      include_professional = true,
      include_biography = true,
      include_events = true,
      limit = 50
    } = params;

    try {
      let people;

      if (person_id) {
        // Check if person_id is a valid UUID
        if (this.isUUID(person_id)) {
          // Get specific person by UUID with ALL details
          people = await this.getPersonWithDetails(userId, person_id, {
            include_relationships,
            include_assets,
            include_professional,
            include_biography,
            include_events
          });
        } else {
          // person_id is actually a name - treat as search query
          people = await this.getPeople(userId, person_id, limit, {
            include_relationships,
            include_assets,
            include_professional,
            include_biography,
            include_events
          });
        }
      } else {
        // Get multiple people
        people = await this.getPeople(userId, search, limit, {
          include_relationships,
          include_assets,
          include_professional,
          include_biography,
          include_events
        });
      }

      return {
        success: true,
        count: people.length,
        people: people
      };
    } catch (error) {
      console.error('GetPeopleFunction error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a single person with comprehensive details
   */
  static async getPersonWithDetails(userId, personId, options) {
    // Get basic person info
    const personResult = await pool.query(
      `SELECT id, name, email, phone, birthday, address, notes, photo_url, last_contact_date,
              summary, summary_generated_at, created_at
       FROM people
       WHERE id = $1 AND user_id = $2`,
      [personId, userId]
    );

    if (personResult.rows.length === 0) {
      return [];
    }

    const person = personResult.rows[0];
    const enrichedPerson = await this.enrichPersonData(userId, person, options);

    return [enrichedPerson];
  }

  /**
   * Get multiple people
   */
  static async getPeople(userId, search, limit, options) {
    let query = `
      SELECT id, name, email, phone, birthday, address, notes, photo_url, last_contact_date,
             summary, summary_generated_at, created_at
      FROM people
      WHERE user_id = $1
    `;
    const params = [userId];

    if (search) {
      query += ` AND (name ILIKE $2 OR email ILIKE $2 OR notes ILIKE $2)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY last_contact_date DESC NULLS LAST, name ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    // Enrich each person with related data
    const enrichedPeople = await Promise.all(
      result.rows.map(person => this.enrichPersonData(userId, person, options))
    );

    return enrichedPeople;
  }

  /**
   * Enrich person data with all related information
   */
  static async enrichPersonData(userId, person, options) {
    const enriched = { ...person };

    // Get relationships
    if (options.include_relationships) {
      enriched.relationships = await this.getPersonRelationships(userId, person.id);
      enriched.network_stats = {
        total_connections: enriched.relationships.length,
        by_type: this.groupByType(enriched.relationships),
        avg_strength: this.calculateAvgStrength(enriched.relationships)
      };
    }

    // Get assets owned
    if (options.include_assets) {
      enriched.assets = await this.getPersonAssets(userId, person.id);
      enriched.total_asset_value = enriched.assets.reduce(
        (sum, asset) => sum + (asset.estimated_value || 0),
        0
      );
    }

    // Get professional history
    if (options.include_professional) {
      enriched.professional_history = await this.getPersonProfessionalHistory(userId, person.id);
      enriched.current_position = enriched.professional_history.find(h => !h.end_date);
    }

    // Get biography notes
    if (options.include_biography) {
      enriched.biography_notes = await this.getPersonBiography(userId, person.id);
    }

    // Get recent events
    if (options.include_events) {
      enriched.recent_events = await this.getPersonEvents(userId, person.id, 10);
      enriched.last_interaction = enriched.recent_events[0] || null;
    }

    return enriched;
  }

  /**
   * Get all relationships for a person
   */
  static async getPersonRelationships(userId, personId) {
    const result = await pool.query(
      `SELECT
        r.id,
        r.relationship_type as type,
        r.strength,
        r.context as notes,
        CASE
          WHEN r.person_a_id = $2 THEN p.name
          ELSE p2.name
        END as related_person_name,
        CASE
          WHEN r.person_a_id = $2 THEN r.person_b_id
          ELSE r.person_a_id
        END as related_person_id,
        r.created_at
       FROM relationships r
       LEFT JOIN people p ON p.id = r.person_b_id
       LEFT JOIN people p2 ON p2.id = r.person_a_id
       WHERE (r.person_a_id = $2 OR r.person_b_id = $2)
       AND r.user_id = $1
       ORDER BY r.strength DESC, r.created_at DESC`,
      [userId, personId]
    );

    return result.rows;
  }

  /**
   * Get assets owned by a person
   */
  static async getPersonAssets(userId, personId) {
    const result = await pool.query(
      `SELECT id, name, asset_type, description, availability, estimated_value, created_at
       FROM assets
       WHERE owner_id = $1 AND user_id = $2
       ORDER BY estimated_value DESC NULLS LAST, created_at DESC`,
      [personId, userId]
    );

    return result.rows;
  }

  /**
   * Get professional history for a person
   */
  static async getPersonProfessionalHistory(userId, personId) {
    const result = await pool.query(
      `SELECT id, company, position, start_date, end_date, notes, created_at
       FROM professional_history
       WHERE person_id = $1 AND user_id = $2
       ORDER BY
         CASE WHEN end_date IS NULL THEN 0 ELSE 1 END,
         COALESCE(end_date, NOW()) DESC,
         start_date DESC`,
      [personId, userId]
    );

    return result.rows;
  }

  /**
   * Get biography notes for a person
   */
  static async getPersonBiography(userId, personId) {
    const result = await pool.query(
      `SELECT id, title, note, note_date, created_at
       FROM biographies
       WHERE person_id = $1 AND user_id = $2
       ORDER BY note_date DESC NULLS LAST, created_at DESC`,
      [personId, userId]
    );

    return result.rows;
  }

  /**
   * Get recent events involving a person
   */
  static async getPersonEvents(userId, personId, limit = 10) {
    const result = await pool.query(
      `SELECT DISTINCT e.id, e.event_type, e.description, e.event_date, e.location, e.notes,
              e.created_at,
              (SELECT array_agg(p.name)
               FROM event_participants ep
               JOIN people p ON p.id = ep.person_id
               WHERE ep.event_id = e.id) as participants
       FROM events e
       JOIN event_participants ep ON ep.event_id = e.id
       WHERE ep.person_id = $1 AND e.user_id = $2
       ORDER BY e.event_date DESC, e.created_at DESC
       LIMIT $3`,
      [personId, userId, limit]
    );

    return result.rows;
  }

  /**
   * Helper: Group relationships by type
   */
  static groupByType(relationships) {
    return relationships.reduce((acc, rel) => {
      acc[rel.type] = (acc[rel.type] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Helper: Calculate average relationship strength
   */
  static calculateAvgStrength(relationships) {
    if (relationships.length === 0) return 0;
    const sum = relationships.reduce((acc, rel) => acc + rel.strength, 0);
    return (sum / relationships.length).toFixed(2);
  }
}

module.exports = GetPeopleFunction;
