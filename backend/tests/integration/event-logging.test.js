const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

/**
 * Integration Test: Event Logging
 * User Story: As a user, I want to log events with participants
 * so I can track my social interactions over time
 */
describe('Integration: Event Logging', () => {
  let authToken;
  let personIds = [];

  beforeAll(async () => {
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `events-${Date.now()}@example.com`,
        password: 'password123'
      });

    authToken = userResponse.body.token;

    // Create people
    for (let i = 0; i < 3; i++) {
      const person = await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: `Person${i}` });
      personIds.push(person.body.id);
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should log events with participants and update last contact', async () => {
    // Create event with participants
    const eventResponse = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Coffee Meeting',
        description: 'Catch up',
        location: 'Cafe',
        date: new Date().toISOString(),
        event_type: 'Coffee',
        participant_ids: [personIds[0], personIds[1]]
      });

    expect(eventResponse.status).toBe(201);
    expect(eventResponse.body).toHaveProperty('id');

    const eventId = eventResponse.body.id;

    // Get event with participants
    const getEventResponse = await request(app)
      .get(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(getEventResponse.status).toBe(200);
    expect(getEventResponse.body.participants).toHaveLength(2);

    // Update event
    const updateResponse = await request(app)
      .put(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        location: 'New Cafe',
        participant_ids: [personIds[0], personIds[1], personIds[2]]
      });

    expect(updateResponse.status).toBe(200);

    // Filter events by participant
    const filterResponse = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ person_id: personIds[0] });

    expect(filterResponse.status).toBe(200);
    expect(filterResponse.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
