# 🔧 Sevalla Environment Variables for SoundVault

## Complete Environment Variables Setup

Copy and paste these environment variables into your Sevalla application settings:

---

## 🔐 Backend Environment Variables

Add these in **Sevalla Control Panel → Your App → Environment Variables**:

```env
NODE_ENV=production
JWT_SECRET=1d32346b456f0834d25eee3be9cb867c15e0aa41e2df8cf01b7482205134328fc3bee56a7cea5c3401f3f415909a65845ea2cfd791bea7aabd055b612d843484
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend-domain.sevalla.com
FRONTEND_URL=https://your-frontend-domain.sevalla.com
TRUST_PROXY=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

**🔗 Database Variables (Auto-injected by Connected Applications):**
- `DATABASE_HOST` - Auto-set by Sevalla
- `DATABASE_USER` - Auto-set by Sevalla  
- `DATABASE_PASSWORD` - Auto-set by Sevalla
- `DATABASE_NAME` - Auto-set by Sevalla
- `DATABASE_PORT` - Auto-set by Sevalla (usually 3306)

---

## 🎨 Frontend Environment Variables

If deploying frontend separately, add these:

```env
VITE_API_URL=https://your-backend-domain.sevalla.com
VITE_APP_NAME=SoundVault
```

---

## 🔧 How to Set Environment Variables in Sevalla

### Method 1: Sevalla Control Panel
1. **Login to Sevalla**
2. **Go to your SoundVault application**
3. **Navigate to "Environment Variables" or "Settings"**
4. **Add each variable** one by one:
   - Variable Name: `NODE_ENV`
   - Variable Value: `production`
   - Click "Add" or "Save"
5. **Repeat for all variables** listed above

### Method 2: Bulk Import (if supported)
Some platforms allow bulk import of environment variables:
```
NODE_ENV=production
JWT_SECRET=1d32346b456f0834d25eee3be9cb867c15e0aa41e2df8cf01b7482205134328fc3bee56a7cea5c3401f3f415909a65845ea2cfd791bea7aabd055b612d843484
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend-domain.sevalla.com
FRONTEND_URL=https://your-frontend-domain.sevalla.com
TRUST_PROXY=true
```

---

## 🔐 Security Notes

### JWT Secret:
- **Never commit to version control**
- **Keep this secret secure**
- **128 characters long (512 bits)**
- **Generated using cryptographically secure random bytes**

### Domain Configuration:
- Replace `your-frontend-domain.sevalla.com` with your actual Sevalla domain
- Replace `your-backend-domain.sevalla.com` with your actual API domain
- Ensure CORS_ORIGIN matches your frontend domain exactly

---

## 🧪 Testing Environment Variables

After setting environment variables, check if they're working:

### 1. Check Application Logs
Look for these messages in Sevalla deployment logs:
```
🚀 SoundVault API Server running on port 8080
📊 Environment: production
🌐 CORS enabled for: https://your-frontend-domain.sevalla.com
🔧 PORT environment variable: SET by Sevalla
```

### 2. Test Health Endpoint
```
GET https://your-app-domain.sevalla.com/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "port": 8080,
  "message": "SoundVault API is running"
}
```

### 3. Test Database Connection
```
GET https://your-app-domain.sevalla.com/api/health/db
```

---

## 🛠️ Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Check `CORS_ORIGIN` matches your frontend domain exactly
   - Include `https://` protocol
   - No trailing slash

2. **JWT Errors**
   - Ensure `JWT_SECRET` is set correctly
   - Check for extra spaces or characters
   - Verify it's exactly 128 characters

3. **Database Connection Issues**
   - Verify Connected Application is set up
   - Check database is running in Sevalla
   - Ensure same data center/region

### Environment Variable Checklist:
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` (128 characters)
- [ ] `CORS_ORIGIN` (your frontend domain)
- [ ] `FRONTEND_URL` (your frontend domain)
- [ ] `TRUST_PROXY=true`
- [ ] Connected Application (MariaDB) configured

---

## 🎉 Success!

Once all environment variables are set correctly:
- ✅ Application deploys successfully
- ✅ Health endpoints respond
- ✅ Database connection works
- ✅ CORS allows frontend communication
- ✅ JWT authentication functions properly

**Your SoundVault application will be fully functional on Sevalla!**
