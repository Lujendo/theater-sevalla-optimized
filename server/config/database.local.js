const { Sequelize } = require('sequelize');
const path = require('path');

/**
 * Local Development Database Configuration
 * Uses SQLite for easy local development without MySQL setup
 */

let sequelize;

if (process.env.NODE_ENV === 'development' && process.env.DB_TYPE === 'sqlite') {
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
  // Production configuration (existing)
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required for production');
  }

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

module.exports = sequelize;
