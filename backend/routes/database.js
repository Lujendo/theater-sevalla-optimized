const express = require('express');
const { sequelize } = require('../config/database');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all database tables (admin only)
router.get('/tables', authenticate, isAdmin, async (req, res) => {
  try {
    console.log('🔍 GET /database/tables - User:', req.user?.username);
    
    const [results] = await sequelize.query('SHOW TABLES');
    const tables = results.map(row => Object.values(row)[0]);
    
    console.log('✅ Found tables:', tables.length);
    res.json(tables);
  } catch (error) {
    console.error('❌ Error fetching tables:', error);
    res.status(500).json({ message: 'Failed to fetch database tables' });
  }
});

// Get table data (admin only, limited to 100 rows for safety)
router.get('/table/:tableName', authenticate, isAdmin, async (req, res) => {
  try {
    const { tableName } = req.params;
    console.log('🔍 GET /database/table/' + tableName + ' - User:', req.user?.username);
    
    // Validate table name to prevent SQL injection
    const validTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    if (validTableName !== tableName) {
      return res.status(400).json({ message: 'Invalid table name' });
    }
    
    // Get table data (limit to 100 rows for performance)
    const [results] = await sequelize.query(`SELECT * FROM \`${validTableName}\` LIMIT 100`);
    
    console.log('✅ Found rows:', results.length);
    res.json(results);
  } catch (error) {
    console.error('❌ Error fetching table data:', error);
    res.status(500).json({ message: 'Failed to fetch table data' });
  }
});

// Get database statistics (admin only)
router.get('/stats', authenticate, isAdmin, async (req, res) => {
  try {
    console.log('🔍 GET /database/stats - User:', req.user?.username);
    
    const stats = {};
    
    // Get table counts
    const tables = ['users', 'equipment', 'equipment_types', 'equipment_categories', 'locations', 'files'];
    
    for (const table of tables) {
      try {
        const [results] = await sequelize.query(`SELECT COUNT(*) as count FROM \`${table}\``);
        stats[table] = results[0].count;
      } catch (error) {
        stats[table] = 'N/A';
      }
    }
    
    console.log('✅ Database stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Error fetching database stats:', error);
    res.status(500).json({ message: 'Failed to fetch database statistics' });
  }
});

module.exports = router;
