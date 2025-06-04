const { sequelize } = require('../config/database');

async function addLocationIdManually() {
  try {
    // First check if the equipment table exists
    const [equipmentTableCheck] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'equipment'
    `);

    if (equipmentTableCheck[0].count === 0) {
      console.log('Equipment table does not exist yet, skipping location_id migration');
      return;
    }

    console.log('Checking if location_id column exists in equipment table...');

    // Check if the column already exists
    const [equipmentColumns] = await sequelize.query(`
      SHOW COLUMNS FROM equipment LIKE 'location_id'
    `);

    if (equipmentColumns.length === 0) {
      console.log('Adding location_id column to equipment table...');

      // Add the column without foreign key constraint
      await sequelize.query(`
        ALTER TABLE equipment
        ADD COLUMN location_id INT NULL
      `);

      console.log('location_id column added successfully');
    } else {
      console.log('location_id column already exists');
    }

    console.log('Manual migration completed successfully');
  } catch (error) {
    console.log('Error during location_id migration:', error.message);
    // Don't throw the error, just log it and continue
  }
}

module.exports = addLocationIdManually;
