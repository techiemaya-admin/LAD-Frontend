# Unipile Integration Complete - Search & Outreach

**Date**: 2026-01-18  
**Status**: ✅ Ready for Testing  
**Implementation**: Unipile Search + Outreach Automation

---

## What Was Implemented

### 1. Unipile Lead & Company Search API

**Service**: `UnipileLeadSearchService`  
**Purpose**: Search for companies and leads directly on LinkedIn via Unipile

**Features**:
- ✅ Search companies by industry/location
- ✅ Search people by industry/location/designation/company
- ✅ Combined search (companies + leads)
- ✅ Get detailed profile information
- ✅ Optional caching to database

**Files Created**:
- `/backend/features/apollo-leads/services/UnipileLeadSearchService.js`
- `/backend/features/apollo-leads/controllers/UnipileSearchController.js`
- `/backend/features/apollo-leads/routes/unipile.js` (search routes)
- [UNIPILE_SEARCH_API.md](UNIPILE_SEARCH_API.md) - Complete API documentation

**Endpoints**:
```
POST   /api/apollo-leads/unipile/search                  # Combined search
POST   /api/apollo-leads/unipile/search/companies        # Search companies
POST   /api/apollo-leads/unipile/search/people           # Search leads
GET    /api/apollo-leads/unipile/profile/:linkedinId     # Get profile details
```

---

### 2. Unipile Outreach Sequence API

**Service**: `UnipileOutreachSequenceService`  
**Purpose**: Automate LinkedIn outreach with intelligent scheduling and rate limit compliance

**Features**:
- ✅ Create outreach sequences with automatic scheduling
- ✅ Intelligent sending slot generation (respects working hours, skips weekends)
- ✅ LinkedIn rate limit compliance (80-100/day, 200/week)
- ✅ Relationship-aware sending (invite vs message vs InMail)
- ✅ Convert public IDs to private IDs before sending
- ✅ Human-like timing with random intervals
- ✅ Cron-compatible batch processing
- ✅ Comprehensive status tracking

**Files Created**:
- `/backend/features/apollo-leads/services/UnipileOutreachSequenceService.js`
- `/backend/features/apollo-leads/controllers/UnipileOutreachSequenceController.js`
- `/backend/features/apollo-leads/routes/unipile.js` (outreach routes added)
- [UNIPILE_OUTREACH_SEQUENCE_API.md](UNIPILE_OUTREACH_SEQUENCE_API.md) - Complete API documentation

**Endpoints**:
```
POST   /api/apollo-leads/unipile/outreach/create         # Create sequence
GET    /api/apollo-leads/unipile/outreach/pending        # Get today's slots
POST   /api/apollo-leads/unipile/outreach/send           # Send request manually
POST   /api/apollo-leads/unipile/outreach/process        # Process pending slots
GET    /api/apollo-leads/unipile/outreach/:id/status     # Get sequence status
```

---

## Technical Highlights

### Unipile Best Practices Implemented

✅ **Rate Limit Compliance**
- Respects LinkedIn limits: 80-100 requests/day, 200/week
- Automatic calculation of sequence duration
- Daily limit enforcement with configurable cap

✅ **Intelligent Scheduling**
- Generates sending slots automatically
- Skips weekends (Saturday & Sunday)
- Spreads requests throughout working hours (9 AM - 6 PM)
- Random interval generation (±15 minutes variation)

✅ **ID Conversion**
- Converts public LinkedIn profile IDs to private IDs
- Retrieves profile before sending for verification
- Personalizes messages with profile data

✅ **Relationship Awareness**
- Checks connection status before sending
- Handles 4 relationship states:
  - `NOT_CONNECTED` → Send invitation
  - `CONNECTED` → Send message
  - `PENDING_OUTGOING` → Send message
  - `PENDING_INCOMING` → Accept + message

✅ **Human-Like Behavior**
- Random timing within working hours
- Random delays between API calls (2-5 seconds)
- Mimics natural request patterns

### Architecture

