# Sales Intelligence API - Quick Reference

## 🚀 Quick Start

```bash
# 1. Authenticate
TOKEN=$(curl -s -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password123"}' \
  | jq -r '.token')

# 2. Filter posts
curl -X POST http://localhost:3004/api/lead-enrichment/filter-posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "posts": [{"id":1,"text":"At conference in Dubai"}],
    "topic": "business travel, conferences"
  }' | jq

# 3. Generate intelligence
curl -X POST http://localhost:3004/api/lead-enrichment/generate-intelligence \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": {"name":"TechCorp","domain":"techcorp.com"},
    "topic": "SaaS companies"
  }' | jq
```

## 📌 API Endpoints

### 1. Filter Posts
```
POST /api/lead-enrichment/filter-posts
```

**Input**:
```json
{
  "posts": [{"id": 1, "text": "Post content"}],
  "topic": "keywords to filter by",
  "chunkSize": 20
}
```

**Output**:
```json
{
  "success": true,
  "data": [...filtered posts...],
  "metadata": {
    "total_input": 10,
    "total_filtered": 3,
    "filter_rate": "30.0%"
  }
}
```

**Cost**: 0.5 credits

---

### 2. Generate Intelligence
```
POST /api/lead-enrichment/generate-intelligence
```

**Input**:
```json
{
  "company": {
    "name": "Company Name",
    "domain": "company.com",
    "industry": "Industry",
    "location": "Location"
  },
  "topic": "Target ICP description",
  "socialPosts": [...optional filtered posts...]
}
```

**Output**:
```json
{
  "success": true,
  "data": {
    "summary": "Full markdown summary",
    "relevanceScore": 8,
    "companyOverview": "...",
    "businessSignals": "...",
    "recommendedApproach": "..."
  }
}
```

**Cost**: 1 credit

---

## 💡 Common Use Cases

### Use Case 1: LinkedIn Post Analysis
```javascript
// Filter employee posts for travel signals
const travelPosts = await filterPosts({
  posts: linkedinPosts,
  topic: "business travel, conferences, meetings, expansion"
});

// Generate intelligence with travel context
const intel = await generateIntelligence({
  company: targetCompany,
  topic: "companies expanding internationally",
  socialPosts: travelPosts
});

console.log(`${intel.relevanceScore}/10 match`);
console.log(intel.recommendedApproach);
```

### Use Case 2: Industry-Specific Filtering
```javascript
// Filter posts for oil & gas signals
const industryPosts = await filterPosts({
  posts: allPosts,
  topic: "oil and gas, petroleum, energy sector, drilling, UAE, Dubai"
});

// Generate intelligence for energy sector
const intel = await generateIntelligence({
  company: energyCompany,
  topic: "oil and gas equipment suppliers in Middle East",
  socialPosts: industryPosts
});
```

### Use Case 3: Lead Scoring Pipeline
```javascript
async function scoreLeads(companies, topic) {
  const results = [];
  
  for (const company of companies) {
    // Generate intelligence
    const intel = await generateIntelligence({ company, topic });
    
    // Filter by relevance
    if (intel.relevanceScore >= 7) {
      results.push({
        company,
        score: intel.relevanceScore,
        signals: intel.businessSignals,
        approach: intel.recommendedApproach
      });
    }
  }
  
  // Sort by score
  return results.sort((a, b) => b.score - a.score);
}
```

## 🔧 Configuration

### Temperature Settings

| Use Case | Temperature | Why |
|----------|-------------|-----|
| Post Filtering | 0.0 | Consistent, deterministic results |
| Intelligence Generation | 0.7 | Creative analysis and insights |
| Relevance Analysis | 0.3 | Balanced accuracy |

### Chunk Sizes

| Data Size | Recommended Chunk Size |
|-----------|----------------------|
| < 100 posts | 20 (default) |
| 100-500 posts | 30 |
| > 500 posts | 50 |

## 🎯 Best Practices

### 1. **Always Filter Before Intelligence**
```javascript
// ✅ Good: Filter first, then generate intelligence
const filtered = await filterPosts({ posts, topic });
const intel = await generateIntelligence({ company, topic, socialPosts: filtered });

// ❌ Bad: Process all posts without filtering
const intel = await generateIntelligence({ company, topic, socialPosts: allPosts });
```

### 2. **Provide Context in Topic**
```javascript
// ✅ Good: Specific topic with context
topic: "SaaS companies in healthcare with 50-200 employees expanding to Europe"

// ❌ Bad: Generic topic
topic: "SaaS"
```

