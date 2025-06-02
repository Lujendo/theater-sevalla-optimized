const csrf = require('csurf');

/**
 * CSRF protection middleware
 * Uses cookies to store the CSRF token
 */
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  }
});

/**
 * Middleware to handle CSRF errors
 */
const handleCsrfError = (err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }

  // Handle CSRF token errors
  res.status(403).json({
    message: 'Invalid or expired CSRF token. Please refresh the page and try again.'
  });
};

module.exports = {
  csrfProtection,
  handleCsrfError
};
