/**
 * Migration to fix the circular reference between Equipment and File models
 * This script modifies the foreign key constraint on equipment.reference_image_id
 * to use ON DELETE SET NULL, which allows files to be deleted even when referenced
 * by equipment records.
 */

const { sequelize } = require('../config/database');

async function fixCircularReference() {
  try {
    console.log('Starting circular reference fix migration...');

    // First check if the equipment and files tables exist
    const [equipmentTableCheck] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'equipment'
    `);

    if (equipmentTableCheck[0].count === 0) {
      console.log('Equipment table does not exist yet, skipping circular reference fix');
      return;
    }

    const [filesTableCheck] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'files'
    `);

    if (filesTableCheck[0].count === 0) {
      console.log('Files table does not exist yet, skipping circular reference fix');
      return;
    }

    // Check if the migration has already been applied
    const [migrationCheck] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_NAME = 'fk_equipment_reference_image'
    `);

    if (migrationCheck[0].count > 0) {
      console.log('Migration already applied (fk_equipment_reference_image constraint exists)');
      return;
    }

    // Check if reference_image_id column exists in equipment table
    const [columnCheck] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'equipment'
      AND COLUMN_NAME = 'reference_image_id'
    `);

    if (columnCheck[0].count === 0) {
      console.log('reference_image_id column does not exist in equipment table, skipping migration');
      return;
    }

    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // 1. Find all existing foreign key constraints on equipment.reference_image_id
      console.log('Finding existing foreign key constraints on equipment.reference_image_id...');

      const [constraints] = await sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'equipment'
        AND COLUMN_NAME = 'reference_image_id'
        AND REFERENCED_TABLE_NAME = 'files'
      `, { transaction });

      // 2. Drop each constraint found
      for (const constraint of constraints) {
        const constraintName = constraint.CONSTRAINT_NAME;
        console.log(`Dropping constraint: ${constraintName}`);

        await sequelize.query(`
          ALTER TABLE equipment
          DROP FOREIGN KEY ${constraintName}
        `, { transaction });
      }

      // 3. Add the new foreign key with ON DELETE SET NULL
      console.log('Adding new foreign key with ON DELETE SET NULL...');

      await sequelize.query(`
        ALTER TABLE equipment
        ADD CONSTRAINT fk_equipment_reference_image
        FOREIGN KEY (reference_image_id)
        REFERENCES files(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
      `, { transaction });

      // Commit the transaction
      await transaction.commit();
      console.log('Circular reference fix migration completed successfully!');
    } catch (error) {
      // Rollback the transaction if there's an error
      await transaction.rollback();
      console.log('Error in circular reference fix migration, rolling back:', error.message);
      // Don't throw the error, just log it and continue
      return;
    }
  } catch (error) {
    console.log('Error in circular reference fix migration:', error.message);
    // Don't throw the error, just log it and continue
    return;
  }
}

module.exports = fixCircularReference;
