-- Create Default Storage Locations table
-- This table defines which locations are considered "main storage" for inventory calculations

CREATE TABLE IF NOT EXISTS default_storage_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 1 COMMENT 'Priority for inventory calculations (1 = highest)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE KEY unique_location (location_id),
  INDEX idx_active_priority (is_active, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default storage location (Lager) if it exists
INSERT IGNORE INTO default_storage_locations (location_id, name, description, is_active, priority)
SELECT 
  l.id,
  l.name,
  CONCAT('Default storage location: ', l.description),
  TRUE,
  1
FROM locations l 
WHERE l.name = 'Lager' 
LIMIT 1;

-- Create view for easy access to default storage locations
CREATE OR REPLACE VIEW active_default_storage_locations AS
SELECT 
  dsl.id,
  dsl.location_id,
  dsl.name as storage_name,
  dsl.description as storage_description,
  dsl.priority,
  l.name as location_name,
  l.description as location_description,
  l.street,
  l.postal_code,
  l.city,
  l.region,
  l.country
FROM default_storage_locations dsl
JOIN locations l ON dsl.location_id = l.id
WHERE dsl.is_active = TRUE
ORDER BY dsl.priority ASC, l.name ASC;
