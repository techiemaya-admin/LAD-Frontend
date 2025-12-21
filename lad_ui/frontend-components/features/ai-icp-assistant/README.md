# AI ICP Assistant Feature

## Overview
AI-powered conversational assistant that helps users define their Ideal Customer Profile (ICP) and triggers Apollo searches with the collected criteria.

## Architecture

This feature follows the **feature-scoped, framework-agnostic** pattern:

```
frontend/features/ai-icp-assistant/     ← Framework-agnostic feature code
├── aiICPAssistantService.ts            ← Core service logic (TypeScript)
├── index.ts                            ← Public API exports
└── README.md                           ← This file

lad_ui/src/                             ← Next.js application layer
├── services/mayaAIService.js           ← Thin wrapper for backward compatibility
└── app/api/ai-icp-assistant/          ← (Future) Next.js API route proxy
```

## Design Principles

### ✅ Framework Agnostic
- Service code has no Next.js dependencies
- Can be used in any JavaScript environment
- API client is injected, not hardcoded

### ✅ Type Safe
- Full TypeScript interfaces
- Clear contracts for data shapes
- Easy to test and maintain

### ✅ Testable
- Pure functions with injected dependencies
- No global state
- Easy to mock API client

## Usage

### In Framework-Agnostic Code

```typescript
import { createAIICPAssistantService } from '@/frontend/features/ai-icp-assistant';

const service = createAIICPAssistantService(yourApiClient);

const response = await service.chat('I need healthcare companies', []);
console.log(response.message); // AI response
console.log(response.searchReady); // true when ICP is complete
```

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
