const jwt = require('jsonwebtoken');
const { authenticate, restrictTo } = require('../../middleware/auth');
const { User } = require('../../models');

// Mock the User model
jest.mock('../../models', () => ({
  User: {
    findByPk: jest.fn()
  }
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      header: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should return 401 if no token is provided', async () => {
      req.header.mockReturnValue(undefined);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      req.header.mockReturnValue('Bearer invalid-token');
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not found', async () => {
      req.header.mockReturnValue('Bearer valid-token');
      jwt.verify.mockReturnValue({ id: 1 });
      User.findByPk.mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() if authentication is successful', async () => {
      const user = { id: 1, username: 'testuser', role: 'admin' };
      req.header.mockReturnValue('Bearer valid-token');
      jwt.verify.mockReturnValue({ id: 1 });
      User.findByPk.mockResolvedValue(user);

      await authenticate(req, res, next);

      expect(req.user).toEqual(user);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('restrictTo', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      const middleware = restrictTo('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user does not have required role', async () => {
      req.user = { id: 1, username: 'testuser', role: 'basic' };

      const middleware = restrictTo('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied. Required role: admin' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() if user has required role', async () => {
      req.user = { id: 1, username: 'testuser', role: 'admin' };

      const middleware = restrictTo('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should call next() if user has one of the required roles', async () => {
      req.user = { id: 1, username: 'testuser', role: 'advanced' };

      const middleware = restrictTo('admin', 'advanced');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
