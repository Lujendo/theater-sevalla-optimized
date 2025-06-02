const { sequelize } = require('../config/database');

async function addThumbnailPathColumn() {
  try {
    // First check if the files table exists
    const [filesTableCheck] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'files'
    `);

    if (filesTableCheck[0].count === 0) {
      console.log('Files table does not exist yet, skipping thumbnail_path migration');
      return;
    }

    // Check if the column already exists
    const [results] = await sequelize.query(
      "SHOW COLUMNS FROM files LIKE 'thumbnail_path'"
    );

    if (results.length === 0) {
      // Column doesn't exist, add it
      await sequelize.query(
        "ALTER TABLE files ADD COLUMN thumbnail_path VARCHAR(255) NULL"
      );
      console.log('Successfully added thumbnail_path column to files table');
    } else {
      console.log('thumbnail_path column already exists in files table');
    }
  } catch (error) {
    console.log('Error during thumbnail_path migration:', error.message);
    // Don't throw the error, just log it and continue
  }
}

// Export the function for use in index.js
module.exports = addThumbnailPathColumn;
