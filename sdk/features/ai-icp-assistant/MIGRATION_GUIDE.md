# API Centralization Migration Guide

This guide shows how to update the advanced-search-ai/page.tsx to use the new centralized hooks.

## Overview

All API calls from page.tsx have been extracted into dedicated hooks:
- **useLinkedInSearch** - LinkedIn search operations
- **useAIChat** - AI chat interactions
- **useCampaignCreation** - Campaign creation
- **useVoiceAgent** - Voice agent configuration
- **useBilling** - Wallet/billing information

## Benefits

✅ **Separation of Concerns** - API logic separated from UI components
✅ **Reusability** - Hooks can be used in other components
✅ **Testability** - Easier to unit test API logic
✅ **Maintainability** - Centralized API definitions
✅ **Type Safety** - Full TypeScript support with exported types

## Migration Examples

### 1. LinkedIn Search API

**Before (in page.tsx):**
```typescript
// Search intent extraction
const r = await fetch(`${API_BASE}/api/campaigns/linkedin/search/extract-intent`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ query: text }),
});
const intent = await r.json();

// Advanced search
const r = await fetch(`${API_BASE}/api/campaigns/linkedin/search/advanced`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ query: searchQuery, count: leadCount, targeting: ext, icp_description: icpDesc }),
});
const leads = await r.json();
```

**After (using hook):**
```typescript
import { useLinkedInSearch, type LeadTargeting } from '@lad/frontend-features/ai-icp-assistant';

const { extractIntent, search, leads, isLoading, error } = useLinkedInSearch();

// Extract intent
const intent = await extractIntent(userQuery);

// Search with filters
const results = await search(searchQuery, 10, targetingFilters, icpDescription);
```

### 2. AI Chat API

**Before:**
```typescript
const r = await fetch(`${API_BASE}/api/ai-icp-assistant/chat`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ message: prompt }),
});
const response = await r.json();
const aiText = response.message || response.text || '';
```

**After:**
```typescript
import { useAIChat } from '@lad/frontend-features/ai-icp-assistant';

const { sendMessage, messages, isLoading } = useAIChat();

const aiResponse = await sendMessage(userMessage);
// Or for lead-specific chat:
const aiResponse = await sendLeadChatMessage(message, targetingData);
```

### 3. Campaign Creation

**Before:**
```typescript
const res = await fetch(`${API_BASE}/api/campaigns`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
});
const campaign = await res.json();
const campaignId = campaign.data?.id || campaign.id;
```

**After:**
```typescript
import { useCampaignCreation, type CampaignPayload } from '@lad/frontend-features/ai-icp-assistant';

const { createCampaign, campaignId, isLoading } = useCampaignCreation();

const result = await createCampaign(payload);
if (result) {
    const { campaignId, campaign } = result;
    // Use campaign data
}
```

### 4. Voice Agent Configuration

**Before:**
```typescript
const [agentsRes, numbersRes] = await Promise.all([
    fetch(`${API_BASE}/api/voice-agent/user/available-agents`, { headers: headers() }),
    fetch(`${API_BASE}/api/voice-agent/user/available-numbers`, { headers: headers() }),
]);
const agents = await agentsRes.json();
const numbers = await numbersRes.json();
```

**After:**
```typescript
import { useVoiceAgent, type VoiceAgent, type PhoneNumber } from '@lad/frontend-features/ai-icp-assistant';

const { agents, numbers, selectedAgent, selectedNumber, selectAgent, selectNumber } = useVoiceAgent();

// Auto-fetches on mount
// Or manually fetch:
await fetchAll();

// Select specific agent/number
selectAgent(agents[0]);
selectNumber(numbers[0]);
```

### 5. Billing/Wallet Check

**Before:**
```typescript
const r = await fetch(`${API_BASE}/api/billing/wallet`, { headers: headers() });
const wallet = await r.json();
const balance = wallet.balance || 0;
```

**After:**
```typescript
import { useBilling } from '@lad/frontend-features/ai-icp-assistant';

const { wallet, hasSufficientCredits, getAvailableCredits } = useBilling();

// Check wallet
if (hasSufficientCredits(100)) {
    // User has at least 100 credits
}

const credits = getAvailableCredits();
```

## Step-by-Step Migration for page.tsx

1. **Add hook imports at the top:**
   ```typescript
   import {
     useLinkedInSearch,
     useAIChat,
     useCampaignCreation,
     useVoiceAgent,
     useBilling,
     type LeadTargeting,
     type LeadProfile,
     type CampaignPayload,
   } from '@lad/frontend-features/ai-icp-assistant';
   ```

2. **Initialize hooks in component:**
   ```typescript
   export default function AdvancedSearchAI() {
     const linkedInSearch = useLinkedInSearch();
     const aiChat = useAIChat();
     const campaignCreation = useCampaignCreation();
     const voiceAgent = useVoiceAgent(true); // Auto-fetch voice config
     const billing = useBilling(true); // Auto-fetch wallet on mount

     // ... rest of component
   }
   ```

3. **Replace fetch calls:**
   - Search operations → `linkedInSearch.extractIntent()` / `linkedInSearch.search()`
   - Chat operations → `aiChat.sendMessage()` / `aiChat.sendLeadChatMessage()`
   - Campaign operations → `campaignCreation.createCampaign()`
   - Voice config → `voiceAgent.agents` / `voiceAgent.numbers`
   - Wallet check → `billing.wallet` / `billing.hasSufficientCredits()`

4. **Update state management:**
   - Replace local state with hook state
   - Use hook's `isLoading` and `error` properties
   - No need for manual error handling in try/catch

5. **Remove utility functions:**
   - Remove `getToken()` and `headers()` functions (now in hooks)
   - Remove API_BASE if not used elsewhere
   - Clean up unused fetch code

## API Consistency

All hooks follow the same patterns:

### State Pattern
```typescript
{
  isLoading: boolean;      // API call in progress
  error: string | null;    // Error message if failed
  data: any;               // Response data
  [otherState]: any;       // Hook-specific state
}
```

### Action Pattern
```typescript
// All async actions return Promise<T | null>
const result = await hookAction(params);
if (result) {
  // Success
} else {
  // Check hook.error for details
}
```

### Auto-Fetch Pattern
```typescript
// Many hooks support auto-fetch on mount
const hook = useHook(autoFetch: boolean = true);

// You can also manually trigger
await hook.fetchData();
```

## Files Changed

**New Files:**
- `hooks/useLinkedInSearch.ts` - LinkedIn operations
- `hooks/useAIChat.ts` - AI chat operations
- `hooks/useCampaignCreation.ts` - Campaign creation
- `hooks/useVoiceAgent.ts` - Voice agent configuration
- `hooks/useBilling.ts` - Wallet/billing information

**Updated Files:**
- `hooks.ts` - Added new hook exports
- `MIGRATION_GUIDE.md` - This file

**Next Steps (for page.tsx):**
- Update imports to use new hooks
- Replace all fetch calls with hook methods
- Remove utility functions
- Test end-to-end functionality

## Type Safety

All hooks are fully typed with TypeScript. Import types as needed:

```typescript
import {
  type LeadTargeting,
  type LeadProfile,
  type CampaignPayload,
  type VoiceAgent,
  type PhoneNumber,
  type WalletData,
} from '@lad/frontend-features/ai-icp-assistant';
```

## Questions?

- Check individual hook files for detailed comments
- All hooks follow React hook conventions
- Error handling is consistent across all hooks
