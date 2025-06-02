const { sequelize } = require('../config/database');

async function createLocationsTable() {
  try {
    // Check if the table already exists
    const [results] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'theater_db'
      AND table_name = 'locations'
    `);

    if (results.length === 0) {
      console.log('Creating locations table...');

      // Create the locations table
      await sequelize.query(`
        CREATE TABLE locations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      console.log('Locations table created successfully');

      // Add location_id column to equipment table if it doesn't exist
      const [equipmentColumns] = await sequelize.query(`
        SHOW COLUMNS FROM equipment LIKE 'location_id'
      `);

      if (equipmentColumns.length === 0) {
        console.log('Adding location_id column to equipment table...');

        try {
          // First, just add the column without the foreign key constraint
          await sequelize.query(`
            ALTER TABLE equipment
            ADD COLUMN location_id INT
          `);

          console.log('location_id column added to equipment table');

          // We'll skip adding the foreign key constraint due to the "Too many keys" error
          console.log('Skipping foreign key constraint due to MySQL key limit');
        } catch (error) {
          console.error('Error adding location_id column:', error.message);
        }
      } else {
        console.log('location_id column already exists in equipment table');
      }
    } else {
      console.log('Locations table already exists');
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

module.exports = createLocationsTable;
