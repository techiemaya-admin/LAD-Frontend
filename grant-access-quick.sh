#!/bin/bash

# Quick script to grant read-only access
# Usage: ./grant-access-quick.sh

DEVELOPER_EMAIL="admin@techiemaya.com"
PROJECT_ID="salesmaya-pluto"

echo "🔐 Granting read-only access to: $DEVELOPER_EMAIL"
echo ""

# All commands on single lines to avoid backslash issues
echo "1. Granting Cloud Run Viewer..."
gcloud projects add-iam-policy-binding $PROJECT_ID --member="user:${DEVELOPER_EMAIL}" --role="roles/run.viewer"

echo "2. Granting Logs Viewer..."
gcloud projects add-iam-policy-binding $PROJECT_ID --member="user:${DEVELOPER_EMAIL}" --role="roles/logging.viewer"

echo "3. Granting Project Viewer..."
gcloud projects add-iam-policy-binding $PROJECT_ID --member="user:${DEVELOPER_EMAIL}" --role="roles/viewer"

echo ""
echo "✅ Access granted successfully!"

