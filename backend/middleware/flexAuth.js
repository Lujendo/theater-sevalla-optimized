const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Flexible authentication middleware that provides different levels of authentication
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.required - Whether authentication is required (default: true)
 * @param {boolean} options.attachUser - Whether to attach user to req object even if not required (default: true)
 * @param {boolean} options.allowExpired - Whether to allow expired tokens (default: false)
 * @param {Array} options.requiredRoles - Roles required to access the route (default: [])
 * @returns {Function} Express middleware
 */
const flexAuth = (options = {}) => {
  // Default options
  const config = {
    required: true,
    attachUser: true,
    allowExpired: false,
    requiredRoles: [],
    ...options
  };

  return async (req, res, next) => {
    // Initialize auth properties
    req.isAuthenticated = false;
    req.user = null;

    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : req.cookies?.token;

    if (!token) {
      // If authentication is required but no token provided
      if (config.required) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      // Otherwise continue without authentication
      return next();
    }

    try {
      // Verify token with different options based on allowExpired
      const decoded = config.allowExpired
        ? jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true })
        : jwt.verify(token, process.env.JWT_SECRET);

      // Check if token is expired and not allowing expired tokens
      if (decoded.exp * 1000 < Date.now() && !config.allowExpired) {
        if (config.required) {
          return res.status(401).json({ message: 'Token expired' });
        }
        return next();
      }

      // Find user
      const user = await User.findByPk(decoded.id);

      if (!user) {
        if (config.required) {
          return res.status(401).json({ message: 'User not found' });
        }
        return next();
      }

      // Check required roles if specified
      if (config.requiredRoles.length > 0 && !config.requiredRoles.includes(user.role)) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          requiredRoles: config.requiredRoles,
          userRole: user.role
        });
      }

      // Attach user to request if configured to do so
      if (config.attachUser) {
        req.user = user;
        req.isAuthenticated = true;
      }

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      
      // If authentication is required, return error
      if (config.required) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      // Otherwise continue without authentication
      next();
    }
  };
};

// Predefined middleware configurations
const auth = {
  // Require authentication
  required: flexAuth({ required: true }),
  
  // Optional authentication - attach user if token is valid, but don't require it
  optional: flexAuth({ required: false, attachUser: true }),
  
  // Admin only
  admin: flexAuth({ required: true, requiredRoles: ['admin'] }),
  
  // Advanced users and admins
  advanced: flexAuth({ required: true, requiredRoles: ['admin', 'advanced'] }),
  
  // Public - no authentication required, but attach user if token is valid
  public: flexAuth({ required: false, attachUser: true }),
  
  // Custom configuration
  custom: flexAuth
};

module.exports = auth;
