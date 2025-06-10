const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
// Use environment-aware models based on database type
const models = (process.env.NODE_ENV === 'development' && process.env.DB_TYPE === 'sqlite')
  ? require('../models/index.local')
  : require('../models');
const { Show, ShowEquipment, Equipment, User, Location, Category, sequelize } = models;
const inventoryService = require('../services/inventoryService');
const statusValidationService = require('../services/statusValidationService');

// Get equipment availability for show allocation
router.get('/equipment/:equipmentId/availability', authenticate, async (req, res) => {
  try {
    const { equipmentId } = req.params;

    const availability = await inventoryService.getEquipmentAvailability(equipmentId);

    if (!availability) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json(availability);
  } catch (error) {
    console.error('Error getting equipment availability:', error);
    res.status(500).json({ message: 'Failed to get equipment availability', error: error.message });
  }
});

// Get shows where equipment is allocated
router.get('/equipment/:equipmentId/shows', authenticate, async (req, res) => {
  try {
    const { equipmentId } = req.params;

    console.log('🔍 Getting show allocations for equipment:', equipmentId);

    // First, let's check if there are ANY records for this equipment in show_equipment table
    const [allRecords] = await sequelize.query(`
      SELECT * FROM show_equipment WHERE equipment_id = ?
    `, { replacements: [equipmentId] });

    console.log('🔍 Raw show_equipment records for this equipment:', allRecords.length);
    console.log('🔍 Raw records data:', allRecords);

    // If we have records, let's also check what shows exist
    if (allRecords.length > 0) {
      const showIds = [...new Set(allRecords.map(r => r.show_id))];
      console.log('🔍 Show IDs referenced:', showIds);

      const [shows] = await sequelize.query(`
        SELECT id, name FROM shows WHERE id IN (${showIds.map(() => '?').join(',')})
      `, { replacements: showIds });

      console.log('🔍 Shows found in database:', shows);
    }

    // Get all show allocations for this equipment
    const [allocations] = await sequelize.query(`
      SELECT
        se.*,
        s.name as show_name,
        s.date as show_date,
        s.venue,
        s.status as show_status
      FROM show_equipment se
      LEFT JOIN shows s ON se.show_id = s.id
      WHERE se.equipment_id = ?
      ORDER BY s.date DESC
    `, { replacements: [equipmentId] });

    console.log('🔍 Found show allocations after JOIN:', allocations.length);
    console.log('🔍 Show allocations data:', allocations);

    res.json(allocations);
  } catch (error) {
    console.error('Error getting equipment show allocations:', error);
    res.status(500).json({ message: 'Failed to get equipment show allocations', error: error.message });
  }
});

// Get specific show-equipment allocation
router.get('/show/:showId/equipment/:equipmentId', authenticate, async (req, res) => {
  try {
    const { showId, equipmentId } = req.params;

    const [allocation] = await sequelize.query(`
      SELECT * FROM show_equipment
      WHERE show_id = ? AND equipment_id = ?
      LIMIT 1
    `, { replacements: [showId, equipmentId] });

    if (allocation.length > 0) {
      res.json(allocation[0]);
    } else {
      res.status(404).json({ message: 'No allocation found for this equipment in this show' });
    }
  } catch (error) {
    console.error('Error getting specific show-equipment allocation:', error);
    res.status(500).json({ message: 'Failed to get show-equipment allocation', error: error.message });
  }
});

