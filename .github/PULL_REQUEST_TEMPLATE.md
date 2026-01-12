## 🔍 Feature PR – LAD

### Feature Name
<!-- e.g. campaigns, deals-pipeline, apollo-leads -->

### Type
- [ ] Backend Feature
- [ ] SDK Enhancement
- [ ] Frontend UI (web only)

### Paths Modified
- [ ] `backend/features/<feature>/**`
- [ ] `frontend/sdk/features/<feature>/**`
- [ ] `frontend/web/**` (UI only – frontend devs)

### Architecture Compliance Checklist

#### File Size & Structure
- [ ] No file exceeds 400 lines
- [ ] Backend feature has `manifest.js`
- [ ] SDK feature has `index.ts`
- [ ] Hooks are domain-split if needed

#### Feature Isolation
- [ ] APIs are feature-prefixed (`/<feature>/*`)
- [ ] No cross-feature imports
- [ ] Feature follows MVC pattern

#### SDK Requirements
- [ ] SDK has no Next.js imports
- [ ] SDK has no JSX/TSX files
- [ ] SDK is framework-independent
- [ ] Types properly exported

#### Testing
- [ ] SDK tests pass (`npm test`)
- [ ] Backend tests pass (`npm test`)
- [ ] All tests have meaningful coverage

#### Forbidden Items
- [ ] No `lad-sandbox/` committed
- [ ] No `frontend/web/` changes (unless frontend dev)
- [ ] No `infra/` or `cloudbuild` changes
- [ ] No `.env.local` or `.env.production` files
- [ ] No hardcoded secrets

### Testing Evidence
<!-- Paste test results or screenshots showing all tests passing -->

```bash
# SDK tests
cd frontend/sdk
npm test

# Backend tests
cd backend
npm test
```

### Migration Steps (if applicable)
<!-- Database migrations, feature flags, or deployment steps needed -->

### Notes
<!-- Any additional context, follow-ups, or breaking changes -->

---

**Path Guard Status:** Will run automatically on PR
**Review Required:** Backend + SDK changes need architecture review
