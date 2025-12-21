# Campaign Feature - Frontend Migration

## Overview

The campaign feature frontend provides a visual workflow builder for creating multi-channel outreach campaigns with support for LinkedIn, Email, WhatsApp, Instagram, Voice Calls, and more.

## Components

### 1. CampaignList (`/components/campaigns/CampaignList.tsx`)

**Purpose**: Display all campaigns with stats and actions

**Features**:
- Campaign cards with stats (leads, sent, connected, replied)
- Status badges (draft, running, paused, completed, stopped)
- Search and filter by status
- Quick actions (Start/Pause/Stop/Edit/Delete)
- Empty state for new users
- Responsive grid layout

**Usage**:
```tsx
import CampaignList from '@/components/campaigns/CampaignList';

export default function CampaignsPage() {
  return <CampaignList />;
}
```

### 2. CampaignBuilder (`/components/campaigns/CampaignBuilder.tsx`)

**Purpose**: Visual workflow editor for campaign creation

**Features**:
- React Flow canvas for drag-and-drop workflow
- Auto-save campaign name
- Step library sidebar
- Step settings panel
- Node connections with arrows
- Save and Start Campaign buttons
- Load existing campaigns for editing

**Key Props**:
- Uses `useParams()` to get campaign ID from route
- `campaignId === 'new'` creates a new campaign
- Otherwise loads existing campaign

**Usage**:
```tsx
// Route: /campaigns/[id]
import CampaignBuilder from '@/components/campaigns/CampaignBuilder';

export default function CampaignPage() {
  return <CampaignBuilder />;
}
```

### 3. StepLibrary (`/components/campaigns/StepLibrary.tsx`)

**Purpose**: Sidebar with available step types

**Features**:
- Grouped by category (LinkedIn, Email, Voice, etc.)
- Click to add steps to workflow
- Step descriptions
- Icons for each step type

**Props**:
```typescript
interface StepLibraryProps {
  onAddStep: (stepType: StepType) => void;
}
```

### 4. StepSettings (`/components/campaigns/StepSettings.tsx`)

**Purpose**: Configuration panel for selected step

**Features**:
- Dynamic fields based on step type
- Message fields (LinkedIn, Email, WhatsApp, Instagram)
- Delay configuration
- Lead generation filters
- Condition settings
- Voice agent configuration
- Variable substitution support ({{first_name}}, {{company_name}})
- Delete step button

**Props**:
```typescript
interface StepSettingsProps {
  stepType: StepType;
  stepData: any;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  onClose?: () => void;
}
```

## Service Layer

### CampaignService (`/services/campaignService.ts`)

**Purpose**: API integration for campaign management

**Key Methods**:

```typescript
// List campaigns
listCampaigns(params?: {
  search?: string;
  status?: CampaignStatus;
  limit?: number;
  offset?: number;
}): Promise<Campaign[]>

// Get campaign stats
getCampaignStats(): Promise<CampaignStats>

// CRUD operations
getCampaignById(id: string): Promise<Campaign>
createCampaign(payload: CreateCampaignPayload): Promise<Campaign>
updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign>
deleteCampaign(id: string): Promise<void>

// Campaign controls
startCampaign(id: string): Promise<Campaign>
pauseCampaign(id: string): Promise<Campaign>
stopCampaign(id: string): Promise<Campaign>

// Lead management
getCampaignLeads(campaignId: string, params?: {...}): Promise<CampaignLead[]>
addLeadsToCampaign(campaignId: string, leads: any[]): Promise<void>

// Activity tracking
getCampaignActivities(campaignId: string, params?: {...}): Promise<CampaignLeadActivity[]>

// Workflow management
getCampaignSteps(campaignId: string): Promise<CampaignStep[]>
updateCampaignSteps(campaignId: string, steps: Partial<CampaignStep>[]): Promise<CampaignStep[]>

// UI metadata
getStepDefinitions(): Array<{
  type: StepType;
  label: string;
  icon: string;
  description: string;
  category: string;
}>
```

## Types

```typescript
// Step Types (25 total)
type StepType =
  | 'linkedin_visit'
  | 'linkedin_connect'
  | 'linkedin_message'
  | 'linkedin_inmail'
  | 'linkedin_follow'
  | 'linkedin_endorse'
  | 'email_send'
  | 'email_followup'
  | 'whatsapp_message'
  | 'whatsapp_voice'
  | 'instagram_follow'
  | 'instagram_message'
  | 'instagram_comment'
  | 'voice_agent_call'
  | 'delay'
  | 'condition'
  | 'lead_generation'
  | 'webhook'
  | 'tag_add'
  | 'tag_remove'
  | 'list_add'
  | 'list_remove'
  | 'update_field'
  | 'note_add'
  | 'task_create';

// Campaign Status
type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed' | 'stopped';

// Lead Status
type LeadStatus = 'pending' | 'active' | 'completed' | 'stopped' | 'error';

// Activity Status
type ActivityStatus =
  | 'sent'
  | 'delivered'
  | 'connected'
  | 'replied'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed'
  | 'skipped';

// Condition Types (17 total)
type ConditionType =
  | 'connected'
  | 'replied'
  | 'opened'
  | 'clicked'
  | 'not_connected'
  | 'not_replied'
  | 'not_opened'
  | 'answered_call'
  | 'missed_call'
  | 'left_voicemail'
  | 'call_duration_greater'
  | 'call_duration_less'
  | 'sentiment_positive'
  | 'sentiment_negative'
  | 'tag_has'
  | 'tag_not_has'
  | 'field_equals';
```

