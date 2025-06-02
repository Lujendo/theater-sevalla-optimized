#!/bin/bash

# Build script for single-container theater application
set -e

echo "=== Building Theater Equipment Catalog - Single Container ==="

# Configuration
IMAGE_NAME="theater-app-single"
TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running"

# Clean up any existing containers
print_status "Cleaning up existing containers..."
docker stop theater-app-single 2>/dev/null || true
docker rm theater-app-single 2>/dev/null || true

# Build the image
print_status "Building Docker image: ${FULL_IMAGE_NAME}"
print_status "This may take several minutes..."

if docker build -f Dockerfile.single -t ${FULL_IMAGE_NAME} .; then
    print_status "✅ Image built successfully: ${FULL_IMAGE_NAME}"
else
    print_error "❌ Failed to build image"
    exit 1
fi

# Show image size
IMAGE_SIZE=$(docker images ${FULL_IMAGE_NAME} --format "table {{.Size}}" | tail -n 1)
print_status "Image size: ${IMAGE_SIZE}"

# Option to test the image locally
echo ""
read -p "Do you want to test the image locally? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Starting container for testing..."
    
    docker run -d \
        --name theater-app-single \
        -p 80:80 \
        -v theater_uploads:/app/server/uploads \
        -v theater_mysql:/var/lib/mysql \
        ${FULL_IMAGE_NAME}
    
    print_status "Container started. Waiting for services to initialize..."
    sleep 10
    
    # Check if container is running
    if docker ps | grep -q theater-app-single; then
        print_status "✅ Container is running successfully!"
        print_status "🌐 Application is available at: http://localhost"
        print_status "📊 Health check: http://localhost/health"
        echo ""
        print_status "To view logs: docker logs -f theater-app-single"
        print_status "To stop: docker stop theater-app-single"
        print_status "To remove: docker rm theater-app-single"
    else
        print_error "❌ Container failed to start. Check logs with: docker logs theater-app-single"
        exit 1
    fi
fi

# Option to save image as tar file
echo ""
read -p "Do you want to save the image as a tar file for deployment? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    TAR_FILE="theater-app-single.tar"
    print_status "Saving image to ${TAR_FILE}..."
    
    if docker save ${FULL_IMAGE_NAME} -o ${TAR_FILE}; then
        TAR_SIZE=$(ls -lh ${TAR_FILE} | awk '{print $5}')
        print_status "✅ Image saved successfully: ${TAR_FILE} (${TAR_SIZE})"
        print_status "📦 Upload this file to your Hostinger server"
        print_status "🚀 Load with: docker load -i ${TAR_FILE}"
        print_status "▶️  Run with: docker run -d -p 80:80 --name theater-app ${FULL_IMAGE_NAME}"
    else
        print_error "❌ Failed to save image"
        exit 1
    fi
fi

echo ""
print_status "🎉 Build process completed successfully!"
print_status "Image: ${FULL_IMAGE_NAME}"

# Show deployment instructions
echo ""
echo "=== Deployment Instructions for Hostinger ==="
echo "1. Upload the tar file to your server"
echo "2. Load the image: docker load -i theater-app-single.tar"
echo "3. Run the container: docker run -d -p 80:80 --name theater-app --restart unless-stopped theater-app-single:latest"
echo "4. Check status: docker ps"
echo "5. View logs: docker logs -f theater-app"
echo ""
echo "The application will be available on port 80 of your server."
