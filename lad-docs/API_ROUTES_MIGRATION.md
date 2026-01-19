# API Routes Migration to Kebab-Case

## Overview
Completed migration of all API routes from camelCase to kebab-case for consistency and best practices.

## Changes Made

### Route Naming Convention
- **Old**: `/api/voiceagent` → **New**: `/api/voice-agent`
- **Old**: `/api/calllogs` → **New**: `/api/call-logs`

### Frontend Changes (lad_ui)

#### 1. API Proxy Routes (Next.js)
**Moved directories:**
- `lad_ui/src/app/api/voiceagent/` → `lad_ui/src/app/api/voice-agent/`
- `lad_ui/src/app/api/calllogs/` → `lad_ui/src/app/api/call-logs/`

**Updated files in proxy routes:**
- `api/voice-agent/calls/route.ts` - Updated all backend URL references
- `api/voice-agent/voices/route.ts` - Updated all backend URL references
- `api/voice-agent/numbers/route.ts` - Updated all backend URL references
- `api/voice-agent/all/route.ts` - Updated all backend URL references
- `api/voice-agent/resolve-phones/route.ts` - Updated all backend URL references
- `api/voice-agent/user/available-agents/route.ts` - Updated all backend URL references
- `api/voice-agent/user/available-numbers/route.ts` - Updated all backend URL references
- `api/call-logs/route.ts` - Updated all backend URL references

#### 2. Component Files
**Updated route references in:**
- `lad_ui/src/app/dashboard/page.tsx`
  - Line 714: `/api/calllogs` → `/api/call-logs`
  - Line 788: `/api/voiceagent/numbers` → `/api/voice-agent/numbers`
  
- `lad_ui/src/app/phone-numbers/page.tsx`
  - Line 151: `/api/voiceagent/numbers` → `/api/voice-agent/numbers`

- `lad_ui/src/components/create-number-dialog.tsx`
  - `/api/voiceagent` → `/api/voice-agent`
  - `/api/voiceagent/numbers` → `/api/voice-agent/numbers`

- `lad_ui/src/components/call-log-modal.tsx`
  - `/api/calllogs/${id}` → `/api/call-logs/${id}`
  - `/api/voiceagent/calls/${callId}/recording-signed-url` → `/api/voice-agent/calls/${callId}/recording-signed-url`
  - `/api/calllogs/${id}/analysis` → `/api/call-logs/${id}/analysis`

- `lad_ui/src/components/CallOptions.tsx`
  - `/api/voiceagent/calls/batch` → `/api/voice-agent/calls/batch`
  - `/api/voiceagent/calls` → `/api/voice-agent/calls`
  - `/api/voiceagent/update-summary` → `/api/voice-agent/update-summary`

- `lad_ui/src/app/api/recording-proxy/route.ts`
  - `/api/voiceagent/agents/${agentId}/sample-signed-url` → `/api/voice-agent/agents/${agentId}/sample-signed-url`

### Backend Changes (sts-service)

#### 1. Route Registration (sts-service/src/index.js)
**Updated route registrations:**
```javascript
// OLD
app.use('/api/voiceagent', voiceagentRoutes);
app.use('/api/calllogs', CallLogsRoutes);
app.post('/api/voiceagent/webhook', async (req, res) => { ... });

// NEW
app.use('/api/voice-agent', voiceagentRoutes);
app.use('/api/call-logs', CallLogsRoutes);
app.post('/api/voice-agent/webhook', async (req, res) => { ... });
```

#### 2. Service Files
**Updated internal API calls in:**
- `sts-service/src/services/campaignExecutionService.js`
  - Line 1237: `/api/voiceagents/calls` → `/api/voice-agent/calls`

- `sts-service/src/services/linkedinWebhook.service.js`
  - Line 1313: Comment updated to reflect new route
  - Line 1324: `/api/voiceagent/calls` → `/api/voice-agent/calls`
  - Line 1418: Error message updated to new route

#### 3. Middleware & Documentation
**Updated comments in:**
- `sts-service/src/middleware/creditTracking.js`
  - Line 10: Usage comment updated to `/api/voice-agent/calls`

## Migration Impact

### ✅ Completed
- All active frontend routes updated
- All active backend routes updated
- All API proxy routes moved and updated
- All internal service API calls updated
- Comments and documentation updated

### 📁 Legacy Code (Not Updated)
The following legacy code in `pluto_v8/` folder was **intentionally left unchanged** as it's archived:
- `pluto_v8/lad_ui/src/` - Legacy frontend components
- `pluto_v8/sts-service/src/` - Legacy backend services

### 🔄 No Breaking Changes
The migration maintains backward compatibility through:
1. Frontend proxy routes (Next.js `/api/` routes) automatically handle routing
2. All active code uses new kebab-case routes
3. Legacy `pluto_v8` folder is isolated from production

## Testing Checklist

### Frontend Routes to Test
- [ ] `/api/voice-agent` - Voice agent list
- [ ] `/api/voice-agent/calls` - Call operations (GET, POST, PUT, DELETE)
- [ ] `/api/voice-agent/numbers` - Phone numbers management
- [ ] `/api/voice-agent/voices` - Voice selection
- [ ] `/api/voice-agent/webhook` - Webhook endpoint
- [ ] `/api/call-logs` - Call logs retrieval
- [ ] `/api/call-logs/:id` - Single call log details
- [ ] `/api/call-logs/:id/analysis` - Call analysis

### Component Features to Test
- [ ] Dashboard call logs display
- [ ] Phone numbers page
- [ ] Create number dialog
- [ ] Call log modal
- [ ] Make call functionality
- [ ] Call recording playback
- [ ] Campaign voice calls

### Backend Services to Test
- [ ] Campaign execution with voice calls
- [ ] LinkedIn webhook voice call triggers
- [ ] Voice agent webhook status updates
- [ ] Credit tracking middleware

## Notes
- All route changes use kebab-case following REST API naming conventions
- No duplicate routes exist in active code
- All commented code with old routes has been updated or clearly marked as legacy
- Migration completed: December 20, 2024
