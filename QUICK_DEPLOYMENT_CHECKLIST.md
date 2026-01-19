# 🚀 QUICK DEPLOYMENT CHECKLIST

**Status**: ✅ READY FOR PRODUCTION  
**Estimated Time**: 30 minutes  
**Risk Level**: LOW (backward compatible)  

---

## PRE-DEPLOYMENT (5 min)

- [ ] Backup production database
  ```bash
  pg_dump -U postgres -d salesmaya_agent > backup_20260118.sql
  ```

- [ ] Notify team on Slack
- [ ] Get sign-off from tech lead

---

## DEPLOYMENT (10 min)

### Step 1: Database Migration
```bash
psql -U postgres -d salesmaya_agent -f \
  backend/migrations/20260118_add_unipile_campaign_support.sql
```

Verify:
```bash
psql -U postgres -d salesmaya_agent -c \
  "SELECT column_name FROM information_schema.columns 
   WHERE table_name='campaigns' AND column_name='search_source';"
# Should return: search_source
```

### Step 2: Deploy Code
```bash
# Option A: Git push + CI/CD
git add backend/features/campaigns/services/LeadGenerationService.js
git commit -m "feat: integrate Unipile into campaign execution"
git push origin main

# Option B: Manual copy
cp backend/features/campaigns/services/LeadGenerationService.js \
   /opt/lad-backend/features/campaigns/services/LeadGenerationService.js
```

### Step 3: Restart Service
```bash
sudo systemctl restart lad-backend

# Verify startup (wait 10 seconds)
sleep 10
sudo systemctl status lad-backend
# Should show: active (running)
```

---

## POST-DEPLOYMENT (5 min)

### Verify Service is Running
```bash
curl -s http://localhost:3004/api/health | jq .
# Should return: {"status":"ok"}
```

### Check Logs
```bash
tail -50 /var/log/lad-backend.log
# Should NOT show: [ERROR], [FATAL]
```

### Test Campaign Creation
```bash
curl -X POST http://localhost:3004/api/campaigns \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"name":"Test","search_source":"auto"}'
# Should return: 201 (campaign created)
```

---

## MONITORING (24 hours)

```bash
# Every hour, check:
tail -100 /var/log/lad-backend.log | grep -i "campaign execution\|error"

# After 24 hours, verify:
psql -U postgres -d salesmaya_agent -c \
  "SELECT source, COUNT(*) FROM leads 
   WHERE created_at > NOW() - INTERVAL '1 day'
   GROUP BY source;"
# Should show: apollo_io | X
#              unipile   | X (if campaigns configured)
```

---

## ROLLBACK (if needed, < 2 min)

```bash
# Stop service
sudo systemctl stop lad-backend

# Revert code
git revert <commit-hash>
git push origin main

# Or copy old version
cp /opt/lad-backend/backup/LeadGenerationService.js \
   /opt/lad-backend/features/campaigns/services/LeadGenerationService.js

# Restart
sudo systemctl start lad-backend

# Verify
curl http://localhost:3004/api/health | jq .
```

---

## WHAT TO MONITOR

✅ **Good Signs**:
- Logs show "Search configuration"
- "Unipile search successful" (if campaigns configured)
- No error logs
- Campaigns execute as before

⚠️ **Warning Signs**:
- "UnipileApolloAdapterService not found"
- "search_source column does not exist"
- Campaign execution fails
- Increased error rate

---

## SUCCESS CRITERIA

After 24 hours, you should see:

```
✅ Log output shows search configuration
✅ Campaigns with search_source='unipile' show Unipile results
✅ Database has mixed sources (apollo_io and unipile)
✅ No errors in logs
✅ Campaign execution takes 1-5 seconds
✅ Email delivery rate consistent with before
```

---

## TEAM NOTIFICATION

**Slack Message Template**:
```
🚀 DEPLOYMENT: Unipile Campaign Integration
Status: ✅ COMPLETE
Time: [Start] - [End] (EST)
Duration: 30 minutes
Impact: Medium (new feature, backward compatible)

Changes:
- ✅ Campaign execution now supports Unipile lead search
- ✅ Search source configuration per campaign
- ✅ Auto fallback from Unipile to Apollo
- ✅ Database tracks lead source

For campaigns:
- Default: Apollo (search_source='apollo_io') - No changes needed
- Optional: Enable Unipile (search_source='unipile' or 'auto')

Questions? See INTEGRATION_COMPLETE_FINAL_SUMMARY.md
```

---

## QUICK REFERENCE

| Task | Command |
|------|---------|
| Check health | `curl http://localhost:3004/api/health` |
| Check logs | `tail -100 /var/log/lad-backend.log` |
| Check sources | `SELECT source, COUNT(*) FROM leads GROUP BY source;` |
| Create test | `curl -X POST /api/campaigns -d '{"name":"Test"}'` |
| Verify migration | `\d campaigns` (in psql) |
| Restart service | `sudo systemctl restart lad-backend` |
| Stop service | `sudo systemctl stop lad-backend` |
| View status | `sudo systemctl status lad-backend` |

---

## AFTER DEPLOYMENT

1. ✅ Send deployment notification to team
2. ✅ Monitor logs for 24 hours
3. ✅ Verify database has correct sources
4. ✅ Update internal documentation
5. ✅ Plan frontend UI updates
6. ✅ Announce feature to customers

---

## FILES MODIFIED

**Production Code**:
- `backend/features/campaigns/services/LeadGenerationService.js` (+120 lines)
- `backend/features/campaigns/services/LeadSaveService.js` (+65 lines)

**Database**:
- `backend/migrations/20260118_add_unipile_campaign_support.sql` (NEW)

**Documentation** (No production impact):
- Multiple .md files created for reference

---

## QUESTIONS?

See:
- **INTEGRATION_COMPLETE_FINAL_SUMMARY.md** - Full overview
- **DEPLOYMENT_GUIDE_UNIPILE.md** - Detailed deployment guide
- **UNIPILE_CAMPAIGN_INTEGRATION_COMPLETE.md** - Technical details

---

**Ready? Let's deploy! 🚀**
