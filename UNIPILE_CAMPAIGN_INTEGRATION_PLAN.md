# Next Steps: Integrate Unipile into Campaign Execution

**Current Status**: LeadSaveService now detects and saves both Unipile and Apollo leads correctly  
**Missing Link**: Campaign execution still only searches Apollo/database, not Unipile  
**Goal**: Make campaigns use Unipile as primary source

## Current Flow (Before Integration)

```
Campaign Execution
    ↓
LeadGenerationService.generateLeads()
    ↓
searchEmployeesFromDatabase() [employees_cache]
    ↓ (if insufficient)
searchEmployees() [Apollo API]
    ↓
LeadSaveService.saveLeadsToCampaign()  ← Now with source detection
    ↓
Database: Saves as source='apollo_io'
```

## Target Flow (After Integration)

```
Campaign Execution
    ↓
LeadGenerationService.generateLeads()
    ↓
Check campaign.search_source / feature flag
    ├─ 'unipile': UnipileApolloAdapterService.searchLeadsWithFallback()
    │                ├─ Try: UnipileLeadSearchService (Unipile Classic API)
    │                └─ Fallback: Apollo API
    │
    └─ 'apollo' (default): searchEmployeesFromDatabase() + searchEmployees()
    ↓
LeadSaveService.saveLeadsToCampaign()  ← Auto-detects source from _source field
    ↓
Database: Saves with source='unipile' or 'apollo_io' based on actual source
```

## Integration Steps

### Step 1: Add Source Configuration to Campaign

**File to modify**: `backend/features/campaigns/models/CampaignModel.js` or campaign schema

Add field to campaigns table:
```sql
-- Add to campaigns table
ALTER TABLE campaigns ADD COLUMN search_source VARCHAR(20) DEFAULT 'apollo_io';
-- Valid values: 'apollo_io', 'unipile', 'auto' (try unipile first, fallback to apollo)

-- Or add to campaign_config JSON
UPDATE campaigns SET config = jsonb_set(config, '{search_source}', '"auto"');
```

### Step 2: Modify LeadGenerationService

**File**: `backend/features/campaigns/services/LeadGenerationService.js`

**Location**: Around line 250-280 where search happens

**Current Code**:
```javascript
// Line 255-265: Only searches database and Apollo
const dbSearchResult = await searchEmployeesFromDatabase(...);
employees = dbSearchResult.employees || [];

if (employees.length < dailyLimit && !searchError) {
  const apolloSearchResult = await searchEmployees(...);
  // ...
}
```

**New Code**:
```javascript
const { UnipileApolloAdapterService } = require('../../apollo-leads/services/UnipileApolloAdapterService');

// Get campaign's search source preference
const campaignQuery = await pool.query(
  `SELECT config, search_source FROM ${schema}.campaigns WHERE id = $1`,
  [campaignId]
);
const campaign = campaignQuery.rows[0];
const searchSource = campaign.search_source || 'apollo_io';

logger.info('[Campaign Execution] Using search source', { 
  campaignId, 
  searchSource,
  unipileAccountId: campaign.config?.unipile_account_id 
});

let employees = [];
let fromSource = 'unknown';
let searchError = null;

try {
  if (searchSource === 'unipile' || searchSource === 'auto') {
    // Try Unipile first (if configured)
    if (campaign.config?.unipile_account_id) {
      logger.debug('[Campaign Execution] STEP 1: Trying Unipile API');
      
      const unipileResult = await UnipileApolloAdapterService.searchLeadsWithFallback(
        {
          keywords: searchParams.keywords,
          industry: searchParams.industry,
          location: searchParams.location,
          designation: searchParams.designation,
          company: searchParams.company,
          skills: searchParams.skills,
          limit: dailyLimit,
          offset: offsetInPage,
          accountId: campaign.config.unipile_account_id
        },
        tenantId,
        authToken
      );
      
      if (unipileResult.success && unipileResult.people.length > 0) {
        employees = unipileResult.people.slice(0, dailyLimit);
        fromSource = unipileResult.source; // 'unipile' or 'apollo'
        
        logger.info('[Campaign Execution] Unipile search successful', {
          count: employees.length,
          source: fromSource,
          tried: unipileResult.sources_tried
        });
      } else if (searchSource === 'auto') {
        // Fallback to Apollo if auto mode
        logger.debug('[Campaign Execution] Unipile returned no results, falling back to Apollo');
        searchError = unipileResult.error;
        // Continue to Apollo search below
      } else {
        // Unipile was required but failed
        searchError = unipileResult.error;
      }
    }
  }
  
  // Fallback to Apollo if needed
  if (employees.length < dailyLimit && (searchSource === 'apollo_io' || searchSource === 'auto')) {
    logger.debug('[Campaign Execution] STEP 2: Searching Apollo/Database');
    
    const dbSearchResult = await searchEmployeesFromDatabase(...);
    employees = dbSearchResult.employees || [];
    fromSource = 'database';
    
    if (employees.length < dailyLimit && !searchError) {
      const apolloSearchResult = await searchEmployees(...);
      const apolloEmployees = apolloSearchResult.employees || [];
      
      if (apolloEmployees.length > 0) {
        employees = [...employees, ...apolloEmployees].slice(0, dailyLimit);
        fromSource = 'apollo';
      } else {
        searchError = apolloSearchResult.error;
      }
    }
  }
} catch (searchErr) {
  logger.error('[Campaign Execution] Lead search error', { error: searchErr.message });
  searchError = searchErr.message;
}
```

