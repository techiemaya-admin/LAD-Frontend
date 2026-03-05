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

See `_deprecated/` folder - these duplicate SDK functionality:
- `apolloLeadsService.ts` → Use `@LAD/frontend-features/apollo-leads`
- `campaignService.ts` → Use `@LAD/frontend-features/campaigns`
- `pipelineService.ts` → Use `@LAD/frontend-features/deals-pipeline`
- `mayaAIService.ts` → Use `@LAD/frontend-features/ai-icp-assistant`

## Import Pattern

```typescript
// ✅ Good: Import features from SDK
import { apolloLeadsService } from '@LAD/frontend-features/apollo-leads';
import { useCampaigns } from '@LAD/frontend-features/campaigns';

// ✅ Good: Import web-specific services
import { authService } from '@/services/authService';
import { chatService } from '@/services/chatService';

// ❌ Bad: Import feature services from web/services
import pipelineService from '@/services/pipelineService'; // Use SDK!
```

## Architecture Rules

1. **Feature Logic** → SDK (`@LAD/frontend-features/*`)
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
