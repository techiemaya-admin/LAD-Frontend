# AI ICP Assistant Feature - Frontend SDK

## Overview
Frontend SDK for AI-powered conversational ICP (Ideal Customer Profile) onboarding.
Provides hooks and API functions to fetch questions, process answers, and track progress.

## Architecture

This feature follows the **feature-scoped SDK** pattern:

```
sdk/features/ai-icp-assistant/
├── api.ts                          ← Raw API calls (no state)
├── types.ts                        ← TypeScript interfaces
├── hooks.ts                        ← Hook re-exports
├── hooks/
│   ├── useItem.ts                  ← Fetch single question
│   └── useItems.ts                 ← Fetch all questions
├── index.ts                        ← Public API exports
├── services/                       ← Legacy services
│   ├── aiICPAssistantService.ts
│   └── mayaAIService.ts
└── README.md                       ← This file
```

## Design Principles

### ✅ Separation of Concerns
- **api.ts**: Raw HTTP calls only
- **hooks/**: State management + loading/error handling
- **types.ts**: Shared type definitions
- **index.ts**: Clean public API

### ✅ No Hardcoded Values
- All URLs from environment variables
- Configurable categories (default: 'lead_generation')
- Flexible backend base URL resolution

### ✅ Production-Grade Hooks
- Proper loading/error states
- Cleanup on dependency changes
- No memory leaks

## API Functions

### fetchICPQuestions(category?: string)
Fetch all ICP questions for a category.

```typescript
import { fetchICPQuestions } from '@/sdk/features/ai-icp-assistant';

const response = await fetchICPQuestions('lead_generation');
console.log(response.questions);    // ICPQuestion[]
console.log(response.totalSteps);   // number
```

### fetchICPQuestionByStep(stepIndex, category?)
Fetch a specific question by step index.

```typescript
const question = await fetchICPQuestionByStep(1, 'lead_generation');
// question: ICPQuestion | null
```

### processICPAnswer(request)
Process user answer and get next step.

```typescript
const response = await processICPAnswer({
  currentStepIndex: 1,
  userAnswer: "Healthcare and SaaS",
  category: 'lead_generation',
  collectedAnswers: { /* previous answers */ }
});

console.log(response.nextQuestion);    // ICPQuestion | null
console.log(response.nextStepIndex);   // number | null
console.log(response.completed);       // boolean
```

## Hooks

### useItem(stepIndex, category?)
Fetch and manage a single question.

```typescript
const { item, loading, error } = useItem(1, 'lead_generation');

if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;
if (!item) return <div>Not found</div>;

return <div>{item.question}</div>;
```

### useItems(category?)
Fetch and manage all questions.

```typescript
const { items, loading, error } = useItems('lead_generation');

if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;

return (
  <div>
    {items?.questions.map(q => (
      <div key={q.id}>{q.question}</div>
    ))}
  </div>
);
```

## Types

All type definitions are in `types.ts`:
- `ICPQuestion`: Single question object
- `ICPQuestionsResponse`: Questions fetch response
- `ICPAnswerRequest`: Answer submission payload
- `ICPAnswerResponse`: Answer processing response

## Environment Variables

Resolved in order of preference:
1. `NEXT_PUBLIC_ICP_BACKEND_URL` - Dedicated ICP backend
2. `NEXT_PUBLIC_API_URL` - General API URL
3. `REACT_APP_API_URL` - React/Vite fallback
4. `http://localhost:3000` - Local development default

## Single Responsibility

- **api.ts**: HTTP only
- **hooks/useItem.ts**: Single item + state
- **hooks/useItems.ts**: All items + state
- **types.ts**: Data contracts
- **index.ts**: Public exports only

### In Next.js (lad_ui)

```javascript
import { mayaAIService } from '@/services/mayaAIService';

// Service is pre-configured with lad_ui's API client
const response = await mayaAIService.chat('Healthcare companies', []);
```

## API

### `chat(message, conversationHistory?, searchResults?)`
Send a message to the AI assistant.

**Returns:** `Promise<ChatResponse>`
- `message`: AI's response text
- `icpData`: Collected ICP criteria
- `searchReady`: Whether search can be triggered
- `searchParams`: Apollo search parameters (if ready)
- `conversationHistory`: Full conversation
- `suggestions`: Optional quick reply suggestions

### `reset()`
Reset the conversation history.

**Returns:** `Promise<{ success: boolean, message: string }>`

### `getHistory()`
Get the current conversation history.

**Returns:** `Promise<{ success: boolean, history: ChatMessage[] }>`

## Backend Integration

This feature connects to backend endpoints:
- `POST /api/ai-icp-assistant/chat` - Chat with AI
- `POST /api/ai-icp-assistant/reset` - Reset conversation
- `GET /api/ai-icp-assistant/history` - Get history

Backend implementation: `backend/features/ai-icp-assistant/`

## Future Enhancements

- [ ] Add AI ICP Assistant UI components to this feature module
- [ ] Add conversation context persistence
- [ ] Add multi-language support
- [ ] Add voice input/output
- [ ] Add ICP templates (healthcare, fintech, etc.)
