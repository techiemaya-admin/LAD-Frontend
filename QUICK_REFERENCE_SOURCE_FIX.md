# Quick Reference: Source Detection Fix

## What Changed?
- **File**: LeadSaveService.js (6 sections updated)
- **What**: Now detects Unipile vs Apollo leads and saves with correct source
- **Impact**: Future logs will show source field, database will have correct source

## Before → After

| Aspect | Before | After |
|--------|--------|-------|
| **Source Detection** | Ignored `_source` field | Reads `_source` field |
| **Source Storage** | Always `'apollo_io'` | `'unipile'` or `'apollo_io'` |
| **Unipile Support** | Not supported | Full support |
| **Field Names** | Apollo only | Both Unipile + Apollo |
| **Backward Compat** | N/A | ✅ 100% maintained |

## Code Changes Summary

```javascript
// 1. DETECT SOURCE (NEW)
const source = employee._source || 'apollo_io';

// 2. EXTRACT CORRECT ID (UPDATED)
if (source === 'unipile') {
  sourceId = employee.id || employee.profile_id;
} else {
  sourceId = employee.apollo_person_id || employee.id;
}

// 3. SUPPORT BOTH FIELD FORMATS (UPDATED)
linkedin_url: employee.linkedin_url || employee.profile_url,
photo_url: employee.photo_url || employee.profile_picture_url,

// 4. TRACK SOURCE (NEW)
source: source

// 5. SAVE DYNAMIC SOURCE (UPDATED)
VALUES ($1, $2, source, sourceId, ...)  // Not hardcoded
```

## Log Examples

### Unipile Lead
```
[Lead Save] Successfully saved lead to campaign 
{"sourceId":"abc123def456","source":"unipile",...}
```

### Apollo Lead
```
[Lead Save] Successfully saved lead to campaign 
{"sourceId":"664c35298863b80001bd30b9","source":"apollo_io",...}
```

## Database Query
```sql
-- Check leads by source
SELECT source, COUNT(*) FROM leads 
WHERE created_at > NOW() - interval '1 hour'
GROUP BY source;

-- Expected output:
-- apollo_io | 5
-- unipile   | 10  (when Unipile is integrated)
```

## Test It
```bash
# Check latest lead saves in logs
grep "Successfully saved lead to campaign" backend.log | tail -20 | jq .source

# Should see: "unipile" or "apollo_io" (not just "apollo_io")
```

## ⚠️ Important Note

**This fix handles lead SAVING**. To actually get Unipile leads into campaigns, you still need to:

1. Integrate `UnipileApolloAdapterService` into `LeadGenerationService`
2. See `UNIPILE_CAMPAIGN_INTEGRATION_PLAN.md` for details

**Current state**: 
- ✅ Adapter exists and works
- ✅ LeadSaveService can save Unipile leads correctly
- ❌ Campaign execution doesn't call adapter (still only uses Apollo/database)

## Files to Read
- `LEAD_SOURCE_DETECTION_COMPLETE_REPORT.md` - Full report
- `UNIPILE_APOLLO_SOURCE_DETECTION_FIX.md` - Technical details
- `UNIPILE_CAMPAIGN_INTEGRATION_PLAN.md` - Next steps
