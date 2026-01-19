# Frontend Architecture

## Directory Structure

```
LAD/
├── backend/                    # Node.js backend with feature-based architecture
│   ├── core/                   # Core platform (auth, billing, feature registry)
│   ├── features/               # Feature modules (apollo-leads, ai-icp-assistant)
│   └── shared/                 # Shared utilities (database, middleware)
│
├── frontend/                   # Framework-agnostic feature modules ✨
│   ├── features/
│   │   ├── apollo-leads/       # Apollo lead generation feature
│   │   │   ├── services/       # API services
│   │   │   ├── types/          # TypeScript types
│   │   │   ├── index.ts        # Public API
│   │   │   └── README.md       # Feature documentation
│   │   │
│   │   └── ai-icp-assistant/   # AI ICP assistant feature
│   │       ├── aiICPAssistantService.ts
│   │       ├── index.ts
│   │       └── README.md
│   │
│   └── featureFlags.tsx        # Feature flag client
│
└── lad_ui/                     # Next.js application (thin orchestration layer)
    ├── src/
    │   ├── app/                # Next.js App Router
    │   │   ├── api/            # Next.js API routes (proxies to backend)
    │   │   └── scraper/        # Pages
    │   │
    │   ├── components/         # Next.js-specific UI components
    │   ├── services/           # Service adapters (wrappers for frontend features)
    │   └── utils/              # Next.js utilities
    │
    └── package.json            # Next.js dependencies
```

## Architecture Principles

### 🎯 Separation of Concerns

#### `frontend/` - Feature Modules (Framework-Agnostic)
- **Pure TypeScript/JavaScript** - No framework dependencies
- **Testable** - Easy to unit test without framework setup
- **Reusable** - Can be used in React, Vue, vanilla JS, etc.
- **Type-Safe** - Full TypeScript support with interfaces

**Contains:**
- Service classes (API communication)
- Business logic
- Type definitions
- Data transformations
- Utilities

**Does NOT contain:**
- React hooks (use `useXXX` pattern in lad_ui if needed)
- Next.js-specific code
- Direct DOM manipulation
- Framework components

#### `lad_ui/` - Next.js Application (Orchestration Layer)
- **Thin wrapper** around frontend features
- **Next.js-specific** code only
- **UI components** that use feature services
- **API routes** that proxy to backend

**Contains:**
- Next.js pages and API routes
- React components and hooks
- Service adapters (thin wrappers)
- Next.js configuration
- App-specific state management

## Example: AI ICP Assistant Feature

### Framework-Agnostic Service (`frontend/features/ai-icp-assistant/`)

```typescript
// aiICPAssistantService.ts
export class AIICPAssistantService {
  constructor(private apiClient: any) {}
  
  async chat(message: string): Promise<ChatResponse> {
    const response = await this.apiClient.post('/api/ai-icp-assistant/chat', {
      message
    });
    return response.data;
  }
}

// index.ts
export { AIICPAssistantService, createAIICPAssistantService };
```

### Next.js Adapter (`lad_ui/src/services/mayaAIService.js`)

```javascript
// Thin wrapper that connects feature to Next.js API client
import api from './api';
import { createAIICPAssistantService } from '../../../../frontend/features/ai-icp-assistant';

const aiICPAssistant = createAIICPAssistantService(api);

export const mayaAIService = {
  chat: (message) => aiICPAssistant.chat(message),
  reset: () => aiICPAssistant.reset()
};
```

### Usage in Next.js Component

```javascript
// page.jsx
import { mayaAIService } from '@/services/mayaAIService';

const response = await mayaAIService.chat('Healthcare companies');
```

## Benefits

### ✅ Clean Separation
- Feature logic is framework-independent
- Easy to switch frameworks in the future
- Testing doesn't require Next.js setup

### ✅ Reusability
- Features can be used in multiple applications
- Easy to share code between projects
- Can build feature library/package

### ✅ Maintainability
- Clear boundaries between feature and framework code
- Easier to reason about dependencies
- Simpler testing strategy

### ✅ Type Safety
- Full TypeScript in feature modules
- Type definitions shared across all consumers
- Better IDE support and autocomplete

## Migration Guide

When adding a new feature:

1. **Create feature module in `frontend/features/your-feature/`**
   - Write framework-agnostic service classes
   - Define TypeScript interfaces
   - Add tests (pure TypeScript tests)
   - Document API in README.md

2. **Create adapter in `lad_ui/src/services/`**
   - Import feature from `frontend/features/`
   - Wire up Next.js API client
   - Export compatible interface for existing code

3. **Update components to use adapter**
   - Import from `@/services/yourFeatureService`
   - Use the same API as before (backward compatible)

4. **Add API routes if needed**
   - Create in `lad_ui/src/app/api/`
   - Proxy to backend endpoints
   - Handle Next.js-specific concerns (auth, sessions)

## Best Practices

### DO ✅
- Write feature logic in `frontend/features/`
- Use dependency injection for API clients
- Export clear TypeScript interfaces
- Keep adapters thin (1-2 lines per method)
- Document public APIs

### DON'T ❌
- Put React hooks in feature modules
- Import Next.js in feature modules
- Duplicate business logic in adapters
- Mix framework code with feature logic
- Hardcode API clients in features

## Future Improvements

- [ ] Extract more features to `frontend/features/`
- [ ] Add shared UI component library in `frontend/components/`
- [ ] Create npm package for feature modules
- [ ] Add comprehensive feature tests
- [ ] Build Storybook for feature components
