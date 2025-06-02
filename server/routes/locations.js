const express = require('express');
const { authenticate, restrictTo } = require('../middleware/auth');
const { Location, Equipment } = require('../models');

const router = express.Router();

// Get all locations
router.get('/', authenticate, async (req, res) => {
  try {
    const locations = await Location.findAll({
      order: [['name', 'ASC']]
    });

    res.json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get location by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const location = await Location.findByPk(req.params.id, {
      include: [
        {
          model: Equipment,
          as: 'equipment'
        }
      ]
    });

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new location (admin only)
router.post('/', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { name, street, postal_code, city, region, country } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Location name is required' });
    }

    // Create location
    const location = await Location.create({
      name,
      street: street || null,
      postal_code: postal_code || null,
      city: city || null,
      region: region || null,
      country: country || null
    });

    res.status(201).json(location);
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update location (admin only)
router.put('/:id', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { name, street, postal_code, city, region, country } = req.body;

    // Find location
    const location = await Location.findByPk(req.params.id);

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    // Update location
    await location.update({
      name: name || location.name,
      street: street !== undefined ? street : location.street,
      postal_code: postal_code !== undefined ? postal_code : location.postal_code,
      city: city !== undefined ? city : location.city,
      region: region !== undefined ? region : location.region,
      country: country !== undefined ? country : location.country
    });

    res.json(location);
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete location (admin only)
router.delete('/:id', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    // Find location
    const location = await Location.findByPk(req.params.id);

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    // Check if location is used by any equipment
    const equipmentCount = await Equipment.count({
      where: { location_id: req.params.id }
    });

    if (equipmentCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete location that is used by equipment. Update equipment locations first.'
      });
    }

    // Delete location
    await location.destroy();

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
