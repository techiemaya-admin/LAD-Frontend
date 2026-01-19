#!/bin/bash

# Restore Original Queue Name
# Run this script later to try restoring the original queue name

set -e

ORIGINAL_QUEUE="follow-up-voag-calls"
TEMP_QUEUE="follow-up-voag-calls-v2"
LOCATION="us-central1"

echo "🔄 Attempting to restore original queue name..."

echo "📋 Checking if original name is available..."
gcloud tasks queues create $ORIGINAL_QUEUE \
  --location=$LOCATION \
  --max-attempts=3 \
  --max-retry-duration=300s \
  --min-backoff=60s \
  --max-backoff=120s \
  --max-doublings=3

if [ $? -eq 0 ]; then
  echo "✅ Original queue name restored!"
  
  echo "🔧 Updating backend configuration..."
  sed -i.bak 's/follow-up-voag-calls-v2/follow-up-voag-calls/g' backend/.env
  
  echo "🗑️  Cleaning up temporary queue..."
  gcloud tasks queues delete $TEMP_QUEUE --location=$LOCATION --quiet
  
  echo "🎯 Queue restoration complete!"
  echo "📋 New queue configuration:"
  gcloud tasks queues describe $ORIGINAL_QUEUE --location=$LOCATION
else
  echo "❌ Original queue name still not available. Try again later."
  echo "💡 Current working queue: $TEMP_QUEUE"
fi