# Deployment Guide: Unipile Campaign Integration

**Integration Status**: ✅ COMPLETE AND READY  
**Last Updated**: 2026-01-18  
**Target Environment**: Production  

---

## Pre-Deployment Checklist

- [ ] Code review complete
- [ ] Database migration validated
- [ ] Test environment verified
- [ ] Backup of production database created
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

---

## Deployment Steps

### Step 1: Backup Production Database (5 minutes)
```bash
# Create backup
pg_dump -U postgres -d salesmaya_agent > backup_20260118.sql

# Verify backup
ls -lh backup_20260118.sql
# Should be > 100MB
```

### Step 2: Apply Database Migration (5 minutes)
```bash
# Connect to database
psql -U postgres -d salesmaya_agent

# Run migration
\i backend/migrations/20260118_add_unipile_campaign_support.sql

# Verify columns created
\d campaigns
# Should show: search_source, last_search_source, last_search_count, last_search_at

# Exit
\q
```

### Step 3: Deploy Updated Code (10 minutes)

#### Option A: Git Push (Recommended)
```bash
# In your repository
git add backend/features/campaigns/services/LeadGenerationService.js
git commit -m "feat: integrate Unipile into campaign lead search

- Add UnipileApolloAdapterService to campaign execution
- Support search_source configuration (apollo_io, unipile, auto)
- Implement fallback logic for failed searches
- Maintain backward compatibility"

git push origin main

# Trigger CI/CD deployment (or manual deploy)
```

#### Option B: Manual Deploy
```bash
# Stop backend service
sudo systemctl stop lad-backend

# Copy updated file
cp backend/features/campaigns/services/LeadGenerationService.js \
   /opt/lad-backend/features/campaigns/services/LeadGenerationService.js

# Start backend service
sudo systemctl start lad-backend

# Verify startup
sudo systemctl status lad-backend
```

### Step 4: Verify Deployment (10 minutes)

#### Check Service Health
```bash
# Test API endpoint
curl -s http://localhost:3004/api/health | jq .

# Check logs for errors
tail -100 /var/log/lad-backend.log | grep -i error
```

#### Verify Database
```bash
# Check migration applied
psql -U postgres -d salesmaya_agent -c \
  "SELECT column_name FROM information_schema.columns WHERE table_name='campaigns' AND column_name='search_source';"

# Should return one row: search_source
```

#### Run Basic Test
```bash
# Create test campaign with Unipile
curl -X POST http://localhost:3004/api/campaigns \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Integration Test Campaign",
    "search_source": "auto",
    "config": {"unipile_account_id": "z6gy_ZSPRBKFw-XYIhgDZQ"},
    "filters": {"keywords": "Director"}
  }'

# Check logs for search configuration
tail -50 /var/log/lad-backend.log | grep "Search configuration"
```

---

## Post-Deployment Verification

### 1. Immediate Checks (Day 0)

```bash
# Monitor logs for errors
tail -f /var/log/lad-backend.log | grep -i "campaign execution\|unipile\|error"

# Check campaign execution
# Expected logs:
# - "Search configuration"
# - "STEP 1: Trying Unipile API" (if unipile campaigns exist)
# - "Database search result"
```

### 2. 24-Hour Checks (Day 1)

```sql
-- Check data integrity
SELECT COUNT(*) as total_leads FROM leads WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check source distribution
SELECT source, COUNT(*) FROM leads 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source;

-- Expected: mixture of apollo_io and unipile (if campaigns configured)
```

### 3. Performance Monitoring (Day 1-3)

```bash
# Check search performance
grep "Unipile search\|Apollo returned" /var/log/lad-backend.log | \
  jq 'select(.duration) | {duration, source, count}' | head -50

# Average response time should be:
# - Unipile: 1-2 seconds
# - Apollo: 2-5 seconds
# - Database: <1 second
```

---

## Rollback Procedure

If issues occur:

### Quick Rollback (< 2 minutes)
```bash
# Stop backend
sudo systemctl stop lad-backend

# Revert code
git revert <commit-hash>
git push origin main

# Or manually:
cp /opt/lad-backend/previous/LeadGenerationService.js \
   /opt/lad-backend/features/campaigns/services/LeadGenerationService.js

# Start backend
sudo systemctl start lad-backend

# Verify
curl http://localhost:3004/api/health | jq .
```

### Database Rollback (if needed)
```bash
# Restore from backup
psql -U postgres -d salesmaya_agent < backup_20260118.sql

# Verify
psql -U postgres -d salesmaya_agent -c "SELECT COUNT(*) FROM campaigns;"
```

---

## Configuration for Production

### Environment Variables
Add to `.env` or deployment config:

