const jwt = require('jsonwebtoken');
const { User } = require('../models');
const flexAuth = require('./flexAuth');

/**
 * Middleware to authenticate JWT token
 * Verifies the token and attaches the user to the request object
 *
 * This is a legacy wrapper around the new flexAuth system for backward compatibility
 */
const authenticate = async (req, res, next) => {
  // Use the new flexAuth system with required authentication
  return flexAuth.required(req, res, next);
};

/**
 * Middleware to check if user has admin role
 * Legacy wrapper around flexAuth.admin
 */
const isAdmin = (req, res, next) => {
  return flexAuth.admin(req, res, next);
};

/**
 * Middleware to check if user has advanced or admin role
 * Legacy wrapper around flexAuth.advanced
 */
const isAdvancedOrAdmin = (req, res, next) => {
  return flexAuth.advanced(req, res, next);
};

/**
 * Middleware to restrict access based on user roles
 * @param {...string} roles - Roles that are allowed to access the route
 * @returns {function} Middleware function
 */
const restrictTo = (...roles) => {
  // Use the new flexAuth system with custom configuration
  return flexAuth.custom({
    required: true,
    requiredRoles: roles
  });
};

/**
 * Middleware to log impersonation attempts for audit purposes
 */
const logImpersonation = (req, res, next) => {
  const { userId } = req.params;
  console.log(`[AUDIT] User ${req.user.id} (${req.user.username}) is impersonating user ${userId} at ${new Date().toISOString()}`);
  next();
};

module.exports = {
  authenticate,
  isAdmin,
  isAdvancedOrAdmin,
  restrictTo,
  logImpersonation
};
