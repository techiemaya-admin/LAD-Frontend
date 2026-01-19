# LAD Architecture Refactoring

## Overview
This document describes the architectural refactoring completed for the LAD SaaS platform.

## 1. Campaign Workflow Engine (✅ Completed)

### Structure
```
backend/features/campaigns/
├── engine/
│   ├── workflowEngine.js         # Main orchestration engine
│   ├── stepExecutor.js           # Individual step execution
│   ├── conditionEvaluator.js     # Condition logic evaluation
│   └── channelDispatchers/
│       ├── linkedin.js           # LinkedIn actions
│       ├── voice.js              # Voice call actions
│       └── email.js              # Email actions
├── routes.js
├── controllers/
└── manifest.js
```

### Benefits
- **Separation of Concerns**: Workflow orchestration separated from step execution
- **Channel Abstraction**: Each channel has its own dispatcher
- **Testability**: Each component can be tested independently
- **Extensibility**: Easy to add new channels or step types

### Key Components

#### workflowEngine.js
- Orchestrates entire campaign execution
- Manages lead flow through workflow steps
- Handles step transitions and state management
- Functions: `processCampaign()`, `processLeadWorkflow()`, `getNextStep()`

#### stepExecutor.js
- Executes individual workflow steps
- Validates step configurations
- Creates and updates activity records
- Dispatches to appropriate channel handlers
- Functions: `executeStepForLead()`, `executeChannelAction()`, `executeDelay()`

#### conditionEvaluator.js
- Evaluates workflow conditions
- Supports multiple condition types (response_received, profile_matches, etc.)
- Functions: `evaluateCondition()`, `checkResponseReceived()`, `checkProfileMatches()`

#### Channel Dispatchers
Each dispatcher handles actions for its specific channel:
- **linkedin.js**: Connection requests, messages, profile visits, follows
- **voice.js**: Voice calls via voice agent API
- **email.js**: Email sending and followups

## 2. Frontend Feature SDK (✅ Completed)

### Structure
```
frontend/features/
├── ai-icp-assistant/
│   ├── services/
│   │   └── mayaAIService.ts      # AI chat and workflow generation
│   ├── hooks/                     # React hooks
│   ├── types.ts                   # TypeScript types
│   └── index.ts                   # Public API
├── campaigns/
│   ├── services/
│   │   └── campaignService.ts    # Campaign CRUD operations
│   ├── hooks/                     # Campaign-specific hooks
│   ├── types.ts                   # Campaign types
│   └── index.ts                   # Public API
├── pipeline/
│   ├── services/
│   │   └── pipelineService.ts    # Pipeline operations
│   ├── hooks/                     # Pipeline hooks
│   ├── types.ts                   # Pipeline types
│   └── index.ts                   # Public API
└── voice-agent/
    ├── services/
    │   └── voiceAgentService.ts  # Voice agent operations
    ├── hooks/                     # Voice agent hooks
    ├── types.ts                   # Voice agent types
    └── index.ts                   # Public API
```

### Configuration
**frontend/package.json**:
```json
{
  "exports": {
    "./ai-icp-assistant": "./features/ai-icp-assistant/index.ts",
    "./campaigns": "./features/campaigns/index.ts",
    "./pipeline": "./features/pipeline/index.ts",
    "./voice-agent": "./features/voice-agent/index.ts"
  }
}
```

**lad_ui/tsconfig.json**:
```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@/features/*": ["../frontend/features/*"]
  }
}
```

### Benefits
- **Single Source of Truth**: All feature logic in one place
- **Type Safety**: Full TypeScript support with exported types
- **Reusability**: Services can be imported by any frontend app
- **Versioning**: SDK can be versioned and distributed independently
- **Testability**: Services can be mocked and tested in isolation

### Usage Examples

#### AI ICP Assistant (Maya)
```typescript
// Old way (deprecated)
import { sendGeminiPrompt } from '@/services/geminiFlashService';

// New way
import { mayaAI } from '@/features/ai-icp-assistant';
const response = await mayaAI.sendMessage(message, history, ...);
```

#### Campaigns
```typescript
// Import from feature SDK
import { campaignService, type Campaign } from '@/features/campaigns';

const campaigns = await campaignService.getCampaigns();
```

#### Pipeline
```typescript
import { pipelineService, type Pipeline } from '@/features/pipeline';

const pipelines = await pipelineService.getPipelines();
```

