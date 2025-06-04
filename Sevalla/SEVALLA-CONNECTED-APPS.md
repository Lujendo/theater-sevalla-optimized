# 🔗 Sevalla Connected Applications Setup for SoundVault

## Using Sevalla's Connected Applications Feature

Since you're using Sevalla's Connected Applications feature, the database setup is much simpler!

---

## 🚀 Step 1: Configure Sevalla Deployment

### In Sevalla Control Panel:

1. **Create New Application**
   - Repository: `https://github.com/Lujendo/SoundVault-music.git`
   - Branch: `main`

2. **Configure Build Settings**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (runs backend API)
   - **Node.js Version**: `18.x` or higher
   - **Port**: Let Sevalla auto-assign (don't specify)

3. **Add MariaDB/MySQL Database (Connected Application)**
   - Choose MariaDB or MySQL
   - Database name: `soundvault` (or let Sevalla auto-generate)
   - Sevalla will automatically:
     - Create the database
     - Generate credentials
     - Inject environment variables into your app

**⚠️ Important:** The root `npm start` command now runs the backend API server, not the frontend.

---

## 🔧 Step 2: Environment Variables (Auto-Injected)

Sevalla Connected Applications automatically inject these environment variables:

### Common Sevalla Database Environment Variables:
```env
DATABASE_HOST=auto-injected-by-sevalla
DATABASE_USER=auto-injected-by-sevalla
DATABASE_PASSWORD=auto-injected-by-sevalla
DATABASE_NAME=auto-injected-by-sevalla
DATABASE_PORT=3306

# Alternative formats Sevalla might use:
MYSQL_HOST=auto-injected-by-sevalla
MYSQL_USER=auto-injected-by-sevalla
MYSQL_PASSWORD=auto-injected-by-sevalla
MYSQL_DATABASE=auto-injected-by-sevalla
MYSQL_PORT=3306
```

### Additional Environment Variables You Need to Set:
```env
NODE_ENV=production
JWT_SECRET=1d32346b456f0834d25eee3be9cb867c15e0aa41e2df8cf01b7482205134328fc3bee56a7cea5c3401f3f415909a65845ea2cfd791bea7aabd055b612d843484
CORS_ORIGIN=https://your-frontend-domain.sevalla.com
FRONTEND_URL=https://your-frontend-domain.sevalla.com
PORT=8080
TRUST_PROXY=true
```

**🔐 JWT Secret Generation:**
- Use the JWT_SECRET above, or generate a new one with: `node generate-jwt-secret.js`
- Keep this secret secure and never share it
- This is used for signing authentication tokens

---

## 🗄️ Step 3: Database Schema Setup

After successful deployment with Connected Applications:

### Option A: Use Web Terminal (Recommended)
1. **Access Sevalla Web Terminal** (available after successful deployment)
2. **Navigate to backend directory:**
   ```bash
   cd backend
   ```
3. **Run database migration:**
   ```bash
   npm run migrate
   npm run seed
   ```

### Option B: Use Sevalla Database Manager
1. **Access Database Manager** in Sevalla control panel
2. **Run the SQL scripts manually** (see below)

---

## 📝 Manual Database Setup SQL

If you need to set up the database manually, run these SQL commands:

### Create Tables:
```sql
-- Artists table
CREATE TABLE artists (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  stage_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  birth_date DATE,
  nationality VARCHAR(100),
  genres JSON,
  bio TEXT,
  image_url TEXT,
  social_media JSON,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Publishers table
CREATE TABLE publishers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('major', 'independent', 'self') DEFAULT 'independent',
  location VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Labels table
CREATE TABLE labels (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  publisher_id VARCHAR(36),
  genre VARCHAR(100),
  location VARCHAR(255),
  contact_email VARCHAR(255),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (publisher_id) REFERENCES publishers(id)
);

-- Recordings table
CREATE TABLE recordings (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist_id VARCHAR(36),
  duration INTEGER,
  genre VARCHAR(100),
  release_date DATE,
  isrc VARCHAR(20),
  metadata JSON,
  file_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id)
);

-- Releases table
CREATE TABLE releases (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist_id VARCHAR(36),
  label_id VARCHAR(36),
  type ENUM('single', 'ep', 'album', 'compilation') DEFAULT 'single',
  release_date DATE,
  upc VARCHAR(20),
  status ENUM('draft', 'scheduled', 'released', 'archived') DEFAULT 'draft',
  artwork_url TEXT,
  metadata JSON,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id),
  FOREIGN KEY (label_id) REFERENCES labels(id)
);
```

### Insert Sample Data:
```sql
-- Sample artists
INSERT INTO artists (id, name, stage_name, email, nationality, genres, bio, image_url, social_media) VALUES
('550e8400-e29b-41d4-a716-446655440030', 'Luna Rodriguez', 'Luna', 'luna@example.com', 'American', '["Pop","Electronic"]', 'Rising pop star with electronic influences', 'https://images.unsplash.com/photo-1494790108755-2616c9c0e8e5?w=400&h=400&fit=crop&crop=face', '{"instagram":"@lunamusic","spotify":"Luna Rodriguez","youtube":"LunaOfficialMusic"}'),
('550e8400-e29b-41d4-a716-446655440031', 'Marcus Chen', 'MC Marcus', 'marcus@example.com', 'American', '["Hip-Hop","Rap"]', 'Hip-hop artist from Atlanta with powerful lyrics', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face', '{"instagram":"@mcmarcus","spotify":"MC Marcus","youtube":"MCMarcusOfficial"}');

-- Sample publishers
INSERT INTO publishers (id, name, type, location, contact_email) VALUES
('550e8400-e29b-41d4-a716-446655440040', 'Stellar Music Publishing', 'major', 'Los Angeles, CA', 'contact@stellarmusic.com'),
('550e8400-e29b-41d4-a716-446655440041', 'Urban Sounds Publishing', 'independent', 'Atlanta, GA', 'info@urbansounds.com');
```

---

## 🔍 Testing Your Setup

### 1. Check Application Logs
Look for these messages in Sevalla logs:
```
✅ Connected to MariaDB database
🚀 SoundVault API Server running on port 8080
📊 Environment: production
```

### 2. Test API Endpoints
```
https://your-backend-domain.sevalla.com/api/health
https://your-backend-domain.sevalla.com/api/health/db
https://your-backend-domain.sevalla.com/api/artists
```

### 3. Check Environment Variables
The logs will show which environment variables were detected:
```
📋 Database connection details detected:
   - Host: xxx.xxx.xxx.xxx (from DATABASE_HOST)
   - User: your_user (from DATABASE_USER)
   - Database: soundvault (from DATABASE_NAME)
```

---

## ✅ Success Checklist

- [ ] Connected Application (MariaDB) added in Sevalla
- [ ] Application deployed successfully
- [ ] Database connection established
- [ ] Database tables created (via migration or manual SQL)
- [ ] Sample data inserted
- [ ] API endpoints responding with data
- [ ] Frontend can access backend APIs

---

## 🛠️ Troubleshooting

### If Database Connection Still Fails:
1. **Check Connected Application Status** in Sevalla control panel
2. **Verify database is running** and accessible
3. **Check application logs** for specific error messages
4. **Restart application** after Connected Application setup

### Common Issues:
- **Database not ready**: Wait a few minutes after creating Connected Application
- **Wrong credentials**: Sevalla should auto-inject, but verify in logs
- **Network issues**: Check if database and app are in same region/network

**🎉 With Connected Applications, your database setup should be automatic and seamless!**
