const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints
 * Limits login attempts to 5 per minute per IP address
 */
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many login attempts. Please try again after 1 minute.'
  },
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
});

/**
 * Rate limiter for API endpoints
 * Limits requests to 100 per minute per IP address
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests. Please try again after 1 minute.'
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};
