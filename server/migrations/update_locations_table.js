const { sequelize } = require('../config/database');

async function updateLocationsTable() {
  try {
    console.log('Checking if locations table needs to be updated...');
    
    // Check if the street column exists
    const [streetColumn] = await sequelize.query(`
      SHOW COLUMNS FROM locations LIKE 'street'
    `);
    
    if (streetColumn.length === 0) {
      console.log('Updating locations table with detailed address fields...');
      
      // Drop the address column and add detailed address fields
      await sequelize.query(`
        ALTER TABLE locations
        DROP COLUMN address,
        ADD COLUMN street VARCHAR(255),
        ADD COLUMN postal_code VARCHAR(20),
        ADD COLUMN city VARCHAR(100),
        ADD COLUMN region VARCHAR(100),
        ADD COLUMN country VARCHAR(100)
      `);
      
      console.log('Locations table updated successfully with detailed address fields');
    } else {
      console.log('Locations table already has detailed address fields');
    }
    
    console.log('Location table update migration completed successfully');
  } catch (error) {
    console.error('Error during locations table update migration:', error);
  }
}

module.exports = updateLocationsTable;
