const { sequelize } = require('../config/database');

/**
 * Centralized Inventory Management Service
 * Handles quantity tracking, location allocation, and availability calculations
 */
class InventoryService {
  
  /**
   * Status-based quantity tracking rules:
   * - REQUESTED: Pending approval, quantity is reserved but not yet unavailable
   * - ALLOCATED: Confirmed allocation, quantity is unavailable
   * - CHECKED-OUT: Equipment is physically taken, quantity is unavailable
   * - IN-USE: Equipment is actively being used, quantity is unavailable
   * - RETURNED: Equipment is back, quantity is available again
   */
  getStatusRules() {
    return {
      // Statuses that make equipment unavailable (reduce available quantity)
      // Note: 'requested' is included because requested equipment should count toward allocations
      unavailableStatuses: ['requested', 'allocated', 'checked-out', 'in-use'],

      // Statuses that reserve equipment (show warning but don't reduce availability yet)
      reservedStatuses: [],

      // Statuses that make equipment available
      availableStatuses: ['returned', 'cancelled'],

      // Status messages for UI
      statusMessages: {
        'requested': 'Equipment is requested but not yet allocated. Quantity is reserved.',
        'allocated': 'Equipment is allocated and unavailable.',
        'checked-out': 'Equipment is checked out and unavailable.',
        'in-use': 'Equipment is in use and unavailable.',
        'returned': 'Equipment has been returned and is available.',
        'cancelled': 'Request was cancelled, equipment is available.'
      }
    };
  }

