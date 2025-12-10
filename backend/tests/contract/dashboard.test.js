const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

describe('Dashboard Contract Tests', () => {
  let authToken;

  beforeAll(async () => {
    // Create test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'dashboardtest@example.com',
        password: 'password123'
      });

    authToken = userResponse.body.token;

    // Create some test data for dashboard stats
    const person1 = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Person 1', date_of_birth: '1990-01-15' });

    const person2 = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Person 2', date_of_birth: '1985-03-20' });

    const person1Id = person1.body.id;
    const person2Id = person2.body.id;

    // Create a relationship
    await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        person_a_id: person1Id,
        person_b_id: person2Id,
        relationship_type: 'friend',
        strength: 4
      });

    // Create an event
    await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Coffee',
        date: '2024-12-15T10:00:00Z',
        event_type: 'Coffee',
        participant_ids: [person1Id, person2Id]
      });

    // Create a favor
    await request(app)
      .post('/api/v1/favors')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        giver_id: person1Id,
        receiver_id: person2Id,
        description: 'Helped with resume',
        date: '2024-12-10T14:00:00Z',
        status: 'completed'
      });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/v1/dashboard/stats', () => {
    it('should get dashboard statistics with valid authentication', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_people');
      expect(response.body).toHaveProperty('total_relationships');
      expect(response.body).toHaveProperty('total_events');
      expect(response.body).toHaveProperty('total_favors');

      expect(typeof response.body.total_people).toBe('number');
      expect(typeof response.body.total_relationships).toBe('number');
      expect(typeof response.body.total_events).toBe('number');
      expect(typeof response.body.total_favors).toBe('number');

      expect(response.body.total_people).toBeGreaterThanOrEqual(2);
      expect(response.body.total_relationships).toBeGreaterThanOrEqual(1);
      expect(response.body.total_events).toBeGreaterThanOrEqual(1);
      expect(response.body.total_favors).toBeGreaterThanOrEqual(1);
    });

    it('should include relationship strength distribution', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('relationship_strength_distribution');
      expect(typeof response.body.relationship_strength_distribution).toBe('object');

      // Check that distribution has keys for strength levels 1-5
      const distribution = response.body.relationship_strength_distribution;
      expect(distribution).toHaveProperty('1');
      expect(distribution).toHaveProperty('2');
      expect(distribution).toHaveProperty('3');
      expect(distribution).toHaveProperty('4');
      expect(distribution).toHaveProperty('5');
    });

    it('should include recent events', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recent_events');
      expect(Array.isArray(response.body.recent_events)).toBe(true);
      expect(response.body.recent_events.length).toBeLessThanOrEqual(10);
    });

    it('should include recent favors', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recent_favors');
      expect(Array.isArray(response.body.recent_favors)).toBe(true);
      expect(response.body.recent_favors.length).toBeLessThanOrEqual(10);
    });

    it('should include upcoming birthdays', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('upcoming_birthdays');
      expect(Array.isArray(response.body.upcoming_birthdays)).toBe(true);
      expect(response.body.upcoming_birthdays.length).toBeLessThanOrEqual(5);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/stats');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Authorization', 'Bearer invalid-token-123');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/dashboard/activity', () => {
    it('should get recent activity timeline', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activities');
      expect(Array.isArray(response.body.activities)).toBe(true);

      if (response.body.activities.length > 0) {
        const activity = response.body.activities[0];
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('timestamp');
        expect(activity).toHaveProperty('description');
      }
    });

    it('should filter activity by date range', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_date: '2024-12-01',
          end_date: '2024-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activities');
      expect(Array.isArray(response.body.activities)).toBe(true);
    });

    it('should reject activity request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/activity');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/dashboard/network-health', () => {
    it('should get network health metrics', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/network-health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('average_relationship_strength');
      expect(response.body).toHaveProperty('total_connections');
      expect(response.body).toHaveProperty('stale_relationships_count');

      expect(typeof response.body.average_relationship_strength).toBe('number');
      expect(typeof response.body.total_connections).toBe('number');
      expect(typeof response.body.stale_relationships_count).toBe('number');
    });

    it('should include network density metrics', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/network-health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('network_density');
      expect(typeof response.body.network_density).toBe('number');
      expect(response.body.network_density).toBeGreaterThanOrEqual(0);
      expect(response.body.network_density).toBeLessThanOrEqual(1);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/network-health');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
