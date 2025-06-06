const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ShowEquipment = sequelize.define('ShowEquipment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  show_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'shows',
      key: 'id'
    }
  },
  equipment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'equipment',
      key: 'id'
    }
  },
  quantity_needed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  quantity_allocated: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('requested', 'allocated', 'checked-out', 'in-use', 'returned'),
    allowNull: false,
    defaultValue: 'requested'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  checkout_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  return_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checked_out_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  returned_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'show_equipment',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['show_id']
    },
    {
      fields: ['equipment_id']
    },
    {
      fields: ['status']
    },
    {
      unique: true,
      fields: ['show_id', 'equipment_id']
    }
  ]
});

module.exports = ShowEquipment;
