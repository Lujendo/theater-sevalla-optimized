/**
 * Migration script to add the category field to the equipment table
 */
const mysql = require('mysql2/promise');
const { dbConfig } = require('../config/database');

async function runMigration() {
  let connection;
  try {
    // Create a connection to the database
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database
    });

    console.log('Connected to the database');

    // Check if the category column already exists
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM equipment LIKE 'category'
    `);

    if (columns.length > 0) {
      console.log('The category column already exists in the equipment table');
      return;
    }

    // Add the category column to the equipment table
    await connection.execute(`
      ALTER TABLE equipment
      ADD COLUMN category VARCHAR(255) NULL AFTER type_id
    `);

    console.log('Successfully added the category column to the equipment table');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the migration
runMigration();
