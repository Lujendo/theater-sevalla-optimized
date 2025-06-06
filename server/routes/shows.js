const express = require('express');
const router = express.Router();
const { Show, ShowEquipment, Equipment, User } = require('../models/associations');
const { authenticate } = require('../middleware/auth');
const { Op, sequelize } = require('sequelize');
const { sequelize: dbSequelize } = require('../config/database');

// Get all shows
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { venue: { [Op.like]: `%${search}%` } },
        { director: { [Op.like]: `%${search}%` } }
      ];
    }

    // Check if show_equipment table exists
    let includeShowEquipment = [];
    try {
      await dbSequelize.query("DESCRIBE `show_equipment`");
      // Table exists, include it
      includeShowEquipment = [
        {
          model: ShowEquipment,
          as: 'showEquipment',
          required: false,
          include: [
            {
              model: Equipment,
              as: 'equipment',
              attributes: ['id', 'name', 'brand', 'model']
            }
          ]
        }
      ];
    } catch (tableError) {
      console.log('show_equipment table does not exist yet, skipping equipment count');
    }

    const shows = await Show.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email'],
          required: false
        },
        ...includeShowEquipment
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate equipment count for each show
    const showsWithCounts = shows.rows.map(show => {
      const equipmentCount = show.showEquipment ? show.showEquipment.length : 0;
      return {
        ...show.toJSON(),
        equipmentCount
      };
    });

    res.json({
      shows: showsWithCounts,
      total: shows.count,
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
    // Check if show_equipment table exists
    let includeShowEquipment = [];
    try {
      await dbSequelize.query("DESCRIBE `show_equipment`");
      // Table exists, include it
      includeShowEquipment = [
        {
          model: ShowEquipment,
          as: 'showEquipment',
          required: false,
          include: [
            {
              model: Equipment,
              as: 'equipment',
              attributes: ['id', 'name', 'brand', 'model', 'serial_number', 'status', 'location']
            }
          ]
        }
      ];
    } catch (tableError) {
      console.log('show_equipment table does not exist yet, skipping equipment details');
    }

    const show = await Show.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email'],
          required: false
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'username', 'email'],
          required: false
        },
        ...includeShowEquipment
      ]
    });

    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    const equipmentCount = show.showEquipment ? show.showEquipment.length : 0;

    res.json({
      ...show.toJSON(),
      equipmentCount
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
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    res.status(201).json({
      ...createdShow.toJSON(),
      equipmentCount: 0
    });
  } catch (error) {
    console.error('Error creating show:', error);
    res.status(500).json({ message: 'Failed to create show' });
  }
});

// Update show
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, date, venue, director, description, status } = req.body;
    
    const show = await Show.findByPk(req.params.id);
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    if (!name || !date) {
      return res.status(400).json({ message: 'Name and date are required' });
    }

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
    const updatedShow = await Show.findByPk(show.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'username', 'email']
        },
        {
          model: ShowEquipment,
          as: 'showEquipment'
        }
      ]
    });

    const equipmentCount = updatedShow.showEquipment ? updatedShow.showEquipment.length : 0;

    res.json({
      ...updatedShow.toJSON(),
      equipmentCount
    });
  } catch (error) {
    console.error('Error updating show:', error);
    res.status(500).json({ message: 'Failed to update show' });
  }
});

// Delete show
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const show = await Show.findByPk(req.params.id);
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // Check if show has equipment allocated
    const equipmentCount = await ShowEquipment.count({
      where: { show_id: req.params.id }
    });

    if (equipmentCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete show with allocated equipment. Please remove all equipment first.' 
      });
    }

    await show.destroy();
    res.json({ message: 'Show deleted successfully' });
  } catch (error) {
    console.error('Error deleting show:', error);
    res.status(500).json({ message: 'Failed to delete show' });
  }
});

module.exports = router;
