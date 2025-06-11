const express = require('express');
const jwt = require('jsonwebtoken');
// Use environment-aware models based on database type
const { User } = (process.env.DB_TYPE === 'mysql')
  ? require('../models')
  : require('../models/index.local');
const { authenticate, isAdmin, restrictTo, logImpersonation } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { fixUnhashedPasswords } = require('../scripts/fix-unhashed-passwords');

const router = express.Router();

// Login route (rate limited)
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find user with explicit attributes to avoid email column error
    const user = await User.findOne({
      where: { username },
      attributes: ['id', 'username', 'password', 'role', 'created_at']
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    console.log(`🔑 Login attempt for user: ${user.username} (ID: ${user.id})`);
    const isMatch = await user.checkPassword(password);
    console.log(`🔑 Password match result: ${isMatch}`);

    if (!isMatch) {
      console.log(`🔑 Login failed for user: ${user.username} - Invalid password`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('🔑 JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log('🔑 Token generated successfully for user:', user.username);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register route (admin only)
router.post('/register', authenticate, isAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if user already exists with explicit attributes
    const existingUser = await User.findOne({
      where: { username },
      attributes: ['id', 'username', 'role']
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new user
    const user = await User.create({
      username,
      password,
      role: role || 'basic'
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    console.error('Register error details:', {
      message: error.message,
      name: error.name,
      sql: error.sql,
      original: error.original
    });

    // Send more specific error message
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: 'Validation error: ' + error.errors.map(e => e.message).join(', ')
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        message: 'Username already exists'
      });
    }

    if (error.name === 'SequelizeDatabaseError' && error.original?.code === 'ER_BAD_FIELD_ERROR') {
      console.error('Database schema mismatch:', error.original.sqlMessage);
      return res.status(500).json({
        message: 'Database schema error - please contact administrator'
      });
    }

    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user route
router.get('/me', authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

/**
 * Impersonate user route (admin only)
 * Allows admin users to generate a token for another user
 */
router.post('/impersonate/:userId', authLimiter, authenticate, restrictTo('admin'), logImpersonation, async (req, res) => {
  try {
    const { userId } = req.params;

    // Find target user with explicit attributes
    const targetUser = await User.findByPk(userId, {
      attributes: ['id', 'username', 'role', 'created_at']
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate JWT token for target user
    const token = jwt.sign(
      {
        id: targetUser.id,
        username: targetUser.username,
        role: targetUser.role,
        impersonatedBy: {
          id: req.user.id,
          username: req.user.username
        }
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        role: targetUser.role,
        impersonated: true
      },
      message: `You are now impersonating ${targetUser.username}`
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * List users route (admin only)
 * Returns a list of all users for admin to choose who to impersonate
 */
router.get('/users', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'role', 'created_at'],
      order: [['username', 'ASC']]
    });

    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Update user route (admin only)
 * Updates user information like username and role
 */
router.put('/users/:userId', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, role } = req.body;

    // Validate input
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Validate role
    const validRoles = ['admin', 'advanced', 'basic'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Find user
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'role', 'created_at']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if username already exists (if changed)
    if (username !== user.username) {
      const existingUser = await User.findOne({
        where: { username },
        attributes: ['id', 'username']
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }

    // Update user
    await user.update({
      username,
      role: role || user.role
    });

    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    console.error('Update user error details:', {
      message: error.message,
      name: error.name,
      sql: error.sql,
      original: error.original
    });

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: 'Validation error: ' + error.errors.map(e => e.message).join(', ')
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        message: 'Username already exists'
      });
    }

    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Reset user password route (admin only)
 * Resets a user's password to a new value
 */
router.put('/users/:userId/password', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    // Validate input
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Find user
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'role', 'created_at']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password (will be hashed by the beforeUpdate hook)
    console.log(`🔑 Resetting password for user: ${user.username} (ID: ${user.id})`);
    console.log(`🔑 New password length: ${newPassword.length}`);

    await user.update({
      password: newPassword
    });

    // Verify the password was updated by checking if it can be validated
    const updatedUser = await User.findByPk(userId, {
      attributes: ['id', 'username', 'password', 'role', 'created_at']
    });

    const passwordVerification = await updatedUser.checkPassword(newPassword);
    console.log(`🔑 Password verification after reset: ${passwordVerification}`);

    res.json({
      message: 'Password reset successfully',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    console.error('Reset password error details:', {
      message: error.message,
      name: error.name,
      sql: error.sql,
      original: error.original
    });

    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Delete user route (admin only)
 * Permanently deletes a user from the system
 */
router.delete('/users/:userId', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // Find user
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'role', 'created_at']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user
    await user.destroy();

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    console.error('Delete user error details:', {
      message: error.message,
      name: error.name,
      sql: error.sql,
      original: error.original
    });

    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Fix unhashed passwords route (admin only)
 * Finds and hashes any plain text passwords in the database
 */
router.post('/fix-passwords', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    console.log('🔧 Admin requested password hash fix');

    // Run the password fix script
    await fixUnhashedPasswords();

    res.json({
      message: 'Password hash fix completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Fix passwords error:', error);
    console.error('Fix passwords error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });

    res.status(500).json({
      message: 'Failed to fix passwords: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