// Update show-equipment allocation (specific route for allocation updates)
router.put('/allocation/:allocationId', authenticate, async (req, res) => {
  try {
    const { allocationId } = req.params;
    const { quantityNeeded, quantityAllocated, notes, status } = req.body;

    console.log('Updating allocation:', { allocationId, quantityNeeded, quantityAllocated, notes, status });

    // Get current allocation details first
    const [currentAllocation] = await sequelize.query(`
      SELECT * FROM show_equipment WHERE id = ?
    `, { replacements: [allocationId] });

    if (currentAllocation.length === 0) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    const allocation = currentAllocation[0];

    // If status is being changed, validate the change
    if (status !== undefined && status !== allocation.status) {
      console.log('🔍 Validating status change from', allocation.status, 'to', status);

      const validation = await statusValidationService.validateStatusChange(
        allocation.equipment_id,
        allocationId,
        status,
        quantityNeeded || allocation.quantity_allocated
      );

      console.log('🔍 Status validation result:', validation);

      if (!validation.valid) {
        return res.status(400).json({
          message: 'Status change not allowed',
          conflicts: validation.conflicts,
          warnings: validation.warnings,
          currentAllocations: validation.currentAllocations
        });
      }

      // If there are warnings, include them in the response
      if (validation.warnings.length > 0) {
        console.log('⚠️ Status change warnings:', validation.warnings);
      }
    }

    // Build dynamic update query based on provided fields
    let updateFields = [];
    let replacements = [];

    if (quantityNeeded !== undefined) {
      updateFields.push('quantity_needed = ?');
      replacements.push(quantityNeeded);
    }

    if (quantityAllocated !== undefined) {
      updateFields.push('quantity_allocated = ?');
      replacements.push(quantityAllocated);
    }

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      replacements.push(notes);
    }

    if (status !== undefined) {
      updateFields.push('status = ?');
      replacements.push(status);
    }

    updateFields.push('updated_at = NOW()');
    replacements.push(allocationId);

    if (updateFields.length === 1) { // Only updated_at
      return res.status(400).json({ message: 'No fields to update' });
    }

    const [result] = await sequelize.query(`
      UPDATE show_equipment
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, { replacements });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    // Get the updated allocation with equipment details
    const [updated] = await sequelize.query(`
      SELECT
        se.*,
        e.type as equipment_name,
        e.brand as equipment_brand,
        e.model as equipment_model,
        e.serial_number as equipment_serial_number,
        e.status as equipment_status,
        e.location as equipment_location,
        e.quantity as equipment_quantity
      FROM show_equipment se
      LEFT JOIN equipment e ON se.equipment_id = e.id
      WHERE se.id = ?
    `, { replacements: [allocationId] });

    const updatedAllocation = updated[0];
    const formattedResponse = {
      id: updatedAllocation.id,
      show_id: updatedAllocation.show_id,
      equipment_id: updatedAllocation.equipment_id,
      quantity_needed: updatedAllocation.quantity_needed,
      quantity_allocated: updatedAllocation.quantity_allocated,
      notes: updatedAllocation.notes,
      status: updatedAllocation.status,
      equipment: {
        id: updatedAllocation.equipment_id,
        name: updatedAllocation.equipment_name,
        brand: updatedAllocation.equipment_brand,
        model: updatedAllocation.equipment_model,
        serial_number: updatedAllocation.equipment_serial_number,
        status: updatedAllocation.equipment_status,
        location: updatedAllocation.equipment_location,
        quantity: updatedAllocation.equipment_quantity
      },
      created_at: updatedAllocation.created_at,
      updated_at: updatedAllocation.updated_at
    };

    console.log('Allocation updated successfully:', formattedResponse);
    res.json(formattedResponse);
  } catch (error) {
    console.error('Error updating show-equipment allocation:', error);
    res.status(500).json({ message: 'Failed to update show-equipment allocation', error: error.message });
  }
});

// Validate status change for allocation
router.post('/allocation/:allocationId/validate-status', authenticate, async (req, res) => {
  try {
    const { allocationId } = req.params;
    const { newStatus, quantity } = req.body;

    // Get current allocation details
    const [currentAllocation] = await sequelize.query(`
      SELECT * FROM show_equipment WHERE id = ?
    `, { replacements: [allocationId] });

    if (currentAllocation.length === 0) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    const allocation = currentAllocation[0];

    // Validate the status change
    const validation = await statusValidationService.validateStatusChange(
      allocation.equipment_id,
      allocationId,
      newStatus,
      quantity || allocation.quantity_allocated
    );

    // Get suggested transitions
    const suggestedTransitions = statusValidationService.getSuggestedTransitions(
      allocation.status,
      validation.currentAllocations
    );

    res.json({
      ...validation,
      currentStatus: allocation.status,
      proposedStatus: newStatus,
      suggestedTransitions
    });

  } catch (error) {
    console.error('Error validating status change:', error);
    res.status(500).json({ message: 'Failed to validate status change', error: error.message });
  }
});

// Get equipment for a specific show
router.get('/show/:showId', authenticate, async (req, res) => {
  try {
    const { showId } = req.params;

    // Check if show_equipment table exists
    try {
      await sequelize.query("DESCRIBE `show_equipment`");

      // Table exists, fetch equipment
      const showEquipmentQuery = `
        SELECT
          se.*,
          e.type as equipment_name,
          e.brand as equipment_brand,
          e.model as equipment_model,
          e.serial_number as equipment_serial_number,
          e.status as equipment_status,
          e.location as equipment_location,
          e.quantity as equipment_quantity,
          checked_out_user.username as checked_out_username,
          returned_user.username as returned_username
        FROM show_equipment se
        LEFT JOIN equipment e ON se.equipment_id = e.id
        LEFT JOIN users checked_out_user ON se.checked_out_by = checked_out_user.id
        LEFT JOIN users returned_user ON se.returned_by = returned_user.id
        WHERE se.show_id = ?
        ORDER BY se.created_at ASC
      `;

      const [showEquipment] = await sequelize.query(showEquipmentQuery, {
        replacements: [showId]
      });

      // Format the response to match expected structure
      const formattedEquipment = showEquipment.map(item => ({
        id: item.id,
        show_id: item.show_id,
        equipment_id: item.equipment_id,
        quantity_needed: item.quantity_needed,
        quantity_allocated: item.quantity_allocated,
        status: item.status,
        notes: item.notes,
        checkout_date: item.checkout_date,
        return_date: item.return_date,
        checked_out_by: item.checked_out_by,
        returned_by: item.returned_by,
        created_by: item.created_by,
        created_at: item.created_at,
        updated_at: item.updated_at,
        equipment: {
          id: item.equipment_id,
          name: item.equipment_name,
          brand: item.equipment_brand,
          model: item.equipment_model,
          serial_number: item.equipment_serial_number,
          status: item.equipment_status,
          location: item.equipment_location,
          quantity: item.equipment_quantity
        },
        checkedOutBy: item.checked_out_username ? {
          id: item.checked_out_by,
          username: item.checked_out_username
        } : null,
        returnedBy: item.returned_username ? {
          id: item.returned_by,
          username: item.returned_username
        } : null
      }));

      res.json({ equipment: formattedEquipment });
    } catch (tableError) {
      console.log('show_equipment table does not exist yet, returning empty equipment list');
      res.json({ equipment: [] });
    }
  } catch (error) {
    console.error('Error fetching show equipment:', error);
    res.status(500).json({ message: 'Failed to fetch show equipment', error: error.message });
  }
});

// Add equipment to show
router.post('/show/:showId/equipment', authenticate, async (req, res) => {
  try {
    const { showId } = req.params;
    const { equipmentId, quantityNeeded, notes } = req.body;

    console.log('Add equipment request:', {
      showId,
      equipmentId,
      quantityNeeded,
      notes,
      userId: req.user?.id,
      userObject: req.user,
      userIdType: typeof req.user?.id,
      userIdValue: req.user?.id
    });

    if (!equipmentId || !quantityNeeded) {
      return res.status(400).json({ message: 'Equipment ID and quantity needed are required' });
    }

    if (!req.user || !req.user.id) {
      console.error('User authentication failed:', {
        hasUser: !!req.user,
        userId: req.user?.id,
        userObject: req.user
      });
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Verify show exists using Sequelize
    const show = await Show.findByPk(showId);
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // Verify equipment exists using Sequelize
    const equipment = await Equipment.findByPk(equipmentId);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Check if equipment is already allocated to this show using raw SQL
    const [existingAllocations] = await sequelize.query(
      'SELECT id FROM show_equipment WHERE show_id = ? AND equipment_id = ? LIMIT 1',
      { replacements: [showId, equipmentId] }
    );

    if (existingAllocations.length > 0) {
      return res.status(400).json({
        message: 'Equipment already added to this show. Use update endpoint to modify allocation.',
        existingAllocationId: existingAllocations[0].id
      });
    }

    // Check equipment availability using the new inventory service
    const availability = await inventoryService.getEquipmentAvailability(equipmentId);

    console.log('Equipment availability check:', {
      equipmentId,
      totalQuantity: availability.total_quantity,
      totalAllocated: availability.total_allocated,
      showAllocated: availability.show_allocated,
      available: availability.available_quantity,
      requested: quantityNeeded
    });

    // Validate equipment availability
    if (availability.total_quantity <= 0) {
      return res.status(400).json({
        message: `Equipment is not available (total quantity: ${availability.total_quantity}). Please check equipment status.`,
        details: {
          totalQuantity: availability.total_quantity,
          totalAllocated: availability.total_allocated,
          showAllocated: availability.show_allocated,
          available: 0
        }
      });
    }

    if (availability.available_quantity < quantityNeeded) {
      return res.status(400).json({
        message: `Not enough equipment available. Available: ${availability.available_quantity}, Requested: ${quantityNeeded}`,
        details: {
          totalQuantity: availability.total_quantity,
          totalAllocated: availability.total_allocated,
          showAllocated: availability.show_allocated,
          available: availability.available_quantity,
          requested: quantityNeeded
        }
      });
    }

    // Create the allocation using raw SQL to avoid Sequelize issues
    const createData = {
      show_id: showId,
      equipment_id: equipmentId,
      quantity_needed: quantityNeeded,
      quantity_allocated: quantityNeeded,
      notes: notes || null,
      status: 'allocated', // Changed from 'requested' to 'allocated' so it counts toward "IN SHOWS"
      created_by: req.user.id
    };

    console.log('Creating ShowEquipment with data:', createData);
    console.log('User ID being used:', req.user.id, 'Type:', typeof req.user.id);

    // Use raw SQL to insert the record
    const [insertResult] = await sequelize.query(
      'INSERT INTO show_equipment (show_id, equipment_id, quantity_needed, quantity_allocated, status, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      {
        replacements: [showId, equipmentId, quantityNeeded, quantityNeeded, 'allocated', notes || null, req.user.id], // Changed from 'requested' to 'allocated'
        type: sequelize.QueryTypes.INSERT
      }
    );

    const showEquipmentId = insertResult;

    // Fetch the created allocation with equipment details using raw SQL
    const [createdAllocations] = await sequelize.query(`
      SELECT
        se.*,
        e.type as equipment_name,
        e.brand as equipment_brand,
        e.model as equipment_model,
        e.serial_number as equipment_serial_number,
        e.status as equipment_status,
        e.location as equipment_location,
        e.quantity as equipment_quantity
      FROM show_equipment se
      LEFT JOIN equipment e ON se.equipment_id = e.id
      WHERE se.id = ?
    `, { replacements: [showEquipmentId] });

    const createdAllocation = createdAllocations[0];

    res.status(201).json({
      id: createdAllocation.id,
      show_id: createdAllocation.show_id,
      equipment_id: createdAllocation.equipment_id,
      quantity_needed: createdAllocation.quantity_needed,
      quantity_allocated: createdAllocation.quantity_allocated,
      notes: createdAllocation.notes,
      status: createdAllocation.status,
      equipment: {
        id: createdAllocation.equipment_id,
        name: createdAllocation.equipment_name,
        brand: createdAllocation.equipment_brand,
        model: createdAllocation.equipment_model,
        serial_number: createdAllocation.equipment_serial_number,
        status: createdAllocation.equipment_status,
        location: createdAllocation.equipment_location,
        quantity: createdAllocation.equipment_quantity
      },
      created_at: createdAllocation.created_at,
      updated_at: createdAllocation.updated_at
    });
  } catch (error) {
    console.error('Error adding equipment to show:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('Request params:', req.params);
    console.error('User:', req.user);
    res.status(500).json({ message: 'Failed to add equipment to show', error: error.message });
  }
});

// Update show equipment (legacy endpoint with validation)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const showEquipmentId = req.params.id;
    const { quantityNeeded, quantityAllocated, status, notes } = req.body;

    console.log('Legacy update endpoint called:', { showEquipmentId, quantityNeeded, quantityAllocated, status, notes });

    // Check if show equipment entry exists
    const [showEquipmentEntries] = await sequelize.query(
      'SELECT * FROM show_equipment WHERE id = ?',
      { replacements: [showEquipmentId] }
    );

    if (!showEquipmentEntries.length) {
      return res.status(404).json({ message: 'Show equipment entry not found' });
    }

    const allocation = showEquipmentEntries[0];

    // If status is being changed, validate the change
    if (status !== undefined && status !== allocation.status) {
      console.log('🔍 Legacy endpoint: Validating status change from', allocation.status, 'to', status);

      const validation = await statusValidationService.validateStatusChange(
        allocation.equipment_id,
        showEquipmentId,
        status,
        quantityAllocated || quantityNeeded || allocation.quantity_allocated
      );

      console.log('🔍 Legacy endpoint: Status validation result:', validation);

      if (!validation.valid) {
        return res.status(400).json({
          message: 'Status change not allowed',
          conflicts: validation.conflicts,
          warnings: validation.warnings,
          currentAllocations: validation.currentAllocations
        });
      }

      // If there are warnings, include them in the response
      if (validation.warnings.length > 0) {
        console.log('⚠️ Legacy endpoint: Status change warnings:', validation.warnings);
      }
    }

    // Update show equipment
    await sequelize.query(
      'UPDATE show_equipment SET quantity_needed = ?, quantity_allocated = ?, status = ?, notes = ?, updated_at = NOW() WHERE id = ?',
      { replacements: [quantityNeeded, quantityAllocated, status, notes, showEquipmentId] }
    );

    // Fetch updated entry with equipment details
    const [updatedEntries] = await sequelize.query(`
      SELECT
        se.*,
        e.type as equipment_name,
        e.brand as equipment_brand,
        e.model as equipment_model,
        e.serial_number as equipment_serial_number,
        e.status as equipment_status,
        e.location as equipment_location,
        e.quantity as equipment_quantity
      FROM show_equipment se
      LEFT JOIN equipment e ON se.equipment_id = e.id
      WHERE se.id = ?
    `, { replacements: [showEquipmentId] });

    const updatedEntry = updatedEntries[0];
    const formattedEntry = {
      id: updatedEntry.id,
      show_id: updatedEntry.show_id,
      equipment_id: updatedEntry.equipment_id,
      quantity_needed: updatedEntry.quantity_needed,
      quantity_allocated: updatedEntry.quantity_allocated,
      status: updatedEntry.status,
      notes: updatedEntry.notes,
      equipment: {
        id: updatedEntry.equipment_id,
        name: updatedEntry.equipment_name,
        brand: updatedEntry.equipment_brand,
        model: updatedEntry.equipment_model,
        serial_number: updatedEntry.equipment_serial_number,
        status: updatedEntry.equipment_status,
        location: updatedEntry.equipment_location,
        quantity: updatedEntry.equipment_quantity
      }
    };

    res.json(formattedEntry);
  } catch (error) {
    console.error('Error updating show equipment:', error);
    res.status(500).json({ message: 'Failed to update show equipment' });
  }
});

// Check out equipment
router.post('/:id/checkout', authenticate, async (req, res) => {
  try {
    const showEquipmentId = req.params.id;

    // Check if show equipment entry exists
    const [showEquipmentEntries] = await sequelize.query(
      'SELECT * FROM show_equipment WHERE id = ?',
      { replacements: [showEquipmentId] }
    );

    if (!showEquipmentEntries.length) {
      return res.status(404).json({ message: 'Show equipment entry not found' });
    }

    const showEquipment = showEquipmentEntries[0];

    // Validate status change to 'checked-out'
    console.log('🔍 Checkout endpoint: Validating status change from', showEquipment.status, 'to checked-out');

    const validation = await statusValidationService.validateStatusChange(
      showEquipment.equipment_id,
      showEquipmentId,
      'checked-out',
      showEquipment.quantity_allocated
    );

    console.log('🔍 Checkout endpoint: Status validation result:', validation);

    if (!validation.valid) {
      return res.status(400).json({
        message: 'Checkout not allowed',
        conflicts: validation.conflicts,
        warnings: validation.warnings,
        currentAllocations: validation.currentAllocations
      });
    }

    // Update show equipment status
    await sequelize.query(
      'UPDATE show_equipment SET status = ?, checkout_date = NOW(), checked_out_by = ? WHERE id = ?',
      { replacements: ['checked-out', req.user.id, showEquipmentId] }
    );

    // Update equipment status to 'in-use'
    await sequelize.query(
      'UPDATE equipment SET status = ? WHERE id = ?',
      { replacements: ['in-use', showEquipment.equipment_id] }
    );

    // Fetch updated entry with equipment details
    const [updatedEntries] = await sequelize.query(`
      SELECT
        se.*,
        e.type as equipment_name,
        e.brand as equipment_brand,
        e.model as equipment_model,
        e.serial_number as equipment_serial_number,
        e.status as equipment_status,
        e.location as equipment_location,
        e.quantity as equipment_quantity,
        u.username as checked_out_username
      FROM show_equipment se
      LEFT JOIN equipment e ON se.equipment_id = e.id
      LEFT JOIN users u ON se.checked_out_by = u.id
      WHERE se.id = ?
    `, { replacements: [showEquipmentId] });

    const updatedEntry = updatedEntries[0];
    const formattedEntry = {
      id: updatedEntry.id,
      show_id: updatedEntry.show_id,
      equipment_id: updatedEntry.equipment_id,
      quantity_needed: updatedEntry.quantity_needed,
      quantity_allocated: updatedEntry.quantity_allocated,
      status: updatedEntry.status,
      notes: updatedEntry.notes,
      checkout_date: updatedEntry.checkout_date,
      checked_out_by: updatedEntry.checked_out_by,
      equipment: {
        id: updatedEntry.equipment_id,
        name: updatedEntry.equipment_name,
        brand: updatedEntry.equipment_brand,
        model: updatedEntry.equipment_model,
        serial_number: updatedEntry.equipment_serial_number,
        status: updatedEntry.equipment_status,
        location: updatedEntry.equipment_location,
        quantity: updatedEntry.equipment_quantity
      },
      checkedOutBy: updatedEntry.checked_out_username ? {
        id: updatedEntry.checked_out_by,
        username: updatedEntry.checked_out_username
      } : null
    };

    res.json(formattedEntry);
  } catch (error) {
    console.error('Error checking out equipment:', error);
    res.status(500).json({ message: 'Failed to check out equipment' });
  }
});

// Return equipment
router.post('/:id/return', authenticate, async (req, res) => {
  try {
    const showEquipmentId = req.params.id;

    // Check if show equipment entry exists
    const [showEquipmentEntries] = await sequelize.query(
      'SELECT * FROM show_equipment WHERE id = ?',
      { replacements: [showEquipmentId] }
    );

    if (!showEquipmentEntries.length) {
      return res.status(404).json({ message: 'Show equipment entry not found' });
    }

    const showEquipment = showEquipmentEntries[0];

    // Validate status change to 'returned'
    console.log('🔍 Return endpoint: Validating status change from', showEquipment.status, 'to returned');

    const validation = await statusValidationService.validateStatusChange(
      showEquipment.equipment_id,
      showEquipmentId,
      'returned',
      showEquipment.quantity_allocated
    );

    console.log('🔍 Return endpoint: Status validation result:', validation);

    if (!validation.valid) {
      return res.status(400).json({
        message: 'Return not allowed',
        conflicts: validation.conflicts,
        warnings: validation.warnings,
        currentAllocations: validation.currentAllocations
      });
    }

    // Update show equipment status
    await sequelize.query(
      'UPDATE show_equipment SET status = ?, return_date = NOW(), returned_by = ? WHERE id = ?',
      { replacements: ['returned', req.user.id, showEquipmentId] }
    );

    // Update equipment status back to 'available'
    await sequelize.query(
      'UPDATE equipment SET status = ? WHERE id = ?',
      { replacements: ['available', showEquipment.equipment_id] }
    );

    // Fetch updated entry with equipment details
    const [updatedEntries] = await sequelize.query(`
      SELECT
        se.*,
        e.type as equipment_name,
        e.brand as equipment_brand,
        e.model as equipment_model,
        e.serial_number as equipment_serial_number,
        e.status as equipment_status,
        e.location as equipment_location,
        e.quantity as equipment_quantity,
        u.username as returned_username
      FROM show_equipment se
      LEFT JOIN equipment e ON se.equipment_id = e.id
      LEFT JOIN users u ON se.returned_by = u.id
      WHERE se.id = ?
    `, { replacements: [showEquipmentId] });

    const updatedEntry = updatedEntries[0];
    const formattedEntry = {
      id: updatedEntry.id,
      show_id: updatedEntry.show_id,
      equipment_id: updatedEntry.equipment_id,
      quantity_needed: updatedEntry.quantity_needed,
      quantity_allocated: updatedEntry.quantity_allocated,
      status: updatedEntry.status,
      notes: updatedEntry.notes,
      return_date: updatedEntry.return_date,
      returned_by: updatedEntry.returned_by,
      equipment: {
        id: updatedEntry.equipment_id,
        name: updatedEntry.equipment_name,
        brand: updatedEntry.equipment_brand,
        model: updatedEntry.equipment_model,
        serial_number: updatedEntry.equipment_serial_number,
        status: updatedEntry.equipment_status,
        location: updatedEntry.equipment_location,
        quantity: updatedEntry.equipment_quantity
      },
      returnedBy: updatedEntry.returned_username ? {
        id: updatedEntry.returned_by,
        username: updatedEntry.returned_username
      } : null
    };

    res.json(formattedEntry);
  } catch (error) {
    console.error('Error returning equipment:', error);
    res.status(500).json({ message: 'Failed to return equipment' });
  }
});

// Remove equipment from show
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const showEquipmentId = req.params.id;

    // Check if show equipment entry exists
    const [showEquipmentEntries] = await sequelize.query(
      'SELECT * FROM show_equipment WHERE id = ?',
      { replacements: [showEquipmentId] }
    );

    if (!showEquipmentEntries.length) {
      return res.status(404).json({ message: 'Show equipment entry not found' });
    }

    const showEquipment = showEquipmentEntries[0];

    if (showEquipment.status === 'checked-out' || showEquipment.status === 'in-use') {
      return res.status(400).json({
        message: 'Cannot remove checked-out equipment. Please return it first.'
      });
    }

    // Delete the show equipment entry
    await sequelize.query(
      'DELETE FROM show_equipment WHERE id = ?',
      { replacements: [showEquipmentId] }
    );

    res.json({ message: 'Equipment removed from show successfully' });
  } catch (error) {
    console.error('Error removing equipment from show:', error);
    res.status(500).json({ message: 'Failed to remove equipment from show' });
  }
});

// Get equipment availability for a specific equipment item
router.get('/equipment/:equipmentId/availability', authenticate, async (req, res) => {
  try {
    const equipmentId = req.params.equipmentId;

    // Get equipment details using raw SQL
    const [equipmentResults] = await sequelize.query(
      'SELECT * FROM equipment WHERE id = ?',
      { replacements: [equipmentId] }
    );

    if (!equipmentResults.length) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const equipment = equipmentResults[0];

    // Get all allocations for this equipment
    const [allocations] = await sequelize.query(`
      SELECT
        se.*,
        s.name as show_name,
        s.date as show_date,
        s.status as show_status
      FROM show_equipment se
      LEFT JOIN shows s ON se.show_id = s.id
      WHERE se.equipment_id = ? AND se.status IN ('requested', 'allocated', 'checked-out', 'in-use')
      ORDER BY s.date ASC
    `, { replacements: [equipmentId] });

    // Calculate totals
    const totalAllocated = allocations.reduce((sum, allocation) => sum + allocation.quantity_needed, 0);
    const available = equipment.quantity - totalAllocated;

    res.json({
      equipment: {
        id: equipment.id,
        type: equipment.type,
        brand: equipment.brand,
        model: equipment.model,
        totalQuantity: equipment.quantity,
        status: equipment.status
      },
      availability: {
        totalQuantity: equipment.quantity,
        totalAllocated,
        available,
        allocations: allocations.map(allocation => ({
          id: allocation.id,
          showId: allocation.show_id,
          showName: allocation.show_name,
          showDate: allocation.show_date,
          showStatus: allocation.show_status,
          quantityNeeded: allocation.quantity_needed,
          quantityAllocated: allocation.quantity_allocated,
          status: allocation.status,
          notes: allocation.notes
        }))
      }
    });
  } catch (error) {
    console.error('Error getting equipment availability:', error);
    res.status(500).json({ message: 'Failed to get equipment availability' });
  }
});

module.exports = router;
