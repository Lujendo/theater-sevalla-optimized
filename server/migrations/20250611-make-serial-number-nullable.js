'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make serial_number column nullable
    await queryInterface.changeColumn('equipment', 'serial_number', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert: make serial_number column NOT NULL again
    // Note: This might fail if there are null values in the database
    await queryInterface.changeColumn('equipment', 'serial_number', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
