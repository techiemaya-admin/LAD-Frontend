# CI/CD Template for LAD Feature Repositories

This template helps you set up the same CI/CD pipeline for any new LAD feature repository.

## 📋 Prerequisites

- GitHub repository created for the feature
- GitHub CLI (`gh`) installed
- Access to LAD-Backend and LAD-Frontend repositories
- GitHub Personal Access Token with `repo` and `workflow` scopes

## 🚀 Setup Steps

### Step 1: Copy CI/CD Files

Copy these files from this repository to your new feature repo:

```bash
# Set your feature repo path
NEW_FEATURE_REPO="/path/to/your-new-feature-repo"

# Copy workflow files
mkdir -p "$NEW_FEATURE_REPO/.github/workflows"
cp .github/workflows/pr-validation.yml "$NEW_FEATURE_REPO/.github/workflows/"
cp .github/workflows/auto-merge.yml "$NEW_FEATURE_REPO/.github/workflows/"
cp .github/workflows/main-branch-protection.yml "$NEW_FEATURE_REPO/.github/workflows/"
cp .github/workflows/sync-to-main.yml "$NEW_FEATURE_REPO/.github/workflows/"

# Copy documentation
cp CI_CD_GUIDE.md "$NEW_FEATURE_REPO/"
cp CI_CD_QUICKSTART.md "$NEW_FEATURE_REPO/"

# Copy setup script
mkdir -p "$NEW_FEATURE_REPO/scripts"
cp scripts/setup-github-repo.sh "$NEW_FEATURE_REPO/scripts/"
chmod +x "$NEW_FEATURE_REPO/scripts/setup-github-repo.sh"
```

### Step 2: Update sync-to-main.yml

Edit `.github/workflows/sync-to-main.yml` in your new feature repo:

**Update Repository Names:**
```yaml
# Change this line (appears twice in the file):
repository: techiemaya-admin/LAD-Backend
# Keep as-is

repository: techiemaya-admin/LAD-Frontend
# Keep as-is
```

**Update Feature Paths:**

Replace `ai-icp-assistant` with your feature name (e.g., `lead-scoring`, `email-automation`):

```yaml
# Backend sync - change all occurrences:
lad-backend/features/ai-icp-assistant/
# TO:
lad-backend/features/YOUR-FEATURE-NAME/

# Frontend sync - change all occurrences:
lad-frontend/sdk/features/ai-icp-assistant/
# TO:
lad-frontend/sdk/features/YOUR-FEATURE-NAME/

lad-frontend/web/src/features/ai-icp-assistant/
# TO:
lad-frontend/web/src/features/YOUR-FEATURE-NAME/
```

### Step 3: Update Repository Settings in Scripts

Edit `scripts/setup-github-repo.sh`:

```bash
# Change these lines at the top:
REPO_OWNER="techiemaya-admin"
REPO_NAME="lad-feature-ai-icp-assistant"  # Change to your feature name
```

### Step 4: Run Setup

```bash
cd "$NEW_FEATURE_REPO"

# Commit the CI/CD files
git add .github/ scripts/ *.md
git commit -m "ci: add CI/CD pipeline"
git push origin main

# Run setup script
./scripts/setup-github-repo.sh
```

### Step 5: Configure GitHub Settings

#### Add Secret (Required)

Go to: `https://github.com/YOUR-ORG/YOUR-FEATURE-REPO/settings/secrets/actions`

Add secret:
- **Name:** `LAD_REPO_TOKEN`
- **Value:** Your GitHub Personal Access Token

#### Configure Branch Protection

Go to: `https://github.com/YOUR-ORG/YOUR-FEATURE-REPO/settings/branches`

Add rule for `main` branch:
- ✅ Require pull request before merging
- ✅ Require status checks to pass before merging
  - Add: `Validate PR / validate`
  - Add: `Security Scan / security-check`
- ✅ Require conversation resolution before merging
- ❌ For solo development: Uncheck "Require approvals"

#### Enable Auto-merge

Go to: `https://github.com/YOUR-ORG/YOUR-FEATURE-REPO/settings`

