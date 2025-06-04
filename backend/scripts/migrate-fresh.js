const { sequelize, testConnection } = require('../config/database');
const mysql = require('mysql2/promise');

// Fresh migration script - creates new database and all tables
async function migrateFresh() {
  console.log('🚀 Starting fresh database migration...');
  
  try {
    // Test connection first
    console.log('🔗 Testing database connection...');
    await testConnection();
    
    // Drop all tables if they exist
    console.log('🗑️  Dropping existing tables...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const tables = [
      'equipment_logs',
      'equipment',
      'saved_searches', 
      'equipment_categories',
      'equipment_types',
      'locations',
      'users'
    ];
    
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`   ✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`   ⚠️  Table ${table} didn't exist or couldn't be dropped`);
      }
    }
    
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    // Create all tables fresh
    console.log('🏗️  Creating fresh database schema...');
    await sequelize.sync({ force: true });
    console.log('✅ Database schema created successfully');
    
    // Create default data
    console.log('🌱 Seeding default data...');
    await seedDefaultData();
    
    console.log('🎉 Fresh migration completed successfully!');
    console.log('📊 Database is ready for use');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function seedDefaultData() {
  const { User, EquipmentType, Location } = require('../models');
  
  try {
    // Create admin user
    console.log('👤 Creating admin user...');
    await User.create({
      username: 'admin',
      password: 'admin123', // Will be hashed by model hooks
      role: 'admin'
    });
    console.log('   ✅ Admin user created (admin/admin123)');
    
    // Create default equipment types
    console.log('🏷️  Creating default equipment types...');
    const equipmentTypes = [
      { name: 'Lighting' },
      { name: 'Sound' },
      { name: 'Video' },
      { name: 'Rigging' },
      { name: 'Props' },
      { name: 'Costumes' },
      { name: 'Set Pieces' },
      { name: 'Other' }
    ];
    
    await EquipmentType.bulkCreate(equipmentTypes);
    console.log(`   ✅ Created ${equipmentTypes.length} equipment types`);
    
    // Create default location
    console.log('📍 Creating default location...');
    await Location.create({
      name: 'Main Theater',
      street: '123 Broadway',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postal_code: '10001'
    });
    console.log('   ✅ Default location created');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateFresh()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateFresh };
