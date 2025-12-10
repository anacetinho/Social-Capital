const pool = require('../db/connection');
const PathfindingService = require('./PathfindingService');
const { expandSearchQuery } = require('./AssetSearchSynonyms');

/**
 * Database Query Service for Chat Assistant
 * Provides read-only access to CRM data via Summary A
 * Simplifies LLM integration by using Summary A as single source of truth
 */

class DatabaseQueryService {
  /**
   * Search people by querying their Summary A text
   * Uses full-text search across Summary A for natural language queries
   *
   * @param {string} userId - User ID for RLS
   * @param {string} query - Search query (e.g., "doctor", "has a car", "speaks spanish")
   * @param {number} maxDegrees - Maximum degrees of separation (1=N1 only, 2=N1+N2, etc.)
   * @returns {Array} Matching people with their Summary A and connection info
   */
  static async searchPeopleBySummary(userId, query, maxDegrees = 2) {
    // Get people with Summary A that matches the query
    // Filter by connection degree if specified
    const result = await pool.query(
      `WITH user_network AS (
        -- Get all people within maxDegrees of user's key person
        -- For simplicity, we'll get all people and filter in application layer
        SELECT DISTINCT p.id, p.name, p.photo_url, p.summary_a, p.email
        FROM people p
        WHERE p.user_id = $1
          AND p.summary_a IS NOT NULL
          AND p.summary_a ILIKE $2
        ORDER BY p.name
        LIMIT 20
      )
      SELECT * FROM user_network`,
      [userId, `%${query}%`]
    );

    return result.rows;
  }

