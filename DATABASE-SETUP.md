# 🗄️ Database Setup Guide - MySQL 9.0

## 🚀 Fresh Database Migration for MySQL 9.0

This repository includes a comprehensive migration system optimized for MySQL 9.0 to create a fresh database with all required tables and default data.

### **Current MySQL 9.0 Database**

**Database Details:**
- **Host**: `ton-lager1-cv8k6-mysql.ton-lager1-cv8k6.svc.cluster.local`
- **Port**: `3306`
- **Database**: `substantial-gray-unicorn`
- **User**: `canid`
- **Password**: `dQ8_oZ2-mG7_nN3_bG5_`

**Environment Variables:**
```env
DATABASE_URL=mysql://canid:dQ8_oZ2-mG7_nN3_bG5_@ton-lager1-cv8k6-mysql.ton-lager1-cv8k6.svc.cluster.local:3306/substantial-gray-unicorn

# OR use individual variables
DB_HOST=ton-lager1-cv8k6-mysql.ton-lager1-cv8k6.svc.cluster.local
DB_USER=canid
DB_PASSWORD=dQ8_oZ2-mG7_nN3_bG5_
DB_NAME=substantial-gray-unicorn
DB_PORT=3306
```

## 🛠️ **Migration Commands**

### **Fresh Migration (Recommended for New Setup)**
```bash
npm run migrate:fresh
```
**What it does:**
- ✅ Drops all existing tables
- ✅ Creates fresh database schema optimized for MySQL 9.0
- ✅ Seeds default data (admin user, equipment types, locations)
- ✅ Optimizes tables for MySQL 9.0 performance

### **Regular Migration**
```bash
npm run migrate
```
**What it does:**
- ✅ Creates tables if they don't exist
- ✅ Preserves existing data

## 📊 **What Gets Created**

### **Tables (MySQL 9.0 Optimized):**
- `users` - User accounts and authentication
- `equipment_types` - Categories of equipment (Lighting, Sound, etc.)
- `locations` - Physical locations for equipment
- `equipment` - Main equipment inventory
- `equipment_logs` - Equipment history and changes
- `equipment_categories` - Equipment categorization
- `saved_searches` - User saved search queries

### **Default Data:**
- **Admin User**: `admin` / `admin123`
- **Equipment Types**: Lighting, Sound, Video, Rigging, Props, Costumes, Set Pieces, Other
- **Default Location**: Main Theater (123 Broadway, New York, NY)

### **MySQL 9.0 Optimizations:**
- ✅ **Table Analysis** - Optimizes table structure
- ✅ **Performance Tuning** - Uses MySQL 9.0 performance features
- ✅ **Index Optimization** - Ensures optimal indexing
- ✅ **Character Set** - UTF8MB4 for full Unicode support

## 🚀 **Deployment Steps**

### **Step 1: Set Environment Variables**
In your deployment platform (Kinsta/Sevalla), set:
```env
NODE_ENV=production
DATABASE_URL=mysql://canid:dQ8_oZ2-mG7_nN3_bG5_@ton-lager1-cv8k6-mysql.ton-lager1-cv8k6.svc.cluster.local:3306/substantial-gray-unicorn
JWT_SECRET=81b9aca1c91e42183087e4aa2043bbf292922b59452b1eea50c4ba243dd4c998
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://your-app-name.kinsta.app
FRONTEND_URL=https://your-app-name.kinsta.app
TRUST_PROXY=true
```

### **Step 2: Deploy Application**
1. **Push code** to GitHub
2. **Deploy** on your platform
3. **Run migration** (automatically or manually)

### **Step 3: Run Migration**
The migration will run automatically on first deployment, or run manually:
```bash
npm run migrate:fresh
```

## ✅ **Success Indicators**

After successful migration, you should see:
```
🚀 Starting fresh database migration for MySQL 9.0...
🔗 Testing database connection...
✅ Connected to database successfully
📊 MySQL Version: 9.0.x
🗑️  Dropping existing tables...
🏗️  Creating fresh database schema with MySQL 9.0 optimizations...
✅ Database schema created successfully
🌱 Seeding default data...
👤 Creating admin user...
   ✅ Admin user created (admin/admin123)
🏷️  Creating default equipment types...
   ✅ Created 8 equipment types
📍 Creating default location...
   ✅ Default location created
⚡ Optimizing tables for MySQL 9.0...
   ✅ Analyzed table: users
   ⚡ Optimized table: users
   [... more tables ...]
✅ Table optimization completed
🎉 Fresh migration completed successfully!
📊 Database is ready for use with MySQL 9.0
```

## 🔧 **Troubleshooting**

### **Connection Issues:**
1. **Check environment variables** are set correctly
2. **Verify database credentials** match exactly
3. **Ensure database server** is running and accessible
4. **Check network connectivity** to the database host

### **Migration Failures:**
1. **Check database permissions** - user needs CREATE, DROP, ALTER privileges
2. **Verify database exists** - `substantial-gray-unicorn` database should exist
3. **Check for existing connections** - close other database connections

### **Environment Variable Debug:**
The migration script shows detailed debugging:
```
🔍 Environment Variables Debug:
   - DATABASE_URL: SET
🔗 Using DATABASE_URL configuration
📊 DATABASE_URL detected: mysql://canid:dQ8...
📊 MySQL Version: 9.0.x
```

## 🎭 **Ready to Use!**

After migration:
1. **Start the application**: `npm start`
2. **Visit**: `https://your-app-name.kinsta.app`
3. **Login**: `admin` / `admin123`
4. **Change password** immediately
5. **Start adding equipment**!

---

**🎉 MySQL 9.0 database setup complete!**