#### Voice Agent
```typescript
import { voiceAgentService, type VoiceAgent } from '@/features/voice-agent';

const agents = await voiceAgentService.getVoiceAgents();
```

### Backward Compatibility
Legacy service files in `lad_ui/src/services/` now re-export from the frontend SDK:

```typescript
// lad_ui/src/services/geminiFlashService.ts
export { mayaAI, type MayaMessage, type MayaResponse } from '@/features/ai-icp-assistant';
```

This allows existing code to continue working while migrating to the new structure.

## 3. Slot-Based Pipeline Composition (✅ Completed)

### Structure
```
lad_ui/src/components/pipeline/
├── SlotBasedPipelineBoard.tsx    # Main shell component
├── slots/
│   ├── LeadDetailsSlot.tsx       # Standard lead details (all verticals)
│   ├── EducationStudentSlot.tsx  # Education-specific academic info
│   ├── CounsellorScheduleSlot.tsx # Counselor scheduling
│   ├── CompanyInfoSlot.tsx       # (To be created) SaaS company info
│   ├── PropertyPreferencesSlot.tsx # (To be created) Real estate preferences
│   └── ...
└── config/
    └── pipelineConfig.ts         # Vertical configurations
```

### Configuration System

**pipelineConfig.ts** defines slot configurations for each vertical:

```typescript
export const PIPELINE_CONFIG = {
  education: {
    slots: [
      { id: 'lead-details', component: 'LeadDetailsSlot', position: 'left', width: '350px' },
      { id: 'education-student', component: 'EducationStudentSlot', position: 'center' },
      { id: 'counsellor-schedule', component: 'CounsellorScheduleSlot', position: 'right' },
    ]
  },
  saas: {
    slots: [
      { id: 'lead-details', component: 'LeadDetailsSlot', position: 'left' },
      { id: 'company-info', component: 'CompanyInfoSlot', position: 'center' },
      { id: 'engagement-history', component: 'EngagementHistorySlot', position: 'right' },
    ]
  },
  realestate: {
    slots: [
      { id: 'lead-details', component: 'LeadDetailsSlot', position: 'left' },
      { id: 'property-preferences', component: 'PropertyPreferencesSlot', position: 'center' },
      { id: 'viewing-schedule', component: 'ViewingScheduleSlot', position: 'right' },
    ]
  }
};
```

### Usage

```tsx
import SlotBasedPipelineBoard from '@/components/pipeline/SlotBasedPipelineBoard';

<SlotBasedPipelineBoard 
  vertical="education" 
  leadData={studentData}
  onUpdate={handleUpdate}
/>
```

### Benefits
- **Vertical-Specific**: Each industry gets custom slots
- **Composable**: Mix and match slots as needed
- **Reusable**: Slots can be shared across verticals
- **Configurable**: Easy to add new verticals via config
- **Type-Safe**: Full TypeScript support

### Implemented Slots

#### 1. LeadDetailsSlot
- Standard lead information
- Name, email, phone, company, title
- Deal value, tags, stage
- Used by all verticals

#### 2. EducationStudentSlot
- Academic information
- Current education level, institution, GPA
- Target degree, major, universities
- Test scores (SAT, ACT, TOEFL, IELTS, GRE, GMAT)
- Budget range, intake preferences
- Scholarship interest

#### 3. CounsellorScheduleSlot
- Appointment scheduling
- Upcoming and past sessions
- Online, phone, in-person meetings
- Counselor assignment
- Session notes

### Adding New Verticals

1. **Create slot components** in `slots/` directory
2. **Add configuration** in `pipelineConfig.ts`:
   ```typescript
   newVertical: {
     id: 'newVertical',
     name: 'New Vertical',
     slots: [/* slot configs */]
   }
   ```
3. **Update component map** in `SlotBasedPipelineBoard.tsx`
4. **Use the board**:
   ```tsx
   <SlotBasedPipelineBoard vertical="newVertical" ... />
   ```

## 4. API Route Naming (✅ Already Normalized)

The voice-agent feature already uses normalized API routes:

### Current Routes
- ✅ `/api/voice-agent/*` - Voice agent operations
- ✅ `/api/voice-agent/user/available-agents` - Get user's agents
- ✅ `/api/voice-agent/user/available-numbers` - Get phone numbers

### Additional Routes Needed
- `/api/call-logs/*` - Call log operations (to be implemented)
- `/api/calendar/*` - Calendar operations (to be implemented)