## Routes

### Frontend Routes

- `/campaigns` - Campaign list page
- `/campaigns/new` - Create new campaign
- `/campaigns/[id]` - Edit existing campaign

### API Endpoints

All endpoints are prefixed with `/api/campaigns`

**Campaign Management**:
- `GET /api/campaigns` - List campaigns
- `GET /api/campaigns/stats` - Get global stats
- `GET /api/campaigns/:id` - Get single campaign
- `POST /api/campaigns` - Create campaign
- `PATCH /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign (soft delete)

**Campaign Controls**:
- `POST /api/campaigns/:id/start` - Start/resume campaign
- `POST /api/campaigns/:id/pause` - Pause campaign
- `POST /api/campaigns/:id/stop` - Stop campaign permanently

**Lead Management**:
- `GET /api/campaigns/:id/leads` - Get campaign leads
- `POST /api/campaigns/:id/leads` - Add leads to campaign

**Activity Tracking**:
- `GET /api/campaigns/:id/activities` - Get campaign activities

**Workflow Management**:
- `GET /api/campaigns/:id/steps` - Get campaign steps
- `POST /api/campaigns/:id/steps` - Update campaign steps

## Workflow

### Creating a Campaign

1. Navigate to `/campaigns`
2. Click "New Campaign" button
3. Enter campaign name
4. Add steps from the library (sidebar)
5. Click on steps to configure settings
6. Steps auto-connect in sequence
7. Click "Save" to create campaign
8. Click "Start Campaign" to begin execution

### Editing a Campaign

1. Navigate to `/campaigns`
2. Click "Edit" icon on a campaign card
3. Modify campaign name, add/remove/reorder steps
4. Click "Save" to update
5. Click "Start Campaign" if status is draft

### Campaign Execution

1. Campaign must be in "running" status
2. Backend scheduler processes campaigns daily
3. Lead generation step fetches leads from Apollo.io
4. Each lead progresses through workflow steps
5. Activities are tracked for analytics
6. Delays pause execution between steps
7. Conditions branch workflow based on lead behavior

## Step Configuration

### Message Steps (LinkedIn, Email, WhatsApp, Instagram)

**Required Fields**:
- `title`: Step name
- `message`: Message content with variable substitution
- `subject`: Email subject (email steps only)

**Variables**: `{{first_name}}`, `{{last_name}}`, `{{company_name}}`

### Delay Step

**Required Fields**:
- `title`: Step name
- `delay`: Delay amount (number)
- `delayUnit`: Unit (minutes, hours, days)

### Lead Generation Step

**Required Fields**:
- `title`: Step name
- `leadsPerDay`: Daily lead limit
- `jobTitles`: Target job titles (comma-separated)
- `industries`: Target industries (comma-separated)
- `companySize`: Company size range
- `locations`: Target locations (comma-separated)

**Backend Processing**:
- Fetches leads from Apollo.io API
- Respects daily limit
- Prevents duplicates (checks apollo_person_id)
- Tracks offset for pagination
- Date-based generation (once per day)

### Condition Step

**Required Fields**:
- `title`: Step name
- `conditionType`: Condition to check (connected, replied, opened, etc.)
- `waitDuration`: How long to wait for condition (minutes)

**Backend Processing**:
- Checks activity history for condition
- Waits up to specified duration
- Proceeds only if condition is met
- Can branch workflow based on result

### Voice Agent Step

**Required Fields**:
- `title`: Step name
- `agentId`: VAPI agent ID
- `callDuration`: Max call duration (minutes)

**Backend Processing**:
- Makes outbound call via VAPI
- Records call outcome
- Tracks call duration and sentiment
- Updates lead status based on result

## State Management

### React Flow State

The campaign builder uses React Flow's built-in state management:

```typescript
const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
const [edges, setEdges, onEdgesChange] = useEdgesState([]);
```

**Node Structure**:
```typescript
interface FlowNode extends Node {
  id: string;
  type: 'default';
  position: { x: number; y: number };
  data: {
    label: string;
    stepType: StepType;
    stepData: any;
    order: number;
  };
}
```

**Edge Structure**:
```typescript
interface Edge {
  id: string;
  source: string; // source node id
  target: string; // target node id
  markerEnd: { type: MarkerType.ArrowClosed };
}
```

### Component State

**CampaignList**:
- `campaigns`: Campaign[] - List of campaigns
- `loading`: boolean - Loading state
- `searchTerm`: string - Search filter
- `statusFilter`: CampaignStatus | 'all' - Status filter
- `actionLoading`: string | null - ID of campaign being acted upon

**CampaignBuilder**:
- `campaign`: Campaign | null - Current campaign
- `campaignName`: string - Campaign name
- `loading`: boolean - Loading state
- `saving`: boolean - Saving state
- `selectedNode`: FlowNode | null - Selected step for settings

**StepSettings**:
- `formData`: any - Current step configuration

## Dependencies

### NPM Packages

- `reactflow` / `@xyflow/react`: Visual workflow builder
- `lucide-react`: Icons
- `@radix-ui/*`: UI components (via shadcn/ui)
- `axios`: HTTP client
- `next`: Next.js framework

### Internal Dependencies

- `/services/campaignService`: API integration
- `/services/api`: Axios instance with auth
- `/components/ui/*`: Reusable UI components
- `/lib/utils`: Utility functions

## Integration with Backend

### Authentication

All API calls include JWT token via Axios interceptor:

```typescript
// In api.ts
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Multi-Tenancy

Backend automatically filters by `tenant_id` based on JWT token. Frontend does not need to pass tenant_id explicitly.

### Error Handling

```typescript
try {
  await campaignService.startCampaign(id);
  toast({ title: 'Success', description: 'Campaign started' });
} catch (error: any) {
  toast({
    title: 'Error',
    description: error.message || 'Failed to start campaign',
    variant: 'destructive'
  });
}
```

## Best Practices

### Campaign Creation

1. Always provide descriptive campaign names
2. Add at least one lead generation step
3. Include delays between outreach steps
4. Use conditions to branch based on engagement
5. Test campaign with small lead counts first
6. Monitor activity logs for errors

### Step Configuration

1. Use variable substitution for personalization
2. Keep messages concise and value-focused
3. Set reasonable delays (24-48 hours between touches)
4. Configure lead generation filters carefully
5. Test voice agents before adding to campaign
6. Add conditions after engagement steps

### Performance

1. Limit leads per day to avoid API rate limits
2. Use pagination when loading large campaign lists
3. Debounce search inputs
4. Load campaign details on-demand
5. Cache step definitions

## Troubleshooting

### Campaign Won't Start

**Issue**: "Please add at least one step to the workflow"
**Solution**: Add steps from the step library before starting

**Issue**: "Please enter a campaign name"
**Solution**: Fill in the campaign name field

**Issue**: "Failed to start campaign"
**Solution**: Check that campaign has valid steps and lead generation configured

### Steps Not Saving

**Issue**: Step configuration changes not persisting
**Solution**: Click "Save" button in header after making changes

**Issue**: Steps disappear after reload
**Solution**: Ensure campaign is saved before navigating away

### Lead Generation Not Working

**Issue**: No leads being generated
**Solution**: 
- Check Apollo.io API credentials in backend
- Verify lead generation step configuration
- Check daily lead limit hasn't been reached
- Review backend logs for API errors

### Activities Not Showing

**Issue**: No activities in campaign
**Solution**:
- Ensure campaign is running
- Check that leads have been added
- Verify backend scheduler is running
- Review backend logs for execution errors

## Future Enhancements

1. **Analytics Dashboard**: Charts for funnel metrics, engagement rates
2. **A/B Testing**: Test different message variants
3. **Lead Scoring**: Automatic lead qualification based on engagement
4. **Custom Step Types**: Allow users to create custom steps
5. **Template Library**: Pre-built campaign templates
6. **Bulk Actions**: Start/pause multiple campaigns at once
7. **Export/Import**: Campaign workflow export/import
8. **Webhook Integration**: Trigger external actions on events
9. **Advanced Conditions**: Complex branching logic
10. **Real-time Updates**: Live activity feed with WebSocket

## Migration Notes

### From pluto_v8

The campaign feature was migrated from `/pluto_v8/lad_ui/src/components/campaigns/` and `/pluto_v8/sts-service/src/services/campaignExecutionService.js`.

**Changes Made**:
1. Converted from JavaScript to TypeScript
2. Added comprehensive type definitions
3. Simplified StepSettings component (from 1129 lines to focused implementation)
4. Removed onboarding store dependency
5. Improved error handling and loading states
6. Added multi-tenancy support
7. Modernized UI with shadcn/ui components
8. Improved React Flow integration

**Preserved Features**:
- All 25 step types
- Lead generation logic with Apollo.io
- Workflow execution engine
- Activity tracking
- Condition branching
- Variable substitution

## Support

For issues or questions:
1. Check backend logs: `/Users/naveenreddy/Desktop/AI-Maya/LAD/sts-service/logs/`
2. Review SQL migration: `backend/migrations/006_create_campaigns_tables.sql`
3. Consult backend documentation: `backend/features/campaigns/CAMPAIGN_MIGRATION.md`
