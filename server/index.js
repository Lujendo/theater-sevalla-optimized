const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// Load environment variables FIRST, before anything else
if (process.env.NODE_ENV === 'development') {
  // Load ONLY development environment variables from root folder
  dotenv.config({ path: '../.env.development', override: true });
  console.log('🔧 Loaded development environment variables');
  console.log('🔧 PORT:', process.env.PORT);
  console.log('🔧 DB_TYPE:', process.env.DB_TYPE);
  console.log('🔧 DB_HOST:', process.env.DB_HOST);
} else {
  dotenv.config();
}
// Use local database configuration in development mode
const databaseConfig = process.env.NODE_ENV === 'development'
  ? require('./config/database.local')
  : require('./config/database');

const { sequelize, testConnection } = databaseConfig;
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
const databaseRoutes = require('./routes/database');
const showRoutes = require('./routes/shows');
const showEquipmentRoutes = require('./routes/showEquipment');
const inventoryRoutes = require('./routes/inventory');
const defaultStorageLocationsRoutes = require('./routes/defaultStorageLocations');

// Environment variables already loaded above

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Kinsta deployment
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', true);
  console.log('✅ Trust proxy enabled for Kinsta deployment');
}

// Middleware
// Parse CORS origins from environment variable
const getCorsOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.FRONTEND_URL === '*' ? true : process.env.FRONTEND_URL;
  }

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:5175';
  return corsOrigin.includes(',') ? corsOrigin.split(',').map(origin => origin.trim()) : corsOrigin;
};

const corsOrigins = getCorsOrigins();

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

console.log('🌐 CORS configured for:', corsOrigins);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply rate limiting to all API routes in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api', apiLimiter);
}

// CSRF protection only in production, but exempt API routes
if (process.env.NODE_ENV === 'production') {
  // Apply CSRF protection only to non-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      // Skip CSRF for API routes since they use JWT authentication
      return next();
    }
    csrfProtection(req, res, next);
  });

  app.use(handleCsrfError);

  // CSRF token endpoint (for non-API forms if needed)
  app.get('/api/csrf-token', (req, res) => {
    // Since API routes are exempted from CSRF, return a dummy token
    res.json({ csrfToken: 'not-required-for-api' });
  });
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from Sevalla persistent disk (production)
if (process.env.SEVALLA_STORAGE_PATH && fs.existsSync(process.env.SEVALLA_STORAGE_PATH)) {
  console.log(`[SERVER] Setting up static file serving from Sevalla disk: ${process.env.SEVALLA_STORAGE_PATH}`);
  app.use('/sevalla-files', express.static(process.env.SEVALLA_STORAGE_PATH));
}

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

// Helper function to resolve file paths correctly across environments
const resolveFilePath = (storedPath) => {
  // If the stored path is already absolute and exists, use it
  if (path.isAbsolute(storedPath) && fs.existsSync(storedPath)) {
    return storedPath;
  }

  // Get the correct storage directory for current environment
  const getStorageDir = () => {
    if (process.env.SEVALLA_STORAGE_PATH) {
      return process.env.SEVALLA_STORAGE_PATH;
    } else if (process.env.NODE_ENV === 'production') {
      return '/var/lib/data/tonlager';
    } else {
      return path.join(__dirname, 'uploads');
    }
  };

  // Extract just the filename from the stored path
  const filename = path.basename(storedPath);

  // Try to find the file in the correct storage directory structure
  const storageDir = getStorageDir();
  const possiblePaths = [
    path.join(storageDir, filename), // Direct in storage root
    path.join(storageDir, 'images', filename), // In images subdirectory
    path.join(storageDir, 'audios', filename), // In audios subdirectory
    path.join(storageDir, 'pdfs', filename), // In pdfs subdirectory
    path.join(storageDir, 'thumbnails', filename), // In thumbnails subdirectory
    // Also check the stored path relative to storage dir
    path.join(storageDir, storedPath.replace(/^\/+/, '')), // Remove leading slashes
  ];

  // Return the first path that exists
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      console.log(`[FILE-RESOLVER] Found file at: ${possiblePath}`);
      return possiblePath;
    }
  }

  // If nothing found, return the original path (will likely 404)
  console.log(`[FILE-RESOLVER] File not found in any location, returning original: ${storedPath}`);
  return storedPath;
};

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

      // Check if this is a cloud storage file (R2)
      const isCloudFile = file.file_path && !path.isAbsolute(file.file_path);

      if (isCloudFile) {
        // For cloud storage, redirect to the public URL
        const storageService = require('./services/storageService');
        const publicUrl = storageService.getFileUrl(
          thumbnail === 'true' && file.thumbnail_path ? file.thumbnail_path : file.file_path,
          thumbnail === 'true'
        );

        console.log(`[PUBLIC-FILES] Redirecting to cloud storage: ${publicUrl}`);
        return res.redirect(publicUrl);
      }

      // For local files, serve directly
      const fs = require('fs');
      let filePath;

      if (thumbnail === 'true' && file.thumbnail_path) {
        filePath = resolveFilePath(file.thumbnail_path);
        console.log(`[PUBLIC-FILES] Using thumbnail path: ${filePath}`);
      } else {
        filePath = resolveFilePath(file.file_path);
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
app.use('/api/test', require('./routes/test'));
app.use('/api/files', filesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/equipment-types', equipmentTypesRoutes);
app.use('/api/equipment-logs', equipmentLogsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/saved-searches', savedSearchesRoutes);
app.use('/api/import-export', importExportRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/show-equipment', showEquipmentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/default-storage-locations', defaultStorageLocationsRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Only serve static files in production
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');

  // Serve static files from Vite build
  const distPath = path.join(__dirname, '../client/dist');
  console.log('Production mode: Serving static files from:', distPath);

  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    // Catch-all handler: send back React's index.html file for any non-API routes
    app.get('*', (req, res) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: 'API endpoint not found' });
      }

      const indexPath = path.join(__dirname, '../client/dist/index.html');
      res.sendFile(indexPath);
    });
  } else {
    console.error('Production build not found at:', distPath);
  }
} else {
  console.log('Development mode: Frontend should be running on separate dev server (http://localhost:5173)');

  // In development, only handle API routes - let frontend dev server handle the rest
  app.get('*', (req, res) => {
    // Only handle API routes in development
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }

    // For non-API routes in development, return a helpful message
    res.status(404).send(`
      <h1>Development Mode</h1>
      <p>The backend is running in development mode.</p>
      <p>Please access the frontend at: <a href="http://localhost:5173">http://localhost:5173</a></p>
      <p>This backend only serves API routes in development mode.</p>
    `);
  });
}

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