  /**
   * Get person details including Summary A
   *
   * @param {string} userId - User ID for RLS
   * @param {string} personId - Person ID to retrieve
   * @returns {Object} Person details with Summary A
   */
  static async getPersonWithSummary(userId, personId) {
    const result = await pool.query(
      `SELECT id, name, email, phone, photo_url, birthday,
              address, gender, summary_a, summary_b
       FROM people
       WHERE id = $1 AND user_id = $2`,
      [personId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Get Summary A for all N1 and N2 connections of a person
   * Used for context-aware queries like "who in my network..."
   *
   * @param {string} userId - User ID for RLS
   * @param {string} personId - Center person ID
   * @param {number} degrees - Number of degrees to fetch (1 or 2)
   * @returns {Object} Network summaries organized by degree
   */
  static async getNetworkSummaries(userId, personId, degrees = 2) {
    if (degrees === 1) {
      // Get N1 connections only (direct connections)
      const result = await pool.query(
        `SELECT DISTINCT p.id, p.name, p.summary_a, p.photo_url,
                r.relationship_type, r.strength
         FROM people p
         JOIN relationships r ON (
           (r.person_a_id = p.id AND r.person_b_id = $2) OR
           (r.person_b_id = p.id AND r.person_a_id = $2)
         )
         WHERE p.user_id = $1 AND p.id != $2
           AND p.summary_a IS NOT NULL
         ORDER BY r.strength DESC, p.name
         LIMIT 50`,
        [userId, personId]
      );

      return {
        n1: result.rows,
        n2: []
      };
    }

    // Get N1 and N2 connections
    // N1: Direct connections
    const n1Result = await pool.query(
      `SELECT DISTINCT p.id, p.name, p.summary_a, p.photo_url,
              r.relationship_type, r.strength
       FROM people p
       JOIN relationships r ON (
         (r.person_a_id = p.id AND r.person_b_id = $2) OR
         (r.person_b_id = p.id AND r.person_a_id = $2)
       )
       WHERE p.user_id = $1 AND p.id != $2
         AND p.summary_a IS NOT NULL
       ORDER BY r.strength DESC, p.name`,
      [userId, personId]
    );

    // N2: Connections of connections (excluding N1 and self)
    const n1Ids = n1Result.rows.map(row => row.id);
    const n2Result = await pool.query(
      `SELECT DISTINCT p.id, p.name, p.summary_a, p.photo_url
       FROM people p
       JOIN relationships r ON (
         (r.person_a_id = p.id OR r.person_b_id = p.id)
       )
       WHERE p.user_id = $1
         AND p.summary_a IS NOT NULL
         AND p.id != $2
         AND p.id NOT IN (${n1Ids.length > 0 ? n1Ids.map((_, i) => `$${i + 3}`).join(',') : 'NULL'})
         AND (r.person_a_id IN (${n1Ids.length > 0 ? n1Ids.map((_, i) => `$${i + 3}`).join(',') : 'NULL'})
              OR r.person_b_id IN (${n1Ids.length > 0 ? n1Ids.map((_, i) => `$${i + 3}`).join(',') : 'NULL'}))
       LIMIT 100`,
      [userId, personId, ...n1Ids]
    );

    return {
      n1: n1Result.rows,
      n2: n2Result.rows
    };
  }

  /**
   * Find connection path between two people
   * Wrapper around PathfindingService with additional Summary A context
   *
   * @param {string} userId - User ID for RLS
   * @param {string} fromPersonId - Starting person ID (must be UUID)
   * @param {string} toPersonId - Target person ID (must be UUID)
   * @returns {Object} Connection path with person details
   */
  static async findConnectionPath(userId, fromPersonId, toPersonId) {
    // Validate that person IDs are UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fromPersonId) || !uuidRegex.test(toPersonId)) {
      console.warn('findConnectionPath called with non-UUID identifiers:', {
        fromPersonId,
        toPersonId
      });
      return {
        found: false,
        error: 'Invalid person ID format. Expected UUID.',
        suggestedIntermediaries: []
      };
    }

    const pathResult = await PathfindingService.findPath(userId, fromPersonId, toPersonId);

    if (!pathResult) {
      // No path found - suggest intermediaries
      const intermediaries = await PathfindingService.suggestIntermediaries(
        userId,
        fromPersonId,
        toPersonId
      );

      return {
        found: false,
        suggestedIntermediaries: intermediaries
      };
    }

    // Enhance path with Summary A for context
    const enhancedPath = await this.enhancePathWithSummaries(userId, pathResult.path);

    return {
      found: true,
      from: pathResult.from,
      to: pathResult.to,
      degrees: pathResult.degrees,
      strength: pathResult.strength,
      path: enhancedPath,
      intermediaries: pathResult.intermediaries
    };
  }

  /**
   * Enhance path with Summary A snippets for each person
   * @private
   */
  static async enhancePathWithSummaries(userId, pathIds) {
    const enhancedPath = [];

    for (const personId of pathIds) {
      const person = await this.getPersonWithSummary(userId, personId);
      if (person) {
        enhancedPath.push({
          id: person.id,
          name: person.name,
          photo_url: person.photo_url,
          // Include first 200 chars of Summary A for context
          summary_snippet: person.summary_a
            ? person.summary_a.substring(0, 200) + '...'
            : 'No summary available'
        });
      }
    }

    return enhancedPath;
  }

  /**
   * Get comprehensive network data for a person (for LLM context)
   * Returns all available information organized for LLM consumption
   *
   * @param {string} userId - User ID for RLS
   * @param {string} personId - Person ID to get network for
   * @returns {Object} Comprehensive network context
   */
  static async getPersonNetworkContext(userId, personId) {
    const person = await this.getPersonWithSummary(userId, personId);

    if (!person) {
      throw new Error('Person not found');
    }

    const network = await this.getNetworkSummaries(userId, personId, 2);

    return {
      person: {
        id: person.id,
        name: person.name,
        email: person.email,
        summary_a: person.summary_a,
        summary_b: person.summary_b
      },
      network: {
        n1_connections: network.n1.map(p => ({
          id: p.id,
          name: p.name,
          relationship_type: p.relationship_type,
          strength: p.strength,
          summary: p.summary_a
        })),
        n2_connections: network.n2.map(p => ({
          id: p.id,
          name: p.name,
          summary: p.summary_a
        }))
      }
    };
  }

  /**
   * Search for people with specific capabilities (based on Summary A keywords)
   * Examples: "car", "doctor", "speaks spanish", "works at Google"
   *
   * @param {string} userId - User ID for RLS
   * @param {string} capability - Capability to search for
   * @param {string} fromPersonId - Optional: Find people with capability and show path from this person (must be UUID)
   * @returns {Array} People with the capability, optionally with connection paths
   */
  static async searchByCapability(userId, capability, fromPersonId = null) {
    // Search Summary A for capability
    const matches = await this.searchPeopleBySummary(userId, capability, 2);

    if (!fromPersonId) {
      return matches;
    }

    // Validate fromPersonId is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fromPersonId)) {
      console.warn('searchByCapability called with non-UUID fromPersonId:', fromPersonId);
      // Return matches without paths if invalid fromPersonId
      return matches;
    }

    // If fromPersonId specified, add connection paths
    const matchesWithPaths = await Promise.all(
      matches.map(async (person) => {
        const pathResult = await this.findConnectionPath(userId, fromPersonId, person.id);

        return {
          ...person,
          connection: pathResult.found ? {
            degrees: pathResult.degrees,
            strength: pathResult.strength,
            path: pathResult.path
          } : null
        };
      })
    );

    // Sort by connection strength (closer connections first)
    return matchesWithPaths.sort((a, b) => {
      if (!a.connection && !b.connection) return 0;
      if (!a.connection) return 1;
      if (!b.connection) return -1;

      // Sort by degrees (ascending), then strength (descending)
      if (a.connection.degrees !== b.connection.degrees) {
        return a.connection.degrees - b.connection.degrees;
      }
      return b.connection.strength - a.connection.strength;
    });
  }

  /**
   * Search for assets owned by people in the network
   * Uses synonym expansion for flexible matching
   * Searches: description, name, asset_type, address, notes
   *
   * @param {string} userId - User ID for RLS
   * @param {string} query - Search query (e.g., "pool", "car", "vacation home")
   * @param {string} fromPersonId - Optional: Show connection paths from this person to asset owners
   * @returns {Array} Assets with owner info and optionally connection paths
   */
  static async searchAssets(userId, query, fromPersonId = null) {
    // Expand query to include synonyms
    const searchTerms = expandSearchQuery(query);

    // Build WHERE clause with OR conditions for each synonym
    // Each term searches across all text fields
    const searchConditions = searchTerms.map((term, index) => {
      const paramIndex = index + 2; // $1 is userId, $2+ are search terms
      return `(
        a.description ILIKE $${paramIndex} OR
        a.name ILIKE $${paramIndex} OR
        a.asset_type ILIKE $${paramIndex} OR
        a.address ILIKE $${paramIndex} OR
        a.notes ILIKE $${paramIndex}
      )`;
    }).join(' OR ');

    // Prepare parameters: userId + each search term wrapped in %
    const params = [userId, ...searchTerms.map(term => `%${term}%`)];

    const result = await pool.query(
      `SELECT a.id as asset_id,
              a.name as asset_name,
              a.description,
              a.asset_type,
              a.availability,
              a.estimated_value,
              a.address,
              a.notes,
              p.id as owner_id,
              p.name as owner_name,
              p.photo_url as owner_photo
       FROM assets a
       JOIN people p ON a.owner_id = p.id
       WHERE a.user_id = $1
         AND (${searchConditions})
       ORDER BY p.name, a.name
       LIMIT 20`,
      params
    );

    const assets = result.rows;

    if (!fromPersonId || assets.length === 0) {
      return assets;
    }

    // Validate fromPersonId is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fromPersonId)) {
      console.warn('searchAssets called with non-UUID fromPersonId:', fromPersonId);
      return assets;
    }

    // Add connection paths from fromPersonId to each asset owner
    const assetsWithPaths = await Promise.all(
      assets.map(async (asset) => {
        const pathResult = await this.findConnectionPath(userId, fromPersonId, asset.owner_id);

        return {
          ...asset,
          connection: pathResult.found ? {
            degrees: pathResult.degrees,
            strength: pathResult.strength,
            path: pathResult.path
          } : null
        };
      })
    );

    // Sort by connection strength (closer connections first)
    return assetsWithPaths.sort((a, b) => {
      if (!a.connection && !b.connection) return 0;
      if (!a.connection) return 1;
      if (!b.connection) return -1;

      // Sort by degrees (ascending), then strength (descending)
      if (a.connection.degrees !== b.connection.degrees) {
        return a.connection.degrees - b.connection.degrees;
      }
      return b.connection.strength - a.connection.strength;
    });
  }

