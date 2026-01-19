#!/bin/bash

# Setup CI/CD for New LAD Feature Repository
# This script copies the CI/CD pipeline to a new feature repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   LAD Feature Repository CI/CD Setup Script               ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Get current directory (template repo)
TEMPLATE_REPO=$(pwd)
echo -e "${GREEN}✓${NC} Using template from: $TEMPLATE_REPO"
echo ""

# Get target repository path
read -p "Enter the path to your new feature repository: " TARGET_REPO

if [ ! -d "$TARGET_REPO" ]; then
    echo -e "${RED}✗${NC} Directory does not exist: $TARGET_REPO"
    exit 1
fi

echo -e "${GREEN}✓${NC} Target repository: $TARGET_REPO"
echo ""

# Get feature name
read -p "Enter your feature name (e.g., lead-scoring, email-automation): " FEATURE_NAME

if [ -z "$FEATURE_NAME" ]; then
    echo -e "${RED}✗${NC} Feature name cannot be empty"
    exit 1
fi

echo -e "${GREEN}✓${NC} Feature name: $FEATURE_NAME"
echo ""

# Get repository info
read -p "Enter GitHub repository owner (default: techiemaya-admin): " REPO_OWNER
REPO_OWNER=${REPO_OWNER:-techiemaya-admin}

read -p "Enter GitHub repository name (e.g., lad-feature-$FEATURE_NAME): " REPO_NAME

if [ -z "$REPO_NAME" ]; then
    REPO_NAME="lad-feature-$FEATURE_NAME"
fi

echo -e "${GREEN}✓${NC} Repository: $REPO_OWNER/$REPO_NAME"
echo ""

# Confirmation
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Summary:${NC}"
echo -e "  Template: $TEMPLATE_REPO"
echo -e "  Target:   $TARGET_REPO"
echo -e "  Feature:  $FEATURE_NAME"
echo -e "  Repo:     $REPO_OWNER/$REPO_NAME"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "Continue with setup? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo -e "${RED}✗${NC} Setup cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}Starting setup...${NC}"
echo ""

# Step 1: Copy workflow files
echo -e "${BLUE}[1/7]${NC} Copying workflow files..."
mkdir -p "$TARGET_REPO/.github/workflows"
cp "$TEMPLATE_REPO/.github/workflows/pr-validation.yml" "$TARGET_REPO/.github/workflows/"
cp "$TEMPLATE_REPO/.github/workflows/auto-merge.yml" "$TARGET_REPO/.github/workflows/"
cp "$TEMPLATE_REPO/.github/workflows/main-branch-protection.yml" "$TARGET_REPO/.github/workflows/"
cp "$TEMPLATE_REPO/.github/workflows/sync-to-main.yml" "$TARGET_REPO/.github/workflows/"
echo -e "${GREEN}  ✓${NC} Workflow files copied"

# Step 2: Update sync-to-main.yml with feature name
echo -e "${BLUE}[2/7]${NC} Updating sync-to-main.yml..."
sed -i.bak "s/ai-icp-assistant/$FEATURE_NAME/g" "$TARGET_REPO/.github/workflows/sync-to-main.yml"
rm "$TARGET_REPO/.github/workflows/sync-to-main.yml.bak"
echo -e "${GREEN}  ✓${NC} Feature name updated in sync workflow"

# Step 3: Copy documentation
echo -e "${BLUE}[3/7]${NC} Copying documentation..."
cp "$TEMPLATE_REPO/CI_CD_GUIDE.md" "$TARGET_REPO/"
cp "$TEMPLATE_REPO/CI_CD_QUICKSTART.md" "$TARGET_REPO/"
cp "$TEMPLATE_REPO/CI_CD_TEMPLATE.md" "$TARGET_REPO/"
echo -e "${GREEN}  ✓${NC} Documentation copied"

# Step 4: Copy and update setup script
echo -e "${BLUE}[4/7]${NC} Copying setup script..."
mkdir -p "$TARGET_REPO/scripts"
cp "$TEMPLATE_REPO/scripts/setup-github-repo.sh" "$TARGET_REPO/scripts/"
chmod +x "$TARGET_REPO/scripts/setup-github-repo.sh"

# Update setup script with new repo info
sed -i.bak "s/REPO_OWNER=\"techiemaya-admin\"/REPO_OWNER=\"$REPO_OWNER\"/g" "$TARGET_REPO/scripts/setup-github-repo.sh"
sed -i.bak "s/REPO_NAME=\"lad-feature-ai-icp-assistant\"/REPO_NAME=\"$REPO_NAME\"/g" "$TARGET_REPO/scripts/setup-github-repo.sh"
rm "$TARGET_REPO/scripts/setup-github-repo.sh.bak"
echo -e "${GREEN}  ✓${NC} Setup script copied and updated"

