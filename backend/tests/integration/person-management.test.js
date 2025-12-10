const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

/**
 * Integration Test: Person Management
 * User Story: As a user, I want to add people to my network, update their
 * information, search for them, and remove them when needed
 */
describe('Integration: Person Management', () => {
  let authToken;
  let personIds = [];

  beforeAll(async () => {
    // Create test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `person-mgmt-${Date.now()}@example.com`,
        password: 'password123'
      });

    authToken = userResponse.body.token;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should complete full person management lifecycle', async () => {
    // Step 1: Add first person with full details
    const person1Response = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'John',
        surname: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
        date_of_birth: '1990-05-15',
        address: '123 Main St, New York',
        nationality: 'American',
        linkedin_url: 'https://linkedin.com/in/johndoe'
      });

    expect(person1Response.status).toBe(201);
    expect(person1Response.body).toHaveProperty('id');
    expect(person1Response.body.name).toBe('John');
    expect(person1Response.body.surname).toBe('Doe');
    personIds.push(person1Response.body.id);

    // Step 2: Add second person with minimal details
    const person2Response = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Jane',
        surname: 'Smith'
      });

    expect(person2Response.status).toBe(201);
    expect(person2Response.body.name).toBe('Jane');
    personIds.push(person2Response.body.id);

    // Step 3: Add third person
    const person3Response = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Alice',
        surname: 'Johnson',
        email: 'alice.j@example.com'
      });

    expect(person3Response.status).toBe(201);
    personIds.push(person3Response.body.id);

    // Step 4: Get list of all people
    const listResponse = await request(app)
      .get('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: 50, offset: 0 });

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.length).toBeGreaterThanOrEqual(3);
    expect(listResponse.body.total).toBeGreaterThanOrEqual(3);

    // Step 5: Search for person by name
    const searchResponse = await request(app)
      .get('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ search: 'John' });

    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.data.length).toBeGreaterThanOrEqual(1);
    const foundPerson = searchResponse.body.data.find(p => p.name === 'John');
    expect(foundPerson).toBeDefined();

    // Step 6: Get specific person by ID
    const getPersonResponse = await request(app)
      .get(`/api/v1/people/${personIds[0]}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(getPersonResponse.status).toBe(200);
    expect(getPersonResponse.body.id).toBe(personIds[0]);
    expect(getPersonResponse.body.name).toBe('John');
    expect(getPersonResponse.body.email).toBe('john.doe@example.com');

    // Step 7: Update person information
    const updateResponse = await request(app)
      .put(`/api/v1/people/${personIds[0]}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        phone: '+1-555-999-8888',
        address: '456 New Address, Boston'
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.phone).toBe('+1-555-999-8888');
    expect(updateResponse.body.address).toBe('456 New Address, Boston');
    expect(updateResponse.body.name).toBe('John'); // Unchanged fields preserved

    // Step 8: Verify update persisted
    const verifyUpdateResponse = await request(app)
      .get(`/api/v1/people/${personIds[0]}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(verifyUpdateResponse.status).toBe(200);
    expect(verifyUpdateResponse.body.phone).toBe('+1-555-999-8888');

    // Step 9: Delete a person
    const deleteResponse = await request(app)
      .delete(`/api/v1/people/${personIds[2]}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(deleteResponse.status).toBe(200);

    // Step 10: Verify person was deleted
    const verifyDeleteResponse = await request(app)
      .get(`/api/v1/people/${personIds[2]}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(verifyDeleteResponse.status).toBe(404);

    // Step 11: Verify remaining people count
    const finalListResponse = await request(app)
      .get('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`);

    expect(finalListResponse.status).toBe(200);
    expect(finalListResponse.body.total).toBe(listResponse.body.total - 1);
  });

  it('should handle pagination correctly', async () => {
    // Add 5 more people for pagination test
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Person${i}`,
          surname: `Test${i}`
        });
    }

    // Get first page
    const page1Response = await request(app)
      .get('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: 3, offset: 0 });

    expect(page1Response.status).toBe(200);
    expect(page1Response.body.data.length).toBeLessThanOrEqual(3);
    expect(page1Response.body.limit).toBe(3);
    expect(page1Response.body.offset).toBe(0);

    // Get second page
    const page2Response = await request(app)
      .get('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: 3, offset: 3 });

    expect(page2Response.status).toBe(200);
    expect(page2Response.body.offset).toBe(3);
  });

  it('should validate person data', async () => {
    // Invalid email format
    const invalidEmailResponse = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test',
        email: 'not-an-email'
      });

    expect(invalidEmailResponse.status).toBe(400);

    // Missing required name
    const missingNameResponse = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        surname: 'Only'
      });

    expect(missingNameResponse.status).toBe(400);
  });

  it('should handle non-existent person gracefully', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const getResponse = await request(app)
      .get(`/api/v1/people/${fakeId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(getResponse.status).toBe(404);

    const updateResponse = await request(app)
      .put(`/api/v1/people/${fakeId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test' });

    expect(updateResponse.status).toBe(404);

    const deleteResponse = await request(app)
      .delete(`/api/v1/people/${fakeId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(deleteResponse.status).toBe(404);
  });
});
