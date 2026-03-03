# Voice Agent SDK

Frontend SDK for the Voice Agent feature following LAD Architecture standards.

## 📁 Structure

```
frontend/sdk/features/voice-agent/
├── index.ts                    # Barrel exports
├── types.ts                    # TypeScript interfaces
├── hooks.ts                    # React Query hooks
└── services/
    ├── api.ts                  # Standalone API client
    └── voiceAgentService.ts    # Voice agent API methods
```

## 🎯 Architecture Compliance

✅ **LAD Standards Met:**
- SDK-first architecture
- No direct HTTP calls in web layer
- Independent of web layer (no circular dependencies)
- Type-safe interfaces
- React Query hooks for state management
- Proper layering separation

## 📦 Dependencies

This SDK requires the following peer dependencies:

```json
{
  "axios": "^1.6.0",
  "@tanstack/react-query": "^5.0.0"
}
```

Install with:
```bash
npm install axios @tanstack/react-query
```

## 🚀 Usage

### Using Hooks (Recommended)

```typescript
import { useVoiceAgents, useMakeCall } from '@/sdk/features/voice-agent';

function MyComponent() {
  // Fetch voice agents
  const { data: agents, isLoading, error } = useVoiceAgents();
  
  // Make a call mutation
  const makeCall = useMakeCall();
  
  const handleCall = () => {
    makeCall.mutate({
      voiceAgentId: '123',
      phoneNumber: '+1234567890',
      context: 'Follow-up call'
    });
  };
  
  return <div>...</div>;
}
```

### Using Service Directly

```typescript
import { voiceAgentService } from '@/sdk/features/voice-agent';

async function fetchAgents() {
  const agents = await voiceAgentService.getVoiceAgents();
  return agents;
}
```

## 🔧 Available Hooks

| Hook | Purpose | Parameters |
|------|---------|------------|
| `useVoiceAgents()` | Fetch all voice agents | - |
| `useCallLogs(agentId?)` | Fetch call logs | Optional agent filter |
| `useCallLog(id)` | Fetch specific call log | Call log ID |
| `useBatchCallLogs(batchId)` | Fetch batch call logs | Batch ID |
| `useTenantPhoneNumbers()` | Fetch tenant phone numbers | - |
| `useUserAvailableNumbers()` | Fetch user's available numbers | - |
| `useMakeCall()` | Initiate a call (mutation) | - |

## 🔑 Authentication

The SDK automatically includes JWT tokens from:
- `localStorage.getItem('authToken')`
- `sessionStorage.getItem('authToken')`

Configure your auth system to store tokens in one of these locations.

## 🌐 API Base URL

Default: `/api`

To customize, modify `services/api.ts`:
```typescript
const api = new APIClient('https://your-api-domain.com/api');
```

## 📊 Query Keys

For advanced React Query usage:
```typescript
import { voiceAgentKeys } from '@/sdk/features/voice-agent';

// Invalidate all voice agent queries
queryClient.invalidateQueries({ queryKey: voiceAgentKeys.all });

// Invalidate specific call logs
queryClient.invalidateQueries({ queryKey: voiceAgentKeys.callLogs() });
```

## 🔒 Security

- All API calls include JWT authentication
- Tenant context handled server-side (no client-side tenant_id)
- RBAC enforced by backend endpoints

## 📝 Type Definitions

```typescript
interface VoiceAgent {
  id: string;
  name: string;
  description?: string;
  voice_id?: string;
  prompt_template?: string;
  created_at: string;
  updated_at: string;
}

interface CallLog {
  id: string;
  voice_agent_id: string;
  phone_number: string;
  status: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no_answer';
  duration?: number;
  recording_url?: string;
  transcript?: string;
  created_at: string;
  updated_at: string;
}
```

See [types.ts](./types.ts) for complete definitions.

## 🧪 Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVoiceAgents } from './hooks';

test('fetches voice agents', async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  const { result } = renderHook(() => useVoiceAgents(), { wrapper });
  
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeDefined();
});
```

## 🚀 Production Deployment

This SDK is production-ready and follows LAD Architecture standards:
- ✅ No web layer dependencies
- ✅ Proper separation of concerns
- ✅ Type-safe interfaces
- ✅ React Query integration
- ✅ Authentication handling
- ✅ Error handling
