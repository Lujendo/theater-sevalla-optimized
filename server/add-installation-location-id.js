// Load environment variables
require('dotenv').config({ path: '../.env.development' });

const { sequelize } = require('./config/database');

async function addInstallationLocationId() {
  try {
    console.log('🔧 Adding installation_location_id column to equipment table...');

    // Check if column already exists
    const [results] = await sequelize.query('DESCRIBE equipment');
    const columnExists = results.some(column => column.Field === 'installation_location_id');
    
    if (columnExists) {
      console.log('✅ installation_location_id column already exists');
      return true;
    }

    // Add the installation_location_id column
    await sequelize.query(`
      ALTER TABLE equipment 
      ADD COLUMN installation_location_id INT NULL 
      AFTER installation_type
    `);

    // Add foreign key constraint
    await sequelize.query(`
      ALTER TABLE equipment 
      ADD CONSTRAINT fk_equipment_installation_location 
      FOREIGN KEY (installation_location_id) 
      REFERENCES locations(id) 
      ON DELETE SET NULL 
      ON UPDATE CASCADE
    `);

    console.log('✅ Successfully added installation_location_id column with foreign key constraint');

    // Verify the column was added
    const [newResults] = await sequelize.query('DESCRIBE equipment');
    const newColumn = newResults.find(column => column.Field === 'installation_location_id');
    
    if (newColumn) {
      console.log('✅ Column verification successful:');
      console.log(`   Field: ${newColumn.Field}`);
      console.log(`   Type: ${newColumn.Type}`);
      console.log(`   Null: ${newColumn.Null}`);
      console.log(`   Key: ${newColumn.Key}`);
      console.log(`   Default: ${newColumn.Default || 'NULL'}`);
    }

    return true;
    
  } catch (error) {
    console.error('❌ Error adding installation_location_id column:', error);
    return false;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addInstallationLocationId()
    .then((success) => {
      if (success) {
        console.log('\n✅ Installation location ID migration completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Installation location ID migration failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addInstallationLocationId;
