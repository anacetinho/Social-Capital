const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

/**
 * Integration Test: Multi-User Data Isolation
 * User Story: As a user, I want my data to be completely isolated from other users
 * Security Test: Verifies row-level security policies
 */
describe('Integration: Multi-User Data Isolation', () => {
  let user1Token, user2Token;
  let user1PersonId, user2PersonId;

  beforeAll(async () => {
    // Create User 1
    const user1Response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `user1-${Date.now()}@example.com`,
        password: 'password123'
      });

    user1Token = user1Response.body.token;

    // Create User 2
    const user2Response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `user2-${Date.now()}@example.com`,
        password: 'password123'
      });

    user2Token = user2Response.body.token;

    // User 1 creates a person
    const user1Person = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'User1Person' });

    user1PersonId = user1Person.body.id;

    // User 2 creates a person
    const user2Person = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ name: 'User2Person' });

    user2PersonId = user2Person.body.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should isolate people data between users', async () => {
    // User 1 should only see their own people
    const user1People = await request(app)
      .get('/api/v1/people')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(user1People.status).toBe(200);
    expect(user1People.body.data.every(p => p.name.includes('User1'))).toBe(true);

    // User 2 should only see their own people
    const user2People = await request(app)
      .get('/api/v1/people')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(user2People.status).toBe(200);
    expect(user2People.body.data.every(p => p.name.includes('User2'))).toBe(true);

    // User 1 should NOT be able to access User 2's person
    const crossAccessResponse = await request(app)
      .get(`/api/v1/people/${user2PersonId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(crossAccessResponse.status).toBe(404);

    // User 1 should NOT be able to update User 2's person
    const crossUpdateResponse = await request(app)
      .put(`/api/v1/people/${user2PersonId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Hacked' });

    expect(crossUpdateResponse.status).toBe(404);

    // User 1 should NOT be able to delete User 2's person
    const crossDeleteResponse = await request(app)
      .delete(`/api/v1/people/${user2PersonId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(crossDeleteResponse.status).toBe(404);
  });

  it('should isolate relationships data between users', async () => {
    // User 1 creates relationships
    const user1Person2 = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'User1Person2' });

    const user1Rel = await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        person_a_id: user1PersonId,
        person_b_id: user1Person2.body.id,
        relationship_type: 'friend',
        strength: 5
      });

    // User 2 should not see User 1's relationships
    const user2Rels = await request(app)
      .get('/api/v1/relationships')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(user2Rels.status).toBe(200);
    expect(user2Rels.body.data.every(r => r.id !== user1Rel.body.id)).toBe(true);
  });

  it('should isolate events data between users', async () => {
    // User 1 creates event
    const user1Event = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'User1 Event',
        date: new Date().toISOString(),
        participant_ids: [user1PersonId]
      });

    // User 2 should not see User 1's events
    const user2Events = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(user2Events.status).toBe(200);
    expect(user2Events.body.data.every(e => e.id !== user1Event.body.id)).toBe(true);
  });

  it('should isolate favors data between users', async () => {
    // User 1 creates favor
    const user1Person2 = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'User1Person3' });

    const user1Favor = await request(app)
      .post('/api/v1/favors')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        giver_id: user1PersonId,
        receiver_id: user1Person2.body.id,
        description: 'User1 Favor',
        date: new Date().toISOString(),
        status: 'completed'
      });

    // User 2 should not see User 1's favors
    const user2Favors = await request(app)
      .get('/api/v1/favors')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(user2Favors.status).toBe(200);
    expect(user2Favors.body.data.every(f => f.id !== user1Favor.body.id)).toBe(true);
  });

  it('should isolate dashboard stats between users', async () => {
    const user1Dashboard = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${user1Token}`);

    const user2Dashboard = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(user1Dashboard.status).toBe(200);
    expect(user2Dashboard.status).toBe(200);

    // Stats should be different for each user
    expect(user1Dashboard.body.total_people).not.toBe(user2Dashboard.body.total_people);
  });
});
