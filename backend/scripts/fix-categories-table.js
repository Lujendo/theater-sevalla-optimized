/**
 * Script to fix the equipment_categories table issue
 * This script safely handles the UNIQUE constraint issue
 */

const { sequelize } = require('../config/database');

async function fixCategoriesTable() {
  try {
    console.log('🔧 Starting categories table fix...');

    // Check if the table exists
    const [tables] = await sequelize.query(`
      SHOW TABLES LIKE 'equipment_categories'
    `);

    if (tables.length === 0) {
      console.log('📋 Creating equipment_categories table...');

      // Create the table with proper structure
      await sequelize.query(`
        CREATE TABLE equipment_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_category_name (name)
        )
      `);

      console.log('✅ equipment_categories table created successfully');
    } else {
      console.log('📋 equipment_categories table exists, checking indexes...');

      // Get all indexes on the table
      const [allIndexes] = await sequelize.query(`
        SHOW INDEX FROM equipment_categories
      `);

      console.log(`📊 Found ${allIndexes.length} indexes on equipment_categories table`);

      // Check if we have too many indexes
      const uniqueIndexes = allIndexes.filter(idx => idx.Key_name !== 'PRIMARY');

      if (uniqueIndexes.length > 60) {
        console.log('⚠️  Too many indexes detected, cleaning up...');

        // Remove duplicate or unnecessary indexes
        const indexesToDrop = [];
        const seenIndexes = new Set();

        for (const index of uniqueIndexes) {
          if (seenIndexes.has(index.Key_name) ||
              index.Key_name.includes('name') && index.Key_name !== 'unique_category_name') {
            indexesToDrop.push(index.Key_name);
          }
          seenIndexes.add(index.Key_name);
        }

        // Drop unnecessary indexes
        for (const indexName of indexesToDrop) {
          try {
            await sequelize.query(`
              ALTER TABLE equipment_categories DROP INDEX \`${indexName}\`
            `);
            console.log(`🗑️  Dropped index: ${indexName}`);
          } catch (dropError) {
            console.log(`⚠️  Could not drop index ${indexName}: ${dropError.message}`);
          }
        }
      }

      // Check if our desired UNIQUE constraint exists
      const nameUniqueIndexes = allIndexes.filter(idx =>
        idx.Column_name === 'name' && idx.Non_unique === 0
      );

      if (nameUniqueIndexes.length === 0) {
        console.log('🔧 Adding UNIQUE constraint for name column...');

        try {
          // Add UNIQUE constraint safely
          await sequelize.query(`
            ALTER TABLE equipment_categories
            ADD CONSTRAINT unique_category_name UNIQUE (name)
          `);

          console.log('✅ UNIQUE constraint added successfully');
        } catch (constraintError) {
          console.log('⚠️  Could not add UNIQUE constraint, table might already have it');
        }
      } else {
        console.log('✅ UNIQUE constraint already exists on name column');
      }
    }
    
    // Insert default categories if table is empty
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as count FROM equipment_categories
    `);
    
    if (countResult[0].count === 0) {
      console.log('📝 Inserting default categories...');
      
      const defaultCategories = [
        'Audio Equipment',
        'Video Equipment', 
        'Lighting Equipment',
        'Cables and Connectors',
        'Control and Automation',
        'Rigging and Mounting',
        'Accessories and Consumables',
        'Music Instrument'
      ];
      
      for (const category of defaultCategories) {
        await sequelize.query(`
          INSERT IGNORE INTO equipment_categories (name, description) 
          VALUES (?, ?)
        `, {
          replacements: [category, `Default ${category} category`]
        });
      }
      
      console.log('✅ Default categories inserted');
    }
    
    console.log('🎉 Categories table fix completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing categories table:', error);
    
    // If it's the "too many keys" error, try to fix it
    if (error.code === 'ER_TOO_MANY_KEYS') {
      console.log('🔧 Attempting to fix "too many keys" error...');
      
      try {
        // Drop all non-essential indexes
        await sequelize.query(`
          ALTER TABLE equipment_categories 
          DROP INDEX IF EXISTS name,
          DROP INDEX IF EXISTS equipment_categories_name_unique,
          DROP INDEX IF EXISTS idx_name
        `);
        
        // Add back only the essential UNIQUE constraint
        await sequelize.query(`
          ALTER TABLE equipment_categories 
          ADD CONSTRAINT unique_category_name UNIQUE (name)
        `);
        
        console.log('✅ Fixed "too many keys" error');
        return true;
        
      } catch (fixError) {
        console.error('❌ Could not fix "too many keys" error:', fixError);
        return false;
      }
    }
    
    return false;
  }
}

// Run the fix if called directly
if (require.main === module) {
  fixCategoriesTable()
    .then((success) => {
      if (success) {
        console.log('✅ Categories table fix completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Categories table fix failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = fixCategoriesTable;
