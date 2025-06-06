const { sequelize } = require('../config/database');

const createShowsTables = async () => {
  try {
    console.log('Creating shows tables...');

    // Create shows table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS shows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        venue VARCHAR(255),
        director VARCHAR(255),
        description TEXT,
        status ENUM('planning', 'in-progress', 'completed', 'archived') NOT NULL DEFAULT 'planning',
        created_by INT NOT NULL,
        updated_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_shows_status (status),
        INDEX idx_shows_date (date),
        INDEX idx_shows_created_by (created_by),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Shows table created successfully');

    // Create show_equipment table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS show_equipment (
        id INT AUTO_INCREMENT PRIMARY KEY,
        show_id INT NOT NULL,
        equipment_id INT NOT NULL,
        quantity_needed INT NOT NULL DEFAULT 1,
        quantity_allocated INT NOT NULL DEFAULT 0,
        status ENUM('requested', 'allocated', 'checked-out', 'in-use', 'returned') NOT NULL DEFAULT 'requested',
        notes TEXT,
        checkout_date TIMESTAMP NULL,
        return_date TIMESTAMP NULL,
        checked_out_by INT,
        returned_by INT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_show_equipment_show_id (show_id),
        INDEX idx_show_equipment_equipment_id (equipment_id),
        INDEX idx_show_equipment_status (status),
        UNIQUE KEY unique_show_equipment (show_id, equipment_id),
        FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE,
        FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
        FOREIGN KEY (checked_out_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (returned_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Show equipment table created successfully');
    console.log('✅ Shows tables migration completed');

  } catch (error) {
    console.error('❌ Error creating shows tables:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  createShowsTables()
    .then(() => {
      console.log('Shows tables migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Shows tables migration failed:', error);
      process.exit(1);
    });
}

module.exports = createShowsTables;
