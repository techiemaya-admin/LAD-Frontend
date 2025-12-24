# Campaigns Feature SDK

Frontend SDK for the Campaigns feature following LAD standard patterns.

## 📁 Structure

```
sdk/features/campaigns/
├── api.ts              # API functions (feature-prefixed paths: /campaigns/*)
├── hooks.ts            # Re-exports all hooks
├── hooks/              # Domain-specific hooks (split for maintainability)
│   ├── useCampaigns.ts
│   ├── useCampaign.ts
│   ├── useCampaignSteps.ts
│   ├── useCampaignLeads.ts
│   └── useCampaignStats.ts
├── types.ts            # TypeScript type definitions
├── index.ts            # Main exports (already exists)
└── __tests__/
    ├── setup.ts        # Mock API client configuration
    ├── api.test.ts     # API function tests (310+ lines)
    └── hooks.test.ts   # React hook tests (280+ lines)
```

## 🚀 Quick Start

### Import from SDK

```typescript
import {
  useCampaigns,
  useCampaign,
  getCampaign,
  createCampaign,
  type Campaign,
  type CampaignStatus,
} from '@/sdk/features/campaigns';
```

### Basic Usage

```typescript
function CampaignsList() {
  const { campaigns, loading, load } = useCampaigns();

  useEffect(() => {
    load({ status: 'active' });
  }, []);

  return (
    <div>
      {campaigns.map(campaign => (
        <div key={campaign.id}>{campaign.name}</div>
      ))}
    </div>
  );
}
```

## 📚 API Functions

All API paths are feature-prefixed (`/campaigns/*`):

### CRUD Operations
- `getCampaigns(params?)` - List campaigns with optional filters
- `getCampaign(id)` - Get single campaign
- `createCampaign(data)` - Create new campaign
- `updateCampaign(id, data)` - Update campaign
- `deleteCampaign(id)` - Delete campaign

### Actions
- `activateCampaign(id)` - Activate campaign
- `pauseCampaign(id)` - Pause campaign
- `archiveCampaign(id)` - Archive campaign
- `executeCampaign(id, options?)` - Execute campaign workflow

### Steps Management
- `getCampaignSteps(id)` - Get all steps
- `addCampaignStep(id, step)` - Add new step
- `updateCampaignStep(id, stepId, data)` - Update step
- `deleteCampaignStep(id, stepId)` - Delete step

### Leads Management
- `getCampaignLeads(id)` - Get all leads in campaign
- `addLeadsToCampaign(id, data)` - Add multiple leads
- `removeLeadFromCampaign(id, leadId)` - Remove lead
- `getCampaignLeadActivities(id, leadId)` - Get lead activities

### Statistics
- `getCampaignStats()` - Get campaign statistics

## 🪝 React Hooks

### useCampaigns(params?)
Manage campaigns list with filters.

```typescript
const { campaigns, loading, error, load, create, remove } = useCampaigns();

// Load campaigns
await load({ status: 'active', type: 'email' });

// Create campaign
await create({
  name: 'Q1 Outreach',
  type: 'email',
  description: 'Enterprise leads'
});

// Remove campaign
await remove('campaign-id');
```

### useCampaign(campaignId)
Manage single campaign with actions.

```typescript
const { campaign, loading, load, update, activate, pause, archive, execute } = 
  useCampaign('campaign-id');

// Load campaign
await load();

// Update campaign
await update({ name: 'New Name' });

// Campaign actions
await activate();
await pause();
await archive();
await execute({ leadIds: ['lead-1', 'lead-2'] });
```

### useCampaignSteps(campaignId)
Manage campaign steps (auto-sorted by step_order).

```typescript
const { steps, loading, load, add, update, remove } = 
  useCampaignSteps('campaign-id');

// Add step
await add({
  step_order: 1,
  step_type: 'send',
  channel: 'email',
  content: { subject: 'Hello', body: 'World' },
  is_active: true
});

// Update step
await update('step-id', { is_active: false });

// Remove step
await remove('step-id');
```

### useCampaignLeads(campaignId)
Manage leads in campaign.

```typescript
const { leads, loading, load, addLeads, removeLead } = 
  useCampaignLeads('campaign-id');

// Add leads
await addLeads({ leadIds: ['lead-1', 'lead-2'] });

// Remove lead
await removeLead('lead-id');
```

### useCampaignStats()
Get campaign statistics.

```typescript
const { stats, loading, load } = useCampaignStats();

// Load stats
await load();

console.log(stats?.total_campaigns);
console.log(stats?.avg_reply_rate);
```

## 🧪 Testing

### Run Tests

```bash
# Run all SDK tests
npm run test:sdk

# Run campaigns tests only
npm run test:sdk:campaigns

# Watch mode
npm run test:watch
```

### Test Coverage

- **api.test.ts** (310+ lines):
  - 20+ test cases
  - Tests all 18 API functions
  - Validates paths, methods, payloads
  - Tests query parameters

- **hooks.test.ts** (280+ lines):
  - 15+ test cases
  - Tests all 5 hooks
  - Validates state management
  - Tests loading/error states

### Test Structure

All tests follow LAD standards:

1. **Mock Setup** (`__tests__/setup.ts`)
   - Mocks `@/sdk/shared/apiClient`
   - Prevents real backend calls
   - Uses Vitest mocks

