const { sequelize } = require('../config/database');

async function addCategoryIdToEquipment() {
  try {
    console.log('Starting migration: Adding category_id column to equipment table...');

    // Check if the column already exists
    const [checkResults] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'equipment' 
      AND COLUMN_NAME = 'category_id'
    `);

    if (checkResults.length > 0) {
      console.log('Column category_id already exists in equipment table. Skipping migration.');
      return;
    }

    // Add the category_id column to the equipment table
    await sequelize.query(`
      ALTER TABLE equipment 
      ADD COLUMN category_id INT,
      ADD CONSTRAINT fk_equipment_category
      FOREIGN KEY (category_id) 
      REFERENCES equipment_categories(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE
    `);

    console.log('Successfully added category_id column to equipment table.');
  } catch (error) {
    console.error('Error adding category_id column to equipment table:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addCategoryIdToEquipment()
    .then(() => {
      console.log('Migration completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addCategoryIdToEquipment;
