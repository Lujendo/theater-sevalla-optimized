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
console.log(`🔧 PORT environment variable: ${process.env.PORT ? `SET to ${process.env.PORT}` : 'NOT SET, using default 8080'}`);

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
// CSRF token endpoint (for frontend compatibility)
app.get('/api/csrf-token', (req, res) => {
  const csrfToken = 'theater-app-csrf-token';
  res.json({ csrfToken });
});
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

// Serve static files from frontend build
const fs = require('fs');
const frontendPath = path.join(__dirname, '../frontend/dist');
console.log(`📁 Frontend path: ${frontendPath}`);
console.log(`📁 Frontend exists: ${fs.existsSync(frontendPath)}`);

app.use(express.static(frontendPath));

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    message: 'API endpoint not found',
    path: req.path
  });
});

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  
  const indexPath = path.join(frontendPath, 'index.html');
  console.log(`📄 Serving index.html from: ${indexPath}`);
  console.log(`📄 Index.html exists: ${fs.existsSync(indexPath)}`);
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <h1>Frontend build not found</h1>
      <p>The frontend build files are missing. Please check if the build was successful.</p>
      <p><strong>Looking for:</strong> ${indexPath}</p>
      <p><strong>Frontend directory exists:</strong> ${fs.existsSync(frontendPath)}</p>
      ${fs.existsSync(frontendPath) ? `<p><strong>Frontend contents:</strong> ${fs.readdirSync(frontendPath).join(', ')}</p>` : ''}
      <hr>
      <p><strong>API Health Check:</strong> <a href="/api/health">/api/health</a></p>
      <p><strong>Build Command:</strong> Run <code>npm run build</code> to build the frontend</p>
    `);
  }
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
    
    // Fix admin user password if needed
    // console.log('🔧 Checking admin user...'); // DISABLED
    // await fixAdminUser(); // DISABLED - causing password conflicts
    
    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      const address = server.address();
      console.log(`🚀 Theater Equipment Catalog API Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 CORS enabled for: ${corsOptions.origin}`);
      console.log(`🔗 Server address: ${address.address}:${address.port}`);
      console.log(`🔗 Server family: ${address.family}`);
      console.log('✅ Server startup completed successfully');
    });
    
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;

// Fix admin user function
async function fixAdminUser() {
  try {
    const { User } = require('./models');
    const bcrypt = require('bcryptjs');
    
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    
    if (!adminUser) {
      console.log('⚠️  No admin user found, creating one...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        email: 'admin@theater.local'
      });
      console.log('✅ Admin user created successfully!');
      return;
    }
    
    // Test password
    const isMatch = await bcrypt.compare('admin123', adminUser.password);
    if (!isMatch) {
      console.log('🔧 Fixing admin password...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await adminUser.update({ password: hashedPassword });
      console.log('✅ Admin password fixed successfully!');
    } else {
      console.log('✅ Admin user password is correct');
    }
  } catch (error) {
    console.error('❌ Failed to fix admin user:', error);
    // Don't crash the server
  }
}
