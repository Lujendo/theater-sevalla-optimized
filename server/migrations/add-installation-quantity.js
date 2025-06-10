const { sequelize } = require('../config/database');

/**
 * Migration to add installation_quantity column to equipment table
 * This tracks how many items are permanently installed and should be deducted from available quantity
 */
async function addInstallationQuantity() {
  try {
    console.log('🔄 Starting migration: Add installation_quantity column to equipment table');

    // Check if installation_quantity column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'equipment' 
      AND COLUMN_NAME = 'installation_quantity'
    `);

    if (results.length > 0) {
      console.log('✅ installation_quantity column already exists in equipment table');
      return;
    }

    // Add installation_quantity column
    await sequelize.query(`
      ALTER TABLE equipment 
      ADD COLUMN installation_quantity INT NOT NULL DEFAULT 0 
      COMMENT 'Number of items permanently installed (deducted from available quantity)'
    `);

    console.log('✅ Added installation_quantity column to equipment table');

    // Update existing fixed/semi-permanent equipment to have installation_quantity = 1 if they don't have a value
    const [updateResults] = await sequelize.query(`
      UPDATE equipment 
      SET installation_quantity = 1 
      WHERE installation_type IN ('fixed', 'semi-permanent') 
      AND installation_quantity = 0
      AND (installation_location IS NOT NULL OR installation_location_id IS NOT NULL)
    `);

    console.log(`✅ Updated ${updateResults.affectedRows || 0} existing installed equipment items with installation_quantity = 1`);

    console.log('✅ Migration completed successfully: Add installation_quantity column to equipment table');

  } catch (error) {
    console.error('❌ Migration failed: Add installation_quantity column to equipment table');
    console.error('Error details:', error);
    throw error;
  }
}

/**
 * Rollback migration - remove installation_quantity column
 */
async function rollbackInstallationQuantity() {
  try {
    console.log('🔄 Starting rollback: Remove installation_quantity column from equipment table');

    // Check if installation_quantity column exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'equipment' 
      AND COLUMN_NAME = 'installation_quantity'
    `);

    if (results.length === 0) {
      console.log('✅ installation_quantity column does not exist in equipment table');
      return;
    }

    // Remove installation_quantity column
    await sequelize.query(`
      ALTER TABLE equipment 
      DROP COLUMN installation_quantity
    `);

    console.log('✅ Removed installation_quantity column from equipment table');
    console.log('✅ Rollback completed successfully: Remove installation_quantity column from equipment table');

  } catch (error) {
    console.error('❌ Rollback failed: Remove installation_quantity column from equipment table');
    console.error('Error details:', error);
    throw error;
  }
}

// Export functions for use in other scripts
module.exports = {
  addInstallationQuantity,
  rollbackInstallationQuantity
};

// Run migration if called directly
if (require.main === module) {
  addInstallationQuantity()
    .then(() => {
      console.log('🎉 Installation quantity migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Installation quantity migration failed:', error);
      process.exit(1);
    });
}
