// Get the correct database configuration based on environment
const databaseConfig = process.env.NODE_ENV === 'development'
  ? require('../config/database.local')
  : require('../config/database');
const { sequelize } = databaseConfig;

/**
 * Run the inventory allocation system migration directly
 */
async function runInventoryMigrationDirect() {
  try {
    console.log('🔄 Starting Direct Inventory Allocation System Migration...');

    // 1. Create Inventory Allocation Table
    console.log('📝 Creating inventory_allocation table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS inventory_allocation (
        id INT AUTO_INCREMENT PRIMARY KEY,
        equipment_id INT NOT NULL,
        location_id INT NOT NULL,
        quantity_allocated INT NOT NULL DEFAULT 1,
        status ENUM('allocated', 'in-use', 'reserved', 'returned', 'maintenance') NOT NULL DEFAULT 'allocated',
        allocation_type ENUM('general', 'show', 'maintenance', 'storage') NOT NULL DEFAULT 'general',
        show_id INT NULL COMMENT 'Reference to show if allocation is for a specific show',
        event_id INT NULL COMMENT 'Reference to event if allocation is for a specific event',
        allocated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        return_date TIMESTAMP NULL,
        expected_return_date TIMESTAMP NULL,
        allocated_by INT NOT NULL,
        returned_by INT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
        FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE SET NULL,
        FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (returned_by) REFERENCES users(id) ON DELETE SET NULL,
        
        INDEX idx_inventory_equipment_id (equipment_id),
        INDEX idx_inventory_location_id (location_id),
        INDEX idx_inventory_status (status),
        INDEX idx_inventory_allocation_type (allocation_type),
        INDEX idx_inventory_show_id (show_id),
        INDEX idx_inventory_allocated_date (allocated_date)
      )
    `);
    console.log('✅ inventory_allocation table created');

    // 2. Create Status Log Table
    console.log('📝 Creating equipment_status_log table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS equipment_status_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        equipment_id INT NOT NULL,
        allocation_id INT NULL COMMENT 'Reference to inventory allocation if applicable',
        user_id INT NOT NULL,
        action_type ENUM('created', 'allocated', 'moved', 'status_changed', 'returned', 'maintenance', 'deleted') NOT NULL,
        previous_status VARCHAR(50),
        new_status VARCHAR(50),
        previous_location_id INT NULL,
        new_location_id INT NULL,
        previous_quantity INT NULL,
        new_quantity INT NULL,
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
        FOREIGN KEY (allocation_id) REFERENCES inventory_allocation(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (previous_location_id) REFERENCES locations(id) ON DELETE SET NULL,
        FOREIGN KEY (new_location_id) REFERENCES locations(id) ON DELETE SET NULL,
        
        INDEX idx_status_log_equipment_id (equipment_id),
        INDEX idx_status_log_timestamp (timestamp),
        INDEX idx_status_log_action_type (action_type)
      )
    `);
    console.log('✅ equipment_status_log table created');

    // 3. Check if quantity column exists in equipment table
    console.log('📝 Checking equipment table for quantity column...');
    try {
      const [columns] = await sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'equipment' 
        AND COLUMN_NAME = 'quantity'
      `);
      
      if (columns.length === 0) {
        console.log('📝 Adding quantity column to equipment table...');
        await sequelize.query(`
          ALTER TABLE equipment 
          ADD COLUMN quantity INT NOT NULL DEFAULT 1 
          COMMENT 'Total quantity of this equipment item'
        `);
        console.log('✅ quantity column added to equipment table');
      } else {
        console.log('✅ quantity column already exists in equipment table');
      }
    } catch (error) {
      console.log('⚠️  Could not check/add quantity column:', error.message);
    }

    // 4. Update equipment status enum
    console.log('📝 Updating equipment status enum...');
    try {
      await sequelize.query(`
        ALTER TABLE equipment 
        MODIFY COLUMN status ENUM('available', 'in-use', 'maintenance', 'unavailable', 'broken', 'reserved') 
        NOT NULL DEFAULT 'available'
      `);
      console.log('✅ equipment status enum updated');
    } catch (error) {
      console.log('⚠️  Could not update equipment status enum:', error.message);
    }

    // 5. Create equipment availability view
    console.log('📝 Creating equipment_availability view...');
    try {
      await sequelize.query(`DROP VIEW IF EXISTS equipment_availability`);
      await sequelize.query(`
        CREATE VIEW equipment_availability AS
        SELECT 
          e.id as equipment_id,
          e.type,
          e.brand,
          e.model,
          e.serial_number,
          e.status as equipment_status,
          e.quantity as total_quantity,
          COALESCE(allocated.total_allocated, 0) as total_allocated,
          COALESCE(show_allocated.show_allocated, 0) as show_allocated,
          (e.quantity - COALESCE(allocated.total_allocated, 0) - COALESCE(show_allocated.show_allocated, 0)) as available_quantity,
          e.location as default_location,
          e.location_id as default_location_id
        FROM equipment e
        LEFT JOIN (
          SELECT 
            equipment_id,
            SUM(quantity_allocated) as total_allocated
          FROM inventory_allocation 
          WHERE status IN ('allocated', 'in-use', 'reserved')
          GROUP BY equipment_id
        ) allocated ON e.id = allocated.equipment_id
        LEFT JOIN (
          SELECT 
            equipment_id,
            SUM(quantity_allocated) as show_allocated
          FROM show_equipment 
          WHERE status IN ('requested', 'allocated', 'checked-out', 'in-use')
          GROUP BY equipment_id
        ) show_allocated ON e.id = show_allocated.equipment_id
      `);
      console.log('✅ equipment_availability view created');
    } catch (error) {
      console.log('⚠️  Could not create equipment_availability view:', error.message);
    }

    // 6. Create location inventory view
    console.log('📝 Creating location_inventory view...');
    try {
      await sequelize.query(`DROP VIEW IF EXISTS location_inventory`);
      await sequelize.query(`
        CREATE VIEW location_inventory AS
        SELECT 
          l.id as location_id,
          l.name as location_name,
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
          u.username as allocated_by_user
        FROM locations l
        JOIN inventory_allocation ia ON l.id = ia.location_id
        JOIN equipment e ON ia.equipment_id = e.id
        JOIN users u ON ia.allocated_by = u.id
        WHERE ia.status IN ('allocated', 'in-use', 'reserved')
        ORDER BY l.name, e.type, e.brand, e.model
      `);
      console.log('✅ location_inventory view created');
    } catch (error) {
      console.log('⚠️  Could not create location_inventory view:', error.message);
    }

    console.log('✅ Direct Inventory Allocation System Migration completed successfully!');
    
    // Verify the tables were created
    await verifyTables();
    
    return true;
  } catch (error) {
    console.error('❌ Direct migration failed:', error);
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
      await runInventoryMigrationDirect();
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
  runInventoryMigrationDirect,
  runMigrationIfNeeded,
  verifyTables,
  isMigrationNeeded
};