### Step 3: Update Campaign UI

**File**: `frontend/web/src/pages/CampaignBuilder.js` or similar

Add dropdown for search source:
```jsx
<Select
  label="Lead Source"
  value={campaign.search_source || 'apollo_io'}
  options={[
    { value: 'apollo_io', label: 'Apollo (Default)' },
    { value: 'unipile', label: 'Unipile (Free, Real-time)' },
    { value: 'auto', label: 'Auto (Try Unipile first, fallback to Apollo)' }
  ]}
  onChange={(source) => updateCampaign({ search_source: source })}
/>
```

### Step 4: Add Unipile Account Configuration

**File**: Campaign settings page

Allow users to configure Unipile account:
```jsx
<Input
  label="Unipile Account ID"
  value={campaign.config?.unipile_account_id || 'z6gy_ZSPRBKFw-XYIhgDZQ'}
  placeholder="Account ID from Unipile"
  help="Leave empty to disable Unipile"
  onChange={(id) => updateCampaignConfig('unipile_account_id', id)}
/>
```

## Testing the Integration

### Test 1: Unipile-Only Mode
```bash
# Create test campaign with search_source='unipile'
curl -X POST /api/campaigns \
  -H "Authorization: Bearer <JWT>" \
  -d '{
    "name": "Test Unipile Campaign",
    "search_source": "unipile",
    "filters": {
      "keywords": "Director",
      "industry": "Technology",
      "location": "Dubai"
    }
  }'

# Wait for campaign execution, then check logs
tail -f backend.log | grep "Campaign Execution"
# Should see: "Using search source", "Trying Unipile API", "Unipile search successful"

# Check database
SELECT source, COUNT(*) as count FROM leads WHERE created_at > NOW() - interval '1 hour' GROUP BY source;
# Expected: source='unipile' with count > 0
```

### Test 2: Auto Fallback Mode
```bash
# Create campaign with search_source='auto'
curl -X POST /api/campaigns \
  -H "Authorization: Bearer <JWT>" \
  -d '{
    "name": "Test Auto Campaign",
    "search_source": "auto",
    "filters": { "keywords": "CEO", "industry": "Finance" }
  }'

# If Unipile works: should save as source='unipile'
# If Unipile fails: should fallback to Apollo and save as source='apollo_io'
```

### Test 3: Backward Compatibility
```bash
# Create campaign without search_source (old style)
curl -X POST /api/campaigns \
  -H "Authorization: Bearer <JWT>" \
  -d '{
    "name": "Test Legacy Campaign",
    "filters": { "keywords": "Sales Manager" }
  }'

# Should default to Apollo (source='apollo_io')
SELECT source FROM leads WHERE campaign_id = '<campaign_id>' LIMIT 1;
# Expected: source='apollo_io'
```

## Feature Flags (Optional)

**File**: `backend/config/features.js` or `.env`

Add feature flags for gradual rollout:
```javascript
// config/features.js
module.exports = {
  UNIPILE_ENABLED: process.env.UNIPILE_ENABLED === 'true',
  UNIPILE_DEFAULT: process.env.UNIPILE_DEFAULT === 'true', // Use as default instead of Apollo
  UNIPILE_ACCOUNT_ID: process.env.UNIPILE_ACCOUNT_ID || 'z6gy_ZSPRBKFw-XYIhgDZQ'
};

// Usage in LeadGenerationService:
if (features.UNIPILE_ENABLED && (searchSource === 'unipile' || features.UNIPILE_DEFAULT)) {
  // Try Unipile
}
```

## Monitoring & Logging

After integration, monitor these metrics:

1. **Source Distribution**:
```sql
SELECT source, COUNT(*) as count 
FROM leads 
WHERE created_at > NOW() - interval '7 days'
GROUP BY source
ORDER BY count DESC;
```

2. **Success Rate**:
```sql
SELECT 
  source,
  COUNT(*) as total,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
  ROUND(100.0 * COUNT(CASE WHEN email IS NOT NULL THEN 1 END) / COUNT(*), 1) as email_percentage
FROM leads
WHERE created_at > NOW() - interval '7 days'
GROUP BY source;
```

3. **Campaign Execution Performance**:
```bash
grep -i "Campaign Execution.*search" backend.log | \
  jq -s 'group_by(.source) | map({
    source: .[0].source,
    avg_duration_ms: (map(.duration | tonumber) | add / length)
  })'
```

## Rollout Strategy

1. **Phase 1**: Deploy LeadSaveService changes (already done ✅)
2. **Phase 2**: Deploy LeadGenerationService changes with feature flag disabled
3. **Phase 3**: Enable for internal testing (feature flag = true, but default to Apollo)
4. **Phase 4**: Make Unipile the default for new campaigns (feature flag = true, UNIPILE_DEFAULT = true)
5. **Phase 5**: Full rollout - all campaigns can choose source

## Expected Outcomes

- ✅ Leads from Unipile saved with `source='unipile'`
- ✅ Leads from Apollo saved with `source='apollo_io'`
- ✅ Source field visible in UI, logs, and API responses
- ✅ Better data visibility on lead origins
- ✅ Campaigns can choose primary lead source
- ✅ Automatic fallback to Apollo if Unipile unavailable
