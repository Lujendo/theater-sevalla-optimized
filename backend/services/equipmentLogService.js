const { EquipmentLog, Equipment, User } = require('../models');

/**
 * Service for handling equipment movement logs
 */
const equipmentLogService = {
  /**
   * Create a log entry for equipment creation
   * @param {number} equipmentId - ID of the equipment
   * @param {number} userId - ID of the user who performed the action
   * @param {Object} equipmentData - The equipment data
   * @returns {Promise<Object>} The created log entry
   */
  async logCreation(equipmentId, userId, equipmentData) {
    try {
      return await EquipmentLog.create({
        equipment_id: equipmentId,
        user_id: userId,
        action_type: 'created',
        new_status: equipmentData.status,
        new_location: equipmentData.location,
        details: `Equipment created with serial number: ${equipmentData.serial_number}`
      });
    } catch (error) {
      console.error('Error logging equipment creation:', error);
      throw error;
    }
  },

  /**
   * Create a log entry for equipment update
   * @param {number} equipmentId - ID of the equipment
   * @param {number} userId - ID of the user who performed the action
   * @param {Object} oldData - The old equipment data
   * @param {Object} newData - The new equipment data
   * @returns {Promise<Object>} The created log entry
   */
  async logUpdate(equipmentId, userId, oldData, newData) {
    try {
      const changes = [];
      let actionType = 'updated';

      // Check for status change
      const statusChanged = oldData.status !== newData.status && newData.status !== undefined;
      if (statusChanged) {
        actionType = 'status_change';
        changes.push(`Status changed from "${oldData.status}" to "${newData.status}"`);
      }

      // Check for location change
      const locationChanged = oldData.location !== newData.location && newData.location !== undefined;
      if (locationChanged && !statusChanged) {
        actionType = 'location_change';
      }
      if (locationChanged) {
        const oldLocation = oldData.location || 'none';
        const newLocation = newData.location || 'none';
        changes.push(`Location changed from "${oldLocation}" to "${newLocation}"`);
      }

      // Check for other changes
      if (oldData.brand !== newData.brand && newData.brand !== undefined) {
        changes.push(`Brand changed from "${oldData.brand}" to "${newData.brand}"`);
      }

      if (oldData.model !== newData.model && newData.model !== undefined) {
        changes.push(`Model changed from "${oldData.model}" to "${newData.model}"`);
      }

      if (oldData.serial_number !== newData.serial_number && newData.serial_number !== undefined) {
        changes.push(`Serial number changed from "${oldData.serial_number}" to "${newData.serial_number}"`);
      }

      if (oldData.type !== newData.type && newData.type !== undefined) {
        changes.push(`Type changed from "${oldData.type}" to "${newData.type}"`);
      }

      return await EquipmentLog.create({
        equipment_id: equipmentId,
        user_id: userId,
        action_type: actionType,
        previous_status: statusChanged ? oldData.status : null,
        new_status: statusChanged ? newData.status : null,
        previous_location: locationChanged ? (oldData.location || null) : null,
        new_location: locationChanged ? (newData.location || null) : null,
        details: changes.join('; ')
      });
    } catch (error) {
      console.error('Error logging equipment update:', error);
      throw error;
    }
  },

  /**
   * Create a log entry for equipment deletion
   * @param {number} equipmentId - ID of the equipment
   * @param {number} userId - ID of the user who performed the action
   * @param {Object} equipmentData - The equipment data
   * @param {Object} [transaction] - Optional transaction for database operations
   * @returns {Promise<Object>} The created log entry
   */
  async logDeletion(equipmentId, userId, equipmentData, transaction = null) {
    try {
      return await EquipmentLog.create({
        equipment_id: equipmentId,
        user_id: userId,
        action_type: 'deleted',
        previous_status: equipmentData.status,
        previous_location: equipmentData.location,
        details: `Equipment with serial number "${equipmentData.serial_number}" was deleted`
      }, transaction ? { transaction } : {});
    } catch (error) {
      console.error('Error logging equipment deletion:', error);
      throw error;
    }
  },

  /**
   * Create a log entry for equipment status change
   * @param {number} equipmentId - ID of the equipment
   * @param {number} userId - ID of the user who performed the action
   * @param {string} oldStatus - The previous status
   * @param {string} newStatus - The new status
   * @returns {Promise<Object>} The created log entry
   */
  async logStatusChange(equipmentId, userId, oldStatus, newStatus) {
    try {
      return await EquipmentLog.create({
        equipment_id: equipmentId,
        user_id: userId,
        action_type: 'status_change',
        previous_status: oldStatus,
        new_status: newStatus,
        details: `Status changed from "${oldStatus}" to "${newStatus}"`
      });
    } catch (error) {
      console.error('Error logging equipment status change:', error);
      throw error;
    }
  },

  /**
   * Create a log entry for equipment location change
   * @param {number} equipmentId - ID of the equipment
   * @param {number} userId - ID of the user who performed the action
   * @param {string} oldLocation - The previous location
   * @param {string} newLocation - The new location
   * @returns {Promise<Object>} The created log entry
   */
  async logLocationChange(equipmentId, userId, oldLocation, newLocation) {
    try {
      return await EquipmentLog.create({
        equipment_id: equipmentId,
        user_id: userId,
        action_type: 'location_change',
        previous_location: oldLocation,
        new_location: newLocation,
        details: `Location changed from "${oldLocation || 'none'}" to "${newLocation || 'none'}"`
      });
    } catch (error) {
      console.error('Error logging equipment location change:', error);
      throw error;
    }
  },

  /**
   * Get logs for a specific equipment
   * @param {number} equipmentId - ID of the equipment
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Object>} The logs with pagination info
   */
  async getEquipmentLogs(equipmentId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      const { count, rows } = await EquipmentLog.findAndCountAll({
        where: { equipment_id: equipmentId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'role']
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      return {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Math.floor(offset / limit) + 1,
        logs: rows
      };
    } catch (error) {
      console.error('Error getting equipment logs:', error);
      throw error;
    }
  },

  /**
   * Get all equipment logs with filtering and pagination
   * @param {Object} filters - Filters to apply
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Object>} The logs with pagination info
   */
  async getAllLogs(filters = {}, options = {}) {
    try {
      const { limit = 20, offset = 0, sortBy = 'created_at', sortOrder = 'DESC' } = options;
      const where = {};
      const { Op } = require('sequelize');

      if (filters.equipmentId) {
        where.equipment_id = filters.equipmentId;
      }

      if (filters.userId) {
        where.user_id = filters.userId;
      }

      if (filters.actionType) {
        where.action_type = filters.actionType;
      }

      // Add search functionality
      if (filters.search) {
        // We'll need to use include conditions for searching related models
        // This will be handled in the include section below
      }

      // Add equipment type filter
      if (filters.type) {
        // This will be handled in the equipment include
      }

      // Add equipment status filter
      if (filters.status) {
        // This will be handled in the equipment include
      }

      // Add location filter
      if (filters.location_id) {
        // This will be handled in the equipment include
      }

      // Prepare includes with search conditions if needed
      const includes = [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'role'],
          ...(filters.search ? {
            where: {
              [Op.or]: [
                { username: { [Op.like]: `%${filters.search}%` } }
              ]
            },
            required: false
          } : {})
        },
        {
          model: Equipment,
          as: 'equipment',
          attributes: ['id', 'type', 'brand', 'model', 'serial_number', 'status', 'location_id'],
          where: {
            ...(filters.search ? {
              [Op.or]: [
                { type: { [Op.like]: `%${filters.search}%` } },
                { brand: { [Op.like]: `%${filters.search}%` } },
                { model: { [Op.like]: `%${filters.search}%` } },
                { serial_number: { [Op.like]: `%${filters.search}%` } }
              ]
            } : {}),
            ...(filters.type ? { type: filters.type } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.location_id ? { location_id: filters.location_id } : {})
          },
          required: !!(filters.type || filters.status || filters.location_id) || false
        }
      ];

      // If search is active, add conditions to the main where clause for details field
      if (filters.search) {
        where[Op.or] = [
          { details: { [Op.like]: `%${filters.search}%` } },
          { previous_location: { [Op.like]: `%${filters.search}%` } },
          { new_location: { [Op.like]: `%${filters.search}%` } },
          // The related model conditions are handled in the includes
          { '$equipment.brand$': { [Op.like]: `%${filters.search}%` } },
          { '$equipment.model$': { [Op.like]: `%${filters.search}%` } },
          { '$equipment.serial_number$': { [Op.like]: `%${filters.search}%` } },
          { '$user.username$': { [Op.like]: `%${filters.search}%` } }
        ];
      }

      // Determine sort field and order
      const orderField = sortBy === 'created_at' ? 'created_at' : sortBy;
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const { count, rows } = await EquipmentLog.findAndCountAll({
        where,
        include: includes,
        order: [[orderField, orderDirection]],
        limit,
        offset,
        distinct: true // Important for correct count with includes
      });

      return {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Math.floor(offset / limit) + 1,
        logs: rows
      };
    } catch (error) {
      console.error('Error getting all equipment logs:', error);
      throw error;
    }
  }
};

module.exports = equipmentLogService;
