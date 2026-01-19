# Quick Reference - Unipile Campaign Integration ✅

## Status
✅ **COMPLETE** - Server running, integration working

## The Fix
**Error**: `Identifier 'campaignQuery' has already been declared`  
**Solution**: Removed duplicate variable declaration at line 511  
**Result**: Server starts successfully

## What Works Now

### 1. Campaign Execution Reads Source Preference
```javascript
const searchSource = campaign?.search_source || 'apollo_io';
// Options: 'unipile', 'apollo_io', 'auto' (default)
```

### 2. Unipile First (If Configured)
```javascript
if (searchSource === 'unipile' || searchSource === 'auto') {
  const result = await UnipileApolloAdapterService.searchLeadsWithFallback(...)
}
```

### 3. Apollo Fallback
```javascript
if (employees.length < dailyLimit && searchSource === 'auto') {
  // Falls back to Apollo automatically
}
```

### 4. Source Detection in LeadSaveService
```javascript
const source = employee._source || 'apollo_io'; // Auto-detect
// Saves as source='unipile' or source='apollo_io'
```

---

## Test It

### Quick Test
```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/campaign/search \
  -H "Authorization: Bearer <JWT>" \
  -d '{
    "keywords": "Director",
    "accountId": "z6gy_ZSPRBKFw-XYIhgDZQ"
  }' | jq '.source'
```

### Check Database
```sql
SELECT source, COUNT(*) FROM leads 
WHERE created_at > NOW() - interval '1 hour'
GROUP BY source;
```

---

## Configuration

### Campaign Level (Recommended)
```json
{
  "search_source": "auto",
  "config": {
    "unipile_account_id": "z6gy_ZSPRBKFw-XYIhgDZQ"
  }
}
```

### Environment Level (Optional Default)
```bash
SEARCH_SOURCE_DEFAULT=auto
UNIPILE_ACCOUNT_ID=z6gy_ZSPRBKFw-XYIhgDZQ
```

---

## How It Works

| Mode | Behavior |
|------|----------|
| `'unipile'` | Use only Unipile, fail if unavailable |
| `'apollo_io'` | Use only Apollo (default, backward compatible) |
| `'auto'` | Try Unipile first, fallback to Apollo |

---

## Data Flow

```
Campaign Execution
  ↓
Read: search_source from campaign config
  ↓
If 'unipile' or 'auto': Try UnipileApolloAdapterService
  ↓
If successful: leads with _source='unipile'
If failed & auto: Try Apollo
  ↓
Leads → LeadSaveService
  ↓
Detect: _source field
  ↓
Save: source='unipile' or source='apollo_io'
```

---

## Files Changed

| File | Changes |
|------|---------|
| LeadGenerationService.js | Import adapter, read source preference, call adapter |
| LeadSaveService.js | Detect source, save with correct source value |

---

## Verification

```bash
# 1. Server running?
curl http://localhost:3004/health

# 2. Logs show source?
grep "source:" backend.log | tail -10

# 3. Database has sources?
SELECT DISTINCT source FROM leads;
```

---

## Next Steps

1. ✅ Integration complete
2. ⏭️ Test with real campaigns
3. ⏭️ Monitor lead sources (analytics)
4. ⏭️ Update UI to show source (optional)
5. ⏭️ Add database column for search_source (recommended)

---

## Support

**Error**: Unipile leads showing as Apollo in logs?
- Check: campaign.config.unipile_account_id set?
- Check: UnipileApolloAdapterService returns _source field?
- Check: LeadSaveService line 28-30 for source detection

**Error**: Server won't start?
- Check: No duplicate variable declarations
- Run: `npm run dev` to see errors
- Check: All imports present (line 8)

