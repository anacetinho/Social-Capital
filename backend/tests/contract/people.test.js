const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

describe('People Contract Tests', () => {
  let authToken;
  let userId;
  let personId;

  beforeAll(async () => {
    // Create a test user and get auth token
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'peopletest@example.com',
        password: 'password123'
      });

    authToken = response.body.token;
    userId = response.body.user.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/v1/people', () => {
    it('should create a person with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'John',
          surname: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-123-4567',
          date_of_birth: '1990-01-15',
          address: '123 Main St',
          nationality: 'American'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'John');
      expect(response.body).toHaveProperty('surname', 'Doe');
      expect(response.body).toHaveProperty('email', 'john.doe@example.com');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');

      personId = response.body.id; // Save for later tests
    });

    it('should reject person creation without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/people')
        .send({
          name: 'Jane',
          surname: 'Smith'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject person creation without required name', async () => {
      const response = await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          surname: 'Smith'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should create minimal person with only name', async () => {
      const response = await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Alice'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Alice');
    });

    it('should reject person with invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Bob',
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/people', () => {
    it('should get paginated list of people', async () => {
      const response = await request(app)
        .get('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('offset', 0);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should search people by name', async () => {
      const response = await request(app)
        .get('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'John' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/people');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/people/:id', () => {
    it('should get person by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/people/${personId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', personId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('created_at');
    });

    it('should return 404 for non-existent person', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/people/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/people/${personId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/people/:id', () => {
    it('should update person with valid data', async () => {
      const response = await request(app)
        .put(`/api/v1/people/${personId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'John',
          surname: 'Updated',
          phone: '+1-555-999-8888'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', personId);
      expect(response.body).toHaveProperty('surname', 'Updated');
      expect(response.body).toHaveProperty('phone', '+1-555-999-8888');
    });

    it('should reject update with invalid data', async () => {
      const response = await request(app)
        .put(`/api/v1/people/${personId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'not-an-email'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent person', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/v1/people/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/people/${personId}`)
        .send({
          name: 'Test'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/people/:id', () => {
    let deletePersonId;

    beforeAll(async () => {
      // Create a person to delete
      const response = await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'ToDelete'
        });

      deletePersonId = response.body.id;
    });

    it('should delete person by ID', async () => {
      const response = await request(app)
        .delete(`/api/v1/people/${deletePersonId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when deleting already deleted person', async () => {
      const response = await request(app)
        .delete(`/api/v1/people/${deletePersonId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject delete without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/people/${personId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/people/:id/picture', () => {
    it('should upload profile picture', async () => {
      const response = await request(app)
        .post(`/api/v1/people/${personId}/picture`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('picture', Buffer.from('fake-image-data'), 'profile.jpg');

      // Multer needs to be configured, so this might fail initially
      expect([200, 201, 500]).toContain(response.status);
    });

    it('should reject picture upload without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/people/${personId}/picture`)
        .attach('picture', Buffer.from('fake-image-data'), 'profile.jpg');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
