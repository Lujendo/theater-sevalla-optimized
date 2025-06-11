const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const inventoryService = require('../services/inventoryService');

/**
 * Get equipment availability
 * GET /api/inventory/equipment/:id/availability
 */
router.get('/equipment/:id/availability', authenticate, async (req, res) => {
  try {
    const equipmentId = parseInt(req.params.id);
    const availability = await inventoryService.getEquipmentAvailability(equipmentId);

    if (!availability) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json(availability);
  } catch (error) {
    console.error('Error getting equipment availability:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get equipment availability in default storage locations only
 * GET /api/inventory/equipment/:id/storage-availability
 */
router.get('/equipment/:id/storage-availability', authenticate, async (req, res) => {
  try {
    const equipmentId = parseInt(req.params.id);
    console.log('🔍 Storage availability called for equipment ID:', equipmentId);

    const { sequelize } = require('../config/database.local');

    // Get default storage location IDs
    const [defaultStorageLocations] = await sequelize.query(`
      SELECT location_id
      FROM default_storage_locations
      WHERE is_active = TRUE
      ORDER BY priority ASC
    `);

    const defaultStorageLocationIds = defaultStorageLocations.map(loc => loc.location_id);
    console.log('🔍 Default storage location IDs:', defaultStorageLocationIds);

    if (defaultStorageLocationIds.length === 0) {
      return res.json({
        equipment_id: equipmentId,
        available_in_storage: 0,
        total_in_storage: 0,
        storage_locations: [],
        message: 'No default storage locations configured'
      });
    }

    // Get equipment details and calculate storage availability (accounting for installation)
    const [equipmentResults] = await sequelize.query(`
      SELECT
        e.id as equipment_id,
        e.type,
        e.brand,
        e.model,
        e.quantity as total_quantity,
        e.status as equipment_status,
        e.location,
        e.location_id,
        e.installation_type,
        COALESCE(e.installation_quantity, 0) as installation_quantity,
        e.installation_location,
        CASE
          WHEN e.location_id IN (${defaultStorageLocationIds.join(',')}) THEN
            -- If equipment is in storage, available quantity is total minus installation quantity
            GREATEST(0, e.quantity - COALESCE(e.installation_quantity, 0))
          ELSE
            -- If equipment is not in storage location, but has portable units, show available portable quantity
            CASE
              WHEN e.installation_type IN ('fixed', 'semi-permanent') AND COALESCE(e.installation_quantity, 0) < e.quantity THEN
                -- Some units are installed, remaining units could be in storage
                GREATEST(0, e.quantity - COALESCE(e.installation_quantity, 0))
              ELSE 0
            END
        END as quantity_in_storage
      FROM equipment e
      WHERE e.id = ?
    `, { replacements: [equipmentId] });

    if (equipmentResults.length === 0) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const equipment = equipmentResults[0];

    // Get allocated quantities from shows and inventory
    const [allocationResults] = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN se.status IN ('allocated', 'checked-out', 'in-use') THEN se.quantity_allocated ELSE 0 END), 0) as show_allocated,
        COALESCE(SUM(CASE WHEN se.status = 'requested' THEN se.quantity_allocated ELSE 0 END), 0) as show_reserved
      FROM show_equipment se
      WHERE se.equipment_id = ?
    `, { replacements: [equipmentId] });

    const allocations = allocationResults[0] || { show_allocated: 0, show_reserved: 0 };

    // Calculate available quantity in storage
    const totalInStorage = equipment.quantity_in_storage;
    const availableInStorage = Math.max(0, totalInStorage - allocations.show_allocated - allocations.show_reserved);

    // Get storage location names
    const [storageLocationResults] = await sequelize.query(`
      SELECT
        dsl.name as storage_name,
        l.name as location_name,
        l.id as location_id
      FROM default_storage_locations dsl
      JOIN locations l ON dsl.location_id = l.id
      WHERE dsl.is_active = TRUE
      ORDER BY dsl.priority ASC
    `);

    res.json({
      equipment_id: equipmentId,
      available_in_storage: availableInStorage,
      total_in_storage: totalInStorage,
      allocated_from_storage: allocations.show_allocated,
      reserved_from_storage: allocations.show_reserved,
      storage_locations: storageLocationResults,
      current_location: {
        id: equipment.location_id,
        name: equipment.location
      },
      is_in_storage: defaultStorageLocationIds.includes(equipment.location_id),
      // Installation information
      installation_type: equipment.installation_type,
      installation_quantity: equipment.installation_quantity || 0,
      installation_location: equipment.installation_location,
      total_quantity: equipment.total_quantity,
      // Calculated availability
      portable_quantity: Math.max(0, equipment.total_quantity - (equipment.installation_quantity || 0))
    });
  } catch (error) {
    console.error('Error getting storage availability:', error);
    res.status(500).json({ message: 'Error getting storage availability' });
  }
});

/**
 * Allocate equipment to location
 * POST /api/inventory/allocate
 */
router.post('/allocate', authenticate, async (req, res) => {
  try {
    const {
      equipmentId,
      locationId,
      quantity,
      allocationType = 'general',
      showId = null,
      notes = null,
      expectedReturnDate = null
    } = req.body;

    // Validation
    if (!equipmentId || !locationId || !quantity) {
      return res.status(400).json({ 
        message: 'Equipment ID, location ID, and quantity are required' 
      });
    }

    if (quantity < 1) {
      return res.status(400).json({ 
        message: 'Quantity must be at least 1' 
      });
    }

    const allocationData = {
      equipmentId: parseInt(equipmentId),
      locationId: parseInt(locationId),
      quantity: parseInt(quantity),
      allocationType,
      showId: showId ? parseInt(showId) : null,
      allocatedBy: req.user.id,
      notes,
      expectedReturnDate
    };

    const allocation = await inventoryService.allocateEquipment(allocationData);
    
    res.status(201).json({
      message: 'Equipment allocated successfully',
      allocation
    });
  } catch (error) {
    console.error('Error allocating equipment:', error);
    res.status(400).json({ message: error.message });
  }
});

/**
 * Return equipment from allocation
 * PUT /api/inventory/allocations/:id/return
 */
router.put('/allocations/:id/return', authenticate, async (req, res) => {
  try {
    const allocationId = parseInt(req.params.id);
    const { notes } = req.body;

    const allocation = await inventoryService.returnEquipment(
      allocationId, 
      req.user.id, 
      notes
    );

    res.json({
      message: 'Equipment returned successfully',
      allocation
    });
  } catch (error) {
    console.error('Error returning equipment:', error);
    res.status(400).json({ message: error.message });
  }
});

/**
 * Move equipment between locations
 * PUT /api/inventory/allocations/:id/move
 */
router.put('/allocations/:id/move', authenticate, async (req, res) => {
  try {
    const allocationId = parseInt(req.params.id);
    const { newLocationId, notes } = req.body;

    if (!newLocationId) {
      return res.status(400).json({ 
        message: 'New location ID is required' 
      });
    }

    await inventoryService.moveEquipment(
      allocationId, 
      parseInt(newLocationId), 
      req.user.id, 
      notes
    );

    res.json({
      message: 'Equipment moved successfully'
    });
  } catch (error) {
    console.error('Error moving equipment:', error);
    res.status(400).json({ message: error.message });
  }
});

/**
 * Get location inventory
 * GET /api/inventory/locations/:id
 */
router.get('/locations/:id', authenticate, async (req, res) => {
  try {
    const locationId = parseInt(req.params.id);
    const inventory = await inventoryService.getLocationInventory(locationId);
    
    res.json(inventory);
  } catch (error) {
    console.error('Error getting location inventory:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get equipment allocation history
 * GET /api/inventory/equipment/:id/history
 */
router.get('/equipment/:id/history', authenticate, async (req, res) => {
  try {
    const equipmentId = parseInt(req.params.id);
    const history = await inventoryService.getEquipmentHistory(equipmentId);

    res.json(history);
  } catch (error) {
    console.error('Error getting equipment history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get inventory allocations for specific equipment
 * GET /api/inventory/equipment/:id/allocations
 */
router.get('/equipment/:id/allocations', authenticate, async (req, res) => {
  try {
    const equipmentId = parseInt(req.params.id);
    const { sequelize } = require('../config/database');

    // Get current allocations from inventory_allocation table
    const [allocations] = await sequelize.query(`
      SELECT
        ia.id,
        ia.equipment_id,
        ia.location_id,
        ia.custom_location,
        ia.quantity_allocated as quantity,
        ia.status,
        ia.allocation_type,
        ia.notes,
        ia.allocated_date,
        l.name as location_name
      FROM inventory_allocation ia
      LEFT JOIN locations l ON ia.location_id = l.id
      WHERE ia.equipment_id = ?
        AND ia.status IN ('allocated', 'in-use', 'reserved', 'maintenance')
      ORDER BY ia.allocated_date DESC
    `, { replacements: [equipmentId] });

    res.json(allocations);
  } catch (error) {
    console.error('Error getting equipment inventory allocations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Update inventory allocations for specific equipment
 * PUT /api/inventory/equipment/:id/allocations
 */
router.put('/equipment/:id/allocations', authenticate, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const equipmentId = parseInt(req.params.id);
    const { allocations } = req.body;
    const userId = req.user.id;

    console.log(`[INVENTORY] Updating allocations for equipment ${equipmentId}:`, allocations);

    // Clear existing allocations for this equipment
    await sequelize.query(`
      DELETE FROM inventory_allocation
      WHERE equipment_id = ? AND allocation_type = 'location'
    `, {
      replacements: [equipmentId],
      type: sequelize.QueryTypes.DELETE,
      transaction
    });

    console.log(`[INVENTORY] Cleared existing allocations for equipment ${equipmentId}`);

    // Create new allocations
    for (const allocation of allocations) {
      const insertData = {
        equipment_id: equipmentId,
        location_id: allocation.location_id || null,
        custom_location: allocation.location_name || null,
        quantity_allocated: allocation.quantity,
        status: allocation.status || 'allocated',
        allocation_type: 'location',
        allocated_by: userId,
        notes: allocation.notes || 'Location allocation',
        allocated_date: new Date()
      };

      await sequelize.query(`
        INSERT INTO inventory_allocation (
          equipment_id, location_id, custom_location, quantity_allocated,
          status, allocation_type, allocated_by, notes, allocated_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [
          insertData.equipment_id,
          insertData.location_id,
          insertData.custom_location,
          insertData.quantity_allocated,
          insertData.status,
          insertData.allocation_type,
          insertData.allocated_by,
          insertData.notes,
          insertData.allocated_date
        ],
        type: sequelize.QueryTypes.INSERT,
        transaction
      });

      console.log(`[INVENTORY] Created allocation: ${allocation.quantity} items to ${allocation.location_name || 'location ID ' + allocation.location_id}`);
    }

    await transaction.commit();

    res.json({
      success: true,
      message: 'Inventory allocations updated successfully'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[INVENTORY] Error updating allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inventory allocations',
      error: error.message
    });
  }
});