// Skip migrations for Sevalla deployment - commented out to prevent conflicts
// const createEquipmentTypesTable = require('./migrations/create-equipment-types');
// const createLocationsTable = require('./migrations/create_locations_table');
// const updateLocationsTable = require('./migrations/update_locations_table');
// const createSavedSearchesTable = require('./migrations/create_saved_searches_table');
// const createCategoriesTable = require('./migrations/create_categories_table');

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    if (process.env.NODE_ENV === 'development') {
      // DEVELOPMENT MODE - Check database type
      console.log('🔧 DEVELOPMENT MODE - Checking database configuration');

      if (process.env.DB_TYPE === 'mysql') {
        // Using production MySQL database
        console.log('🔗 Connecting to production MySQL database');
        const { User, Equipment, File, Location, Category, EquipmentType, Show, ShowEquipment } = require('./models/index.local');

        // Test connection and log some stats
        const equipmentCount = await Equipment.count();
        const showCount = await Show.count();
        const userCount = await User.count();

        console.log('✅ Connected to production database');
        console.log(`📊 Database stats: ${equipmentCount} equipment, ${showCount} shows, ${userCount} users`);

        // Run inventory allocation system migration
        console.log('🔄 Setting up inventory allocation system...');
        const { runMigrationIfNeeded } = require('./migrations/runInventoryMigrationDirect');
        const migrationSuccess = await runMigrationIfNeeded();

        if (migrationSuccess) {
          console.log('✅ Inventory allocation system ready');
        } else {
          console.log('⚠️  Inventory allocation system setup had issues, but continuing...');
        }

        // Run locations description column migration
        console.log('🔄 Setting up locations description column...');
        const { addDescriptionToLocations } = require('./migrations/addDescriptionToLocations');
        const locationsMigrationSuccess = await addDescriptionToLocations();

        if (locationsMigrationSuccess) {
          console.log('✅ Locations description column ready');
        } else {
          console.log('⚠️  Locations description column setup had issues, but continuing...');
        }



        // Skip database initialization - using existing production data
        console.log('✅ Using existing production data - no initialization needed');

      } else {
        // Using local SQLite database
        console.log('🔧 Using local SQLite database');
        const bcrypt = require('bcryptjs');
        const { User, Equipment, File, Location, Category, EquipmentType, Show, ShowEquipment } = require('./models/index.local');

      // Models are imported from index.local.js

      // Sync database (force recreate tables to match updated schema)
      console.log('🔄 Creating database tables...');
      await sequelize.sync({ force: true });
      console.log('✅ Database tables created successfully');
      console.log('✅ Database tables synchronized');

      // Check if admin user exists
      const adminUser = await User.findOne({ where: { username: 'admin' } });
      if (!adminUser) {
        console.log('🔧 Creating admin user...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await User.create({
          username: 'admin',
          email: 'admin@theater.local',
          password: hashedPassword,
          role: 'admin'
        });
        console.log('✅ Admin user created (admin/admin123)');
      } else {
        console.log('✅ Admin user already exists');
      }

      // Check if equipment types exist
      const equipmentTypeCount = await EquipmentType.count();
      if (equipmentTypeCount === 0) {
        console.log('🔧 Creating default equipment types...');
        const defaultTypes = [
          'Audio Equipment', 'Video Equipment', 'Lighting Equipment',
          'Cables and Connectors', 'Rigging and Mounting', 'Control and Automation',
          'Accessories and Consumables', 'Music Instrument'
        ];
        for (const typeName of defaultTypes) {
          await EquipmentType.create({ name: typeName });
        }
        console.log('✅ Default equipment types created');
      } else {
        console.log('✅ Equipment types already exist');
      }

      // Check if locations exist
      const locationCount = await Location.count();
      if (locationCount === 0) {
        console.log('🔧 Creating default locations...');
        const defaultLocations = [
          {
            name: 'Lager',
            description: 'Main storage area',
            street: 'Theater Street 1',
            postal_code: '12345',
            city: 'Theater City',
            region: 'Theater Region',
            country: 'Theater Country'
          },
          {
            name: 'Stage',
            description: 'Main stage area',
            street: 'Theater Street 1',
            postal_code: '12345',
            city: 'Theater City',
            region: 'Theater Region',
            country: 'Theater Country'
          },
          {
            name: 'Workshop',
            description: 'Technical workshop',
            street: 'Theater Street 1',
            postal_code: '12345',
            city: 'Theater City',
            region: 'Theater Region',
            country: 'Theater Country'
          }
        ];
        for (const location of defaultLocations) {
          await Location.create(location);
        }
        console.log('✅ Default locations created');
      } else {
        console.log('✅ Locations already exist');
      }

      // Check if categories exist
      const categoryCount = await Category.count();
      if (categoryCount === 0) {
        console.log('🏷️ Creating default categories...');
        const defaultCategories = [
          { name: 'Audio Equipment', description: 'Sound and audio related equipment' },
          { name: 'Video Equipment', description: 'Video and visual equipment' },
          { name: 'Lighting Equipment', description: 'Stage and venue lighting' },
          { name: 'Cables and Connectors', description: 'Cables, adapters, and connectors' },
          { name: 'Rigging and Mounting', description: 'Mounting and rigging hardware' },
          { name: 'Control and Automation', description: 'Control systems and automation' },
          { name: 'Accessories and Consumables', description: 'Accessories and consumable items' },
          { name: 'Music Instrument', description: 'Musical instruments and related equipment' }
        ];
        for (const category of defaultCategories) {
          await Category.create(category);
        }
        console.log('✅ Default categories created');
      } else {
        console.log('✅ Categories already exist');
      }

      // Check if equipment exists
      const equipmentCount = await Equipment.count();
      if (equipmentCount === 0) {
        console.log('🔧 Creating sample equipment...');
        const sampleEquipment = [
          {
            type: 'Audio Equipment',
            brand: 'Shure',
            model: 'SM58',
            serial_number: 'SM58-001',
            status: 'available',
            location: 'Lager',
            description: 'Dynamic vocal microphone',
            quantity: 5
          },
          {
            type: 'Lighting Equipment',
            brand: 'ETC',
            model: 'Source Four',
            serial_number: 'S4-001',
            status: 'available',
            location: 'Lager',
            description: 'Ellipsoidal reflector spotlight',
            quantity: 10
          }
        ];
        for (const equipment of sampleEquipment) {
          await Equipment.create(equipment);
        }
        console.log('✅ Sample equipment created');
      } else {
        console.log('✅ Equipment already exists');
      }

      // Check if shows exist
      const showCount = await Show.count();
      if (showCount === 0) {
        console.log('🎭 Creating sample shows...');
        const adminUser = await User.findOne({ where: { username: 'admin' } });
        const sampleShows = [
          {
            name: 'Romeo and Juliet',
            date: '2024-12-15',
            venue: 'Main Theater',
            director: 'John Smith',
            description: 'Classic Shakespeare tragedy',
            status: 'planning',
            created_by: adminUser.id
          },
          {
            name: 'The Lion King',
            date: '2024-11-20',
            venue: 'Grand Hall',
            director: 'Jane Doe',
            description: 'Musical adaptation',
            status: 'in-progress',
            created_by: adminUser.id
          }
        ];
        for (const show of sampleShows) {
          await Show.create(show);
        }
        console.log('✅ Sample shows created');
      } else {
        console.log('✅ Shows already exist');
      }

      } // End of SQLite initialization

    } else {
      // PRODUCTION MODE - Minimal startup
      console.log('✅ PRODUCTION MINIMAL STARTUP MODE');
      console.log('✅ Skipping database initialization - using existing schema');
    }

    // Start listening on all interfaces for cloud deployment
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT} [DEPLOYMENT v3]`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
      console.log(`Deployment Time: ${new Date().toISOString()}`);
      console.log(`🎭 Theater Equipment Catalog - Upload Fix Deployed`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // Don't exit the process, just log the error and continue
  }
};

// NO ADMIN USER CREATION - User already exists in database

// Initialize server - MINIMAL MODE
startServer();

module.exports = app;
