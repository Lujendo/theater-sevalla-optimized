# 🗄️ Sevalla Database Setup for SoundVault

## Current Issue Resolution

Your deployment is failing because the database credentials are not configured correctly. Here's how to fix it:

---

## 🔧 Step 1: Create MariaDB Database in Sevalla

1. **Login to Sevalla Control Panel**
2. **Go to Databases Section**
3. **Create New MariaDB Database**
   - Database Name: `soundvault`
   - Username: Create a new user (not root)
   - Password: Generate secure password
   - Note down all credentials

---

## 🔧 Step 2: Configure Environment Variables in Sevalla

In your Sevalla application settings, add these environment variables:

### Backend Environment Variables:
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
PORT=8080
TRUST_PROXY=true
```

### Frontend Environment Variables:
```env
VITE_API_URL=https://your-backend-domain.sevalla.com
VITE_APP_NAME=SoundVault
```

---

## 🔧 Step 3: Database Migration (After Successful Deployment)

Once your application deploys successfully, use Sevalla web terminal to set up the database:

### Access Web Terminal:
1. Go to your application in Sevalla control panel
2. Click on "Terminal" or "SSH Access"
3. Navigate to backend directory: `cd backend`

### Run Database Setup:
```bash
# Install dependencies (if needed)
npm install

# Run database migration
npm run migrate

# Seed initial data
npm run seed
```

---

## 🔧 Step 4: Manual Database Setup (Alternative)

If the migration scripts don't work, you can set up the database manually:

### 1. Access phpMyAdmin or Database Manager in Sevalla
### 2. Create Tables Manually:

```sql
-- Create artists table
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

-- Create publishers table
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

-- Create labels table
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

-- Create recordings table
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

-- Create releases table
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

### 3. Insert Sample Data:

```sql
-- Insert sample artists
INSERT INTO artists (id, name, stage_name, email, nationality, genres, bio, image_url, social_media) VALUES
('550e8400-e29b-41d4-a716-446655440030', 'Luna Rodriguez', 'Luna', 'luna@example.com', 'American', '["Pop","Electronic"]', 'Rising pop star with electronic influences', 'https://images.unsplash.com/photo-1494790108755-2616c9c0e8e5?w=400&h=400&fit=crop&crop=face', '{"instagram":"@lunamusic","spotify":"Luna Rodriguez","youtube":"LunaOfficialMusic"}'),
('550e8400-e29b-41d4-a716-446655440031', 'Marcus Chen', 'MC Marcus', 'marcus@example.com', 'American', '["Hip-Hop","Rap"]', 'Hip-hop artist from Atlanta with powerful lyrics', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face', '{"instagram":"@mcmarcus","spotify":"MC Marcus","youtube":"MCMarcusOfficial"}');

-- Insert sample publishers
INSERT INTO publishers (id, name, type, location, contact_email) VALUES
('550e8400-e29b-41d4-a716-446655440040', 'Stellar Music Publishing', 'major', 'Los Angeles, CA', 'contact@stellarmusic.com'),
('550e8400-e29b-41d4-a716-446655440041', 'Urban Sounds Publishing', 'independent', 'Atlanta, GA', 'info@urbansounds.com');
```

---

## 🔍 Testing Database Connection

After setup, test the database connection:

### 1. Check Health Endpoint:
```
https://your-backend-domain.sevalla.com/api/health/db
```

### 2. Test API Endpoints:
```
https://your-backend-domain.sevalla.com/api/artists
https://your-backend-domain.sevalla.com/api/publishers
```

---

## 🛠️ Troubleshooting

### Common Issues:

1. **Access Denied Error**
   - Check database username/password in environment variables
   - Ensure database user has proper permissions

2. **Connection Timeout**
   - Verify DB_HOST is correct
   - Check if database is running

3. **Table Doesn't Exist**
   - Run migration scripts or create tables manually
   - Check database name is correct

### Getting Database Credentials:
1. Go to Sevalla Control Panel → Databases
2. Click on your database
3. View connection details
4. Copy Host, Username, Password, Database Name

---

## ✅ Success Checklist

- [ ] Database created in Sevalla
- [ ] Environment variables configured
- [ ] Application deployed successfully
- [ ] Database tables created
- [ ] Sample data inserted
- [ ] API endpoints responding
- [ ] Frontend can connect to backend

Once all steps are complete, your SoundVault application will be fully functional!
