const express = require('express');
const { Op } = require('sequelize');
const { EquipmentType } = require('../models');
const { sequelize } = require('../config/database');
const { authenticate, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Get all equipment types
router.get('/', authenticate, async (req, res) => {
  try {
    const types = await EquipmentType.findAll({
      order: [['name', 'ASC']]
    });

    res.json({ types });
  } catch (error) {
    console.error('Get equipment types error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new equipment type (admin only)
router.post('/', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Type name is required' });
    }

    // Check if type already exists (case-insensitive for MySQL)
    const existingType = await EquipmentType.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('name')),
        sequelize.fn('LOWER', name)
      )
    });

    if (existingType) {
      return res.status(400).json({ message: 'Equipment type already exists' });
    }

    // Create new type
    const type = await EquipmentType.create({ name });

    res.status(201).json(type);
  } catch (error) {
    console.error('Create equipment type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update equipment type (admin only)
router.put('/:id', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Type name is required' });
    }

    // Find type
    const type = await EquipmentType.findByPk(id);

    if (!type) {
      return res.status(404).json({ message: 'Equipment type not found' });
    }

    // Check if new name already exists (case-insensitive for MySQL)
    if (name !== type.name) {
      const existingType = await EquipmentType.findOne({
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('name')),
          sequelize.fn('LOWER', name)
        )
      });

      if (existingType) {
        return res.status(400).json({ message: 'Equipment type already exists' });
      }
    }

    // Update type
    await type.update({ name });

    res.json(type);
  } catch (error) {
    console.error('Update equipment type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete equipment type (admin only)
router.delete('/:id', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Find type
    const type = await EquipmentType.findByPk(id);

    if (!type) {
      return res.status(404).json({ message: 'Equipment type not found' });
    }

    // Delete type
    await type.destroy();

    res.json({ message: 'Equipment type deleted successfully' });
  } catch (error) {
    console.error('Delete equipment type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
