const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EquipmentType = sequelize.define('EquipmentType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    // Remove unique constraint here to prevent "Too many keys" error
    // The uniqueness is already enforced by the database table creation
    validate: {
      notEmpty: true
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'equipment_types',
  timestamps: false,
  hooks: {
    beforeUpdate: (type) => {
      type.updated_at = new Date();
    }
  }
});

module.exports = EquipmentType;
