# Theater Equipment Catalog - Deployment Guide

A comprehensive theater equipment management system built with React, Node.js, and MySQL.

## 🚀 Quick Deploy to Sevalla.com

### Prerequisites
- GitHub account
- Sevalla.com account
- MySQL database (can be provided by Sevalla or external service)

### 1. Fork/Clone this Repository
```bash
git clone <your-repo-url>
cd theater-equipment-catalog
```

### 2. Deploy on Sevalla.com

1. **Connect GitHub Repository**
   - Log into Sevalla.com
   - Click "New Project"
   - Connect your GitHub account
   - Select this repository

2. **Configure Build Settings**
   - **Build Command**: `npm run build` (optional, handled by Dockerfile)
   - **Dockerfile**: `Dockerfile.sevalla`
   - **Port**: `$PORT` (auto-detected)

3. **Set Environment Variables**
   ```
   NODE_ENV=production
   PORT=10000
   DB_HOST=<your-mysql-host>
   DB_USER=<your-mysql-user>
   DB_PASSWORD=<your-mysql-password>
   DB_NAME=theater_db
   DB_PORT=3306
   JWT_SECRET=<generate-a-secure-random-string>
   JWT_EXPIRES_IN=24h
   FRONTEND_URL=https://your-app-name.sevalla.app
   MAX_FILE_SIZE=52428800
   MAX_FILES=5
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be available at `https://your-app-name.sevalla.app`

## 🗄️ Database Setup

### Option 1: Sevalla Database Add-on (Recommended - Much Cheaper!)

**PostgreSQL Add-on (Recommended)**
1. In your Sevalla project dashboard, go to "Add-ons"
2. Click "Add" next to PostgreSQL
3. Choose your plan (usually starts free or very low cost)
4. Once provisioned, copy the `DATABASE_URL` from the add-on details
5. Set `DATABASE_URL` as an environment variable in Sevalla

**MySQL Add-on (Alternative)**
1. In your Sevalla project dashboard, go to "Add-ons"
2. Click "Add" next to MySQL (if available)
3. Choose your plan
4. Copy the `DATABASE_URL` from the add-on details
5. Set `DATABASE_URL` as an environment variable in Sevalla

### Option 2: External Database (More Expensive)
Only use if Sevalla add-ons don't meet your needs:
- PlanetScale (PostgreSQL-compatible)
- Railway (PostgreSQL/MySQL)
- AWS RDS, Google Cloud SQL, etc.

### Database Schema
The application will automatically:
- Create necessary tables on first run
- Run migrations
- Seed with default data (admin user: `admin` / `admin123`)

## 🔧 Environment Variables Reference

### For Sevalla Database Add-on (Recommended)
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_URL` | Database connection URL from Sevalla add-on | `postgres://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret | `your-super-secret-key` |
| `JWT_EXPIRES_IN` | Token expiration | `24h` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-app.sevalla.app` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `52428800` (50MB) |
| `MAX_FILES` | Max files per upload | `5` |

### For External Database (Alternative)
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `DB_DIALECT` | Database type | `postgres` or `mysql` |
| `DB_HOST` | Database host | `your-db-host.com` |
| `DB_USER` | Database username | `theater_user` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `DB_NAME` | Database name | `theater_db` |
| `DB_PORT` | Database port | `5432` (PostgreSQL) or `3306` (MySQL) |
| `JWT_SECRET` | JWT signing secret | `your-super-secret-key` |
| `JWT_EXPIRES_IN` | Token expiration | `24h` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-app.sevalla.app` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `52428800` (50MB) |
| `MAX_FILES` | Max files per upload | `5` |

## 📁 Project Structure

```
/
├── client/                 # React frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── server/                 # Node.js backend
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   └── package.json
├── Dockerfile.sevalla      # Sevalla deployment
├── package.json           # Root package.json
└── README-DEPLOYMENT.md   # This file
```

## 🔐 Default Login

After deployment, use these credentials to log in:
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ IMPORTANT**: Change the admin password immediately after first login!

## 🛠️ Features

- **Equipment Management**: Add, edit, delete, and track theater equipment
- **File Uploads**: Support for images, audio files, and PDFs
- **User Management**: Role-based access (admin, advanced, basic)
- **Search & Filter**: Advanced search and filtering capabilities
- **Import/Export**: CSV and Excel import/export functionality
- **Responsive Design**: Works on desktop and mobile devices

## 🔄 Updates and Maintenance

To update your deployment:
1. Push changes to your GitHub repository
2. Sevalla will automatically rebuild and deploy
3. Database migrations run automatically

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check your database environment variables
   - Ensure your database server is accessible
   - Verify credentials are correct

2. **Build Failed**
   - Check build logs in Sevalla dashboard
   - Ensure all dependencies are properly listed
   - Verify Node.js version compatibility

3. **File Uploads Not Working**
   - Check `MAX_FILE_SIZE` and `MAX_FILES` environment variables
   - Ensure upload directory permissions are correct

### Support

For deployment issues:
- Check Sevalla.com documentation
- Review application logs in Sevalla dashboard
- Ensure all environment variables are set correctly

## 📄 License

MIT License - see LICENSE file for details.