## Migration Checklist

### Backend
- [x] Extract campaign workflow engine
- [x] Create workflowEngine.js
- [x] Create stepExecutor.js
- [x] Create conditionEvaluator.js
- [x] Create channel dispatchers (LinkedIn, Voice, Email)
- [x] Verify voice-agent routes are normalized

### Frontend
- [x] Create frontend/features/ directory structure
- [x] Migrate AI ICP Assistant service (mayaAIService.ts)
- [x] Migrate campaign service
- [x] Migrate pipeline service
- [x] Create voice agent service
- [x] Add TypeScript types for all features
- [x] Create index.ts exports for each feature
- [x] Update tsconfig.json with path aliases
- [x] Add backward compatibility layer in old service files

### Pipeline
- [x] Create slot-based architecture
- [x] Implement pipelineConfig.ts
- [x] Create LeadDetailsSlot
- [x] Create EducationStudentSlot
- [x] Create CounsellorScheduleSlot
- [x] Create SlotBasedPipelineBoard shell
- [ ] Create additional slots for other verticals (SaaS, Real Estate)

### Documentation
- [x] Document architecture changes
- [x] Document frontend SDK usage
- [x] Document slot-based pipeline system
- [ ] Update API documentation for normalized routes

## Next Steps

1. **Add More Slots**: Create slots for SaaS and Real Estate verticals
2. **Testing**: Add unit tests for engine components
3. **Call Logs API**: Implement `/api/call-logs` endpoints
4. **Calendar Integration**: Implement `/api/calendar` endpoints
5. **Frontend Hooks**: Create React hooks for each feature SDK
6. **Migration Guide**: Create detailed guide for migrating existing code

## File Changes Summary

### New Files Created
- `backend/features/campaigns/engine/workflowEngine.js`
- `backend/features/campaigns/engine/stepExecutor.js`
- `backend/features/campaigns/engine/conditionEvaluator.js`
- `backend/features/campaigns/engine/channelDispatchers/linkedin.js`
- `backend/features/campaigns/engine/channelDispatchers/voice.js`
- `backend/features/campaigns/engine/channelDispatchers/email.js`
- `frontend/features/ai-icp-assistant/services/mayaAIService.ts`
- `frontend/features/ai-icp-assistant/types.ts`
- `frontend/features/ai-icp-assistant/index.ts`
- `frontend/features/campaigns/services/campaignService.ts`
- `frontend/features/campaigns/types.ts`
- `frontend/features/campaigns/index.ts`
- `frontend/features/pipeline/services/pipelineService.ts`
- `frontend/features/pipeline/types.ts`
- `frontend/features/pipeline/index.ts`
- `frontend/features/voice-agent/services/voiceAgentService.ts`
- `frontend/features/voice-agent/types.ts`
- `frontend/features/voice-agent/index.ts`
- `frontend/tsconfig.json`
- `frontend/package.json`
- `lad_ui/src/components/pipeline/config/pipelineConfig.ts`
- `lad_ui/src/components/pipeline/slots/LeadDetailsSlot.tsx`
- `lad_ui/src/components/pipeline/slots/EducationStudentSlot.tsx`
- `lad_ui/src/components/pipeline/slots/CounsellorScheduleSlot.tsx`
- `lad_ui/src/components/pipeline/SlotBasedPipelineBoard.tsx`

### Files Modified
- `lad_ui/src/services/geminiFlashService.ts` - Now re-exports from frontend SDK
- `lad_ui/src/services/campaignService.ts` - Now re-exports from frontend SDK
- `lad_ui/src/services/pipelineService.ts` - Now re-exports from frontend SDK
- `lad_ui/tsconfig.json` - Added `@/features/*` path alias

## Benefits Summary

### Backend
- ✅ Better separation of concerns
- ✅ Easier testing and maintenance
- ✅ Clear workflow execution flow
- ✅ Extensible channel system

### Frontend
- ✅ Single source of truth for feature logic
- ✅ Full TypeScript type safety
- ✅ Reusable across multiple frontends
- ✅ Independent versioning and distribution
- ✅ Backward compatible with existing code

### Pipeline
- ✅ Vertical-specific customization
- ✅ Reusable slot components
- ✅ Easy configuration via simple JSON
- ✅ Type-safe composition

## Conclusion

This refactoring establishes a solid foundation for scaling the LAD platform across multiple verticals while maintaining code quality, type safety, and developer experience.
