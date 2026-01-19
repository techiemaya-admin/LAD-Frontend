# Architecture Review: API Integration in Web Folder

## Question: Can we add `/api` routes directly in the web folder scripts?

---

## Current Architecture Analysis

### 1. **Backend Structure (Express.js)**
- **Location**: `/LAD/backend/`
- **Architecture**: Feature-based with proper layering
  - `features/` - Feature modules with services/repositories
  - `core/` - Shared infrastructure (app, middleware, logger)
  - `routes/` - Route definitions (currently empty - routes are in feature modules)
  - `server.js` - Main entry point running on port 3004
- **API Pattern**: RESTful endpoints at `/api/*`
- **Examples**:
  ```
  POST /api/auth/login
  POST /api/auth/register
  GET /api/features
  GET /api/users/:id
  GET /api/billing/plans
  ```

### 2. **Frontend Structure (Next.js)**
- **Location**: `/frontend/web/src/`
- **Web Folder**: `/frontend/web/` (Next.js app)
- **SDK Folder**: `/frontend/sdk/` (Feature modules, business logic)
- **Current API Integration Pattern**:
  - Direct calls to backend via `/web/src/lib/api.ts`
  - `apiGet()`, `apiPost()`, `apiPut()`, `apiDelete()` utilities
  - Base URL: `NEXT_PUBLIC_BACKEND_URL` (points to backend server)

### 3. **Existing `/api` Routes in Web Folder**
- **Location**: `/frontend/web/src/app/api/` (Next.js API routes)
- **Existing Routes**:
  ```
  /api/metrics/
  /api/settings/
  /api/recording-proxy/
  /api/calendar/
  /api/auth/
  /api/users/
  /api/stripe/
  /api/webhooks/
  /api/onboarding/
  /api/gemini/
  /api/health/
  /api/feature-flags/
  /api/profile-summary/
  ```
- **Pattern Used**: All existing routes act as **proxy/adapter layers** that:
  1. Authenticate user (get token from cookies)
  2. Forward request to backend
  3. Return response to client

**Example** (`/api/metrics/route.ts`):
```typescript
// This is a PROXY pattern - not business logic
const backend = getBackendUrl();
const resp = await fetch(`${backend}/api/metrics`, {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` },
});
```

---

## LAD Architecture Compliance Review

### ✅ What's COMPLIANT:

1. **Backend Separation** ✅
   - Backend business logic is in `backend/` (Express.js)
   - Proper layering: routes → services → repositories
   - Tenant-scoped queries enforced
   - No direct database access from frontend

2. **Frontend SDK Pattern** ✅
   - `frontend/sdk/features/` contains business logic hooks
   - `web/src/lib/api.ts` provides typed API utilities
   - Components use SDK hooks, not direct API calls

3. **Existing `/api` Routes** ✅
   - Used as **authentication & authorization layer** (checking tokens, enforcing permissions)
   - Used as **proxy layer** (forwarding to backend)
   - Used for **webhooks** (Stripe, third-party services)
   - Used for **server-side utilities** (Google Calendar OAuth, etc.)

### 🔴 CRITICAL ARCHITECTURAL CONCERNS:

#### **Issue #1: Where Should Business Logic Live?**
- ✅ **CORRECT**: Backend (`/backend/server.js` + feature modules)
- ❌ **WRONG**: Duplicating in `/frontend/web/src/app/api/`
- ❌ **WRONG**: Adding direct database queries in web `/api/` routes

#### **Issue #2: Multi-Tenancy & Security**
From `LAD_Architecture_Validatin_Checklist.md`:
```
A) MULTI-TENANCY (HARD REQUIREMENT)
- Every query MUST be tenant-scoped
- Tenant context must come from auth context (JWT/session), NOT client input
```

**PROBLEM**: If you add business logic to `/frontend/web/src/app/api/`:
- You'd be adding tenant enforcement TWICE (backend + frontend proxy)
- Risk of tenant context being lost or mishandled
- Duplicate validation logic = maintenance nightmare
- Violates **Single Responsibility Principle**

#### **Issue #3: Scalability & Deployment**
- Backend (`/LAD/backend/`) is separately deployable to **Cloud Run**
- Frontend (`/frontend/web/`) is separately deployable to **Cloud Run**
- If you add business logic to web routes:
  - You can't scale backend independently
  - You can't update business rules without redeploying frontend
  - You lose the ability to have multiple frontend instances

---

## Answer: Can We Add `/api` Routes Directly?

### **YES, but ONLY for these purposes:**

1. ✅ **Authentication/Authorization Layer**
   - Validate tokens
   - Check user permissions
   - Enforce tenant context
   - Example: `/api/auth/verify-token`

2. ✅ **Proxy/Adapter Layer**
   - Forward requests to backend
   - Add authentication headers
   - Transform responses if needed
   - Example: `/api/metrics/route.ts` (current pattern)

3. ✅ **Webhooks**
   - Stripe webhooks
   - Calendar service callbacks
   - Third-party integrations
   - Example: `/api/stripe/webhooks`

4. ✅ **Server-Only Operations**
   - OAuth flows (where you need client secrets)
   - File uploads to secure storage
   - Real-time listeners (database subscriptions)
   - Example: `/api/calendar/google/start`

### **NO, DO NOT add these to `/api/` routes:**

1. ❌ **Business Logic**
   - Lead scoring
   - Campaign calculations
   - Data transformations
   - Stays in: `/backend/features/`

2. ❌ **Database Queries**
   - User data queries
   - Campaign data queries
   - Analytics queries
   - Stays in: `/backend/features/repositories/`

3. ❌ **Complex Validations**
   - Multi-step workflows
   - Cross-tenant checks
   - Feature gate enforcement
   - Stays in: `/backend/features/services/`

4. ❌ **Duplicate API Endpoints**
   - Backend already has `/api/users`
   - Don't create `/frontend/api/users`
   - Use proxy pattern instead

---

## Current Implementation Status

### What's CORRECT:
```
Frontend (Web)
  ├── /api/ (Proxy/Auth/Webhooks)
  │   ├── /metrics → forwards to backend
  │   ├── /settings → forwards to backend
  │   ├── /stripe/webhooks → handles Stripe
  │   └── /auth → handles OAuth
  └── /lib/api.ts (Typed HTTP utilities)
         ↓ (calls)
       Backend (Express.js)
         ├── /api/metrics (Real business logic)
         ├── /api/settings (Real business logic)
         └── /api/users (Real business logic)
