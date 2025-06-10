const { sequelize } = require('../config/database.local');

async function addDescriptionToLocations() {
  try {
    console.log('🔄 Checking if locations table needs description column...');
    
    // Check if the description column already exists
    const [descriptionColumn] = await sequelize.query(`
      SHOW COLUMNS FROM locations LIKE 'description'
    `);
    
    if (descriptionColumn.length === 0) {
      console.log('➕ Adding description column to locations table...');
      
      // Add the description column
      await sequelize.query(`
        ALTER TABLE locations 
        ADD COLUMN description TEXT AFTER name
      `);
      
      console.log('✅ Description column added to locations table successfully');
    } else {
      console.log('✅ Description column already exists in locations table');
    }
    
    console.log('✅ Locations table description column migration completed');
    return true;
  } catch (error) {
    console.error('❌ Error during locations description column migration:', error);
    return false;
  }
}

module.exports = { addDescriptionToLocations };
