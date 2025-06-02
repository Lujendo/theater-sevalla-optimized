const express = require('express');
const { authenticate, restrictTo } = require('../middleware/auth');
const equipmentLogService = require('../services/equipmentLogService');

const router = express.Router();

// Get all equipment logs (admin only)
router.get('/', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      equipmentId,
      userId,
      actionType,
      search,
      type,
      status,
      location_id,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    const filters = {};
    if (equipmentId) filters.equipmentId = equipmentId;
    if (userId) filters.userId = userId;
    if (actionType) filters.actionType = actionType;
    if (search) filters.search = search;
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (location_id) filters.location_id = location_id;

    const logs = await equipmentLogService.getAllLogs(filters, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy,
      sortOrder
    });

    res.json(logs);
  } catch (error) {
    console.error('Get all equipment logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get logs for a specific equipment
router.get('/equipment/:id', authenticate, async (req, res) => {
  try {
    const equipmentId = req.params.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const logs = await equipmentLogService.getEquipmentLogs(equipmentId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(logs);
  } catch (error) {
    console.error('Get equipment logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
