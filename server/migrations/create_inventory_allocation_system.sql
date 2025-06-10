-- Centralized Quantity Tracking System Migration
-- This creates the inventory allocation system for managing equipment placement across locations

-- 1. Create Inventory Allocation Table
CREATE TABLE IF NOT EXISTS inventory_allocation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL,
  location_id INT NOT NULL,
  quantity_allocated INT NOT NULL DEFAULT 1,
  status ENUM('allocated', 'in-use', 'reserved', 'returned', 'maintenance') NOT NULL DEFAULT 'allocated',
  allocation_type ENUM('general', 'show', 'maintenance', 'storage') NOT NULL DEFAULT 'general',
  show_id INT NULL COMMENT 'Reference to show if allocation is for a specific show',
  event_id INT NULL COMMENT 'Reference to event if allocation is for a specific event',
  allocated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  return_date TIMESTAMP NULL,
  expected_return_date TIMESTAMP NULL,
  allocated_by INT NOT NULL,
  returned_by INT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
  FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE SET NULL,
  FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (returned_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes for performance
  INDEX idx_inventory_equipment_id (equipment_id),
  INDEX idx_inventory_location_id (location_id),
  INDEX idx_inventory_status (status),
  INDEX idx_inventory_allocation_type (allocation_type),
  INDEX idx_inventory_show_id (show_id),
  INDEX idx_inventory_allocated_date (allocated_date)
);

-- 2. Create Status Log Table for tracking all status changes
CREATE TABLE IF NOT EXISTS equipment_status_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL,
  allocation_id INT NULL COMMENT 'Reference to inventory allocation if applicable',
  user_id INT NOT NULL,
  action_type ENUM('created', 'allocated', 'moved', 'status_changed', 'returned', 'maintenance', 'deleted') NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  previous_location_id INT NULL,
  new_location_id INT NULL,
  previous_quantity INT NULL,
  new_quantity INT NULL,
  details TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (allocation_id) REFERENCES inventory_allocation(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (previous_location_id) REFERENCES locations(id) ON DELETE SET NULL,
  FOREIGN KEY (new_location_id) REFERENCES locations(id) ON DELETE SET NULL,
  
  -- Indexes for performance
  INDEX idx_status_log_equipment_id (equipment_id),
  INDEX idx_status_log_timestamp (timestamp),
  INDEX idx_status_log_action_type (action_type)
);

-- 3. Update Equipment table to ensure it has quantity column and proper status values
-- Check if quantity column exists, if not add it
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'equipment' 
  AND COLUMN_NAME = 'quantity'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE equipment ADD COLUMN quantity INT NOT NULL DEFAULT 1 COMMENT "Total quantity of this equipment item"',
  'SELECT "Quantity column already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Update equipment status enum to include all necessary statuses
ALTER TABLE equipment 
MODIFY COLUMN status ENUM('available', 'in-use', 'maintenance', 'unavailable', 'broken', 'reserved') 
NOT NULL DEFAULT 'available';

-- 5. Create view for available quantities (dynamic calculation)
CREATE OR REPLACE VIEW equipment_availability AS
SELECT 
  e.id as equipment_id,
  e.type,
  e.brand,
  e.model,
  e.serial_number,
  e.status as equipment_status,
  e.quantity as total_quantity,
  COALESCE(allocated.total_allocated, 0) as total_allocated,
  COALESCE(show_allocated.show_allocated, 0) as show_allocated,
  (e.quantity - COALESCE(allocated.total_allocated, 0) - COALESCE(show_allocated.show_allocated, 0)) as available_quantity,
  e.location as default_location,
  e.location_id as default_location_id
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
) show_allocated ON e.id = show_allocated.equipment_id;

-- 6. Create view for location-based inventory
CREATE OR REPLACE VIEW location_inventory AS
SELECT 
  l.id as location_id,
  l.name as location_name,
  e.id as equipment_id,
  e.type,
  e.brand,
  e.model,
  e.serial_number,
  ia.quantity_allocated,
  ia.status as allocation_status,
  ia.allocation_type,
  ia.allocated_date,
  ia.expected_return_date,
  u.username as allocated_by_user
FROM locations l
JOIN inventory_allocation ia ON l.id = ia.location_id
JOIN equipment e ON ia.equipment_id = e.id
JOIN users u ON ia.allocated_by = u.id
WHERE ia.status IN ('allocated', 'in-use', 'reserved')
ORDER BY l.name, e.type, e.brand, e.model;
