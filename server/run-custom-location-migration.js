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

async function runCustomLocationMigration() {
  try {
    console.log('🔧 Running custom location migration...');
    
    // Add custom_location column
    console.log('📝 Adding custom_location column...');
    await sequelize.query(`
      ALTER TABLE inventory_allocation 
      ADD COLUMN IF NOT EXISTS custom_location VARCHAR(255) NULL 
      COMMENT 'Custom location name when not using predefined locations'
      AFTER location_id;
    `);
    
    // Make location_id nullable
    console.log('📝 Making location_id nullable...');
    await sequelize.query(`
      ALTER TABLE inventory_allocation 
      MODIFY COLUMN location_id INT NULL;
    `);
    
    // Update the location_inventory view
    console.log('📝 Updating location_inventory view...');
    await sequelize.query(`DROP VIEW IF EXISTS location_inventory;`);
    
    await sequelize.query(`
      CREATE VIEW location_inventory AS
      SELECT 
        COALESCE(l.id, 0) as location_id,
        COALESCE(l.name, ia.custom_location) as location_name,
        e.id as equipment_id,
        e.type,
        e.brand,
        e.model,
        e.serial_number,
        ia.quantity_allocated,
        ia.status as allocation_status,
        ia.allocation_type,
        ia.allocated_date,
        ia.expected_return_date,
        u.username as allocated_by_user,
        ia.custom_location
      FROM inventory_allocation ia
      LEFT JOIN locations l ON ia.location_id = l.id
      JOIN equipment e ON ia.equipment_id = e.id
      JOIN users u ON ia.allocated_by = u.id
      WHERE ia.status IN ('allocated', 'in-use', 'reserved')
      ORDER BY COALESCE(l.name, ia.custom_location), e.type, e.brand, e.model;
    `);
    
    console.log('✅ Custom location migration completed successfully!');
    console.log('📝 inventory_allocation table now supports custom locations');
    console.log('📝 location_inventory view updated to include custom locations');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

runCustomLocationMigration();
