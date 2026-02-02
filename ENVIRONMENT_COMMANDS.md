# Environment-Specific Run Commands

This document explains how to run the LAD Frontend application with different environment configurations.

## Available Environments

- **Local**: Development with localhost backend (`NODE_ENV=local`)
- **Development**: Development with remote development backend (`NODE_ENV=development`) 
- **Staging**: Staging environment with staging backend (`NODE_ENV=stage`)
- **Production**: Production environment with production backend (`NODE_ENV=production`)

## Environment Files

- `.env.local` - Local development (localhost:3004)
- `.env.development` - Development environment 
- `.env.staging` - Staging environment
- `.env.production` - Production environment

## Run Commands

### Development Server

```bash
# Default development (uses .env.development)
npm run dev

# Local development (localhost backend)
npm run dev:local

# Staging environment
npm run dev:stage  

# Production environment (for testing)
npm run dev:prod
```

### Build Commands

```bash
# Default build
npm run build

# Environment-specific builds
npm run build:local
npm run build:stage
npm run build:prod
```

### Production Server

```bash
# Default production server
npm run start

# Environment-specific production servers
npm run start:local
npm run start:stage
npm run start:prod
```

## Quick Setup

1. Install dependencies:
```bash
npm install
```

2. Run with your desired environment:
```bash
# For local development
npm run dev:local

# For staging testing
npm run dev:stage

# For production testing
npm run dev:prod
```

## Environment Variables

Each environment automatically loads its corresponding `.env.*` file:

- `dev:local` → `.env.local`
- `dev:stage` → `.env.staging`  
- `dev:prod` → `.env.production`

## Debug Environment

To debug current environment configuration, visit:
```
http://localhost:3000/api/debug/env
```

This endpoint shows:
- Current environment variables
- Resolved configuration
- Backend URLs being used