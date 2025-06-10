const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InventoryAllocation = sequelize.define('InventoryAllocation', {
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
  location_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'locations',
      key: 'id'
    }
  },
  quantity_allocated: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  status: {
    type: DataTypes.ENUM('allocated', 'in-use', 'reserved', 'returned', 'maintenance'),
    allowNull: false,
    defaultValue: 'allocated'
  },
  allocation_type: {
    type: DataTypes.ENUM('general', 'show', 'maintenance', 'storage'),
    allowNull: false,
    defaultValue: 'general'
  },
  show_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'shows',
      key: 'id'
    },
    comment: 'Reference to show if allocation is for a specific show'
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reference to event if allocation is for a specific event'
  },
  allocated_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  return_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expected_return_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  allocated_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'inventory_allocation',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['equipment_id']
    },
    {
      fields: ['location_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['allocation_type']
    },
    {
      fields: ['show_id']
    },
    {
      fields: ['allocated_date']
    }
  ]
});

module.exports = InventoryAllocation;
