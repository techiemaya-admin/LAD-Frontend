# Fix Summary: Unipile vs Apollo Lead Source Detection

**Issue Date**: 2026-01-18 11:34:25Z  
**Status**: ✅ FIXED  
**Files Modified**: 1  
**Backward Compatible**: Yes  

---

## What Was Wrong ❌

Your logs showed leads being saved with `apolloPersonId` format even when they came from Unipile:

```json
[2026-01-18T11:34:25.522Z] [INFO] [App] [Lead Save] Created new lead in leads table 
{"apolloPersonId":"664c35298863b80001bd30b9","leadId":"0f03c3bd-c166-4c52-90a9-35d43ed3f1b7"}
```

**3 Problems**:
1. All leads saved with `source='apollo_io'` (hardcoded)
2. No detection of `_source` field from your Unipile adapter
3. Only supported Apollo field names (ignored Unipile field names)

---

## What's Fixed ✅

**File**: `/Users/naveenreddy/Desktop/AI-Maya/LAD/backend/features/campaigns/services/LeadSaveService.js`

### Change 1: Source Detection
```javascript
// NOW DETECTS: Is this lead from Unipile or Apollo?
const source = employee._source || 'apollo_io'; // Default for backward compat

// Extract correct ID based on source
if (source === 'unipile') {
  sourceId = employee.id || employee.profile_id;
} else {
  sourceId = employee.apollo_person_id || employee.id;
}
```

### Change 2: Dual Field Name Support
```javascript
const leadData = {
  // Supports BOTH Unipile and Apollo field names
  title: employee.title || employee.job_title || employee.headline,
  email: employee.email || employee.work_email,
  phone: employee.phone || employee.phone_number,
  linkedin_url: employee.linkedin_url || employee.linkedin || 
                employee.profile_url || employee.public_profile_url,
  photo_url: employee.photo_url || employee.profile_picture_url,
  source: source, // ← Track the source
};
```

### Change 3: Dynamic Source Storage
```javascript
// BEFORE (hardcoded Apollo):
await pool.query(..., ['apollo_io', sourceId, ...])

// AFTER (dynamic based on source):
await pool.query(..., [source, sourceId, ...])
```

---

## After Fix: Expected Behavior

### Unipile Leads
```json
{
  "_source": "unipile",
  "id": "1234567890abcdef",
  "name": "John Doe"
}
↓
Saved as:
{
  "source": "unipile",
  "source_id": "1234567890abcdef",
  "log": "[Lead Save] ...{source:'unipile', sourceId:'1234567890abcdef'}"
}
```

### Apollo Leads
```json
{
  "_source": "apollo_io",
  "apollo_person_id": "664c35298863b80001bd30b9",
  "name": "Jane Smith"
}
↓
Saved as:
{
  "source": "apollo_io",
  "source_id": "664c35298863b80001bd30b9",
  "log": "[Lead Save] ...{source:'apollo_io', sourceId:'664c35298863b80001bd30b9'}"
}
```

---

## How to Verify the Fix

### 1. Check Recent Logs (After Restart)
```bash
tail -f backend.log | grep "\[Lead Save\]"
# Look for: {"sourceId":"...","source":"unipile",...}
# NOT:      {"sourceId":"...","source":"apollo_io",...} (for Unipile leads)
```

### 2. Check Database
```sql
SELECT 
  source, 
  COUNT(*) as count,
  COUNT(DISTINCT source_id) as unique_ids
FROM leads
WHERE created_at > NOW() - interval '1 hour'
GROUP BY source;
```

Expected output:
```
 source    | count | unique_ids
-----------+-------+----------
 apollo_io |     5 |        5
 unipile   |    10 |       10  ← If Unipile is being used
```

### 3. Run Test Campaign (with Unipile enabled)
```bash
# When you integrate Unipile into campaign execution:
curl -X POST /api/campaigns/test \
  -H "Authorization: Bearer <JWT>" \
  -d '{
    "search_source": "unipile",
    "keywords": "Director",
    "industry": "Technology"
  }'

# Then check:
SELECT id, name, source FROM campaign_leads 
WHERE campaign_id = '<test_campaign_id>'
LIMIT 5;

# Expected: source='unipile'
```

---

## What Still Needs Doing

### ⚠️ Critical: Campaign Execution Still Uses Apollo

The campaign execution flow (`LeadGenerationService`) still searches **Apollo/database only**. It doesn't call your new `UnipileApolloAdapterService`.

**Current flow**:
```
Campaign → searchEmployeesFromDatabase() → searchEmployees() (Apollo) → LeadSaveService (now fixed)
```

**Needed flow**:
```
Campaign → [Check source preference] → UnipileApolloAdapterService → LeadSaveService (now fixed)
```

**Fix for this**: See `UNIPILE_CAMPAIGN_INTEGRATION_PLAN.md` for step-by-step integration guide.

---

## Files Changed

| File | Changes | Lines |
|------|---------|-------|
| LeadSaveService.js | Source detection, dual field support, dynamic source storage | 28-149 |

## Files to Read

| File | Purpose |
|------|---------|
| `UNIPILE_APOLLO_SOURCE_DETECTION_FIX.md` | Detailed explanation of the fix |
| `UNIPILE_CAMPAIGN_INTEGRATION_PLAN.md` | How to integrate Unipile into campaign execution |
| `UNIPILE_APOLLO_SOURCE_DETECTION_TEST.js` | Test cases and verification steps |

---

## Next Action

**After confirming this fix works:**

1. Integrate Unipile into campaign execution (see `UNIPILE_CAMPAIGN_INTEGRATION_PLAN.md`)
2. Test campaign with Unipile enabled
3. Verify logs show `source: 'unipile'`
4. Verify database has `source='unipile'` for those leads

---

## Backward Compatibility ✅

This fix is **100% backward compatible**:

- ✅ Leads without `_source` field default to `apollo_io`
- ✅ Existing Apollo code paths unchanged
- ✅ Supports both field name formats
- ✅ No database migration needed
- ✅ No breaking changes to API

