#!/bin/bash
set -e

echo "🎭 Theater Equipment Catalog - Sevalla Build Script"
echo "=================================================="

# Install server dependencies (production only)
echo "📦 Installing server dependencies..."
cd server
npm ci --only=production
cd ..

# Install client dependencies (including dev for build)
echo "📦 Installing client dependencies..."
cd client
npm ci
cd ..

# Build the frontend
echo "🔨 Building frontend..."
cd client
npm run build
cd ..

echo "✅ Build completed successfully!"
echo "📁 Frontend built to: client/dist/"
echo "🚀 Ready for deployment!"
