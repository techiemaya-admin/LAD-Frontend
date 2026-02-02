# Frontend Services - Update Documentation

## Overview

Updated the frontend services to integrate with the enhanced ICP assistant and Apollo leads backend.

## New Services

### 1. **mayaAIService.ts** ✅

**Location:** `src/services/mayaAIService.ts`

**Features:**
- TypeScript with full type definitions
- Chat interface with conversation history
- Action command support (pass search results)
- Conversation reset and history retrieval
- Keyword expansion for better searches
- Error handling with detailed messages

**API Endpoints:**
- `POST /api/ai-icp-assistant/chat` - Main chat endpoint
- `POST /api/ai-icp-assistant/reset` - Reset conversation
- `GET /api/ai-icp-assistant/history` - Get chat history
- `POST /api/ai-icp-assistant/expand-keywords` - Expand keywords

**Usage Example:**
```typescript
import { mayaAIService } from '@/services/mayaAIService';

// Send message
const response = await mayaAIService.chat(
  "Find SaaS companies in Dubai",
  conversationHistory,
  searchResults  // Include for action commands
);

// Handle response
if (response.suggestedParams) {
  // Show "Apply & Search" button
  // User clicks → trigger Apollo search
}

if (response.actionResult) {
  // Handle action result (collect numbers, filter, etc.)
  console.log(`Action: ${response.actionResult.type}`);
  console.log(`Results: ${response.actionResult.count} items`);
}
```

---

### 2. **apolloLeadsService.ts** ✅

**Location:** `src/services/apolloLeadsService.ts`

**Features:**
- Company search with pagination
- Employee/people search
- Phone number resolution
- Contact reveal (email/phone)
- Company enrichment
- Health check
- Search history

**API Endpoints:**
- `POST /api/apollo-leads/search` - Search companies
- `POST /api/apollo-leads/search-employees` - Search employees
- `GET /api/apollo-leads/company/:id` - Get company details
- `GET /api/apollo-leads/company/:id/employees` - Get company employees
- `POST /api/apollo-leads/resolve-phones` - Resolve phone numbers
- `POST /api/apollo-leads/reveal-contact` - Reveal email/phone
- `POST /api/apollo-leads/enrich-company` - Enrich company data
- `GET /api/apollo-leads/health` - Health check

**Usage Example:**
```typescript
import { apolloLeadsService } from '@/services/apolloLeadsService';

// Search companies
const result = await apolloLeadsService.searchLeads({
  query: "SaaS companies",
  location: "Dubai",
  max_results: 100,
  page: 1
});

console.log(`Found ${result.totalFound} companies`);
console.log(`From cache: ${result.fromCache}`);
console.log(`Credits used: ${result.creditsUsed}`);

// Search employees
const employees = await apolloLeadsService.searchEmployees({
  person_titles: ["Office Manager", "CEO"],
  company_keywords: "oil and gas",
  location: "Dubai",
  per_page: 25
});

// Resolve phone numbers
const phones = await apolloLeadsService.resolvePhones(
  companyIds,
  'company'
);

// Reveal contact
const contact = await apolloLeadsService.revealContact(
  employeeId,
  'email'  // or 'phone'
);
```

---

## TypeScript Interfaces

### Maya AI Service Types

```typescript
interface MayaAIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface MayaAISuggestedParams {
  searchType: 'company' | 'employee';
  keywords?: string;
  location?: string;
  companySize?: string;
  revenue?: string;
  jobTitles?: string[];
  personTitles?: string[];
  companyKeywords?: string;
  autoExecute?: boolean;
}

interface MayaAIActionResult {
  type: 'collect_numbers' | 'filter' | 'prepare_calling' | 'search_employees' | 'other';
  data: any[];
  count: number;
}

interface MayaAIChatResponse {
  success: boolean;
  response: string;
  suggestedParams?: MayaAISuggestedParams;
  shouldScrape?: boolean;
  autoSearchExecuted?: boolean;
  actionResult?: MayaAIActionResult;
}
```

### Apollo Leads Service Types

```typescript
interface ApolloCompany {
  id: string;
  apollo_organization_id?: string;
  name: string;
  domain?: string;
  website?: string;
  linkedin_url?: string;
  phone?: string;
  location?: string;
  industry?: string;
  employee_count?: number;
  revenue?: string;
  description?: string;
  logo_url?: string;
  summary?: string;
}

interface ApolloEmployee {
  id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  company_name?: string;
  photo_url?: string;
  revealed?: boolean;
}

interface ApolloSearchResponse {
  companies: ApolloCompany[];
  page: number;
  fromCache: boolean;
  totalFound: number;
  creditsUsed?: number;
}
```

---

## Error Handling

Both services handle errors consistently:

```typescript
try {
  const result = await apolloLeadsService.searchLeads(params);
} catch (error) {
  if (error.message.includes('Insufficient credits')) {
    // Show credit purchase dialog
  } else {
    // Show generic error
  }
}
```

**Common Error Types:**
- `402 Payment Required` - Insufficient credits
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Backend error

---

## Integration with Backend

Both services automatically:
- Retrieve auth token from storage (via `api.js`)
- Include token in `Authorization` header
- Handle response errors
- Format data for UI consumption

**Backend URL Configuration:**
```typescript
// Reads from environment variable
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';
```

---

## Migration from Old Services

### Old mayaAIService.js
```javascript
// OLD
mayaAIService.chat(message, conversationHistory);
```

### New mayaAIService.ts
```typescript
// NEW - with action command support
mayaAIService.chat(message, conversationHistory, searchResults);
```

**Changes:**
- ✅ Added TypeScript types
- ✅ Added `searchResults` parameter for action commands
- ✅ Added action result handling
- ✅ Better error messages
- ✅ Keyword expansion endpoint

---

## Next Steps

1. **Create AI Chat Component** - Use mayaAIService
2. **Update Company Display** - Use apolloLeadsService
3. **Add Contact Reveal UI** - Use revealContact method
4. **Implement Filtering** - Use action results
5. **Add Pagination** - Use page parameter

---

## Testing

```typescript
// Test Maya AI chat
const response = await mayaAIService.chat("Find companies");
console.log('AI Response:', response.response);

// Test Apollo search
const companies = await apolloLeadsService.searchLeads({
  query: "technology",
  location: "Dubai"
});
console.log('Companies:', companies.companies.length);

// Test health check
const health = await apolloLeadsService.checkHealth();
console.log('Apollo Status:', health.status);
```

---

## Benefits

1. **Type Safety** - Full TypeScript support
2. **Action Commands** - Support for collect, filter, call
3. **Better Errors** - Detailed error messages
4. **Credit Handling** - Clear credit requirement messages
5. **Cache Support** - Apollo cache for faster results
6. **Pagination** - Built-in pagination support
7. **Singleton Pattern** - Single instance per service
8. **Consistent API** - Uniform interface across services

---

## Configuration

Add to `.env.local`:
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3004
```

For production:
```bash
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
```

---

## Status

✅ **mayaAIService.ts** - Complete with types
✅ **apolloLeadsService.ts** - Complete with types  
⏳ **AI Chat Component** - Next
⏳ **Company Display Component** - Next
⏳ **Action Handlers** - Next
