# Deals Pipeline SDK

> TypeScript SDK for integrating with the Deals Pipeline backend API

## Installation

```bash
# From the workspace root
npm install
```

## Quick Start

### Basic Usage

```typescript
import { dealsPipelineAPI } from './sdk/features/deals-pipeline/api';

// Set authentication token (if needed)
dealsPipelineAPI.setAuthToken('your-jwt-token');

// Fetch pipeline board
const board = await dealsPipelineAPI.getPipelineBoard();
console.log(board);

// Create a new lead
const newLead = await dealsPipelineAPI.createLead({
  name: 'John Doe',
  email: 'john@example.com',
  company: 'Acme Corp',
  value: 50000,
  stage: 'new',
  status: 'active'
});
```

### With React Hooks

```typescript
import { usePipelineBoard, useLeadMutations } from './sdk/features/deals-pipeline/hooks';

function PipelineBoard() {
  const { data: board, loading, error, refetch } = usePipelineBoard();
  const { createLead, moveLeadToStage } = useLeadMutations();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {board?.stages.map(stage => (
        <div key={stage.key}>
          <h3>{stage.label}</h3>
          {board.leadsByStage[stage.key]?.map(lead => (
            <div key={lead.id}>{lead.name}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## API Client

### Initialize Client

```typescript
import { DealsPipelineAPI } from './sdk/features/deals-pipeline/api';

// Default (localhost:3004)
const api = new DealsPipelineAPI();

// Custom base URL
const api = new DealsPipelineAPI('https://api.example.com/deals-pipeline');

// With auth headers
const api = new DealsPipelineAPI('https://api.example.com', {
  'Authorization': 'Bearer your-token'
});
```

### Leads API

```typescript
// List leads
const leads = await api.listLeads();

// Filter leads
const filteredLeads = await api.listLeads({
  stage: 'qualified',
  status: 'active',
  search: 'john'
});

// Get single lead
const lead = await api.getLead('lead-id');

// Create lead
const newLead = await api.createLead({
  name: 'Jane Smith',
  email: 'jane@example.com',
  company: 'Tech Corp',
  value: 75000
});

// Update lead
const updated = await api.updateLead('lead-id', {
  stage: 'proposal',
  value: 80000
});

// Delete lead
await api.deleteLead('lead-id');

// Get statistics
const stats = await api.getLeadStats();
```

### Stages API

```typescript
// List stages
const stages = await api.listStages();

// Create stage
const newStage = await api.createStage({
  key: 'demo',
  label: 'Demo Scheduled',
  color: '#3B82F6',
  order: 3
});

// Update stage
const updated = await api.updateStage('demo', {
  label: 'Demo Completed'
});

// Delete stage
await api.deleteStage('demo');

// Reorder stages
await api.reorderStages([
  { key: 'new', order: 1 },
  { key: 'contacted', order: 2 },
  { key: 'qualified', order: 3 }
]);
```

### Pipeline API

```typescript
// Get complete board
const board = await api.getPipelineBoard();

// Move lead to stage
const updated = await api.moveLeadToStage('lead-id', 'qualified');

// Update lead status
const updated = await api.updateLeadStatus('lead-id', 'on_hold');
```

### Reference Data API

```typescript
// Get statuses
const statuses = await api.getStatuses();

// Get sources
const sources = await api.getSources();

// Get priorities
const priorities = await api.getPriorities();
```

### Notes API

```typescript
// Get lead notes
const notes = await api.getLeadNotes('lead-id');

// Create note
const note = await api.createLeadNote('lead-id', 'Follow up next week', 'user-id');

// Delete note
await api.deleteLeadNote('lead-id', 'note-id');
```

## React Hooks

### usePipelineBoard

```typescript
import { usePipelineBoard } from './sdk/features/deals-pipeline/hooks';

function Component() {
  const { data, loading, error, refetch } = usePipelineBoard();
  
  return (
    <div>
      {data?.stages.map(stage => (
        <div key={stage.key}>{stage.label}</div>
      ))}
    </div>
  );
}
```

### useLeads

```typescript
import { useLeads } from './sdk/features/deals-pipeline/hooks';

