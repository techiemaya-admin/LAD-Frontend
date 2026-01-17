# Frontend Deployment Guide

## Overview
The LAD frontend is a Next.js 15.5.9 application deployed to Google Cloud Run with automated CI/CD from GitHub.

## Deployment URLs
- **Production**: https://lad-frontend-3nddlneyya-uc.a.run.app
- **Health Endpoint**: https://lad-frontend-3nddlneyya-uc.a.run.app/api/health
- **Backend API**: https://lad-backend-3nddlneyya-uc.a.run.app

## Architecture
- **Next.js**: Version 15.5.9 with Turbopack
- **Output Mode**: Standalone (optimized for Docker)
- **Container**: Node.js 18 Alpine
- **Port**: 3000
- **Resources**: 2 vCPU, 2 GB RAM
- **Auto-scaling**: 0-10 instances

## CI/CD Pipeline

### Trigger
Pushes to the `develop` branch automatically trigger Cloud Build.

### Build Steps
1. **Install Dependencies**: Installs npm packages for both `web` and `sdk` directories
2. **Generate Prisma Client**: If Prisma is configured
3. **Build Next.js**: Creates optimized production build with standalone output
4. **Build Docker Image**: Multi-stage build for minimal image size
5. **Push to GCR**: Tags with commit SHA, short SHA, branch name, and latest
6. **Deploy to Cloud Run**: Automatic deployment with zero-downtime updates

### Build Configuration
- **Dockerfile**: `web/Dockerfile` (multi-stage build)
- **Cloud Build Config**: `cloudbuild.yaml` (repository root)
- **Container Registry**: `gcr.io/salesmaya-pluto/lad-frontend`

## Docker Configuration

### Multi-Stage Build
1. **Base**: Node.js 18 Alpine
2. **Deps**: Installs dependencies with `npm ci`
3. **Builder**: Generates Prisma client, builds Next.js app
4. **Runner**: Production image with standalone output

### Image Optimization
- Uses `.dockerignore` to exclude unnecessary files
- Multi-stage build reduces final image size
- Only production dependencies included
- Static assets and public files copied separately

## Next.js Configuration

### Important Settings
```javascript
// next.config.mjs
{
  output: 'standalone', // Required for Docker deployment
  turbopack: {
    root: process.env.NODE_ENV === 'production' ? '.' : '../..'
  }
}
```

### Standalone Output
Next.js standalone mode creates a minimal production build:
- `server.js` - Entry point
- `node_modules/` - Only required dependencies
- `.next/` - Built pages and assets
- `package.json` - Production dependencies list

The standalone output requires copying:
1. `.next/standalone/` → Container root
2. `.next/static/` → `.next/static/`
3. `public/` → `public/`

## Environment Variables