Under "Pull Requests":
- ✅ Allow auto-merge
- ✅ Automatically delete head branches
- ✅ Allow squash merging
- ❌ Disable merge commits
- ❌ Disable rebase merging

### Step 6: Test the Pipeline

```bash
# Create test branch
git checkout -b test/ci-pipeline

# Make a small change
echo "# Testing CI/CD" >> TEST.md
git add TEST.md
git commit -m "test: verify CI/CD pipeline"

# Push and create PR
git push origin test/ci-pipeline
gh pr create --title "test: CI/CD pipeline" --body "Testing the pipeline"

# Merge (after checks pass)
gh pr merge --squash --delete-branch
```

### Step 7: Verify Sync

After merging, check:
1. ✅ Sync workflow triggered automatically
2. ✅ Files synced to LAD-Backend/develop
3. ✅ Files synced to LAD-Frontend/develop

## 🔧 Customization Options

### Different Branch Names

If your LAD repos use different branch names, update sync-to-main.yml:

```yaml
# Change:
ref: develop
# To your branch name, e.g.:
ref: development
# or
ref: staging
```

### Additional Sync Targets

To sync to more repositories, add another job in sync-to-main.yml:

```yaml
sync-another-repo:
  runs-on: ubuntu-latest
  steps:
    - name: Checkout feature repo
      uses: actions/checkout@v4
    
    - name: Checkout Target Repo
      uses: actions/checkout@v4
      with:
        repository: your-org/target-repo
        token: ${{ secrets.LAD_REPO_TOKEN }}
        path: target-repo
        ref: main
    
    - name: Copy files
      run: |
        mkdir -p target-repo/features/YOUR-FEATURE/
        cp -r backend/* target-repo/features/YOUR-FEATURE/
    
    - name: Commit and push
      working-directory: target-repo
      run: |
        git config user.name "GitHub Actions"
        git config user.email "actions@github.com"
        git add .
        git commit -m "feat: auto-sync from feature repo" || echo "No changes"
        git push origin main
```

### Custom Validation Rules

To add custom validation in pr-validation.yml:

```yaml
- name: Custom Validation
  run: |
    echo "Running custom checks..."
    # Add your validation logic
    npm run lint
    npm run test
    # etc.
```

## 📦 Feature Repository Structure

Your feature repo should follow this structure:

```
your-feature-name/
├── .github/
│   └── workflows/
│       ├── pr-validation.yml
│       ├── auto-merge.yml
│       ├── main-branch-protection.yml
│       └── sync-to-main.yml
├── backend/
│   ├── manifest.js
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── middleware/
├── frontend/
│   ├── sdk/
│   └── components/
├── scripts/
│   ├── setup-github-repo.sh
│   ├── merge-to-backend.sh
│   └── merge-to-frontend.sh
├── README.md
├── CI_CD_GUIDE.md
└── CI_CD_QUICKSTART.md
```

## 🎯 Features Included

All feature repositories will have:
- ✅ Automatic PR validation
- ✅ Security scanning
- ✅ Auto-labeling
- ✅ Auto-merge on approval
- ✅ Post-merge validation
- ✅ Automatic sync to main repos
- ✅ Changelog generation
- ✅ Release tagging

## 📝 Checklist

Use this checklist when setting up a new feature:

- [ ] Copy CI/CD workflow files
- [ ] Update sync-to-main.yml with feature name
- [ ] Update setup-github-repo.sh with repo name
- [ ] Commit and push CI/CD files
- [ ] Add LAD_REPO_TOKEN secret
- [ ] Configure branch protection
- [ ] Enable auto-merge
- [ ] Run setup script
- [ ] Create test PR
- [ ] Verify sync to LAD repos
- [ ] Update README with badges
- [ ] Document feature-specific setup

## 🔗 Related Repositories

- **LAD-Backend**: https://github.com/techiemaya-admin/LAD-Backend
- **LAD-Frontend**: https://github.com/techiemaya-admin/LAD-Frontend
- **Template Feature**: https://github.com/techiemaya-admin/lad-feature-ai-icp-assistant

---

**Need Help?** Refer to the complete [CI_CD_GUIDE.md](CI_CD_GUIDE.md) or open an issue.