### 3. **Include Company Details**
```javascript
// ✅ Good: Rich company data
company: {
  name: "HealthTech Solutions",
  domain: "healthtech.com",
  industry: "Healthcare SaaS",
  location: "San Francisco",
  estimated_num_employees: 150,
  short_description: "HIPAA-compliant patient management"
}

// ⚠️ Okay: Minimal data (will auto-scrape website)
company: {
  name: "HealthTech",
  domain: "healthtech.com"
}
```

### 4. **Handle Errors Gracefully**
```javascript
try {
  const intel = await generateIntelligence({ company, topic });
  if (intel.relevanceScore < 5) {
    console.log(`Low match: ${intel.relevanceScore}/10`);
  }
} catch (error) {
  console.error('Intelligence generation failed:', error.message);
  // Fall back to basic analysis
}
```

## 📊 Output Examples

### Post Filtering Output
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "text": "Excited to announce expansion into Dubai market!",
      "caption": "Big news"
    },
    {
      "id": 3,
      "text": "At Middle East Energy Conference this week",
      "caption": "Conference"
    }
  ],
  "metadata": {
    "total_input": 5,
    "total_filtered": 2,
    "filter_rate": "40.0%"
  }
}
```

### Intelligence Summary Output
```json
{
  "summary": "## Company Overview\nPetroTech Solutions...",
  "relevanceScore": 9,
  "companyName": "PetroTech Solutions LLC",
  "companyDomain": "petrotech.ae",
  "companyOverview": "Leading provider of drilling equipment...",
  "relevanceToTarget": "Score: 9/10. Strong alignment with target...",
  "businessSignals": "- Expanding into Dubai\n- Hiring sales team\n- Active at conferences",
  "painPoints": "- Scaling challenges\n- Need logistics optimization",
  "recommendedApproach": "Best timing: After Dubai expansion. Focus on scaling solutions.",
  "generatedAt": "2025-01-15T10:30:00Z"
}
```

## 🐛 Troubleshooting

### Issue: Empty filtered results

**Cause**: Topic too specific or posts not relevant

**Solution**:
```javascript
// Broaden topic keywords
topic: "oil and gas OR energy OR petroleum OR drilling"

// Check filter rate
if (result.metadata.filter_rate === "0.0%") {
  console.log("No relevant posts found - broaden topic");
}
```

### Issue: Low relevance scores

**Cause**: Company doesn't match ICP or insufficient data

**Solution**:
```javascript
// Provide more company context
company: {
  ...company,
  websiteContent: scrapedContent,  // Pre-scrape if possible
  short_description: detailedDescription
}

// Make topic more flexible
topic: "technology companies (SaaS OR enterprise software)"
```

### Issue: Rate limit errors

**Cause**: Too many API calls too quickly

**Solution**:
```javascript
// Add delays between calls
for (const company of companies) {
  const intel = await generateIntelligence({ company, topic });
  await new Promise(r => setTimeout(r, 1000)); // 1s delay
}

// Or use batch endpoint (when available)
```

## 🧪 Testing

### Run Full Test Suite
```bash
bash tests/sales-intelligence-test.sh
```

### Test Individual Endpoints
```bash
# Test filtering
curl -X POST http://localhost:3004/api/lead-enrichment/filter-posts \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"posts":[{"id":1,"text":"Test"}],"topic":"test"}' | jq

# Test intelligence
curl -X POST http://localhost:3004/api/lead-enrichment/generate-intelligence \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"company":{"name":"Test"},"topic":"test"}' | jq

# Check health
curl http://localhost:3004/api/lead-enrichment/health \
  -H "Authorization: Bearer $TOKEN" | jq
```

## 📈 Performance

| Operation | Avg Time | Credits |
|-----------|----------|---------|
| Filter 20 posts | ~2s | 0.5 |
| Filter 100 posts (5 chunks) | ~10s | 0.5 |
| Generate intelligence | ~3-5s | 1.0 |
| With website scraping | ~8-10s | 1.0 |

## 🔗 Related Endpoints

- `POST /api/lead-enrichment/enrich` - Full lead enrichment
- `POST /api/lead-enrichment/analyze-website` - Single website analysis
- `POST /api/ai-icp-assistant/chat` - ICP definition chat
- `POST /api/apollo-leads/search-and-enrich` - Apollo + enrichment

## 📚 Resources

- Full Documentation: `SALES_INTELLIGENCE_MIGRATION.md`
- Test Suite: `tests/sales-intelligence-test.sh`
- Service Code: `backend/features/lead-enrichment/services/CompanyAnalysisService.js`
- Controller: `backend/features/lead-enrichment/controllers/LeadEnrichmentController.js`

---

**Need Help?**
- Check backend logs: `tail -f backend/backend.log`
- Run health check: `curl http://localhost:3004/api/lead-enrichment/health`
- Review test examples: `cat tests/sales-intelligence-test.sh`