  /**
   * UNIFIED CALCULATION METHOD - Get available quantity for equipment with detailed status breakdown
   * This is the single source of truth for all availability calculations
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Object>} Detailed availability information
   */
  async getEquipmentAvailability(equipmentId) {
    try {
      console.log('🔍 UNIFIED getEquipmentAvailability called for equipment ID:', equipmentId);

      // Get basic equipment info first
      const equipmentResults = await sequelize.query(`
        SELECT
          id as equipment_id,
          type,
          brand,
          model,
          quantity as total_quantity,
          status as equipment_status,
          installation_type,
          COALESCE(installation_quantity, 0) as installation_quantity,
          installation_location
        FROM equipment
        WHERE id = ?
      `, {
        replacements: [equipmentId],
        type: sequelize.QueryTypes.SELECT
      });

      console.log('🔍 Equipment query results:', equipmentResults);

      if (!equipmentResults[0]) {
        return null;
      }

      const equipment = equipmentResults[0];
      const statusRules = this.getStatusRules();

      // Get detailed show allocations breakdown by status
      let showStatusBreakdown = {};
      let showUnavailable = 0;
      let showReserved = 0;

      try {
        const showQuery = `
          SELECT
            status,
            COALESCE(SUM(quantity_allocated), 0) as quantity
          FROM show_equipment
          WHERE equipment_id = ?
          GROUP BY status
        `;

        const showResults = await sequelize.query(showQuery, {
          replacements: [equipmentId],
          type: sequelize.QueryTypes.SELECT
        });

        console.log('🔍 Raw show results from database:', showResults);
        console.log('🔍 Show query was:', showQuery);
        console.log('🔍 Equipment ID used in query:', equipmentId);

        showResults.forEach(row => {
          showStatusBreakdown[row.status] = parseInt(row.quantity);

          console.log(`🔍 Processing show status: ${row.status}, quantity: ${row.quantity}`);
          console.log(`🔍 Is ${row.status} in unavailableStatuses?`, statusRules.unavailableStatuses.includes(row.status));
          console.log(`🔍 Is ${row.status} in reservedStatuses?`, statusRules.reservedStatuses.includes(row.status));

          if (statusRules.unavailableStatuses.includes(row.status)) {
            showUnavailable += parseInt(row.quantity);
            console.log(`🔍 Added ${row.quantity} to showUnavailable, total now: ${showUnavailable}`);
          } else if (statusRules.reservedStatuses.includes(row.status)) {
            showReserved += parseInt(row.quantity);
            console.log(`🔍 Added ${row.quantity} to showReserved, total now: ${showReserved}`);
          }
        });

        console.log('🔍 Show status breakdown:', showStatusBreakdown);
        console.log('🔍 Show unavailable count:', showUnavailable);
        console.log('🔍 Show reserved count:', showReserved);
      } catch (showError) {
        console.error('🔍 Error accessing show equipment table:', showError);
        console.log('🔍 Show equipment table not accessible, using 0 for show allocations');
      }

      // Get detailed inventory allocations breakdown by status
      let inventoryStatusBreakdown = {};
      let inventoryUnavailable = 0;
      let inventoryReserved = 0;

      try {
        const inventoryResults = await sequelize.query(`
          SELECT
            status,
            COALESCE(SUM(quantity_allocated), 0) as quantity
          FROM inventory_allocation
          WHERE equipment_id = ?
          GROUP BY status
        `, {
          replacements: [equipmentId],
          type: sequelize.QueryTypes.SELECT
        });

        inventoryResults.forEach(row => {
          inventoryStatusBreakdown[row.status] = parseInt(row.quantity);

          if (statusRules.unavailableStatuses.includes(row.status)) {
            inventoryUnavailable += parseInt(row.quantity);
          } else if (statusRules.reservedStatuses.includes(row.status)) {
            inventoryReserved += parseInt(row.quantity);
          }
        });

        console.log('🔍 Inventory status breakdown:', inventoryStatusBreakdown);
        console.log('🔍 Inventory unavailable count:', inventoryUnavailable);
        console.log('🔍 Inventory reserved count:', inventoryReserved);
      } catch (inventoryError) {
        console.log('🔍 Inventory allocation table not accessible, using 0 for inventory allocations');
      }

      // Calculate availability including installation quantities
      const installationQuantity = parseInt(equipment.installation_quantity) || 0;

      console.log('🔍 Installation calculation:', {
        installation_quantity_field: equipment.installation_quantity,
        installation_type: equipment.installation_type,
        installation_location: equipment.installation_location,
        calculated_installation_quantity: installationQuantity
      });

      const totalUnavailable = showUnavailable + inventoryUnavailable + installationQuantity;
      const totalReserved = showReserved + inventoryReserved;
      const availableQuantity = Math.max(0, equipment.total_quantity - totalUnavailable);
      const effectivelyAvailable = Math.max(0, availableQuantity - totalReserved);

      const result = {
        equipment_id: equipment.equipment_id,
        type: equipment.type,
        brand: equipment.brand,
        model: equipment.model,
        total_quantity: equipment.total_quantity,
        equipment_status: equipment.equipment_status,

        // Detailed breakdown
        show_status_breakdown: showStatusBreakdown,
        inventory_status_breakdown: inventoryStatusBreakdown,

        // Summary counts
        total_unavailable: totalUnavailable,
        total_reserved: totalReserved,
        available_quantity: availableQuantity,
        effectively_available: effectivelyAvailable,

        // Legacy fields for backward compatibility
        total_allocated: inventoryUnavailable,
        show_allocated: showUnavailable,

        // Installation information
        installation_allocated: installationQuantity,
        installation_type: equipment.installation_type,
        installation_location: equipment.installation_location,

        // Status information
        status_rules: statusRules,

        // Warnings and messages
        warnings: this.generateAvailabilityWarnings(equipment.total_quantity, totalUnavailable, totalReserved, showStatusBreakdown, inventoryStatusBreakdown)
      };

      console.log('🔍 ENHANCED availability calculation:', {
        total_quantity: equipment.total_quantity,
        show_unavailable: showUnavailable,
        inventory_unavailable: inventoryUnavailable,
        installation_quantity: installationQuantity,
        total_unavailable: totalUnavailable,
        total_reserved: totalReserved,
        available_quantity: availableQuantity,
        effectively_available: effectivelyAvailable
      });

      console.log('🔍 Returning enhanced availability result:', result);
      return result;
    } catch (error) {
      console.error('Error getting equipment availability:', error);
      throw error;
    }
  }

  /**
   * Generate availability warnings and messages
   * @param {number} totalQuantity - Total equipment quantity
   * @param {number} unavailable - Unavailable quantity
   * @param {number} reserved - Reserved quantity
   * @param {Object} showBreakdown - Show status breakdown
   * @param {Object} inventoryBreakdown - Inventory status breakdown
   * @returns {Array} Array of warning objects
   */
  generateAvailabilityWarnings(totalQuantity, unavailable, reserved, showBreakdown, inventoryBreakdown) {
    const warnings = [];
    const statusRules = this.getStatusRules();

    // Check for requested items
    const requestedInShows = showBreakdown.requested || 0;
    const requestedInInventory = inventoryBreakdown.requested || 0;
    const totalRequested = requestedInShows + requestedInInventory;

    if (totalRequested > 0) {
      warnings.push({
        type: 'info',
        message: `${totalRequested} units are requested but not yet allocated. These quantities are reserved.`,
        details: {
          shows: requestedInShows,
          inventory: requestedInInventory
        }
      });
    }

    // Check for low availability
    const effectivelyAvailable = Math.max(0, totalQuantity - unavailable - reserved);
    if (effectivelyAvailable === 0 && totalQuantity > 0) {
      warnings.push({
        type: 'error',
        message: 'No units available. All equipment is allocated or reserved.',
        details: {
          total: totalQuantity,
          unavailable: unavailable,
          reserved: reserved
        }
      });
    } else if (effectivelyAvailable < totalQuantity * 0.2 && totalQuantity > 0) {
      warnings.push({
        type: 'warning',
        message: `Low availability: Only ${effectivelyAvailable} of ${totalQuantity} units available.`,
        details: {
          available: effectivelyAvailable,
          total: totalQuantity,
          percentage: Math.round((effectivelyAvailable / totalQuantity) * 100)
        }
      });
    }

    // Check for equipment in use
    const inUseShows = showBreakdown['in-use'] || 0;
    const inUseInventory = inventoryBreakdown['in-use'] || 0;
    const totalInUse = inUseShows + inUseInventory;

    if (totalInUse > 0) {
      warnings.push({
        type: 'info',
        message: `${totalInUse} units are currently in use.`,
        details: {
          shows: inUseShows,
          inventory: inUseInventory
        }
      });
    }

    // Check for checked out equipment
    const checkedOutShows = showBreakdown['checked-out'] || 0;
    const checkedOutInventory = inventoryBreakdown['checked-out'] || 0;
    const totalCheckedOut = checkedOutShows + checkedOutInventory;

    if (totalCheckedOut > 0) {
      warnings.push({
        type: 'warning',
        message: `${totalCheckedOut} units are checked out and need to be returned.`,
        details: {
          shows: checkedOutShows,
          inventory: checkedOutInventory
        }
      });
    }

    return warnings;
  }

