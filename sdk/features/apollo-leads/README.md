# Apollo Leads Feature - Frontend

**Production-Grade Frontend Structure for Apollo.io Integration**

## 📁 Structure

```
sdk/features/apollo-leads/
├── index.ts     # Central export point (barrel)
├── api.ts       # HTTP calls — searchCompanies, getCompanyDetails, revealEmail, …
├── hooks.ts     # useApolloLeads
├── types.ts     # TypeScript definitions
└── README.md    # This file
```

## 🚀 Usage

### Basic Import

```typescript
import {
  searchCompanies,
  useApolloLeads,
  type ApolloCompany,
  type ApolloSearchParams
} from '@lad/frontend-features/apollo-leads';
```

### Using the API Functions

There is no service object — every call is a named export.

```typescript
import {
  searchCompanies,
  getCompanyDetails,
  searchEmployees,
  revealEmail,
  revealPhone
} from '@lad/frontend-features/apollo-leads';

// Search for companies
const results = await searchCompanies({
  query: 'healthcare technology',
  location: 'Dubai',
  limit: 25
});

// Get company details
const company = await getCompanyDetails('comp_123');

// Search employees
const employees = await searchEmployees({
  company_name: 'HealthTech Solutions',
  titles: ['CEO', 'CTO'],
  seniority: ['VP', 'C-Level']
});

// Reveal contact info (costs credits)
const email = await revealEmail('person_123'); // 1 credit
const phone = await revealPhone('person_123'); // 8 credits
```

### Using the Hook

```typescript
import { useApolloLeads } from '@lad/frontend-features/apollo-leads';

function MyComponent() {
  const {
    searchCompanies,
    loading,
    error
  } = useApolloLeads();

  const handleSearch = async () => {
    const results = await searchCompanies({
      query: 'fintech startups',
      location: 'UAE'
    });
    console.log('Found companies:', results);
  };

  return (
    <div>
      <button onClick={handleSearch} disabled={loading}>
        Search
      </button>
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

## 💰 Credit Costs

| Operation | Credits | Description |
|-----------|---------|-------------|
| Company Search | 1 | Search for companies |
| Email Reveal | 1 | Reveal person's email |
| Phone Reveal | 8 | Reveal person's phone |

## 🎯 Feature Tiers

| Tier | Enabled | Credits | Notes |
|------|---------|---------|-------|
| Free | ❌ | 0 | Upgrade required |
| Basic | ❌ | 0 | Upgrade required |
| Premium | ✅ | 1,000 | Full access |
| Enterprise | ✅ | 10,000 | Full access |

## 🔌 Backend Integration

This frontend feature connects to:

```
Backend: /backend/features/apollo-leads/
Endpoints:
  - POST /api/apollo-leads/search
  - GET /api/apollo-leads/leads/:id/email
  - GET /api/apollo-leads/leads/:id/phone
  - GET /api/apollo-leads/health
```

## 📝 TypeScript Support

Full TypeScript definitions included:

```typescript
import type {
  ApolloCompany,
  ApolloPerson,
  ApolloSearchParams,
  ApolloSearchResponse,
  ApolloCredits,
  UseApolloLeadsReturn
} from '@lad/frontend-features/apollo-leads';
```

## 🔒 Authentication

All API calls automatically include JWT authentication:

```typescript
// Token is automatically retrieved from localStorage
const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
headers: {
  'Authorization': `Bearer ${token}`
}
```

## ⚠️ Error Handling

The API functions surface these error scenarios:

```typescript
try {
  await searchCompanies(params);
} catch (error) {
  // 401: Authentication required
  // 402: Insufficient credits
  // 403: Feature not available (upgrade required)
  // 404: Resource not found
  // 500: Server error
  console.error(error.message);
}
```

## 🔄 Migration from Old Structure

The `apolloLeadsService` singleton that used to live at
`web/src/services/apolloLeadsService.ts` was **deleted** during the SDK
restructuring. There is no service object any more — import the named functions.

### Old
```typescript
import { apolloLeadsService } from '@/services/apolloLeadsService';

const results = await apolloLeadsService.searchLeads(params);
```

### New
```typescript
import { searchCompanies } from '@lad/frontend-features/apollo-leads';

const results = await searchCompanies(params);
```

Not every method survived the move under the same name:

| Old method | Replacement |
|---|---|
| `searchLeads` | `searchCompanies` |
| `searchEmployees` | `searchEmployees` |
| `getCompanyDetails` | `getCompanyDetails` |
| `checkHealth` | `checkHealth` |
| `getCompanyEmployees` | `searchEmployees({ company_id })` |
| `resolvePhones` | `getDecisionMakerPhones` — different request **and** response shape |
| `revealContact(id, 'email' \| 'phone')` | split into `revealEmail` / `revealPhone` |
| `enrichCompany` | none |
| `getSearchHistory` | none |

The barrel also adds `searchEmployeesFromDb`, `revealEmailPost`,
`revealPhonePost` and `revealSinglePhone`, which had no pre-migration equivalent.

## 🧪 Testing

### Health Check
```typescript
import { checkHealth } from '@lad/frontend-features/apollo-leads';

const health = await checkHealth();
console.log('Status:', health.status); // 'healthy' | 'degraded' | 'down'
```

### Check Credits

Not exposed on the client yet. `useApolloLeads()` returns only `loading`,
`error`, `clearError` and the API methods — there is no `credits` field and no
`useApolloCredits` hook. Credit exhaustion surfaces as a `402` from the calls
above; handle it there.

## 📚 Related Documentation

- [Backend Apollo Feature](/backend/features/apollo-leads/)
- [Feature Flags Service](/backend/feature_flags/)
- [API Documentation](/backend/features/apollo-leads/routes.js)
- [Testing Guide](/Apollo feature testing)

## 🎯 Roadmap

- [ ] Complete `useApolloSearch` hook
- [ ] Complete `useApolloCredits` hook
- [ ] Create `ApolloCompanyCard` component
- [ ] Create `ApolloEmployeeList` component
- [ ] Add real-time credit updates
- [ ] Add search result caching
- [ ] Add export to CSV functionality
- [ ] Add bulk operations support

## 💡 Best Practices

1. **Expect a 402 on expensive operations**
   There is no client-side credit check today, so guard the call itself.
   ```typescript
   try {
     await revealPhone(personId); // 8 credits
   } catch (error) {
     // 402 -> insufficient credits
   }
   ```

2. **Handle errors gracefully**
   ```typescript
   try {
     await searchCompanies(params);
   } catch (error) {
     if (error.message.includes('Insufficient credits')) {
       // Show upgrade modal
     }
   }
   ```

3. **Use TypeScript types**
   ```typescript
   const params: ApolloSearchParams = {
     query: 'tech startups',
     limit: 50
   };
   ```

4. **Leverage the hook for state management**
   ```typescript
   const { loading, error, clearError } = useApolloLeads();
   ```

---

**Note:** This is part of the production-grade SaaS architecture migration. All new development should use this feature-based structure instead of the old `lad_ui/src/services/` approach.
