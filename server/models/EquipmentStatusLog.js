const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EquipmentStatusLog = sequelize.define('EquipmentStatusLog', {
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
  allocation_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'inventory_allocation',
      key: 'id'
    },
    comment: 'Reference to inventory allocation if applicable'
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
    type: DataTypes.ENUM('created', 'allocated', 'moved', 'status_changed', 'returned', 'maintenance', 'deleted'),
    allowNull: false
  },
  previous_status: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  new_status: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  previous_location_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'locations',
      key: 'id'
    }
  },
  new_location_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'locations',
      key: 'id'
    }
  },
  previous_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  new_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'equipment_status_log',
  timestamps: false,
  indexes: [
    {
      fields: ['equipment_id']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['action_type']
    }
  ]
});

module.exports = EquipmentStatusLog;
