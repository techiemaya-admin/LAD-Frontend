# Feature-Based API Routing Architecture

## ✅ Implementation Complete

The frontend now uses a **universal feature proxy** that automatically routes all feature requests to the backend's feature-based architecture.

## How It Works

### Universal Proxy
**Location:** `/src/app/api/[feature]/[...path]/route.ts`

This single file handles ALL feature-based API requests:

```typescript
// Frontend Request
fetch('/api/social-integration/linkedin/status')

// ↓ Automatically proxied to backend
http://localhost:3004/api/social-integration/linkedin/status
```

### Supported Features (Auto-Detected)
- `social-integration` - LinkedIn, Instagram, WhatsApp, Facebook
- `voice-agent` - VAPI calls, recordings, phone numbers
- `apollo-leads` - Company search, lead generation
- `lead-enrichment` - AI-powered lead filtering
- `campaigns` - Multi-channel outreach
- `ai-icp-assistant` - ICP chatbot

### Core Routes (Preserved)
These remain as specific proxies:
- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/webhooks/*` - Webhook handlers
- `/api/stripe/*` - Billing
- `/api/metrics/*` - Analytics
- `/api/settings/*` - App settings
- `/api/feature-flags/*` - Feature access
- `/api/calender/*` - Calendar integration
- `/api/gemini/*` - AI chat
- `/api/onboarding/*` - User onboarding
- `/api/recording-proxy/*` - Audio proxying

## Migration Complete ✅

### Removed Routes
❌ `/api/linkedin/*` → Use `/api/social-integration/linkedin/*`
❌ `/api/call-logs/*` → Use `/api/voice-agent/calls/*`
❌ `/api/leads/*` → Reserved for future CRM feature
❌ `/api/voice-agent/{specific}` → Use universal proxy

### Updated Components
✅ `LinkedInIntegration.tsx` - 7 endpoints updated
✅ `call-log-modal.tsx` - 2 endpoints updated
✅ All voice-agent components already using correct paths

## Usage Examples

### Correct ✅
```typescript
// Feature routes
fetch('/api/social-integration/linkedin/status')
fetch('/api/voice-agent/calls/recent')
fetch('/api/apollo-leads/search')
fetch('/api/campaigns')

// Core routes
fetch('/api/auth/login')
fetch('/api/users/me')
```

### Incorrect ❌
```typescript
// These no longer exist
fetch('/api/linkedin/status')
fetch('/api/call-logs')
```

## Benefits

1. **Single Source of Truth** - One proxy file handles all features
2. **Automatic Feature Support** - New backend features work immediately
3. **Clean Codebase** - Fewer files, clearer structure
4. **Easy Debugging** - Feature names visible in network tab
5. **Future-Proof** - Scales naturally with backend

## Adding New Features

To add a new feature:

1. **Backend:** Create feature in `/backend/features/{feature-name}/`
2. **Backend:** Add `manifest.js` with feature metadata
3. **Frontend:** Nothing! Universal proxy handles it automatically

## Troubleshooting

### 404 on Feature Route
1. Check backend feature is loaded (check backend logs)
2. Verify feature has `manifest.js` with correct `key`
3. Check FeatureRegistry discovery in backend startup logs

### Auth Issues
1. Verify token is passed in Authorization header
2. Check cookie `access_token` is set
3. Test with backend health check endpoint first

### Network Errors
1. Check `BACKEND_INTERNAL_URL` environment variable
2. Verify backend is running on port 3004
3. Check network tab for actual request URL
