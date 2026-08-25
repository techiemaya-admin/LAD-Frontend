# Web Services Layer

This directory contains **web-specific services only**. Feature-specific services should be imported from the SDK.

## Services Overview

### ✅ Keep (Web-Specific)

- **`api.ts/api.js`** - Base API client with Next.js environment config
- **`authService.ts`** - Authentication & session management (httpOnly cookies)
- **`chatService.ts`** - WebSocket/Socket.io real-time chat integration
- **`userService.ts`** - User management and preferences
- **`userPreferencesService.ts`** - Local storage user preferences
- **`geminiFlashService.ts`** - Gemini AI integration (web-specific)
- **`dashboardService.ts`** - Dashboard aggregation service
- **`leadsService.ts`** - Lead management (verify if SDK exists)
- **`Customer360Service.ts`** - Customer 360 view aggregation

### ❌ Deprecated (Use SDK Instead)

These duplicated SDK functionality. There is no `_deprecated/` folder — all but
one have already been deleted outright:

| Old service | Status | Use instead |
|---|---|---|
| `apolloLeadsService.ts` | deleted | `@lad/frontend-features/apollo-leads` |
| `campaignService.ts` | deleted | `@lad/frontend-features/campaigns` |
| `mayaAIService.ts` | deleted | `@lad/frontend-features/ai-icp-assistant` |
| `pipelineService.ts` | **still present** | `@lad/frontend-features/deals-pipeline` |

`pipelineService.ts` has not been removed yet — it is still imported by
`web/src/features/deals-pipeline/store/action/leadsActions.ts`.

## Import Pattern

```typescript
// ✅ Good: Import features from SDK (named exports — there is no service object)
import { searchCompanies } from '@lad/frontend-features/apollo-leads';
import { useCampaigns } from '@lad/frontend-features/campaigns';

// ✅ Good: Import web-specific services
import { authService } from '@/services/authService';
import { chatService } from '@/services/chatService';

// ❌ Bad: Import feature services from web/services
import pipelineService from '@/services/pipelineService'; // Use SDK!
```

## Architecture Rules

1. **Feature Logic** → SDK (`@lad/frontend-features/*`)
2. **Web Glue** → This directory
3. **Session/Auth** → This directory
4. **Real-time** → This directory (Socket.io, webhooks)
5. **Aggregation** → This directory (multi-feature dashboards)

## Migration Status

- ✅ apollo-leads → SDK
- ✅ campaigns → SDK
- ✅ deals-pipeline → SDK
- ✅ ai-icp-assistant → SDK
- 🔄 voice-agent → SDK (in progress)
