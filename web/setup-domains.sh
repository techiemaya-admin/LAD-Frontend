#!/bin/bash

# Cloud Run Domain Mapping Script
# Maps custom domains to Cloud Run service and provides DNS instructions

PROJECT_ID="salesmaya-pluto"
SERVICE_NAME="lad-frontend"
REGION="us-central1"
DOMAINS=("agent.techiemaya.com" "mrlad.ai" "ladsales.com")

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "======================================"
echo "   Cloud Run Domain Mapping Setup"
echo "======================================"
echo ""
echo "Project: ${PROJECT_ID}"
echo "Service: ${SERVICE_NAME}"
echo "Region: ${REGION}"
echo ""
echo "Domains to map:"
for DOMAIN in "${DOMAINS[@]}"; do
    echo "  - ${DOMAIN}"
done
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo -e "${YELLOW}Setting project to ${PROJECT_ID}...${NC}"
gcloud config set project $PROJECT_ID

# Verify service exists
echo ""
echo -e "${YELLOW}Verifying Cloud Run service exists...${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --format="value(status.url)" 2>/dev/null)

if [ -z "$SERVICE_URL" ]; then
    echo -e "${RED}❌ Error: Service '${SERVICE_NAME}' not found in region '${REGION}'${NC}"
    echo ""
    echo "Available services:"
    gcloud run services list --region=$REGION
    exit 1
fi

echo -e "${GREEN}✅ Service found: ${SERVICE_URL}${NC}"
echo ""

# Function to map a domain
map_domain() {
    local DOMAIN=$1
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}📌 Mapping domain: ${DOMAIN}${NC}"
    echo ""
    
    # Check if domain is already mapped
    EXISTING=$(gcloud run domain-mappings list \
        --region=$REGION \
        --filter="metadata.name=${DOMAIN}" \
        --format="value(metadata.name)" 2>/dev/null)
    
    if [ ! -z "$EXISTING" ]; then
        echo -e "${YELLOW}⚠️  Domain already mapped. Skipping...${NC}"
        echo ""
        gcloud run domain-mappings describe \
            --domain=$DOMAIN \
            --region=$REGION \
            --format="yaml(status)"
        return
    fi
    
    # Create domain mapping
    gcloud run domain-mappings create \
        --service=$SERVICE_NAME \
        --domain=$DOMAIN \
        --region=$REGION
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Domain mapping created for ${DOMAIN}${NC}"
    else
        echo ""
        echo -e "${RED}❌ Failed to map domain ${DOMAIN}${NC}"
    fi
    echo ""
}

# Map each domain
echo -e "${YELLOW}Starting domain mapping process...${NC}"
echo ""

for DOMAIN in "${DOMAINS[@]}"; do
    map_domain $DOMAIN
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}🎉 Domain mapping process completed!${NC}"
echo ""

# Show current mappings
echo -e "${BLUE}📋 Current Domain Mappings:${NC}"
echo ""
gcloud run domain-mappings list --region=$REGION

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}📝 NEXT STEPS:${NC}"
echo ""
echo "1. Add the DNS records shown above to your domain registrar"
echo "   (GoDaddy, Namecheap, Cloudflare, etc.)"
echo ""
echo "2. Wait for DNS propagation (usually 15-30 minutes)"
echo "   Check with: dig agent.techiemaya.com"
echo "   Or use: https://www.whatsmydns.net/"
echo ""
echo "3. SSL certificates will be auto-provisioned by Google"
echo "   This can take up to 24 hours after DNS propagates"
echo ""
echo "4. Verify your domains are working:"
echo "   curl -I https://agent.techiemaya.com"
echo "   curl -I https://mrlad.ai"
echo "   curl -I https://ladsales.com"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📊 Useful Commands:${NC}"
echo ""
echo "Check domain mapping status:"
echo "  gcloud run domain-mappings describe --domain=agent.techiemaya.com --region=${REGION}"
echo ""
echo "View all mappings:"
echo "  gcloud run domain-mappings list --region=${REGION}"
echo ""
echo "Check DNS propagation:"
echo "  dig agent.techiemaya.com"
echo "  nslookup agent.techiemaya.com"
echo ""
echo "View Cloud Run logs:"
echo "  gcloud logs read \"resource.type=cloud_run_revision\" --limit=50"
echo ""
echo "Test SSL certificate:"
echo "  openssl s_client -connect agent.techiemaya.com:443"
echo ""
