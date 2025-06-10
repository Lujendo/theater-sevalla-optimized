const express = require('express');
const router = express.Router();
const auth = require('../middleware/flexAuth');

// Get the correct models based on environment
const getModels = () => {
  return process.env.NODE_ENV === 'development'
    ? require('../models/index.local')
    : require('../models');
};

// Get all default storage locations
router.get('/', auth.required, async (req, res) => {
  try {
    const { DefaultStorageLocation, Location } = getModels();
    
    const defaultStorageLocations = await DefaultStorageLocation.findAll({
      include: [{
        model: Location,
        as: 'location',
        attributes: ['id', 'name', 'description', 'street', 'postal_code', 'city', 'region', 'country']
      }],
      order: [['priority', 'ASC'], ['name', 'ASC']]
    });

    res.json(defaultStorageLocations);
  } catch (error) {
    console.error('Error fetching default storage locations:', error);
    res.status(500).json({ message: 'Error fetching default storage locations' });
  }
});

// Get active default storage locations only
router.get('/active', auth.required, async (req, res) => {
  try {
    const { DefaultStorageLocation } = getModels();
    
    const activeStorageLocations = await DefaultStorageLocation.getActiveStorageLocations();
    res.json(activeStorageLocations);
  } catch (error) {
    console.error('Error fetching active default storage locations:', error);
    res.status(500).json({ message: 'Error fetching active default storage locations' });
  }
});

// Get default storage location IDs for inventory calculations
router.get('/ids', auth.required, async (req, res) => {
  try {
    const { DefaultStorageLocation } = getModels();
    
    const storageLocationIds = await DefaultStorageLocation.getStorageLocationIds();
    res.json({ storage_location_ids: storageLocationIds });
  } catch (error) {
    console.error('Error fetching storage location IDs:', error);
    res.status(500).json({ message: 'Error fetching storage location IDs' });
  }
});

// Create new default storage location
router.post('/', auth.required, async (req, res) => {
  try {
    const { DefaultStorageLocation, Location } = getModels();
    const { location_id, name, description, is_active = true, priority = 1 } = req.body;

    // Validate required fields
    if (!location_id || !name) {
      return res.status(400).json({ message: 'Location ID and name are required' });
    }

    // Check if location exists
    const location = await Location.findByPk(location_id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    // Check if this location is already a default storage location
    const existing = await DefaultStorageLocation.findOne({ where: { location_id } });
    if (existing) {
      return res.status(400).json({ message: 'This location is already configured as a default storage location' });
    }

    const defaultStorageLocation = await DefaultStorageLocation.create({
      location_id,
      name,
      description,
      is_active,
      priority
    });

    // Fetch the created record with location details
    const createdRecord = await DefaultStorageLocation.findByPk(defaultStorageLocation.id, {
      include: [{
        model: Location,
        as: 'location'
      }]
    });

    res.status(201).json(createdRecord);
  } catch (error) {
    console.error('Error creating default storage location:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ message: 'This location is already configured as a default storage location' });
    } else {
      res.status(500).json({ message: 'Error creating default storage location' });
    }
  }
});

// Update default storage location
router.put('/:id', auth.required, async (req, res) => {
  try {
    const { DefaultStorageLocation, Location } = getModels();
    const { id } = req.params;
    const { location_id, name, description, is_active, priority } = req.body;

    const defaultStorageLocation = await DefaultStorageLocation.findByPk(id);
    if (!defaultStorageLocation) {
      return res.status(404).json({ message: 'Default storage location not found' });
    }

    // If location_id is being changed, validate the new location
    if (location_id && location_id !== defaultStorageLocation.location_id) {
      const location = await Location.findByPk(location_id);
      if (!location) {
        return res.status(404).json({ message: 'Location not found' });
      }

      // Check if the new location is already used
      const existing = await DefaultStorageLocation.findOne({ 
        where: { 
          location_id,
          id: { [require('sequelize').Op.ne]: id }
        }
      });
      if (existing) {
        return res.status(400).json({ message: 'This location is already configured as a default storage location' });
      }
    }

    await defaultStorageLocation.update({
      location_id: location_id || defaultStorageLocation.location_id,
      name: name || defaultStorageLocation.name,
      description: description !== undefined ? description : defaultStorageLocation.description,
      is_active: is_active !== undefined ? is_active : defaultStorageLocation.is_active,
      priority: priority !== undefined ? priority : defaultStorageLocation.priority
    });

    // Fetch updated record with location details
    const updatedRecord = await DefaultStorageLocation.findByPk(id, {
      include: [{
        model: Location,
        as: 'location'
      }]
    });

    res.json(updatedRecord);
  } catch (error) {
    console.error('Error updating default storage location:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ message: 'This location is already configured as a default storage location' });
    } else {
      res.status(500).json({ message: 'Error updating default storage location' });
    }
  }
});

// Delete default storage location
router.delete('/:id', auth.required, async (req, res) => {
  try {
    const { DefaultStorageLocation } = getModels();
    const { id } = req.params;

    const defaultStorageLocation = await DefaultStorageLocation.findByPk(id);
    if (!defaultStorageLocation) {
      return res.status(404).json({ message: 'Default storage location not found' });
    }

    await defaultStorageLocation.destroy();
    res.json({ message: 'Default storage location deleted successfully' });
  } catch (error) {
    console.error('Error deleting default storage location:', error);
    res.status(500).json({ message: 'Error deleting default storage location' });
  }
});

module.exports = router;