```
Unipile Integration
├── Search APIs
│   ├── searchCompanies(industry, location)
│   ├── searchPeople(industry, location, designation, company)
│   ├── searchCompaniesAndLeads(combined)
│   └── getProfileDetails(profileUrl)
│
├── Outreach APIs
│   ├── createOutreachSequence(profiles, dailyLimit, startDate)
│   ├── getPendingSlotsForToday(accountId)
│   ├── sendConnectionRequest(profile, message)
│   ├── processPendingSlots(cron-triggered)
│   └── getSequenceStatus(sequenceId)
│
└── Database Tables (to be created)
    ├── outreach_sequences
    └── outreach_sending_slots
```

---

## Database Schema Required

### Table: outreach_sequences
```sql
CREATE TABLE outreach_sequences (
  id UUID PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  tenant_id UUID NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  total_profiles INT NOT NULL,
  daily_limit INT NOT NULL,
  estimated_days INT,
  estimated_weeks INT,
  start_date DATE,
  message TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  INDEX (tenant_id, account_id)
);
```

### Table: outreach_sending_slots
```sql
CREATE TABLE outreach_sending_slots (
  id UUID PRIMARY KEY,
  sequence_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  profile_id VARCHAR(500) NOT NULL,
  scheduled_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  day DATE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (sequence_id) REFERENCES outreach_sequences(id),
  INDEX (sequence_id, status),
  INDEX (tenant_id, scheduled_time)
);
```

---

## API Usage Examples

### Example 1: Search + Create Outreach

```bash
# Step 1: Search for SaaS PMs in San Francisco
curl -X POST http://localhost:3004/api/apollo-leads/unipile/search/people \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "accountId": "unipile-123",
    "industry": "SaaS",
    "location": "San Francisco",
    "designation": "Product Manager",
    "limit": 100
  }'

# Step 2: Create outreach sequence for search results
curl -X POST http://localhost:3004/api/apollo-leads/unipile/outreach/create \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "campaignId": "campaign-123",
    "profileIds": ["john-doe", "jane-smith", ...],
    "accountId": "unipile-123",
    "message": "Hi {{first_name}}, I noticed you work at a SaaS company...",
    "dailyLimit": 40,
    "startDate": "2026-01-20"
  }'
```

### Example 2: Monitor & Process Outreach

```bash
# Get pending slots for today
curl -X GET 'http://localhost:3004/api/apollo-leads/unipile/outreach/pending?accountId=unipile-123' \
  -H "Authorization: Bearer ${JWT_TOKEN}"

# Process all pending slots (via cron)
curl -X POST http://localhost:3004/api/apollo-leads/unipile/outreach/process \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{"accountId": "unipile-123"}'

# Check sequence status
curl -X GET http://localhost:3004/api/apollo-leads/unipile/outreach/seq-789/status \
  -H "Authorization: Bearer ${JWT_TOKEN}"
```

---

## File Changes Summary

### New Files Created
1. ✅ `UnipileLeadSearchService.js` - Search logic (280 lines)
2. ✅ `UnipileSearchController.js` - Search API endpoints (170 lines)
3. ✅ `UnipileOutreachSequenceService.js` - Outreach logic (580 lines)
4. ✅ `UnipileOutreachSequenceController.js` - Outreach API endpoints (190 lines)
5. ✅ `unipile.js` (routes) - API route definitions (120 lines)
6. ✅ `UNIPILE_SEARCH_API.md` - Search API documentation (400 lines)
7. ✅ `UNIPILE_OUTREACH_SEQUENCE_API.md` - Outreach documentation (600 lines)

### Modified Files
1. ✅ `apollo-leads/routes/index.js` - Added unipile route mounting
2. ✅ `ApolloCacheSaveService.js` - Added LinkedIn URL construction (previously fixed)

### Total New Code
- **Service Code**: 860 lines
- **Controller Code**: 360 lines
- **Routes**: 120 lines
- **Documentation**: 1000+ lines
- **Total**: ~2,340 lines

