const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const { sequelize, testConnection } = require('./config/database');
const { csrfProtection, handleCsrfError } = require('./middleware/csrf');
const { apiLimiter } = require('./middleware/rateLimiter');
const securityLogger = require('./middleware/securityLogger');
const authRoutes = require('./routes/auth');
const equipmentRoutes = require('./routes/equipment');
const filesRoutes = require('./routes/files');
const equipmentTypesRoutes = require('./routes/equipmentTypes');
const equipmentLogsRoutes = require('./routes/equipmentLogs');
const locationsRoutes = require('./routes/locations');
const savedSearchesRoutes = require('./routes/savedSearches');
const importExportRoutes = require('./routes/importExport');
const categoriesRoutes = require('./routes/categories');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL === '*' ? true : process.env.FRONTEND_URL)
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply rate limiting to all API routes in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api', apiLimiter);
}

// CSRF protection only in production
if (process.env.NODE_ENV === 'production') {
  app.use(csrfProtection);
  app.use(handleCsrfError);

  // CSRF token endpoint
  app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Redirect /public-files/:id to /api/files/:id for backward compatibility
app.get('/public-files/:id', (req, res) => {
  const fileId = req.params.id;
  const queryParams = new URLSearchParams(req.query).toString();
  const redirectUrl = `/api/files/${fileId}${queryParams ? `?${queryParams}` : ''}`;

  console.log(`[SERVER] Redirecting /public-files/${fileId} to ${redirectUrl}`);
  res.redirect(redirectUrl);
});

// Import flexible authentication and media access middleware
const auth = require('./middleware/flexAuth');
const mediaAccess = require('./middleware/mediaAccess');

// Direct API file access route with NO authentication
app.get('/api/files/:id', (req, res) => {
  const fileId = req.params.id;
  const { download, thumbnail } = req.query;

  console.log(`[PUBLIC-FILES] Direct access to file ID: ${fileId}`);
  console.log(`[PUBLIC-FILES] Query params:`, req.query);

  // Add CORS headers for image access
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  // Find the file in the database
  const { File } = require('./models');
  File.findByPk(fileId)
    .then(file => {
      if (!file) {
        console.log(`[PUBLIC-FILES] File with ID ${fileId} not found in database`);
        return res.status(404).json({ message: 'File not found' });
      }

      // Determine which path to use (original or thumbnail)
      const fs = require('fs');
      const path = require('path');
      let filePath;

      if (thumbnail === 'true' && file.thumbnail_path) {
        filePath = path.resolve(file.thumbnail_path);
        console.log(`[PUBLIC-FILES] Using thumbnail path: ${filePath}`);
      } else {
        filePath = path.resolve(file.file_path);
        console.log(`[PUBLIC-FILES] Using original file path: ${filePath}`);
      }

      // Check if file exists on disk
      if (!fs.existsSync(filePath)) {
        console.log(`[PUBLIC-FILES] File not found on disk: ${filePath}`);
        return res.status(404).json({ message: 'File not found on disk' });
      }

      // Set appropriate content type
      let contentType = 'application/octet-stream';

      // Check if file_type contains a valid MIME type
      if (file.file_type && file.file_type.includes('/')) {
        // Use the file_type directly if it's a valid MIME type
        contentType = file.file_type;
        console.log(`[PUBLIC-FILES] Using MIME type from database: ${contentType}`);
      } else {
        // Otherwise, infer from the file type field or extension
        if (file.file_type === 'image') {
          contentType = 'image/jpeg';
          if (filePath.endsWith('.png')) {
            contentType = 'image/png';
          } else if (filePath.endsWith('.gif')) {
            contentType = 'image/gif';
          } else if (filePath.endsWith('.webp')) {
            contentType = 'image/webp';
          }
        } else if (file.file_type === 'audio') {
          contentType = 'audio/mpeg';
        } else if (file.file_type === 'pdf') {
          contentType = 'application/pdf';
        }
        console.log(`[PUBLIC-FILES] Inferred MIME type: ${contentType}`);
      }

      // Set content type header
      res.setHeader('Content-Type', contentType);

      // Set cache control headers for better performance
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

      // Set download header if download parameter is present
      if (download === 'true') {
        console.log(`[PUBLIC-FILES] Setting attachment disposition for download`);
        res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
      } else {
        res.setHeader('Content-Disposition', `inline; filename="${file.file_name}"`);
      }

      // Stream file to response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      // Handle errors
      fileStream.on('error', (error) => {
        console.error('[PUBLIC-FILES] Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error streaming file' });
        }
      });
    })
    .catch(error => {
      console.error('[PUBLIC-FILES] Error accessing file:', error);
      res.status(500).json({ message: 'Server error' });
    });
});

