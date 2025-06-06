const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { sequelize } = require('../config/database');

// Get all shows
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (search) {
      whereConditions.push('(name LIKE ? OR venue LIKE ? OR director LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get shows with basic info
    const showsQuery = `
      SELECT
        s.*,
        u.username as creator_username
      FROM shows s
      LEFT JOIN users u ON s.created_by = u.id
      ${whereClause}
      ORDER BY s.date DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), parseInt(offset));

    const [shows] = await sequelize.query(showsQuery, {
      replacements: queryParams
    });

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM shows s
      ${whereClause}
    `;

    const [countResult] = await sequelize.query(countQuery, {
      replacements: queryParams.slice(0, -2) // Remove limit and offset
    });

    const total = countResult[0].total;

    // Add equipment count (0 for now, will be calculated when show_equipment table exists)
    const showsWithCounts = shows.map(show => ({
      ...show,
      equipmentCount: 0,
      creator: show.creator_username ? {
        id: show.created_by,
        username: show.creator_username
      } : null
    }));

    res.json({
      shows: showsWithCounts,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching shows:', error);
    res.status(500).json({ message: 'Failed to fetch shows', error: error.message });
  }
});

// Get single show
router.get('/:id', authenticate, async (req, res) => {
  try {
    const showQuery = `
      SELECT
        s.*,
        creator.username as creator_username,
        updater.username as updater_username
      FROM shows s
      LEFT JOIN users creator ON s.created_by = creator.id
      LEFT JOIN users updater ON s.updated_by = updater.id
      WHERE s.id = ?
    `;

    const [shows] = await sequelize.query(showQuery, {
      replacements: [req.params.id]
    });

    if (!shows.length) {
      return res.status(404).json({ message: 'Show not found' });
    }

    const show = shows[0];

    res.json({
      ...show,
      equipmentCount: 0,
      creator: show.creator_username ? {
        id: show.created_by,
        username: show.creator_username
      } : null,
      updater: show.updater_username ? {
        id: show.updated_by,
        username: show.updater_username
      } : null
    });
  } catch (error) {
    console.error('Error fetching show:', error);
    res.status(500).json({ message: 'Failed to fetch show', error: error.message });
  }
});

// Create new show
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, date, venue, director, description, status = 'planning' } = req.body;

    if (!name || !date) {
      return res.status(400).json({ message: 'Name and date are required' });
    }

    const insertQuery = `
      INSERT INTO shows (name, date, venue, director, description, status, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const [result] = await sequelize.query(insertQuery, {
      replacements: [name, date, venue, director, description, status, req.user.id]
    });

    // Fetch the created show
    const showQuery = `
      SELECT
        s.*,
        u.username as creator_username
      FROM shows s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `;

    const [shows] = await sequelize.query(showQuery, {
      replacements: [result.insertId]
    });

    const show = shows[0];

    res.status(201).json({
      ...show,
      equipmentCount: 0,
      creator: show.creator_username ? {
        id: show.created_by,
        username: show.creator_username
      } : null
    });
  } catch (error) {
    console.error('Error creating show:', error);
    res.status(500).json({ message: 'Failed to create show', error: error.message });
  }
});

// Update show
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, date, venue, director, description, status } = req.body;

    if (!name || !date) {
      return res.status(400).json({ message: 'Name and date are required' });
    }

    // Check if show exists
    const [existingShows] = await sequelize.query('SELECT id FROM shows WHERE id = ?', {
      replacements: [req.params.id]
    });

    if (!existingShows.length) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // Update the show
    const updateQuery = `
      UPDATE shows
      SET name = ?, date = ?, venue = ?, director = ?, description = ?, status = ?, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await sequelize.query(updateQuery, {
      replacements: [name, date, venue, director, description, status, req.user.id, req.params.id]
    });

    // Fetch updated show
    const showQuery = `
      SELECT
        s.*,
        creator.username as creator_username,
        updater.username as updater_username
      FROM shows s
      LEFT JOIN users creator ON s.created_by = creator.id
      LEFT JOIN users updater ON s.updated_by = updater.id
      WHERE s.id = ?
    `;

    const [shows] = await sequelize.query(showQuery, {
      replacements: [req.params.id]
    });

    const show = shows[0];

    res.json({
      ...show,
      equipmentCount: 0,
      creator: show.creator_username ? {
        id: show.created_by,
        username: show.creator_username
      } : null,
      updater: show.updater_username ? {
        id: show.updated_by,
        username: show.updater_username
      } : null
    });
  } catch (error) {
    console.error('Error updating show:', error);
    res.status(500).json({ message: 'Failed to update show', error: error.message });
  }
});

// Delete show
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Check if show exists
    const [existingShows] = await sequelize.query('SELECT id FROM shows WHERE id = ?', {
      replacements: [req.params.id]
    });

    if (!existingShows.length) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // Check if show has equipment allocated (if table exists)
    try {
      const [equipmentCount] = await sequelize.query('SELECT COUNT(*) as count FROM show_equipment WHERE show_id = ?', {
        replacements: [req.params.id]
      });

      if (equipmentCount[0].count > 0) {
        return res.status(400).json({
          message: 'Cannot delete show with allocated equipment. Please remove all equipment first.'
        });
      }
    } catch (tableError) {
      // show_equipment table doesn't exist, safe to delete
      console.log('show_equipment table does not exist, proceeding with deletion');
    }

    // Delete the show
    await sequelize.query('DELETE FROM shows WHERE id = ?', {
      replacements: [req.params.id]
    });

    res.json({ message: 'Show deleted successfully' });
  } catch (error) {
    console.error('Error deleting show:', error);
    res.status(500).json({ message: 'Failed to delete show', error: error.message });
  }
});

module.exports = router;
