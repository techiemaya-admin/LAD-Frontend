#!/bin/bash

# Quick staging deployment script
set -e

cd /Users/naveenreddy/Desktop/AI-Maya/LAD/LAD-Web/LAD-Frontend

echo "🚀 Starting staging deployment..."
echo "Working directory: $(pwd)"
echo ""

# Get git info
BRANCH_NAME=$(git branch --show-current)
SHORT_SHA=$(git rev-parse --short HEAD)
COMMIT_SHA=$(git rev-parse HEAD)

echo "Branch: $BRANCH_NAME"
echo "Commit: $SHORT_SHA"
echo ""

# Submit build
gcloud builds submit \
  --config=web/cloudbuild-stage.yaml \
  --project=salesmaya-pluto \
  --substitutions=BRANCH_NAME=$BRANCH_NAME,SHORT_SHA=$SHORT_SHA,COMMIT_SHA=$COMMIT_SHA \
  .

echo ""
echo "✅ Build submitted!"
