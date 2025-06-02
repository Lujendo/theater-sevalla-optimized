/**
 * Script to fix database constraints for the Theater Equipment Catalog Management System
 * This script removes the circular reference between Equipment and File models
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDatabaseConstraints() {
  // Create connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'theater_db'
  });

  try {
    console.log('Starting database constraint fix...');
    
    // Start transaction
    await connection.beginTransaction();
    
    // Find all foreign key constraints on equipment.reference_image_id
    const [constraints] = await connection.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'equipment'
      AND COLUMN_NAME = 'reference_image_id'
      AND REFERENCED_TABLE_NAME = 'files'
    `);
    
    console.log('Found constraints:', constraints);
    
    // Drop each constraint
    for (const constraint of constraints) {
      const constraintName = constraint.CONSTRAINT_NAME;
      console.log(`Dropping constraint: ${constraintName}`);
      await connection.query(`
        ALTER TABLE equipment
        DROP FOREIGN KEY ${constraintName}
      `);
    }
    
    // Add the foreign key back but with ON DELETE SET NULL
    console.log('Adding new foreign key with ON DELETE SET NULL...');
    await connection.query(`
      ALTER TABLE equipment
      ADD CONSTRAINT fk_equipment_reference_image
      FOREIGN KEY (reference_image_id)
      REFERENCES files(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE
    `);
    
    // Commit the transaction
    await connection.commit();
    console.log('Database constraints fixed successfully!');
  } catch (error) {
    // Rollback the transaction if there's an error
    await connection.rollback();
    console.error('Error fixing database constraints:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await connection.end();
  }
}

// Run the function
fixDatabaseConstraints();
