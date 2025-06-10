const { sequelize } = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Run the inventory allocation system migration
 */
async function runInventoryMigration() {
  try {
    console.log('🔄 Starting Inventory Allocation System Migration...');

    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'create_inventory_allocation_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        // Handle SET statements and other MySQL-specific syntax
        if (statement.includes('SET @') || statement.includes('PREPARE') || statement.includes('EXECUTE') || statement.includes('DEALLOCATE')) {
          // Execute MySQL-specific statements directly
          await sequelize.query(statement);
        } else {
          // Execute regular statements
          await sequelize.query(statement);
        }
        
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        // Check if it's a "table already exists" error or similar
        if (error.message.includes('already exists') || 
            error.message.includes('Duplicate column') ||
            error.message.includes('Multiple primary key')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message.split('\n')[0]}`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    console.log('✅ Inventory Allocation System Migration completed successfully!');
    
    // Verify the tables were created
    await verifyTables();
    
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Verify that the required tables were created
 */
async function verifyTables() {
  try {
    console.log('🔍 Verifying created tables...');

    const tables = ['inventory_allocation', 'equipment_status_log'];
    
    for (const table of tables) {
      try {
        await sequelize.query(`DESCRIBE ${table}`);
        console.log(`✅ Table '${table}' exists and is accessible`);
      } catch (error) {
        console.error(`❌ Table '${table}' verification failed:`, error.message);
        throw new Error(`Required table '${table}' was not created properly`);
      }
    }

    // Verify views
    const views = ['equipment_availability', 'location_inventory'];
    
    for (const view of views) {
      try {
        await sequelize.query(`SELECT 1 FROM ${view} LIMIT 1`);
        console.log(`✅ View '${view}' exists and is accessible`);
      } catch (error) {
        console.error(`❌ View '${view}' verification failed:`, error.message);
        // Views are not critical, so we don't throw here
      }
    }

    console.log('✅ All required database objects verified successfully');
  } catch (error) {
    console.error('❌ Table verification failed:', error);
    throw error;
  }
}

/**
 * Check if migration is needed
 */
async function isMigrationNeeded() {
  try {
    // Check if inventory_allocation table exists
    await sequelize.query('DESCRIBE inventory_allocation');
    console.log('ℹ️  Inventory allocation system already exists');
    return false;
  } catch (error) {
    console.log('ℹ️  Inventory allocation system needs to be created');
    return true;
  }
}

/**
 * Main migration function
 */
async function runMigrationIfNeeded() {
  try {
    const needsMigration = await isMigrationNeeded();
    
    if (needsMigration) {
      await runInventoryMigration();
      console.log('🎉 Inventory allocation system setup completed!');
    } else {
      console.log('✅ Inventory allocation system is already set up');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    return false;
  }
}

module.exports = {
  runInventoryMigration,
  runMigrationIfNeeded,
  verifyTables,
  isMigrationNeeded
};
