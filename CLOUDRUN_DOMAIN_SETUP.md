# Cloud Run Custom Domain Setup Guide

## Connecting Custom Domains to Cloud Run

This guide shows how to connect **agent.techiemaya.com**, **mrlad.ai**, and **ladsales.com** to your Cloud Run service.

## Prerequisites

- ✅ Cloud Run service deployed (lad-frontend)
- ✅ Domain ownership verified in Google Cloud Console
- ✅ Access to domain DNS settings

## Architecture

```
Custom Domains → Cloud Load Balancer → Cloud Run Service
   ↓
agent.techiemaya.com
mrlad.ai
ladsales.com
```

**Cloud Run handles:**
- ✅ SSL certificates (auto-provisioned)
- ✅ HTTPS redirect
- ✅ Load balancing
- ✅ Auto-scaling
- ✅ CDN (optional)

## Step 1: Deploy Your Application to Cloud Run

```bash
cd /Users/naveenreddy/Desktop/AI-Maya/LAD/LAD-Web/LAD-Frontend/web

# Make script executable
chmod +x deploy-cloudrun.sh

# Deploy
./deploy-cloudrun.sh
# Select option 1 (Manual deployment)
```

Or deploy directly:
```bash
cd /Users/naveenreddy/Desktop/AI-Maya/LAD/LAD-Web/LAD-Frontend

gcloud builds submit \
  --config=web/cloudbuild.yaml \
  --project=salesmaya-pluto \
  .
```

## Step 2: Map Custom Domains (Using gcloud CLI)

### Option A: Using gcloud Command (Recommended)

```bash
# Set your project
gcloud config set project salesmaya-pluto

# Map first domain
gcloud run domain-mappings create \
  --service=lad-frontend \
  --domain=agent.techiemaya.com \
  --region=us-central1

# Map second domain
gcloud run domain-mappings create \
  --service=lad-frontend \
  --domain=mrlad.ai \
  --region=us-central1

# Map third domain
gcloud run domain-mappings create \
  --service=lad-frontend \
  --domain=ladsales.com \
  --region=us-central1
```

The command will output DNS records you need to add. They'll look like:
```
Please add the following DNS records to your domain registrar:
  
  NAME                    TYPE     DATA
  agent.techiemaya.com    A        216.239.32.21
  agent.techiemaya.com    A        216.239.34.21
  agent.techiemaya.com    A        216.239.36.21
  agent.techiemaya.com    A        216.239.38.21
  agent.techiemaya.com    AAAA     2001:4860:4802:32::15
  agent.techiemaya.com    AAAA     2001:4860:4802:34::15
  agent.techiemaya.com    AAAA     2001:4860:4802:36::15
  agent.techiemaya.com    AAAA     2001:4860:4802:38::15
```

### Option B: Using Google Cloud Console

1. Go to Cloud Run: https://console.cloud.google.com/run
2. Select your service: **lad-frontend**
3. Click **"MANAGE CUSTOM DOMAINS"** at the top
4. Click **"ADD MAPPING"**
5. Select your Cloud Run service
6. Enter domain name (e.g., agent.techiemaya.com)
7. Click **"CONTINUE"**
8. Copy the DNS records shown
9. Repeat for each domain

## Step 3: Update DNS Records

Add the DNS records provided by Cloud Run to your domain registrar.

### For agent.techiemaya.com

Add these records at your DNS provider (GoDaddy, Namecheap, Cloudflare, etc.):

```
Type: A
Name: @
Value: 216.239.32.21

Type: A
Name: @
Value: 216.239.34.21

Type: A
Name: @
Value: 216.239.36.21

Type: A
Name: @
Value: 216.239.38.21

Type: AAAA
Name: @
Value: 2001:4860:4802:32::15

Type: AAAA
Name: @
Value: 2001:4860:4802:34::15

Type: AAAA
Name: @
Value: 2001:4860:4802:36::15

Type: AAAA
Name: @
Value: 2001:4860:4802:38::15
```

**Note:** Actual IP addresses will be provided by the `gcloud run domain-mappings create` command.

### Repeat for mrlad.ai and ladsales.com

Add the same A and AAAA records for each domain.

## Step 4: Verify Domain Mapping Status

```bash
# Check domain mapping status
gcloud run domain-mappings describe \
  --domain=agent.techiemaya.com \
  --region=us-central1

# List all domain mappings
gcloud run domain-mappings list \
  --region=us-central1
```

You can also check in the Cloud Console:
https://console.cloud.google.com/run/domains?project=salesmaya-pluto

## Step 5: Wait for SSL Certificate Provisioning

- DNS propagation: **5 minutes to 48 hours** (usually 15-30 minutes)
- SSL certificate: **15 minutes to 24 hours** after DNS propagates

Check certificate status:
```bash
gcloud run domain-mappings describe \
  --domain=agent.techiemaya.com \
  --region=us-central1 \
  --format="value(status.resourceRecords)"
```

## Step 6: Test Your Domains

Once SSL is provisioned:

```bash
# Test each domain
curl -I https://agent.techiemaya.com
curl -I https://mrlad.ai
curl -I https://ladsales.com

# Test SSL certificate
openssl s_client -connect agent.techiemaya.com:443 -servername agent.techiemaya.com
```

## Quick Setup Script

Create a file `setup-domains.sh`:

