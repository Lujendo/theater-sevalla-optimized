/**
 * Script to fix database constraints for the Theater Equipment Catalog Management System
 * This script removes the circular reference between Equipment and File models
 */

const { sequelize } = require('../models');

async function fixDatabaseConstraints() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('Starting database constraint fix...');
    
    // Start a transaction
    const transaction = await sequelize.transaction();
    
    try {
      // 1. First, drop the foreign key constraint on equipment.reference_image_id
      console.log('Dropping foreign key constraint on equipment.reference_image_id...');
      
      // Get all constraints for the equipment table
      const [constraints] = await sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'equipment'
        AND COLUMN_NAME = 'reference_image_id'
        AND REFERENCED_TABLE_NAME = 'files'
      `, { transaction });
      
      // Drop each constraint
      for (const constraint of constraints) {
        const constraintName = constraint.CONSTRAINT_NAME;
        console.log(`Dropping constraint: ${constraintName}`);
        await sequelize.query(`
          ALTER TABLE equipment
          DROP FOREIGN KEY ${constraintName}
        `, { transaction });
      }
      
      // 2. Add the foreign key back but with ON DELETE SET NULL
      console.log('Adding new foreign key with ON DELETE SET NULL...');
      await sequelize.query(`
        ALTER TABLE equipment
        ADD CONSTRAINT fk_equipment_reference_image
        FOREIGN KEY (reference_image_id)
        REFERENCES files(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
      `, { transaction });
      
      // Commit the transaction
      await transaction.commit();
      console.log('Database constraints fixed successfully!');
    } catch (error) {
      // Rollback the transaction if there's an error
      await transaction.rollback();
      console.error('Error fixing database constraints:', error);
      throw error;
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the function
fixDatabaseConstraints();