  /**
   * Search for people by demographic criteria
   * Filters by age, gender, location, and relationship status
   * Optionally includes connection paths from a specific person
   *
   * @param {string} userId - User ID for RLS
   * @param {object} filters - Filter criteria
   * @param {string} filters.relationshipStatus - "single", "in_relationship", or "any"
   * @param {number} filters.minAge - Minimum age (optional)
   * @param {number} filters.maxAge - Maximum age (optional)
   * @param {string} filters.gender - "male", "female", or "any"
   * @param {string} filters.location - Location to match (optional, partial match)
   * @param {string} fromPersonId - Optional person UUID to calculate connection paths from
   * @returns {Array} People matching criteria, with connection paths if fromPersonId provided
   */
  static async searchPeopleByDemographics(userId, filters, fromPersonId = null) {
    const { relationshipStatus, minAge, maxAge, gender, location } = filters;

    // Build WHERE conditions
    const conditions = ['p.user_id = $1'];
    const params = [userId];
    let paramIndex = 2;

    // Age filter (calculate from birthday)
    if (minAge !== undefined && minAge !== null) {
      conditions.push(`EXTRACT(YEAR FROM AGE(p.birthday)) >= $${paramIndex}`);
      params.push(minAge);
      paramIndex++;
    }

    if (maxAge !== undefined && maxAge !== null) {
      conditions.push(`EXTRACT(YEAR FROM AGE(p.birthday)) <= $${paramIndex}`);
      params.push(maxAge);
      paramIndex++;
    }

    // Gender filter
    if (gender && gender !== 'any') {
      conditions.push(`LOWER(p.gender) = $${paramIndex}`);
      params.push(gender.toLowerCase());
      paramIndex++;
    }

    // Location filter (partial match)
    if (location) {
      conditions.push(`p.address ILIKE $${paramIndex}`);
      params.push(`%${location}%`);
      paramIndex++;
    }

    // Query people matching demographic criteria
    const peopleResult = await pool.query(
      `SELECT p.id,
              p.name,
              p.email,
              p.phone,
              p.birthday,
              p.address,
              p.gender,
              p.photo_url,
              EXTRACT(YEAR FROM AGE(p.birthday)) as age
       FROM people p
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.name
       LIMIT 50`,
      params
    );

    let people = peopleResult.rows;

    // Filter by relationship status if specified
    if (relationshipStatus && relationshipStatus !== 'any') {
      // Check each person's relationships and biography for romantic indicators
      const peopleWithStatus = await Promise.all(
        people.map(async (person) => {
          const hasRomantic = await this.hasRomanticRelationship(userId, person.id);

          return {
            ...person,
            hasRomanticRelationship: hasRomantic
          };
        })
      );

      // Filter based on relationship status
      if (relationshipStatus === 'single') {
        people = peopleWithStatus.filter(p => !p.hasRomanticRelationship);
      } else if (relationshipStatus === 'in_relationship') {
        people = peopleWithStatus.filter(p => p.hasRomanticRelationship);
      }
    }

    // Return people without connection paths if fromPersonId not provided
    if (!fromPersonId || people.length === 0) {
      return people;
    }

    // Validate fromPersonId is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fromPersonId)) {
      console.warn('searchPeopleByDemographics called with non-UUID fromPersonId:', fromPersonId);
      return people;
    }

