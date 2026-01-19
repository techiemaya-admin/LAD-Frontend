# Unipile Lead & Company Search API

**Date**: 2026-01-18  
**Feature**: Direct LinkedIn search via Unipile integration  
**Status**: Ready for testing

## Overview

Search for companies and leads directly from LinkedIn using Unipile integration, with support for filtering by:
- **Industry** (e.g., "SaaS", "Fintech", "Healthcare")
- **Location** (e.g., "San Francisco", "United States")
- **Designation** (e.g., "Software Engineer", "Product Manager")
- **Company** (specific company name)

This provides an alternative to Apollo's people_api and gives direct access to real LinkedIn data.

---

## API Endpoints

### 1. Combined Search (Companies + Leads)

**Endpoint**: `POST /api/apollo-leads/unipile/search`

Search for both companies and leads in a single request.

**Request**:
```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "accountId": "unipile-account-id-123",
    "industry": "SaaS",
    "location": "San Francisco",
    "designation": "Product Manager",
    "limit": 50
  }'
```

**Response**:
```json
{
  "success": true,
  "companies": [
    {
      "id": "company-123",
      "name": "Acme SaaS Inc",
      "industry": "SaaS",
      "location": "San Francisco",
      "linkedin_url": "https://www.linkedin.com/company/acme-saas-inc"
    }
  ],
  "people": [
    {
      "id": "person-456",
      "name": "John Doe",
      "title": "Product Manager",
      "email": null,
      "linkedin_url": "https://www.linkedin.com/in/john-doe",
      "company_name": "Acme SaaS Inc",
      "industry": "SaaS",
      "location": "San Francisco"
    }
  ],
  "totalCompanies": 5,
  "totalPeople": 23,
  "source": "unipile"
}
```

---

### 2. Search Companies Only

**Endpoint**: `POST /api/apollo-leads/unipile/search/companies`

Search for companies by industry and/or location.

**Request**:
```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/search/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "accountId": "unipile-account-id-123",
    "industry": "Fintech",
    "location": "New York",
    "limit": 20
  }'
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | string | ✅ Yes | Unipile LinkedIn account ID |
| `industry` | string | ⚠️ Either | Industry name (e.g., "SaaS", "Healthcare") |
| `location` | string | ⚠️ Either | Location (e.g., "San Francisco", "US") |
| `limit` | number | ❌ No | Max results (default: 50, max: 100) |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "company-789",
      "name": "Fintech Startup Inc",
      "industry": "Fintech",
      "location": "New York",
      "linkedin_url": "https://www.linkedin.com/company/fintech-startup"
    }
  ],
  "count": 5,
  "source": "unipile"
}
```

---

### 3. Search People (Leads)

**Endpoint**: `POST /api/apollo-leads/unipile/search/people`

Search for individuals by designation, industry, location, or company.

**Request**:
```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/search/people \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "accountId": "unipile-account-id-123",
    "industry": "SaaS",
    "location": "California",
    "designation": "Engineering Manager",
    "company": "TechCorp",
    "limit": 50
  }'
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | string | ✅ Yes | Unipile LinkedIn account ID |
| `industry` | string | ⚠️ One | Industry filter |
| `location` | string | ⚠️ One | Location filter |
| `designation` | string | ⚠️ One | Job title/role |
| `company` | string | ⚠️ One | Company name |
| `limit` | number | ❌ No | Max results (default: 50, max: 100) |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "person-999",
      "name": "Jane Smith",
      "first_name": "Jane",
      "last_name": "Smith",
      "title": "Engineering Manager",
      "email": null,
      "linkedin_url": "https://www.linkedin.com/in/jane-smith",
      "company_name": "TechCorp",
      "industry": "SaaS",
      "location": "San Jose, CA",
      "headline": "Engineering Manager at TechCorp",
      "photo_url": "https://..."
    }
  ],
  "count": 15,
  "source": "unipile"
}
```

---

### 4. Get Profile Details

**Endpoint**: `GET /api/apollo-leads/unipile/profile/:linkedinId`

Get detailed information for a specific LinkedIn profile.

