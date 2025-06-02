const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../index');
const { User } = require('../../models');

// Mock the User model
jest.mock('../../models', () => ({
  User: {
    findByPk: jest.fn()
  }
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('User Impersonation', () => {
  let adminToken, basicUserToken;

  beforeEach(() => {
    // Create mock tokens
    adminToken = 'admin-token';
    basicUserToken = 'basic-user-token';

    // Mock jwt.sign to return predictable tokens
    jwt.sign.mockImplementation((payload) => {
      if (payload.role === 'admin') {
        return adminToken;
      } else {
        return basicUserToken;
      }
    });

    // Mock jwt.verify for authentication
    jwt.verify.mockImplementation((token) => {
      if (token === adminToken) {
        return { id: 1, username: 'admin', role: 'admin' };
      } else if (token === basicUserToken) {
        return { id: 2, username: 'basicuser', role: 'basic' };
      } else {
        throw new Error('Invalid token');
      }
    });

    // Mock User.findByPk
    User.findByPk.mockImplementation(async (id) => {
      if (id === 1) {
        return { id: 1, username: 'admin', role: 'admin' };
      } else if (id === 2) {
        return { id: 2, username: 'basicuser', role: 'basic' };
      } else {
        return null;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow admin to impersonate another user', async () => {
    const response = await request(app)
      .post('/api/auth/impersonate/2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('id', 2);
    expect(response.body.user).toHaveProperty('username', 'basicuser');
    expect(response.body.user).toHaveProperty('role', 'basic');
    expect(response.body.user).toHaveProperty('impersonated', true);
    expect(response.body).toHaveProperty('message', 'You are now impersonating basicuser');

    // Verify the token was created with the correct payload
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 2,
        username: 'basicuser',
        role: 'basic',
        impersonatedBy: expect.objectContaining({
          id: 1,
          username: 'admin'
        })
      }),
      process.env.JWT_SECRET,
      expect.any(Object)
    );
  });

  it('should not allow non-admin users to impersonate', async () => {
    const response = await request(app)
      .post('/api/auth/impersonate/1')
      .set('Authorization', `Bearer ${basicUserToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('message', 'Access denied. Required role: admin');
  });

  it('should return 404 if target user does not exist', async () => {
    const response = await request(app)
      .post('/api/auth/impersonate/999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message', 'User not found');
  });

  it('should return 401 if not authenticated', async () => {
    const response = await request(app)
      .post('/api/auth/impersonate/2');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message', 'Authentication required');
  });
});
