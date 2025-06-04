# 🗄️ Database Setup Guide

## 🚀 Fresh Database Migration

This repository includes a comprehensive migration system to create a fresh database with all required tables and default data.

### **Option 1: Use Existing Database (Recommended)**

If you have an existing MySQL database (like on Kinsta), use these environment variables:

```env
# Use your existing database
DATABASE_URL=mysql://urial:jI4_fJ5_uA5+zX1_dS8_@hostile-peach-wasp-ed33v-mysql.hostile-peach-wasp-ed33v.svc.cluster.local:3306/hostile-peach-wasp

# OR use individual variables
DB_HOST=hostile-peach-wasp-ed33v-mysql.hostile-peach-wasp-ed33v.svc.cluster.local
DB_USER=urial
DB_PASSWORD=jI4_fJ5_uA5+zX1_dS8_
DB_NAME=hostile-peach-wasp
DB_PORT=3306
```

Then run the migration:
```bash
npm run migrate:fresh
```

### **Option 2: Create New Database**

#### **On Sevalla (Connected Applications):**
1. **Add MariaDB/MySQL Connected Application**
2. **Sevalla auto-injects**: `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
3. **Run migration**: `npm run migrate:fresh`

#### **On Kinsta:**
1. **Create new MySQL database** in Kinsta dashboard
2. **Get connection details** from Kinsta
3. **Set environment variables**:
   ```env
   DATABASE_URL=mysql://username:password@host:port/database_name
   ```
4. **Run migration**: `npm run migrate:fresh`

## 🛠️ **Migration Commands**

### **Fresh Migration (Recommended)**
```bash
npm run migrate:fresh
```
**What it does:**
- ✅ Drops all existing tables
- ✅ Creates fresh database schema
- ✅ Seeds default data (admin user, equipment types, locations)

### **Regular Migration**
```bash
npm run migrate
```
**What it does:**
- ✅ Creates tables if they don't exist
- ✅ Preserves existing data

## 📊 **What Gets Created**

### **Tables:**
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

## 🔧 **Troubleshooting**

### **Connection Issues:**
1. **Check environment variables** are set correctly
2. **Verify database credentials** are valid
3. **Ensure database server** is running and accessible
4. **Check firewall/network** settings

### **Migration Failures:**
1. **Check database permissions** - user needs CREATE, DROP, ALTER privileges
2. **Verify database exists** - create database first if needed
3. **Check for existing connections** - close other database connections

### **Environment Variable Debug:**
The migration script shows detailed debugging:
```
🔍 Environment Variables Debug:
   - DATABASE_URL: SET
🔗 Using DATABASE_URL configuration
📊 DATABASE_URL detected: mysql://user:pass...
```

## ✅ **Success Indicators**

After successful migration, you should see:
```
🚀 Starting fresh database migration...
🔗 Testing database connection...
✅ Connected to database successfully
🗑️  Dropping existing tables...
🏗️  Creating fresh database schema...
✅ Database schema created successfully
🌱 Seeding default data...
👤 Creating admin user...
   ✅ Admin user created (admin/admin123)
🏷️  Creating default equipment types...
   ✅ Created 8 equipment types
📍 Creating default location...
   ✅ Default location created
🎉 Fresh migration completed successfully!
```

## 🎭 **Ready to Use!**

After migration:
1. **Start the application**: `npm start`
2. **Login**: `admin` / `admin123`
3. **Change password** immediately
4. **Start adding equipment**!

---

**🎉 Database setup complete!**
