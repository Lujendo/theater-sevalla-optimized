/**
 * Migration to add category field to equipment table
 * This script adds a category column to the equipment table
 */

const { sequelize } = require('../config/database');

async function addCategoryToEquipment() {
  try {
    console.log('Starting category field migration...');

    // First check if the equipment table exists
    const [equipmentTableCheck] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'equipment'
    `);

    if (equipmentTableCheck[0].count === 0) {
      console.log('Equipment table does not exist yet, skipping category field migration');
      return;
    }

    // Check if the column already exists
    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM equipment LIKE 'category_id'
    `);

    if (columns.length === 0) {
      console.log('Adding category_id column to equipment table...');

      // Add the column
      await sequelize.query(`
        ALTER TABLE equipment
        ADD COLUMN category_id INT NULL
      `);

      console.log('Category_id column added successfully');
    } else {
      console.log('Category_id column already exists');
    }

    console.log('Category field migration completed successfully');
  } catch (error) {
    console.log('Error during category field migration:', error.message);
    // Don't throw the error, just log it and continue
  }
}

module.exports = addCategoryToEquipment;
