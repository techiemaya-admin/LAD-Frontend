# Unipile Integration - Quick Reference

## 🚀 Quick Start

### Search for Leads
```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/search/people \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "accountId": "unipile-123",
    "industry": "SaaS",
    "location": "San Francisco, CA",
    "designation": "Product Manager",
    "limit": 100
  }'
```

### Create Outreach Sequence
```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/outreach/create \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "campaignId": "campaign-123",
    "profileIds": ["profile-1", "profile-2"],
    "accountId": "unipile-123",
    "message": "Hi {{first_name}}, interested in connecting...",
    "dailyLimit": 40,
    "startDate": "2026-01-20"
  }'
```

### Check Sequence Progress
```bash
curl -X GET http://localhost:3004/api/apollo-leads/unipile/outreach/seq-789/status \
  -H "Authorization: Bearer ${JWT_TOKEN}"
```

---

## 📁 File Locations

### Code Files
- `backend/features/apollo-leads/services/UnipileLeadSearchService.js`
- `backend/features/apollo-leads/services/UnipileOutreachSequenceService.js`
- `backend/features/apollo-leads/controllers/UnipileSearchController.js`
- `backend/features/apollo-leads/controllers/UnipileOutreachSequenceController.js`
- `backend/features/apollo-leads/routes/unipile.js`

### Documentation
- `UNIPILE_SEARCH_API.md` - Search API docs
- `UNIPILE_OUTREACH_SEQUENCE_API.md` - Outreach API docs
- `UNIPILE_INTEGRATION_COMPLETE.md` - Overview
- `TECHNICAL_IMPLEMENTATION_SUMMARY.md` - Deep dive
- `IMPLEMENTATION_CHECKLIST.md` - Deployment checklist

---

## ⚙️ Configuration

### Environment Variables
```bash
UNIPILE_DSN=your-unipile-endpoint
UNIPILE_TOKEN=your-unipile-api-key
```

### Cron Job
```bash
*/15 9-18 * * 1-5 curl -X POST http://localhost:3004/api/apollo-leads/unipile/outreach/process \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"accountId":"your-account-id"}'
```

---

## 📊 9 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/unipile/search` | Combined search |
| POST | `/unipile/search/companies` | Search companies |
| POST | `/unipile/search/people` | Search people |
| GET | `/unipile/profile/:id` | Get profile details |
| POST | `/unipile/outreach/create` | Create sequence |
| GET | `/unipile/outreach/pending` | Get today's slots |
| POST | `/unipile/outreach/send` | Send request |
| POST | `/unipile/outreach/process` | Process slots (cron) |
| GET | `/unipile/outreach/:id/status` | Check progress |

---

## 🔒 Rate Limits

- **Daily**: Max 80 requests/day
- **Weekly**: Max 200 requests/week
- **Spacing**: 2-5 seconds between requests
- **Hours**: 9 AM - 6 PM only
- **Days**: Weekdays only (Mon-Fri)

---

## 📖 Full Documentation

See individual markdown files for:
- Complete API specifications
- Request/response examples
- Error handling
- Best practices
- Troubleshooting
- Database schema

---

## ✅ Status

**All Code**: Syntax validated ✅  
**All Features**: Implemented 100% ✅  
**All Documentation**: Complete ✅  
**Ready for Testing**: YES ✅

---