2. **API Tests** (`__tests__/api.test.ts`)
   ```typescript
   it('fetches campaigns using feature-prefixed path', async () => {
     (apiClient.get as any).mockResolvedValueOnce({ data: mockCampaigns });
     const result = await getCampaigns();
     expect(apiClient.get).toHaveBeenCalledWith('/campaigns', { params: undefined });
     expect(result).toEqual(mockCampaigns);
   });
   ```

3. **Hook Tests** (`__tests__/hooks.test.ts`)
   ```typescript
   it('loads campaigns via SDK API', async () => {
     vi.spyOn(api, 'getCampaigns').mockResolvedValueOnce(mockCampaigns);
     const { result } = renderHook(() => useCampaigns());
     await act(async () => { await result.current.load(); });
     await waitFor(() => {
       expect(result.current.campaigns.length).toBe(1);
     });
   });
   ```

## 📝 Type Definitions

```typescript
// Campaign Types
type CampaignType = 'email' | 'voice' | 'linkedin' | 'sms' | 'multi-channel';
type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
type LeadStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';

// Main Entities
interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  organization_id: string;
  user_id: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface CampaignStep {
  id: string;
  campaign_id: string;
  step_order: number;
  step_type: 'send' | 'wait' | 'condition';
  channel?: 'email' | 'voice' | 'linkedin' | 'sms';
  content?: Record<string, any>;
  delay_minutes?: number;
  is_active: boolean;
}

interface CampaignLead {
  id: string;
  campaign_id: string;
  lead_id: string;
  status: LeadStatus;
  current_step?: number;
  last_contact_at?: string;
  completed_at?: string;
}
```

## ✅ Standards Compliance

This SDK follows LAD standards:

- ✅ Feature-prefixed API paths (`/campaigns/*`)
- ✅ Shared `apiClient` for all requests
- ✅ Comprehensive TypeScript types
- ✅ React hooks for state management
- ✅ Full test coverage (API + Hooks)
- ✅ Mock-based testing (no real backend calls)
- ✅ Proper error handling
- ✅ Loading states for all async operations

## 🔗 Architecture

### API Client Flow

```
Component → Hook → API Function → apiClient → Backend
                                     ↓
                                  Mock (in tests)
```

### Path Convention

All API calls use feature-prefixed paths:

```typescript
// ✅ Correct
apiClient.get('/campaigns')
apiClient.get('/campaigns/campaign-1')
apiClient.post('/campaigns/campaign-1/activate')

// ❌ Wrong
apiClient.get('/api/campaigns')  // No /api/ prefix
```

### Response Unwrapping

API functions unwrap the response:

```typescript
export async function getCampaign(id: string): Promise<Campaign> {
  const response = await apiClient.get<Campaign>(`/campaigns/${id}`);
  return response.data;  // Unwrap
}
```

## 📖 Usage Examples

### Create Campaign with Steps

```typescript
function CreateCampaignWizard() {
  const { create } = useCampaigns();
  const { add: addStep } = useCampaignSteps(campaignId);

  const handleCreate = async () => {
    // Create campaign
    const campaign = await create({
      name: 'Email Outreach',
      type: 'email',
      description: 'Target enterprise leads'
    });

    // Add steps
    await addStep({
      step_order: 1,
      step_type: 'send',
      channel: 'email',
      content: {
        subject: 'Introduction',
        body: 'Hello {{firstName}}'
      },
      is_active: true
    });

    await addStep({
      step_order: 2,
      step_type: 'wait',
      delay_minutes: 2880, // 2 days
      is_active: true
    });

    await addStep({
      step_order: 3,
      step_type: 'send',
      channel: 'email',
      content: {
        subject: 'Follow-up',
        body: 'Just checking in'
      },
      is_active: true
    });
  };

  return <button onClick={handleCreate}>Create Campaign</button>;
}
```

### Campaign Dashboard

```typescript
function CampaignDashboard() {
  const { stats, load } = useCampaignStats();

  useEffect(() => {
    load();
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h1>Campaign Statistics</h1>
      <div>Total Campaigns: {stats.total_campaigns}</div>
      <div>Active: {stats.active_campaigns}</div>
      <div>Avg Reply Rate: {stats.avg_reply_rate}%</div>
      <div>Avg Open Rate: {stats.avg_open_rate}%</div>
    </div>
  );
}
```

### Campaign Execution

```typescript
function CampaignControl({ campaignId }: { campaignId: string }) {
  const { campaign, activate, pause, execute } = useCampaign(campaignId);

  const handleExecute = async () => {
    const result = await execute();
    console.log(`Processed ${result.processed} leads`);
  };

  return (
    <div>
      <h2>{campaign?.name}</h2>
      <p>Status: {campaign?.status}</p>
      <button onClick={activate}>Activate</button>
      <button onClick={pause}>Pause</button>
      <button onClick={handleExecute}>Execute</button>
    </div>
  );
}
```

## 🚀 Next Steps

1. **Copy to other features**: Apply same pattern to other 6 features
2. **Integration tests**: Add E2E tests with real backend
3. **Performance**: Add caching layer if needed
4. **Documentation**: Add JSDoc comments to all functions

---

**Version:** 2.0.0  
**Last Updated:** January 2025  
**Test Coverage:** API (310 lines) + Hooks (280 lines) = 590+ lines
