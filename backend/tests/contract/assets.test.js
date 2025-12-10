const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

describe('Assets Contract Tests', () => {
  let authToken;
  let ownerId;
  let assetId;

  beforeAll(async () => {
    // Create test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'assetstest@example.com',
        password: 'password123'
      });

    authToken = userResponse.body.token;

    // Create person as asset owner
    const owner = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Asset Owner' });

    ownerId = owner.body.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/v1/assets', () => {
    it('should create an asset with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          owner_id: ownerId,
          asset_type: 'Skill',
          name: 'Python Programming',
          description: 'Expert in Python and Django',
          availability: 'Available'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('owner_id', ownerId);
      expect(response.body).toHaveProperty('asset_type', 'Skill');
      expect(response.body).toHaveProperty('name', 'Python Programming');
      expect(response.body).toHaveProperty('description', 'Expert in Python and Django');
      expect(response.body).toHaveProperty('availability', 'Available');
      expect(response.body).toHaveProperty('created_at');

      assetId = response.body.id;
    });

    it('should create asset with minimal required fields', async () => {
      const response = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          owner_id: ownerId,
          asset_type: 'Equipment',
          name: 'Camera'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Camera');
    });

    it('should reject asset without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/assets')
        .send({
          owner_id: ownerId,
          asset_type: 'Skill',
          name: 'Test Skill'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject asset without required owner_id', async () => {
      const response = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          asset_type: 'Skill',
          name: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject asset without required asset_type', async () => {
      const response = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          owner_id: ownerId,
          name: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject asset without required name', async () => {
      const response = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          owner_id: ownerId,
          asset_type: 'Skill'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/assets', () => {
    it('should get paginated list of assets', async () => {
      const response = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('offset', 0);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter assets by asset_type', async () => {
      const response = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ asset_type: 'Skill' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter assets by owner_id', async () => {
      const response = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ owner_id: ownerId });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/assets');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/assets/:id', () => {
    it('should get asset by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', assetId);
      expect(response.body).toHaveProperty('owner_id');
      expect(response.body).toHaveProperty('asset_type');
      expect(response.body).toHaveProperty('name');
    });

    it('should return 404 for non-existent asset', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/assets/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/assets/:id', () => {
    it('should update asset details', async () => {
      const response = await request(app)
        .put(`/api/v1/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          availability: 'Limited',
          notes: 'Only available on weekends'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', assetId);
      expect(response.body).toHaveProperty('availability', 'Limited');
      expect(response.body).toHaveProperty('notes', 'Only available on weekends');
    });

    it('should update asset name and description', async () => {
      const response = await request(app)
        .put(`/api/v1/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Advanced Python Programming',
          description: 'Updated expertise level'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Advanced Python Programming');
    });

    it('should return 404 for non-existent asset', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/v1/assets/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          availability: 'Available'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/assets/:id', () => {
    let deleteAssetId;

    beforeAll(async () => {
      // Create asset to delete
      const asset = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          owner_id: ownerId,
          asset_type: 'Property',
          name: 'To Delete'
        });

      deleteAssetId = asset.body.id;
    });

    it('should delete asset by ID', async () => {
      const response = await request(app)
        .delete(`/api/v1/assets/${deleteAssetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when deleting non-existent asset', async () => {
      const response = await request(app)
        .delete(`/api/v1/assets/${deleteAssetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
