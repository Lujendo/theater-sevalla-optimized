const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: console.log
  }
);

async function runMigration() {
  try {
    console.log('🔧 Running migration to make serial_number nullable...');
    
    // Run the SQL directly
    await sequelize.query(`
      ALTER TABLE equipment 
      MODIFY COLUMN serial_number VARCHAR(255) NULL;
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('📝 serial_number column is now nullable');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

runMigration();
