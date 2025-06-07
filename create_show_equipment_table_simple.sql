-- Simple show_equipment table creation for MySQL 9.0
-- Run this in Database Manager Query tab

CREATE TABLE show_equipment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  show_id INT NOT NULL,
  equipment_id INT NOT NULL,
  quantity_needed INT DEFAULT 1,
  quantity_allocated INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'requested',
  notes TEXT,
  checkout_date TIMESTAMP NULL,
  return_date TIMESTAMP NULL,
  checked_out_by INT,
  returned_by INT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
