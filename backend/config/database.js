const { Sequelize } = require('sequelize');
require('dotenv').config();

// Sevalla Connected Applications Database Configuration
// Sevalla auto-injects these environment variables:
// DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME, DATABASE_PORT

const getDatabaseConfig = () => {
  // Check for Sevalla Connected Applications environment variables
  if (process.env.DATABASE_HOST) {
    console.log('🔗 Using Sevalla Connected Applications database configuration');
    console.log(`📊 Database connection details detected:`);
    console.log(`   - Host: ${process.env.DATABASE_HOST}`);
    console.log(`   - User: ${process.env.DATABASE_USER}`);
    console.log(`   - Database: ${process.env.DATABASE_NAME}`);
    console.log(`   - Port: ${process.env.DATABASE_PORT || 3306}`);
    
    return {
      type: 'object',
      host: process.env.DATABASE_HOST,
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      port: process.env.DATABASE_PORT || 3306
    };
  }
  
  // Fallback to DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log('🔗 Using DATABASE_URL configuration');
    return {
      type: 'url',
      url: process.env.DATABASE_URL
    };
  }
  
  // Manual configuration fallback
  console.log('🔗 Using manual database configuration');
  return {
    type: 'object',
    host: process.env.DB_HOST || 'localhost',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'theater_db',
    port: process.env.DB_PORT || 3306
  };
};

const dbConfig = getDatabaseConfig();

// Create Sequelize instance with proper configuration
let sequelize;

if (dbConfig.type === 'url') {
  // If using DATABASE_URL
  console.log('🔗 Creating Sequelize with URL string');
  sequelize = new Sequelize(dbConfig.url, {
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      connectTimeout: 60000
    }
  });
} else {
  // If using object configuration (Sevalla Connected Apps or manual)
  console.log('🔗 Creating Sequelize with object configuration');
  console.log(`   - Database: ${dbConfig.database}`);
  console.log(`   - Username: ${dbConfig.username}`);
  console.log(`   - Host: ${dbConfig.host}`);
  console.log(`   - Port: ${dbConfig.port}`);
  
  sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      connectTimeout: 60000
    }
  });
}

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully');
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = { sequelize, testConnection };
