const User = require('./User');
const Equipment = require('./Equipment');
const File = require('./File');
const EquipmentType = require('./EquipmentType');
const EquipmentLog = require('./EquipmentLog');
const Location = require('./Location');
const SavedSearch = require('./SavedSearch');
const Category = require('./Category');

// Define relationships
Equipment.hasMany(File, {
  foreignKey: 'equipment_id',
  as: 'files',
  onDelete: 'CASCADE'
});

File.belongsTo(Equipment, {
  foreignKey: 'equipment_id',
  as: 'equipment'
});

// Add association between Equipment and EquipmentType
Equipment.belongsTo(EquipmentType, {
  foreignKey: 'type_id',
  as: 'equipmentType',
  constraints: false // Make this optional for backward compatibility
});

// Add association between Equipment and EquipmentLog
Equipment.hasMany(EquipmentLog, {
  foreignKey: 'equipment_id',
  as: 'logs',
  onDelete: 'CASCADE'
});

EquipmentLog.belongsTo(Equipment, {
  foreignKey: 'equipment_id',
  as: 'equipment'
});

// Add association between User and EquipmentLog
User.hasMany(EquipmentLog, {
  foreignKey: 'user_id',
  as: 'equipmentLogs'
});

EquipmentLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Add association between Equipment and Location
Equipment.belongsTo(Location, {
  foreignKey: 'location_id',
  as: 'locationDetails'
});

Location.hasMany(Equipment, {
  foreignKey: 'location_id',
  as: 'equipment'
});

// Add association between User and SavedSearch
User.hasMany(SavedSearch, {
  foreignKey: 'user_id',
  as: 'savedSearches',
  onDelete: 'CASCADE'
});

SavedSearch.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Add association between Equipment and Category
Equipment.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'categoryDetails',
  constraints: false // Make this optional for backward compatibility
});

Category.hasMany(Equipment, {
  foreignKey: 'category_id',
  as: 'equipment'
});

module.exports = {
  User,
  Equipment,
  File,
  EquipmentType,
  EquipmentLog,
  Location,
  SavedSearch,
  Category,
  sequelize: require('../config/database').sequelize
};
