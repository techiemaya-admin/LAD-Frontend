#!/bin/bash

# LAD Frontend Cloud Run Deployment Script
# This script helps deploy the Next.js frontend to Google Cloud Run

set -e

# Configuration
PROJECT_ID="salesmaya-pluto"
REGION="us-central1"
SERVICE_NAME="lad-frontend"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "   LAD Frontend Deployment Manager"
echo "======================================"
echo ""
echo "Service: ${SERVICE_NAME}"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Function to display menu
show_menu() {
    echo "Select an option:"
    echo "1) Manual deployment (trigger Cloud Build)"
    echo "2) View deployment status"
    echo "3) View service logs"
    echo "4) View recent builds"
    echo "5) Exit"
    echo ""
}

# Function to trigger manual deployment
deploy_service() {
    echo -e "${YELLOW}Triggering manual deployment...${NC}"
    echo ""
    
    cd ../.. && gcloud builds submit \
        --config=web/cloudbuild.yaml \
        --project=${PROJECT_ID} \
        .
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Deployment initiated successfully!${NC}"
        echo ""
        echo "📊 Deployment Information:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
            --region=${REGION} \
            --project=${PROJECT_ID} \
            --format="value(status.url)" 2>/dev/null || echo "Not available yet")
        
        echo "Service URL: ${SERVICE_URL}"
        echo "Health Check: ${SERVICE_URL}/api/health"
        echo ""
        echo "💡 Note: Auto-deployment is configured for the master branch"
        echo "   Simply push to master to trigger automatic deployment"
    else
        echo -e "${RED}❌ Deployment failed!${NC}"
        exit 1
    fi
}

# Function to view deployment status
view_status() {
    echo -e "${YELLOW}Fetching deployment status...${NC}"
    echo ""
    
    gcloud run services describe ${SERVICE_NAME} \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --format="table(
            status.url,
            status.conditions[0].status,
            status.traffic[0].revisionName,
            metadata.creationTimestamp
        )"
    
    echo ""
    echo "Recent revisions:"
    gcloud run revisions list \
        --service=${SERVICE_NAME} \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --limit=5 \
        --format="table(
            metadata.name,
            status.conditions[0].status,
            metadata.creationTimestamp
        )"
}

# Function to view logs
view_logs() {
    echo -e "${YELLOW}Fetching recent logs...${NC}"
    echo ""
    
    gcloud logs read \
        "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}" \
        --limit=50 \
        --project=${PROJECT_ID} \
        --format="table(timestamp,severity,textPayload)"
}

# Function to view recent builds
view_builds() {
    echo -e "${YELLOW}Fetching recent builds...${NC}"
    echo ""
    
    gcloud builds list \
        --project=${PROJECT_ID} \
        --limit=5 \
        --format="table(id,status,createTime,duration)"
}

# Main menu loop
while true; do
    show_menu
    read -p "Enter your choice [1-5]: " choice
    echo ""
    
    case $choice in
        1)
            deploy_service
            echo ""
            ;;
        2)
            view_status
            echo ""
            ;;
        3)
            view_logs
            echo ""
            ;;
        4)
            view_builds
            echo ""
            ;;
        5)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please try again.${NC}"
            echo ""
            ;;
    esac
done
