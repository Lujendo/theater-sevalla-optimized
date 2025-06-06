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
  // Configure for proxy environments like Kinsta
  trustProxy: process.env.TRUST_PROXY === 'true',
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if trust proxy is enabled, otherwise use req.ip
    if (process.env.TRUST_PROXY === 'true') {
      return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    }
    return req.ip;
  }
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
  },
  // Configure for proxy environments like Kinsta
  trustProxy: process.env.TRUST_PROXY === 'true',
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if trust proxy is enabled, otherwise use req.ip
    if (process.env.TRUST_PROXY === 'true') {
      return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    }
    return req.ip;
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};