```bash
# Default search source for all campaigns
SEARCH_SOURCE_DEFAULT=auto

# Global Unipile account (can be overridden per campaign)
UNIPILE_ACCOUNT_ID=z6gy_ZSPRBKFw-XYIhgDZQ

# Feature flag to enable Unipile (optional)
FEATURE_UNIPILE_ENABLED=true

# Logging level (for debugging if needed)
LOG_LEVEL=info
```

### Database Configuration
No additional configuration needed - migration handles schema changes.

---

## Expected Outcomes

### Success Indicators ✅

1. **Logs show proper search flow**:
   ```
   [Campaign Execution] Search configuration {"searchSource":"auto",...}
   [Campaign Execution] STEP 1: Trying Unipile API
   [Campaign Execution] Unipile search successful {"source":"unipile",...}
   ```

2. **Database shows mixed sources**:
   ```sql
   SELECT source, COUNT(*) FROM leads WHERE created_at > NOW() - INTERVAL '1 day' GROUP BY source;
   -- Returns: apollo_io | 5
   --          unipile   | 10  (if Unipile campaigns exist)
   ```

3. **No errors in logs**:
   ```bash
   grep ERROR /var/log/lad-backend.log | wc -l
   # Should be 0 (or very few unrelated errors)
   ```

### Warning Signs ⚠️

1. **Errors in logs**:
   ```
   [ERROR] UnipileApolloAdapterService not found
   [ERROR] search_source column does not exist
   ```
   → **Action**: Check file paths and re-apply migration

2. **No Unipile searches happening**:
   ```
   No logs showing "Trying Unipile API"
   ```
   → **Action**: Check if campaigns have `search_source='unipile'` or `'auto'`

3. **Increased response times**:
   ```
   Search duration > 10 seconds
   ```
   → **Action**: Check Unipile API status, verify network connectivity

---

## Monitoring After Deployment

### Key Metrics to Track

1. **Campaign Execution Success Rate**
   ```sql
   SELECT 
     COUNT(*) as total_executions,
     COUNT(CASE WHEN last_search_count > 0 THEN 1 END) as successful,
     ROUND(100.0 * COUNT(CASE WHEN last_search_count > 0 THEN 1 END) / COUNT(*), 1) as success_rate
   FROM campaigns
   WHERE last_search_at > NOW() - INTERVAL '7 days';
   ```

2. **Lead Source Distribution**
   ```sql
   SELECT source, COUNT(*) as count
   FROM leads
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY source
   ORDER BY count DESC;
   ```

3. **Average Search Duration**
   ```bash
   grep "search successful\|Apollo returned" /var/log/lad-backend.log | \
     jq -s 'map(select(.duration)) | map(.duration) | add / length'
   ```

### Alert Thresholds

Set up alerts for:
- Search failures > 5% per hour
- Average search duration > 5 seconds
- Error rate > 1% per hour
- Unipile API errors > 2 per hour

---

## Communication Plan

### Before Deployment
- [ ] Notify team of deployment window
- [ ] Inform customer success: new feature available
- [ ] Create status page update

### During Deployment
- [ ] Post in #engineering-deploys Slack channel
- [ ] Monitor logs actively
- [ ] Keep rollback team on standby

### After Deployment
- [ ] Send confirmation email to stakeholders
- [ ] Monitor for 24-48 hours
- [ ] Document any issues in postmortem
- [ ] Update release notes

---

## FAQ

**Q: Will this break existing campaigns?**  
A: No. Existing campaigns default to `search_source='apollo_io'` and work exactly as before.

**Q: What if Unipile account ID is not set?**  
A: Campaigns fall back to Apollo/database search automatically.

**Q: Can I roll back easily?**  
A: Yes. Code rollback takes 2 minutes. Database changes are non-breaking.

**Q: What about database performance?**  
A: New columns are indexed, no performance impact expected.

**Q: How do I monitor search performance?**  
A: Check logs for search duration, use SQL views, enable monitoring.

---

## Support Contacts

- **On-call Engineer**: [Name]
- **Database Admin**: [Name]
- **DevOps**: [Name]
- **Slack**: #lad-eng, #lad-urgent

---

## Sign-Off

- [ ] Code Review: ____________________
- [ ] QA Verification: ____________________
- [ ] Product Manager: ____________________
- [ ] Release Manager: ____________________

**Deployment Date**: _________________  
**Deployed By**: _________________  
**Verified By**: _________________  

---

## Post-Deployment Summary

After successful deployment, capture:

- **Deployment Time**: _____
- **Rollback Needed**: Yes / No
- **Issues Encountered**: _____
- **Monitoring Status**: _____
- **Team Sign-off**: _____

