const { sequelize } = require('../config/database.local');

async function runInstallationMigration() {
  try {
    console.log('Starting installation fields migration...');

    // Add installation_type column
    await sequelize.query(`
      ALTER TABLE equipment
      ADD COLUMN installation_type TEXT DEFAULT 'portable'
    `);
    console.log('✓ Added installation_type column');

    // Add installation_location column
    await sequelize.query(`
      ALTER TABLE equipment
      ADD COLUMN installation_location TEXT
    `);
    console.log('✓ Added installation_location column');

    // Add installation_date column
    await sequelize.query(`
      ALTER TABLE equipment
      ADD COLUMN installation_date TEXT
    `);
    console.log('✓ Added installation_date column');

    // Add installation_notes column
    await sequelize.query(`
      ALTER TABLE equipment
      ADD COLUMN installation_notes TEXT
    `);
    console.log('✓ Added installation_notes column');

    // Add maintenance_schedule column
    await sequelize.query(`
      ALTER TABLE equipment
      ADD COLUMN maintenance_schedule TEXT
    `);
    console.log('✓ Added maintenance_schedule column');

    // Add last_maintenance_date column
    await sequelize.query(`
      ALTER TABLE equipment
      ADD COLUMN last_maintenance_date TEXT
    `);
    console.log('✓ Added last_maintenance_date column');

    // Add next_maintenance_date column
    await sequelize.query(`
      ALTER TABLE equipment
      ADD COLUMN next_maintenance_date TEXT
    `);
    console.log('✓ Added next_maintenance_date column');

    console.log('✅ Installation fields migration completed successfully!');
  } catch (error) {
    console.error('❌ Error running installation migration:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runInstallationMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = runInstallationMigration;
