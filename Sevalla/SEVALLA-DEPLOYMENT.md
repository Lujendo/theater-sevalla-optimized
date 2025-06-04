# 🚀 SoundVault Sevalla Deployment Guide

## Repository: **SoundVault-music**

This guide provides step-by-step instructions for deploying the SoundVault music publishing management system to Sevalla hosting.

---

## 🔧 Method 1: Git Repository Deployment (Recommended)

### Step 1: Push to GitHub/GitLab
```bash
# Repository URL (already configured)
# https://github.com/Lujendo/SoundVault-music.git

# Push to repository
git push -u origin main
```

### Step 2: Sevalla Control Panel Setup

1. **Login to Sevalla** control panel
2. **Create New Application**
   - Choose "Git Repository" deployment
   - Repository URL: `https://github.com/Lujendo/SoundVault-music.git`
   - Branch: `main`

3. **Configure Build Settings**
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: `dist`
   - **Node.js Version**: `18.x` or higher

4. **Configure Backend Settings**
   - **Start Command**: `cd backend && npm install && npm start`
   - **Port**: `3001`

### Step 3: Database Setup

1. **Create MariaDB Database** in Sevalla
   - Database Name: `soundvault`
   - Note down: Host, Username, Password

2. **Run Database Migration**
   ```bash
   # SSH into your Sevalla server or use terminal
   cd backend
   npm run migrate
   npm run seed
   ```

### Step 4: Environment Variables

Set these in Sevalla control panel:

**Frontend Environment:**
```env
VITE_API_URL=https://your-backend-domain.sevalla.com
VITE_APP_NAME=SoundVault
```

**Backend Environment:**
```env
NODE_ENV=production
DB_HOST=your-sevalla-db-host
DB_USER=your-db-username
DB_PASSWORD=your-db-password
DB_NAME=soundvault
DB_PORT=3306
JWT_SECRET=your-super-secure-jwt-secret-change-this
CORS_ORIGIN=https://your-frontend-domain.sevalla.com
FRONTEND_URL=https://your-frontend-domain.sevalla.com
PORT=3001
TRUST_PROXY=true
```

---

## 🐳 Method 2: Docker Deployment

### Step 1: Prepare Environment
```bash
# Copy and configure production environment
cp .env.production.example .env.production
# Edit with your Sevalla database credentials
```

### Step 2: Deploy with Docker
```bash
# Build and deploy
./deploy-sevalla.sh docker

# Test deployment
./deploy-sevalla.sh test
```

### Step 3: Sevalla Docker Configuration
1. **Upload docker-compose.production.yml** to Sevalla
2. **Configure environment variables** in Sevalla
3. **Run deployment** via Sevalla Docker interface

---

## 🔍 Testing Your Deployment

### Health Check URLs
- **Frontend**: `https://your-domain.sevalla.com`
- **Backend Health**: `https://your-api-domain.sevalla.com/api/health`
- **Database Health**: `https://your-api-domain.sevalla.com/api/health/db`

### Test API Endpoints
```bash
# Test artists endpoint
curl https://your-api-domain.sevalla.com/api/artists

# Test publishers endpoint
curl https://your-api-domain.sevalla.com/api/publishers
```

---

## 🛠️ Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `CORS_ORIGIN` environment variable
   - Ensure frontend and backend domains are correct

2. **Database Connection Failed**
   - Verify database credentials in environment variables
   - Check database host and port

3. **Build Failures**
   - Ensure Node.js version is 18.x or higher
   - Check build logs in Sevalla control panel

4. **API 500 Errors**
   - Check backend logs in Sevalla
   - Verify all environment variables are set

### Getting Help
- Check Sevalla documentation
- Review application logs in control panel
- Test locally first with `./deploy-sevalla.sh test`

---

## 📊 Post-Deployment Checklist

- [ ] Frontend loads at your domain
- [ ] Backend health check passes
- [ ] Database connection works
- [ ] Artists page displays real data
- [ ] API endpoints respond correctly
- [ ] CORS is configured properly
- [ ] SSL certificates are active

---

## 🎉 Success!

Your SoundVault music publishing management system is now live on Sevalla!

**Repository**: SoundVault-music  
**Frontend**: Modern React application  
**Backend**: Node.js API with MariaDB  
**Features**: Artists, Publishers, Labels, Recordings, Releases management
