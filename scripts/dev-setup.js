#!/usr/bin/env node

/**
 * Local Development Environment Setup Script
 * This script sets up a complete local development environment
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎭 Theater Equipment Catalog - Local Development Setup');
console.log('====================================================');

// Get project root directory (parent of scripts directory)
const projectRoot = path.dirname(__dirname);
process.chdir(projectRoot);

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Please run this script from the project root directory');
  console.error(`Current directory: ${process.cwd()}`);
  process.exit(1);
}

// Create necessary directories
const directories = [
  'uploads',
  'logs',
  'backups'
];

console.log('\n📁 Creating local directories...');
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created ${dir}/`);
  } else {
    console.log(`✅ ${dir}/ already exists`);
  }
});

// Copy environment file if it doesn't exist
console.log('\n⚙️  Setting up environment configuration...');
if (!fs.existsSync('.env.development')) {
  if (fs.existsSync('.env.local')) {
    fs.copyFileSync('.env.local', '.env.development');
    console.log('✅ Created .env.development from .env.local');
  } else {
    console.log('❌ .env.local not found. Please create it first.');
  }
} else {
  console.log('✅ .env.development already exists');
}

// Install dependencies if needed
console.log('\n📦 Checking dependencies...');
try {
  // Check server dependencies
  if (!fs.existsSync('node_modules')) {
    console.log('Installing server dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  } else {
    console.log('✅ Server dependencies already installed');
  }

  // Check client dependencies
  if (!fs.existsSync('client/node_modules')) {
    console.log('Installing client dependencies...');
    execSync('cd client && npm install', { stdio: 'inherit' });
  } else {
    console.log('✅ Client dependencies already installed');
  }
} catch (error) {
  console.error('❌ Error installing dependencies:', error.message);
}

// Create local database initialization script
console.log('\n🗄️  Setting up local database...');
const dbInitScript = `
-- Local Development Database Schema
-- This will be automatically created when you start the server

-- The server will automatically create all tables and seed data
-- when running in development mode with an empty database

-- Tables that will be created:
-- - users (admin user will be created)
-- - equipment_types
-- - equipment_categories  
-- - locations
-- - equipment
-- - shows
-- - show_equipment
-- - equipment_logs
-- - saved_searches
-- - files

-- Default admin user:
-- Username: admin
-- Password: admin123 (change this!)
`;

fs.writeFileSync('local_db_schema.sql', dbInitScript);
console.log('✅ Created local_db_schema.sql');

// Create development scripts
console.log('\n📝 Creating development scripts...');

const packageJsonPath = 'package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add development scripts
packageJson.scripts = {
  ...packageJson.scripts,
  'dev': 'NODE_ENV=development nodemon server/index.js',
  'dev:client': 'cd client && npm run dev',
  'dev:both': 'concurrently "npm run dev" "npm run dev:client"',
  'dev:setup': 'node scripts/dev-setup.js',
  'dev:reset': 'rm -f local_theater.db && npm run dev',
  'dev:backup': 'cp local_theater.db backups/local_theater_$(date +%Y%m%d_%H%M%S).db'
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✅ Added development scripts to package.json');

console.log('\n🎉 Local Development Environment Setup Complete!');
console.log('\n📋 Next Steps:');
console.log('1. Start the development server: npm run dev');
console.log('2. Start the client: npm run dev:client');
console.log('3. Or start both: npm run dev:both');
console.log('\n🌐 Local URLs:');
console.log('- Backend: http://localhost:3001');
console.log('- Frontend: http://localhost:5173');
console.log('\n🔑 Default Login:');
console.log('- Username: admin');
console.log('- Password: admin123');
console.log('\n💡 Tips:');
console.log('- Local database: SQLite file (local_theater.db)');
console.log('- Reset database: npm run dev:reset');
console.log('- Backup database: npm run dev:backup');
console.log('- Production is completely separate and safe!');
