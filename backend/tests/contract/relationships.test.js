const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

describe('Relationships Contract Tests', () => {
  let authToken;
  let personAId;
  let personBId;
  let relationshipId;

  beforeAll(async () => {
    // Create test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'relationshipstest@example.com',
        password: 'password123'
      });

    authToken = userResponse.body.token;

    // Create two people for relationship tests
    const personA = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Alice' });

    const personB = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Bob' });

    personAId = personA.body.id;
    personBId = personB.body.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/v1/relationships', () => {
    it('should create a relationship with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/relationships')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          person_a_id: personAId,
          person_b_id: personBId,
          relationship_type: 'friend',
          strength: 4,
          context: 'College friends'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('person_a_id', personAId);
      expect(response.body).toHaveProperty('person_b_id', personBId);
      expect(response.body).toHaveProperty('relationship_type', 'friend');
      expect(response.body).toHaveProperty('strength', 4);
      expect(response.body).toHaveProperty('created_at');

      relationshipId = response.body.id;
    });

    it('should reject relationship without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/relationships')
        .send({
          person_a_id: personAId,
          person_b_id: personBId,
          relationship_type: 'friend',
          strength: 3
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject relationship without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/relationships')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          person_a_id: personAId
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject relationship with invalid strength (out of 1-5 range)', async () => {
      const response = await request(app)
        .post('/api/v1/relationships')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          person_a_id: personAId,
          person_b_id: personBId,
          relationship_type: 'friend',
          strength: 10
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject self-relationship (same person)', async () => {
      const response = await request(app)
        .post('/api/v1/relationships')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          person_a_id: personAId,
          person_b_id: personAId,
          relationship_type: 'friend',
          strength: 3
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/relationships', () => {
    it('should get paginated list of relationships', async () => {
      const response = await request(app)
        .get('/api/v1/relationships')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter relationships by person_id', async () => {
      const response = await request(app)
        .get('/api/v1/relationships')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ person_id: personAId });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter relationships by relationship_type', async () => {
      const response = await request(app)
        .get('/api/v1/relationships')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ relationship_type: 'friend' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/relationships');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/relationships/:id', () => {
    it('should get relationship by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/relationships/${relationshipId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', relationshipId);
      expect(response.body).toHaveProperty('person_a_id');
      expect(response.body).toHaveProperty('person_b_id');
    });

    it('should return 404 for non-existent relationship', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/relationships/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/relationships/:id', () => {
    it('should update relationship strength', async () => {
      const response = await request(app)
        .put(`/api/v1/relationships/${relationshipId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          strength: 5,
          context: 'Best friends now'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', relationshipId);
      expect(response.body).toHaveProperty('strength', 5);
      expect(response.body).toHaveProperty('context', 'Best friends now');
    });

    it('should reject update with invalid strength', async () => {
      const response = await request(app)
        .put(`/api/v1/relationships/${relationshipId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          strength: 0
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent relationship', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/v1/relationships/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          strength: 3
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/relationships/:id', () => {
    let deleteRelId;

    beforeAll(async () => {
      // Create relationship to delete
      const personC = await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Charlie' });

      const rel = await request(app)
        .post('/api/v1/relationships')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          person_a_id: personAId,
          person_b_id: personC.body.id,
          relationship_type: 'acquaintance',
          strength: 2
        });

      deleteRelId = rel.body.id;
    });

    it('should delete relationship by ID', async () => {
      const response = await request(app)
        .delete(`/api/v1/relationships/${deleteRelId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when deleting non-existent relationship', async () => {
      const response = await request(app)
        .delete(`/api/v1/relationships/${deleteRelId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/relationships/path', () => {
    it('should find connection path between two people', async () => {
      const response = await request(app)
        .post('/api/v1/relationships/path')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          from_person_id: personAId,
          to_person_id: personBId
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('from');
      expect(response.body).toHaveProperty('to');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('degrees');
      expect(Array.isArray(response.body.path)).toBe(true);
    });

    it('should return no path when people are not connected', async () => {
      // Create isolated person
      const isolated = await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Isolated' });

      const response = await request(app)
        .post('/api/v1/relationships/path')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          from_person_id: personAId,
          to_person_id: isolated.body.id
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject path request without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/relationships/path')
        .send({
          from_person_id: personAId,
          to_person_id: personBId
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
