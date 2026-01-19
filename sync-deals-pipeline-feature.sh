#!/bin/bash

# Sync Deals Pipeline Feature to Feature Repository
# This script copies the latest deals-pipeline code from LAD workspace to the feature repo

set -e

FEATURE_REPO="/Users/naveenreddy/Desktop/AI-Maya/lad-feature-deals-pipeline"
LAD_WORKSPACE="/Users/naveenreddy/Desktop/AI-Maya/LAD"

echo "🔄 Syncing Deals Pipeline feature..."
echo "From: $LAD_WORKSPACE"
echo "To: $FEATURE_REPO"
echo ""

# Check if feature repo exists
if [ ! -d "$FEATURE_REPO" ]; then
  echo "❌ Error: Feature repository not found at $FEATURE_REPO"
  exit 1
fi

# Backup existing feature repo (optional)
BACKUP_DIR="$FEATURE_REPO.backup.$(date +%Y%m%d_%H%M%S)"
echo "📦 Creating backup at: $BACKUP_DIR"
cp -r "$FEATURE_REPO" "$BACKUP_DIR"

# ========================================
# BACKEND: Copy backend feature files
# ========================================
echo ""
echo "📂 Syncing BACKEND files..."

# Copy backend feature folder
if [ -d "$LAD_WORKSPACE/backend/features/deals-pipeline" ]; then
  echo "  ✓ Copying backend/features/deals-pipeline/"
  rsync -av --delete \
    "$LAD_WORKSPACE/backend/features/deals-pipeline/" \
    "$FEATURE_REPO/backend/" \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude '*.log'
else
  echo "  ⚠️  Backend feature folder not found"
fi

# ========================================
# FRONTEND SDK: Copy from lad-feature-campaigns SDK structure
# ========================================
echo ""
echo "📂 Syncing FRONTEND SDK files..."

# Check if we should copy from campaigns SDK as template
CAMPAIGNS_SDK="/Users/naveenreddy/Desktop/AI-Maya/lad-feature-campaigns/sdk"
if [ -d "$CAMPAIGNS_SDK" ]; then
  echo "  ℹ️  Using campaigns SDK structure as reference"
  
  # Create SDK directory structure
  mkdir -p "$FEATURE_REPO/sdk"
  
  # Copy package.json if it exists in campaigns
  if [ -f "$CAMPAIGNS_SDK/package.json" ]; then
    echo "  ✓ Copying SDK package.json structure"
    cp "$CAMPAIGNS_SDK/package.json" "$FEATURE_REPO/sdk/package.json.template"
  fi
fi

# Copy frontend feature components
if [ -d "$LAD_WORKSPACE/frontend/web/src/features/deals-pipeline" ]; then
  echo "  ✓ Copying frontend deals-pipeline components to SDK"
  mkdir -p "$FEATURE_REPO/sdk/components"
  rsync -av \
    "$LAD_WORKSPACE/frontend/web/src/features/deals-pipeline/" \
    "$FEATURE_REPO/sdk/components/" \
    --exclude 'node_modules'
else
  echo "  ⚠️  Frontend feature folder not found"
fi

# Copy app route file (minimal wrapper)
if [ -f "$LAD_WORKSPACE/frontend/web/src/app/pipeline/page.tsx" ]; then
  echo "  ✓ Copying app/pipeline/page.tsx"
  mkdir -p "$FEATURE_REPO/frontend/app/pipeline"
  cp "$LAD_WORKSPACE/frontend/web/src/app/pipeline/page.tsx" \
     "$FEATURE_REPO/frontend/app/pipeline/page.tsx"
fi

if [ -f "$LAD_WORKSPACE/frontend/web/src/app/pipeline/loading.tsx" ]; then
  echo "  ✓ Copying app/pipeline/loading.tsx"
  cp "$LAD_WORKSPACE/frontend/web/src/app/pipeline/loading.tsx" \
     "$FEATURE_REPO/frontend/app/pipeline/loading.tsx"
fi

# ========================================
# DOCUMENTATION
# ========================================
echo ""
echo "📄 Creating sync documentation..."

cat > "$FEATURE_REPO/SYNC_INFO.md" << EOF
# Deals Pipeline Feature - Last Sync

**Synced on:** $(date)
**Synced from:** $LAD_WORKSPACE
**Synced to:** $FEATURE_REPO

## What Was Synced

### Backend
- \`backend/features/deals-pipeline/\` → \`backend/\`
  - All controllers, models, routes, services
  - Excluding: node_modules, .env, logs

### Frontend SDK
- \`frontend/web/src/features/deals-pipeline/\` → \`sdk/components/\`
  - All React components, hooks, types
  - PipelineBoard.tsx (with all TypeScript fixes)
  - All dialog components (CreateCard, LeadDetails, etc.)
  - Configuration files

### Frontend App Routes
- \`frontend/web/src/app/pipeline/page.tsx\` → \`frontend/app/pipeline/page.tsx\`
- \`frontend/web/src/app/pipeline/loading.tsx\` → \`frontend/app/pipeline/loading.tsx\`

## Recent Changes Synced

1. ✅ TypeScript compilation fixes (39+ errors resolved)
2. ✅ Radix UI component migrations (replaced MUI)
3. ✅ Redux typed dispatch fixes
4. ✅ Module resolution fixes
5. ✅ LAD architecture compliance

## Backup

A backup of the previous version was created at:
\`$BACKUP_DIR\`

## Next Steps

1. Review the synced changes
2. Update package.json if needed
3. Test the feature independently
4. Commit changes to feature repo

## File Structure

\`\`\`
lad-feature-deals-pipeline/
├── backend/                  # Backend feature code
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── services/
├── sdk/                      # Frontend SDK
│   └── components/          # React components
│       ├── PipelineBoard.tsx
│       ├── CreateCardDialog.tsx
│       ├── LeadDetailsDialog.tsx
│       └── ...
├── frontend/                 # App route wrappers
│   └── app/
│       └── pipeline/
│           ├── page.tsx
│           └── loading.tsx
└── SYNC_INFO.md             # This file
\`\`\`
EOF

# ========================================
# SUMMARY
# ========================================
echo ""
echo "✅ Sync completed successfully!"
echo ""
echo "📊 Summary:"
echo "  - Backend files: $(find "$FEATURE_REPO/backend" -type f 2>/dev/null | wc -l | tr -d ' ') files"
echo "  - SDK components: $(find "$FEATURE_REPO/sdk/components" -type f 2>/dev/null | wc -l | tr -d ' ') files"
echo "  - Backup created: $BACKUP_DIR"
echo ""
echo "📝 Next steps:"
echo "  1. cd $FEATURE_REPO"
echo "  2. Review changes: git status"
echo "  3. Review SYNC_INFO.md for details"
echo "  4. Test the feature"
echo "  5. Commit: git add . && git commit -m 'Sync latest changes from LAD workspace'"
echo ""
