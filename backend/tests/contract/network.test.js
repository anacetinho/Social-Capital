const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

describe('Network Contract Tests', () => {
  let authToken;
  let person1Id;
  let person2Id;
  let person3Id;

  beforeAll(async () => {
    // Create test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'networktest@example.com',
        password: 'password123'
      });

    authToken = userResponse.body.token;

    // Create connected people for network graph
    const person1 = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Alice' });

    const person2 = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Bob' });

    const person3 = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Charlie' });

    person1Id = person1.body.id;
    person2Id = person2.body.id;
    person3Id = person3.body.id;

    // Create relationships forming a connected network
    await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        person_a_id: person1Id,
        person_b_id: person2Id,
        relationship_type: 'friend',
        strength: 5
      });

    await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        person_a_id: person2Id,
        person_b_id: person3Id,
        relationship_type: 'colleague',
        strength: 3
      });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/v1/network/graph', () => {
    it('should get network graph data with nodes and links', async () => {
      const response = await request(app)
        .get('/api/v1/network/graph')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nodes');
      expect(response.body).toHaveProperty('links');
      expect(Array.isArray(response.body.nodes)).toBe(true);
      expect(Array.isArray(response.body.links)).toBe(true);

      // Verify node structure
      if (response.body.nodes.length > 0) {
        const node = response.body.nodes[0];
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('name');
      }

      // Verify link structure
      if (response.body.links.length > 0) {
        const link = response.body.links[0];
        expect(link).toHaveProperty('source');
        expect(link).toHaveProperty('target');
        expect(link).toHaveProperty('strength');
        expect(typeof link.strength).toBe('number');
        expect(link.strength).toBeGreaterThanOrEqual(1);
        expect(link.strength).toBeLessThanOrEqual(5);
      }
    });

    it('should filter network graph by relationship type', async () => {
      const response = await request(app)
        .get('/api/v1/network/graph')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'friend' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nodes');
      expect(response.body).toHaveProperty('links');
      expect(Array.isArray(response.body.nodes)).toBe(true);
      expect(Array.isArray(response.body.links)).toBe(true);

      // All links should be of type 'friend'
      response.body.links.forEach(link => {
        expect(link).toHaveProperty('type', 'friend');
      });
    });

    it('should filter network graph by minimum strength', async () => {
      const response = await request(app)
        .get('/api/v1/network/graph')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ min_strength: 4 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('links');

      // All links should have strength >= 4
      response.body.links.forEach(link => {
        expect(link.strength).toBeGreaterThanOrEqual(4);
      });
    });

    it('should reject network graph request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/network/graph');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/network/clusters', () => {
    it('should identify network clusters', async () => {
      const response = await request(app)
        .get('/api/v1/network/clusters')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('clusters');
      expect(Array.isArray(response.body.clusters)).toBe(true);

      if (response.body.clusters.length > 0) {
        const cluster = response.body.clusters[0];
        expect(cluster).toHaveProperty('id');
        expect(cluster).toHaveProperty('members');
        expect(Array.isArray(cluster.members)).toBe(true);
        expect(cluster).toHaveProperty('size');
        expect(typeof cluster.size).toBe('number');
      }
    });

    it('should reject clusters request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/network/clusters');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/network/central-nodes', () => {
    it('should identify most connected people in network', async () => {
      const response = await request(app)
        .get('/api/v1/network/central-nodes')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('central_nodes');
      expect(Array.isArray(response.body.central_nodes)).toBe(true);
      expect(response.body.central_nodes.length).toBeLessThanOrEqual(10);

      if (response.body.central_nodes.length > 0) {
        const node = response.body.central_nodes[0];
        expect(node).toHaveProperty('person_id');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('connection_count');
        expect(typeof node.connection_count).toBe('number');
      }
    });

    it('should return central nodes ordered by connection count', async () => {
      const response = await request(app)
        .get('/api/v1/network/central-nodes')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5 });

      expect(response.status).toBe(200);

      // Verify descending order by connection count
      const nodes = response.body.central_nodes;
      for (let i = 1; i < nodes.length; i++) {
        expect(nodes[i - 1].connection_count).toBeGreaterThanOrEqual(nodes[i].connection_count);
      }
    });

    it('should reject central nodes request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/network/central-nodes');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/network/isolated', () => {
    it('should identify people with few or no connections', async () => {
      const response = await request(app)
        .get('/api/v1/network/isolated')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ max_connections: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isolated_people');
      expect(Array.isArray(response.body.isolated_people)).toBe(true);

      if (response.body.isolated_people.length > 0) {
        const person = response.body.isolated_people[0];
        expect(person).toHaveProperty('id');
        expect(person).toHaveProperty('name');
        expect(person).toHaveProperty('connection_count');
        expect(person.connection_count).toBeLessThanOrEqual(1);
      }
    });

    it('should reject isolated people request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/network/isolated');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/network/path', () => {
    it('should find shortest path between two connected people', async () => {
      const response = await request(app)
        .post('/api/v1/network/path')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          from_person_id: person1Id,
          to_person_id: person3Id
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('from');
      expect(response.body).toHaveProperty('to');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('degrees');
      expect(response.body).toHaveProperty('strength');

      expect(Array.isArray(response.body.path)).toBe(true);
      expect(response.body.path.length).toBeGreaterThan(0);
      expect(typeof response.body.degrees).toBe('number');
      expect(typeof response.body.strength).toBe('number');

      // First element should be from_person_id, last should be to_person_id
      expect(response.body.path[0]).toBe(person1Id);
      expect(response.body.path[response.body.path.length - 1]).toBe(person3Id);

      // Degrees should not exceed 3 (POC limit)
      expect(response.body.degrees).toBeLessThanOrEqual(3);
    });

    it('should return 404 when no path exists between people', async () => {
      // Create isolated person
      const isolated = await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Isolated Person' });

      const response = await request(app)
        .post('/api/v1/network/path')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          from_person_id: person1Id,
          to_person_id: isolated.body.id
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject pathfinding without required from_person_id', async () => {
      const response = await request(app)
        .post('/api/v1/network/path')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to_person_id: person2Id
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject pathfinding without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/network/path')
        .send({
          from_person_id: person1Id,
          to_person_id: person2Id
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
