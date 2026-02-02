# Environment Configuration Guide

This document explains how the unified environment-based configuration system works in the LAD Frontend application.

## Overview

The application now uses a **unified configuration system** located in `sdk/shared/config.ts` that serves both the SDK and web application. This ensures consistent configuration across all parts of the application.

## Configuration Files

### Unified Configuration
- `sdk/shared/config.ts` - **Primary unified configuration** (used by both SDK and Web)
- `web/src/config/env.ts` - Wrapper that re-exports from shared config (for backward compatibility)

### Environment Files
- `.env` - Base environment file (loaded in all environments)
- `.env.development` - Development-specific variables
- `.env.production` - Production-specific variables
- `.env.production.template` - Template for production deployment

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Current environment | `development`, `production`, `stage`, `local`, `test` |
| `NEXT_PUBLIC_BACKEND_URL` | Primary backend URL (without /api) | `http://localhost:3004` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_ICP_BACKEND_URL` | ICP service backend URL | Same as `NEXT_PUBLIC_BACKEND_URL` |
| `NEXT_PUBLIC_CAMPAIGN_BACKEND_URL` | Campaign service backend URL | Same as `NEXT_PUBLIC_BACKEND_URL` |
| `BACKEND_INTERNAL_URL` | Server-side API URL | Same as `NEXT_PUBLIC_BACKEND_URL` |
| `NEXT_PUBLIC_API_URL` | Alternative API URL (with /api suffix) | `${NEXT_PUBLIC_BACKEND_URL}/api` |

## How It Works

1. **Unified Configuration**: All configuration logic is centralized in `sdk/shared/config.ts`.

2. **Automatic Environment Detection**: The system automatically detects the current environment (`NODE_ENV`).

3. **Default URL Resolution**: If environment variables are not set, the system provides sensible defaults:
   - Local: `http://localhost:3004`
   - Development: `https://lad-backend-develop-741719885039.us-central1.run.app`
   - Stage: `https://lad-backend-stage-741719885039.us-central1.run.app`
   - Production: `https://lad-backend-741719885039.us-central1.run.app`

4. **API URL Construction**: The system automatically appends `/api` to backend URLs when needed.

5. **Shared Across SDK and Web**: Both the SDK and web application use the same configuration source.

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Current environment | `development`, `production`, `test` |
| `NEXT_PUBLIC_BACKEND_URL` | Primary backend URL (without /api) | `http://localhost:3004` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_ICP_BACKEND_URL` | ICP service backend URL | Same as `NEXT_PUBLIC_BACKEND_URL` |
| `NEXT_PUBLIC_CAMPAIGN_BACKEND_URL` | Campaign service backend URL | Same as `NEXT_PUBLIC_BACKEND_URL` |
| `BACKEND_INTERNAL_URL` | Server-side API URL | Same as `NEXT_PUBLIC_BACKEND_URL` |
| `NEXT_PUBLIC_API_URL` | Alternative API URL (with /api suffix) | `${NEXT_PUBLIC_BACKEND_URL}/api` |

## How It Works

1. **Automatic Environment Detection**: The configuration system automatically detects the current environment (`NODE_ENV`).

2. **Default URL Resolution**: If environment variables are not set, the system provides sensible defaults:
   - Development: `http://localhost:3004`
   - Production: `https://lad-backend-develop-741719885039.us-central1.run.app`

3. **API URL Construction**: The system automatically appends `/api` to backend URLs when needed, ensuring consistency across the application.

4. **Centralized Configuration**: All backend URLs are managed through centralized configuration modules.

## Usage Examples

### Development Setup
```bash
# Copy the development template
cp .env.development .env

# Or set your own development URLs
NEXT_PUBLIC_BACKEND_URL=http://localhost:3004
```

### Production Deployment
```bash
# Copy the production template
cp .env.production .env

# Or set your production URLs
NEXT_PUBLIC_BACKEND_URL=https://your-production-backend.com
```

### Custom Environment
```bash
# Set custom backend URL
NEXT_PUBLIC_BACKEND_URL=https://staging.yourapp.com

# Different services can use different URLs if needed
NEXT_PUBLIC_ICP_BACKEND_URL=https://icp-staging.yourapp.com
NEXT_PUBLIC_CAMPAIGN_BACKEND_URL=https://campaign-staging.yourapp.com
```

## Configuration in Code

### Unified Configuration (Recommended)
```typescript
import { envConfig } from '../../../../sdk/shared/config';

// Access configuration from anywhere in the app
console.log(envConfig.API_URL);                // http://localhost:3004/api
console.log(envConfig.BACKEND_URL);             // http://localhost:3004
console.log(envConfig.NODE_ENV);                // development
console.log(envConfig.CAMPAIGN_BACKEND_URL);    // http://localhost:3004
console.log(envConfig.BACKEND_INTERNAL_URL);    // http://localhost:3004
```

### Web Application (Backward Compatible)
```typescript
import { envConfig } from '../config/env';

// This now imports from the unified config
console.log(envConfig.API_URL);        // http://localhost:3004/api
console.log(envConfig.BACKEND_URL);    // http://localhost:3004
```

### SDK
```typescript
import { envConfig } from '../shared/config';

// Direct access to unified configuration
console.log(envConfig.API_URL);     // http://localhost:3004/api
console.log(envConfig.BACKEND_URL); // http://localhost:3004
```

## Migration from Old System

The new unified configuration system is backward compatible:

- **Unified Configuration**: All logic is now in `sdk/shared/config.ts`
- **Web Config Wrapper**: `web/src/config/env.ts` now re-exports from the shared config
- **SDK Config**: Now uses the same unified configuration
- **Environment Variables**: All existing environment variables continue to work
- **Import Paths**: Existing imports continue to work, but consider migrating to the unified config

### Recommended Migration

**Before:**
```typescript
// Web app
import { envConfig } from '../config/env';
// SDK  
import { sdkEnvConfig } from '../shared/config';
```

**After (Recommended):**
```typescript
// Both web app and SDK
import { envConfig } from '../../../sdk/shared/config'; // from web app
import { envConfig } from '../shared/config';           // from SDK
```

## Troubleshooting

### Common Issues

1. **Environment variables not loading**: Make sure your `.env` file is in the correct directory (`web/.env`).

2. **Wrong backend URL in production**: Verify that `NEXT_PUBLIC_BACKEND_URL` is set in your production environment.

3. **API calls failing**: Check that the backend URL is accessible and that the `/api` suffix is being appended correctly.

### Debug Mode

In development, the configuration system logs the current settings to help with debugging:

```
🔧 Environment Configuration: {
  NODE_ENV: 'development',
  BACKEND_URL: 'http://localhost:3004',
  API_URL: 'http://localhost:3004/api',
  ...
}
```

## Best Practices

1. **Use unified config**: Always import configuration from `sdk/shared/config.ts` for new code.

2. **Use environment-specific files**: Keep development and production configurations separate.

3. **Don't commit sensitive data**: Use `.env.local` for local development secrets.

4. **Validate in production**: The system automatically warns if required variables are missing in production.

5. **Consistent imports**: Use the unified configuration to ensure consistency across SDK and web app.