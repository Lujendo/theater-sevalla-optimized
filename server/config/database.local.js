const { Sequelize } = require('sequelize');
const path = require('path');

/**
 * Local Development Database Configuration
 * Uses SQLite for easy local development without MySQL setup
 */

let sequelize;

console.log('🔧 Database config - NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 Database config - DB_TYPE:', process.env.DB_TYPE);

if (process.env.NODE_ENV === 'development' && (process.env.DB_TYPE === 'sqlite' || !process.env.DB_TYPE)) {
  // SQLite configuration for local development
  const dbPath = process.env.DB_PATH || './local_theater.db';
  
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.ENABLE_DEBUG_LOGS === 'true' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

  console.log(`🗄️  Using SQLite database: ${dbPath}`);
  
} else if (process.env.NODE_ENV === 'development' && process.env.DB_TYPE === 'mysql') {
  // Local MySQL configuration
  sequelize = new Sequelize(
    process.env.DB_NAME || 'theater_local',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: process.env.ENABLE_DEBUG_LOGS === 'true' ? console.log : false,
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );

  console.log(`🗄️  Using local MySQL database: ${process.env.DB_NAME}`);
  
} else {
  // Fallback to SQLite if no specific configuration is found
  console.log('⚠️  No specific database configuration found, using SQLite fallback');
  const dbPath = './local_theater.db';

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });

  sequelize = new Sequelize(dbUrl, {
    dialect: 'mysql',
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false,
    },
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

  console.log('🗄️  Using production MySQL database');
}

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('🗄️  Local database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to local database:', error);
    throw error;
  }
};

module.exports = { sequelize, testConnection };
