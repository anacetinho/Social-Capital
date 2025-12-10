const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

/**
 * Integration Test: Relationship Tracking
 * User Story: As a user, I want to track relationships between people in my network,
 * including their type, strength, and context
 */
describe('Integration: Relationship Tracking', () => {
  let authToken;
  let people = [];
  let relationships = [];

  beforeAll(async () => {
    // Create test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `rel-tracking-${Date.now()}@example.com`,
        password: 'password123'
      });

    authToken = userResponse.body.token;

    // Create 4 people for relationship tests
    const names = ['Alice', 'Bob', 'Charlie', 'Diana'];
    for (const name of names) {
      const response = await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name });

      people.push(response.body);
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should complete full relationship tracking lifecycle', async () => {
    // Step 1: Create relationship between Alice and Bob (friends)
    const rel1Response = await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        person_a_id: people[0].id, // Alice
        person_b_id: people[1].id, // Bob
        relationship_type: 'friend',
        strength: 5,
        context: 'College roommates'
      });

    expect(rel1Response.status).toBe(201);
    expect(rel1Response.body).toHaveProperty('id');
    expect(rel1Response.body.strength).toBe(5);
    relationships.push(rel1Response.body);

    // Step 2: Create relationship between Bob and Charlie (colleagues)
    const rel2Response = await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        person_a_id: people[1].id, // Bob
        person_b_id: people[2].id, // Charlie
        relationship_type: 'colleague',
        strength: 3,
        context: 'Work together at Tech Corp'
      });

    expect(rel2Response.status).toBe(201);
    relationships.push(rel2Response.body);

    // Step 3: Create relationship between Charlie and Diana (family)
    const rel3Response = await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        person_a_id: people[2].id, // Charlie
        person_b_id: people[3].id, // Diana
        relationship_type: 'family',
        strength: 5
      });

    expect(rel3Response.status).toBe(201);
    relationships.push(rel3Response.body);

    // Step 4: Get all relationships
    const allRelsResponse = await request(app)
      .get('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`);

    expect(allRelsResponse.status).toBe(200);
    expect(allRelsResponse.body.data.length).toBeGreaterThanOrEqual(3);

    // Step 5: Filter relationships by person (Bob)
    const bobRelsResponse = await request(app)
      .get('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ person_id: people[1].id });

    expect(bobRelsResponse.status).toBe(200);
    expect(bobRelsResponse.body.data.length).toBe(2); // Bob connected to Alice and Charlie

    // Step 6: Filter relationships by type (friend)
    const friendRelsResponse = await request(app)
      .get('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ relationship_type: 'friend' });

    expect(friendRelsResponse.status).toBe(200);
    expect(friendRelsResponse.body.data.length).toBeGreaterThanOrEqual(1);

    // Step 7: Get specific relationship by ID
    const getRelResponse = await request(app)
      .get(`/api/v1/relationships/${relationships[0].id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(getRelResponse.status).toBe(200);
    expect(getRelResponse.body.id).toBe(relationships[0].id);
    expect(getRelResponse.body.strength).toBe(5);

    // Step 8: Update relationship strength and context
    const updateResponse = await request(app)
      .put(`/api/v1/relationships/${relationships[0].id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        strength: 4,
        context: 'Best friends from college'
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.strength).toBe(4);
    expect(updateResponse.body.context).toBe('Best friends from college');

    // Step 9: Verify update persisted
    const verifyUpdateResponse = await request(app)
      .get(`/api/v1/relationships/${relationships[0].id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(verifyUpdateResponse.status).toBe(200);
    expect(verifyUpdateResponse.body.strength).toBe(4);

    // Step 10: Delete a relationship
    const deleteResponse = await request(app)
      .delete(`/api/v1/relationships/${relationships[2].id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(deleteResponse.status).toBe(200);

    // Step 11: Verify deletion
    const verifyDeleteResponse = await request(app)
      .get(`/api/v1/relationships/${relationships[2].id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(verifyDeleteResponse.status).toBe(404);
  });

  it('should validate relationship constraints', async () => {
    // Test: Cannot create self-relationship
    const selfRelResponse = await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        person_a_id: people[0].id,
        person_b_id: people[0].id,
        relationship_type: 'friend',
        strength: 3
      });

    expect(selfRelResponse.status).toBe(400);

    // Test: Strength must be between 1-5
    const invalidStrengthResponse = await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        person_a_id: people[0].id,
        person_b_id: people[3].id,
        relationship_type: 'friend',
        strength: 10
      });

    expect(invalidStrengthResponse.status).toBe(400);

    // Test: Missing required fields
    const missingFieldResponse = await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        person_a_id: people[0].id,
        relationship_type: 'friend'
      });

    expect(missingFieldResponse.status).toBe(400);
  });

  it('should handle bidirectional relationship queries', async () => {
    // Create relationship Alice -> Diana
    await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        person_a_id: people[0].id,
        person_b_id: people[3].id,
        relationship_type: 'acquaintance',
        strength: 2
      });

    // Query by Alice should find Diana
    const aliceRelsResponse = await request(app)
      .get('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ person_id: people[0].id });

    expect(aliceRelsResponse.status).toBe(200);
    const hasDiana = aliceRelsResponse.body.data.some(
      rel => rel.person_a_id === people[3].id || rel.person_b_id === people[3].id
    );
    expect(hasDiana).toBe(true);

    // Query by Diana should find Alice
    const dianaRelsResponse = await request(app)
      .get('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ person_id: people[3].id });

    expect(dianaRelsResponse.status).toBe(200);
    const hasAlice = dianaRelsResponse.body.data.some(
      rel => rel.person_a_id === people[0].id || rel.person_b_id === people[0].id
    );
    expect(hasAlice).toBe(true);
  });

  it('should track relationship changes over time', async () => {
    // Create new relationship
    const newRelResponse = await request(app)
      .post('/api/v1/relationships')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        person_a_id: people[0].id,
        person_b_id: people[2].id,
        relationship_type: 'friend',
        strength: 2
      });

    const relId = newRelResponse.body.id;
    const createdAt = new Date(newRelResponse.body.created_at);

    // Wait a moment then update
    await new Promise(resolve => setTimeout(resolve, 100));

    const updateResponse = await request(app)
      .put(`/api/v1/relationships/${relId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ strength: 4 });

    const updatedAt = new Date(updateResponse.body.updated_at);

    // Verify timestamps
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
  });
});
