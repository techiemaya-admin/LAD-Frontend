# How to Check Cloud Run Logs for Voice Agent Issues

## Method 1: Using Google Cloud Console (Web UI)

1. **Open Google Cloud Console:**
   - Go to: https://console.cloud.google.com/logs/query
   - Make sure you're logged in with the correct Google account
   - Select project: `salesmaya-pluto`

2. **Query for Recent Errors:**
   ```
   resource.type = "cloud_run_revision"
   resource.labels.service_name = "lad-backend-develop"
   resource.labels.location = "us-central1"
   severity>=ERROR
   ```

3. **Query for Voice Agent Endpoints:**
   ```
   resource.type = "cloud_run_revision"
   resource.labels.service_name = "lad-backend-develop"
   resource.labels.location = "us-central1"
   httpRequest.requestUrl=~"voice-agent"
   ```

4. **Query for Database Errors (42P01 = undefined table/column):**
   ```
   resource.type = "cloud_run_revision"
   resource.labels.service_name = "lad-backend-develop"
   resource.labels.location = "us-central1"
   textPayload=~"42P01" OR textPayload=~"relation.*does not exist" OR textPayload=~"column.*does not exist"
   ```

5. **Query for Specific Endpoint Errors:**
   ```
   resource.type = "cloud_run_revision"
   resource.labels.service_name = "lad-backend-develop"
   resource.labels.location = "us-central1"
   httpRequest.requestUrl=~"available-numbers"
   httpRequest.status>=400
   ```

## Method 2: Using gcloud CLI

### Step 1: Authenticate
```bash
gcloud auth login
gcloud config set project salesmaya-pluto
```

### Step 2: Run the log checking script
```bash
bash /tmp/check-cloud-logs.sh
```

### Step 3: Check specific endpoint errors
```bash
# Check available-numbers endpoint
gcloud logging read "
  resource.type=\"cloud_run_revision\"
  resource.labels.service_name=\"lad-backend-develop\"
  resource.labels.location=\"us-central1\"
  httpRequest.requestUrl=~\"available-numbers\"
  timestamp>=\"$(date -u -v-15M '+%Y-%m-%dT%H:%M:%SZ')\"
" --format="table(timestamp,severity,httpRequest.requestUrl,httpRequest.status,textPayload)" --limit=20 --project=salesmaya-pluto

# Check available-agents endpoint
gcloud logging read "
  resource.type=\"cloud_run_revision\"
  resource.labels.service_name=\"lad-backend-develop\"
  resource.labels.location=\"us-central1\"
  httpRequest.requestUrl=~\"available-agents\"
  timestamp>=\"$(date -u -v-15M '+%Y-%m-%dT%H:%M:%SZ')\"
" --format="table(timestamp,severity,httpRequest.requestUrl,httpRequest.status,textPayload)" --limit=20 --project=salesmaya-pluto
```

## What to Look For

### 1. Database Schema Errors
- **Error Code 42P01**: "relation does not exist" or "column does not exist"
- **Look for**: Table names like `voice_agent_numbers`, `voice_agent_config_view`
- **Check**: Whether the schema name is being resolved correctly (should be `lad_dev`)

### 2. SQL Query Errors
- **Look for**: SQL queries with incorrect column names
- **Check**: Column names match the actual database schema:
  - ✅ `country_code`, `base_number`, `status`, `rules`, `default_agent_id`
  - ❌ `phone_number`, `number_type`, `capabilities`, `is_active`, `metadata`

### 3. Schema Resolution Issues
- **Look for**: "undefined.voice_agent_numbers" or schema being "undefined"
- **Check**: `getSchema(req)` is returning a value (should be `lad_dev`)

### 4. Response Format Issues
- **Look for**: Frontend expecting fields that aren't in the response
- **Check**: Response includes `phone_number`, `type`, `assignedAgentId` fields

### 5. Deployment Status
- **Check**: Latest deployment timestamp - ensure new code is deployed
- **Look for**: Deployment logs showing the new code version

## Step-by-Step Debugging Sequence

1. **Check if new code is deployed:**
   - Look at the most recent deployment timestamp
   - Verify the commit hash matches your latest push

2. **Check for recent errors:**
   - Filter by `severity>=ERROR` and last 15 minutes
   - Look for 500 status codes

3. **Identify the failing endpoint:**
   - Check `httpRequest.requestUrl` for `/api/voice-agent/user/available-numbers` or `/available-agents`
   - Note the HTTP status code

4. **Read the error message:**
   - Check `textPayload` or `jsonPayload.message`
   - Look for PostgreSQL error codes (42P01, etc.)

5. **Check database connection:**
   - Verify schema name is resolved correctly
   - Check if the query is using the correct table/column names

6. **Check response format:**
   - Verify the response structure matches what frontend expects
   - Check if required fields are present

## Common Issues and Solutions

### Issue: `relation "undefined.voice_agent_numbers" does not exist`
**Cause**: Schema is not being resolved correctly
**Solution**: Check `getSchema(req)` is being called and returns `lad_dev`

### Issue: `column "number_type" does not exist`
**Cause**: Code is using old column names
**Solution**: Ensure latest code is deployed with correct column names

### Issue: Empty response array
**Cause**: No data in database for the tenant, or query filtering out all rows
**Solution**: Check database has data for tenant_id in JWT token

### Issue: Frontend shows error but backend returns 200
**Cause**: Response format doesn't match frontend expectations
**Solution**: Verify response includes all required fields (`phone_number`, `type`, `assignedAgentId`)

