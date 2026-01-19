# LAD Feature Repository Sandbox Setup Summary

## ✅ Completed Sandboxes

All **7 feature repositories** now have local sandbox environments configured for isolated testing.

### 1️⃣ Campaigns
**Path:** `/Users/naveenreddy/Desktop/AI-Maya/lad-feature-campaigns/`
- ✅ Backend: Full implementation
- ✅ SDK: Complete (api, hooks, types, tests)
- ✅ Sandbox configured
- ✅ SANDBOX_SETUP.md, setup-sandbox.sh, .gitignore

### 2️⃣ AI ICP Assistant
**Path:** `/Users/naveenreddy/Desktop/AI-Maya/lad-feature-ai-icp-assistant/`
- ✅ Backend: Full implementation
- ✅ SDK: Complete
- ✅ Sandbox configured
- ✅ SANDBOX_SETUP.md, setup-sandbox.sh, .gitignore

### 3️⃣ Deals Pipeline
**Path:** `/Users/naveenreddy/Desktop/AI-Maya/lad-feature-deals-pipeline/`
- ✅ Backend: Full implementation
- ✅ SDK: Complete
- ✅ Sandbox configured
- ✅ SANDBOX_SETUP.md, setup-sandbox.sh, .gitignore

### 4️⃣ Apollo Leads
**Path:** `/Users/naveenreddy/Desktop/AI-Maya/lad-feature-apollo-leads/`
- ✅ Backend: Full implementation
- ✅ SDK: Complete
- ✅ Sandbox configured
- ✅ SANDBOX_SETUP.md, setup-sandbox.sh, .gitignore

### 5️⃣ Lead Enrichment
**Path:** `/Users/naveenreddy/Desktop/AI-Maya/lad-feature-lead-enrichment/`
- ✅ Backend: Full implementation
- ⚠️ SDK: Pending implementation
- ✅ Sandbox configured
- ✅ SANDBOX_SETUP.md, setup-sandbox.sh, .gitignore

### 6️⃣ Social Integration
**Path:** `/Users/naveenreddy/Desktop/AI-Maya/lad-feature-social-integration/`
- ✅ Backend: Full implementation
- ⚠️ SDK: Pending implementation
- ✅ Sandbox configured
- ✅ SANDBOX_SETUP.md, setup-sandbox.sh, .gitignore

### 7️⃣ Voice Agent
**Path:** `/Users/naveenreddy/Desktop/AI-Maya/lad-feature-voice-agent/`
- ✅ Backend: Full implementation
- ✅ SDK: Complete
- ✅ Sandbox configured
- ✅ SANDBOX_SETUP.md, setup-sandbox.sh, .gitignore

## 🎯 Sandbox Purpose

Each sandbox provides:
- **Local testing** without committing web code
- **Symlinked access** to LAD main repository
- **Isolation** for feature development
- **Full stack testing** (backend + SDK + web)

## 🚀 Usage

In any feature repository:

```bash
# Initial setup (already done)
./setup-sandbox.sh

# Test SDK
cd sdk && npm test

# Test with web UI
cd lad-sandbox/web && npm run dev

# Test backend
cd lad-sandbox/backend && npm start
```

## 🔐 Critical Rules

1. **LOCAL ONLY** - Sandbox never gets committed
2. **Disposable web code** - Web changes in sandbox don't merge
3. **Merge only** backend/ and sdk/ from feature repos
4. **Gitignored** - lad-sandbox/ already excluded

## 📁 Feature Repository Structure

```
lad-feature-<name>/
├── backend/              ← Feature backend (merges to LAD)
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── manifest.js
├── sdk/                  ← Feature SDK (merges to LAD)
│   ├── api.ts
│   ├── hooks.ts
│   ├── types.ts
│   ├── __tests__/
│   └── README.md
├── lad-sandbox/          ← LOCAL ONLY (never commits)
│   ├── backend/  → symlink to LAD/backend
│   ├── sdk/      → symlink to LAD/frontend/sdk
│   └── web/      → symlink to LAD/frontend/web
├── SANDBOX_SETUP.md      ← Setup documentation
├── setup-sandbox.sh      ← Automation script
└── .gitignore            ← Excludes lad-sandbox/
```

## 🔄 Workflow

1. **Develop** in feature repo (backend/ and sdk/)
2. **Test** using sandbox (lad-sandbox/web for UI)
3. **Validate** with npm test (SDK tests)
4. **Merge** only backend/ and sdk/ to LAD main

## 📚 Documentation

Each feature repo has:
- **SANDBOX_SETUP.md** - Detailed setup and usage guide
- **setup-sandbox.sh** - Automated sandbox creation
- **.gitignore** - Prevents sandbox commits

## 🔧 Troubleshooting

### Symlinks not working?
```bash
# Re-run setup
./setup-sandbox.sh
```

### Changes not reflecting?
- Symlinks are real-time - changes appear immediately
- Restart dev server if needed: `npm run dev`

### Accidentally staged sandbox?
```bash
# Remove from staging
git reset lad-sandbox/

# Verify .gitignore
cat .gitignore | grep lad-sandbox
```

## ✅ Pre-Merge Checklist

Before merging to LAD main:

- [ ] Only backend/ and sdk/ included
- [ ] lad-sandbox/ NOT committed
- [ ] All SDK tests pass
- [ ] No file > 400 lines
- [ ] Feature-prefixed API routes
- [ ] No cross-feature imports
- [ ] Documentation updated
- [ ] No hardcoded secrets

## 📖 Related Documentation

- [Feature Repository Rules](FEATURE_REPOSITORY_RULES.md)
- [LAD Feature Developer Playbook](lad-feature-developer-playbook.md)
- [SDK Template](../frontend/sdk/SDK_TEMPLATE.md)
