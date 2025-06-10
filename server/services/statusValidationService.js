const { sequelize } = require('../config/database');

/**
 * Status Validation Service
 * Handles cross-validation of equipment status changes across shows and inventory
 */
class StatusValidationService {

  /**
   * Status conflict rules
   * Defines which statuses conflict with each other across different allocations
   */
  getStatusConflictRules() {
    return {
      // Statuses that are mutually exclusive (can't exist simultaneously)
      mutuallyExclusive: {
        'checked-out': ['checked-out', 'in-use'],
        'in-use': ['checked-out', 'in-use', 'allocated'],
        'allocated': ['in-use'] // Can have multiple allocations, but not if in-use
      },
      
      // Statuses that require specific conditions
      requiresAvailability: ['allocated', 'checked-out', 'in-use'],
      
      // Statuses that free up equipment
      releasingStatuses: ['returned', 'cancelled'],
      
      // Status transition rules (logical workflow)
      allowedTransitions: {
        'requested': ['allocated', 'cancelled'],
        'allocated': ['checked-out', 'cancelled'], // Removed 'returned' - can't return what wasn't checked out
        'checked-out': ['in-use', 'returned'],
        'in-use': ['returned'],
        'returned': ['requested'], // Reset to requested for new allocation cycle
        'cancelled': ['requested'] // Can be re-requested
      }
    };
  }

