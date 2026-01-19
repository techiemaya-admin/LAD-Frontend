#!/bin/bash

# Configure Cloud Tasks Queue with Retry Limits
# This script fixes the looping calls issue by setting proper retry limits

set -e

PROJECT_ID=${GCP_PROJECT_ID:-"salesmaya-pluto"}
LOCATION=${GCP_LOCATION:-"us-central1"}
QUEUE_NAME="follow-up-voag-calls"

echo "🔧 Configuring Cloud Tasks queue retry limits..."
echo "Project: $PROJECT_ID"
echo "Location: $LOCATION"
echo "Queue: $QUEUE_NAME"

# Update the queue with proper retry configuration
gcloud tasks queues update $QUEUE_NAME \
  --location=$LOCATION \
  --max-attempts=3 \
  --max-retry-duration=300s \
  --min-backoff=60s \
  --max-backoff=120s \
  --max-doublings=3

echo "✅ Queue updated successfully with retry limits:"
echo "   - Maximum attempts: 3 (initial + 2 retries)"  
echo "   - Maximum retry duration: 5 minutes"
echo "   - Backoff range: 60s to 120s"
echo "   - Maximum doublings: 3"

# Verify the configuration
echo ""
echo "📋 Current queue configuration:"
gcloud tasks queues describe $QUEUE_NAME --location=$LOCATION