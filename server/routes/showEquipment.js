const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { sequelize } = require('../config/database');

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

    // Debug logging
    console.log('Add equipment request:', {
      showId,
      equipmentId,
      quantityNeeded,
      notes,
      userId: req.user?.id
    });

    if (!equipmentId || !quantityNeeded) {
      return res.status(400).json({ message: 'Equipment ID and quantity needed are required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Check if show_equipment table exists
    try {
      await sequelize.query("DESCRIBE `show_equipment`");
    } catch (tableError) {
      return res.status(400).json({
        message: 'Equipment management not available. Please create the show_equipment table first.'
      });
    }

    // Check if show exists
    const [shows] = await sequelize.query('SELECT id FROM shows WHERE id = ?', {
      replacements: [showId]
    });

    if (!shows.length) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // Check if equipment exists
    const [equipment] = await sequelize.query('SELECT id, type, brand, model, quantity FROM equipment WHERE id = ?', {
      replacements: [equipmentId]
    });

    if (!equipment.length) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const equipmentItem = equipment[0];

    // Check if equipment is already added to this show
    const [existingEntries] = await sequelize.query(
      'SELECT id FROM show_equipment WHERE show_id = ? AND equipment_id = ?',
      { replacements: [showId, equipmentId] }
    );

    if (existingEntries.length > 0) {
      return res.status(400).json({ message: 'Equipment already added to this show' });
    }

    // Check equipment availability
    console.log('Equipment availability check:', {
      available: equipmentItem.quantity,
      requested: quantityNeeded,
      equipmentId: equipmentId
    });

    if (equipmentItem.quantity <= 0) {
      return res.status(400).json({
        message: `Equipment is not available (quantity: ${equipmentItem.quantity}). Please check equipment status.`
      });
    }

    if (equipmentItem.quantity < quantityNeeded) {
      return res.status(400).json({
        message: `Not enough equipment available. Available: ${equipmentItem.quantity}, Requested: ${quantityNeeded}`
      });
    }

    // Insert new show equipment entry
    const insertQuery = `
      INSERT INTO show_equipment (show_id, equipment_id, quantity_needed, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;

    // Ensure all parameters are defined
    const replacements = [
      parseInt(showId),
      parseInt(equipmentId),
      parseInt(quantityNeeded),
      notes || null,
      req.user.id
    ];

    console.log('SQL replacements:', replacements);

    let result;
    try {
      [result] = await sequelize.query(insertQuery, {
        replacements
      });
      console.log('Insert result:', result);
      console.log('Insert result type:', typeof result);
      console.log('Insert result keys:', Object.keys(result || {}));
    } catch (insertError) {
      console.error('INSERT query failed:', insertError);
      throw new Error(`Failed to insert equipment into show: ${insertError.message}`);
    }

    // Get the inserted ID - different for different SQL dialects
    const insertedId = result.insertId || result[0]?.insertId || result[0]?.id;
    console.log('Inserted ID:', insertedId);

    if (!insertedId) {
      throw new Error('Failed to get inserted record ID');
    }

    // Fetch the created entry
    const [createdEntries] = await sequelize.query(`
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
    `, { replacements: [insertedId] });

    const createdEntry = createdEntries[0];
    const formattedEntry = {
      id: createdEntry.id,
      show_id: createdEntry.show_id,
      equipment_id: createdEntry.equipment_id,
      quantity_needed: createdEntry.quantity_needed,
      quantity_allocated: createdEntry.quantity_allocated,
      status: createdEntry.status,
      notes: createdEntry.notes,
      equipment: {
        id: createdEntry.equipment_id,
        name: createdEntry.equipment_name,
        brand: createdEntry.equipment_brand,
        model: createdEntry.equipment_model,
        serial_number: createdEntry.equipment_serial_number,
        status: createdEntry.equipment_status,
        location: createdEntry.equipment_location,
        quantity: createdEntry.equipment_quantity
      }
    };

    res.status(201).json(formattedEntry);
  } catch (error) {
    console.error('Error adding equipment to show:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('Request params:', req.params);
    console.error('User:', req.user);
    res.status(500).json({ message: 'Failed to add equipment to show', error: error.message });
  }
});

// Update show equipment
router.put('/:id', authenticate, async (req, res) => {
  try {
    const showEquipmentId = req.params.id;
    const { quantityNeeded, quantityAllocated, status, notes } = req.body;

    // Check if show equipment entry exists
    const [showEquipmentEntries] = await sequelize.query(
      'SELECT * FROM show_equipment WHERE id = ?',
      { replacements: [showEquipmentId] }
    );

    if (!showEquipmentEntries.length) {
      return res.status(404).json({ message: 'Show equipment entry not found' });
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

    if (showEquipment.status === 'checked-out' || showEquipment.status === 'in-use') {
      return res.status(400).json({ message: 'Equipment already checked out' });
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

    if (showEquipment.status === 'returned') {
      return res.status(400).json({ message: 'Equipment already returned' });
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

module.exports = router;
