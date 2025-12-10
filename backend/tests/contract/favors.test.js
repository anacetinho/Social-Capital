const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

describe('Favors Contract Tests', () => {
  let authToken;
  let giverId;
  let receiverId;
  let favorId;

  beforeAll(async () => {
    // Create test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'favorstest@example.com',
        password: 'password123'
      });

    authToken = userResponse.body.token;

    // Create people for favor tracking
    const giver = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Giver' });

    const receiver = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Receiver' });

    giverId = giver.body.id;
    receiverId = receiver.body.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/v1/favors', () => {
    it('should create a favor with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/favors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          giver_id: giverId,
          receiver_id: receiverId,
          description: 'Helped with resume review',
          date: '2024-12-10T14:00:00Z',
          status: 'completed'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('giver_id', giverId);
      expect(response.body).toHaveProperty('receiver_id', receiverId);
      expect(response.body).toHaveProperty('description', 'Helped with resume review');
      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('created_at');

      favorId = response.body.id;
    });

    it('should reject favor without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/favors')
        .send({
          giver_id: giverId,
          receiver_id: receiverId,
          description: 'Test favor',
          date: '2024-12-15T10:00:00Z',
          status: 'pending'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject favor without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/favors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          giver_id: giverId
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject favor with invalid status', async () => {
      const response = await request(app)
        .post('/api/v1/favors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          giver_id: giverId,
          receiver_id: receiverId,
          description: 'Test',
          date: '2024-12-15T10:00:00Z',
          status: 'invalid_status'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject self-favor (giver and receiver are same)', async () => {
      const response = await request(app)
        .post('/api/v1/favors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          giver_id: giverId,
          receiver_id: giverId,
          description: 'Self favor',
          date: '2024-12-15T10:00:00Z',
          status: 'completed'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/favors', () => {
    it('should get paginated list of favors', async () => {
      const response = await request(app)
        .get('/api/v1/favors')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('offset', 0);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter favors by status', async () => {
      const response = await request(app)
        .get('/api/v1/favors')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter favors by person_id', async () => {
      const response = await request(app)
        .get('/api/v1/favors')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ person_id: giverId });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/favors');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/favors/:id', () => {
    it('should get favor by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/favors/${favorId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', favorId);
      expect(response.body).toHaveProperty('giver_id');
      expect(response.body).toHaveProperty('receiver_id');
      expect(response.body).toHaveProperty('description');
    });

    it('should return 404 for non-existent favor', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/favors/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/favors/:id', () => {
    it('should update favor status and notes', async () => {
      const response = await request(app)
        .put(`/api/v1/favors/${favorId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'completed',
          notes: 'Turned out great!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', favorId);
      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('notes', 'Turned out great!');
    });

    it('should reject update with invalid status', async () => {
      const response = await request(app)
        .put(`/api/v1/favors/${favorId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'bad_status'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent favor', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/v1/favors/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'completed'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/favors/:id', () => {
    let deleteFavorId;

    beforeAll(async () => {
      // Create favor to delete
      const favor = await request(app)
        .post('/api/v1/favors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          giver_id: giverId,
          receiver_id: receiverId,
          description: 'To be deleted',
          date: '2024-12-20T10:00:00Z',
          status: 'pending'
        });

      deleteFavorId = favor.body.id;
    });

    it('should delete favor by ID', async () => {
      const response = await request(app)
        .delete(`/api/v1/favors/${deleteFavorId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when deleting non-existent favor', async () => {
      const response = await request(app)
        .delete(`/api/v1/favors/${deleteFavorId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/favors/reciprocity/:person1_id/:person2_id', () => {
    beforeAll(async () => {
      // Create reciprocal favors for testing
      await request(app)
        .post('/api/v1/favors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          giver_id: giverId,
          receiver_id: receiverId,
          description: 'Favor 1',
          date: '2024-12-01T10:00:00Z',
          status: 'completed'
        });

      await request(app)
        .post('/api/v1/favors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          giver_id: receiverId,
          receiver_id: giverId,
          description: 'Favor 2',
          date: '2024-12-05T10:00:00Z',
          status: 'completed'
        });
    });

    it('should get reciprocity balance between two people', async () => {
      const response = await request(app)
        .get(`/api/v1/favors/reciprocity/${giverId}/${receiverId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('person1_given');
      expect(response.body).toHaveProperty('person2_given');
      expect(response.body).toHaveProperty('balance');
      expect(typeof response.body.person1_given).toBe('number');
      expect(typeof response.body.person2_given).toBe('number');
      expect(typeof response.body.balance).toBe('number');
    });

    it('should reject reciprocity request without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/favors/reciprocity/${giverId}/${receiverId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
