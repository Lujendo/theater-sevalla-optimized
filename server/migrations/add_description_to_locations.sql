-- Add description column to locations table
-- This column is expected by the Location model but missing from the production database

ALTER TABLE locations 
ADD COLUMN description TEXT AFTER name;

-- Update the column comment for clarity
ALTER TABLE locations 
MODIFY COLUMN description TEXT COMMENT 'Optional description for the location';
