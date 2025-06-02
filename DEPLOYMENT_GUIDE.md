# Theater Equipment Catalog - Single Container Deployment Guide

This guide explains how to build and deploy the Theater Equipment Catalog application as a single Docker container suitable for Hostinger or any VPS deployment.

## Overview

The single container includes:
- **MySQL Database** - Data persistence
- **Node.js Backend** - API server (port 5000)
- **React Frontend** - Built static files
- **Nginx** - Web server and reverse proxy (port 80)
- **Supervisor** - Process management

## Prerequisites

- Docker installed on your local machine
- Access to a VPS/server with Docker support (Hostinger VPS, DigitalOcean, etc.)
- At least 2GB RAM and 10GB storage on the server

## Building the Image

### Option 1: Using the Build Script (Recommended)

```bash
# Make the script executable (if not already)
chmod +x build-single-image.sh

# Run the build script
./build-single-image.sh
```

The script will:
1. Build the Docker image
2. Optionally test it locally
3. Optionally save it as a tar file for deployment

### Option 2: Manual Build

```bash
# Build the image
docker build -f Dockerfile.single -t theater-app-single:latest .

# Save as tar file for deployment
docker save theater-app-single:latest -o theater-app-single.tar
```

## Local Testing

Test the container locally before deployment:

```bash
# Run the container
docker run -d \
  --name theater-app-test \
  -p 80:80 \
  -v theater_uploads:/app/server/uploads \
  -v theater_mysql:/var/lib/mysql \
  theater-app-single:latest

# Check if it's running
docker ps

# View logs
docker logs -f theater-app-test

# Test the application
curl http://localhost/health
```

Access the application at `http://localhost`

## Deployment to Server

### Step 1: Upload the Image

Upload the `theater-app-single.tar` file to your server using SCP, SFTP, or your hosting provider's file manager.

```bash
# Example using SCP
scp theater-app-single.tar user@your-server:/home/user/
```

### Step 2: Load and Run on Server

SSH into your server and run:

```bash
# Load the Docker image
docker load -i theater-app-single.tar

# Create volumes for data persistence
docker volume create theater_uploads
docker volume create theater_mysql

# Run the container
docker run -d \
  --name theater-app \
  -p 80:80 \
  --restart unless-stopped \
  -v theater_uploads:/app/server/uploads \
  -v theater_mysql:/var/lib/mysql \
  theater-app-single:latest

# Check if it's running
docker ps

# View logs
docker logs -f theater-app
```

### Step 3: Verify Deployment

1. Check container status: `docker ps`
2. Test health endpoint: `curl http://your-server-ip/health`
3. Access the application: `http://your-server-ip`

## Configuration

### Environment Variables

You can customize the deployment by setting environment variables:

```bash
docker run -d \
  --name theater-app \
  -p 80:80 \
  --restart unless-stopped \
  -e JWT_SECRET="your-secure-jwt-secret" \
  -e DB_PASSWORD="your-secure-db-password" \
  -v theater_uploads:/app/server/uploads \
  -v theater_mysql:/var/lib/mysql \
  theater-app-single:latest
```

Available environment variables:
- `JWT_SECRET` - JWT signing secret (change for production)
- `DB_PASSWORD` - MySQL password (change for production)
- `NODE_ENV` - Environment (production/development)

### Default Credentials

The application creates a default admin user:
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ Important**: Change the admin password immediately after first login!

## Data Persistence

The container uses Docker volumes for data persistence:
- `theater_uploads` - Uploaded files (images, documents)
- `theater_mysql` - Database data

These volumes persist data even if the container is recreated.

## Maintenance

### Viewing Logs

```bash
# View all logs
docker logs theater-app

# Follow logs in real-time
docker logs -f theater-app

# View specific service logs
docker exec theater-app tail -f /var/log/supervisor/nodejs.log
docker exec theater-app tail -f /var/log/supervisor/mysql.log
docker exec theater-app tail -f /var/log/supervisor/nginx.log
```

### Updating the Application

1. Build a new image with your changes
2. Stop the current container: `docker stop theater-app`
3. Remove the old container: `docker rm theater-app`
4. Run the new container (data persists in volumes)

### Backup

```bash
# Backup uploads
docker run --rm -v theater_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .

# Backup database
docker exec theater-app mysqldump -u theater_user -ptheater_password theater_db > database-backup.sql
```

### Restore

```bash
# Restore uploads
docker run --rm -v theater_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data

# Restore database
docker exec -i theater-app mysql -u theater_user -ptheater_password theater_db < database-backup.sql
```

## Troubleshooting

### Container Won't Start

1. Check logs: `docker logs theater-app`
2. Verify image loaded: `docker images`
3. Check port availability: `netstat -tlnp | grep :80`

### Application Not Accessible

1. Check container status: `docker ps`
2. Verify port mapping: `docker port theater-app`
3. Check firewall settings on your server
4. Test health endpoint: `curl http://localhost/health`

### Database Issues

1. Check MySQL logs: `docker exec theater-app tail -f /var/log/supervisor/mysql.log`
2. Access MySQL directly: `docker exec -it theater-app mysql -u theater_user -ptheater_password theater_db`

### Performance Issues

1. Monitor resource usage: `docker stats theater-app`
2. Check available disk space: `df -h`
3. Monitor memory usage: `free -h`

## Security Considerations

1. **Change default passwords** immediately after deployment
2. **Use strong JWT secret** in production
3. **Enable firewall** and only open necessary ports
4. **Regular updates** - rebuild and redeploy with security updates
5. **Monitor logs** for suspicious activity
6. **Use HTTPS** - consider adding SSL/TLS termination

## Support

For issues or questions:
1. Check the logs first
2. Verify all steps in this guide
3. Check Docker and system resources
4. Review the application documentation

The single container deployment provides a complete, self-contained theater equipment catalog system ready for production use.
