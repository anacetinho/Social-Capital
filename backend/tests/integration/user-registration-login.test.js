const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/connection');

/**
 * Integration Test: User Registration and Login Flow
 * User Story: As a new user, I want to register an account and login
 * to start tracking my social network
 */
describe('Integration: User Registration and Login', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('should complete full user registration and login flow', async () => {
    const testEmail = `integration-${Date.now()}@example.com`;
    const testPassword = 'SecurePass123';

    // Step 1: Register new user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toHaveProperty('token');
    expect(registerResponse.body).toHaveProperty('user');
    expect(registerResponse.body.user.email).toBe(testEmail);
    expect(registerResponse.body.user).not.toHaveProperty('password');
    expect(registerResponse.body.user).not.toHaveProperty('password_hash');

    const registrationToken = registerResponse.body.token;
    const userId = registerResponse.body.user.id;

    // Step 2: Verify token works by accessing protected endpoint
    const meResponse = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${registrationToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.id).toBe(userId);
    expect(meResponse.body.email).toBe(testEmail);

    // Step 3: Logout
    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${registrationToken}`);

    expect(logoutResponse.status).toBe(200);

    // Step 4: Login with same credentials
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('token');
    expect(loginResponse.body.user.id).toBe(userId);
    expect(loginResponse.body.user.email).toBe(testEmail);

    const loginToken = loginResponse.body.token;

    // Step 5: Verify new token works
    const verifyResponse = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginToken}`);

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.id).toBe(userId);

    // Step 6: Verify duplicate registration fails
    const duplicateResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'DifferentPassword456'
      });

    expect(duplicateResponse.status).toBe(409);

    // Step 7: Verify wrong password fails
    const wrongPasswordResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword'
      });

    expect(wrongPasswordResponse.status).toBe(401);
  });

  it('should enforce password requirements', async () => {
    const testEmail = `weak-pass-${Date.now()}@example.com`;

    // Too short password
    const shortPasswordResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: '123'
      });

    expect(shortPasswordResponse.status).toBe(400);
  });

  it('should enforce valid email format', async () => {
    const invalidEmailResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'not-an-email',
        password: 'ValidPassword123'
      });

    expect(invalidEmailResponse.status).toBe(400);
  });

  it('should handle missing credentials gracefully', async () => {
    const noEmailResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        password: 'ValidPassword123'
      });

    expect(noEmailResponse.status).toBe(400);

    const noPasswordResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'valid@example.com'
      });

    expect(noPasswordResponse.status).toBe(400);
  });
});
