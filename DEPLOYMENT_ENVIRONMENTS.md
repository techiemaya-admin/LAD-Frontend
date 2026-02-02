# LAD Deployment Environments

## Overview

LAD Frontend supports multiple deployment environments:
- **Development** - For active development
- **Staging** - Pre-production testing
- **Production** - Live production environment

## Environment Configuration

| Environment | Service Name | Backend URL | Config File |
|------------|--------------|-------------|-------------|
| Development | lad-frontend-develop | https://lad-backend-develop-741719885039.us-central1.run.app | web/cloudbuild.yaml |
| Staging | lad-frontend-stage | https://lad-backend-stage-741719885039.us-central1.run.app | web/cloudbuild-stage.yaml |
| Production | lad-frontend | https://lad-backend-741719885039.us-central1.run.app | web/cloudbuild-prod.yaml |

## Deployment Scripts

### Development Environment
```bash
cd web
./deploy-cloudrun.sh
```

### Staging Environment
```bash
cd web
chmod +x deploy-stage.sh
./deploy-stage.sh
```

### Production Environment
```bash
cd web
chmod +x deploy-prod.sh
./deploy-prod.sh
```

## Manual Deployment with gcloud

### Deploy to Staging
```bash
cd /Users/naveenreddy/Desktop/AI-Maya/LAD/LAD-Web/LAD-Frontend

gcloud builds submit \
  --config=web/cloudbuild-stage.yaml \
  --project=salesmaya-pluto \
  --substitutions=_API_URL=https://lad-backend-stage-741719885039.us-central1.run.app \
  .
```

### Deploy to Production
```bash
cd /Users/naveenreddy/Desktop/AI-Maya/LAD/LAD-Web/LAD-Frontend

gcloud builds submit \
  --config=web/cloudbuild-prod.yaml \
  --project=salesmaya-pluto \
  --substitutions=_API_URL=https://lad-backend-741719885039.us-central1.run.app \
  .
```

## Environment Variables

### Staging Environment
```bash
NODE_ENV=staging
ENVIRONMENT=staging
NEXT_PUBLIC_BACKEND_URL=https://lad-backend-stage-741719885039.us-central1.run.app
NEXT_PUBLIC_SOCKET_URL=https://lad-backend-stage-741719885039.us-central1.run.app
```

### Production Environment
```bash
NODE_ENV=production
ENVIRONMENT=production
NEXT_PUBLIC_BACKEND_URL=https://lad-backend-741719885039.us-central1.run.app
NEXT_PUBLIC_SOCKET_URL=https://lad-backend-741719885039.us-central1.run.app
```

## Cloud Run Service URLs

After deployment, access your services:

- **Staging**: https://lad-frontend-stage-{PROJECT_NUMBER}.{REGION}.run.app
- **Production**: https://lad-frontend-{PROJECT_NUMBER}.{REGION}.run.app

Get actual URLs:
```bash
# Staging
gcloud run services describe lad-frontend-stage --region=us-central1 --format="value(status.url)"

# Production
gcloud run services describe lad-frontend --region=us-central1 --format="value(status.url)"
```

## Resource Limits

### Staging
- Memory: 2Gi
- CPU: 2
- Max Instances: 5 (cost-efficient for testing)
- Min Instances: 0 (scale to zero)
- Concurrency: 80

### Production
- Memory: 2Gi
- CPU: 2
- Max Instances: 10 (handle more traffic)
- Min Instances: 0
- Concurrency: 80

## Promotion Flow

Recommended promotion path:

```
Local Development
    ↓
    git push origin develop
    ↓
Development Environment (auto-deploy from develop branch)
    ↓
    Manual Testing
    ↓
    git checkout stage
    git merge develop
    git push origin stage
    ↓
Staging Environment (manual deploy)
    ↓
    QA Testing / Stakeholder Review
    ↓
    git checkout main
    git merge stage
    git push origin main
    ↓
Production Environment (manual deploy with approval)
```

## CI/CD Triggers

### Automatic Triggers (Optional Setup)

Configure Cloud Build triggers in Google Cloud Console:

1. **Development Trigger**
   - Branch: `^develop$`
   - Config: `web/cloudbuild.yaml`
   - Auto-deploy on push to develop

2. **Staging Trigger**
   - Branch: `^stage$`
   - Config: `web/cloudbuild-stage.yaml`
   - Manual approval required

3. **Production Trigger**
   - Branch: `^main$` or `^master$`
   - Config: `web/cloudbuild-prod.yaml`
   - Manual approval required

