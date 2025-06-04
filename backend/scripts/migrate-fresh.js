const { sequelize, testConnection } = require('../config/database');

// Fresh migration script - creates new database and all tables
// Optimized for MySQL 9.0
async function migrateFresh() {
  console.log('🚀 Starting fresh database migration for MySQL 9.0...');
  
  try {
    // Test connection first
    console.log('🔗 Testing database connection...');
    await testConnection();
    
    // Check MySQL version
    const [results] = await sequelize.query('SELECT VERSION() as version');
    console.log(`📊 MySQL Version: ${results[0].version}`);
    
    // Drop all tables if they exist (MySQL 9.0 optimized)
    console.log('🗑️  Dropping existing tables...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.query('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO"');
    
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
    
    // Create all tables fresh with MySQL 9.0 optimizations
    console.log('🏗️  Creating fresh database schema with MySQL 9.0 optimizations...');
    await sequelize.sync({ 
      force: true,
      alter: false,
      logging: console.log
    });
    console.log('✅ Database schema created successfully');
    
    // Create default data
    console.log('🌱 Seeding default data...');
    await seedDefaultData();
    
    // Optimize tables for MySQL 9.0
    console.log('⚡ Optimizing tables for MySQL 9.0...');
    await optimizeTables();
    
    console.log('🎉 Fresh migration completed successfully!');
    console.log('📊 Database is ready for use with MySQL 9.0');
    
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

async function optimizeTables() {
  try {
    const tables = [
      'users',
      'equipment_types',
      'locations',
      'equipment',
      'equipment_logs',
      'equipment_categories',
      'saved_searches'
    ];
    
    for (const table of tables) {
      try {
        // Analyze table for MySQL 9.0 optimization
        await sequelize.query(`ANALYZE TABLE ${table}`);
        console.log(`   ✅ Analyzed table: ${table}`);
        
        // Optimize table structure
        await sequelize.query(`OPTIMIZE TABLE ${table}`);
        console.log(`   ⚡ Optimized table: ${table}`);
      } catch (error) {
        console.log(`   ⚠️  Could not optimize table ${table}: ${error.message}`);
      }
    }
    
    console.log('✅ Table optimization completed');
    
  } catch (error) {
    console.error('❌ Table optimization failed:', error);
    // Don't throw - optimization is not critical
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
