# Quick Reference - Unipile-Apollo Campaign Search

## 🚀 Quick Start

### 1. Search for Leads
```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/campaign/search \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "Technology",
    "location": "Dubai",
    "designation": "Sales Manager",
    "accountId": "YOUR_UNIPILE_ACCOUNT_ID",
    "limit": 10
  }'
```

### 2. Get Source Information
```bash
curl -X GET http://localhost:3004/api/apollo-leads/unipile/campaign/sources \
  -H "Authorization: Bearer $JWT"
```

### 3. Compare Sources
```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/campaign/compare \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "Technology",
    "location": "Dubai",
    "accountId": "YOUR_UNIPILE_ACCOUNT_ID"
  }'
```

---

## 📋 Files Modified/Created

| File | Type | Changes |
|------|------|---------|
| UnipileApolloAdapterService.js | NEW | Adapter service for dual-source search |
| CampaignUnipileSearchController.js | NEW | Campaign search endpoints |
| UnipileLeadSearchService.js | MODIFIED | Added industry name mapping |
| routes/unipile.js | MODIFIED | Added campaign search routes |

---

## 🔑 Key Features

✅ **Unipile First** - Free, real-time LinkedIn access  
✅ **Apollo Fallback** - Comprehensive data when needed  
✅ **Industry Name Mapping** - Use "Technology" instead of "96"  
✅ **Location Name Mapping** - Use "Dubai" instead of "102927786"  
✅ **Designation Filtering** - Filter by job title  
✅ **Tenant Scoped** - Multi-tenant safe  
✅ **Feature Gated** - Access control enforced  

---

## 🎯 Supported Filters

| Filter | Example | Type |
|--------|---------|------|
| keywords | "Sales Manager" | string |
| industry | "Technology" | name or ID |
| location | "Dubai" | name or ID |
| designation | "Sales Manager" | string |
| company | "Tech Corp" | string |
| skills | "Python, JavaScript" | string |

---

## 📊 Response Structure

```javascript
{
  success: boolean,
  data: [
    {
      id: string,
      name: string,
      title: string,
      location: string,
      linkedin_url: string,
      _source: "unipile" | "apollo",
      _enriched_at: ISO timestamp,
      _from_free_tier: boolean
    }
  ],
  count: number,
  source: "unipile" | "apollo",
  sources_tried: string[],
  pagination: { page, limit, total }
}
```

---

## 🏗️ Architecture

```
Routes (unipile.js)
    ↓
Controller (CampaignUnipileSearchController)
    ↓ Validate tenant + feature access
Service (UnipileApolloAdapterService)
    ↓ Convert params + call sources
Unipile API (Primary) → Apollo API (Fallback)
    ↓
Format response → Return to client
```

---

## ✅ Checklist Before Use

- [ ] Unipile account ID obtained
- [ ] JWT token with tenantId generated
- [ ] User has 'apollo-leads' feature enabled
- [ ] Backend running on port 3004
- [ ] UNIPILE_TOKEN environment variable set
- [ ] UNIPILE_DSN environment variable set

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| 400 "Tenant context required" | Check JWT token contains tenantId |
| 403 "Feature access denied" | Verify user has apollo-leads feature |
| 400 "At least one filter required" | Add keywords, industry, location, etc. |
| Empty results | Try different filters or prefer_source |
| Slow response | Check Unipile API status, switch to Apollo |

---

## 🔗 Related Endpoints

**Existing Unipile Search** (still available):
- `POST /api/apollo-leads/unipile/search/people` - Low-level search
- `POST /api/apollo-leads/unipile/search/companies` - Company search

**New Campaign Search** (recommended):
- `POST /api/apollo-leads/unipile/campaign/search` - Campaign-optimized
- `GET /api/apollo-leads/unipile/campaign/sources` - Source info
- `POST /api/apollo-leads/unipile/campaign/compare` - Compare sources

---

## 💡 Best Practices

1. **Always specify accountId** for Unipile primary source
2. **Use industry names** instead of IDs (more readable)
3. **Start with limit: 10** to test, then increase
4. **Check source** in response to understand data origin
5. **Use compare endpoint** to decide best source for your filters
6. **Preserve _unipile_data** for debugging and future enrichment

---

## 🔄 Integration Pattern

```javascript
// In your campaign creation logic
async function generateCampaignLeads(filters) {
  // Step 1: Search leads
  const response = await fetch('/api/apollo-leads/unipile/campaign/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...filters,
      accountId: process.env.UNIPILE_ACCOUNT_ID,
      limit: 50
    })
  });

  const { success, data, source } = await response.json();

  if (!success) throw new Error('Lead search failed');

  // Step 2: Process results
  const leads = data.map(lead => ({
    name: lead.name,
    title: lead.title,
    linkedin_url: lead.linkedin_url,
    source: lead._source,
    needs_email_reveal: lead.email === null,
    needs_phone_reveal: lead.phone === null
  }));

  return leads;
}
```

---

## 📞 Support

- Check implementation: `UNIPILE_APOLLO_IMPLEMENTATION_COMPLETE.md`
- Read test results: `UNIPILE_APOLLO_TEST_RESULTS.md`
- Review compliance: `ARCHITECTURE_COMPLIANCE_UNIPILE_APOLLO.md`
- See old endpoint: `UNIPILE_REAL_TEST_RESULTS.md`

---

**Last Updated**: January 18, 2026  
**Status**: ✅ Production Ready