  /**
   * Allocate equipment to a location
   * @param {Object} allocationData - Allocation details
   * @returns {Promise<Object>} Created allocation record
   */
  async allocateEquipment(allocationData) {
    const {
      equipmentId,
      locationId,
      quantity,
      allocationType = 'general',
      showId = null,
      allocatedBy,
      notes = null,
      expectedReturnDate = null
    } = allocationData;

    try {
      // Check availability first
      const availability = await this.getEquipmentAvailability(equipmentId);
      if (!availability) {
        throw new Error('Equipment not found');
      }

      if (availability.available_quantity < quantity) {
        throw new Error(`Insufficient quantity available. Available: ${availability.available_quantity}, Requested: ${quantity}`);
      }

      // Create allocation record
      const result = await sequelize.query(`
        INSERT INTO inventory_allocation (
          equipment_id, location_id, quantity_allocated, allocation_type,
          show_id, allocated_by, notes, expected_return_date, allocated_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, {
        replacements: [equipmentId, locationId, quantity, allocationType, showId, allocatedBy, notes, expectedReturnDate],
        type: sequelize.QueryTypes.INSERT
      });

      const allocationId = result[0] || result;

      // Log the allocation
      await this.logStatusChange({
        equipmentId,
        allocationId,
        userId: allocatedBy,
        actionType: 'allocated',
        newLocationId: locationId,
        newQuantity: quantity,
        details: `Allocated ${quantity} units to location ${locationId}${showId ? ` for show ${showId}` : ''}`
      });

      // Get the created allocation record
      const allocation = await sequelize.query(`
        SELECT
          ia.*,
          l.name as location_name,
          e.type as equipment_type,
          e.brand as equipment_brand,
          e.model as equipment_model,
          u.username as allocated_by_username
        FROM inventory_allocation ia
        JOIN locations l ON ia.location_id = l.id
        JOIN equipment e ON ia.equipment_id = e.id
        JOIN users u ON ia.allocated_by = u.id
        WHERE ia.id = ?
      `, {
        replacements: [allocationId],
        type: sequelize.QueryTypes.SELECT
      });

      return allocation[0];
    } catch (error) {
      console.error('Error allocating equipment:', error);
      throw error;
    }
  }

  /**
   * Return equipment from allocation
   * @param {number} allocationId - Allocation ID
   * @param {number} returnedBy - User ID who returned the equipment
   * @param {string} notes - Return notes
   * @returns {Promise<Object>} Updated allocation record
   */
  async returnEquipment(allocationId, returnedBy, notes = null) {
    try {
      // Update allocation record
      await sequelize.query(`
        UPDATE inventory_allocation
        SET status = 'returned', returned_by = ?, return_date = NOW(), notes = CONCAT(COALESCE(notes, ''), ?, ?)
        WHERE id = ? AND status != 'returned'
      `, {
        replacements: [returnedBy, notes ? '\nReturned: ' : '', notes || '', allocationId],
        type: sequelize.QueryTypes.UPDATE
      });

      // Get allocation details for logging
      const allocation = await sequelize.query(`
        SELECT * FROM inventory_allocation WHERE id = ?
      `, {
        replacements: [allocationId],
        type: sequelize.QueryTypes.SELECT
      });

      if (allocation[0]) {
        // Log the return
        await this.logStatusChange({
          equipmentId: allocation[0].equipment_id,
          allocationId,
          userId: returnedBy,
          actionType: 'returned',
          details: `Returned ${allocation[0].quantity_allocated} units from location ${allocation[0].location_id}`
        });
      }

      return allocation[0];
    } catch (error) {
      console.error('Error returning equipment:', error);
      throw error;
    }
  }

  /**
   * Get equipment allocations by location
   * @param {number} locationId - Location ID
   * @returns {Promise<Array>} List of allocations
   */
  async getLocationInventory(locationId) {
    try {
      const results = await sequelize.query(`
        SELECT
          ia.*,
          e.type as equipment_type,
          e.brand as equipment_brand,
          e.model as equipment_model,
          e.serial_number,
          u.username as allocated_by_username,
          ru.username as returned_by_username,
          s.name as show_name
        FROM inventory_allocation ia
        JOIN equipment e ON ia.equipment_id = e.id
        JOIN users u ON ia.allocated_by = u.id
        LEFT JOIN users ru ON ia.returned_by = ru.id
        LEFT JOIN shows s ON ia.show_id = s.id
        WHERE ia.location_id = ? AND ia.status IN ('allocated', 'in-use', 'reserved')
        ORDER BY ia.allocated_date DESC
      `, {
        replacements: [locationId],
        type: sequelize.QueryTypes.SELECT
      });

      return results;
    } catch (error) {
      console.error('Error getting location inventory:', error);
      throw error;
    }
  }

  /**
   * Log status changes
   * @param {Object} logData - Log entry data
   */
  async logStatusChange(logData) {
    const {
      equipmentId,
      allocationId = null,
      userId,
      actionType,
      previousStatus = null,
      newStatus = null,
      previousLocationId = null,
      newLocationId = null,
      previousQuantity = null,
      newQuantity = null,
      details = null
    } = logData;

    try {
      await sequelize.query(`
        INSERT INTO equipment_status_log (
          equipment_id, allocation_id, user_id, action_type,
          previous_status, new_status, previous_location_id, new_location_id,
          previous_quantity, new_quantity, details, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, {
        replacements: [
          equipmentId, allocationId, userId, actionType,
          previousStatus, newStatus, previousLocationId, newLocationId,
          previousQuantity, newQuantity, details
        ],
        type: sequelize.QueryTypes.INSERT
      });
    } catch (error) {
      console.error('Error logging status change:', error);
      // Don't throw error for logging failures
    }
  }

  /**
   * Get equipment allocation history
   * @param {number} equipmentId - Equipment ID
   * @returns {Promise<Array>} Allocation history
   */
  async getEquipmentHistory(equipmentId) {
    try {
      const results = await sequelize.query(`
        SELECT
          esl.*,
          u.username,
          pl.name as previous_location_name,
          nl.name as new_location_name
        FROM equipment_status_log esl
        JOIN users u ON esl.user_id = u.id
        LEFT JOIN locations pl ON esl.previous_location_id = pl.id
        LEFT JOIN locations nl ON esl.new_location_id = nl.id
        WHERE esl.equipment_id = ?
        ORDER BY esl.timestamp DESC
        LIMIT 50
      `, {
        replacements: [equipmentId],
        type: sequelize.QueryTypes.SELECT
      });

      return results;
    } catch (error) {
      console.error('Error getting equipment history:', error);
      throw error;
    }
  }

  /**
   * Move equipment between locations
   * @param {number} allocationId - Allocation ID
   * @param {number} newLocationId - New location ID
   * @param {number} userId - User performing the move
   * @param {string} notes - Move notes
   */
  async moveEquipment(allocationId, newLocationId, userId, notes = null) {
    try {
      // Get current allocation
      const currentAllocation = await sequelize.query(`
        SELECT * FROM inventory_allocation WHERE id = ?
      `, {
        replacements: [allocationId],
        type: sequelize.QueryTypes.SELECT
      });

      if (!currentAllocation[0]) {
        throw new Error('Allocation not found');
      }

      const allocation = currentAllocation[0];

      // Update location
      await sequelize.query(`
        UPDATE inventory_allocation
        SET location_id = ?, notes = CONCAT(COALESCE(notes, ''), ?, ?)
        WHERE id = ?
      `, {
        replacements: [newLocationId, notes ? '\nMoved: ' : '', notes || '', allocationId],
        type: sequelize.QueryTypes.UPDATE
      });

      // Log the move
      await this.logStatusChange({
        equipmentId: allocation.equipment_id,
        allocationId,
        userId,
        actionType: 'moved',
        previousLocationId: allocation.location_id,
        newLocationId,
        details: `Moved ${allocation.quantity_allocated} units from location ${allocation.location_id} to ${newLocationId}`
      });

      return true;
    } catch (error) {
      console.error('Error moving equipment:', error);
      throw error;
    }
  }
}

module.exports = new InventoryService();
