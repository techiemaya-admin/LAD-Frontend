# LAD Feature Development Checklist

Complete checklist for developing and merging features to LAD.

## Pre-Development

- [ ] Feature repository created
- [ ] Sandbox configured with symlinks
- [ ] Backend structure initialized
- [ ] SDK structure initialized
- [ ] Documentation reviewed

## Development Phase

### Backend
- [ ] Controllers created
- [ ] Models defined
- [ ] Routes implemented
- [ ] Services written
- [ ] Middleware added (if needed)
- [ ] `manifest.js` present
- [ ] All files < 400 lines
- [ ] Feature-prefixed API routes (`/<feature>/*`)
- [ ] No cross-feature imports

### SDK
- [ ] `api.ts` implemented
- [ ] `hooks/` directory with domain-split hooks
- [ ] `types.ts` with all interfaces
- [ ] `index.ts` barrel exports
- [ ] No Next.js imports
- [ ] No JSX/TSX files
- [ ] Framework-independent
- [ ] All files < 400 lines

### Testing
- [ ] Backend tests written
- [ ] SDK tests written (API + hooks)
- [ ] All tests passing locally
- [ ] Test coverage meaningful
- [ ] Edge cases covered

## Pre-Merge Validation

### Architecture Compliance
- [ ] No file exceeds 400 lines
- [ ] Feature isolation maintained
- [ ] API routes feature-prefixed
- [ ] SDK framework-independent
- [ ] No hardcoded secrets
- [ ] Proper error handling

### Documentation
- [ ] README.md updated
- [ ] API endpoints documented
- [ ] Hook usage documented
- [ ] Type definitions clear
- [ ] Migration steps (if applicable)

### Testing Evidence
- [ ] SDK tests pass: `cd frontend/sdk && npm test`
- [ ] Backend tests pass: `cd backend && npm test`
- [ ] Path guard validates: `bash scripts/path-guard.sh`

## Merge Contract

Only the following paths are allowed to be merged into LAD:

✓ `backend/features/<feature>/**`
✓ `frontend/sdk/features/<feature>/**`

The following paths must NEVER be merged:

✗ `frontend/web/**`
✗ `lad-sandbox/**`
✗ `infra/**`
✗ `cloudbuild*`

### Rationale
- **Web code** is UI-only and managed by frontend team
- **Sandbox** is local testing only (never committed)
- **Infrastructure** is managed separately
- **Cloud Build** configs are deployment-specific

## Merge Process

1. **Create PR** from feature repo to LAD `develop` branch
2. **Fill PR template** with all required information
3. **Path guard validates** automatically via GitHub Actions
4. **Tests run** automatically (backend + SDK)
5. **Review** by architecture owner
6. **Merge** only backend/features and sdk/features

## Post-Merge

- [ ] Feature deployed to develop environment
- [ ] Feature flag enabled (if applicable)
- [ ] Integration testing in LAD
- [ ] Documentation updated in LAD
- [ ] Feature repository archived or maintained

## Golden Rules

1. **Backend + SDK = Source of Truth**
2. **Web is visualization only**
3. **No vertical forks**
4. **No client forks**
5. **If breaks isolation → refactor, don't patch**
6. **If unsure → ask before coding**

## Common Pitfalls to Avoid

❌ **Don't:**
- Commit lad-sandbox/
- Add web code to backend/SDK PR
- Import from other features
- Exceed 400-line limit
- Add Next.js to SDK
- Hardcode secrets
- Break feature isolation

✅ **Do:**
- Keep features isolated
- Test thoroughly
- Document clearly
- Follow naming conventions
- Split large files
- Use feature prefixes
- Maintain type safety

## Validation Commands

```bash
# Run all checks locally before PR
cd /path/to/LAD

# Path guard validation
bash scripts/path-guard.sh

# Backend tests
cd backend && npm test

# SDK tests
cd frontend/sdk && npm test

# Check file sizes
find backend/features -name "*.js" -exec wc -l {} \; | awk '$1 > 400 {print}'
find frontend/sdk/features -name "*.ts" -exec wc -l {} \; | awk '$1 > 400 {print}'
```

## Resources

- [Feature Repository Rules](FEATURE_REPOSITORY_RULES.md)
- [LAD Feature Developer Playbook](lad-feature-developer-playbook.md)
- [Feature Repositories Index](FEATURE_REPOSITORIES_INDEX.md)
- [Sandbox Setup Summary](SANDBOX_SETUP_SUMMARY.md)
- [SDK Template](../frontend/sdk/SDK_TEMPLATE.md)

---

**Last Updated:** December 23, 2025
