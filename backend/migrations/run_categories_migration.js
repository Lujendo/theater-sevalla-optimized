/**
 * Script to run the create_categories_table migration
 */
const createCategoriesTable = require('./create_categories_table');

// Run the migration
createCategoriesTable()
  .then(() => {
    console.log('Categories table migration completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Categories table migration failed:', err);
    process.exit(1);
  });
