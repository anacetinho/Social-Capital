const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

describe('Events Contract Tests', () => {
  let authToken;
  let personId1;
  let personId2;
  let eventId;

  beforeAll(async () => {
    // Create test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'eventstest@example.com',
        password: 'password123'
      });

    authToken = userResponse.body.token;

    // Create people for event participants
    const person1 = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Person One' });

    const person2 = await request(app)
      .post('/api/v1/people')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Person Two' });

    personId1 = person1.body.id;
    personId2 = person2.body.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/v1/events', () => {
    it('should create an event with valid data and participants', async () => {
      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Coffee Meeting',
          description: 'Catch up over coffee',
          location: 'Downtown Cafe',
          date: '2024-12-15T10:00:00Z',
          event_type: 'Coffee',
          participant_ids: [personId1, personId2]
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'Coffee Meeting');
      expect(response.body).toHaveProperty('description', 'Catch up over coffee');
      expect(response.body).toHaveProperty('location', 'Downtown Cafe');
      expect(response.body).toHaveProperty('event_type', 'Coffee');
      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('created_at');

      eventId = response.body.id;
    });

    it('should create event without participants', async () => {
      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Solo Activity',
          date: '2024-12-20T14:00:00Z',
          event_type: 'Other'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'Solo Activity');
    });

    it('should reject event without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/events')
        .send({
          title: 'Test Event',
          date: '2024-12-25T12:00:00Z'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject event without required title', async () => {
      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: '2024-12-25T12:00:00Z'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject event without required date', async () => {
      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'No Date Event'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject event with invalid date format', async () => {
      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Bad Date',
          date: 'not-a-date'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/events', () => {
    it('should get paginated list of events', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('offset', 0);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter events by event_type', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ event_type: 'Coffee' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter events by person_id', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ person_id: personId1 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should filter events by date range', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_date: '2024-12-01',
          end_date: '2024-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/events');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/events/:id', () => {
    it('should get event by ID with participants', async () => {
      const response = await request(app)
        .get(`/api/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', eventId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('participants');
      expect(Array.isArray(response.body.participants)).toBe(true);
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/events/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/events/:id', () => {
    it('should update event details', async () => {
      const response = await request(app)
        .put(`/api/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Coffee Meeting',
          location: 'New Cafe',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', eventId);
      expect(response.body).toHaveProperty('title', 'Updated Coffee Meeting');
      expect(response.body).toHaveProperty('location', 'New Cafe');
    });

    it('should update event participants', async () => {
      const response = await request(app)
        .put(`/api/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          participant_ids: [personId1]
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', eventId);
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/v1/events/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/v1/events/:id', () => {
    let deleteEventId;

    beforeAll(async () => {
      // Create event to delete
      const event = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'To Delete',
          date: '2024-12-30T10:00:00Z'
        });

      deleteEventId = event.body.id;
    });

    it('should delete event by ID', async () => {
      const response = await request(app)
        .delete(`/api/v1/events/${deleteEventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 when deleting non-existent event', async () => {
      const response = await request(app)
        .delete(`/api/v1/events/${deleteEventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
