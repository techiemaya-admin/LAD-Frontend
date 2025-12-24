#!/bin/bash

# DigitalOcean Deployment Script
# Server Configuration
SERVER_USER="LAD"
SERVER_HOST="64.227.167.253"
SERVER_PATH="/home/LAD/LAD"
APP_NAME="LAD-ui"
DOMAIN="aicalls.LAD.com"
BUILD_DIR=".next"
PROJECT_DIR="$(pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Starting deployment to DigitalOcean..."
echo ""

# Step 1: Build the application
echo "📦 Building production bundle..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Aborting deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo ""

# Step 2: Deploy using rsync
echo "📤 Deploying files to server..."
rsync -avz --delete --progress "$BUILD_DIR/" "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/.next/"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed! Check your SSH connection.${NC}"
    exit 1
fi

# Step 3: Deploy additional files
echo "📦 Deploying package files..."
rsync -avz --progress package.json package-lock.json next.config.ts .env.production "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"

if [ -d "public" ]; then
    echo "📦 Deploying public assets..."
    rsync -avz --delete --progress public/ "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/public/"
fi

# Step 4: Verify deployment
echo ""
echo "🔍 Verifying deployment..."
ssh "$SERVER_USER@$SERVER_HOST" "ls -la $SERVER_PATH/"

# Step 5: Set proper permissions
echo ""
echo "🔐 Setting proper permissions..."
ssh "$SERVER_USER@$SERVER_HOST" "chown -R www-data:www-data $SERVER_PATH && chmod -R 755 $SERVER_PATH"

# Step 6: Install dependencies and restart on server
echo ""
echo "🔧 Installing dependencies on server..."
ssh "$SERVER_USER@$SERVER_HOST" << ENDSSH
cd $SERVER_PATH

# Install dependencies
npm install --production

# Step 4: Restart application (assuming PM2 is used)
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting application with PM2 on port 3001..."
    pm2 delete LAD-ui 2>/dev/null || true
    PORT=3001 pm2 start npm --name "LAD-ui" -- start
    pm2 save
else
    echo "⚠️  PM2 not found. Please manually restart the application."
fi
ENDSSH

# Step 7: Test if the site is accessible
echo ""
echo "🌐 Testing deployment..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/" || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Deployment successful! Site is accessible at http://$DOMAIN/${NC}"
elif [ "$HTTP_STATUS" = "000" ]; then
    echo -e "${YELLOW}⚠️ Could not test accessibility - network or server issue${NC}"
else
    echo -e "${YELLOW}⚠️ Site deployed but returned HTTP $HTTP_STATUS${NC}"
fi

echo ""
echo "🎉 Frontend deployment completed!"
echo ""
echo "📋 Deployment Summary:"
echo "   - Source: $PROJECT_DIR/$BUILD_DIR/"
echo "   - Target: $SERVER_HOST:$SERVER_PATH"
echo "   - URL: http://$DOMAIN/"
echo ""
echo "🔧 Useful commands:"
echo "   - View nginx logs: ssh $SERVER_USER@$SERVER_HOST 'tail -f /var/log/nginx/access.log'"
echo "   - Check nginx status: ssh $SERVER_USER@$SERVER_HOST 'systemctl status nginx'"
echo "   - Restart nginx: ssh $SERVER_USER@$SERVER_HOST 'systemctl restart nginx'"
