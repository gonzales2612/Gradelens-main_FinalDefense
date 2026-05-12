#!/bin/bash

# GradeLens Deployment Script for DigitalOcean
# Run this script on your droplet after uploading the code

set -e

echo "🚀 GradeLens Deployment Script"
echo "==============================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run as root (or use sudo)"
  exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available."
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Navigate to infra directory
cd /opt/gradelens/infra || {
    echo "❌ Cannot find /opt/gradelens/infra directory"
    echo "Please ensure the application is in /opt/gradelens"
    exit 1
}

echo "📁 Current directory: $(pwd)"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    
    # Generate secure secrets
    JWT_ACCESS_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    
    cat > .env << EOF
# JWT Secrets (Auto-generated)
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# Database
MONGO_URL=mongodb://mongo:27017/gradelens

# Redis
REDIS_URL=redis://redis:6379/0

# Application
NODE_ENV=production
PORT=3000
SCAN_STORAGE_DIR=/data/scans
ALLOWED_ORIGINS=http://143.198.207.23

# CV Service
DEBUG=false
IMAGE_ROOT=/data/scans
EOF
    
    echo "✅ Created .env file with secure secrets"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Display .env file (hide secrets)
echo "📝 Environment Configuration:"
echo "----------------------------"
cat .env | grep -v SECRET
echo "JWT_ACCESS_SECRET=<hidden>"
echo "JWT_REFRESH_SECRET=<hidden>"
echo ""

# Confirm deployment
read -p "🤔 Do you want to proceed with deployment? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "🔨 Building Docker images... (this may take 5-10 minutes)"
echo ""

# Build images
docker compose build || {
    echo "❌ Build failed"
    exit 1
}

echo ""
echo "✅ Build completed successfully"
echo ""

# Stop existing containers if running
if docker compose ps -q | grep -q .; then
    echo "🛑 Stopping existing containers..."
    docker compose down
    echo ""
fi

# Start services
echo "🚀 Starting services..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
echo "------------------"
docker compose ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Check logs: docker compose logs -f"
echo "2. Access the app: http://143.198.207.23"
echo "3. Health check: http://143.198.207.23/health"
echo "4. Seed admin user: docker compose exec api node dist/scripts/seed-admin.js"
echo ""
echo "💡 To view logs in real-time:"
echo "   docker compose logs -f"
echo ""
echo "🔧 To restart services:"
echo "   docker compose restart"
echo ""
echo "🛑 To stop all services:"
echo "   docker compose down"
echo ""
