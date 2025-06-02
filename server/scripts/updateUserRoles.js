/**
 * Migration script to update the users table to support the new role system
 * 
 * This script:
 * 1. Alters the 'role' column to support 'admin', 'advanced', and 'basic' roles
 * 2. Updates existing 'user' roles to 'basic'
 * 
 * Run this script with: node server/scripts/updateUserRoles.js
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function updateUserRoles() {
  const transaction = await sequelize.transaction();

  try {
    console.log('Starting user roles migration...');

    // Check if the enum already includes 'advanced' and 'basic'
    const checkEnumQuery = `
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'role'
      AND TABLE_SCHEMA = '${process.env.DB_NAME}'
    `;
    
    const [enumResult] = await sequelize.query(checkEnumQuery, { 
      type: QueryTypes.SELECT,
      transaction
    });
    
    const currentEnum = enumResult.COLUMN_TYPE;
    console.log(`Current role enum: ${currentEnum}`);
    
    // Only modify if needed
    if (!currentEnum.includes('advanced') || !currentEnum.includes('basic')) {
      console.log('Modifying role enum to include new roles...');
      
      // Modify the enum to include the new roles
      await sequelize.query(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('admin', 'advanced', 'basic') NOT NULL DEFAULT 'basic'
      `, { transaction });
      
      // Update existing 'user' roles to 'basic'
      const updateResult = await sequelize.query(`
        UPDATE users 
        SET role = 'basic' 
        WHERE role = 'user'
      `, { transaction });
      
      console.log(`Updated ${updateResult[0].affectedRows} users from 'user' to 'basic' role`);
    } else {
      console.log('Role enum already includes the required values. No changes needed.');
    }
    
    // Commit the transaction
    await transaction.commit();
    console.log('User roles migration completed successfully!');
    
  } catch (error) {
    // Rollback the transaction in case of error
    await transaction.rollback();
    console.error('Error during user roles migration:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await sequelize.close();
    process.exit(0);
  }
}

// Run the migration
updateUserRoles();