---

## Next Steps

### 1. Create Database Tables
```bash
# Run migrations to create outreach_sequences and outreach_sending_slots tables
npm run migrate
```

### 2. Set Environment Variables
```bash
UNIPILE_DSN=your-unipile-api-endpoint
UNIPILE_TOKEN=your-unipile-api-key
```

### 3. Test Search API
```bash
# Test searching for companies
curl -X POST http://localhost:3004/api/apollo-leads/unipile/search/companies \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{"accountId": "test-account", "industry": "SaaS", "limit": 10}'
```

### 4. Test Outreach API
```bash
# Test creating a sequence
curl -X POST http://localhost:3004/api/apollo-leads/unipile/outreach/create \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "campaignId": "test-campaign",
    "profileIds": ["profile-1", "profile-2"],
    "accountId": "test-account",
    "message": "Test message",
    "dailyLimit": 10
  }'
```

### 5. Configure Cron Job
```bash
# Add to crontab to process pending slots every 15 minutes
*/15 9-18 * * 1-5 curl -X POST http://localhost:3004/api/apollo-leads/unipile/outreach/process \
  -H "Authorization: Bearer ${ADMIN_JWT_TOKEN}" \
  -d '{"accountId": "your-account-id"}'
```

### 6. Monitor & Adjust
- Check `/status` endpoints daily
- Monitor success/failure rates
- Adjust `dailyLimit` if hitting LinkedIn rate limits
- Track sequence completion times

---

## Rate Limiting Summary

| Limit | Value | Enforcement |
|-------|-------|-------------|
| Connection requests/day | 80-100 | `dailyLimit` capped at 80 |
| Invitations/week | 200 max | Calculated in sequence duration |
| Profile gathering/day | 1,000 | Search API limit |
| Working hours | 9 AM - 6 PM | Random slot generation |
| Request delay | 2-5 sec | Random between calls |
| Weekend skipping | Yes | Automatic |

---

## Integration Points

### With Campaigns
- Create outreach sequence from campaign leads
- Track which leads received invitations
- Monitor campaign engagement metrics

### With LinkedIn Integration
- Uses Unipile account ID for sending
- Respects LinkedIn checkpoint protection
- Stores results in campaign_leads

### With Apollo API
- Complement to Apollo's people_api
- Use Unipile for free searching
- Use Apollo reveals for email/phone

---

## Troubleshooting

**Q: What if Unipile API is down?**  
A: Service returns error with status `success: false`. Falls back to Apollo or database.

**Q: How long will a sequence with 1,000 profiles take?**  
A: ~5 weeks at 40/day = 25 days spread across 5 weeks (respecting 200/week limit)

**Q: Can I pause and resume a sequence?**  
A: Yes, update sequence status to 'paused' and change back to 'active'

**Q: What if a profile is already connected?**  
A: System detects this and sends a message instead of invitation

**Q: How do I handle LinkedIn checkpoints?**  
A: Pause sequences and solve checkpoint, then resume

---

## Documentation

### API Documentation
- **Search API**: [UNIPILE_SEARCH_API.md](UNIPILE_SEARCH_API.md)
- **Outreach API**: [UNIPILE_OUTREACH_SEQUENCE_API.md](UNIPILE_OUTREACH_SEQUENCE_API.md)

### Implementation Guides
- Search results integration
- Sequence creation workflows
- Cron job setup
- Monitoring dashboards

### Reference
- Unipile best practices followed
- LinkedIn rate limits documented
- Error handling covered
- Database schema provided

---

## Support

For questions about:
- **Search functionality**: See UNIPILE_SEARCH_API.md
- **Outreach sequences**: See UNIPILE_OUTREACH_SEQUENCE_API.md
- **Implementation**: Check endpoint examples
- **Rate limits**: Review rate limiting summary

---

## Version Info

- **Date**: 2026-01-18
- **Unipile Version**: v1 API
- **LinkedIn API**: Current (as of 2026-01-18)
- **Status**: Production ready after testing

---
