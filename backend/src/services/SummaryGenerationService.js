const pool = require('../db/connection');
const LLMProviderService = require('./LLMProviderService');

/**
 * SummaryGenerationService - Generates comprehensive AI summaries for people
 * Aggregates all person data and creates detailed narratives for LLM analysis
 */
class SummaryGenerationService {
  /**
   * Generate summary for a single person
   */
  static async generatePersonSummary(userId, personId) {
    try {
      // Gather all person data
      const personData = await this.gatherPersonData(userId, personId);

      if (!personData) {
        throw new Error('Person not found');
      }

      // Generate summary using LLM
      const summary = await this.generateSummaryWithLLM(userId, personData);

      // Save summary to database
      await pool.query(
        `UPDATE people
         SET summary = $1, summary_generated_at = NOW()
         WHERE id = $2 AND user_id = $3`,
        [summary, personId, userId]
      );

      return {
        success: true,
        person_id: personId,
        person_name: personData.basic.name,
        summary,
        generated_at: new Date()
      };
    } catch (error) {
      console.error(`Error generating summary for person ${personId}:`, error);
      return {
        success: false,
        person_id: personId,
        error: error.message
      };
    }
  }

  /**
   * Gather all data for a person from all tables
   */
  static async gatherPersonData(userId, personId) {
    // Get basic person info
    const personResult = await pool.query(
      `SELECT id, name, email, phone, birthday, address, linkedin_url, notes, importance
       FROM people
       WHERE id = $1 AND user_id = $2`,
      [personId, userId]
    );

    if (personResult.rows.length === 0) {
      return null;
    }

    const person = personResult.rows[0];

    // Get professional history
    const professionalResult = await pool.query(
      `SELECT company, position, start_date, end_date, notes
       FROM professional_history
       WHERE person_id = $1
       ORDER BY
         CASE WHEN end_date IS NULL THEN 0 ELSE 1 END,
         COALESCE(end_date, NOW()) DESC,
         start_date DESC`,
      [personId]
    );

    // Get biography notes
    const biographyResult = await pool.query(
      `SELECT title, note, note_date
       FROM biographies
       WHERE person_id = $1 AND user_id = $2
       ORDER BY note_date DESC NULLS LAST, created_at DESC`,
      [personId, userId]
    );

    // Get relationships
    const relationshipsResult = await pool.query(
      `SELECT
         r.relationship_type AS type,
         r.strength,
         r.context AS relationship_notes,
         CASE
           WHEN r.person_a_id = $1 THEN p2.name
           ELSE p1.name
         END as other_person_name,
         CASE
           WHEN r.person_a_id = $1 THEN p2.id
           ELSE p1.id
         END as other_person_id
       FROM relationships r
       JOIN people p1 ON p1.id = r.person_a_id
       JOIN people p2 ON p2.id = r.person_b_id
       WHERE (r.person_a_id = $1 OR r.person_b_id = $1)
       AND p1.user_id = $2 AND p2.user_id = $2
       ORDER BY r.strength DESC, r.relationship_type`,
      [personId, userId]
    );

    // Get assets owned
    const assetsResult = await pool.query(
      `SELECT asset_type, name, description, availability, estimated_value
       FROM assets
       WHERE owner_id = $1 AND user_id = $2
       ORDER BY estimated_value DESC NULLS LAST`,
      [personId, userId]
    );

    // Get favors (both given and received)
    const favorsResult = await pool.query(
      `SELECT
         f.description,
         f.date,
         f.status,
         f.estimated_value,
         f.time_commitment,
         f.notes,
         CASE
           WHEN f.giver_id = $1 THEN 'given'
           ELSE 'received'
         END as direction,
         CASE
           WHEN f.giver_id = $1 THEN receiver.name
           ELSE giver.name
         END as other_person_name
       FROM favors f
       JOIN people giver ON giver.id = f.giver_id
       JOIN people receiver ON receiver.id = f.receiver_id
       WHERE (f.giver_id = $1 OR f.receiver_id = $1)
       AND f.user_id = $2
       ORDER BY f.date DESC`,
      [personId, userId]
    );

    // Get events with co-attendees
    const eventsResult = await pool.query(
      `SELECT DISTINCT
         e.title,
         e.event_type,
         e.date,
         e.location,
         e.description,
         e.notes,
         array_agg(DISTINCT p.name) FILTER (WHERE p.id != $1) as co_attendees
       FROM events e
       JOIN event_participants ep1 ON ep1.event_id = e.id AND ep1.person_id = $1
       LEFT JOIN event_participants ep2 ON ep2.event_id = e.id AND ep2.person_id != $1
       LEFT JOIN people p ON p.id = ep2.person_id
       WHERE e.user_id = $2
       GROUP BY e.id, e.title, e.event_type, e.date, e.location, e.description, e.notes
       ORDER BY e.date DESC`,
      [personId, userId]
    );

    // Calculate favor statistics
    const favorStats = this.calculateFavorStats(favorsResult.rows);

    // Identify most common associates from events
    const commonAssociates = this.identifyCommonAssociates(eventsResult.rows);

    // Gather first-degree connection data (N1)
    const firstDegreeConnections = await this.gatherFirstDegreeConnectionData(
      userId,
      personId,
      relationshipsResult.rows
    );

    // Calculate network metrics
    const networkMetrics = this.calculateNetworkMetrics(
      {
        basic: person,
        professional: professionalResult.rows
      },
      firstDegreeConnections
    );

    // Run new cross-referential analyses
    const personDataForAnalysis = {
      basic: person,
      professional: professionalResult.rows,
      biography: biographyResult.rows,
      relationships: relationshipsResult.rows,
      assets: assetsResult.rows
    };

    const familyDynamics = this.analyzeFamilyDynamics(personDataForAnalysis, firstDegreeConnections);
    const timelineCorrelations = this.analyzeTimelineCorrelations(personDataForAnalysis, firstDegreeConnections);
    const assetDisparities = this.analyzeAssetDisparities(personDataForAnalysis, firstDegreeConnections);
    const professionalSynergies = this.analyzeProfessionalSynergies(personDataForAnalysis, firstDegreeConnections);
    const crossReferentialInsights = this.synthesizeCrossReferentialInsights(
      personDataForAnalysis,
      firstDegreeConnections,
      { familyDynamics, timelineCorrelations, assetDisparities, professionalSynergies }
    );

    return {
      basic: person,
      professional: professionalResult.rows,
      biography: biographyResult.rows,
      relationships: relationshipsResult.rows,
      assets: assetsResult.rows,
      favors: favorsResult.rows,
      events: eventsResult.rows,
      favorStats,
      commonAssociates,
      firstDegreeConnections,
      networkMetrics,
      familyDynamics,
      timelineCorrelations,
      assetDisparities,
      professionalSynergies,
      crossReferentialInsights
    };
  }

  /**
   * Calculate favor statistics
   */
  static calculateFavorStats(favors) {
    const given = favors.filter(f => f.direction === 'given');
    const received = favors.filter(f => f.direction === 'received');

    return {
      total_given: given.length,
      total_received: received.length,
      value_given: given.reduce((sum, f) => sum + parseFloat(f.estimated_value || 0), 0),
      value_received: received.reduce((sum, f) => sum + parseFloat(f.estimated_value || 0), 0),
      pending_given: given.filter(f => f.status === 'pending').length,
      pending_received: received.filter(f => f.status === 'pending').length
    };
  }

