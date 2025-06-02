# Theater Equipment Catalog - Single Container Deployment

A complete, self-contained Docker image that includes MySQL database, Node.js backend, React frontend, and Nginx web server - perfect for Hostinger VPS deployment.

## Quick Start

### 1. Build the Image

```bash
# Using the build script (recommended)
./build-single-image.sh

# Or manually
docker build -f Dockerfile.single -t theater-app-single:latest .
```

### 2. Run Locally (Testing)

```bash
docker run -d \
  --name theater-app \
  -p 80:80 \
  -v theater_uploads:/app/server/uploads \
  -v theater_mysql:/var/lib/mysql \
  theater-app-single:latest
```

Access at: http://localhost

### 3. Deploy to Server

```bash
# Save image as tar file
docker save theater-app-single:latest -o theater-app-single.tar

# Upload to server and load
scp theater-app-single.tar user@server:/home/user/
ssh user@server
docker load -i theater-app-single.tar

# Run on server
docker run -d \
  --name theater-app \
  -p 80:80 \
  --restart unless-stopped \
  -v theater_uploads:/app/server/uploads \
  -v theater_mysql:/var/lib/mysql \
  theater-app-single:latest
```

## What's Included

- **MySQL 8.0** - Database server
- **Node.js 18** - Backend API server
- **React** - Frontend application (built)
- **Nginx** - Web server and reverse proxy
- **Supervisor** - Process management

## Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Change the password immediately after first login!**

## Architecture

```
Port 80 (Nginx) → Frontend (React) + API Proxy
                ↓
Port 5000 (Node.js) → Backend API
                ↓
MySQL (localhost) → Database
```

## File Structure

```
/app/
├── server/           # Node.js backend
├── client/dist/      # Built React frontend
└── uploads/          # User uploaded files

/etc/nginx/           # Nginx configuration
/var/lib/mysql/       # MySQL data
/var/log/supervisor/  # Service logs
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `DB_HOST` | `localhost` | Database host |
| `DB_USER` | `theater_user` | Database user |
| `DB_PASSWORD` | `theater_password` | Database password |
| `DB_NAME` | `theater_db` | Database name |
| `PORT` | `5000` | Backend port |
| `JWT_SECRET` | `your_production_jwt_secret_change_this` | JWT signing secret |

## Data Persistence

Data is persisted using Docker volumes:
- `theater_uploads` - User uploaded files
- `theater_mysql` - Database data

## Monitoring

```bash
# Check container status
docker ps

# View logs
docker logs -f theater-app

# View specific service logs
docker exec theater-app tail -f /var/log/supervisor/nodejs.log
docker exec theater-app tail -f /var/log/supervisor/mysql.log
docker exec theater-app tail -f /var/log/supervisor/nginx.log

# Check health
curl http://your-server/health
```

## Backup & Restore

### Backup
```bash
# Database backup
docker exec theater-app mysqldump -u theater_user -ptheater_password theater_db > backup.sql

# Files backup
docker run --rm -v theater_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads.tar.gz -C /data .
```

### Restore
```bash
# Database restore
docker exec -i theater-app mysql -u theater_user -ptheater_password theater_db < backup.sql

# Files restore
docker run --rm -v theater_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads.tar.gz -C /data
```

## Troubleshooting

### Container won't start
```bash
docker logs theater-app
```

### Services not responding
```bash
docker exec theater-app supervisorctl status
```

### Database issues
```bash
docker exec -it theater-app mysql -u theater_user -ptheater_password theater_db
```

## Security Notes

1. Change default passwords
2. Use strong JWT secret
3. Enable firewall on server
4. Regular security updates
5. Monitor access logs

## Support

See `DEPLOYMENT_GUIDE.md` for detailed instructions and troubleshooting.

---

**Perfect for Hostinger VPS deployment!** 🚀
