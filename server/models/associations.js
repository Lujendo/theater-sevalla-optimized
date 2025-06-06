const Equipment = require('./Equipment');
const Show = require('./Show');
const ShowEquipment = require('./ShowEquipment');
const User = require('./User');

// Show associations
Show.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});

Show.belongsTo(User, { 
  foreignKey: 'updated_by', 
  as: 'updater' 
});

// Show Equipment associations
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

// Direct associations for easier querying
Show.hasMany(ShowEquipment, {
  foreignKey: 'show_id',
  as: 'showEquipment'
});

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

module.exports = {
  Equipment,
  Show,
  ShowEquipment,
  User
};