**Request**:
```bash
curl -X GET 'http://localhost:3004/api/apollo-leads/unipile/profile/jane-smith?accountId=unipile-account-id-123' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Parameters**:
| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `linkedinId` | URL path | string | ✅ Yes | LinkedIn username/ID (e.g., "jane-smith") |
| `accountId` | Query | string | ✅ Yes | Unipile LinkedIn account ID |

**Response**:
```json
{
  "success": true,
  "profile": {
    "id": "person-999",
    "name": "Jane Smith",
    "title": "Engineering Manager",
    "company": "TechCorp",
    "location": "San Jose, CA",
    "headline": "Engineering Manager at TechCorp",
    "bio": "...",
    "connections": 500,
    "education": [...],
    "experience": [...]
  },
  "source": "unipile"
}
```

---

## Authentication

All endpoints require:

1. **JWT Token**: Include in Authorization header
   ```
   Authorization: Bearer <jwt_token>
   ```

2. **Unipile Account ID**: Your connected LinkedIn account ID in Unipile system
   - Get this from your LinkedIn integration settings
   - Unipile maps your LinkedIn account to this ID

3. **Tenant Context** (optional): Automatically extracted from JWT, or pass via header
   ```
   X-Tenant-ID: your-tenant-id
   ```

---

## Usage Examples

### Example 1: Find SaaS Product Managers in San Francisco

```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/search/people \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "accountId": "your-unipile-account-id",
    "industry": "SaaS",
    "location": "San Francisco",
    "designation": "Product Manager",
    "limit": 25
  }'
```

### Example 2: Find Fintech Companies in NYC + Their Employees

```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "accountId": "your-unipile-account-id",
    "industry": "Fintech",
    "location": "New York",
    "limit": 50
  }'
```

### Example 3: Find People at a Specific Company

```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/search/people \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "accountId": "your-unipile-account-id",
    "company": "Google",
    "designation": "Software Engineer",
    "limit": 100
  }'
```

---

## Data Format

### Person/Lead Object

```json
{
  "id": "string",                    // LinkedIn profile ID
  "name": "string",                  // Full name
  "first_name": "string",            // First name
  "last_name": "string",             // Last name
  "title": "string",                 // Current job title
  "email": null,                     // LinkedIn doesn't expose via Unipile
  "linkedin_url": "string",          // Full LinkedIn profile URL
  "company_name": "string",          // Current company
  "industry": "string",              // Industry classification
  "location": "string",              // Location/City
  "headline": "string",              // LinkedIn headline
  "photo_url": "string",             // Profile photo URL
  "_unipile_data": {}                // Raw Unipile response
}
```

### Company Object

```json
{
  "id": "string",                    // Company ID
  "name": "string",                  // Company name
  "industry": "string",              // Industry
  "location": "string",              // Headquarters location
  "linkedin_url": "string",          // LinkedIn company page URL
  "employee_count": "number",        // Optional: number of employees
  "founded_year": "number",          // Optional: founding year
  "website": "string"                // Optional: company website
}
```

---

## Error Handling

### Missing Required Fields

```json
{
  "success": false,
  "error": "Missing required field: accountId"
}
```

### Invalid Filters

```json
{
  "success": false,
  "error": "At least one filter required: industry, location, designation, or company"
}
```

### Unipile Connection Error

```json
{
  "success": false,
  "error": "Cannot connect to Unipile API. Please check configuration."
}
```

---

## Rate Limits & Quotas

- **Per Request**: Max 100 results
- **Default Limit**: 50 results
- **Rate Limiting**: Implement as needed based on Unipile API limits
- **Caching**: Results are optionally cached to `employees_cache` table

---

## Caching

Results can be cached to the database for faster future searches:

**Cached Searches**:
- Employees are stored in `employees_cache` table
- `tenant_id` ensures multi-tenancy isolation
- `cached_at` timestamp tracks cache freshness

**Cache Columns**:
```sql
employees_cache:
  - id (primary key)
  - name, title, email, linkedin_url
  - photo_url, headline, city, company_name
  - company_id, company_domain, company_website_url
  - employee_data (JSON: raw Unipile data)
  - tenant_id (for isolation)
  - cached_at (timestamp)
