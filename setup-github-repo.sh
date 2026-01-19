#!/bin/bash

# GitHub Repository Setup Script
# Sets up branch protection, labels, and other repository settings

set -e

REPO_OWNER="techiemaya-admin"
REPO_NAME="lad-feature-ai-icp-assistant"

echo "🚀 Setting up GitHub repository: $REPO_OWNER/$REPO_NAME"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "Install from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Create labels
echo "📋 Creating labels..."

LABELS=(
    "backend:0366d6:Backend related changes"
    "frontend:fbca04:Frontend related changes"
    "database:d4c5f9:Database related changes"
    "testing:0e8a16:Testing related changes"
    "documentation:0075ca:Documentation changes"
    "size/XS:c2e0c6:Extra small PR"
    "size/S:d4c5f9:Small PR"
    "size/M:fbca04:Medium PR"
    "size/L:f9d0c4:Large PR"
    "size/XL:d93f0b:Extra large PR"
    "auto-merge:2cbe4e:Auto-merge enabled"
    "urgent:b60205:Urgent issue/PR"
    "ci-failure:d73a4a:CI pipeline failure"
)

for label in "${LABELS[@]}"; do
    IFS=':' read -r name color description <<< "$label"
    
    if gh label create "$name" --color "$color" --description "$description" --repo "$REPO_OWNER/$REPO_NAME" 2>/dev/null; then
        echo "  ✅ Created label: $name"
    else
        echo "  ⚠️  Label already exists: $name"
    fi
done

echo ""
echo "🔒 Setting up branch protection for 'main'..."

# Note: Branch protection requires API calls that gh doesn't fully support
# This generates the commands you need to run

cat << 'EOF'

⚠️  Branch protection rules must be configured via GitHub UI or API.

Please go to:
https://github.com/techiemaya-admin/lad-feature-ai-icp-assistant/settings/branches

Configure 'main' branch with:

✅ Require pull request reviews before merging
   - Required approving reviews: 1
   - Dismiss stale pull request approvals

✅ Require status checks before merging
   - Require branches to be up to date before merging
   - Status checks:
     * Validate PR / validate
     * Security Scan / security-check
     * Auto-label PR / label-pr

✅ Require conversation resolution before merging

❌ Allow force pushes: Disabled
❌ Allow deletions: Disabled

EOF

echo ""
echo "🔐 Setting up repository secrets..."

cat << 'EOF'

Please add the following secrets via GitHub UI:
https://github.com/techiemaya-admin/lad-feature-ai-icp-assistant/settings/secrets/actions

Required secrets:
1. LAD_REPO_TOKEN
   - Personal Access Token with repo and workflow scopes
   - Create at: https://github.com/settings/tokens
   
Optional secrets:
2. SLACK_WEBHOOK (for notifications)
3. DISCORD_WEBHOOK (for notifications)

EOF

echo ""
echo "⚙️  Configuring repository settings..."

# Enable auto-merge
gh api -X PATCH "/repos/$REPO_OWNER/$REPO_NAME" \
    -f allow_auto_merge=true \
    -f delete_branch_on_merge=true \
    -f allow_squash_merge=true \
    -f allow_merge_commit=false \
    -f allow_rebase_merge=false \
    > /dev/null 2>&1 && echo "  ✅ Enabled auto-merge and squash-only merging" || echo "  ⚠️  Could not update merge settings"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure branch protection rules (see above)"
echo "2. Add required secrets (see above)"
echo "3. Review workflow files in .github/workflows/"
echo "4. Create a test PR to verify pipeline"
echo ""
echo "For detailed documentation, see: CI_CD_GUIDE.md"