  /**
   * Identify most common associates from event attendance
   */
  static identifyCommonAssociates(events) {
    const associates = {};

    events.forEach(event => {
      if (event.co_attendees) {
        event.co_attendees.forEach(name => {
          associates[name] = (associates[name] || 0) + 1;
        });
      }
    });

    // Sort by frequency and return top 10
    return Object.entries(associates)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, event_count: count }));
  }

  /**
   * Gather comprehensive data for all first-degree connections
   */
  static async gatherFirstDegreeConnectionData(userId, personId, relationships) {
    const enrichedConnections = [];

    for (const rel of relationships) {
      const connectedPersonId = rel.other_person_id;

      try {
        // Get basic info for N1 connection
        const basicResult = await pool.query(
          `SELECT id, name, email, phone, birthday, address, linkedin_url, notes, importance
           FROM people
           WHERE id = $1 AND user_id = $2`,
          [connectedPersonId, userId]
        );

        if (basicResult.rows.length === 0) continue;

        const connection = {
          person: basicResult.rows[0],
          relationship: {
            type: rel.type,
            strength: rel.strength,
            notes: rel.relationship_notes
          }
        };

        // Get their professional history
        const professionalResult = await pool.query(
          `SELECT company, position, start_date, end_date, notes
           FROM professional_history
           WHERE person_id = $1
           ORDER BY
             CASE WHEN end_date IS NULL THEN 0 ELSE 1 END,
             COALESCE(end_date, NOW()) DESC,
             start_date DESC`,
          [connectedPersonId]
        );
        connection.professional = professionalResult.rows;

        // Get their biographical entries
        const biographyResult = await pool.query(
          `SELECT title, note, note_date
           FROM biographies
           WHERE person_id = $1 AND user_id = $2
           ORDER BY note_date DESC NULLS LAST, created_at DESC
           LIMIT 5`,
          [connectedPersonId, userId]
        );
        connection.biographies = biographyResult.rows;

        // Get their assets
        const assetsResult = await pool.query(
          `SELECT asset_type, name, description, availability, estimated_value
           FROM assets
           WHERE owner_id = $1 AND user_id = $2
           ORDER BY estimated_value DESC NULLS LAST
           LIMIT 5`,
          [connectedPersonId, userId]
        );
        connection.assets = assetsResult.rows;

        // Get their N2 relationships (people they're connected to)
        const n2Result = await pool.query(
          `SELECT
             r.relationship_type AS type,
             r.strength,
             CASE
               WHEN r.person_a_id = $1 THEN p2.name
               ELSE p1.name
             END as person_name
           FROM relationships r
           JOIN people p1 ON p1.id = r.person_a_id
           JOIN people p2 ON p2.id = r.person_b_id
           WHERE (r.person_a_id = $1 OR r.person_b_id = $1)
           AND p1.user_id = $2 AND p2.user_id = $2
           ORDER BY r.strength DESC
           LIMIT 10`,
          [connectedPersonId, userId]
        );
        connection.n2_relationships = n2Result.rows;

        // Get their existing AI summary (if available)
        const summaryResult = await pool.query(
          `SELECT summary, summary_generated_at
           FROM people
           WHERE id = $1 AND user_id = $2 AND summary IS NOT NULL`,
          [connectedPersonId, userId]
        );
        connection.summary = summaryResult.rows.length > 0 ? summaryResult.rows[0].summary : null;
        connection.summary_generated_at = summaryResult.rows.length > 0 ? summaryResult.rows[0].summary_generated_at : null;

        // Count shared events
        const sharedEventsResult = await pool.query(
          `SELECT COUNT(DISTINCT e.id) as count
           FROM events e
           JOIN event_participants ep1 ON ep1.event_id = e.id AND ep1.person_id = $1
           JOIN event_participants ep2 ON ep2.event_id = e.id AND ep2.person_id = $2
           WHERE e.user_id = $3`,
          [personId, connectedPersonId, userId]
        );
        connection.shared_events_count = parseInt(sharedEventsResult.rows[0].count || 0);

        // Count favors exchanged
        const favorsResult = await pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE giver_id = $1 AND receiver_id = $2) as given,
             COUNT(*) FILTER (WHERE giver_id = $2 AND receiver_id = $1) as received
           FROM favors
           WHERE ((giver_id = $1 AND receiver_id = $2) OR (giver_id = $2 AND receiver_id = $1))
           AND user_id = $3`,
          [personId, connectedPersonId, userId]
        );
        connection.favors_exchanged = {
          given: parseInt(favorsResult.rows[0].given || 0),
          received: parseInt(favorsResult.rows[0].received || 0)
        };

        enrichedConnections.push(connection);
      } catch (error) {
        console.error(`Error gathering data for connection ${connectedPersonId}:`, error);
        // Continue with other connections even if one fails
      }
    }

    return enrichedConnections;
  }

  /**
   * Calculate network metrics from first-degree connection data
   */
  static calculateNetworkMetrics(personData, firstDegreeConnections) {
    const metrics = {
      professional_overlap: [],
      interaction_frequency: {},
      bridging_analysis: []
    };

    // Track companies/positions for overlap analysis
    const personCompanies = new Set();
    if (personData.basic && personData.professional) {
      personData.professional.forEach(job => {
        if (job.company) personCompanies.add(job.company.toLowerCase());
      });
    }

    // Analyze each N1 connection
    firstDegreeConnections.forEach(conn => {
      const connectionName = conn.person.name;

      // Professional overlap
      if (conn.professional && conn.professional.length > 0) {
        conn.professional.forEach(job => {
          if (job.company && personCompanies.has(job.company.toLowerCase())) {
            metrics.professional_overlap.push({
              person: connectionName,
              company: job.company,
              their_position: job.position,
              overlap_period: {
                start: job.start_date,
                end: job.end_date
              }
            });
          }
        });
      }

      // Interaction frequency
      const totalInteractions = conn.shared_events_count +
                                conn.favors_exchanged.given +
                                conn.favors_exchanged.received;

      if (totalInteractions > 0) {
        metrics.interaction_frequency[connectionName] = {
          total: totalInteractions,
          events: conn.shared_events_count,
          favors: conn.favors_exchanged.given + conn.favors_exchanged.received,
          strength: conn.relationship.strength
        };
      }

      // Bridging analysis - connections who link to different clusters
      // A bridge is someone who has connections to people the focal person doesn't know
      if (conn.n2_relationships && conn.n2_relationships.length > 0) {
        // Check if this N1 person has N2 connections
        const hasN2Connections = conn.n2_relationships.length > 0;
        const n2Names = conn.n2_relationships.map(n2 => n2.person_name);

        // Count how many of their connections are NOT in the focal person's network
        const focalPersonConnectionNames = new Set(
          firstDegreeConnections.map(c => c.person.name)
        );

        const uniqueN2Count = n2Names.filter(name =>
          !focalPersonConnectionNames.has(name)
        ).length;

        if (uniqueN2Count > 0) {
          metrics.bridging_analysis.push({
            person: connectionName,
            unique_connections: uniqueN2Count,
            total_connections: conn.n2_relationships.length,
            bridging_potential: (uniqueN2Count / conn.n2_relationships.length * 100).toFixed(1)
          });
        }
      }
    });

    // Sort bridging analysis by potential
    metrics.bridging_analysis.sort((a, b) =>
      parseFloat(b.bridging_potential) - parseFloat(a.bridging_potential)
    );

    return metrics;
  }

  /**
   * Analyze family dynamics patterns from biographical data and relationships
   * Detects divorces, marriages, children, breakups and stability patterns
   */
  static analyzeFamilyDynamics(personData, firstDegreeConnections) {
    const patterns = [];
    const lifeEvents = [];
    const familyKeywords = {
      divorce: ['divorce', 'divorced', 'separation', 'separated', 'split up'],
      marriage: ['married', 'marriage', 'wedding', 'wed'],
      children: ['child', 'children', 'son', 'daughter', 'birth', 'born', 'baby'],
      breakup: ['breakup', 'broke up', 'break up', 'ended relationship']
    };

    // Analyze focal person's biographical events
    if (personData.biography && personData.biography.length > 0) {
      personData.biography.forEach(bio => {
        const text = `${bio.title} ${bio.note || ''}`.toLowerCase();
        const date = bio.note_date ? new Date(bio.note_date) : null;

        Object.entries(familyKeywords).forEach(([category, keywords]) => {
          keywords.forEach(keyword => {
            if (text.includes(keyword)) {
              lifeEvents.push({
                person: personData.basic.name,
                category,
                event: bio.title,
                date,
                details: bio.note
              });
            }
          });
        });
      });
    }

    // Analyze N1 connections' biographical events
    const familyConnections = firstDegreeConnections.filter(conn =>
      conn.relationship && conn.relationship.type === 'family'
    );

    familyConnections.forEach(conn => {
      if (conn.biographies && conn.biographies.length > 0) {
        conn.biographies.forEach(bio => {
          const text = `${bio.title} ${bio.note || ''}`.toLowerCase();
          const date = bio.note_date ? new Date(bio.note_date) : null;

          Object.entries(familyKeywords).forEach(([category, keywords]) => {
            keywords.forEach(keyword => {
              if (text.includes(keyword)) {
                lifeEvents.push({
                  person: conn.person.name,
                  category,
                  event: bio.title,
                  date,
                  details: bio.note,
                  relationshipToFocal: conn.relationship.notes
                });
              }
            });
          });
        });
      }

      // Also check relationship notes for family events
      if (conn.relationship && conn.relationship.notes) {
        const relText = conn.relationship.notes.toLowerCase();
        Object.entries(familyKeywords).forEach(([category, keywords]) => {
          keywords.forEach(keyword => {
            if (relText.includes(keyword)) {
              lifeEvents.push({
                person: conn.person.name,
                category,
                event: conn.relationship.notes,
                date: null,
                details: conn.relationship.notes,
                relationshipToFocal: conn.relationship.notes
              });
            }
          });
        });
      }
    });

    // Identify patterns - compare family member life stages
    const focalPersonMarried = lifeEvents.some(e =>
      e.person === personData.basic.name && e.category === 'marriage'
    );
    const focalPersonChildren = lifeEvents.some(e =>
      e.person === personData.basic.name && e.category === 'children'
    );
    const focalPersonDivorce = lifeEvents.some(e =>
      e.person === personData.basic.name && e.category === 'divorce'
    );
    const focalPersonBreakup = lifeEvents.some(e =>
      e.person === personData.basic.name && e.category === 'breakup'
    );

    // Check siblings' life stages
    const siblings = familyConnections.filter(conn =>
      conn.relationship.notes && (
        conn.relationship.notes.toLowerCase().includes('brother') ||
        conn.relationship.notes.toLowerCase().includes('sister')
      )
    );

    siblings.forEach(sibling => {
      const siblingMarried = lifeEvents.some(e =>
        e.person === sibling.person.name && e.category === 'marriage'
      );
      const siblingChildren = lifeEvents.some(e =>
        e.person === sibling.person.name && e.category === 'children'
      );

      if (siblingMarried && !focalPersonMarried) {
        patterns.push({
          type: 'life_stage_disparity',
          description: `${sibling.person.name} (${sibling.relationship.notes}) is married${siblingChildren ? ' with children' : ''}, while ${personData.basic.name} is ${focalPersonBreakup ? 'experiencing relationship challenges' : 'not married'}`
        });
      }
    });

    // Check for parental divorce
    const parents = familyConnections.filter(conn =>
      conn.relationship.notes && (
        conn.relationship.notes.toLowerCase().includes('mother') ||
        conn.relationship.notes.toLowerCase().includes('father')
      )
    );

    const parentalDivorce = lifeEvents.find(e =>
      parents.some(p => p.person.name === e.person) && e.category === 'divorce'
    );

    // Check if parents' relationship indicates divorce
    const parentsRelationship = personData.relationships.find(rel =>
      rel.relationship_notes && rel.relationship_notes.toLowerCase().includes('divorced')
    );

    if (parentalDivorce || parentsRelationship) {
      const divorceYear = parentalDivorce?.event.match(/\d{4}/)?.[0] ||
                          parentsRelationship?.relationship_notes.match(/\d{4}/)?.[0];

      patterns.push({
        type: 'parental_divorce',
        description: `Parents divorced${divorceYear ? ` in ${divorceYear}` : ''}, indicating potential family instability during formative years`
      });

      // Correlate with focal person's own relationship issues
      if (focalPersonBreakup || focalPersonDivorce) {
        const focalEvent = lifeEvents.find(e =>
          e.person === personData.basic.name && (e.category === 'breakup' || e.category === 'divorce')
        );
        patterns.push({
          type: 'pattern_correlation',
          description: `${personData.basic.name}'s ${focalEvent?.category || 'relationship challenges'} may reflect family patterns, following parents' divorce${divorceYear ? ` in ${divorceYear}` : ''}`
        });
      }
    }

    return {
      patterns,
      lifeEvents,
      familyConnections: familyConnections.map(fc => fc.person.name)
    };
  }

  /**
   * Analyze timeline correlations - overlapping employment, relocations, life events
   * Finds temporal patterns and overlaps between focal person and network
   */
  static analyzeTimelineCorrelations(personData, firstDegreeConnections) {
    const overlaps = [];
    const correlations = [];

    // Build focal person's timeline
    const focalTimeline = {
      professional: personData.professional || [],
      biographical: personData.biography || [],
      name: personData.basic.name
    };

    // Analyze professional overlaps
    focalTimeline.professional.forEach(focalJob => {
      const focalStart = focalJob.start_date ? new Date(focalJob.start_date) : null;
      const focalEnd = focalJob.end_date ? new Date(focalJob.end_date) : new Date();
      const focalCompany = focalJob.company?.toLowerCase();
      const focalCity = personData.basic.address?.toLowerCase();

      firstDegreeConnections.forEach(conn => {
        if (!conn.professional || conn.professional.length === 0) return;

        conn.professional.forEach(connJob => {
          const connStart = connJob.start_date ? new Date(connJob.start_date) : null;
          const connEnd = connJob.end_date ? new Date(connJob.end_date) : new Date();
          const connCompany = connJob.company?.toLowerCase();

          // Same company overlap
          if (focalCompany && connCompany && focalCompany === connCompany) {
            if (focalStart && connStart && focalEnd && connEnd) {
              // Check if time periods overlap
              const overlapping = (focalStart <= connEnd) && (connStart <= focalEnd);
              if (overlapping) {
                overlaps.push({
                  type: 'professional_overlap',
                  description: `Worked at ${focalJob.company} simultaneously with ${conn.person.name} (${focalStart.getFullYear()}-${focalEnd.getFullYear()} overlapping with ${connStart.getFullYear()}-${connEnd.getFullYear()})`,
                  person: conn.person.name,
                  company: focalJob.company,
                  focalPosition: focalJob.position,
                  connPosition: connJob.position,
                  startOverlap: new Date(Math.max(focalStart, connStart)),
                  endOverlap: new Date(Math.min(focalEnd, connEnd))
                });
              }
            }
          }

          // Same city, different companies (potential for networking)
          const connCity = conn.person.address?.toLowerCase();
          if (focalCity && connCity && focalCity.includes(connCity.split(',')[0]) || connCity.includes(focalCity.split(',')[0])) {
            if (focalStart && connStart && focalEnd && connEnd) {
              const overlapping = (focalStart <= connEnd) && (connStart <= focalEnd);
              if (overlapping && focalCompany !== connCompany) {
                overlaps.push({
                  type: 'location_overlap',
                  description: `Both worked in same city (${focalCity}) during overlapping period: ${personData.basic.name} at ${focalJob.company}, ${conn.person.name} at ${connJob.company}`,
                  city: focalCity,
                  period: `${Math.max(focalStart.getFullYear(), connStart.getFullYear())}-${Math.min(focalEnd.getFullYear(), connEnd.getFullYear())}`
                });
              }
            }
          }
        });
      });
    });

    // Correlate biographical events with career changes
    if (focalTimeline.biographical.length > 0 && focalTimeline.professional.length > 0) {
      focalTimeline.biographical.forEach(bio => {
        const bioDate = bio.note_date ? new Date(bio.note_date) : null;
        if (!bioDate) return;

        // Find career changes within 6 months of biographical event
        focalTimeline.professional.forEach((job, index) => {
          if (index === 0) return; // Skip first job (no previous to compare)

          const jobStart = job.start_date ? new Date(job.start_date) : null;
          if (!jobStart) return;

          const monthsDiff = Math.abs((bioDate.getTime() - jobStart.getTime()) / (1000 * 60 * 60 * 24 * 30));

          if (monthsDiff <= 6) {
            correlations.push({
              type: 'life_event_career_correlation',
              description: `Career change to ${job.company} (${job.position}) occurred within ${Math.round(monthsDiff)} months of "${bio.title}" (${bioDate.toLocaleDateString()})`,
              bioEvent: bio.title,
              careerEvent: `Started at ${job.company}`,
              proximity: `${Math.round(monthsDiff)} months`
            });
          }
        });
      });
    }

    return {
      overlaps,
      correlations
    };
  }

  /**
   * Analyze asset disparities and wealth distribution across network
   * Identifies high-net-worth connections and resource access opportunities
   */
  static analyzeAssetDisparities(personData, firstDegreeConnections) {
    const insights = [];
    const wealthDistribution = [];

    // Calculate focal person's total asset value
    const focalAssets = personData.assets || [];
    const focalTotalValue = focalAssets.reduce((sum, asset) =>
      sum + parseFloat(asset.estimated_value || 0), 0
    );

    wealthDistribution.push({
      person: personData.basic.name,
      totalAssets: focalTotalValue,
      assetCount: focalAssets.length,
      isFocal: true
    });

    // Calculate each N1 connection's total asset value
    firstDegreeConnections.forEach(conn => {
      const connAssets = conn.assets || [];
      const connTotalValue = connAssets.reduce((sum, asset) =>
        sum + parseFloat(asset.estimated_value || 0), 0
      );

      wealthDistribution.push({
        person: conn.person.name,
        totalAssets: connTotalValue,
        assetCount: connAssets.length,
        isFocal: false,
        relationshipType: conn.relationship?.type,
        assets: connAssets
      });
    });

    // Sort by total value
    wealthDistribution.sort((a, b) => b.totalAssets - a.totalAssets);

    // Identify high-net-worth connections (top 25% or >€100k)
    const highNetWorth = wealthDistribution.filter(w =>
      !w.isFocal && (w.totalAssets > 100000 || w.totalAssets > focalTotalValue * 10)
    );

    if (highNetWorth.length > 0) {
      insights.push({
        type: 'high_net_worth_connections',
        description: `Network includes ${highNetWorth.length} high-net-worth connection(s): ${highNetWorth.map(h => `${h.person} (€${h.totalAssets.toLocaleString()})`).join(', ')}`,
        connections: highNetWorth
      });
    }

    // Identify wealth disparities
    const maxWealth = Math.max(...wealthDistribution.map(w => w.totalAssets));
    const minWealth = Math.min(...wealthDistribution.map(w => w.totalAssets));

    if (maxWealth > minWealth * 10) {
      const wealthiest = wealthDistribution.find(w => w.totalAssets === maxWealth);
      const poorest = wealthDistribution.find(w => w.totalAssets === minWealth);

      insights.push({
        type: 'wealth_disparity',
        description: `Significant wealth disparity in network: ${wealthiest.person} (€${maxWealth.toLocaleString()}) vs ${poorest.person} (€${minWealth.toLocaleString()}) - ${Math.round(maxWealth/minWealth)}x difference`,
        ratio: maxWealth / minWealth
      });
    }

    // Identify accessible resources from network
    const accessibleResources = [];
    firstDegreeConnections.forEach(conn => {
      if (!conn.assets || conn.assets.length === 0) return;

      conn.assets.forEach(asset => {
        if (asset.availability === 'always' || asset.availability === 'by_request') {
          accessibleResources.push({
            asset: asset.name,
            type: asset.asset_type,
            owner: conn.person.name,
            availability: asset.availability,
            value: parseFloat(asset.estimated_value || 0)
          });
        }
      });
    });

    if (accessibleResources.length > 0) {
      // Sort by value
      accessibleResources.sort((a, b) => b.value - a.value);

      insights.push({
        type: 'network_resources',
        description: `Network provides access to ${accessibleResources.length} resource(s) worth €${accessibleResources.reduce((sum, r) => sum + r.value, 0).toLocaleString()}: ${accessibleResources.slice(0, 3).map(r => `${r.asset} from ${r.owner}`).join(', ')}${accessibleResources.length > 3 ? ` (+${accessibleResources.length - 3} more)` : ''}`,
        resources: accessibleResources
      });
    }

    // Identify what focal person lacks that network has
    if (focalAssets.length === 0 && accessibleResources.length > 0) {
      insights.push({
        type: 'resource_dependency',
        description: `${personData.basic.name} owns no recorded assets but has access to network resources, indicating resource dependency on connections`,
        severity: 'medium'
      });
    }

    // Find asset type gaps
    const focalAssetTypes = new Set(focalAssets.map(a => a.asset_type));
    const networkAssetTypes = new Set();
    firstDegreeConnections.forEach(conn => {
      if (conn.assets) {
        conn.assets.forEach(asset => networkAssetTypes.add(asset.asset_type));
      }
    });

    const missingTypes = [...networkAssetTypes].filter(type => !focalAssetTypes.has(type));
    if (missingTypes.length > 0 && focalAssets.length > 0) {
      insights.push({
        type: 'asset_gaps',
        description: `${personData.basic.name} lacks ${missingTypes.join(', ')} assets that exist in network, potential areas for growth or collaboration`,
        gaps: missingTypes
      });
    }

    return {
      insights,
      wealthDistribution,
      highNetWorth,
      accessibleResources
    };
  }

  /**
   * Analyze professional synergies, hierarchies, and opportunities
   * Identifies mentorship potential, collaboration opportunities, and career insights
   */
  static analyzeProfessionalSynergies(personData, firstDegreeConnections) {
    const opportunities = [];
    const hierarchies = [];
    const synergies = [];

    const focalProfessional = personData.professional || [];
    const focalCurrentJob = focalProfessional.find(j => !j.end_date) || focalProfessional[0];

    // Position level keywords
    const seniorityLevels = {
      executive: ['ceo', 'cto', 'cfo', 'coo', 'president', 'vp', 'vice president', 'director', 'head of'],
      senior: ['senior', 'lead', 'principal', 'manager'],
      mid: ['specialist', 'coordinator', 'analyst', 'associate'],
      junior: ['junior', 'assistant', 'intern', 'trainee']
    };

    function getSeniorityLevel(position) {
      if (!position) return 'unknown';
      const posLower = position.toLowerCase();

      for (const [level, keywords] of Object.entries(seniorityLevels)) {
        if (keywords.some(kw => posLower.includes(kw))) {
          return level;
        }
      }
      return 'mid'; // default
    }

    const focalSeniority = focalCurrentJob ? getSeniorityLevel(focalCurrentJob.position) : 'unknown';

    // Analyze each connection's professional profile
    firstDegreeConnections.forEach(conn => {
      if (!conn.professional || conn.professional.length === 0) return;

      const connCurrentJob = conn.professional.find(j => !j.end_date) || conn.professional[0];
      if (!connCurrentJob) return;

      const connSeniority = getSeniorityLevel(connCurrentJob.position);

      // Identify hierarchical relationships
      const seniorityOrder = ['junior', 'mid', 'senior', 'executive'];
      const focalIndex = seniorityOrder.indexOf(focalSeniority);
      const connIndex = seniorityOrder.indexOf(connSeniority);

      if (connIndex > focalIndex && connIndex - focalIndex >= 2) {
        hierarchies.push({
          type: 'potential_mentor',
          description: `${conn.person.name} (${connCurrentJob.position} at ${connCurrentJob.company}) is ${connIndex - focalIndex} levels senior, potential mentor`,
          person: conn.person.name,
          position: connCurrentJob.position,
          company: connCurrentJob.company,
          seniorityGap: connIndex - focalIndex
        });
      } else if (focalIndex > connIndex && focalIndex - connIndex >= 2) {
        hierarchies.push({
          type: 'potential_mentee',
          description: `${conn.person.name} (${connCurrentJob.position}) is ${focalIndex - connIndex} levels junior, potential mentee`,
          person: conn.person.name,
          position: connCurrentJob.position,
          company: connCurrentJob.company,
          seniorityGap: focalIndex - connIndex
        });
      }

      // Industry/company synergies
      if (focalCurrentJob && connCurrentJob) {
        // Same industry indicators (simplified - could be enhanced with industry taxonomy)
        const focalCompanyType = focalCurrentJob.company?.toLowerCase();
        const connCompanyType = connCurrentJob.company?.toLowerCase();

        // Check if working in same city
        const focalCity = personData.basic.address;
        const connCity = conn.person.address;

        if (focalCity && connCity) {
          const focalCityName = focalCity.split(',')[0].toLowerCase().trim();
          const connCityName = connCity.split(',')[0].toLowerCase().trim();

          if (focalCityName === connCityName && focalCompanyType !== connCompanyType) {
            synergies.push({
              type: 'same_city_networking',
              description: `Both work in ${focalCityName}: ${personData.basic.name} at ${focalCurrentJob.company}, ${conn.person.name} at ${connCurrentJob.company} - potential for local networking`,
              city: focalCityName,
              opportunity: 'networking_events'
            });
          }
        }
      }

      // Check for career trajectory similarities
      if (focalProfessional.length > 1 && conn.professional.length > 1) {
        // Both have moved companies - potential shared experience
        const focalMoves = focalProfessional.length - 1;
        const connMoves = conn.professional.length - 1;

        if (focalMoves >= 3 && connMoves >= 3) {
          opportunities.push({
            type: 'shared_career_pattern',
            description: `Both ${personData.basic.name} and ${conn.person.name} have dynamic career trajectories (${focalMoves} and ${connMoves} job changes respectively) - potential for sharing career navigation strategies`,
            pattern: 'mobile_professionals'
          });
        }
      }
    });

    // Industry clustering analysis
    const industries = new Map();
    firstDegreeConnections.forEach(conn => {
      if (!conn.professional || conn.professional.length === 0) return;

      const currentJob = conn.professional.find(j => !j.end_date) || conn.professional[0];
      if (currentJob && currentJob.company) {
        const company = currentJob.company;
        if (!industries.has(company)) {
          industries.set(company, []);
        }
        industries.get(company).push(conn.person.name);
      }
    });

    // If multiple connections work at same company (and focal person doesn't)
    industries.forEach((people, company) => {
      if (people.length >= 2) {
        const focalWorksHere = focalCurrentJob && focalCurrentJob.company?.toLowerCase() === company.toLowerCase();
        if (!focalWorksHere) {
          opportunities.push({
            type: 'company_cluster',
            description: `Multiple connections (${people.join(', ')}) work at ${company} - potential introduction opportunity or insights into company culture`,
            company,
            connections: people
          });
        }
      }
    });

    return {
      opportunities,
      hierarchies,
      synergies
    };
  }

  /**
   * Synthesize cross-referential insights from all analyses
   * Combines multiple data sources to generate non-obvious inferences
   */
  static synthesizeCrossReferentialInsights(personData, firstDegreeConnections, allAnalyses) {
    const insights = [];
    const { familyDynamics, timelineCorrelations, assetDisparities, professionalSynergies } = allAnalyses;

    // Family dynamics + timeline correlations
    if (familyDynamics.patterns.length > 0 && timelineCorrelations.correlations.length > 0) {
      const parentalDivorce = familyDynamics.patterns.find(p => p.type === 'parental_divorce');
      const careerCorrelation = timelineCorrelations.correlations.find(c => c.type === 'life_event_career_correlation');

      if (parentalDivorce && careerCorrelation) {
        insights.push(
          `Family instability (${parentalDivorce.description}) may have influenced career decisions, evidenced by ${careerCorrelation.description.toLowerCase()}`
        );
      }
    }

    // Family life stage + asset disparities
    const lifeStageDisparity = familyDynamics.patterns.find(p => p.type === 'life_stage_disparity');
    const wealthGap = assetDisparities.insights.find(i => i.type === 'wealth_disparity');

    if (lifeStageDisparity && wealthGap) {
      insights.push(
        `${lifeStageDisparity.description}. This life stage disparity may correlate with ${wealthGap.description.toLowerCase()}`
      );
    }

    // Professional synergies + asset disparities
    const mentorOpportunity = professionalSynergies.hierarchies.find(h => h.type === 'potential_mentor');
    const resourceAccess = assetDisparities.accessibleResources;

    if (mentorOpportunity && resourceAccess.length > 0) {
      const mentorAssets = resourceAccess.filter(r => r.owner === mentorOpportunity.person);
      if (mentorAssets.length > 0) {
        insights.push(
          `${mentorOpportunity.description}. Additionally, ${mentorOpportunity.person} provides access to ${mentorAssets.map(a => a.asset).join(', ')}, creating both professional and resource leverage opportunities`
        );
      }
    }

    // Resource dependency + family connections
    const resourceDependency = assetDisparities.insights.find(i => i.type === 'resource_dependency');
    if (resourceDependency && familyDynamics.familyConnections.length > 0) {
      insights.push(
        `${resourceDependency.description}. Primary resource access comes from family connections (${familyDynamics.familyConnections.join(', ')}), indicating strong family reliance`
      );
    }

    // Location-based opportunities
    const locationOverlaps = timelineCorrelations.overlaps.filter(o => o.type === 'location_overlap');
    const sameCitySynergies = professionalSynergies.synergies.filter(s => s.type === 'same_city_networking');

    if (locationOverlaps.length > 0 && sameCitySynergies.length > 0) {
      insights.push(
        `Strong local professional network in ${sameCitySynergies[0].city} with ${locationOverlaps.length} historical overlap(s) and ${sameCitySynergies.length} current connection(s) - significant local influence potential`
      );
    }

    // Company clusters + professional overlap
    const companyCluster = professionalSynergies.opportunities.find(o => o.type === 'company_cluster');
    const professionalOverlap = timelineCorrelations.overlaps.find(o => o.type === 'professional_overlap');

    if (companyCluster && professionalOverlap) {
      if (companyCluster.company === professionalOverlap.company) {
        insights.push(
          `Historical working relationship with ${professionalOverlap.person} at ${professionalOverlap.company} continues through current employee cluster (${companyCluster.connections.join(', ')}), maintaining sustained organizational connection`
        );
      }
    }

    // Add standalone insights that don't require cross-referencing
    if (familyDynamics.patterns.length > 0) {
      const patternCorrelation = familyDynamics.patterns.find(p => p.type === 'pattern_correlation');
      if (patternCorrelation) {
        insights.push(patternCorrelation.description);
      }
    }

    return {
      insights
    };
  }

  /**
   * Generate summary using LLM
   */
  static async generateSummaryWithLLM(userId, personData) {
    // Get user LLM settings
    const userResult = await pool.query(
      `SELECT ai_api_url, ai_model, ai_timeout
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const userSettings = userResult.rows[0];

    // Create LLM provider instance
    const llmProvider = new LLMProviderService(
      userSettings.ai_api_url,
      userSettings.ai_model,
      'dummy-key',
      userSettings.ai_timeout || 200
    );

    const prompt = this.buildSummaryPrompt(personData);

    // Call LLM to generate summary
    const response = await llmProvider.createChatCompletion([
      {
        role: 'system',
        content: 'You are an expert analyst specializing in creating concise, fact-based person summaries. Generate data-driven, analytical profiles (500-1000 words) that focus on verifiable patterns, network position, and professional context. Avoid speculation and base all insights on actual data provided.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      maxTokens: 2000,  // Increased for longer Key Insights section (~300 words)
      temperature: 0.5  // Kept at 0.5 for factual, analytical output
    });

    // Extract text content from response
    return response.choices[0].message.content;
  }

  /**
   * Build concise, fact-based prompt for LLM summary generation (800-1000 words)
   */
  static buildSummaryPrompt(data) {
    const {
      basic,
      professional,
      biography,
      relationships,
      assets,
      favors,
      events,
      favorStats,
      commonAssociates,
      firstDegreeConnections,
      networkMetrics,
      familyDynamics,
      timelineCorrelations,
      assetDisparities,
      professionalSynergies,
      crossReferentialInsights
    } = data;

    let prompt = `Generate a comprehensive, fact-based summary (800-1000 words) for the following person:\n\n`;

    // ===== SECTION 1: CORE PROFILE =====
    prompt += `## 1. CORE PROFILE\n`;
    prompt += `Name: ${basic.name}\n`;
    if (basic.birthday) {
      const age = Math.floor((Date.now() - new Date(basic.birthday)) / (365.25 * 24 * 60 * 60 * 1000));
      prompt += `Age: ${age} (born ${new Date(basic.birthday).toLocaleDateString()})\n`;
    }
    if (basic.importance) prompt += `Importance: ${basic.importance}/5\n`;

    // Current professional status
    if (professional.length > 0) {
      const current = professional.find(j => !j.end_date) || professional[0];
      prompt += `Current: ${current.position || 'Unknown'} at ${current.company}\n`;
    }

    if (basic.notes) prompt += `User Notes: ${basic.notes}\n`;

    // Focal person's biographical highlights
    if (biography && biography.length > 0) {
      prompt += `\nBiographical Highlights:\n`;
      biography.forEach(bio => {
        const bioDate = bio.note_date ? new Date(bio.note_date).toLocaleDateString() : 'Undated';
        prompt += `  - ${bio.title} (${bioDate})`;
        if (bio.note) prompt += `: ${bio.note}`;
        prompt += `\n`;
      });
    }

    // Most interacted people
    if (commonAssociates && commonAssociates.length > 0) {
      prompt += `\nMost Frequent Co-attendees: ${commonAssociates.slice(0, 3).map(a => `${a.name} (${a.event_count} events)`).join(', ')}\n`;
    }

    // Owned assets
    if (assets && assets.length > 0) {
      const totalValue = assets.reduce((sum, a) => sum + parseFloat(a.estimated_value || 0), 0);
      prompt += `\nOwned Assets: ${assets.length} items (€${totalValue.toFixed(0)} total value)\n`;
      assets.slice(0, 3).forEach(asset => {
        prompt += `  - ${asset.name} (${asset.asset_type})`;
        if (asset.availability) prompt += ` - ${asset.availability}`;
        prompt += `\n`;
      });
    } else {
      prompt += `\nOwned Assets: None recorded\n`;
    }
    prompt += `\n`;

    // ===== SECTION 2: OVERVIEW OF NETWORK =====
    prompt += `## 2. OVERVIEW OF NETWORK\n`;
    prompt += `Total Connections:\n`;
    prompt += `  - N1 (Direct): ${relationships.length}\n`;

    // Calculate N2 count
    const n2Count = firstDegreeConnections.reduce((sum, conn) =>
      sum + (conn.n2_relationships?.length || 0), 0);
    prompt += `  - N2 (Second-degree): ${n2Count}\n`;

    // Most common connection type
    const byType = {};
    relationships.forEach(rel => {
      if (!byType[rel.type]) byType[rel.type] = 0;
      byType[rel.type]++;
    });
    const mostCommonType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
    if (mostCommonType) {
      prompt += `  - Most common type: ${mostCommonType[0]} (${mostCommonType[1]} connections)\n`;
    }

    // High-potential connections
    if (assetDisparities.highNetWorth && assetDisparities.highNetWorth.length > 0) {
      prompt += `\nHigh-Potential Connections (by net worth or connection count):\n`;
      assetDisparities.highNetWorth.forEach(conn => {
        const n1Conn = firstDegreeConnections.find(c => c.person.name === conn.person);
        const n2Count = n1Conn?.n2_relationships?.length || 0;
        prompt += `  - ${conn.person}: €${conn.totalAssets.toLocaleString()} in assets`;
        if (n2Count > 0) prompt += `, ${n2Count} connections`;
        prompt += `\n`;
      });
    }

    // Network bridging analysis - FIX: explicitly list N2 PEOPLE names, not assets
    if (networkMetrics.bridging_analysis.length > 0) {
      prompt += `\nKey Network Bridges (PEOPLE who connect to different clusters):\n`;
      const focalPersonConnectionNames = new Set(firstDegreeConnections.map(c => c.person.name));

      networkMetrics.bridging_analysis.slice(0, 3).forEach(bridge => {
        const bridgeConnection = firstDegreeConnections.find(c => c.person.name === bridge.person);
        if (bridgeConnection && bridgeConnection.n2_relationships) {
          // Get actual N2 PERSON names (not assets!)
          const n2PersonNames = bridgeConnection.n2_relationships
            .slice(0, 5)
            .map(n2 => n2.person_name)
            .filter(name => !focalPersonConnectionNames.has(name))
            .join(', ');

          prompt += `  - ${bridge.person} connects you to these PEOPLE: ${n2PersonNames || 'none listed'}`;
          if (bridge.unique_connections > 5) {
            prompt += ` (+${bridge.unique_connections - 5} more people)`;
          }
          prompt += ` (${bridge.bridging_potential}% bridging potential)\n`;
        }
      });
      prompt += `\nIMPORTANT: The names listed above are PEOPLE in the network, NOT assets or properties.\n`;
    }

    // Most frequent interactions
    const topInteractions = Object.entries(networkMetrics.interaction_frequency)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);

    if (topInteractions.length > 0) {
      prompt += `\nMost Frequent Interactions:\n`;
      topInteractions.forEach(([name, data]) => {
        prompt += `  - ${name}: ${data.total} interactions (${data.events} events, ${data.favors} favors)\n`;
      });
    }
    prompt += `\n`;

    // ===== SECTION 3: PROFESSIONAL CONTEXT =====
    prompt += `## 3. PROFESSIONAL CONTEXT\n`;
    if (professional.length > 0) {
      prompt += `Career Timeline (${professional.length} positions):\n`;
      professional.slice(0, 3).forEach(job => {
        const start = job.start_date ? new Date(job.start_date).getFullYear() : '?';
        const end = job.end_date ? new Date(job.end_date).getFullYear() : 'Present';
        prompt += `  - ${job.position} at ${job.company} (${start}-${end})\n`;
      });

      // Professional overlap with network
      if (networkMetrics.professional_overlap.length > 0) {
        prompt += `\nProfessional Overlap with Network:\n`;
        networkMetrics.professional_overlap.forEach(overlap => {
          prompt += `  - Worked with ${overlap.person} at ${overlap.company}`;
          if (overlap.their_position) prompt += ` (${overlap.their_position})`;
          prompt += `\n`;
        });
      }
    } else {
      prompt += `No professional history recorded.\n`;
    }
    prompt += `\n`;

    // ===== SECTION 4: INTERACTION PATTERNS =====
    prompt += `## 4. INTERACTION PATTERNS\n`;

    // Event participation
    prompt += `Events: ${events.length} total attended\n`;
    if (events.length > 0) {
      const eventTypes = {};
      events.forEach(e => {
        eventTypes[e.event_type] = (eventTypes[e.event_type] || 0) + 1;
      });
      prompt += `  Types: ${Object.entries(eventTypes).map(([type, count]) => `${type} (${count})`).join(', ')}\n`;

      if (commonAssociates.length > 0) {
        prompt += `  Most common co-attendees: ${commonAssociates.slice(0, 3).map(a => `${a.name} (${a.event_count})`).join(', ')}\n`;
      }
    }

    // Favor reciprocity
    prompt += `\nFavors:\n`;
    prompt += `  Given: ${favorStats.total_given} (€${favorStats.value_given.toFixed(0)} value)\n`;
    prompt += `  Received: ${favorStats.total_received} (€${favorStats.value_received.toFixed(0)} value)\n`;
    if (favorStats.total_received > 0) {
      const ratio = favorStats.total_given / favorStats.total_received;
      const balance = ratio > 1.2 ? 'net giver' : ratio < 0.8 ? 'net receiver' : 'balanced';
      prompt += `  Balance: ${balance} (ratio: ${ratio.toFixed(2)})\n`;
    }
    prompt += `\n`;

    // ===== SECTION 5: ASSETS & RESOURCES =====
    prompt += `## 5. ASSETS & RESOURCES\n`;

    // Their own assets
    if (assets.length > 0) {
      const totalValue = assets.reduce((sum, a) => sum + parseFloat(a.estimated_value || 0), 0);
      prompt += `Personal Assets: ${assets.length} items (€${totalValue.toFixed(0)} total value)\n`;
      assets.slice(0, 3).forEach(asset => {
        prompt += `  - ${asset.name} (${asset.asset_type})`;
        if (asset.availability) prompt += ` - ${asset.availability}`;
        prompt += `\n`;
      });
    } else {
      prompt += `No personal assets recorded.\n`;
    }

    // N1 connection assets
    const n1Assets = firstDegreeConnections
      .filter(conn => conn.assets && conn.assets.length > 0)
      .map(conn => ({
        name: conn.person.name,
        assets: conn.assets
      }));

    if (n1Assets.length > 0) {
      prompt += `\nNetwork Resources (via direct connections):\n`;
      n1Assets.slice(0, 3).forEach(({name, assets: assetList}) => {
        prompt += `  - ${name} offers: ${assetList.map(a => a.name).join(', ')}\n`;
      });
    }
    prompt += `\n`;

    // ===== SECTION 6: KEY INSIGHTS & CROSS-REFERENTIAL ANALYSIS =====
    prompt += `## 6. KEY INSIGHTS & CROSS-REFERENTIAL ANALYSIS\n`;
    prompt += `NOTE: Assets (property/resources) are DISTINCT from people. Do not confuse the two.\n\n`;

    // Family Dynamics Insights
    if (familyDynamics.patterns && familyDynamics.patterns.length > 0) {
      prompt += `Family Dynamics Patterns:\n`;
      familyDynamics.patterns.forEach(pattern => {
        prompt += `  - ${pattern.description}\n`;
      });
      prompt += `\n`;
    }

    // Timeline Correlations
    if (timelineCorrelations.overlaps && timelineCorrelations.overlaps.length > 0) {
      prompt += `Timeline Correlations (professional/location overlaps):\n`;
      timelineCorrelations.overlaps.slice(0, 5).forEach(overlap => {
        prompt += `  - ${overlap.description}\n`;
      });
      prompt += `\n`;
    }

    if (timelineCorrelations.correlations && timelineCorrelations.correlations.length > 0) {
      prompt += `Life Event & Career Correlations:\n`;
      timelineCorrelations.correlations.forEach(corr => {
        prompt += `  - ${corr.description}\n`;
      });
      prompt += `\n`;
    }

    // Asset Disparities & Wealth Patterns
    if (assetDisparities.insights && assetDisparities.insights.length > 0) {
      prompt += `Wealth & Resource Patterns:\n`;
      assetDisparities.insights.forEach(insight => {
        prompt += `  - ${insight.description}\n`;
      });
      prompt += `\n`;
    }

    // Professional Synergies
    if (professionalSynergies.hierarchies && professionalSynergies.hierarchies.length > 0) {
      prompt += `Professional Hierarchy & Mentorship Opportunities:\n`;
      professionalSynergies.hierarchies.forEach(hier => {
        prompt += `  - ${hier.description}\n`;
      });
      prompt += `\n`;
    }

    if (professionalSynergies.opportunities && professionalSynergies.opportunities.length > 0) {
      prompt += `Professional Opportunities:\n`;
      professionalSynergies.opportunities.forEach(opp => {
        prompt += `  - ${opp.description}\n`;
      });
      prompt += `\n`;
    }

    if (professionalSynergies.synergies && professionalSynergies.synergies.length > 0) {
      prompt += `Professional Synergies:\n`;
      professionalSynergies.synergies.forEach(syn => {
        prompt += `  - ${syn.description}\n`;
      });
      prompt += `\n`;
    }

    // Cross-Referential Insights (the synthesized inferences)
    if (crossReferentialInsights.insights && crossReferentialInsights.insights.length > 0) {
      prompt += `Deep Cross-Referential Inferences:\n`;
      crossReferentialInsights.insights.forEach(insight => {
        prompt += `  - ${insight}\n`;
      });
      prompt += `\n`;
    }

    // ===== LLM INSTRUCTIONS =====
    prompt += `\n---\n\n`;
    prompt += `Based on the DATA ABOVE, generate a comprehensive summary (800-1000 words) with these sections:\n\n`;
    prompt += `1. **Core Profile** (250 words max): Who they are, current role, key biographical/professional events, most interacted people, owned assets\n`;
    prompt += `2. **Overview of Network** (150 words max): N1/N2 counts, most common connection type, high-potential connections by net worth or connection count\n`;
    prompt += `3. **Professional Context** (~120 words): Career timeline (2-3 key positions), professional overlap with network\n`;
    prompt += `4. **Interaction Patterns** (~170 words): Event participation, favor reciprocity, engagement frequency\n`;
    prompt += `5. **Assets & Resources** (~100 words): Personal assets and network resource availability\n`;
    prompt += `6. **Key Insights** (~300 words): DEEP CROSS-REFERENTIAL ANALYSIS with inferential reasoning:\n`;
    prompt += `   - Family dynamics patterns (divorces, marriages, children, stability comparisons between family members)\n`;
    prompt += `   - Timeline correlations (overlapping work periods, relocations coinciding with life events)\n`;
    prompt += `   - Wealth disparities and resource access opportunities within network\n`;
    prompt += `   - Professional synergies, hierarchical relationships, and mentorship potential\n`;
    prompt += `   - NON-OBVIOUS inferences from combining multiple data sources (e.g., "X's divorce in 2012 may correlate with Y's career move in 2013")\n\n`;
    prompt += `CRITICAL GUIDELINES:\n`;
    prompt += `- If insufficient data exists for a section, state briefly and move on (DO NOT add filler text to reach word count)\n`;
    prompt += `- Use specific names, dates, numbers, and facts from the data provided\n`;
    prompt += `- In Key Insights section, make INFERENTIAL connections between different data sources\n`;
    prompt += `- Example inferential analysis: "Parent's divorce in 2012 combined with recent breakup suggests pattern of relationship instability, contrasting with sibling's stable marriage and children"\n`;
    prompt += `- Clearly distinguish between PEOPLE and ASSETS/PROPERTIES - NEVER confuse assets as potential contacts\n`;
    prompt += `- In bridging analysis, the names listed are PEOPLE they connect you to, NOT assets they own\n`;
    prompt += `- Assets like "Casa Lourinha" or "Alges" are PROPERTY/RESOURCES, not people\n`;
    prompt += `- Write in third person, analytical, evidence-based tone\n`;
    prompt += `- Total length: 800-1000 words\n`;

    return prompt;
  }

  /**
   * Get summary generation status for all people
   */
  static async getSummaryStatus(userId) {
    const result = await pool.query(
      `SELECT
         COUNT(*) as total_people,
         COUNT(summary) as summaries_generated,
         COUNT(*) FILTER (WHERE summary_generated_at IS NOT NULL) as summaries_with_timestamp,
         MAX(summary_generated_at) as last_generated
       FROM people
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0];
  }

  /**
   * Get list of people who need summaries (ordered by ID for sequential processing)
   */
  static async getPeopleNeedingSummaries(userId) {
    const result = await pool.query(
      `SELECT id, name
       FROM people
       WHERE user_id = $1
       ORDER BY id`,
      [userId]
    );

    return result.rows;
  }

  // ============================================================================
  // NEW SUMMARY A AND SUMMARY B METHODS
  // ============================================================================

  /**
   * Generate Summary A: Plain-text fact listing of all person data
   * Uses LLM to format data with relationship context
   * Includes ALL events/favors for main person, 10 most recent for N1 connections
   */
  static async generateSummaryA(userId, personId) {
    try {
      // Gather all person data for Summary A
      const personData = await this.gatherPersonDataForSummaryA(userId, personId);

      if (!personData) {
        throw new Error('Person not found');
      }

      // Generate Summary A using LLM
      const summaryA = await this.generateSummaryAWithLLM(userId, personData);

      // Save Summary A to database
      await pool.query(
        `UPDATE people
         SET summary_a = $1, summary_a_generated_at = NOW()
         WHERE id = $2 AND user_id = $3`,
        [summaryA, personId, userId]
      );

      return {
        success: true,
        person_id: personId,
        person_name: personData.basic.name,
        summary_a: summaryA,
        generated_at: new Date()
      };
    } catch (error) {
      console.error(`Error generating Summary A for person ${personId}:`, error);
      return {
        success: false,
        person_id: personId,
        error: error.message
      };
    }
  }

  /**
   * Generate Summary B: AI analysis and conclusions based on Summary A
   * Reads Summary A from database and uses LLM to analyze
   */
  static async generateSummaryB(userId, personId) {
    try {
      // Get person's Summary A from database
      const personResult = await pool.query(
        `SELECT id, name, summary_a
         FROM people
         WHERE id = $1 AND user_id = $2`,
        [personId, userId]
      );

      if (personResult.rows.length === 0) {
        throw new Error('Person not found');
      }

      const person = personResult.rows[0];

      if (!person.summary_a) {
        throw new Error('Summary A must be generated before Summary B');
      }

      // Generate Summary B using LLM
      const summaryB = await this.generateSummaryBWithLLM(userId, {
        name: person.name,
        summary_a: person.summary_a
      });

      // Save Summary B to database
      await pool.query(
        `UPDATE people
         SET summary_b = $1, summary_b_generated_at = NOW()
         WHERE id = $2 AND user_id = $3`,
        [summaryB, personId, userId]
      );

      return {
        success: true,
        person_id: personId,
        person_name: person.name,
        summary_b: summaryB,
        generated_at: new Date()
      };
    } catch (error) {
      console.error(`Error generating Summary B for person ${personId}:`, error);
      return {
        success: false,
        person_id: personId,
        error: error.message
      };
    }
  }

  /**
   * Gather all data for Summary A generation
   * Includes ALL events/favors for main person
   * Includes 10 most recent events/favors for N1 connections
   * Includes relationship.description for context
   */
  static async gatherPersonDataForSummaryA(userId, personId) {
    // Get basic person info
    const personResult = await pool.query(
      `SELECT id, name, email, phone, birthday, address, gender, linkedin_url, notes, importance
       FROM people
       WHERE id = $1 AND user_id = $2`,
      [personId, userId]
    );

    if (personResult.rows.length === 0) {
      return null;
    }

    const person = personResult.rows[0];

    // Get ALL professional history
    const professionalResult = await pool.query(
      `SELECT company, position, start_date, end_date, notes
       FROM professional_history
       WHERE person_id = $1
       ORDER BY
         CASE WHEN end_date IS NULL THEN 0 ELSE 1 END,
         COALESCE(end_date, NOW()) DESC,
         start_date DESC`,
      [personId]
    );

    // Get ALL biography notes
    const biographyResult = await pool.query(
      `SELECT title, note, note_date
       FROM biographies
       WHERE person_id = $1 AND user_id = $2
       ORDER BY note_date DESC NULLS LAST, created_at DESC`,
      [personId, userId]
    );

    // Get relationships WITH description field for context
    const relationshipsResult = await pool.query(
      `SELECT
         r.relationship_type AS type,
         r.strength,
         r.context AS relationship_notes,
         r.context AS relationship_description,
         CASE
           WHEN r.person_a_id = $1 THEN p2.name
           ELSE p1.name
         END as other_person_name,
         CASE
           WHEN r.person_a_id = $1 THEN p2.id
           ELSE p1.id
         END as other_person_id
       FROM relationships r
       JOIN people p1 ON p1.id = r.person_a_id
       JOIN people p2 ON p2.id = r.person_b_id
       WHERE (r.person_a_id = $1 OR r.person_b_id = $1)
       AND p1.user_id = $2 AND p2.user_id = $2
       ORDER BY r.strength DESC`,
      [personId, userId]
    );

    // Get ALL assets
    const assetsResult = await pool.query(
      `SELECT asset_type, name, description, availability, estimated_value, address
       FROM assets
       WHERE owner_id = $1 AND user_id = $2
       ORDER BY estimated_value DESC NULLS LAST`,
      [personId, userId]
    );

    // Get ALL favors (no limit for main person)
    const favorsResult = await pool.query(
      `SELECT
         f.favor_type,
         f.description,
         f.date,
         f.status,
         f.estimated_value,
         f.time_commitment,
         CASE
           WHEN f.giver_id = $1 THEN 'given'
           ELSE 'received'
         END as direction,
         CASE
           WHEN f.giver_id = $1 THEN receiver.name
           ELSE giver.name
         END as other_person
       FROM favors f
       LEFT JOIN people giver ON f.giver_id = giver.id
       LEFT JOIN people receiver ON f.receiver_id = receiver.id
       WHERE (f.giver_id = $1 OR f.receiver_id = $1)
       AND f.user_id = $2
       ORDER BY f.date DESC`,
      [personId, userId]
    );

    // Get ALL events (no limit for main person)
    const eventsResult = await pool.query(
      `SELECT DISTINCT
         e.event_type,
         e.title,
         e.date,
         e.location,
         e.notes,
         ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.id != $1) as co_attendees
       FROM events e
       JOIN event_participants ep ON e.id = ep.event_id
       LEFT JOIN event_participants ep2 ON e.id = ep2.event_id AND ep2.person_id != $1
       LEFT JOIN people p ON ep2.person_id = p.id
       WHERE ep.person_id = $1 AND e.user_id = $2
       GROUP BY e.id, e.event_type, e.title, e.date, e.location, e.notes
       ORDER BY e.date DESC`,
      [personId, userId]
    );

    // Gather N1 connection data (with limits for connections)
    const n1Connections = await this.gatherN1ConnectionDataForSummaryA(
      userId,
      personId,
      relationshipsResult.rows
    );

    return {
      basic: person,
      professional: professionalResult.rows,
      biography: biographyResult.rows,
      relationships: relationshipsResult.rows,
      assets: assetsResult.rows,
      favors: favorsResult.rows,
      events: eventsResult.rows,
      n1Connections
    };
  }

  /**
   * Gather data for N1 connections (first-degree connections)
   * Limited to 10 most recent events and favors per connection
   */
  static async gatherN1ConnectionDataForSummaryA(userId, personId, relationships) {
    const connections = [];

    for (const rel of relationships) {
      const connectedPersonId = rel.other_person_id;

      try {
        // Get basic info
        const basicResult = await pool.query(
          `SELECT id, name, email, phone, birthday, address, gender, importance
           FROM people
           WHERE id = $1 AND user_id = $2`,
          [connectedPersonId, userId]
        );

        if (basicResult.rows.length === 0) continue;

        const connection = {
          person: basicResult.rows[0],
          relationship: {
            type: rel.type,
            strength: rel.strength,
            notes: rel.relationship_notes,
            description: rel.relationship_description  // NEW: Include description for context
          }
        };

        // Get professional history
        const professionalResult = await pool.query(
          `SELECT company, position, start_date, end_date, notes
           FROM professional_history
           WHERE person_id = $1
           ORDER BY
             CASE WHEN end_date IS NULL THEN 0 ELSE 1 END,
             COALESCE(end_date, NOW()) DESC,
             start_date DESC`,
          [connectedPersonId]
        );
        connection.professional = professionalResult.rows;

        // Get ALL biographical entries
        const biographyResult = await pool.query(
          `SELECT title, note, note_date
           FROM biographies
           WHERE person_id = $1 AND user_id = $2
           ORDER BY note_date DESC NULLS LAST, created_at DESC`,
          [connectedPersonId, userId]
        );
        connection.biographies = biographyResult.rows;

        // Get ALL assets
        const assetsResult = await pool.query(
          `SELECT asset_type, name, description, availability, estimated_value, address
           FROM assets
           WHERE owner_id = $1 AND user_id = $2
           ORDER BY estimated_value DESC NULLS LAST`,
          [connectedPersonId, userId]
        );
        connection.assets = assetsResult.rows;

        // Get 10 most recent favors involving this N1 connection
        const favorsResult = await pool.query(
          `SELECT
             f.favor_type,
             f.description,
             f.date,
             f.status,
             f.estimated_value,
             f.time_commitment,
             CASE
               WHEN f.giver_id = $1 THEN 'given'
               ELSE 'received'
             END as direction,
             CASE
               WHEN f.giver_id = $1 THEN receiver.name
               ELSE giver.name
             END as other_person
           FROM favors f
           LEFT JOIN people giver ON f.giver_id = giver.id
           LEFT JOIN people receiver ON f.receiver_id = receiver.id
           WHERE (f.giver_id = $1 OR f.receiver_id = $1)
           AND f.user_id = $2
           ORDER BY f.date DESC
           LIMIT 10`,
          [connectedPersonId, userId]
        );
        connection.favors = favorsResult.rows;

        // Get 10 most recent events involving this N1 connection
        const eventsResult = await pool.query(
          `SELECT DISTINCT
             e.event_type,
             e.title,
             e.date,
             e.location,
             e.notes,
             ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.id != $1) as co_attendees
           FROM events e
           JOIN event_participants ep ON e.id = ep.event_id
           LEFT JOIN event_participants ep2 ON e.id = ep2.event_id AND ep2.person_id != $1
           LEFT JOIN people p ON ep2.person_id = p.id
           WHERE ep.person_id = $1 AND e.user_id = $2
           GROUP BY e.id, e.event_type, e.title, e.date, e.location, e.notes
           ORDER BY e.date DESC
           LIMIT 10`,
          [connectedPersonId, userId]
        );
        connection.events = eventsResult.rows;

        // Get their N1 relationships (other people they're directly connected to)
        const theirRelationshipsResult = await pool.query(
          `SELECT
             r.relationship_type AS type,
             r.strength,
             r.context AS relationship_description,
             CASE
               WHEN r.person_a_id = $1 THEN p2.name
               ELSE p1.name
             END as other_person_name
           FROM relationships r
           JOIN people p1 ON p1.id = r.person_a_id
           JOIN people p2 ON p2.id = r.person_b_id
           WHERE (r.person_a_id = $1 OR r.person_b_id = $1)
           AND p1.user_id = $2 AND p2.user_id = $2
           ORDER BY r.strength DESC`,
          [connectedPersonId, userId]
        );
        connection.their_relationships = theirRelationshipsResult.rows;

        connections.push(connection);
      } catch (error) {
        console.error(`Error gathering Summary A data for connection ${connectedPersonId}:`, error);
      }
    }

    return connections;
  }

  /**
   * Check if a person has any recorded romantic relationship
   * Returns true if any romantic indicators found in relationships or biography
   */
  static hasRomanticRelationship(relationshipsData, biographyData) {
    const romanticKeywords = [
      'marriage', 'married', 'spouse', 'husband', 'wife',
      'boyfriend', 'girlfriend', 'partner', 'engaged', 'fiancé', 'fiancée',
      'relationship', 'romantic', 'dating', 'couple', 'married to',
      'ex-husband', 'ex-wife', 'divorced', 'widowed', 'widow', 'widower',
      'divorcee', 'separation', 'separated', 'ex-boyfriend', 'ex-girlfriend',
      'ex-partner', 'civil union', 'domestic partner', 'life partner'
    ];

    // Check relationships for romantic types
    if (relationshipsData && relationshipsData.length > 0) {
      const hasRomanticRel = relationshipsData.some(rel => {
        const type = rel.type?.toLowerCase() || '';
        const notes = rel.relationship_notes?.toLowerCase() || '';
        return romanticKeywords.some(keyword =>
          type.includes(keyword) || notes.includes(keyword)
        );
      });
      if (hasRomanticRel) return true;
    }

    // Check biography for romantic references
    if (biographyData && biographyData.length > 0) {
      const hasBioReference = biographyData.some(bio => {
        const title = bio.title?.toLowerCase() || '';
        const note = bio.note?.toLowerCase() || '';
        return romanticKeywords.some(keyword =>
          title.includes(keyword) || note.includes(keyword)
        );
      });
      if (hasBioReference) return true;
    }

    return false;
  }

  /**
   * Generate Summary A using LLM
   * Format: Plain-text fact listing with relationship context
   */
  static async generateSummaryAWithLLM(userId, personData) {
    // Get user LLM settings
    const userResult = await pool.query(
      `SELECT ai_api_url, ai_model, ai_timeout
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const userSettings = userResult.rows[0];

    // Create LLM provider instance
    const llmProvider = new LLMProviderService(
      userSettings.ai_api_url,
      userSettings.ai_model,
      'dummy-key',
      userSettings.ai_timeout || 200
    );

    const prompt = this.buildSummaryAPrompt(personData);

    // Call LLM to generate Summary A
    const response = await llmProvider.createChatCompletion([
      {
        role: 'system',
        content: `You are a data formatter. Your task is to convert structured data into plain-text fact listings.

CRITICAL RULES:
1. Output ONLY simple factual statements, one per line
2. Use relationship context from the description field (e.g., "his sister Catarina" not just "Catarina")
3. Make NO assumptions, NO analysis, NO conclusions
4. Include ALL data points exactly as provided
5. Format dates as DD/MM/YYYY
6. For each fact, use the pattern: [Person], [relationship context], [action/fact], [date if applicable]

Example outputs:
- "Bernardo started working at MetLife as an insurance consultant on 01/04/2024"
- "Catarina, his sister, had twins on 20/10/2023"
- "Miguel owns a vacation house in Algarve valued at €250,000"

This is a DATABASE DUMP in plain text format - no analysis whatsoever.`
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      maxTokens: 4000,
      temperature: 0.3  // Lower temperature for factual output
    });

    let summaryA = response.choices[0].message.content;

    // Check if person should be marked as "assumed single"
    const hasRomantic = this.hasRomanticRelationship(
      personData.relationships,
      personData.biography
    );

    if (!hasRomantic && personData.basic && personData.basic.name) {
      // Add "assumed to be single" statement at the end
      summaryA += `\n\nRelationship Status: ${personData.basic.name} is assumed to be single, as no marriage, spouse, romantic partnership, or related life events are recorded.`;
    }

    return summaryA;
  }

  /**
   * Build prompt for Summary A generation
   * Presents all data in structured format for LLM to convert to plain text
   */
  static buildSummaryAPrompt(data) {
    const { basic, professional, biography, relationships, assets, favors, events, n1Connections } = data;

    let prompt = `Convert the following structured data into plain-text fact listings for ${basic.name}:\n\n`;

    // SECTION 1: Main Person's Data
    prompt += `=== MAIN PERSON: ${basic.name} ===\n\n`;

    // Basic info
    if (basic.birthday) {
      const birthDate = new Date(basic.birthday).toLocaleDateString('en-GB');
      prompt += `- Birthday: ${birthDate}\n`;
    }
    if (basic.email) prompt += `- Email: ${basic.email}\n`;
    if (basic.phone) prompt += `- Phone: ${basic.phone}\n`;
    if (basic.address) prompt += `- Address: ${basic.address}\n`;
    if (basic.gender) prompt += `- Gender: ${basic.gender}\n`;

    // Professional history
    if (professional.length > 0) {
      prompt += `\n--- Professional History ---\n`;
      professional.forEach(job => {
        const startDate = job.start_date ? new Date(job.start_date).toLocaleDateString('en-GB') : 'unknown';
        const endDate = job.end_date ? new Date(job.end_date).toLocaleDateString('en-GB') : 'present';
        prompt += `- ${job.position || 'Position'} at ${job.company}: ${startDate} to ${endDate}\n`;
        if (job.notes) prompt += `  Notes: ${job.notes}\n`;
      });
    }

    // Biographies
    if (biography.length > 0) {
      prompt += `\n--- Biography Notes ---\n`;
      biography.forEach(bio => {
        const bioDate = bio.note_date ? new Date(bio.note_date).toLocaleDateString('en-GB') : 'no date';
        prompt += `- ${bio.title || 'Note'} (${bioDate}): ${bio.note}\n`;
      });
    }

    // Assets
    if (assets.length > 0) {
      prompt += `\n--- Assets Owned ---\n`;
      assets.forEach(asset => {
        prompt += `- ${asset.name} (${asset.asset_type})`;
        if (asset.estimated_value) prompt += `, valued at €${asset.estimated_value.toLocaleString()}`;
        if (asset.address) prompt += `, located at ${asset.address}`;
        prompt += `\n`;
        if (asset.description) prompt += `  Description: ${asset.description}\n`;
      });
    }

    // Favors (ALL of them)
    if (favors.length > 0) {
      prompt += `\n--- Favors ---\n`;
      favors.forEach(favor => {
        const favorDate = favor.date ? new Date(favor.date).toLocaleDateString('en-GB') : 'no date';
        const direction = favor.direction === 'given' ? 'gave to' : 'received from';
        prompt += `- ${favor.direction === 'given' ? 'Gave' : 'Received'} favor ${direction} ${favor.other_person} on ${favorDate}`;
        if (favor.favor_type) prompt += ` (${favor.favor_type})`;
        prompt += `\n`;
        if (favor.description) prompt += `  Description: ${favor.description}\n`;
        if (favor.estimated_value) prompt += `  Value: €${favor.estimated_value.toLocaleString()}\n`;
        if (favor.time_commitment) prompt += `  Time commitment: ${favor.time_commitment}\n`;
      });
    }

    // Events (ALL of them)
    if (events.length > 0) {
      prompt += `\n--- Events Attended ---\n`;
      events.forEach(event => {
        const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-GB') : 'no date';
        prompt += `- ${event.title || 'Event'} (${event.event_type}) on ${eventDate}`;
        if (event.location) prompt += ` at ${event.location}`;
        if (event.co_attendees && event.co_attendees.length > 0) {
          prompt += ` with ${event.co_attendees.join(', ')}`;
        }
        prompt += `\n`;
        if (event.notes) prompt += `  Notes: ${event.notes}\n`;
      });
    }

    // SECTION 2: N1 Connections Data
    if (n1Connections.length > 0) {
      prompt += `\n\n=== FIRST-DEGREE CONNECTIONS (N1) ===\n\n`;

      n1Connections.forEach(conn => {
        const relationshipContext = conn.relationship.description || conn.relationship.type;
        prompt += `--- ${conn.person.name} (${relationshipContext}) ---\n`;

        // Their basic info
        if (conn.person.birthday) {
          const birthDate = new Date(conn.person.birthday).toLocaleDateString('en-GB');
          prompt += `- Birthday: ${birthDate}\n`;
        }

        // Their professional history
        if (conn.professional.length > 0) {
          conn.professional.forEach(job => {
            const startDate = job.start_date ? new Date(job.start_date).toLocaleDateString('en-GB') : 'unknown';
            const endDate = job.end_date ? new Date(job.end_date).toLocaleDateString('en-GB') : 'present';
            prompt += `- Works/worked as ${job.position || 'position'} at ${job.company}: ${startDate} to ${endDate}\n`;
          });
        }

        // Their biographies
        if (conn.biographies.length > 0) {
          conn.biographies.forEach(bio => {
            const bioDate = bio.note_date ? new Date(bio.note_date).toLocaleDateString('en-GB') : 'no date';
            prompt += `- ${bio.title || 'Note'} (${bioDate}): ${bio.note}\n`;
          });
        }

        // Their assets
        if (conn.assets.length > 0) {
          conn.assets.forEach(asset => {
            prompt += `- Owns ${asset.name} (${asset.asset_type})`;
            if (asset.estimated_value) prompt += `, valued at €${asset.estimated_value.toLocaleString()}`;
            prompt += `\n`;
          });
        }

        // Their 10 most recent favors
        if (conn.favors.length > 0) {
          prompt += `  Recent favors:\n`;
          conn.favors.forEach(favor => {
            const favorDate = favor.date ? new Date(favor.date).toLocaleDateString('en-GB') : 'no date';
            prompt += `  - ${favor.direction === 'given' ? 'Gave' : 'Received'} favor on ${favorDate}: ${favor.description || 'no description'}\n`;
          });
        }

        // Their 10 most recent events
        if (conn.events.length > 0) {
          prompt += `  Recent events:\n`;
          conn.events.forEach(event => {
            const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-GB') : 'no date';
            prompt += `  - ${event.title || 'Event'} on ${eventDate}`;
            if (event.location) prompt += ` at ${event.location}`;
            prompt += `\n`;
          });
        }

        // Their relationships with others
        if (conn.their_relationships.length > 0) {
          prompt += `  Relationships:\n`;
          conn.their_relationships.forEach(rel => {
            const relContext = rel.relationship_description || rel.type;
            prompt += `  - Connected to ${rel.other_person_name} (${relContext})\n`;
          });
        }

        prompt += `\n`;
      });
    }

    prompt += `\nRemember: Output plain-text facts only. Use relationship context. Make NO assumptions.`;

    return prompt;
  }

  /**
   * Generate Summary B using LLM
   * Analyzes Summary A and draws conclusions
   */
  static async generateSummaryBWithLLM(userId, data) {
    // Get user LLM settings
    const userResult = await pool.query(
      `SELECT ai_api_url, ai_model, ai_timeout
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const userSettings = userResult.rows[0];

    // Create LLM provider instance
    const llmProvider = new LLMProviderService(
      userSettings.ai_api_url,
      userSettings.ai_model,
      'dummy-key',
      userSettings.ai_timeout || 200
    );

    // Call LLM to generate Summary B
    const response = await llmProvider.createChatCompletion([
      {
        role: 'system',
        content: `You are an expert analyst specializing in creating comprehensive person summaries.

Your task is to READ Summary A (a plain-text fact listing) and create an analytical overview that:
1. Draws meaningful conclusions from the data
2. Makes reasonable assumptions based on patterns
3. Provides strategic insights about the person
4. Identifies opportunities and important context
5. Analyzes their network position and influence

Write in a professional, analytical tone (500-800 words). Structure your analysis into clear sections.`
      },
      {
        role: 'user',
        content: `Please analyze the following data about ${data.name} and create a comprehensive summary:\n\n${data.summary_a}`
      }
    ], {
      maxTokens: 2000,
      temperature: 0.7  // Higher temperature for analytical output
    });

    return response.choices[0].message.content;
  }
}

module.exports = SummaryGenerationService;