function Component() {
  const { data: leads, loading, error, refetch } = useLeads({
    stage: 'new',
    status: 'active'
  });
  
  return (
    <ul>
      {leads?.map(lead => (
        <li key={lead.id}>{lead.name}</li>
      ))}
    </ul>
  );
}
```

### useLead

```typescript
import { useLead } from './sdk/features/deals-pipeline/hooks';

function LeadDetails({ leadId }: { leadId: string }) {
  const { data: lead, loading, error } = useLead(leadId);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{lead?.name}</div>;
}
```

### useLeadMutations

```typescript
import { useLeadMutations } from './sdk/features/deals-pipeline/hooks';

function Component() {
  const { createLead, updateLead, deleteLead, loading, error } = useLeadMutations();
  
  const handleCreate = async () => {
    try {
      const lead = await createLead({
        name: 'New Lead',
        email: 'lead@example.com'
      });
      console.log('Created:', lead);
    } catch (err) {
      console.error('Failed:', err);
    }
  };
  
  return <button onClick={handleCreate}>Create Lead</button>;
}
```

### useStages

```typescript
import { useStages } from './sdk/features/deals-pipeline/hooks';

function Component() {
  const { data: stages, loading, error } = useStages();
  
  return (
    <select>
      {stages?.map(stage => (
        <option key={stage.key} value={stage.key}>
          {stage.label}
        </option>
      ))}
    </select>
  );
}
```

### useReferenceData

```typescript
import { useReferenceData } from './sdk/features/deals-pipeline/hooks';

function Component() {
  const { statuses, sources, priorities, loading } = useReferenceData();
  
  return (
    <form>
      <select>
        {statuses.map(s => (
          <option key={s.key}>{s.label}</option>
        ))}
      </select>
    </form>
  );
}
```

## TypeScript Types

All types are exported from `types.ts`:

```typescript
import type {
  Lead,
  Stage,
  Status,
  Source,
  Priority,
  PipelineBoard,
  LeadStats,
  CreateLeadPayload,
  UpdateLeadPayload
} from './sdk/features/deals-pipeline/types';
```

## Error Handling

```typescript
try {
  const lead = await api.createLead(payload);
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
  }
}
```

With hooks:

```typescript
const { data, error } = useLeads();

if (error) {
  console.error('Failed to load leads:', error.message);
}
```

## Custom API Instance

```typescript
import { DealsPipelineAPI } from './sdk/features/deals-pipeline/api';
import { usePipelineBoard } from './sdk/features/deals-pipeline/hooks';

// Create custom instance
const customAPI = new DealsPipelineAPI('https://custom-api.com');

// Use with hooks
function Component() {
  const { data } = usePipelineBoard({ api: customAPI });
  return <div>{data?.stages.length} stages</div>;
}
```

## Development

The SDK is built with:
- TypeScript for type safety
- Native fetch API for HTTP requests
- React hooks for easy integration
- No external dependencies (except React for hooks)

## Example: Complete Integration

```typescript
import React from 'react';
import { usePipelineBoard, useLeadMutations } from './sdk/features/deals-pipeline/hooks';

export function PipelineApp() {
  const { data: board, loading, error, refetch } = usePipelineBoard();
  const { createLead, moveLeadToStage } = useLeadMutations();

  const handleCreateLead = async () => {
    await createLead({
      name: 'New Opportunity',
      company: 'Acme Inc',
      value: 100000,
      stage: 'new'
    });
    refetch(); // Reload board
  };

  const handleDragDrop = async (leadId: string, newStage: string) => {
    await moveLeadToStage(leadId, newStage);
    refetch(); // Reload board
  };

  if (loading) return <div>Loading pipeline...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="pipeline">
      <button onClick={handleCreateLead}>+ New Lead</button>
      
      <div className="stages">
        {board?.stages.map(stage => (
          <div key={stage.key} className="stage">
            <h3>{stage.label}</h3>
            <div className="leads">
              {board.leadsByStage[stage.key]?.map(lead => (
                <div key={lead.id} className="lead-card">
                  <h4>{lead.name}</h4>
                  <p>{lead.company}</p>
                  <p>${lead.value?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## See Also

- [API Documentation](../../../../contracts/api.md)
- [Type Definitions](./types.ts)
- [Example Components](../../../../ui/pipeline/)
