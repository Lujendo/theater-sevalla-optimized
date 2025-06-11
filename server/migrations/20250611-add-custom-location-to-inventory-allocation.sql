-- Add custom_location field to inventory_allocation table
-- This allows storing custom location names when location_id is null

ALTER TABLE inventory_allocation 
ADD COLUMN custom_location VARCHAR(255) NULL 
COMMENT 'Custom location name when not using predefined locations'
AFTER location_id;

-- Update the foreign key constraint to allow location_id to be null
-- when custom_location is used
ALTER TABLE inventory_allocation 
MODIFY COLUMN location_id INT NULL;

-- Add a check constraint to ensure either location_id or custom_location is provided
-- Note: MySQL 8.0+ supports check constraints, for older versions this will be handled in application logic
ALTER TABLE inventory_allocation 
ADD CONSTRAINT chk_location_specified 
CHECK (location_id IS NOT NULL OR custom_location IS NOT NULL);

-- Update the location_inventory view to include custom locations
DROP VIEW IF EXISTS location_inventory;

CREATE VIEW location_inventory AS
SELECT 
  COALESCE(l.id, 0) as location_id,
  COALESCE(l.name, ia.custom_location) as location_name,
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
  u.username as allocated_by_user,
  ia.custom_location
FROM inventory_allocation ia
LEFT JOIN locations l ON ia.location_id = l.id
JOIN equipment e ON ia.equipment_id = e.id
JOIN users u ON ia.allocated_by = u.id
WHERE ia.status IN ('allocated', 'in-use', 'reserved')
ORDER BY COALESCE(l.name, ia.custom_location), e.type, e.brand, e.model;
