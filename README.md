# 🎭 Theater Equipment Catalog - Sevalla Connected Applications

**Production-ready deployment optimized for Sevalla.com Connected Applications**

## ✨ **Sevalla Optimizations**

This repository is specifically optimized for Sevalla's Connected Applications feature:

- ✅ **Connected Applications Ready** - Auto-detects Sevalla database injection
- ✅ **Backend-First Architecture** - Root `npm start` runs API server
- ✅ **Separate Frontend Build** - Frontend builds independently
- ✅ **Health Check Endpoints** - `/health` and `/api/health` for monitoring
- ✅ **Production Safe** - No migrations, minimal database operations
- ✅ **CORS Optimized** - Configured for Sevalla domains

## 🚀 **Sevalla Deployment Guide**

### **Step 1: Create Sevalla Application**

1. **Login to Sevalla Control Panel**
2. **Create New Application**
   - Repository: `https://github.com/Lujendo/theater-sevalla-optimized`
   - Branch: `main`

### **Step 2: Configure Build Settings**

- **Build Command**: `npm run build`
- **Start Command**: `npm start` (runs backend API)
- **Node.js Version**: `18.x` or higher
- **Port**: Let Sevalla auto-assign

### **Step 3: Add Connected Application (Database)**

1. **Add MariaDB/MySQL Connected Application**
2. **Database name**: `theater_equipment` (or auto-generate)
3. **Sevalla automatically injects**:
   - `DATABASE_HOST`
   - `DATABASE_USER`
   - `DATABASE_PASSWORD`
   - `DATABASE_NAME`
   - `DATABASE_PORT`

### **Step 4: Set Environment Variables**

```env
NODE_ENV=production
JWT_SECRET=81b9aca1c91e42183087e4aa2043bbf292922b59452b1eea50c4ba243dd4c998
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://your-frontend-domain.sevalla.app
FRONTEND_URL=https://your-frontend-domain.sevalla.app
TRUST_PROXY=true
MAX_FILE_SIZE=52428800
MAX_FILES=5
```

**⚠️ Replace `your-frontend-domain` with your actual Sevalla app name!**

### **Step 5: Deploy Frontend (Optional)**

If deploying frontend separately:

1. **Create second Sevalla application** for frontend
2. **Repository**: Same repository
3. **Build Command**: `cd frontend && npm install && npm run build`
4. **Output Directory**: `frontend/dist`
5. **Environment Variables**:
   ```env
   VITE_API_URL=https://your-backend-domain.sevalla.app
   ```

## 🔍 **Testing Your Deployment**

### **Health Check URLs**
- **Backend Health**: `https://your-app.sevalla.app/health`
- **API Health**: `https://your-app.sevalla.app/api/health`
- **Database Health**: `https://your-app.sevalla.app/api/health/db`

### **Expected Logs**
```
🚀 Starting Theater Equipment Catalog API Server...
📊 Environment: production
🌐 Port: 8080
🔗 Using Sevalla Connected Applications database configuration
📊 Database connection details detected:
   - Host: xxx.xxx.xxx.xxx
   - User: your_user
   - Database: theater_equipment
✅ Connected to database successfully
🚀 Theater Equipment Catalog API Server running on port 8080
```

## 🔐 **Default Login**
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ Change password immediately after first login!**

## 📁 **Repository Structure**

```
/
├── backend/                 # Node.js API server
│   ├── config/             # Database configuration
│   ├── models/             # Sequelize models
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   └── index.js            # Main server file
├── frontend/               # React application
│   ├── src/                # React source code
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── package.json            # Root package (runs backend)
└── README.md               # This file
```

## 🛠️ **Features**

- **Equipment Management** - Add, edit, delete equipment
- **File Uploads** - Images, audio, PDF attachments
- **User Management** - Role-based access control
- **Advanced Search** - Filter and search equipment
- **Import/Export** - CSV data management
- **Barcode Scanning** - Equipment identification
- **Equipment Logs** - Track equipment history
- **Responsive Design** - Works on all devices

## 🔧 **Troubleshooting**

### **Database Connection Issues**
1. **Check Connected Application** status in Sevalla
2. **Verify database is running** and accessible
3. **Check application logs** for connection details
4. **Restart application** after database setup

### **CORS Errors**
1. **Check `CORS_ORIGIN`** environment variable
2. **Ensure exact domain match** (no trailing slash)
3. **Include `https://` protocol**

### **Build Failures**
1. **Check Node.js version** (18.x or higher)
2. **Review build logs** in Sevalla control panel
3. **Verify all dependencies** are listed

## ✅ **Success Checklist**

- [ ] Connected Application (MariaDB) added
- [ ] Application deployed successfully
- [ ] Health endpoints responding
- [ ] Database connection established
- [ ] Environment variables set
- [ ] Frontend accessible (if deployed separately)
- [ ] Login working with admin credentials

---

**🎉 Optimized for Sevalla Connected Applications!**
