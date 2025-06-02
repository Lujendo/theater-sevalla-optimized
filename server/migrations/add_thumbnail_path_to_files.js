'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('files', 'thumbnail_path', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'file_name'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('files', 'thumbnail_path');
  }
};
