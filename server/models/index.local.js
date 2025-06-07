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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
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

// Set up associations
Equipment.hasMany(File, { foreignKey: 'equipment_id', as: 'files' });
File.belongsTo(Equipment, { foreignKey: 'equipment_id' });

Equipment.belongsTo(Location, { foreignKey: 'location_id', as: 'locationDetails' });
Equipment.belongsTo(Category, { foreignKey: 'category_id', as: 'categoryDetails' });
Equipment.belongsTo(EquipmentType, { foreignKey: 'type_id', as: 'typeDetails' });

module.exports = {
  User,
  Equipment,
  File,
  Location,
  Category,
  EquipmentType,
  sequelize
};