/**
 * Ensure locations table exists and create if needed
 * GET /api/inventory/setup-locations
 */
router.get('/setup-locations', authenticate, async (req, res) => {
  try {
    const { sequelize } = require('../config/database');

    // Check if locations table exists
    const [tables] = await sequelize.query(`
      SHOW TABLES LIKE 'locations'
    `);

    if (tables.length === 0) {
      console.log('Creating locations table...');

      // Create locations table
      await sequelize.query(`
        CREATE TABLE locations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          street VARCHAR(255),
          postal_code VARCHAR(20),
          city VARCHAR(100),
          region VARCHAR(100),
          country VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Insert some default locations
      await sequelize.query(`
        INSERT INTO locations (name, street, city) VALUES
        ('Main Storage', 'Theater Building', 'Main Theater'),
        ('Audio Storage', 'Sound Department', 'Main Theater'),
        ('Lighting Storage', 'Lighting Department', 'Main Theater'),
        ('Backstage Storage', 'Backstage Area', 'Main Theater'),
        ('Rehearsal Room A', 'Education Wing', 'Main Theater'),
        ('Control Booth', 'Upper Level', 'Main Theater')
      `);

      console.log('Locations table created with default locations');
      res.json({ message: 'Locations table created successfully', created: true });
    } else {
      console.log('Locations table already exists');
      res.json({ message: 'Locations table already exists', created: false });
    }
  } catch (error) {
    console.error('Error setting up locations table:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get all equipment with availability information
 * GET /api/inventory/equipment/availability
 */
router.get('/equipment/availability', authenticate, async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    
    const [results] = await sequelize.query(`
      SELECT 
        e.id as equipment_id,
        e.type,
        e.brand,
        e.model,
        e.serial_number,
        e.status as equipment_status,
        e.quantity as total_quantity,
        e.location as default_location,
        e.location_id as default_location_id,
        COALESCE(allocated.total_allocated, 0) as total_allocated,
        COALESCE(show_allocated.show_allocated, 0) as show_allocated,
        (e.quantity - COALESCE(allocated.total_allocated, 0) - COALESCE(show_allocated.show_allocated, 0)) as available_quantity
      FROM equipment e
      LEFT JOIN (
        SELECT 
          equipment_id,
          SUM(quantity_allocated) as total_allocated
        FROM inventory_allocation 
        WHERE status IN ('allocated', 'in-use', 'reserved')
        GROUP BY equipment_id
      ) allocated ON e.id = allocated.equipment_id
      LEFT JOIN (
        SELECT 
          equipment_id,
          SUM(quantity_allocated) as show_allocated
        FROM show_equipment 
        WHERE status IN ('requested', 'allocated', 'checked-out', 'in-use')
        GROUP BY equipment_id
      ) show_allocated ON e.id = show_allocated.equipment_id
      ORDER BY e.type, e.brand, e.model
    `);

    res.json(results);
  } catch (error) {
    console.error('Error getting equipment availability list:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get all locations with their current inventory
 * GET /api/inventory/locations
 */
router.get('/locations', authenticate, async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    
    const [results] = await sequelize.query(`
      SELECT 
        l.id as location_id,
        l.name as location_name,
        l.description as location_description,
        COUNT(ia.id) as total_allocations,
        SUM(ia.quantity_allocated) as total_quantity_allocated
      FROM locations l
      LEFT JOIN inventory_allocation ia ON l.id = ia.location_id 
        AND ia.status IN ('allocated', 'in-use', 'reserved')
      GROUP BY l.id, l.name, l.description
      ORDER BY l.name
    `);

    res.json(results);
  } catch (error) {
    console.error('Error getting locations inventory summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
