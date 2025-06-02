const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EquipmentLog = sequelize.define('EquipmentLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  equipment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'equipment',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action_type: {
    type: DataTypes.ENUM('created', 'updated', 'deleted', 'status_change', 'location_change'),
    allowNull: false
  },
  previous_status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  new_status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  previous_location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  new_location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'equipment_logs',
  timestamps: false
});

module.exports = EquipmentLog;
