/**
 * Local Development Models
 * This file provides models that use the correct database configuration
 * based on the environment (development vs production)
 */

const { DataTypes } = require('sequelize');

// Get the correct sequelize instance based on environment
const databaseConfig = process.env.NODE_ENV === 'development' 
  ? require('../config/database.local')
  : require('../config/database');

const { sequelize } = databaseConfig;

// Define User model with the correct sequelize instance
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'advanced', 'basic'),
    allowNull: false,
    defaultValue: 'basic'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

// Add password checking method
User.prototype.checkPassword = async function(password) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, this.password);
};

// Define other models as needed
const EquipmentType = sequelize.define('EquipmentType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'equipment_types',
  timestamps: true,
  underscored: true
});

const Location = sequelize.define('Location', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  street: {
    type: DataTypes.STRING,
    allowNull: true
  },
  postal_code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  region: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'locations',
  timestamps: true,
  underscored: true
});

// Define Equipment model
const Equipment = sequelize.define('Equipment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: false
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false
  },
  serial_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('available', 'in-use', 'maintenance', 'broken'),
    allowNull: false,
    defaultValue: 'available'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  location_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  reference_image_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'equipment',
  timestamps: true,
  underscored: true
});

// Define File model
const File = sequelize.define('File', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  equipment_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  file_type: {
    type: DataTypes.ENUM('image', 'pdf', 'audio'),
    allowNull: false
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  thumbnail_path: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'files',
  timestamps: true,
  underscored: true
});

// Define Category model
const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'categories',
  timestamps: true,
  underscored: true
});

// Define DefaultStorageLocation model
const DefaultStorageLocation = require('./DefaultStorageLocation');

// Define SavedSearch model
const SavedSearch = sequelize.define('SavedSearch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  search_params: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'saved_searches',
  timestamps: true,
  underscored: true
});

// Define Show model
const Show = sequelize.define('Show', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  venue: {
    type: DataTypes.STRING,
    allowNull: true
  },
  director: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('planning', 'in-progress', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'planning'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'shows',
  timestamps: true,
  underscored: true
});

// Define ShowEquipment model (for equipment allocation to shows)
const ShowEquipment = sequelize.define('ShowEquipment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  show_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  equipment_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  quantity_needed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  quantity_allocated: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('requested', 'allocated', 'checked-out', 'returned'),
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
    allowNull: true
  },
  returned_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'show_equipment',
  timestamps: true,
  underscored: true
});

// Define EquipmentLog model
const EquipmentLog = sequelize.define('EquipmentLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  equipment_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
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
  }
}, {
  tableName: 'equipment_logs',
  timestamps: true,
  underscored: true
});

// Set up associations
Equipment.hasMany(File, { foreignKey: 'equipment_id', as: 'files' });
File.belongsTo(Equipment, { foreignKey: 'equipment_id' });

Equipment.belongsTo(Location, { foreignKey: 'location_id', as: 'locationDetails' });
Equipment.belongsTo(Category, { foreignKey: 'category_id', as: 'categoryDetails' });
Equipment.belongsTo(EquipmentType, { foreignKey: 'type_id', as: 'typeDetails' });

User.hasMany(SavedSearch, { foreignKey: 'user_id', as: 'savedSearches' });
SavedSearch.belongsTo(User, { foreignKey: 'user_id' });

// Show associations
Show.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Show.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
User.hasMany(Show, { foreignKey: 'created_by', as: 'createdShows' });

// ShowEquipment associations
Show.hasMany(ShowEquipment, { foreignKey: 'show_id', as: 'showEquipment' });
Equipment.hasMany(ShowEquipment, { foreignKey: 'equipment_id', as: 'showAllocations' });
ShowEquipment.belongsTo(Show, { foreignKey: 'show_id' });
ShowEquipment.belongsTo(Equipment, { foreignKey: 'equipment_id' });
ShowEquipment.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
ShowEquipment.belongsTo(User, { foreignKey: 'checked_out_by', as: 'checkedOutBy' });
ShowEquipment.belongsTo(User, { foreignKey: 'returned_by', as: 'returnedBy' });

// EquipmentLog associations
Equipment.hasMany(EquipmentLog, { foreignKey: 'equipment_id', as: 'logs' });
User.hasMany(EquipmentLog, { foreignKey: 'user_id', as: 'equipmentLogs' });
EquipmentLog.belongsTo(Equipment, { foreignKey: 'equipment_id', as: 'equipment' });
EquipmentLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// DefaultStorageLocation associations are defined in main index.js

module.exports = {
  User,
  Equipment,
  File,
  Location,
  Category,
  EquipmentType,
  SavedSearch,
  Show,
  ShowEquipment,
  EquipmentLog,
  DefaultStorageLocation,
  sequelize
};
