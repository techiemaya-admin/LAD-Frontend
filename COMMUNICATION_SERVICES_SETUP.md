# Communication Services Integration Guide

## Overview

The frontend now integrates with the Unified Communications Service (WhatsApp API) for messaging and conversation features.

## Environment Variables

### Development (`web/.env`)
```env
NEXT_PUBLIC_WHATSAPP_API_URL=http://localhost:8000
NEXT_PUBLIC_COMMS_SERVICE_URL=http://localhost:8000
WHATSAPP_SERVICE_URL=http://localhost:8000
```

### Production (`web/.env.production.template`)
```env
NEXT_PUBLIC_WHATSAPP_API_URL=https://unified-comms-kunfx3bnvq-uc.a.run.app
NEXT_PUBLIC_COMMS_SERVICE_URL=https://unified-comms-kunfx3bnvq-uc.a.run.app
WHATSAPP_SERVICE_URL=https://unified-comms-kunfx3bnvq-uc.a.run.app
```

## Service URL Utilities

The `sdk/shared/service-urls.ts` file provides helper functions to access service URLs with proper fallbacks:

### Client-Side Usage
```typescript
import { getWhatsAppServiceUrl, getApiUrl, getServiceUrl } from '@lad/frontend-features/shared/service-urls';

// Get WhatsApp service URL
const whatsappUrl = getWhatsAppServiceUrl();

// Get main API URL
const apiUrl = getApiUrl();

// Get any service URL
const url = getServiceUrl('whatsapp'); // or 'api', 'icp'

// Build complete endpoint
import { buildServiceEndpoint } from '@lad/frontend-features/shared/service-urls';
const endpoint = buildServiceEndpoint('whatsapp', '/conversations');
```

### Server-Side Usage (Next.js API Routes)
The functions automatically detect server-side execution and use:
- `process.env.NEXT_PUBLIC_WHATSAPP_API_URL` (preferred)
- `process.env.NEXT_PUBLIC_COMMS_SERVICE_URL` (alternative)
- `process.env.WHATSAPP_SERVICE_URL` (fallback)

## Docker Build Args

The Dockerfile supports these build arguments for the communication services:

```dockerfile
ARG NEXT_PUBLIC_WHATSAPP_API_URL
ARG NEXT_PUBLIC_COMMS_SERVICE_URL
```

## Cloud Build Configuration

### Development Build (cloudbuild-develop.yaml)
```yaml
--build-arg NEXT_PUBLIC_WHATSAPP_API_URL=https://unified-comms-kunfx3bnvq-uc.a.run.app
--build-arg NEXT_PUBLIC_COMMS_SERVICE_URL=https://unified-comms-kunfx3bnvq-uc.a.run.app
```

### Cloud Run Deployment
Environment variables are set at deployment time:
```bash
gcloud run deploy lad-frontend-develop \
  --update-env-vars="NEXT_PUBLIC_WHATSAPP_API_URL=https://unified-comms-kunfx3bnvq-uc.a.run.app" \
  --project=salesmaya-pluto \
  --region=us-central1
```

## Service Configuration Priority

For WhatsApp/Communications Service:
1. `NEXT_PUBLIC_WHATSAPP_API_URL` (preferred)
2. `NEXT_PUBLIC_COMMS_SERVICE_URL` (alternative)
3. `WHATSAPP_SERVICE_URL` (server-side fallback)
4. `http://localhost:8000` (development default)

For Main API:
1. `NEXT_PUBLIC_BACKEND_URL` (preferred)
2. `NEXT_PUBLIC_API_URL` (legacy fallback)
3. `http://localhost:3004` (development default)

## Implementation Checklist

- [x] Add `service-urls.ts` utility functions
- [x] Update `.env` with WhatsApp URL variables
- [x] Update `.env.production.template` with WhatsApp URL variables
- [x] Update `Dockerfile` with build args for WhatsApp URLs
- [x] Update `cloudbuild-develop.yaml` with WhatsApp build args and env vars
- [ ] Update `cloudbuild-stage.yaml` (if applicable)
- [ ] Update production `cloudbuild.yaml` (if applicable)
- [ ] Update any WhatsApp/Conversations API client to use `getWhatsAppServiceUrl()`

## Using the Service URLs in Features

Example: WhatsApp Conversations Feature
```typescript
import { buildServiceEndpoint } from '@lad/frontend-features/shared/service-urls';

const endpoint = buildServiceEndpoint('whatsapp', '/conversations');
const response = await fetch(endpoint, {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});
```