### Setup Triggers
```bash
# Create staging trigger
gcloud builds triggers create github \
  --name="lad-frontend-stage" \
  --repo-name="LAD-Web" \
  --repo-owner="your-github-org" \
  --branch-pattern="^stage$" \
  --build-config="LAD-Frontend/web/cloudbuild-stage.yaml" \
  --require-approval

# Create production trigger
gcloud builds triggers create github \
  --name="lad-frontend-production" \
  --repo-name="LAD-Web" \
  --repo-owner="your-github-org" \
  --branch-pattern="^main$" \
  --build-config="LAD-Frontend/web/cloudbuild-prod.yaml" \
  --require-approval
```

## Monitoring & Logs

### View Staging Logs
```bash
gcloud logs read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=lad-frontend-stage" \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)"
```

### View Production Logs
```bash
gcloud logs read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=lad-frontend" \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)"
```

### Monitor Deployments
```bash
# List recent builds
gcloud builds list --limit=10

# Follow specific build
gcloud builds log <BUILD_ID> --stream
```

## Rollback

### Rollback Staging
```bash
# List revisions
gcloud run revisions list --service=lad-frontend-stage --region=us-central1

# Rollback to specific revision
gcloud run services update-traffic lad-frontend-stage \
  --to-revisions=lad-frontend-stage-00001-abc=100 \
  --region=us-central1
```

### Rollback Production
```bash
# List revisions
gcloud run revisions list --service=lad-frontend --region=us-central1

# Rollback to specific revision
gcloud run services update-traffic lad-frontend \
  --to-revisions=lad-frontend-00001-xyz=100 \
  --region=us-central1
```

## Traffic Splitting (Canary Deployment)

Deploy new version with gradual traffic shift:

```bash
# Deploy new revision without traffic
gcloud run deploy lad-frontend \
  --image=gcr.io/salesmaya-pluto/lad-frontend:new-version \
  --no-traffic \
  --region=us-central1

# Get revision name
LATEST_REVISION=$(gcloud run services describe lad-frontend \
  --region=us-central1 \
  --format="value(status.latestReadyRevisionName)")

# Split traffic 90/10
gcloud run services update-traffic lad-frontend \
  --to-revisions=$LATEST_REVISION=10 \
  --to-revisions=LATEST=90 \
  --region=us-central1

# If stable, send 100% to new version
gcloud run services update-traffic lad-frontend \
  --to-latest \
  --region=us-central1
```

## Cost Optimization

- Staging scales to 0 when idle (no cost when not in use)
- Lower max instances for staging (5 vs 10)
- Use labels to track costs per environment

View costs by environment:
```bash
# Export billing data with labels
gcloud billing accounts list
```

## Security

- All environments require authentication by default
- Use `--allow-unauthenticated` only for public-facing services
- Set up Cloud Armor for production DDoS protection
- Enable VPC Service Controls for sensitive data

## Health Checks

Both environments expose health check endpoints:

```bash
# Check staging health
curl https://lad-frontend-stage-[PROJECT_ID].[REGION].run.app/health

# Check production health
curl https://lad-frontend-[PROJECT_ID].[REGION].run.app/health
```

## Troubleshooting

### Build Fails
```bash
# View build logs
gcloud builds log <BUILD_ID>

# Check build history
gcloud builds list --limit=5
```

### Service Not Responding
```bash
# Check service status
gcloud run services describe lad-frontend-stage --region=us-central1

# View error logs
gcloud logs read "resource.type=cloud_run_revision AND severity=ERROR" --limit=20
```

### Deployment Stuck
```bash
# Check deployment status
gcloud run services list --region=us-central1

# Force new deployment
gcloud run deploy lad-frontend-stage \
  --image=gcr.io/salesmaya-pluto/lad-frontend-stage:latest \
  --region=us-central1
```

## Best Practices

1. **Always test in staging before production**
2. **Use semantic versioning for image tags**
3. **Keep environment variables in substitutions**
4. **Monitor logs after deployment**
5. **Set up alerts for error rates**
6. **Document all manual steps**
7. **Use rollback if issues detected**
8. **Test rollback procedure regularly**

## Quick Reference

| Task | Command |
|------|---------|
| Deploy Staging | `./web/deploy-stage.sh` |
| View Staging URL | `gcloud run services describe lad-frontend-stage --region=us-central1 --format="value(status.url)"` |
| View Staging Logs | `gcloud logs read "resource.labels.service_name=lad-frontend-stage" --limit=50` |
| Rollback Staging | Use `./web/deploy-stage.sh` and select option 5 |
| List Builds | `gcloud builds list --limit=10` |
