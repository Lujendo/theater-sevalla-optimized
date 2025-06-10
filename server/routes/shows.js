const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
// Use environment-aware models based on database type
const models = (process.env.NODE_ENV === 'development' && process.env.DB_TYPE === 'sqlite')
  ? require('../models/index.local')
  : require('../models');
const { Show, ShowEquipment, User, Equipment, sequelize } = models;

// Get all shows
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    // Build WHERE clause for Sequelize
    const whereConditions = {};

    if (status) {
      whereConditions.status = status;
    }

    if (search) {
      const { Op } = require('sequelize');
      whereConditions[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { venue: { [Op.like]: `%${search}%` } },
        { director: { [Op.like]: `%${search}%` } }
      ];
    }

    // Get shows with creator info
    const { count, rows: shows } = await Show.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        },
        {
          model: ShowEquipment,
          as: 'showEquipment',
          attributes: ['id']
        }
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Add equipment count
    const showsWithCounts = shows.map(show => ({
      ...show.toJSON(),
      equipmentCount: show.showEquipment ? show.showEquipment.length : 0
    }));

    res.json({
      shows: showsWithCounts,
      total: count,
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
    const show = await Show.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'username']
        },
        {
          model: ShowEquipment,
          as: 'showEquipment',
          attributes: ['id']
        }
      ]
    });

    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    res.json({
      ...show.toJSON(),
      equipmentCount: show.showEquipment ? show.showEquipment.length : 0
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

    // Create the show
    const show = await Show.create({
      name,
      date,
      venue,
      director,
      description,
      status,
      created_by: req.user.id
    });

    // Fetch the created show with associations
    const createdShow = await Show.findByPk(show.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        },
        {
          model: ShowEquipment,
          as: 'showEquipment',
          attributes: ['id']
        }
      ]
    });

    res.status(201).json({
      ...createdShow.toJSON(),
      equipmentCount: 0
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

    // Find the show
    const show = await Show.findByPk(req.params.id);

    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // Update the show
    await show.update({
      name,
      date,
      venue,
      director,
      description,
      status,
      updated_by: req.user.id
    });

    // Fetch updated show with associations
    const updatedShow = await Show.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'username']
        },
        {
          model: ShowEquipment,
          as: 'showEquipment',
          attributes: ['id']
        }
      ]
    });

    res.json({
      ...updatedShow.toJSON(),
      equipmentCount: updatedShow.showEquipment ? updatedShow.showEquipment.length : 0
    });
  } catch (error) {
    console.error('Error updating show:', error);
    res.status(500).json({ message: 'Failed to update show', error: error.message });
  }
});

// Delete show
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Find the show
    const show = await Show.findByPk(req.params.id, {
      include: [
        {
          model: ShowEquipment,
          as: 'showEquipment'
        }
      ]
    });

    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // Check if show has equipment allocated
    if (show.showEquipment && show.showEquipment.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete show with allocated equipment. Please remove all equipment first.'
      });
    }

    // Delete the show
    await show.destroy();

    res.json({ message: 'Show deleted successfully' });
  } catch (error) {
    console.error('Error deleting show:', error);
    res.status(500).json({ message: 'Failed to delete show', error: error.message });
  }
});

module.exports = router;