### Build-time
- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1`

### Runtime (Cloud Run)
- `NODE_ENV=production`
- `BRANCH` - Git branch name
- `COMMIT_SHA` - Full commit SHA
- `BUILD_ID` - Cloud Build ID
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `PORT=3000` - Container port (set by Cloud Run)
- `HOSTNAME=0.0.0.0` - Listen on all interfaces

## Health Checks

### Endpoint
- **URL**: `/api/health`
- **Method**: GET
- **Response**: 
```json
{
  "status": "healthy",
  "timestamp": "2025-12-22T04:17:42.105Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### Cloud Run Probes
- **Startup Probe**: TCP on port 3000, 240s timeout
- **Timeout**: 4 minutes for container startup

## Repository Structure

```
frontend/
├── cloudbuild.yaml       # CI/CD configuration (at root)
├── sdk/                  # Shared SDK package
│   ├── package.json
│   └── ...
└── web/                  # Next.js application
    ├── Dockerfile        # Multi-stage Docker build
    ├── .dockerignore     # Exclude from Docker context
    ├── next.config.mjs   # Next.js configuration
    ├── package.json      # Dependencies
    ├── package-lock.json # Lock file for npm ci
    └── ...
```

## Manual Deployment

### Prerequisites
```bash
# Install gcloud CLI and authenticate
gcloud auth login
gcloud config set project salesmaya-pluto
```

### Build and Deploy
```bash
# From repository root
gcloud builds submit \
  --config=cloudbuild.yaml \
  --project=salesmaya-pluto
```

### Deploy Specific Image
```bash
gcloud run deploy lad-frontend \
  --image=gcr.io/salesmaya-pluto/lad-frontend:latest \
  --platform=managed \
  --region=us-central1 \
  --project=salesmaya-pluto
```

## Troubleshooting

### Container Won't Start
1. Check logs: `gcloud logging read "resource.type=cloud_run_revision"`
2. Verify standalone structure: Build locally and check `.next/standalone/`
3. Ensure turbopack.root is set correctly for production
4. Verify Dockerfile COPY paths match standalone output

### Build Failures
1. Check Cloud Build logs: `gcloud builds log <BUILD_ID>`
2. Verify package-lock.json exists and is committed
3. Check Prisma schema if using database
4. Ensure all dependencies are in package.json

### 403 Forbidden Errors
Grant public access:
```bash
gcloud run services add-iam-policy-binding lad-frontend \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/run.invoker \
  --project=salesmaya-pluto
```

### Environment Variable Issues
Update service with new variables:
```bash
gcloud run services update lad-frontend \
  --region=us-central1 \
  --set-env-vars="KEY=VALUE" \
  --project=salesmaya-pluto
```

## Monitoring

### View Logs
```bash
# Recent logs
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=lad-frontend" \
  --limit=50 \
  --project=salesmaya-pluto

# Error logs
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=lad-frontend \
  AND severity>=ERROR" \
  --limit=20 \
  --project=salesmaya-pluto
```

### Service Status
```bash
gcloud run services describe lad-frontend \
  --region=us-central1 \
  --project=salesmaya-pluto
```

### List Revisions
```bash
gcloud run revisions list \
  --service=lad-frontend \
  --region=us-central1 \
  --project=salesmaya-pluto
```

## Rollback

### To Previous Revision
```bash
# List revisions
gcloud run revisions list --service=lad-frontend --region=us-central1

# Route 100% traffic to specific revision
gcloud run services update-traffic lad-frontend \
  --to-revisions=lad-frontend-00004-x4c=100 \
  --region=us-central1 \
  --project=salesmaya-pluto
```

### To Specific Git Commit
```bash
# Find the image SHA for the commit
gcloud container images list-tags gcr.io/salesmaya-pluto/lad-frontend

# Deploy specific image
gcloud run deploy lad-frontend \
  --image=gcr.io/salesmaya-pluto/lad-frontend:COMMIT_SHA \
  --region=us-central1 \
  --project=salesmaya-pluto
```

## Performance Optimization

### Current Settings
- **Min Instances**: 0 (scales to zero when idle)
- **Max Instances**: 10
- **CPU**: 2 vCPU (always allocated)
- **Memory**: 2 GB
- **Concurrency**: 80 requests per instance
- **Startup CPU Boost**: Enabled

### Recommendations
- Consider min instances = 1 for faster cold starts in production
- Monitor memory usage and adjust if needed
- Use CDN for static assets for better performance
- Enable request throttling if needed

## Security

### IAM
Service account: `741719885039-compute@developer.gserviceaccount.com`

### Network
- HTTPS only
- Cloud Run managed certificates
- HTTP/2 enabled

### Best Practices
- Keep dependencies updated
- Use secrets for sensitive data
- Implement rate limiting
- Enable Cloud Armor for DDoS protection
- Use VPC connector if accessing private resources

## Cost Optimization

### Current Pricing Factors
- Request/response charges
- CPU time while processing
- Memory usage
- Minimum of 0 instances (no idle charges)

### Tips
- Scale to zero when not in use (current configuration)
- Optimize Next.js bundle size
- Use CDN for static assets
- Consider Cloud Run revisions retention policy
- Monitor and delete old container images

## Related Documentation
- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Configuration](https://cloud.google.com/build/docs/configuring-builds/create-basic-configuration)
- Backend Deployment: [../backend/README-DEPLOYMENT.md](../backend/README-DEPLOYMENT.md)
