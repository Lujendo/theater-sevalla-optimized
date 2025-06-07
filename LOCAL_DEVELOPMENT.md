# 🎭 Theater Equipment Catalog - Local Development Guide

This guide helps you set up a complete local development environment that is completely separate from production.

## 🚀 Quick Start

### 1. Initial Setup
```bash
# Install development dependencies
cd server && npm install
cd ../client && npm install
cd ..

# Run the setup script
node scripts/dev-setup.js
```

### 2. Start Development Environment
```bash
# Option 1: Start both frontend and backend together
npm run dev:both

# Option 2: Start them separately
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend  
cd client && npm run dev
```

### 3. Access Your Local Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Default Login**: admin / admin123

## 🗄️ Database Options

### SQLite (Recommended for Local Development)
- **File**: `local_theater.db`
- **No setup required** - automatically created
- **Easy to reset**: `npm run dev:reset`
- **Easy to backup**: `npm run dev:backup`

### Local MySQL (Alternative)
If you prefer MySQL locally, update `.env.local`:
```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=theater_local
DB_USER=root
DB_PASSWORD=your_password
```

## 📁 Project Structure

```
theater_local/
├── .env.local                 # Local environment config
├── .env.development          # Development environment (auto-created)
├── local_theater.db          # SQLite database (auto-created)
├── uploads/                  # Local file uploads
├── logs/                     # Development logs
├── backups/                  # Database backups
├── scripts/
│   └── dev-setup.js         # Setup script
├── server/
│   ├── config/
│   │   └── database.local.js # Local database config
│   └── package.json         # Server dependencies
├── client/
│   └── package.json         # Client dependencies
└── LOCAL_DEVELOPMENT.md     # This file
```

## 🛠️ Development Commands

### Server Commands (from `/server` directory)
```bash
npm run dev          # Start development server with auto-reload
npm run dev:reset    # Reset local database and start fresh
npm run dev:backup   # Backup current database
```

### Client Commands (from `/client` directory)
```bash
npm run dev          # Start Vite development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Root Commands (from project root)
```bash
npm run dev:both     # Start both frontend and backend
node scripts/dev-setup.js  # Run setup script
```

## 🔧 Configuration

### Environment Variables (.env.local)
```env
NODE_ENV=development
PORT=3001
DB_TYPE=sqlite
DB_PATH=./local_theater.db
JWT_SECRET=local_development_secret
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
ENABLE_DEBUG_LOGS=true
```

### Database Configuration
- **SQLite**: Stored in `local_theater.db`
- **Auto-migration**: Tables created automatically
- **Seed data**: Admin user and sample data created on first run

## 🔄 Development Workflow

### 1. Making Changes
- Edit files in `server/` or `client/`
- Changes auto-reload (nodemon for server, Vite for client)
- Database changes persist in `local_theater.db`

### 2. Testing Features
- Test all functionality locally first
- Use different data than production
- Reset database when needed: `npm run dev:reset`

### 3. Deploying to Production
- Only deploy when features are complete and tested
- Production database and environment are completely separate
- Use existing deployment process: `git push sevalla main`

## 🗄️ Database Management

### Reset Database
```bash
# Remove database and start fresh
npm run dev:reset
```

### Backup Database
```bash
# Create timestamped backup
npm run dev:backup
```

### View Database (SQLite)
```bash
# Install sqlite3 CLI tool
npm install -g sqlite3

# Open database
sqlite3 local_theater.db

# Common commands
.tables              # List tables
.schema equipment    # Show table schema
SELECT * FROM users; # Query data
.quit               # Exit
```

## 🚨 Important Notes

### Production Safety
- **Local environment is completely separate from production**
- **Different database** (SQLite vs Production MySQL)
- **Different URLs** (localhost vs tonlager.kinsta.app)
- **No risk to production data or users**

### Development Features
- **Debug logging enabled**
- **Auto-reload on file changes**
- **Easy database reset**
- **Local file uploads**
- **CORS configured for localhost**

### Default Data
- **Admin user**: admin / admin123
- **Sample equipment types and categories**
- **Sample locations**
- **Empty shows and equipment lists**

## 🔍 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Database Issues
```bash
# Reset database completely
rm local_theater.db
npm run dev
```

### Dependency Issues
```bash
# Reinstall all dependencies
rm -rf node_modules client/node_modules server/node_modules
cd server && npm install
cd ../client && npm install
```

## 🎯 Next Steps

1. **Start developing**: Make changes and test locally
2. **Test thoroughly**: Ensure features work as expected
3. **Deploy when ready**: Push to production only when complete
4. **Keep environments separate**: Never mix local and production data

Happy coding! 🎭✨
