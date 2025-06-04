const { Sequelize } = require('sequelize');
require('dotenv').config();

// Determine database configuration
let sequelizeConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if provided (common for Sevalla add-ons)
  sequelizeConfig = {
    url: process.env.DATABASE_URL,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  };
} else {
  // Use individual environment variables
  const dialect = process.env.DB_DIALECT || 'mysql';
  const port = dialect === 'postgres' ? 5432 : 3306;

  sequelizeConfig = {
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    dialect: dialect,
    port: process.env.DB_PORT || port,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      connectTimeout: 60000,
      ssl: process.env.NODE_ENV === 'production' && dialect === 'postgres' ? {
        require: true,
        rejectUnauthorized: false
      } : undefined
    }
  };
}

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(sequelizeConfig.url, sequelizeConfig)
  : new Sequelize(sequelizeConfig);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = { sequelize, testConnection };
