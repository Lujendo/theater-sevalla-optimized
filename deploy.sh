#!/bin/bash

# Theater Equipment Catalog - Deployment Helper Script
# This script helps prepare your project for deployment

set -e

echo "🎭 Theater Equipment Catalog - Deployment Preparation"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if required files exist
echo "📋 Checking required files..."

required_files=(
    "Dockerfile.sevalla"
    "client/package.json"
    "server/package.json"
    ".env.example"
    "README-DEPLOYMENT.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
        exit 1
    fi
done

# Check Node.js version
echo ""
echo "🔍 Checking Node.js version..."
node_version=$(node --version)
echo "Node.js version: $node_version"

if [[ "$node_version" < "v18" ]]; then
    echo "⚠️  Warning: Node.js 18+ is recommended for deployment"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
echo "Installing server dependencies..."
cd server && npm install
cd ..

echo "Installing client dependencies..."
cd client && npm install
cd ..

# Test build
echo ""
echo "🔨 Testing build process..."
cd client
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Client build successful"
else
    echo "❌ Client build failed"
    exit 1
fi
cd ..

# Check environment variables
echo ""
echo "🔧 Environment Variables Checklist:"
echo "Make sure you have these ready for Sevalla deployment:"
echo ""
echo "Required:"
echo "  - DB_HOST (your MySQL host)"
echo "  - DB_USER (your MySQL username)"
echo "  - DB_PASSWORD (your MySQL password)"
echo "  - DB_NAME (suggest: theater_db)"
echo "  - JWT_SECRET (generate a secure random string)"
echo "  - FRONTEND_URL (will be your Sevalla app URL)"
echo ""
echo "Optional:"
echo "  - MAX_FILE_SIZE (default: 52428800)"
echo "  - MAX_FILES (default: 5)"

# Git status
echo ""
echo "📝 Git Status:"
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Git repository detected"

    # Check if there are uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        echo "⚠️  You have uncommitted changes:"
        git status --short
        echo ""
        echo "Consider committing these changes before deployment:"
        echo "  git add ."
        echo "  git commit -m 'Prepare for deployment'"
        echo "  git push origin main"
    else
        echo "✅ No uncommitted changes"
        echo "Ready to push to GitHub if needed:"
        echo "  git push origin main"
    fi
else
    echo "⚠️  Not a git repository. You'll need to:"
    echo "  1. Initialize git: git init"
    echo "  2. Add files: git add ."
    echo "  3. Commit: git commit -m 'Initial commit'"
    echo "  4. Add remote: git remote add origin <your-repo-url>"
    echo "  5. Push: git push -u origin main"
fi

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Push your code to GitHub"
echo "2. Set up your MySQL database"
echo "3. Deploy on Sevalla.com using Dockerfile.sevalla"
echo "4. Set environment variables in Sevalla dashboard"
echo "5. Test your deployment"
echo ""
echo "📖 See README-DEPLOYMENT.md for detailed instructions"
echo "📋 See DEPLOYMENT-CHECKLIST.md for step-by-step checklist"
