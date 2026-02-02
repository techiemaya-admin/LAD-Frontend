#!/bin/bash

# LAD Frontend Staging Deployment Script
# Deploys to Cloud Run staging environment

set -e

# Configuration
PROJECT_ID="salesmaya-pluto"
REGION="us-central1"
SERVICE_NAME="lad-frontend-stage"
IMAGE_NAME="gcr.io/${PROJECT_ID}/lad-frontend-stage"
BACKEND_URL="https://lad-backend-stage-741719885039.us-central1.run.app"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "======================================"
echo "   LAD Frontend Staging Deployment"
echo "======================================"
echo ""
echo "Service: ${SERVICE_NAME}"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Backend: ${BACKEND_URL}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check current project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  Current project: ${CURRENT_PROJECT}${NC}"
    echo -e "${YELLOW}Switching to: ${PROJECT_ID}${NC}"
    gcloud config set project ${PROJECT_ID}
fi

# Function to display menu
show_menu() {
    echo "Select deployment option:"
    echo "1) Deploy to staging (trigger Cloud Build)"
    echo "2) View staging service status"
    echo "3) View staging logs"
    echo "4) View recent builds"
    echo "5) Rollback to previous revision"
    echo "6) Exit"
    echo ""
}

# Function to trigger staging deployment
deploy_staging() {
    echo -e "${YELLOW}🚀 Triggering staging deployment...${NC}"
    echo ""
    
    cd ../.. && gcloud builds submit \
        --config=web/cloudbuild-stage.yaml \
        --project=${PROJECT_ID} \
        --substitutions=_API_URL=${BACKEND_URL},_NEXT_PUBLIC_SOCKET_URL=${BACKEND_URL} \
        .
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Staging deployment initiated successfully!${NC}"
        echo ""
        echo "📊 Deployment Information:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
            --region=${REGION} \
            --project=${PROJECT_ID} \
            --format="value(status.url)" 2>/dev/null || echo "Not available yet")
        
        echo "Service URL: ${SERVICE_URL}"
        echo "Backend URL: ${BACKEND_URL}"
        echo "Environment: STAGING"
        echo ""
        echo -e "${BLUE}💡 Staging environment is for testing before production${NC}"
    else
        echo -e "${RED}❌ Deployment failed!${NC}"
        exit 1
    fi
}

# Function to view staging status
view_status() {
    echo -e "${YELLOW}📊 Fetching staging service status...${NC}"
    echo ""
    
    gcloud run services describe ${SERVICE_NAME} \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --format="yaml(metadata.name, status.url, status.conditions, status.latestReadyRevisionName)" 2>/dev/null
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Staging service not found!${NC}"
        echo "Deploy staging first with option 1"
        return
    fi
    
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

# Function to view staging logs
view_logs() {
    echo -e "${YELLOW}📋 Fetching staging logs (last 50 entries)...${NC}"
    echo ""
    
    gcloud logs read \
        "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}" \
        --limit=50 \
        --project=${PROJECT_ID} \
        --format="table(timestamp,severity,textPayload)"
}

# Function to view recent builds
view_builds() {
    echo -e "${YELLOW}🔨 Fetching recent builds...${NC}"
    echo ""
    
    gcloud builds list \
        --project=${PROJECT_ID} \
        --filter="tags:lad-frontend-stage OR source.repoSource.repoName:lad-frontend" \
        --limit=5 \
        --format="table(id,status,createTime,duration,source.repoSource.branchName)"
}

# Function to rollback
rollback() {
    echo -e "${YELLOW}🔄 Available revisions for rollback:${NC}"
    echo ""
    
    gcloud run revisions list \
        --service=${SERVICE_NAME} \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --limit=5 \
        --format="table(
            metadata.name:label='REVISION',
            status.conditions[0].status:label='STATUS',
            metadata.creationTimestamp:label='CREATED'
        )"
    
    echo ""
    read -p "Enter revision name to rollback to (or press Enter to cancel): " REVISION
    
    if [ -z "$REVISION" ]; then
        echo "Rollback cancelled"
        return
    fi
    
    echo ""
    echo -e "${YELLOW}Rolling back to: ${REVISION}${NC}"
    
    gcloud run services update-traffic ${SERVICE_NAME} \
        --to-revisions=${REVISION}=100 \
        --region=${REGION} \
        --project=${PROJECT_ID}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Rollback successful!${NC}"
    else
        echo -e "${RED}❌ Rollback failed!${NC}"
    fi
}

# Main menu loop
while true; do
    show_menu
    read -p "Enter your choice [1-6]: " choice
    echo ""
    
    case $choice in
        1)
            deploy_staging
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
            rollback
            echo ""
            ;;
        6)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please try again.${NC}"
            echo ""
            ;;
    esac
done
