const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticate, isAdmin, restrictTo, logImpersonation } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// CSRF token endpoint (for frontend compatibility)
router.get('/csrf-token', (req, res) => {
  // For now, return a simple token - in production you might want proper CSRF protection
  const csrfToken = 'theater-app-csrf-token';
  res.json({ csrfToken });
});

// Login route (rate limited) with debugging
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt:', { username, passwordLength: password?.length });

    // Validate input
    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find user
    const user = await User.findOne({ where: { username } });
    console.log('👤 User found:', user ? `ID: ${user.id}, Username: ${user.username}` : 'NOT FOUND');

    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('🔑 Password hash in DB:', user.password?.substring(0, 20) + '...');
    console.log('🔑 Password length in DB:', user.password?.length);

    // Check password
    const isMatch = await user.checkPassword(password);
    console.log('🔍 Password match result:', isMatch);

    if (!isMatch) {
      console.log('❌ Password does not match');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('✅ Login successful for user:', username);

    console.log('🔑 JWT secret exists:', process.env.JWT_SECRET ? 'YES' : 'NO');
    console.log('🔑 JWT expires in:', process.env.JWT_EXPIRES_IN);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Change password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check current password
    const isMatch = await user.checkPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin routes
router.get('/users', authenticate, isAdmin, async (req, res) => {
    console.log('🔍 GET /auth/users - User:', req.user?.username, 'Role:', req.user?.role);
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/users', authenticate, isAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { username } });

    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const user = await User.create({
      username,
      password,
      role: role || 'user'
    });

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json(userResponse);

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, password } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (username) user.username = username;
    if (role) user.role = role;
    if (password) user.password = password;

    await user.save();

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json(userResponse);

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.destroy();

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
