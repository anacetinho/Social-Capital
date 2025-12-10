const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

/**
 * Integration Test: Complete User Story
 * Comprehensive test covering: Registration -> Adding People -> Creating Relationships
 * -> Logging Events -> Tracking Favors -> Viewing Dashboard -> Finding Connections
 */
describe('Integration: Complete User Story', () => {
  let authToken;
  let userId;
  const people = [];
  const relationships = [];
  const events = [];
  const favors = [];

  afterAll(async () => {
    await pool.end();
  });

  it('should complete end-to-end social capital tracking workflow', async () => {
    // === STEP 1: User Registration ===
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `complete-test-${Date.now()}@example.com`,
        password: 'SecurePass123'
      });

    expect(registerResponse.status).toBe(201);
    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;

    // === STEP 2: Add People to Network ===
    const peopleData = [
      { name: 'Alice', surname: 'Smith', email: 'alice@example.com' },
      { name: 'Bob', surname: 'Johnson', email: 'bob@example.com' },
      { name: 'Charlie', surname: 'Brown', email: 'charlie@example.com' },
      { name: 'Diana', surname: 'Prince', email: 'diana@example.com' }
    ];

    for (const personData of peopleData) {
      const response = await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send(personData);

      expect(response.status).toBe(201);
      people.push(response.body);
    }

    expect(people.length).toBe(4);

    // === STEP 3: Create Relationships ===
    const relationshipsData = [
      { person_a_id: people[0].id, person_b_id: people[1].id, relationship_type: 'friend', strength: 5, context: 'College friends' },
      { person_a_id: people[1].id, person_b_id: people[2].id, relationship_type: 'colleague', strength: 4, context: 'Work together' },
      { person_a_id: people[2].id, person_b_id: people[3].id, relationship_type: 'friend', strength: 3, context: 'Met at conference' },
      { person_a_id: people[0].id, person_b_id: people[3].id, relationship_type: 'acquaintance', strength: 2 }
    ];

    for (const relData of relationshipsData) {
      const response = await request(app)
        .post('/api/v1/relationships')
        .set('Authorization', `Bearer ${authToken}`)
        .send(relData);

      expect(response.status).toBe(201);
      relationships.push(response.body);
    }

    expect(relationships.length).toBe(4);

    // === STEP 4: Log Events ===
    const eventsData = [
      {
        title: 'Coffee with Alice and Bob',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        event_type: 'Coffee',
        participant_ids: [people[0].id, people[1].id]
      },
      {
        title: 'Dinner Party',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        event_type: 'Dinner',
        participant_ids: [people[0].id, people[1].id, people[2].id, people[3].id]
      }
    ];

    for (const eventData of eventsData) {
      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData);

      expect(response.status).toBe(201);
      events.push(response.body);
    }

    // === STEP 5: Track Favors ===
    const favorsData = [
      {
        giver_id: people[0].id,
        receiver_id: people[1].id,
        description: 'Helped with resume review',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed'
      },
      {
        giver_id: people[1].id,
        receiver_id: people[0].id,
        description: 'Made introduction to hiring manager',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed'
      }
    ];

    for (const favorData of favorsData) {
      const response = await request(app)
        .post('/api/v1/favors')
        .set('Authorization', `Bearer ${authToken}`)
        .send(favorData);

      expect(response.status).toBe(201);
      favors.push(response.body);
    }

    // === STEP 6: Check Reciprocity Balance ===
    const reciprocityResponse = await request(app)
      .get(`/api/v1/favors/reciprocity/${people[0].id}/${people[1].id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(reciprocityResponse.status).toBe(200);
    expect(reciprocityResponse.body).toHaveProperty('person1_given');
    expect(reciprocityResponse.body).toHaveProperty('person2_given');
    expect(reciprocityResponse.body).toHaveProperty('balance');

    // === STEP 7: View Dashboard Stats ===
    const dashboardResponse = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${authToken}`);

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.total_people).toBe(4);
    expect(dashboardResponse.body.total_relationships).toBe(4);
    expect(dashboardResponse.body.total_events).toBe(2);
    expect(dashboardResponse.body.total_favors).toBe(2);
    expect(dashboardResponse.body).toHaveProperty('relationship_strength_distribution');

    // === STEP 8: Find Connection Path ===
    const pathResponse = await request(app)
      .post('/api/v1/relationships/path')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        from_person_id: people[0].id,
        to_person_id: people[2].id
      });

    expect(pathResponse.status).toBe(200);
    expect(pathResponse.body).toHaveProperty('path');
    expect(pathResponse.body).toHaveProperty('degrees');
    expect(Array.isArray(pathResponse.body.path)).toBe(true);
    expect(pathResponse.body.path[0]).toBe(people[0].id);
    expect(pathResponse.body.path[pathResponse.body.path.length - 1]).toBe(people[2].id);

    // === STEP 9: Get Network Graph ===
    const networkResponse = await request(app)
      .get('/api/v1/network/graph')
      .set('Authorization', `Bearer ${authToken}`);

    expect(networkResponse.status).toBe(200);
    expect(networkResponse.body).toHaveProperty('nodes');
    expect(networkResponse.body).toHaveProperty('links');
    expect(networkResponse.body.nodes.length).toBe(4);
    expect(networkResponse.body.links.length).toBe(4);

    // === STEP 10: Search and Filter ===
    const searchResponse = await request(app)
      .get('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ search: 'Alice' });

    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.data.length).toBeGreaterThanOrEqual(1);

    const filterEventsResponse = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ person_id: people[0].id });

    expect(filterEventsResponse.status).toBe(200);
    expect(filterEventsResponse.body.data.length).toBe(2);

    // === STEP 11: Add Professional History ===
    const profHistoryResponse = await request(app)
      .post('/api/v1/professional-history')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        person_id: people[0].id,
        company: 'Tech Corp',
        position: 'Senior Engineer',
        start_date: '2020-01-01',
        end_date: '2023-12-31'
      });

    expect(profHistoryResponse.status).toBe(201);

    // === STEP 12: Add Assets ===
    const assetResponse = await request(app)
      .post('/api/v1/assets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        owner_id: people[1].id,
        asset_type: 'Skill',
        name: 'Python Programming',
        availability: 'Available'
      });

    expect(assetResponse.status).toBe(201);

    // === STEP 13: Network Health Check ===
    const healthResponse = await request(app)
      .get('/api/v1/dashboard/network-health')
      .set('Authorization', `Bearer ${authToken}`);

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body).toHaveProperty('average_relationship_strength');
    expect(healthResponse.body).toHaveProperty('total_connections');
  });
});
