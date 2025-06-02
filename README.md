# Theater Equipment Catalog - Deployment Repository

🎭 **A comprehensive theater equipment management system built with React, Node.js, and MySQL.**

## 🚀 Quick Deploy to Sevalla.com

This repository is optimized for deployment on Sevalla.com via GitHub integration.

### Prerequisites
- GitHub account
- Sevalla.com account  
- MySQL database (PlanetScale, Railway, or other provider)

### 🔧 Environment Variables Required

Set these in your Sevalla dashboard:

```
NODE_ENV=production
DB_HOST=your-mysql-host
DB_USER=your-mysql-username
DB_PASSWORD=your-mysql-password
DB_NAME=theater_db
DB_PORT=3306
JWT_SECRET=your-super-secure-random-32-char-string
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://your-app-name.sevalla.app
MAX_FILE_SIZE=52428800
MAX_FILES=5
```

### 📋 Deployment Steps

1. **Fork/Clone this repository**
2. **Set up MySQL database** (PlanetScale recommended)
3. **Deploy on Sevalla.com**:
   - Connect GitHub repository
   - Use `Dockerfile.sevalla`
   - Set environment variables
   - Deploy!

### 🔐 Default Login
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ Change the password immediately after first login!**

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

### 🆘 Quick Start

1. Run the preparation script: `./deploy.sh`
2. Follow the deployment guide
3. Set up your database
4. Deploy on Sevalla.com

---

**Built with ❤️ for theater professionals**
