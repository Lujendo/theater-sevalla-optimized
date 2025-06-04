/**
 * Migration to create the saved_searches table
 * This table stores user-saved search configurations
 */

const { sequelize } = require('../config/database');

async function createSavedSearchesTable() {
  try {
    console.log('Starting saved_searches table migration...');
    
    // Check if the table already exists
    const [tables] = await sequelize.query(`
      SHOW TABLES LIKE 'saved_searches'
    `);
    
    if (tables.length > 0) {
      console.log('saved_searches table already exists, skipping migration');
      return;
    }
    
    // Create the saved_searches table
    await sequelize.query(`
      CREATE TABLE saved_searches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        search_params TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('saved_searches table created successfully');
  } catch (error) {
    console.error('Error creating saved_searches table:', error);
    throw error;
  }
}

module.exports = createSavedSearchesTable;
