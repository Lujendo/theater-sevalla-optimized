# Theater Equipment Catalog - Deployment Repository

🎭 **A comprehensive theater equipment management system built with React, Node.js, and MySQL/PostgreSQL.**

## 🚀 Quick Deploy to Sevalla.com

This repository is optimized for deployment on Sevalla.com via GitHub integration.

### Prerequisites
- GitHub account
- Sevalla.com account  
- Database (Sevalla add-on recommended - much cheaper!)

### 🔧 Environment Variables Required

**Option 1: Sevalla Database Add-on (Recommended & Cheaper)**
```
NODE_ENV=production
DATABASE_URL=postgres://username:password@host:port/database
JWT_SECRET=your-super-secure-random-32-char-string
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://your-app-name.sevalla.app
MAX_FILE_SIZE=52428800
MAX_FILES=5
```

**Option 2: External Database**
```
NODE_ENV=production
DB_DIALECT=postgres
DB_HOST=your-database-host
DB_USER=your-database-username
DB_PASSWORD=your-database-password
DB_NAME=theater_db
DB_PORT=5432
JWT_SECRET=your-super-secure-random-32-char-string
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://your-app-name.sevalla.app
MAX_FILE_SIZE=52428800
MAX_FILES=5
```

### 📋 Deployment Steps

1. **Deploy on Sevalla.com**:
   - Connect this GitHub repository
   - Use `Dockerfile.sevalla`
   - Add a PostgreSQL or MySQL database add-on
   - Set environment variables (use DATABASE_URL from add-on)
   - Deploy!

2. **Database Setup**:
   - In Sevalla dashboard, add a database add-on
   - Copy the DATABASE_URL from the add-on
   - Set it as an environment variable
   - The app will automatically create tables and admin user

### 🔐 Default Login
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ Change the password immediately after first login!**

### 💰 Why Sevalla Database Add-ons?

- **Much cheaper** than external providers
- **Automatic backups** included
- **Easy scaling** as your app grows
- **Integrated billing** with your Sevalla account
- **No external setup** required

### 📖 Documentation

- **[Deployment Guide](README-DEPLOYMENT.md)** - Comprehensive deployment instructions
- **[Deployment Checklist](DEPLOYMENT-CHECKLIST.md)** - Step-by-step checklist
- **[Environment Variables](.env.example)** - Environment variables template

### 🛠️ Features

- Equipment management with file uploads
- User management with role-based access
- Search and filtering capabilities
- Import/Export functionality
- Responsive design
- RESTful API
- Supports both MySQL and PostgreSQL

### 🆘 Quick Start

1. Run the preparation script: `./deploy.sh`
2. Follow the deployment guide
3. Add Sevalla database add-on
4. Deploy on Sevalla.com

---

**Built with ❤️ for theater professionals**