# Step 5: Create .gitignore if it doesn't exist
echo -e "${BLUE}[5/7]${NC} Setting up .gitignore..."
if [ ! -f "$TARGET_REPO/.gitignore" ]; then
    cp "$TEMPLATE_REPO/.gitignore" "$TARGET_REPO/" 2>/dev/null || cat > "$TARGET_REPO/.gitignore" << 'EOF'
node_modules/
.env
.DS_Store
*.log
dist/
build/
coverage/
.vscode/
.idea/
EOF
    echo -e "${GREEN}  ✓${NC} .gitignore created"
else
    echo -e "${YELLOW}  ⚠${NC} .gitignore already exists, skipping"
fi

# Step 6: Update README with badges
echo -e "${BLUE}[6/7]${NC} Creating README template..."
cat > "$TARGET_REPO/README_TEMPLATE.md" << EOF
# ${FEATURE_NAME^} Feature

![PR Validation](https://github.com/$REPO_OWNER/$REPO_NAME/workflows/PR%20Validation/badge.svg)
![Main Branch](https://github.com/$REPO_OWNER/$REPO_NAME/workflows/Main%20Branch%20Protection/badge.svg)
![Sync Status](https://github.com/$REPO_OWNER/$REPO_NAME/workflows/Sync%20to%20LAD%20Main%20Repositories/badge.svg)

## Overview

[Add your feature description here]

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Access to LAD main repository

### Setup

\`\`\`bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm start
\`\`\`

## 📁 Project Structure

\`\`\`
$REPO_NAME/
├── backend/           # Backend feature code
├── frontend/          # Frontend SDK and components
├── .github/workflows/ # CI/CD pipelines
└── scripts/          # Utility scripts
\`\`\`

## 🔄 Development Workflow

1. Create feature branch: \`git checkout -b feature/my-feature\`
2. Make changes and commit
3. Push and create PR
4. CI/CD pipeline validates automatically
5. After approval, auto-merges and syncs to LAD repos

## 📚 Documentation

- [CI/CD Guide](CI_CD_GUIDE.md) - Complete pipeline documentation
- [Quick Start](CI_CD_QUICKSTART.md) - Setup instructions
- [Template](CI_CD_TEMPLATE.md) - For creating more features

## 🤝 Contributing

This repository follows the LAD Feature Development Pattern. See [CI_CD_GUIDE.md](CI_CD_GUIDE.md) for details.

---

**Last Updated**: $(date +%Y-%m-%d)
**Feature Version**: 1.0.0
**LAD Compliance**: ✅ Verified
EOF
echo -e "${GREEN}  ✓${NC} README template created (README_TEMPLATE.md)"

# Step 7: Show next steps
echo -e "${BLUE}[7/7]${NC} Setup complete!"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Setup Complete!                                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo -e "1. ${BLUE}Commit the CI/CD files:${NC}"
echo "   cd $TARGET_REPO"
echo "   git add .github/ scripts/ *.md"
echo "   git commit -m 'ci: add CI/CD pipeline'"
echo "   git push origin main"
echo ""

echo -e "2. ${BLUE}Add GitHub Secret:${NC}"
echo "   https://github.com/$REPO_OWNER/$REPO_NAME/settings/secrets/actions"
echo "   Name: LAD_REPO_TOKEN"
echo "   Value: Your GitHub Personal Access Token"
echo ""

echo -e "3. ${BLUE}Configure Branch Protection:${NC}"
echo "   https://github.com/$REPO_OWNER/$REPO_NAME/settings/branches"
echo "   - Add rule for 'main' branch"
echo "   - Require PR reviews"
echo "   - Require status checks"
echo ""

echo -e "4. ${BLUE}Enable Auto-merge:${NC}"
echo "   https://github.com/$REPO_OWNER/$REPO_NAME/settings"
echo "   - Enable 'Allow auto-merge'"
echo "   - Enable 'Automatically delete head branches'"
echo ""

echo -e "5. ${BLUE}Run setup script:${NC}"
echo "   cd $TARGET_REPO"
echo "   ./scripts/setup-github-repo.sh"
echo ""

echo -e "6. ${BLUE}Test with a PR:${NC}"
echo "   git checkout -b test/ci-pipeline"
echo "   echo '# Test' >> TEST.md"
echo "   git add TEST.md && git commit -m 'test: CI/CD'"
echo "   git push origin test/ci-pipeline"
echo "   gh pr create --title 'test: CI/CD' --body 'Testing'"
echo ""

echo -e "${GREEN}✓${NC} For detailed instructions, see: $TARGET_REPO/CI_CD_QUICKSTART.md"
echo ""
