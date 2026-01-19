# Pluto v8 Review: Lead Enrichment & Social Integration

## 🔍 Search Results Summary

Searched: `/Users/naveenreddy/Desktop/AI-Maya/Pluto/pluto_v8_deployed/`

### Lead Enrichment

**No dedicated SDK found** - Only references found:
- `pricing/page.tsx:436` - "Lead enrichment" as a feature mention
- `LinkedInIntegration.tsx:688` - "automated lead enrichment and outreach"
- Database table: `company_enrichment` (backend only)

**Conclusion:** 
❌ No frontend SDK implementation for lead enrichment in Pluto
⚠️ Backend table exists but no API layer or React SDK found

### Social Integration

**Partial implementation found:**
- `sts-service/social_media_scraper.py` - YouTube scraper (63KB)
  * B2C keyword detection
  * Video search and comments extraction
  * Lead scoring from social comments
  * Location-based filtering
  
**Key functionality in social_media_scraper.py:**
- YouTube API integration
- Comment analysis for lead intent
- Social profile data extraction
- Multi-platform scraping capability (YouTube primary)

**Conclusion:**
⚠️ Backend Python service exists for social scraping
❌ No frontend SDK/React implementation found
❌ No TypeScript API layer for social features

### Other Services Found

**Existing in lad_ui/src/services/:**
- apolloLeadsService.js - Apollo.io integration ✅
- linkedinLeadsService.js - LinkedIn integration ✅
- leadsService.ts - General leads CRUD ✅
- Customer360Service.ts - Customer view ✅
- pipelineService.ts - Pipeline management ✅

**Missing:**
- leadEnrichmentService.ts ❌
- socialIntegrationService.ts ❌

---

## 📊 Findings

| Feature | Backend | Python Service | Frontend Service | React SDK | Status |
|---------|---------|----------------|------------------|-----------|--------|
| Lead Enrichment | ⚠️ (DB only) | ❌ | ❌ | ❌ | Not Implemented |
| Social Integration | ✅ (scraper) | ✅ | ❌ | ❌ | Backend Only |

---

## ✅ Recommendation

**Both features will be built from scratch following the campaigns SDK template.**

**Lead Enrichment:**
- ✅ Build complete new implementation
- ✅ Design enrichment API from ground up
- ✅ Create backend routes and services
- ✅ Build full SDK with React hooks
- ❌ No code migration from Pluto

**Social Integration:**
- ✅ Build complete new implementation
- ✅ Design social integration API from ground up
- ✅ Create backend routes and services  
- ✅ Build full SDK with React hooks
- ❌ Do NOT reference existing Python scraper
- ❌ No code migration from Pluto

---

## 🚀 Next Steps

### Lead Enrichment (Build From Scratch)

1. **Backend Implementation:**
   - Design enrichment data model
   - Create backend/features/lead-enrichment/
   - Implement controllers, models, routes, services
   - Add manifest.js

2. **SDK Implementation:**
   - Create sdk/features/lead-enrichment/
   - Build api.ts (enrichment API functions)
   - Create hooks/ (React hooks for enrichment)
   - Define types.ts (TypeScript interfaces)
   - Write comprehensive tests

### Social Integration (Build From Scratch)

1. **Backend Implementation:**
   - Design social integration data model
   - Create backend/features/social-integration/
   - Implement controllers, models, routes, services
   - Add manifest.js

2. **SDK Implementation:**
   - Create sdk/features/social-integration/
   - Build api.ts (social API functions)
   - Create hooks/ (React hooks for social features)
   - Define types.ts (TypeScript interfaces)
   - Write comprehensive tests

**Both features must:**
- Follow campaigns SDK template exactly
- Maintain <400 line file limit
- Use feature-prefixed API routes
- Have domain-split hooks
- Include full test coverage
- Work in sandbox environment

