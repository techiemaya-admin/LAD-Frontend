# LAD Feature Developer Playbook

## 🎯 Objective

Create feature-specific repositories for LAD that allow **isolated development and testing** without breaking LAD architecture rules.

**CRITICAL:** This repository is NOT a deployable application. It is a development workspace for a single feature.

## 🧱 Repository Scope (Strict)

This feature repository MUST contain only:

### 1️⃣ Backend Feature (Required)
```
backend/features/<feature-name>/
├── controllers/
├── models/
├── middleware/
├── routes/
├── services/
└── manifest.js
```

**Rules:**
- ✅ Feature-based structure
- ✅ No imports outside feature boundary
- ✅ No file > 400 lines
- ✅ Uses LAD shared utilities only
- ✅ Feature-prefixed APIs only (`/api/<feature>/*`)

### 2️⃣ Frontend SDK – Feature Only (Required)
```
frontend/sdk/features/<feature-name>/
├── api.ts
├── hooks.ts
├── hooks/
├── types.ts
├── index.ts
└── __tests__/
```

**Rules:**
- ✅ No Next.js imports
- ✅ No JSX
- ✅ No CSS
- ✅ Hooks + API + types only
- ✅ Must be testable without web
- ✅ Feature-prefixed API paths

### 3️⃣ Local Sandbox (Optional but Allowed)

If local UI testing is needed:

```
lad-sandbox/
├── backend/  → symlink to LAD/backend
├── sdk/      → symlink to LAD/frontend/sdk
└── web/      → symlink to LAD/frontend/web
```

**Rules:**
- ✅ Sandbox is LOCAL ONLY
- ✅ Sandbox is gitignored
- ✅ Sandbox is never committed
- ✅ Web code inside sandbox is disposable

**Setup Instructions:**
```bash
# Run the setup script
./setup-sandbox.sh

# Or see detailed docs
cat SANDBOX_SETUP.md
```
├── backend  → symlink to LAD/backend
├── sdk      → symlink to LAD/frontend/sdk
├── web      → symlink to LAD/frontend/web


Rules:

Sandbox is LOCAL ONLY

Sandbox is gitignored

Sandbox is never committed

Web code inside sandbox is disposable

❌ Repository MUST NOT Contain

❌ Entire LAD backend

❌ Entire LAD frontend

❌ CI/CD configs

❌ Cloud Build files

❌ Infra code

❌ Production .env

❌ Committed frontend/web

🧪 Testing Requirements
Backend

Unit or integration tests inside feature

Mock external services

SDK

Tests inside:

frontend/sdk/features/<feature>/__tests__/


SDK tests must pass without backend running

🔁 Merge Rules (Non-Negotiable)

From this feature repo, ONLY the following are merged into LAD main repo:

backend/features/<feature>/**
frontend/sdk/features/<feature>/**


The following are never merged:

frontend/web/**
lad-sandbox/**

🔐 Golden LAD Rules

Backend + SDK = source of truth

Web is visualization only

No vertical forks

No client forks

If a change breaks isolation → refactor, don’t patch

If unsure → ask before coding

📦 Deliverables from Feature Repo

Backend feature folder

SDK feature folder

README explaining:

Feature purpose

APIs exposed

Dependencies

Migration steps (if any)

🧾 Final Validation Checklist

Before delivery, confirm:

 No file > 400 lines

 APIs are feature-prefixed

 SDK has no framework coupling

 Sandbox is not committed

 Web code is not included

 Feature merges cleanly into LAD

🚨 IMPORTANT

If this feature cannot be merged cleanly into LAD using the above rules,
STOP and redesign before proceeding.