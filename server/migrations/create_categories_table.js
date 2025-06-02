/**
 * Migration to create equipment_categories table
 * This script creates a table for storing equipment categories
 */

const { sequelize } = require('../config/database');

async function createCategoriesTable() {
  try {
    console.log('Starting categories table migration...');
    
    // Check if the table already exists
    const [tables] = await sequelize.query(`
      SHOW TABLES LIKE 'equipment_categories'
    `);
    
    if (tables.length === 0) {
      console.log('Creating equipment_categories table...');
      
      // Create the table
      await sequelize.query(`
        CREATE TABLE equipment_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('equipment_categories table created successfully');
    } else {
      console.log('equipment_categories table already exists');
    }
    
    console.log('Categories table migration completed successfully');
  } catch (error) {
    console.error('Error during categories table migration:', error);
  }
}

module.exports = createCategoriesTable;
