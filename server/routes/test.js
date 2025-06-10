const express = require('express');
const router = express.Router();

// Simple test route to verify the server is working
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    message: 'Local development server is running'
  });
});

// Test database connection
router.get('/db-test', async (req, res) => {
  try {
    // Use environment-aware models
    const models = process.env.NODE_ENV === 'development' 
      ? require('../models/index.local')
      : require('../models');
    
    const { sequelize, User } = models;
    
    // Test database connection
    await sequelize.authenticate();
    
    // Count users
    const userCount = await User.count();
    
    res.json({
      status: 'Database OK',
      environment: process.env.NODE_ENV,
      database: process.env.NODE_ENV === 'development' ? 'SQLite' : 'MySQL',
      userCount,
      message: 'Database connection successful'
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      status: 'Database Error',
      error: error.message,
      environment: process.env.NODE_ENV
    });
  }
});

// Test equipment models and queries
router.get('/equipment-test', async (req, res) => {
  try {
    // Use environment-aware models
    const models = process.env.NODE_ENV === 'development'
      ? require('../models/index.local')
      : require('../models');

    const { Equipment, File, Location, Category, EquipmentType } = models;

    // Test simple equipment query without joins
    const equipmentCount = await Equipment.count();

    // Test with basic find
    const equipment = await Equipment.findAll({ limit: 5 });

    res.json({
      status: 'Equipment Test OK',
      equipmentCount,
      sampleEquipment: equipment,
      message: 'Equipment models working'
    });
  } catch (error) {
    console.error('Equipment test error:', error);
    res.status(500).json({
      status: 'Equipment Test Error',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test equipment with joins (like the real API)
router.get('/equipment-joins-test', async (req, res) => {
  try {
    const models = process.env.NODE_ENV === 'development'
      ? require('../models/index.local')
      : require('../models');

    const { Equipment, File, Location, Category, EquipmentType } = models;

    // Test the same query structure as the real equipment API
    const equipment = await Equipment.findAll({
      include: [
        {
          model: File,
          as: 'files',
          attributes: ['id', 'file_type', 'file_name', 'file_path']
        },
        {
          model: Location,
          as: 'locationDetails',
          attributes: ['id', 'name', 'street', 'postal_code', 'city', 'region', 'country']
        },
        {
          model: Category,
          as: 'categoryDetails',
          attributes: ['id', 'name', 'description']
        }
      ],
      limit: 5
    });

    res.json({
      status: 'Equipment Joins Test OK',
      equipment,
      message: 'Equipment with joins working'
    });
  } catch (error) {
    console.error('Equipment joins test error:', error);
    res.status(500).json({
      status: 'Equipment Joins Test Error',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test show equipment table
router.get('/show-equipment-test', async (req, res) => {
  try {
    const models = process.env.NODE_ENV === 'development'
      ? require('../models/index.local')
      : require('../models');

    const { Show, ShowEquipment, Equipment, sequelize } = models;

    // Test table existence and basic operations
    const showCount = await Show.count();
    const equipmentCount = await Equipment.count();
    const showEquipmentCount = await ShowEquipment.count();

    // Test creating a show equipment allocation
    if (showCount > 0 && equipmentCount > 0) {
      const firstShow = await Show.findOne();
      const firstEquipment = await Equipment.findOne();

      // Check if allocation already exists
      const existingAllocation = await ShowEquipment.findOne({
        where: {
          show_id: firstShow.id,
          equipment_id: firstEquipment.id
        }
      });

      if (!existingAllocation) {
        const testAllocation = await ShowEquipment.create({
          show_id: firstShow.id,
          equipment_id: firstEquipment.id,
          quantity: 1,
          notes: 'Test allocation',
          status: 'allocated'
        });

        res.json({
          status: 'ShowEquipment Test OK',
          showCount,
          equipmentCount,
          showEquipmentCount: showEquipmentCount + 1,
          testAllocation: {
            id: testAllocation.id,
            show_id: testAllocation.show_id,
            equipment_id: testAllocation.equipment_id,
            quantity: testAllocation.quantity
          },
          message: 'ShowEquipment table working and test allocation created'
        });
      } else {
        res.json({
          status: 'ShowEquipment Test OK',
          showCount,
          equipmentCount,
          showEquipmentCount,
          message: 'ShowEquipment table working (test allocation already exists)'
        });
      }
    } else {
      res.json({
        status: 'ShowEquipment Test OK',
        showCount,
        equipmentCount,
        showEquipmentCount,
        message: 'ShowEquipment table exists but no shows/equipment to test with'
      });
    }
  } catch (error) {
    console.error('ShowEquipment test error:', error);
    res.status(500).json({
      status: 'ShowEquipment Test Error',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test equipment update (GET version for browser testing)
router.get('/equipment-update-test/:id', async (req, res) => {
  try {
    const models = process.env.NODE_ENV === 'development'
      ? require('../models/index.local')
      : require('../models');

    const { Equipment, EquipmentType, Location, Category } = models;

    console.log('Test equipment update request:', {
      id: req.params.id,
      body: req.body
    });

    // Find the equipment
    const equipment = await Equipment.findByPk(req.params.id);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    console.log('Found equipment:', equipment.toJSON());

    // Test simple update (just change status for testing)
    const updateData = {
      status: equipment.status === 'available' ? 'in-use' : 'available'
    };

    console.log('Update data:', updateData);

    // Perform update
    await equipment.update(updateData);

    console.log('Equipment updated successfully');

    res.json({
      status: 'Equipment Update Test OK',
      message: 'Equipment updated successfully',
      equipment: equipment.toJSON()
    });
  } catch (error) {
    console.error('Equipment update test error:', error);
    res.status(500).json({
      status: 'Equipment Update Test Error',
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
