'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add installation-related columns to equipment table
      await queryInterface.addColumn('equipment', 'installation_type', {
        type: Sequelize.ENUM('portable', 'fixed', 'semi-permanent'),
        allowNull: false,
        defaultValue: 'portable',
        comment: 'Type of installation: portable (can be moved freely), fixed (permanently installed), semi-permanent (can be moved with special approval)'
      });

      await queryInterface.addColumn('equipment', 'installation_location', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Specific location where fixed/semi-permanent equipment is installed'
      });

      await queryInterface.addColumn('equipment', 'installation_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date when equipment was installed (for fixed/semi-permanent equipment)'
      });

      await queryInterface.addColumn('equipment', 'installation_notes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Technical notes about the installation, access requirements, etc.'
      });

      await queryInterface.addColumn('equipment', 'maintenance_schedule', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Maintenance schedule for fixed installations (e.g., "Monthly", "Quarterly", "Annually")'
      });

      await queryInterface.addColumn('equipment', 'last_maintenance_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date of last maintenance performed'
      });

      await queryInterface.addColumn('equipment', 'next_maintenance_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date when next maintenance is due'
      });

      console.log('Successfully added installation fields to equipment table');
    } catch (error) {
      console.error('Error adding installation fields:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove installation-related columns
      await queryInterface.removeColumn('equipment', 'installation_type');
      await queryInterface.removeColumn('equipment', 'installation_location');
      await queryInterface.removeColumn('equipment', 'installation_date');
      await queryInterface.removeColumn('equipment', 'installation_notes');
      await queryInterface.removeColumn('equipment', 'maintenance_schedule');
      await queryInterface.removeColumn('equipment', 'last_maintenance_date');
      await queryInterface.removeColumn('equipment', 'next_maintenance_date');

      // Remove the ENUM type
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_equipment_installation_type";');

      console.log('Successfully removed installation fields from equipment table');
    } catch (error) {
      console.error('Error removing installation fields:', error);
      throw error;
    }
  }
};
