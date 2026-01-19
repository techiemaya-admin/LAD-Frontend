#!/bin/bash

# Manual Feature Migration Script
# Syncs a feature from its repo to LAD Backend/Frontend develop branch

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if feature name is provided
if [ -z "$1" ]; then
    print_error "Usage: ./manual-sync-feature.sh <feature-name> [backend|frontend|both]"
    echo ""
    echo "Examples:"
    echo "  ./manual-sync-feature.sh campaigns backend"
    echo "  ./manual-sync-feature.sh ai-icp-assistant frontend"
    echo "  ./manual-sync-feature.sh deals-pipeline both"
    echo ""
    exit 1
fi

FEATURE_NAME=$1
TARGET=${2:-both}  # Default to both if not specified

# Validate target
if [[ "$TARGET" != "backend" && "$TARGET" != "frontend" && "$TARGET" != "both" ]]; then
    print_error "Invalid target. Must be: backend, frontend, or both"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR="/tmp/lad-feature-sync-$$"

print_info "Starting manual sync for feature: $FEATURE_NAME"
print_info "Target: $TARGET"

# Create temp directory
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Clone feature repo
print_info "Cloning feature repository..."
if [ -d "$HOME/Desktop/AI-Maya/lad-feature-${FEATURE_NAME}" ]; then
    print_info "Using local feature repo..."
    cp -r "$HOME/Desktop/AI-Maya/lad-feature-${FEATURE_NAME}" "./feature-repo"
    cd "./feature-repo"
    git checkout main
    git pull origin main || print_warning "Could not pull latest changes"
else
    git clone "https://github.com/techiemaya-admin/lad-feature-${FEATURE_NAME}.git" "./feature-repo"
    cd "./feature-repo"
    git checkout main
fi

FEATURE_COMMIT=$(git rev-parse HEAD)
print_info "Feature repo at commit: $FEATURE_COMMIT"

cd "$TEMP_DIR"

# Sync Backend
if [[ "$TARGET" == "backend" || "$TARGET" == "both" ]]; then
    print_info "Syncing backend..."
    
    # Clone LAD-Backend
    if [ -d "$HOME/Desktop/AI-Maya/LAD/backend" ]; then
        print_info "Using local LAD-Backend repo..."
        cp -r "$HOME/Desktop/AI-Maya/LAD/backend" "./lad-backend"
        cd "./lad-backend"
        git checkout develop
        git pull origin develop || print_warning "Could not pull latest changes"
    else
        git clone "https://github.com/techiemaya-admin/LAD-Backend.git" "./lad-backend"
        cd "./lad-backend"
        git checkout develop
    fi
    
    # Create target directory
    print_info "Creating backend directories..."
    mkdir -p "features/${FEATURE_NAME}"
    
    # Sync backend files using rsync (more efficient than rm + cp)
    print_info "Syncing backend files with rsync..."
    cd "$TEMP_DIR/feature-repo"
    
    # Sync all backend files, excluding local testing files
    rsync -av --delete \
        --exclude='.env' \
        --exclude='generate-token.js' \
        --exclude='middleware/auth.js' \
        --exclude='package.json' \
        --exclude='package-lock.json' \
        --exclude='node_modules/' \
        --exclude='LOCAL_TESTING.md' \
        backend/ "$TEMP_DIR/lad-backend/features/${FEATURE_NAME}/" 2>/dev/null || true
    
    # Remove the middleware directory if it was copied (it's only for local testing)
    rm -rf "$TEMP_DIR/lad-backend/features/${FEATURE_NAME}/middleware/auth.js" 2>/dev/null || true
    
    # Commit and push
    cd "$TEMP_DIR/lad-backend"
    git config user.name "Manual Sync"
    git config user.email "sync@lad.local"
    git add "features/${FEATURE_NAME}/"
    
    if git diff --cached --quiet; then
        print_warning "No backend changes to commit"
    else
        git commit -m "feat(${FEATURE_NAME}): manual sync from feature repo

Synced from: ${FEATURE_COMMIT}
Repository: lad-feature-${FEATURE_NAME}
Timestamp: $(date -u)
Manual sync by: $(whoami)
"
        print_info "Pushing to LAD-Backend develop branch..."
        git push origin develop
        print_info "✅ Backend sync complete!"
    fi
fi

# Sync Frontend
if [[ "$TARGET" == "frontend" || "$TARGET" == "both" ]]; then
    print_info "Syncing frontend..."
    
    cd "$TEMP_DIR"
    
    # Clone LAD-Frontend
    if [ -d "$HOME/Desktop/AI-Maya/LAD/frontend" ]; then
        print_info "Using local LAD-Frontend repo..."
        cp -r "$HOME/Desktop/AI-Maya/LAD/frontend" "./lad-frontend"
        cd "./lad-frontend"
        git checkout develop
        git pull origin develop || print_warning "Could not pull latest changes"
    else
        git clone "https://github.com/techiemaya-admin/LAD-Frontend.git" "./lad-frontend"
        cd "./lad-frontend"
        git checkout develop
    fi
    
    # Create directory
    mkdir -p "sdk/features/${FEATURE_NAME}"
    
    # Sync frontend SDK using rsync
    print_info "Syncing frontend SDK with rsync..."
    cd "$TEMP_DIR/feature-repo"
    
    if [ -d "frontend/sdk" ]; then
        rsync -av --delete frontend/sdk/ "$TEMP_DIR/lad-frontend/sdk/features/${FEATURE_NAME}/" 2>/dev/null || true
    elif [ -d "sdk" ]; then
        rsync -av --delete sdk/ "$TEMP_DIR/lad-frontend/sdk/features/${FEATURE_NAME}/" 2>/dev/null || true
    fi
    
    # Sync components if exist
    if [ -d "frontend/components" ] && [ "$(ls -A frontend/components)" ]; then
        mkdir -p "$TEMP_DIR/lad-frontend/web/src/features/${FEATURE_NAME}"
        rsync -av --delete frontend/components/ "$TEMP_DIR/lad-frontend/web/src/features/${FEATURE_NAME}/"
    fi
    
    # Commit and push
    cd "$TEMP_DIR/lad-frontend"
    git config user.name "Manual Sync"
    git config user.email "sync@lad.local"
    git add "sdk/features/${FEATURE_NAME}/"
    [ -d "web/src/features/${FEATURE_NAME}" ] && git add "web/src/features/${FEATURE_NAME}/" || true
    
    if git diff --cached --quiet; then
        print_warning "No frontend changes to commit"
    else
        git commit -m "feat(${FEATURE_NAME}): manual sync SDK from feature repo

Synced from: ${FEATURE_COMMIT}
Repository: lad-feature-${FEATURE_NAME}
Timestamp: $(date -u)
Manual sync by: $(whoami)
"
        print_info "Pushing to LAD-Frontend develop branch..."
        git push origin develop
        print_info "✅ Frontend sync complete!"
    fi
fi

# Cleanup
cd "$SCRIPT_DIR"
rm -rf "$TEMP_DIR"

print_info "🎉 Manual sync completed successfully!"
echo ""
print_info "Summary:"
echo "  Feature: $FEATURE_NAME"
echo "  Target: $TARGET"
echo "  Commit: $FEATURE_COMMIT"
echo ""
print_info "Next steps:"
echo "  1. Verify the changes in LAD-Backend/Frontend develop branches"
echo "  2. Test the deployed services"
echo "  3. Monitor for any issues"
