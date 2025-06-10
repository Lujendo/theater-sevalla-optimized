const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DefaultStorageLocation = sequelize.define('DefaultStorageLocation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    location_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'locations',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Display name for this default storage location'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of this storage location purpose'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this storage location is active for inventory calculations'
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Priority for inventory calculations (1 = highest priority)'
    }
  }, {
    tableName: 'default_storage_locations',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_active_priority',
        fields: ['is_active', 'priority']
      },
      {
        name: 'unique_location',
        unique: true,
        fields: ['location_id']
      }
    ]
});

// Instance methods
DefaultStorageLocation.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  return values;
};

// Class methods
DefaultStorageLocation.getActiveStorageLocations = async function() {
  return await this.findAll({
    where: { is_active: true },
    include: [{
      model: sequelize.models.Location,
      as: 'location'
    }],
    order: [['priority', 'ASC'], ['name', 'ASC']]
  });
};

DefaultStorageLocation.getStorageLocationIds = async function() {
  const storageLocations = await this.findAll({
    where: { is_active: true },
    attributes: ['location_id'],
    order: [['priority', 'ASC']]
  });
  return storageLocations.map(sl => sl.location_id);
};

module.exports = DefaultStorageLocation;