```bash
#!/bin/bash

PROJECT_ID="salesmaya-pluto"
SERVICE_NAME="lad-frontend"
REGION="us-central1"
DOMAINS=("agent.techiemaya.com" "mrlad.ai" "ladsales.com")

echo "🌐 Setting up custom domains for Cloud Run..."
echo ""

gcloud config set project $PROJECT_ID

for DOMAIN in "${DOMAINS[@]}"; do
    echo "📌 Mapping domain: $DOMAIN"
    gcloud run domain-mappings create \
        --service=$SERVICE_NAME \
        --domain=$DOMAIN \
        --region=$REGION
    echo ""
done

echo "✅ Domain mapping initiated!"
echo ""
echo "Next steps:"
echo "1. Add the DNS records shown above to your domain registrar"
echo "2. Wait for DNS propagation (15-30 minutes)"
echo "3. SSL certificates will be auto-provisioned"
echo ""
echo "Check status with:"
echo "gcloud run domain-mappings list --region=$REGION"
```

## Environment Variables for Cloud Run

Update your backend URL environment variables:

```bash
# In cloudbuild.yaml, update build args:
--build-arg NEXT_PUBLIC_BACKEND_URL=https://agent.techiemaya.com/api
--build-arg NEXT_PUBLIC_SOCKET_URL=wss://agent.techiemaya.com
```

Or set them as Cloud Run environment variables:

```bash
gcloud run services update lad-frontend \
  --region=us-central1 \
  --update-env-vars NEXT_PUBLIC_BACKEND_URL=https://agent.techiemaya.com/api,NEXT_PUBLIC_SOCKET_URL=wss://agent.techiemaya.com
```

## Troubleshooting

### DNS Not Propagating

```bash
# Check DNS propagation
dig agent.techiemaya.com
nslookup agent.techiemaya.com

# Use online tools
# - https://www.whatsmydns.net/
# - https://dnschecker.org/
```

### SSL Certificate Pending

```bash
# Check certificate status
gcloud run domain-mappings describe \
  --domain=agent.techiemaya.com \
  --region=us-central1

# Common reasons:
# - DNS not propagated yet
# - CAA records blocking Let's Encrypt
# - Domain not verified in Google Cloud Console
```

### Domain Verification Required

```bash
# Verify domain ownership
gcloud domains verify agent.techiemaya.com
```

Or verify in Google Search Console:
https://search.google.com/search-console

### 404 Errors After Mapping

```bash
# Ensure service is running
gcloud run services describe lad-frontend --region=us-central1

# Check logs
gcloud logs read "resource.type=cloud_run_revision" --limit=50
```

## Managing Domains

### List All Domain Mappings

```bash
gcloud run domain-mappings list --region=us-central1
```

### Update Domain Mapping

```bash
gcloud run domain-mappings update \
  --domain=agent.techiemaya.com \
  --region=us-central1
```

### Delete Domain Mapping

```bash
gcloud run domain-mappings delete \
  --domain=agent.techiemaya.com \
  --region=us-central1
```

## Advanced: Add www Subdomain

```bash
# Map www subdomain
gcloud run domain-mappings create \
  --service=lad-frontend \
  --domain=www.agent.techiemaya.com \
  --region=us-central1
```

Then add DNS records for www subdomain.

## Backend Domain Mapping

Don't forget to map domains to your backend service too:

```bash
gcloud run domain-mappings create \
  --service=lad-backend \
  --domain=api.agent.techiemaya.com \
  --region=us-central1
```

Update frontend to use:
```
NEXT_PUBLIC_BACKEND_URL=https://api.agent.techiemaya.com
```

## Cost Considerations

- **Domain Mappings**: Free
- **SSL Certificates**: Free (managed by Google)
- **Cloud Load Balancer**: ~$18/month + data transfer
- **Cloud Run**: Pay per request/CPU time

## Security Best Practices

1. **Enable Cloud Armor** (optional DDoS protection)
2. **Set up Cloud CDN** for static assets
3. **Configure IAM** properly
4. **Monitor with Cloud Monitoring**
5. **Enable Cloud Logging**

## Monitoring

```bash
# View service URL
gcloud run services describe lad-frontend \
  --region=us-central1 \
  --format="value(status.url)"

# Monitor traffic
gcloud monitoring dashboards list

# Check logs
gcloud logs tail \
  "resource.type=cloud_run_revision AND resource.labels.service_name=lad-frontend"
```

## Quick Reference

| Task | Command |
|------|---------|
| Deploy service | `./deploy-cloudrun.sh` |
| Map domain | `gcloud run domain-mappings create --service=lad-frontend --domain=example.com --region=us-central1` |
| List domains | `gcloud run domain-mappings list --region=us-central1` |
| Check status | `gcloud run domain-mappings describe --domain=example.com --region=us-central1` |
| Delete mapping | `gcloud run domain-mappings delete --domain=example.com --region=us-central1` |
| View logs | `gcloud logs read "resource.type=cloud_run_revision" --limit=50` |

## Resources

- Cloud Run Custom Domains: https://cloud.google.com/run/docs/mapping-custom-domains
- Domain Verification: https://cloud.google.com/storage/docs/domain-name-verification
- SSL Certificates: https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Cloud Run Docs: https://cloud.google.com/run/docs