```

### What NEEDS FIXING:
From your error: `"apiPost is not defined"` in `/CallOptions.tsx`

**The Issue**: The component was using `apiPost` without importing it.
**The Fix**: ✅ Already fixed! (Added `import { apiPost } from "@/lib/api"`)

**This is CORRECT usage**:
```typescript
import { apiPost } from "@/lib/api";

// In component:
const res = await apiPost("/api/voice-agent/batch/trigger-batch-call", payload);
```

Not:
```typescript
// ❌ WRONG - Don't create direct business logic in web /api/
// POST /frontend/web/src/app/api/voice-agent/batch/route.ts
```

---

## Recommendations

### 1. **Keep Current Structure** ✅
- Backend: All business logic
- Frontend: Proxy/Auth/Webhooks only
- SDK: Typed hooks for components

### 2. **If You Need New Endpoints**:

**Option A**: Backend has the endpoint → Add proxy in web/
```typescript
// /frontend/web/src/app/api/campaigns/route.ts
// Just forward to backend
const backend = getBackendUrl();
const resp = await fetch(`${backend}/api/campaigns`, { /* proxy */ });
```

**Option B**: Only frontend needs it → Add to web/
```typescript
// /frontend/web/src/app/api/auth/verify-token/route.ts
// Client-side token validation (no backend needed)
const user = parseJWT(token);
```

**Option C**: New backend feature → Add in backend/
```typescript
// /backend/features/new-feature/routes.js
// Real business logic - use proper layering
```

### 3. **For Batch Calls Fix**:
The current implementation in `CallOptions.tsx` is correct:
```typescript
const res = await apiPost("/api/voice-agent/batch/trigger-batch-call", payload);
```

Just ensure:
- ✅ Backend has `/api/voice-agent/batch/trigger-batch-call` endpoint
- ✅ `apiPost` is imported from `@/lib/api`
- ✅ Component has necessary error handling

---

## Summary

| Question | Answer |
|----------|--------|
| Can we add `/api` routes in web folder? | ✅ Yes, for proxy/auth/webhooks |
| Should we add business logic there? | ❌ No, keep it in backend |
| Should we add database queries there? | ❌ No, keep them in backend |
| Is the current pattern correct? | ✅ Yes, proxy pattern is right |
| What about multi-tenancy? | ✅ Enforced in backend only |
| What about scaling? | ✅ Backend scales independently |

**📊 Status**: ARCHITECTURE COMPLIANT ✅