  /**
   * Validate if a status change is allowed for equipment
   * @param {number} equipmentId - Equipment ID
   * @param {number} allocationId - Current allocation ID (to exclude from conflict check)
   * @param {string} newStatus - Proposed new status
   * @param {number} quantity - Quantity being changed
   * @returns {Promise<Object>} Validation result
   */
  async validateStatusChange(equipmentId, allocationId, newStatus, quantity = 1) {
    try {
      console.log('🔍 Validating status change:', { equipmentId, allocationId, newStatus, quantity });

      const rules = this.getStatusConflictRules();
      const conflicts = [];
      const warnings = [];

      // Get current allocation details to check quantity_needed vs quantity_allocated
      const [allocationDetails] = await sequelize.query(`
        SELECT quantity_needed, quantity_allocated, status
        FROM show_equipment
        WHERE id = ?
      `, { replacements: [allocationId] });

      const currentAllocation = allocationDetails[0];
      console.log('🔍 Current allocation details:', currentAllocation);

      // Get all current allocations for this equipment (excluding current allocation)
      const [currentAllocations] = await sequelize.query(`
        SELECT 
          se.id,
          se.status,
          se.quantity_allocated,
          se.show_id,
          s.name as show_name,
          'show' as allocation_type
        FROM show_equipment se
        LEFT JOIN shows s ON se.show_id = s.id
        WHERE se.equipment_id = ? 
        AND se.id != ?
        AND se.status NOT IN ('returned', 'cancelled')
        
        UNION ALL
        
        SELECT 
          ia.id,
          ia.status,
          ia.quantity_allocated,
          ia.show_id,
          COALESCE(s.name, CONCAT('Location ', l.name)) as show_name,
          'inventory' as allocation_type
        FROM inventory_allocation ia
        LEFT JOIN shows s ON ia.show_id = s.id
        LEFT JOIN locations l ON ia.location_id = l.id
        WHERE ia.equipment_id = ?
        AND ia.id != ?
        AND ia.status NOT IN ('returned', 'cancelled')
      `, { 
        replacements: [equipmentId, allocationId || 0, equipmentId, allocationId || 0] 
      });

      console.log('🔍 Current allocations:', currentAllocations);

      // CRITICAL: Check for missing item validation
      // Items with insufficient allocation cannot be set to allocated or checked-out
      if (currentAllocation && ['allocated', 'checked-out', 'in-use'].includes(newStatus)) {
        const quantityNeeded = parseInt(currentAllocation.quantity_needed) || 0;
        const quantityAllocated = parseInt(currentAllocation.quantity_allocated) || 0;

        console.log('🔍 Missing item validation:', {
          quantityNeeded,
          quantityAllocated,
          newStatus,
          isMissing: quantityNeeded > quantityAllocated
        });

        if (quantityNeeded > quantityAllocated) {
          conflicts.push({
            type: 'missing_item_conflict',
            message: `Cannot set status to "${newStatus}" because item has insufficient allocation. Needed: ${quantityNeeded}, Allocated: ${quantityAllocated}. Please allocate the required quantity first.`,
            quantityNeeded,
            quantityAllocated,
            missingQuantity: quantityNeeded - quantityAllocated,
            severity: 'error'
          });
        }

        // Additional validation: Cannot check out items with zero allocation
        if (newStatus === 'checked-out' && quantityAllocated === 0) {
          conflicts.push({
            type: 'zero_allocation_conflict',
            message: `Cannot check out equipment with zero allocated quantity. Please allocate equipment first.`,
            quantityAllocated,
            severity: 'error'
          });
        }
      }

      // Check for mutually exclusive status conflicts (only for single-quantity equipment)
      // For multi-quantity equipment, we rely on quantity availability checks instead
      const [equipmentInfo] = await sequelize.query(`
        SELECT quantity as total_quantity FROM equipment WHERE id = ?
      `, { replacements: [equipmentId] });

      const totalQuantity = equipmentInfo[0]?.total_quantity || 1;

      console.log('🔍 Equipment quantity check:', {
        equipmentId,
        totalQuantity,
        equipmentInfo: equipmentInfo[0],
        willApplyMutualExclusivity: totalQuantity === 1,
        newStatus
      });

      // Only apply mutual exclusivity rules for single-quantity equipment
      if (totalQuantity === 1 && rules.mutuallyExclusive[newStatus]) {
        const conflictingStatuses = rules.mutuallyExclusive[newStatus];

        const conflictingAllocations = currentAllocations.filter(allocation =>
          conflictingStatuses.includes(allocation.status)
        );

        if (conflictingAllocations.length > 0) {
          conflictingAllocations.forEach(allocation => {
            conflicts.push({
              type: 'status_conflict',
              message: `Cannot set status to "${newStatus}" because equipment is already "${allocation.status}" in ${allocation.show_name}`,
              conflictingAllocation: allocation,
              severity: 'error'
            });
          });
        }
      }

      // Check quantity availability for statuses that require it
      if (rules.requiresAvailability.includes(newStatus)) {
        const availabilityCheck = await this.checkQuantityAvailability(
          equipmentId,
          allocationId,
          quantity,
          currentAllocations,
          newStatus
        );

        if (!availabilityCheck.available) {
          conflicts.push({
            type: 'quantity_conflict',
            message: availabilityCheck.message,
            availableQuantity: availabilityCheck.availableQuantity,
            requestedQuantity: quantity,
            severity: 'error'
          });
        } else if (availabilityCheck.warnings.length > 0) {
          warnings.push(...availabilityCheck.warnings);
        }
      }

      // Check for additional logical inconsistencies
      if (currentAllocation) {
        // Logical inconsistency: Cannot return equipment that was never checked out
        if (newStatus === 'returned' && !['checked-out', 'in-use'].includes(currentAllocation.status)) {
          conflicts.push({
            type: 'return_logic_conflict',
            message: `Cannot return equipment that was never checked out. Current status: "${currentAllocation.status}". Equipment must be checked-out or in-use before it can be returned.`,
            currentStatus: currentAllocation.status,
            severity: 'error'
          });
        }

        // Logical inconsistency: Cannot put equipment in-use without checking it out first
        if (newStatus === 'in-use' && currentAllocation.status !== 'checked-out') {
          conflicts.push({
            type: 'usage_logic_conflict',
            message: `Cannot put equipment in-use without checking it out first. Current status: "${currentAllocation.status}". Equipment must be checked-out before it can be put in-use.`,
            currentStatus: currentAllocation.status,
            severity: 'error'
          });
        }

        // Warning: Allocating more than needed
        if (newStatus === 'allocated' && currentAllocation.quantity_allocated > currentAllocation.quantity_needed) {
          warnings.push({
            type: 'over_allocation_warning',
            message: `Allocated quantity (${currentAllocation.quantity_allocated}) exceeds needed quantity (${currentAllocation.quantity_needed}). Consider reducing allocation.`,
            severity: 'warning'
          });
        }
      }

      // Check for potential issues (warnings)
      if (newStatus === 'checked-out') {
        const otherAllocatedItems = currentAllocations.filter(allocation =>
          allocation.status === 'allocated' && allocation.show_name !== 'current'
        );

        if (otherAllocatedItems.length > 0) {
          warnings.push({
            type: 'allocation_warning',
            message: `Equipment is also allocated to other shows: ${otherAllocatedItems.map(a => a.show_name).join(', ')}`,
            severity: 'warning'
          });
        }
      }

      const result = {
        valid: conflicts.length === 0,
        conflicts,
        warnings,
        currentAllocations,
        statusRules: rules
      };

      console.log('🔍 Validation result:', result);
      return result;

    } catch (error) {
      console.error('Error validating status change:', error);
      return {
        valid: false,
        conflicts: [{
          type: 'validation_error',
          message: 'Failed to validate status change',
          severity: 'error'
        }],
        warnings: [],
        currentAllocations: []
      };
    }
  }

