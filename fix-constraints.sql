-- SQL script to fix the circular reference in the database

-- Find all foreign key constraints on equipment.reference_image_id
SELECT CONSTRAINT_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'equipment'
AND COLUMN_NAME = 'reference_image_id'
AND REFERENCED_TABLE_NAME = 'files';

-- Drop the foreign key constraint (replace CONSTRAINT_NAME with the actual name from the query above)
-- ALTER TABLE equipment DROP FOREIGN KEY equipment_ibfk_150;

-- Add the foreign key back but with ON DELETE SET NULL
ALTER TABLE equipment
ADD CONSTRAINT fk_equipment_reference_image
FOREIGN KEY (reference_image_id)
REFERENCES files(id)
ON DELETE SET NULL
ON UPDATE CASCADE;
