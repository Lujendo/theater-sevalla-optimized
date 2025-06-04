# 🔧 Sevalla Quick Fix - Backend Not Starting

## 🚨 Current Issue

Your Sevalla deployment is trying to run the **frontend** instead of the **backend**:

```
> npm run preview
> vite preview
➜  Local:   http://localhost:4173/
```

This is wrong! We need it to run the **backend API server**.

---

## ✅ Quick Fix Steps

### 1. **Update Sevalla Build Configuration**

In your Sevalla Control Panel:

**Current (Wrong) Settings:**
- Build Command: `npm install && npm run build`
- Start Command: `cd backend && npm install && npm start`

**New (Correct) Settings:**
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Node.js Version**: `18.x`
- **Port**: Leave empty (let Sevalla auto-assign)

### 2. **Redeploy Application**

After updating the settings:
1. **Save the configuration**
2. **Trigger a new deployment**
3. **Monitor the logs**

---

## 📊 Expected Deployment Logs

After the fix, you should see:

```
> soundvault-music@1.0.0 start
> cd backend && npm install && npm start

🚀 SoundVault API Server running on port 8080
📊 Environment: production
🌐 CORS enabled for: https://your-domain.sevalla.com
🔧 PORT environment variable: SET by Sevalla
📡 Server listening on 0.0.0.0:8080
```

**NOT:**
```
> npm run preview
> vite preview
➜  Local:   http://localhost:4173/
```

---

## 🔧 What Changed

### Root package.json Update:
```json
{
  "scripts": {
    "start": "cd backend && npm install && npm start",
    "start:frontend": "npm run preview"
  }
}
```

Now `npm start` runs the **backend API server** instead of the frontend preview.

---

## 🧪 Testing After Fix

### 1. Check Health Endpoint
```
https://your-app-domain.sevalla.com/health
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

### 2. Check Root Endpoint
```
https://your-app-domain.sevalla.com/
```

Expected response:
```json
{
  "message": "SoundVault Music Publishing API",
  "version": "1.0.0",
  "status": "running",
  "port": 8080,
  "endpoints": {
    "health": "/health",
    "api": "/api",
    "artists": "/api/artists",
    "publishers": "/api/publishers"
  }
}
```

---

## 🛠️ Alternative: Manual Sevalla Configuration

If the above doesn't work, try these alternative start commands in Sevalla:

### Option 1:
```bash
cd backend && npm install && node src/server.js
```

### Option 2:
```bash
npm install && cd backend && npm install && npm start
```

### Option 3:
```bash
cd backend && npm ci && NODE_ENV=production node src/server.js
```

---

## 🔍 Debugging

### Check Sevalla Logs For:

**✅ Success Indicators:**
- `🚀 SoundVault API Server running on port XXXX`
- `📊 Environment: production`
- `📡 Server listening on 0.0.0.0:XXXX`

**❌ Problem Indicators:**
- `vite preview`
- `http://localhost:4173/`
- `npm run preview`

### Environment Variables to Verify:
- `NODE_ENV=production`
- `JWT_SECRET` (set)
- `DATABASE_HOST` (auto-injected)
- `PORT` (auto-injected by Sevalla)

---

## 🎯 Summary

**The Fix:** Change Sevalla start command from complex build process to simple `npm start`, which now runs the backend API server.

**Result:** Your SoundVault API will be accessible and ready for database connection setup.

**Next Step:** Once the backend is running, set up the Connected Application (MariaDB) for database access.
