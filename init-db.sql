-- Initialize the database with the required tables

-- Drop tables if they exist
DROP TABLE IF EXISTS saved_searches;
DROP TABLE IF EXISTS equipment_logs;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS equipment_types;
DROP TABLE IF EXISTS equipment_categories;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'advanced', 'basic') NOT NULL DEFAULT 'basic',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create equipment_types table
CREATE TABLE equipment_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create equipment_categories table
CREATE TABLE equipment_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create locations table
CREATE TABLE locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  street VARCHAR(255),
  postal_code VARCHAR(20),
  city VARCHAR(100),
  region VARCHAR(100),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create equipment table
CREATE TABLE equipment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(255) NOT NULL,
  type_id INT,
  category VARCHAR(255),
  category_id INT,
  reference_image_id INT,
  brand VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  serial_number VARCHAR(255) NOT NULL,
  status ENUM('available', 'in-use', 'maintenance') NOT NULL DEFAULT 'available',
  location VARCHAR(255),
  location_id INT,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (type_id) REFERENCES equipment_types(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES equipment_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- Create files table
CREATE TABLE files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT,
  file_type VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  thumbnail_path VARCHAR(255),
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

-- Add foreign key from equipment to files for reference_image_id
ALTER TABLE equipment
ADD CONSTRAINT fk_equipment_reference_image
FOREIGN KEY (reference_image_id)
REFERENCES files(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Create equipment_logs table
CREATE TABLE equipment_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL,
  user_id INT,
  action_type VARCHAR(50) NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  previous_location VARCHAR(255),
  new_location VARCHAR(255),
  details TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create saved_searches table
CREATE TABLE saved_searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  search_params JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default admin user
INSERT INTO users (username, password, role, created_at)
VALUES ('admin', '$2a$10$ixfm7zXieBWxmYmh.8KP/uXZP5.M1E6fHI5q7NzMeUVAfYLKvQl4e', 'admin', NOW());
-- Password is 'admin123' (hashed with bcrypt)

-- Insert default equipment types
INSERT INTO equipment_types (name) VALUES
('Lighting'),
('Sound'),
('Video'),
('Rigging'),
('Props'),
('Costumes'),
('Set Pieces'),
('Other');

-- Insert default equipment categories
INSERT INTO equipment_categories (name, description) VALUES
('Performance', 'Equipment used during performances'),
('Rehearsal', 'Equipment used during rehearsals'),
('Production', 'Equipment used for production purposes'),
('Technical', 'Technical equipment'),
('General', 'General purpose equipment');

-- Insert default location
INSERT INTO locations (name, street, city, country)
VALUES ('Main Theater', '123 Broadway', 'New York', 'USA');