    // Add connection paths from fromPersonId to each person
    const peopleWithPaths = await Promise.all(
      people.map(async (person) => {
        // Skip if person is the fromPerson themselves
        if (person.id === fromPersonId) {
          return null;
        }

        const pathResult = await this.findConnectionPath(userId, fromPersonId, person.id);

        return {
          ...person,
          connection: pathResult.found ? {
            degrees: pathResult.degrees,
            strength: pathResult.strength,
            path: pathResult.path
          } : null
        };
      })
    );

    // Filter out nulls (fromPerson themselves) and sort by connection strength
    const filtered = peopleWithPaths.filter(p => p !== null);

    return filtered.sort((a, b) => {
      if (!a.connection && !b.connection) return 0;
      if (!a.connection) return 1;
      if (!b.connection) return -1;

      // Sort by degrees (ascending), then strength (descending)
      if (a.connection.degrees !== b.connection.degrees) {
        return a.connection.degrees - b.connection.degrees;
      }
      return b.connection.strength - a.connection.strength;
    });
  }

  /**
   * Check if a person has any romantic relationship
   * Helper method for demographic search
   *
   * @param {string} userId - User ID for RLS
   * @param {string} personId - Person ID to check
   * @returns {boolean} True if person has romantic relationship
   */
  static async hasRomanticRelationship(userId, personId) {
    const romanticKeywords = [
      'marriage', 'married', 'spouse', 'husband', 'wife',
      'boyfriend', 'girlfriend', 'partner', 'engaged', 'fiancé', 'fiancée',
      'relationship', 'romantic', 'dating', 'couple', 'married to',
      'ex-husband', 'ex-wife', 'divorced', 'widowed', 'widow', 'widower',
      'divorcee', 'separation', 'separated', 'ex-boyfriend', 'ex-girlfriend',
      'ex-partner', 'civil union', 'domestic partner', 'life partner'
    ];

    // Check relationships table
    const relResult = await pool.query(
      `SELECT r.relationship_type, r.context
       FROM relationships r
       WHERE (r.person_a_id = $1 OR r.person_b_id = $1)
         AND r.user_id = $2`,
      [personId, userId]
    );

    for (const rel of relResult.rows) {
      const type = rel.relationship_type?.toLowerCase() || '';
      const context = rel.context?.toLowerCase() || '';

      if (romanticKeywords.some(keyword => type.includes(keyword) || context.includes(keyword))) {
        return true;
      }
    }

    // Check biography table
    const bioResult = await pool.query(
      `SELECT title, note
       FROM biographies
       WHERE person_id = $1 AND user_id = $2`,
      [personId, userId]
    );

    for (const bio of bioResult.rows) {
      const title = bio.title?.toLowerCase() || '';
      const note = bio.note?.toLowerCase() || '';

      if (romanticKeywords.some(keyword => title.includes(keyword) || note.includes(keyword))) {
        return true;
      }
    }

    return false;
  }
}

module.exports = DatabaseQueryService;
