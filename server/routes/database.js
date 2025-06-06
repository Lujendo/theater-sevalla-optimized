const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { authenticate, restrictTo } = require('../middleware/auth');

// Test database connection
router.get('/test', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    await sequelize.authenticate();
    const [result] = await sequelize.query('SELECT 1 as test');
    res.json({
      status: 'connected',
      test: result[0],
      database: process.env.DB_NAME || 'substantial-gray-unicorn'
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get all tables in the database
router.get('/tables', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    console.log('[DATABASE] Fetching tables for database:', process.env.DB_NAME || 'substantial-gray-unicorn');

    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, TABLE_COMMENT
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);

    console.log('[DATABASE] Found tables:', tables.length);
    console.log('[DATABASE] Tables:', tables.map(t => t.TABLE_NAME));

    res.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({
      message: 'Failed to fetch tables',
      error: error.message,
      details: error.stack
    });
  }
});

// Get table structure
router.get('/tables/:tableName/structure', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    
    const [columns] = await sequelize.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA,
        COLUMN_COMMENT
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, {
      replacements: [tableName]
    });

    res.json({ columns });
  } catch (error) {
    console.error('Error fetching table structure:', error);
    res.status(500).json({ message: 'Failed to fetch table structure' });
  }
});

// Get table data with pagination
router.get('/tables/:tableName/data', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await sequelize.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
    const total = countResult[0].total;

    // Get data with pagination
    const [data] = await sequelize.query(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, {
      replacements: [limit, offset]
    });

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).json({ message: 'Failed to fetch table data' });
  }
});

// Execute custom SQL query
router.post('/query', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Basic security check - prevent dangerous operations
    const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE'];
    const upperQuery = query.toUpperCase().trim();
    
    const isDangerous = dangerousKeywords.some(keyword => upperQuery.includes(keyword));
    
    if (isDangerous) {
      return res.status(403).json({ 
        message: 'Dangerous operations are not allowed. Only SELECT queries are permitted.' 
      });
    }

    // Execute query
    const [results, metadata] = await sequelize.query(query);

    res.json({
      results,
      metadata: {
        rowCount: Array.isArray(results) ? results.length : 0,
        query: query.trim()
      }
    });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(400).json({ 
      message: 'Query execution failed',
      error: error.message 
    });
  }
});

// Update table row
router.put('/tables/:tableName/rows/:id', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const updateData = req.body;

    // Remove id from update data to prevent updating primary key
    delete updateData.id;

    // Build SET clause
    const setClause = Object.keys(updateData)
      .map(key => `\`${key}\` = ?`)
      .join(', ');

    const values = Object.values(updateData);
    values.push(id);

    const query = `UPDATE \`${tableName}\` SET ${setClause} WHERE id = ?`;
    
    await sequelize.query(query, {
      replacements: values
    });

    res.json({ message: 'Row updated successfully' });
  } catch (error) {
    console.error('Error updating row:', error);
    res.status(500).json({ message: 'Failed to update row' });
  }
});

// Get database information
router.get('/info', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const [dbInfo] = await sequelize.query(`
      SELECT 
        SCHEMA_NAME as database_name,
        DEFAULT_CHARACTER_SET_NAME as charset,
        DEFAULT_COLLATION_NAME as collation
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME = DATABASE()
    `);

    const [variables] = await sequelize.query(`
      SHOW VARIABLES WHERE Variable_name IN ('version', 'version_comment', 'character_set_server', 'collation_server')
    `);

    res.json({
      database: dbInfo[0],
      server: variables.reduce((acc, variable) => {
        acc[variable.Variable_name] = variable.Value;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching database info:', error);
    res.status(500).json({ message: 'Failed to fetch database info' });
  }
});

module.exports = router;
