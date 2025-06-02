const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

async function createEquipmentTypesTable() {
  try {
    // Check if the table already exists
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'theater_db' 
      AND table_name = 'equipment_types'
    `);

    if (results.length === 0) {
      console.log('Creating equipment_types table...');
      
      // Create the table
      await sequelize.query(`
        CREATE TABLE equipment_types (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('equipment_types table created successfully');
      
      // Insert default equipment types
      await sequelize.query(`
        INSERT INTO equipment_types (name) VALUES 
        ('Lighting'),
        ('Sound'),
        ('Video'),
        ('Rigging'),
        ('Props'),
        ('Costumes'),
        ('Set Pieces'),
        ('Other')
      `);
      
      console.log('Default equipment types inserted successfully');
    } else {
      console.log('equipment_types table already exists');
    }
  } catch (error) {
    console.error('Error creating equipment_types table:', error);
  }
}

module.exports = createEquipmentTypesTable;
