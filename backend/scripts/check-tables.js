const { sequelize } = require('../config/database');
const { EquipmentType, User } = require('../models');

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Check if tables exist
    const [results] = await sequelize.query("SHOW TABLES");
    console.log('📊 Available tables:', results.map(r => Object.values(r)[0]));
    
    // Test EquipmentType model
    try {
      const typeCount = await EquipmentType.count();
      console.log('✅ EquipmentType table accessible, count:', typeCount);
    } catch (error) {
      console.error('❌ EquipmentType table error:', error.message);
    }
    
    // Test User model
    try {
      const userCount = await User.count();
      console.log('✅ User table accessible, count:', userCount);
    } catch (error) {
      console.error('❌ User table error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    process.exit(0);
  }
}

checkTables();
