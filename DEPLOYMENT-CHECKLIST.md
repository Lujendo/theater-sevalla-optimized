# 🚀 Sevalla.com Deployment Checklist

## Pre-Deployment Setup

### 1. GitHub Repository Setup
- [ ] Create a new GitHub repository for deployment
- [ ] Push all code to the repository
- [ ] Ensure repository is public or accessible to Sevalla

### 2. Database Preparation
Choose one option:

**Option A: Sevalla MySQL Add-on**
- [ ] Plan to add MySQL add-on during deployment

**Option B: External Database (Recommended)**
- [ ] Set up MySQL database on:
  - [ ] PlanetScale (Free tier available)
  - [ ] Railway (Free tier available)
  - [ ] AWS RDS
  - [ ] Google Cloud SQL
  - [ ] Other provider
- [ ] Note down connection details

### 3. Environment Variables Preparation
Prepare these values:
- [ ] `DB_HOST` - Your MySQL host
- [ ] `DB_USER` - Your MySQL username  
- [ ] `DB_PASSWORD` - Your MySQL password
- [ ] `DB_NAME` - Database name (suggest: `theater_db`)
- [ ] `JWT_SECRET` - Generate a secure random string (32+ characters)
- [ ] `FRONTEND_URL` - Will be your Sevalla app URL

## Deployment Steps

### 1. Sevalla Account Setup
- [ ] Sign up at [Sevalla.com](https://sevalla.com)
- [ ] Connect your GitHub account
- [ ] Verify email if required

### 2. Create New Project
- [ ] Click "New Project" in Sevalla dashboard
- [ ] Select "Import from GitHub"
- [ ] Choose your repository
- [ ] Select the main/master branch

### 3. Configure Build Settings
- [ ] **Dockerfile**: Select `Dockerfile.sevalla`
- [ ] **Build Context**: Root directory (default)
- [ ] **Port**: Leave as auto-detect (will use $PORT)

### 4. Set Environment Variables
In Sevalla project settings, add:

```
NODE_ENV=production
DB_HOST=<your-mysql-host>
DB_USER=<your-mysql-user>
DB_PASSWORD=<your-mysql-password>
DB_NAME=theater_db
DB_PORT=3306
JWT_SECRET=<your-secure-jwt-secret>
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://<your-app-name>.sevalla.app
MAX_FILE_SIZE=52428800
MAX_FILES=5
```

### 5. Deploy
- [ ] Click "Deploy" button
- [ ] Wait for build to complete (5-10 minutes)
- [ ] Check build logs for any errors

### 6. Post-Deployment Verification
- [ ] Visit your app URL: `https://<your-app-name>.sevalla.app`
- [ ] Verify the login page loads
- [ ] Test login with default credentials:
  - Username: `admin`
  - Password: `admin123`
- [ ] **IMPORTANT**: Change admin password immediately
- [ ] Test basic functionality:
  - [ ] Add new equipment
  - [ ] Upload a file
  - [ ] Search/filter equipment
  - [ ] Create a new user (if admin)

## Troubleshooting

### Build Fails
- [ ] Check build logs in Sevalla dashboard
- [ ] Verify all files are committed to GitHub
- [ ] Ensure `Dockerfile.sevalla` exists in root directory

### Database Connection Issues
- [ ] Verify database environment variables
- [ ] Test database connection from external tool
- [ ] Check database server allows external connections
- [ ] Verify database exists and user has proper permissions

### App Loads but Features Don't Work
- [ ] Check application logs in Sevalla dashboard
- [ ] Verify all environment variables are set
- [ ] Check `FRONTEND_URL` matches your actual app URL
- [ ] Ensure `JWT_SECRET` is set and secure

### File Uploads Don't Work
- [ ] Check `MAX_FILE_SIZE` and `MAX_FILES` environment variables
- [ ] Verify file permissions in application logs

## Security Checklist

### Immediate Actions
- [ ] Change default admin password
- [ ] Set strong `JWT_SECRET` (32+ random characters)
- [ ] Use strong database password
- [ ] Review user permissions

### Ongoing Security
- [ ] Regularly update dependencies
- [ ] Monitor application logs
- [ ] Backup database regularly
- [ ] Use HTTPS (automatic with Sevalla)

## Maintenance

### Regular Tasks
- [ ] Monitor application performance in Sevalla dashboard
- [ ] Check application logs for errors
- [ ] Update dependencies monthly
- [ ] Backup database weekly

### Updates
- [ ] Push changes to GitHub repository
- [ ] Sevalla will auto-deploy from main branch
- [ ] Monitor deployment in Sevalla dashboard

## Support Resources

- **Sevalla Documentation**: [docs.sevalla.com](https://docs.sevalla.com)
- **Application Logs**: Available in Sevalla dashboard
- **Database Issues**: Check your database provider's documentation
- **GitHub Issues**: Create issues in your repository for bugs

---

## Quick Reference

**Default Login**: `admin` / `admin123`
**App URL**: `https://<your-app-name>.sevalla.app`
**Admin Panel**: Login and navigate to user management
**File Uploads**: Supported formats: images, PDFs, audio files
**Database**: MySQL 8.0+ recommended
