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
          e.name as equipment_name,
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

    if (!equipmentId || !quantityNeeded) {
      return res.status(400).json({ message: 'Equipment ID and quantity needed are required' });
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
    const [equipment] = await sequelize.query('SELECT id, name, quantity FROM equipment WHERE id = ?', {
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

    const [result] = await sequelize.query(insertQuery, {
      replacements: [showId, equipmentId, quantityNeeded, notes, req.user.id]
    });

    // Fetch the created entry
    const [createdEntries] = await sequelize.query(`
      SELECT
        se.*,
        e.name as equipment_name,
        e.brand as equipment_brand,
        e.model as equipment_model,
        e.serial_number as equipment_serial_number,
        e.status as equipment_status,
        e.location as equipment_location,
        e.quantity as equipment_quantity
      FROM show_equipment se
      LEFT JOIN equipment e ON se.equipment_id = e.id
      WHERE se.id = ?
    `, { replacements: [result.insertId] });

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
    res.status(500).json({ message: 'Failed to add equipment to show', error: error.message });
  }
});

// Update show equipment
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { quantityNeeded, quantityAllocated, status, notes } = req.body;
    
    const showEquipment = await ShowEquipment.findByPk(req.params.id);
    if (!showEquipment) {
      return res.status(404).json({ message: 'Show equipment entry not found' });
    }

    await showEquipment.update({
      quantity_needed: quantityNeeded,
      quantity_allocated: quantityAllocated,
      status,
      notes
    });

    // Fetch updated entry with associations
    const updatedEntry = await ShowEquipment.findByPk(showEquipment.id, {
      include: [
        {
          model: Equipment,
          as: 'equipment',
          attributes: ['id', 'name', 'brand', 'model', 'serial_number', 'status', 'location', 'quantity']
        }
      ]
    });

    res.json(updatedEntry);
  } catch (error) {
    console.error('Error updating show equipment:', error);
    res.status(500).json({ message: 'Failed to update show equipment' });
  }
});

// Check out equipment
router.post('/:id/checkout', authenticate, async (req, res) => {
  try {
    const showEquipment = await ShowEquipment.findByPk(req.params.id, {
      include: [
        {
          model: Equipment,
          as: 'equipment'
        }
      ]
    });

    if (!showEquipment) {
      return res.status(404).json({ message: 'Show equipment entry not found' });
    }

    if (showEquipment.status === 'checked-out' || showEquipment.status === 'in-use') {
      return res.status(400).json({ message: 'Equipment already checked out' });
    }

    await showEquipment.update({
      status: 'checked-out',
      checkout_date: new Date(),
      checked_out_by: req.user.id
    });

    // Update equipment status to 'in-use'
    await showEquipment.equipment.update({
      status: 'in-use'
    });

    const updatedEntry = await ShowEquipment.findByPk(showEquipment.id, {
      include: [
        {
          model: Equipment,
          as: 'equipment',
          attributes: ['id', 'name', 'brand', 'model', 'serial_number', 'status', 'location', 'quantity']
        },
        {
          model: User,
          as: 'checkedOutBy',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    res.json(updatedEntry);
  } catch (error) {
    console.error('Error checking out equipment:', error);
    res.status(500).json({ message: 'Failed to check out equipment' });
  }
});

// Return equipment
router.post('/:id/return', authenticate, async (req, res) => {
  try {
    const showEquipment = await ShowEquipment.findByPk(req.params.id, {
      include: [
        {
          model: Equipment,
          as: 'equipment'
        }
      ]
    });

    if (!showEquipment) {
      return res.status(404).json({ message: 'Show equipment entry not found' });
    }

    if (showEquipment.status === 'returned') {
      return res.status(400).json({ message: 'Equipment already returned' });
    }

    await showEquipment.update({
      status: 'returned',
      return_date: new Date(),
      returned_by: req.user.id
    });

    // Update equipment status back to 'available'
    await showEquipment.equipment.update({
      status: 'available'
    });

    const updatedEntry = await ShowEquipment.findByPk(showEquipment.id, {
      include: [
        {
          model: Equipment,
          as: 'equipment',
          attributes: ['id', 'name', 'brand', 'model', 'serial_number', 'status', 'location', 'quantity']
        },
        {
          model: User,
          as: 'returnedBy',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    res.json(updatedEntry);
  } catch (error) {
    console.error('Error returning equipment:', error);
    res.status(500).json({ message: 'Failed to return equipment' });
  }
});

// Remove equipment from show
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const showEquipment = await ShowEquipment.findByPk(req.params.id);
    if (!showEquipment) {
      return res.status(404).json({ message: 'Show equipment entry not found' });
    }

    if (showEquipment.status === 'checked-out' || showEquipment.status === 'in-use') {
      return res.status(400).json({ 
        message: 'Cannot remove checked-out equipment. Please return it first.' 
      });
    }

    await showEquipment.destroy();
    res.json({ message: 'Equipment removed from show successfully' });
  } catch (error) {
    console.error('Error removing equipment from show:', error);
    res.status(500).json({ message: 'Failed to remove equipment from show' });
  }
});

module.exports = router;
