#!/bin/bash

# Fix Cloud Tasks Queue Issues
# This script recreates the queue to resolve stuck tasks

set -e

QUEUE_NAME="follow-up-voag-calls"
LOCATION="us-central1"
PROJECT_ID="salesmaya-pluto"

echo "🔧 Fixing Cloud Tasks queue issues..."

echo "📋 Current queue status:"
gcloud tasks queues describe $QUEUE_NAME --location=$LOCATION || echo "Queue not found"

echo "🗑️  Deleting existing queue..."
gcloud tasks queues delete $QUEUE_NAME --location=$LOCATION --quiet || echo "Queue deletion failed or queue doesn't exist"

echo "⏳ Waiting for deletion to complete..."
sleep 10

echo "🆕 Creating new queue with proper configuration..."
gcloud tasks queues create $QUEUE_NAME \
  --location=$LOCATION \
  --max-attempts=3 \
  --max-retry-duration=300s \
  --min-backoff=60s \
  --max-backoff=120s \
  --max-doublings=3 \
  --max-concurrent-dispatches=1000 \
  --max-dispatches-per-second=500

echo "✅ Queue recreated successfully!"

echo "📋 New queue configuration:"
gcloud tasks queues describe $QUEUE_NAME --location=$LOCATION

echo "🎯 Queue is ready for new tasks!"