```

---

## Limitations

### Current Limitations

1. **No Email Access**: LinkedIn doesn't expose email addresses via Unipile
   - Use Apollo's `reveal-email` endpoint for email discovery
   - Or integrate with email verification services

2. **LinkedIn API Restrictions**: Search results depend on Unipile/LinkedIn API availability

3. **Rate Limits**: Unipile has rate limits on API calls

4. **Profile Visibility**: Private profiles may not appear in results

### Differences from Apollo

| Feature | Unipile | Apollo |
|---------|---------|--------|
| Data Source | Direct LinkedIn | Apollo database cache |
| Real-time | ✅ Yes | ❌ Cached |
| Email reveals | ❌ No | ✅ Yes (paid) |
| Phone reveals | ❌ No | ✅ Yes (paid) |
| Company data | ✅ Limited | ✅ Rich |
| LinkedIn profile URLs | ✅ Yes | ❌ Constructed |

---

## Integration Guide

### Step 1: Get Unipile Account ID

1. Connect your LinkedIn account in Settings → LinkedIn Integration
2. Unipile will generate an `account_id`
3. This ID is required for all searches

### Step 2: Use Search Endpoints

Make API calls with your `accountId`:

```javascript
const response = await fetch('/api/apollo-leads/unipile/search/people', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    accountId: 'your-unipile-account-id',
    industry: 'SaaS',
    location: 'San Francisco',
    limit: 50
  })
});
```

### Step 3: Save Results as Campaign Leads

Results can be saved directly to campaigns:

```javascript
// After searching, save leads
const { people } = await searchResponse.json();

// Save to campaign
await savePeopleToCampaign(campaignId, people);
```

---

## Architecture

### File Structure

```
backend/features/apollo-leads/
├── services/
│   └── UnipileLeadSearchService.js    # Core search logic
├── controllers/
│   └── UnipileSearchController.js     # API endpoints
├── routes/
│   ├── unipile.js                     # Unipile routes
│   └── index.js                       # Mount unipile routes
└── ...
```

### Service Methods

**UnipileLeadSearchService**:
- `searchCompanies(params)` - Search companies by industry/location
- `searchPeople(params)` - Search individuals by designation/location/company
- `searchCompaniesAndLeads(params)` - Combined search
- `getProfileDetails(profileUrl, accountId)` - Get profile details
- `cacheResults(tenantId, results)` - Cache search results

---

## Testing

### Test Company Search

```bash
POST /api/apollo-leads/unipile/search/companies
{
  "accountId": "test-account-123",
  "industry": "Software",
  "location": "United States",
  "limit": 10
}
```

### Test People Search

```bash
POST /api/apollo-leads/unipile/search/people
{
  "accountId": "test-account-123",
  "industry": "Technology",
  "location": "San Francisco",
  "designation": "Director",
  "limit": 20
}
```

### Test Combined Search

```bash
POST /api/apollo-leads/unipile/search
{
  "accountId": "test-account-123",
  "industry": "FinTech",
  "location": "New York",
  "designation": "CTO"
}
```

---

## Environment Variables

Required in `.env`:

```bash
# Unipile Configuration
UNIPILE_DSN=<your-unipile-api-endpoint>
UNIPILE_TOKEN=<your-unipile-api-token>
```

---

## Related Features

- **Apollo Reveals**: `POST /api/apollo-leads/reveal-email`, `POST /api/apollo-leads/reveal-phone`
- **LinkedIn Campaigns**: Use search results to build LinkedIn outreach campaigns
- **Lead Caching**: Results cached in `employees_cache` for faster future access

---

## Future Enhancements

- [ ] Pagination support for large result sets
- [ ] Saved searches functionality
- [ ] Search history tracking
- [ ] Advanced filters (experience level, skills, etc.)
- [ ] Integration with campaign creation workflow
- [ ] LinkedIn connection request automation via Unipile
- [ ] Profile enrichment with additional data sources
