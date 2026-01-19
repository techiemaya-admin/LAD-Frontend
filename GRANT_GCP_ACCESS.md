# Granting Read Access to Google Cloud Platform

This guide shows how to grant read-only access to a developer for viewing Cloud Run services and logs.

## Required Permissions

For read-only access to Cloud Run and logs, the developer needs these IAM roles:

1. **Cloud Run Viewer** - View Cloud Run services and configurations
2. **Logs Viewer** - View Cloud Logging logs
3. **Project Viewer** (optional) - General read access to the project

## Method 1: Using gcloud CLI (Recommended)

### Step 1: Set Your Project

```bash
gcloud config set project salesmaya-pluto
```

### Step 2: Grant Cloud Run Viewer Role

```bash
# Replace DEVELOPER_EMAIL with the developer's Google account email
gcloud projects add-iam-policy-binding salesmaya-pluto \
  --member="user:DEVELOPER_EMAIL" \
  --role="roles/run.viewer"
```

### Step 3: Grant Logs Viewer Role

```bash
gcloud projects add-iam-policy-binding salesmaya-pluto \
  --member="user:DEVELOPER_EMAIL" \
  --role="roles/logging.viewer"
```

### Step 4: (Optional) Grant Project Viewer Role for General Read Access

```bash
gcloud projects add-iam-policy-binding salesmaya-pluto \
  --member="user:satwik.k@techiemaya.com" \
  --role="roles/viewer"
```

### All-in-One Command

```bash
# Replace DEVELOPER_EMAIL with the developer's Google account email
DEVELOPER_EMAIL="developer@example.com"

gcloud projects add-iam-policy-binding salesmaya-pluto \
  --member="user:${DEVELOPER_EMAIL}" \
  --role="roles/run.viewer"

gcloud projects add-iam-policy-binding salesmaya-pluto \
  --member="user:${DEVELOPER_EMAIL}" \
  --role="roles/logging.viewer"

gcloud projects add-iam-policy-binding salesmaya-pluto \
  --member="user:${DEVELOPER_EMAIL}" \
  --role="roles/viewer"
```

## Method 2: Using Google Cloud Console (Web UI)

### Step 1: Navigate to IAM

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: `salesmaya-pluto`
3. Go to **IAM & Admin** → **IAM**

### Step 2: Grant Permissions

1. Click **+ GRANT ACCESS**
2. In the **New principals** field, enter the developer's email address
3. Click **Select a role** and add these roles one by one:
   - **Cloud Run** → **Cloud Run Viewer**
   - **Logging** → **Logs Viewer**
   - **Project** → **Viewer** (optional, for general read access)
4. Click **SAVE**

## Method 3: More Restrictive (Logs Viewer Only)

If you only want to grant access to logs (not Cloud Run services), use:

```bash
DEVELOPER_EMAIL="developer@example.com"

gcloud projects add-iam-policy-binding salesmaya-pluto \
  --member="user:${DEVELOPER_EMAIL}" \
  --role="roles/logging.viewer"
```

## Verify Permissions

After granting access, verify it worked:

```bash
# List IAM policy bindings for the developer
gcloud projects get-iam-policy salesmaya-pluto \
  --flatten="bindings[].members" \
  --filter="bindings.members:DEVELOPER_EMAIL" \
  --format="table(bindings.role)"
```

## What the Developer Can Access

With these roles, the developer can:

### Cloud Run Viewer:
- ✅ View Cloud Run services and their configurations
- ✅ View service details (revisions, traffic allocation, etc.)
- ✅ View service logs (with Logs Viewer role)
- ❌ Cannot modify services
- ❌ Cannot deploy new revisions
- ❌ Cannot delete services

### Logs Viewer:
- ✅ View logs in Cloud Logging
- ✅ Search and filter logs
- ✅ View log entries and details
- ✅ Export logs (if enabled)
- ❌ Cannot delete logs
- ❌ Cannot create log-based metrics
- ❌ Cannot configure log sinks

### Project Viewer (if granted):
- ✅ View project resources
- ✅ View project settings
- ✅ List resources in the project
- ❌ Cannot modify anything

## Access Logs URLs

Once granted access, the developer can access:

### Cloud Run Services:
```
https://console.cloud.google.com/run?project=salesmaya-pluto
```

### Cloud Run Logs (Filtered):
```
https://console.cloud.google.com/logs/query?project=salesmaya-pluto
```

### Specific Service Logs:
```
https://console.cloud.google.com/run/detail/us-central1/lad-backend-develop/logs?project=salesmaya-pluto
```

## Query Examples for Logs

The developer can use these queries in Cloud Logging:

### View All Cloud Run Logs:
```
resource.type="cloud_run_revision"
resource.labels.service_name="lad-backend-develop"
resource.labels.location="us-central1"
```

### View Errors Only:
```
resource.type="cloud_run_revision"
resource.labels.service_name="lad-backend-develop"
severity>=ERROR
```

### View Recent Logs (Last 1 Hour):
```
resource.type="cloud_run_revision"
resource.labels.service_name="lad-backend-develop"
timestamp>="2025-12-28T20:00:00Z"
```

## Removing Access

To revoke access:

```bash
DEVELOPER_EMAIL="developer@example.com"

# Remove Cloud Run Viewer
gcloud projects remove-iam-policy-binding salesmaya-pluto \
  --member="user:${DEVELOPER_EMAIL}" \
  --role="roles/run.viewer"

# Remove Logs Viewer
gcloud projects remove-iam-policy-binding salesmaya-pluto \
  --member="user:${DEVELOPER_EMAIL}" \
  --role="roles/logging.viewer"

# Remove Project Viewer (if granted)
gcloud projects remove-iam-policy-binding salesmaya-pluto \
  --member="user:${DEVELOPER_EMAIL}" \
  --role="roles/viewer"
```

## Security Best Practices

1. **Principle of Least Privilege**: Only grant the minimum permissions needed
2. **Regular Audits**: Periodically review who has access
3. **Use Groups**: Consider creating a Google Group for developers and granting access to the group
4. **Conditional Access**: Use IAM Conditions if you need time-based or IP-based restrictions
5. **Service Accounts**: For CI/CD, use service accounts instead of user accounts

## Troubleshooting

### Developer Can't See Logs
- Ensure `roles/logging.viewer` is granted
- Check if they're in the correct Google Cloud project
- Verify they're logged in with the correct Google account

### Developer Can't See Cloud Run Services
- Ensure `roles/run.viewer` is granted
- Check project selection in the console

### Permission Denied Errors
- Wait a few minutes for IAM changes to propagate
- Ask the developer to refresh their browser or re-authenticate

