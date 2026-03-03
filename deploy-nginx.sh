#!/bin/bash

# Nginx Configuration Deployment Script for LAD
SERVER_USER="LAD"
SERVER_HOST="142.93.30.59"
CONFIG_NAME="lad"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔧 Deploying Nginx configuration for agent.techiemaya.com, mrlad.ai, ladsales.com..."
echo ""

# Step 1: Copy nginx config to server
echo "📤 Copying Nginx configuration to server..."
scp nginx-aicalls-LAD.conf "$SERVER_USER@$SERVER_HOST:/tmp/${CONFIG_NAME}.conf"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to copy config file!${NC}"
    exit 1
fi

# Step 2: Install and enable the config
echo "🔧 Installing Nginx configuration..."
ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
# Move config to sites-available (requires sudo)
sudo mv /tmp/lad.conf /etc/nginx/sites-available/lad

# Create symlink in sites-enabled
sudo ln -sf /etc/nginx/sites-available/lad /etc/nginx/sites-enabled/lad

# Test nginx configuration
echo "✅ Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid!"
    echo "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully!"
    
    # Step 3: Setup SSL with Certbot
    echo ""
    echo "🔒 Setting up SSL certificate with Let's Encrypt..."
    sudo certbot --nginx -d agent.techiemaya.com -d mrlad.ai -d ladsales.com --non-interactive --agree-tos --redirect --email admin@techiemaya.com
    
    if [ $? -eq 0 ]; then
        echo "✅ SSL certificate installed successfully!"
        echo "🔄 Reloading Nginx with SSL..."
        sudo systemctl reload nginx
    else
        echo "⚠️  SSL certificate installation had issues. You may need to run certbot manually."
        echo "   Run: sudo certbot --nginx -d agent.techiemaya.com -d mrlad.ai -d ladsales.com"
    fi
else
    echo "❌ Nginx configuration test failed!"
    exit 1
fi
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Nginx configuration and SSL deployed successfully!${NC}"
    echo ""
    echo "📋 Configuration Details:"
    echo "   - Domains: agent.techiemaya.com, mrlad.ai, ladsales.com"
    echo "   - Frontend: localhost:3001"
    echo "   - Backend: localhost:3004"
    echo "   - Config: /etc/nginx/sites-available/lad"
    echo "   - SSL: Enabled with Let's Encrypt"
    echo ""
    echo "✅ Your application should now be accessible at:"
    echo "   https://agent.techiemaya.com"
    echo "   https://mrlad.ai"
    echo "   https://ladsales.com"
    echo ""
    echo "🔧 Useful commands:"
    echo "   - Check SSL status: ssh $SERVER_USER@$SERVER_HOST 'sudo certbot certificates'"
    echo "   - Renew SSL: ssh $SERVER_USER@$SERVER_HOST 'sudo certbot renew'"
    echo "   - Check Nginx: ssh $SERVER_USER@$SERVER_HOST 'sudo nginx -t'"
    echo ""
else
    echo -e "${RED}❌ Failed to deploy Nginx configuration!${NC}"
    exit 1
fi
