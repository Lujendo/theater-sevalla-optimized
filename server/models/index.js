const User = require('./User');
const Equipment = require('./Equipment');
const File = require('./File');
const EquipmentType = require('./EquipmentType');
const EquipmentLog = require('./EquipmentLog');
const Location = require('./Location');
const DefaultStorageLocation = require('./DefaultStorageLocation');
const SavedSearch = require('./SavedSearch');
const Category = require('./Category');
const Show = require('./Show');
const ShowEquipment = require('./ShowEquipment');
const InventoryAllocation = require('./InventoryAllocation');
const EquipmentStatusLog = require('./EquipmentStatusLog');

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

// Add association between DefaultStorageLocation and Location
DefaultStorageLocation.belongsTo(Location, {
  foreignKey: 'location_id',
  as: 'location'
});

Location.hasMany(DefaultStorageLocation, {
  foreignKey: 'location_id',
  as: 'defaultStorageLocations'
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

// Add associations for Show and ShowEquipment
Show.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

Show.belongsTo(User, {
  foreignKey: 'updated_by',
  as: 'updater'
});

User.hasMany(Show, {
  foreignKey: 'created_by',
  as: 'createdShows'
});

// Show and Equipment many-to-many through ShowEquipment
Show.belongsToMany(Equipment, {
  through: ShowEquipment,
  foreignKey: 'show_id',
  otherKey: 'equipment_id',
  as: 'equipment'
});

Equipment.belongsToMany(Show, {
  through: ShowEquipment,
  foreignKey: 'equipment_id',
  otherKey: 'show_id',
  as: 'shows'
});

// Direct associations for ShowEquipment
ShowEquipment.belongsTo(Show, {
  foreignKey: 'show_id',
  as: 'show'
});

ShowEquipment.belongsTo(Equipment, {
  foreignKey: 'equipment_id',
  as: 'equipment'
});

ShowEquipment.belongsTo(User, {
  foreignKey: 'checked_out_by',
  as: 'checkedOutBy'
});

ShowEquipment.belongsTo(User, {
  foreignKey: 'returned_by',
  as: 'returnedBy'
});

ShowEquipment.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

Show.hasMany(ShowEquipment, {
  foreignKey: 'show_id',
  as: 'showEquipment'
});

Equipment.hasMany(ShowEquipment, {
  foreignKey: 'equipment_id',
  as: 'showEquipment'
});

// Inventory Allocation relationships
InventoryAllocation.belongsTo(Equipment, {
  foreignKey: 'equipment_id',
  as: 'equipment'
});

InventoryAllocation.belongsTo(Location, {
  foreignKey: 'location_id',
  as: 'location'
});

InventoryAllocation.belongsTo(Show, {
  foreignKey: 'show_id',
  as: 'show'
});

InventoryAllocation.belongsTo(User, {
  foreignKey: 'allocated_by',
  as: 'allocatedBy'
});

InventoryAllocation.belongsTo(User, {
  foreignKey: 'returned_by',
  as: 'returnedBy'
});

Equipment.hasMany(InventoryAllocation, {
  foreignKey: 'equipment_id',
  as: 'inventoryAllocations'
});

Location.hasMany(InventoryAllocation, {
  foreignKey: 'location_id',
  as: 'inventoryAllocations'
});

Show.hasMany(InventoryAllocation, {
  foreignKey: 'show_id',
  as: 'inventoryAllocations'
});

// Equipment Status Log relationships
EquipmentStatusLog.belongsTo(Equipment, {
  foreignKey: 'equipment_id',
  as: 'equipment'
});

EquipmentStatusLog.belongsTo(InventoryAllocation, {
  foreignKey: 'allocation_id',
  as: 'allocation'
});

EquipmentStatusLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

EquipmentStatusLog.belongsTo(Location, {
  foreignKey: 'previous_location_id',
  as: 'previousLocation'
});

EquipmentStatusLog.belongsTo(Location, {
  foreignKey: 'new_location_id',
  as: 'newLocation'
});

Equipment.hasMany(EquipmentStatusLog, {
  foreignKey: 'equipment_id',
  as: 'statusLogs'
});

module.exports = {
  User,
  Equipment,
  File,
  EquipmentType,
  EquipmentLog,
  Location,
  DefaultStorageLocation,
  SavedSearch,
  Category,
  Show,
  ShowEquipment,
  InventoryAllocation,
  EquipmentStatusLog,
  sequelize: require('../config/database').sequelize
};
