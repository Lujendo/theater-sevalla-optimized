# 🚀 Sevalla Deployment Guide
## Complete Guide for Full-Stack Applications on Sevalla Platform

*Based on real deployment experience with Theater Equipment Catalog*

---

## 📋 Table of Contents
1. [Project Structure](#project-structure)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Backend Configuration](#backend-configuration)
5. [Frontend Configuration](#frontend-configuration)
6. [Deployment Process](#deployment-process)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Testing & Verification](#testing--verification)

---

## 🏗️ Project Structure

### Recommended Directory Structure
```
project-name/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── flexAuth.js
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   │   ├── create-admin.js
│   │   └── check-admin.js
│   ├── package.json
│   └── index.js
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   └── components/
│   ├── dist/ (build output)
│   ├── package.json
│   └── vite.config.js
├── README.md
└── SEVALLA_DEPLOYMENT_GUIDE.md
```

---

## 🔧 Environment Setup

### Required Environment Variables
```env
# Core Application
NODE_ENV=production
PORT=8080

# Database (Use Sevalla's built-in MySQL)
DATABASE_URL=mysql://username:password@host:3306/database_name

# JWT Authentication
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRES_IN=24h

# CORS & Frontend
CORS_ORIGIN=https://your-app.sevalla.app
FRONTEND_URL=https://your-app.sevalla.app

# Sevalla Specific
TRUST_PROXY=true

# File Upload Limits
MAX_FILE_SIZE=52428800
MAX_FILES=5
```

### 🔑 JWT Secret Generation
```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🗄️ Database Configuration

### Database Connection (backend/config/database.js)
```javascript
const { Sequelize } = require('sequelize');

// Sevalla MySQL connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  dialectOptions: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

module.exports = { sequelize };
```

### 🚨 Critical Database Issues to Avoid
1. **Collation Warnings**: Use `utf8mb4_unicode_ci` consistently
2. **Connection Pooling**: Limit max connections for Sevalla
3. **Environment Variables**: Always use `DATABASE_URL` for Sevalla

---

## ⚙️ Backend Configuration

### Server Setup (backend/index.js)
```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// CRITICAL: IPv4 binding for Sevalla
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://your-app.sevalla.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trust proxy for Sevalla
app.set('trust proxy', true);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API routes
app.use('/api/auth', authRoutes);
// ... other routes

// Frontend fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// CRITICAL: IPv4 binding for Sevalla compatibility
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Server address: ${server.address().address}:${PORT}`);
  console.log(`🔗 Server family: ${server.address().family}`);
});
```

### Package.json Start Script
```json
{
  "scripts": {
    "start": "NODE_OPTIONS=\"--dns-result-order=ipv4first\" node index.js"
  }
}
```

---

## 🎨 Frontend Configuration

### Vite Config (frontend/vite.config.js)
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
```

### Environment Detection (frontend/src/main.jsx)
```javascript
// Environment detection
const API_URL = import.meta.env.VITE_API_URL;
const isProduction = import.meta.env.PROD;

console.log('API URL:', API_URL);
console.log('Environment mode:', import.meta.env.MODE);
console.log('Is production:', isProduction);

// Set axios base URL
if (isProduction) {
  axios.defaults.baseURL = window.location.origin;
} else {
  axios.defaults.baseURL = API_URL || 'http://localhost:8080';
}
```

### AuthContext Best Practices
```javascript
// CRITICAL: Match backend response format
const verifyToken = async () => {
  try {
    const response = await axios.get('/api/auth/me');
    setUser(response.data); // NOT response.data.user
  } catch (err) {
    if (err.response?.status === 401) {
      logout();
    }
  }
};
```

---

## 🚀 Deployment Process

### 1. Pre-Deployment Checklist
- [ ] Environment variables set in Sevalla dashboard
- [ ] Database created and accessible
- [ ] Frontend built (`npm run build`)
- [ ] All routes properly configured
- [ ] CORS origins match deployment URL

### 2. Build Commands
```bash
# Frontend build
cd frontend && npm run build

# Commit and push
git add .
git commit -m "Deploy to Sevalla"
git push origin main
```

### 3. Sevalla Configuration
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`
- **Node Version**: 18.x or higher
- **Environment**: Production

---

## 🔧 Common Issues & Solutions

### Issue 1: Connection Error 111
**Symptoms**: "App is not reachable" error
**Cause**: IPv6 binding instead of IPv4
**Solution**: 
```javascript
// Force IPv4 binding
app.listen(PORT, '0.0.0.0', callback);
```

### Issue 2: CORS Errors
**Symptoms**: Frontend can't reach backend APIs
**Cause**: Incorrect CORS configuration
**Solution**:
```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  credentials: true
};
```

### Issue 3: Authentication Loop
**Symptoms**: User logs in but gets redirected back to login
**Cause**: Frontend/backend response format mismatch
**Solution**: Ensure AuthContext matches backend response format

### Issue 4: Database Connection Issues
**Symptoms**: 500 errors on API calls
**Cause**: Incorrect DATABASE_URL or missing tables
**Solution**: Verify environment variables and run migrations

### Issue 5: Static File Serving
**Symptoms**: Frontend doesn't load
**Cause**: Incorrect static file path
**Solution**:
```javascript
app.use(express.static(path.join(__dirname, '../frontend/dist')));
```

---

## ✅ Testing & Verification

### Deployment Verification Checklist
- [ ] Frontend loads at deployment URL
- [ ] Login functionality works
- [ ] API endpoints respond correctly
- [ ] Database operations function
- [ ] File uploads work (if applicable)
- [ ] User sessions persist
- [ ] All routes accessible

### Debug Logging Template
```javascript
// Add to critical endpoints
console.log('🔍 Endpoint called:', req.path);
console.log('👤 User:', req.user?.username);
console.log('🔑 Auth header:', req.headers.authorization ? 'Present' : 'Missing');
```

---

## 📝 Quick Start Template

Use this as a starting point for new Sevalla projects:

1. **Copy this guide** to your project root
2. **Set up environment variables** in Sevalla dashboard
3. **Configure database connection** using Sevalla MySQL
4. **Implement IPv4 binding** in server setup
5. **Build and deploy** following the process above
6. **Test thoroughly** using the verification checklist

---

## 🎯 Key Success Factors

1. **Always use IPv4 binding** (`0.0.0.0`)
2. **Match frontend/backend response formats** exactly
3. **Use Sevalla's built-in database** for cost efficiency
4. **Set all environment variables** before deployment
5. **Test authentication flow** thoroughly
6. **Monitor logs** for debugging information

---

---

## 🛠️ Advanced Configuration

### Rate Limiting for Sevalla
```javascript
// Fix trust proxy warning
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  trustProxy: 1, // CRITICAL: Set to 1 for Sevalla
  keyGenerator: (req) => {
    return req.ip; // Use IP for rate limiting
  }
});

app.use('/api/', limiter);
```

### Admin User Creation Script
```javascript
// backend/scripts/create-admin.js
const bcrypt = require('bcryptjs');
const { User } = require('../models');

async function createAdmin() {
  try {
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      email: 'admin@company.com'
    });

    console.log('✅ Admin user created successfully!');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
  }
}

createAdmin();
```

### Database Migration Strategy
```javascript
// backend/scripts/migrate.js
const { sequelize } = require('../config/database');

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');

    // Sync all models (safe for production)
    await sequelize.sync({ alter: false, force: false });

    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
```

---

## 🔐 Security Best Practices

### JWT Configuration
```javascript
// Strong JWT configuration
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'your-app-name',
      audience: 'your-app-users'
    }
  );
};
```

### Password Security
```javascript
// Strong password hashing
const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  const saltRounds = 12; // Higher for production
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
```

### Environment Variable Validation
```javascript
// Validate critical environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CORS_ORIGIN'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});
```

---

## 📊 Monitoring & Logging

### Request Logging Middleware
```javascript
// Log all API requests
app.use('/api', (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.user) {
    console.log(`👤 User: ${req.user.username} (${req.user.role})`);
  }
  next();
});
```

### Error Handling Middleware
```javascript
// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global error:', error);

  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ message: 'Internal server error' });
  } else {
    res.status(500).json({
      message: error.message,
      stack: error.stack
    });
  }
});
```

### Health Check Endpoint
```javascript
// Health check for monitoring
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await sequelize.authenticate();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

---

## 🚨 Troubleshooting Guide

### Debug Commands
```bash
# Check database tables
node backend/scripts/check-tables.js

# Create admin user
node backend/scripts/create-admin.js

# Test database connection
node -e "require('./backend/config/database').sequelize.authenticate().then(() => console.log('✅ DB OK')).catch(console.error)"
```

### Common Log Patterns to Watch For
```
✅ Good:
- "Server startup completed successfully"
- "Database models synced successfully"
- "Server family: IPv4"

❌ Bad:
- "Server family: IPv6"
- "Connection error 111"
- "CORS error"
- "JWT secret not found"
```

### Emergency Fixes
```javascript
// Quick admin password reset
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('newpassword123', 10);
// Update database: UPDATE users SET password = 'hash' WHERE username = 'admin';
```

---

## 📋 Deployment Checklist Template

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database created and accessible
- [ ] Frontend built successfully
- [ ] All tests passing
- [ ] Security review completed

### During Deployment
- [ ] Build logs show no errors
- [ ] Server starts successfully
- [ ] Database connection established
- [ ] IPv4 binding confirmed

### Post-Deployment
- [ ] Frontend loads correctly
- [ ] Authentication works
- [ ] API endpoints respond
- [ ] Database operations function
- [ ] Admin user accessible
- [ ] All features tested

---

*This comprehensive guide is based on successful deployment of the Theater Equipment Catalog application on Sevalla platform. Use it as your foundation for all future Sevalla deployments.*
