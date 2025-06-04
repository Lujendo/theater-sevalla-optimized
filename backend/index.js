const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const { sequelize, testConnection } = require('./config/database');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080; // Sevalla default port

console.log('🚀 Starting Theater Equipment Catalog API Server...');
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Port: ${PORT}`);
console.log(`🔧 PORT environment variable: ${process.env.PORT ? `SET to ${process.env.PORT}` : "NOT SET, using default 8080"}`);

// CORS Configuration for Sevalla
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || true)
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

console.log(`🌐 CORS enabled for: ${JSON.stringify(corsOptions.origin)}`);

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Trust proxy for Sevalla
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', true);
  console.log('🔧 Trust proxy enabled for Sevalla');
}

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    message: 'Theater Equipment Catalog API is running'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    message: 'Theater Equipment Catalog API is running'
  });
});

app.get('/api/health/db', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'OK',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'Disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Import routes
const authRoutes = require('./routes/auth');
const equipmentRoutes = require('./routes/equipment');
const filesRoutes = require('./routes/files');
const equipmentTypesRoutes = require('./routes/equipmentTypes');
const equipmentLogsRoutes = require('./routes/equipmentLogs');
const locationsRoutes = require('./routes/locations');
const savedSearchesRoutes = require('./routes/savedSearches');
const importExportRoutes = require('./routes/importExport');
const categoriesRoutes = require('./routes/categories');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/equipment-types', equipmentTypesRoutes);
app.use('/api/equipment-logs', equipmentLogsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/saved-searches', savedSearchesRoutes);
app.use('/api/import-export', importExportRoutes);
app.use('/api/categories', categoriesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  
  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: `File upload error: ${err.message}`
    });
  }
  
  res.status(500).json({
    message: 'Something went wrong on the server',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    message: 'API endpoint not found',
    path: req.path
  });
});

// Sevalla-optimized startup
const startServer = async () => {
  try {
    // Test database connection
    console.log('🔗 Testing database connection...');
    await testConnection();
    
    // Minimal database sync - no migrations, no admin creation
    console.log('🔄 Syncing database models (production safe)...');
    await sequelize.sync({ alter: false, force: false });
    console.log('✅ Database models synced successfully');
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Theater Equipment Catalog API Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 CORS enabled for: ${corsOptions.origin}`);
      console.log(`🔧 PORT environment variable: ${process.env.PORT ? 'SET by Sevalla' : 'Using default 8080'}`);
      console.log('✅ Server startup completed successfully');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;

// Frontend serving - added for deployment
const fs = require('fs');
const frontendPath = path.join(__dirname, '../frontend/dist');

// Serve static files
app.use(express.static(frontendPath));

// Catch-all for React Router
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <h1>Frontend build not found</h1>
      <p>Build files missing. Run: <code>npm run build</code></p>
      <p><a href="/api/health">API Health Check</a></p>
    `);
  }
});