  /**
   * Check quantity availability considering current allocations
   * @param {number} equipmentId - Equipment ID
   * @param {number} excludeAllocationId - Allocation ID to exclude
   * @param {number} requestedQuantity - Requested quantity
   * @param {Array} currentAllocations - Current allocations
   * @param {string} newStatus - The status being changed to
   * @returns {Promise<Object>} Availability check result
   */
  async checkQuantityAvailability(equipmentId, excludeAllocationId, requestedQuantity, currentAllocations, newStatus = null) {
    try {
      // Get equipment total quantity
      const [equipment] = await sequelize.query(`
        SELECT quantity as total_quantity FROM equipment WHERE id = ?
      `, { replacements: [equipmentId] });

      if (!equipment[0]) {
        return {
          available: false,
          message: 'Equipment not found',
          availableQuantity: 0,
          warnings: []
        };
      }

      const totalQuantity = equipment[0].total_quantity;

      // Calculate currently unavailable quantity based on status
      // For status changes, we need to consider what statuses actually make equipment unavailable
      let unavailableStatuses = [];

      if (newStatus === 'checked-out' || newStatus === 'in-use') {
        // When checking out or putting in use, only count other checked-out/in-use items as unavailable
        unavailableStatuses = ['checked-out', 'in-use'];
      } else if (newStatus === 'allocated') {
        // When allocating, count checked-out, in-use, and other allocated items
        unavailableStatuses = ['allocated', 'checked-out', 'in-use'];
      } else {
        // Default: count all active statuses
        unavailableStatuses = ['allocated', 'checked-out', 'in-use'];
      }

      const unavailableQuantity = currentAllocations
        .filter(allocation => unavailableStatuses.includes(allocation.status))
        .reduce((sum, allocation) => sum + parseInt(allocation.quantity_allocated), 0);

      const availableQuantity = totalQuantity - unavailableQuantity;
      const warnings = [];

      console.log('🔍 Quantity check:', {
        equipmentId,
        totalQuantity,
        unavailableQuantity,
        availableQuantity,
        requestedQuantity,
        newStatus,
        unavailableStatuses,
        currentAllocations: currentAllocations.map(a => ({ status: a.status, quantity: a.quantity_allocated, show: a.show_name }))
      });

      if (requestedQuantity > availableQuantity) {
        return {
          available: false,
          message: `Insufficient quantity available. Available: ${availableQuantity}, Requested: ${requestedQuantity}. Total: ${totalQuantity}, Currently unavailable: ${unavailableQuantity}`,
          availableQuantity,
          warnings
        };
      }

      // Add warnings for tight availability
      if (availableQuantity - requestedQuantity < totalQuantity * 0.2) {
        warnings.push({
          type: 'low_availability',
          message: `Low availability after this allocation: ${availableQuantity - requestedQuantity} remaining`,
          severity: 'warning'
        });
      }

      return {
        available: true,
        message: 'Quantity available',
        availableQuantity,
        warnings
      };

    } catch (error) {
      console.error('Error checking quantity availability:', error);
      return {
        available: false,
        message: 'Failed to check availability',
        availableQuantity: 0,
        warnings: []
      };
    }
  }

  /**
   * Get suggested status transitions for current status
   * @param {string} currentStatus - Current status
   * @param {Array} currentAllocations - Other allocations for same equipment
   * @returns {Array} Allowed status transitions
   */
  getSuggestedTransitions(currentStatus, currentAllocations = []) {
    const rules = this.getStatusConflictRules();
    const allowedTransitions = rules.allowedTransitions[currentStatus] || [];
    
    // Filter out transitions that would cause conflicts
    return allowedTransitions.filter(newStatus => {
      if (rules.mutuallyExclusive[newStatus]) {
        const conflictingStatuses = rules.mutuallyExclusive[newStatus];
        return !currentAllocations.some(allocation => 
          conflictingStatuses.includes(allocation.status)
        );
      }
      return true;
    });
  }
}

module.exports = new StatusValidationService();
