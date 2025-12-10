const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

describe('Professional History Contract Tests', () => {
  let authToken;
  let personId;
  let profHistoryId;

  beforeAll(async () => {
    // Create test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'profhistorytest@example.com',
        password: 'password123'
      });

    authToken = userResponse.body.token;

    // Create person for professional history
    const person = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Professional' });

    personId = person.body.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/v1/professional-history', () => {
    it('should create professional history entry with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/professional-history')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          person_id: personId,
          company: 'Tech Corp',
          position: 'Senior Engineer',
          start_date: '2020-01-15',
          end_date: '2023-06-30',
          notes: 'Led backend team'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('person_id', personId);
      expect(response.body).toHaveProperty('company', 'Tech Corp');
      expect(response.body).toHaveProperty('position', 'Senior Engineer');
      expect(response.body).toHaveProperty('start_date');
      expect(response.body).toHaveProperty('end_date');
      expect(response.body).toHaveProperty('created_at');

      profHistoryId = response.body.id;
    });

    it('should create current position without end_date', async () => {
      const response = await request(app)
        .post('/api/v1/professional-history')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          person_id: personId,
          company: 'Current Company',
          position: 'CTO',
          start_date: '2023-07-01'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('company', 'Current Company');
      expect(response.body).toHaveProperty('end_date', null);
    });

    it('should reject professional history without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/professional-history')
        .send({
          person_id: personId,
          company: 'Test Corp',
          position: 'Engineer',
          start_date: '2020-01-01'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject entry without required person_id', async () => {
      const response = await request(app)
        .post('/api/v1/professional-history')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company: 'Test Corp',
          position: 'Engineer',
          start_date: '2020-01-01'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject entry without required company', async () => {
      const response = await request(app)
        .post('/api/v1/professional-history')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          person_id: personId,
          position: 'Engineer',
          start_date: '2020-01-01'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject entry without required start_date', async () => {
      const response = await request(app)
        .post('/api/v1/professional-history')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          person_id: personId,
          company: 'Test Corp',
          position: 'Engineer'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject entry with invalid date format', async () => {
      const response = await request(app)
        .post('/api/v1/professional-history')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          person_id: personId,
          company: 'Test Corp',
          position: 'Engineer',
          start_date: 'not-a-date'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/professional-history', () => {
    it('should get professional history filtered by person_id', async () => {
      const response = await request(app)
        .get('/api/v1/professional-history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ person_id: personId });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get all professional history for user', async () => {
      const response = await request(app)
        .get('/api/v1/professional-history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/professional-history');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/professional-history/:id', () => {
    it('should get professional history entry by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/professional-history/${profHistoryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', profHistoryId);
      expect(response.body).toHaveProperty('company');
      expect(response.body).toHaveProperty('position');
    });

    it('should return 404 for non-existent entry', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/professional-history/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/professional-history/:id', () => {
    it('should update professional history entry', async () => {
      const response = await request(app)
        .put(`/api/v1/professional-history/${profHistoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          position: 'Principal Engineer',
          notes: 'Updated role'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', profHistoryId);
      expect(response.body).toHaveProperty('position', 'Principal Engineer');
      expect(response.body).toHaveProperty('notes', 'Updated role');
    });

    it('should reject update with invalid date', async () => {
      const response = await request(app)
        .put(`/api/v1/professional-history/${profHistoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          start_date: 'invalid-date'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent entry', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/v1/professional-history/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          position: 'Test'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/professional-history/:id', () => {
    let deleteHistoryId;

    beforeAll(async () => {
      // Create entry to delete
      const history = await request(app)
        .post('/api/v1/professional-history')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          person_id: personId,
          company: 'To Delete',
          position: 'Intern',
          start_date: '2015-06-01',
          end_date: '2015-08-31'
        });

      deleteHistoryId = history.body.id;
    });

    it('should delete professional history entry by ID', async () => {
      const response = await request(app)
        .delete(`/api/v1/professional-history/${deleteHistoryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when deleting non-existent entry', async () => {
      const response = await request(app)
        .delete(`/api/v1/professional-history/${deleteHistoryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
