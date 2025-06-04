/**
 * Script to run the add_category_to_equipment migration
 */
const addCategoryToEquipment = require('./add_category_to_equipment');

// Run the migration
addCategoryToEquipment()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