// Routes
app.use('/api/files', filesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/equipment-types', equipmentTypesRoutes);
app.use('/api/equipment-logs', equipmentLogsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/saved-searches', savedSearchesRoutes);
app.use('/api/import-export', importExportRoutes);
app.use('/api/categories', categoriesRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: `File upload error: ${err.message}`
    });
  }

  res.status(500).json({
    message: 'Something went wrong on the server'
  });
});

// Import migrations
const createEquipmentTypesTable = require('./migrations/create-equipment-types');
const createLocationsTable = require('./migrations/create_locations_table');
const updateLocationsTable = require('./migrations/update_locations_table');
const createSavedSearchesTable = require('./migrations/create_saved_searches_table');
const createCategoriesTable = require('./migrations/create_categories_table');

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Run migrations - only the ones that don't depend on equipment table
    try {
      await createEquipmentTypesTable();
      await createLocationsTable();
      await updateLocationsTable();
      await createSavedSearchesTable();
      await createCategoriesTable();
    } catch (error) {
      console.error('Error during migrations:', error.message);
      // Continue even if migrations fail
    }

    // Sync database models (in development)
    try {
      // Sync database without forcing recreation of tables
      console.log('Syncing database models...');
      await sequelize.sync({ alter: false }); // Don't alter tables to avoid conflicts
      console.log('Database synced successfully');

      // Create default equipment types
      const { EquipmentType } = require('./models');
      const typesCount = await EquipmentType.count();

      if (typesCount === 0) {
        console.log('Creating default equipment types...');
        await EquipmentType.bulkCreate([
          { name: 'Lighting' },
          { name: 'Sound' },
          { name: 'Video' },
          { name: 'Rigging' },
          { name: 'Props' },
          { name: 'Costumes' },
          { name: 'Set Pieces' },
          { name: 'Other' }
        ]);
        console.log('Default equipment types created successfully');
      }

      // Create default location
      const { Location } = require('./models');
      const locationsCount = await Location.count();

      if (locationsCount === 0) {
        console.log('Creating default location...');
        await Location.create({
          name: 'Main Theater',
          street: '123 Broadway',
          city: 'New York',
          country: 'USA'
        });
        console.log('Default location created successfully');
      }
    } catch (error) {
      console.error('Error syncing database:', error);
      // Continue even if sync fails - the app might still work with existing schema
    }

    // Start listening on all interfaces for cloud deployment
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // Don't exit the process, just log the error and continue
  }
};

// Create admin user if none exists
const createAdminUser = async () => {
  try {
    const { User } = require('./models');

    const adminExists = await User.findOne({
      where: { username: 'admin' }
    });

    if (!adminExists) {
      console.log('Creating default admin user...');
      await User.create({
        username: 'admin',
        password: 'admin123', // Will be hashed by model hooks
        role: 'admin'
      });
      console.log('Default admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Failed to create admin user:', error);
  }
};

// Initialize server
startServer().then(() => {
  // Always create admin user if it doesn't exist
  createAdminUser();
});

module.exports = app;
