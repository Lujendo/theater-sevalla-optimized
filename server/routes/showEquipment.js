const express = require('express');
const router = express.Router();
const { ShowEquipment, Equipment, Show, User } = require('../models/associations');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');

// Get equipment for a specific show
router.get('/show/:showId', authenticate, async (req, res) => {
  try {
    const { showId } = req.params;
    
    const showEquipment = await ShowEquipment.findAll({
      where: { show_id: showId },
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
        },
        {
          model: User,
          as: 'returnedBy',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({ equipment: showEquipment });
  } catch (error) {
    console.error('Error fetching show equipment:', error);
    res.status(500).json({ message: 'Failed to fetch show equipment' });
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

    // Check if show exists
    const show = await Show.findByPk(showId);
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // Check if equipment exists
    const equipment = await Equipment.findByPk(equipmentId);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Check if equipment is already added to this show
    const existingEntry = await ShowEquipment.findOne({
      where: { show_id: showId, equipment_id: equipmentId }
    });

    if (existingEntry) {
      return res.status(400).json({ message: 'Equipment already added to this show' });
    }

    // Check equipment availability
    if (equipment.quantity < quantityNeeded) {
      return res.status(400).json({ 
        message: `Not enough equipment available. Available: ${equipment.quantity}, Requested: ${quantityNeeded}` 
      });
    }

    const showEquipment = await ShowEquipment.create({
      show_id: showId,
      equipment_id: equipmentId,
      quantity_needed: quantityNeeded,
      notes,
      created_by: req.user.id
    });

    // Fetch the created entry with associations
    const createdEntry = await ShowEquipment.findByPk(showEquipment.id, {
      include: [
        {
          model: Equipment,
          as: 'equipment',
          attributes: ['id', 'name', 'brand', 'model', 'serial_number', 'status', 'location', 'quantity']
        }
      ]
    });

    res.status(201).json(createdEntry);
  } catch (error) {
    console.error('Error adding equipment to show:', error);
    res.status(500).json({ message: 'Failed to add equipment to show' });
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
