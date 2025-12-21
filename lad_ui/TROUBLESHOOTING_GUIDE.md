# Pluto/G-Links Deployment Troubleshooting Guide

## Overview
This document outlines common issues encountered during Pluto deployment and their solutions. These steps apply to both Pluto (pluto.techiemaya.com) and G-Links (glinks.techiemaya.com) applications.

---

## Issue 1: Google Calendar OAuth Authentication Failures

### Symptoms
- "Failed to start Google Calendar sync" error message
- OAuth flow doesn't redirect to Google consent screen
- After Google authentication, calendar events don't sync
- User sees "User ID not available" alert
- Browser console shows CORS errors or 401/403 responses

### Root Cause
- Missing or incorrect Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- VOAG (Voice Agent) service not properly configured
- Callback URL mismatch between Google Cloud Console and application
- Missing user mapping between main app and voice_agent_user_id

### Diagnostic Steps

1. **Check VOAG service configuration:**
```bash
ssh root@SERVER_IP 'curl -s http://localhost:8081/health || echo "VOAG service not responding"'
```

2. **Verify Google OAuth environment variables:**
```bash
# Check if variables are set (don't show actual values for security)
ssh root@SERVER_IP 'cd /var/www/html/APP_NAME && grep -c "GOOGLE_CLIENT_ID" .env.production'
ssh root@SERVER_IP 'cd /var/www/html/APP_NAME && grep -c "NEXT_PUBLIC_VOAG_URL" .env.production'
```

3. **Check browser console for errors:**
```javascript
// Open DevTools > Console
// Look for errors like:
// "Failed to start Google Calendar sync"
// "CORS policy blocked"
// "401 Unauthorized"
```

4. **Test VOAG auth endpoint:**
```bash
curl -X POST "https://voag.techiemaya.com/auth/google/start?user_id=test&frontend_id=settings" \
  -H "X-Frontend-ID: settings" \
  -H "X-API-Key: YOUR_API_KEY"
```

### Solution

1. **Set up Google Cloud Console OAuth credentials:**

   a. Go to [Google Cloud Console](https://console.cloud.google.com/)
   
   b. Create or select a project
   
   c. Enable Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
   
   d. Create OAuth 2.0 credentials:
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "Pluto Calendar Integration"
   - Authorized redirect URIs:
     ```
     https://pluto.techiemaya.com/settings?tab=integrations&google=connected
     https://glinks.techiemaya.com/settings?tab=integrations&google=connected
     https://voag.techiemaya.com/auth/google/callback
     http://localhost:3000/settings?tab=integrations&google=connected
     ```
   
   e. Copy the Client ID and Client Secret

2. **Update environment variables:**

```bash
# On the server
ssh root@SERVER_IP

# Edit the .env.production file
cd /var/www/html/pluto
nano .env.production

# Add or update these variables:
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_VOAG_URL=https://voag.techiemaya.com
BASE_URL_FRONTEND_APIKEY=_L5cf6UXDkGTcWRaHka9Q13Kmu4k5dxaKEPRH165U8U

# Save and exit (Ctrl+X, Y, Enter)
```

3. **Update VOAG service configuration:**

```bash
# Edit VOAG .env file
ssh root@SERVER_IP
cd /path/to/voag/service
nano .env

# Add:
GOOGLE_CLIENT_ID=same_client_id_as_above
GOOGLE_CLIENT_SECRET=same_client_secret_as_above
GOOGLE_REDIRECT_URI=https://voag.techiemaya.com/auth/google/callback

# Restart VOAG service
pm2 restart voag
```

4. **Ensure user has voice_agent_user_id mapping:**

```sql
-- Connect to database
psql -U postgres -d salesmaya_agent

-- Check if user has voice_agent mapping
SELECT u.id, u.email, u.voice_agent_user_id, va.id as voag_id
FROM users u
LEFT JOIN voice_agent.users_voiceagent va ON u.email = va.email
WHERE u.email = 'user@example.com';

-- If voice_agent_user_id is NULL, update it:
UPDATE users u
SET voice_agent_user_id = va.id
FROM voice_agent.users_voiceagent va
WHERE u.email = va.email
  AND u.voice_agent_user_id IS NULL;
```

5. **Restart frontend to pick up new environment variables:**

```bash
pm2 restart pluto-ui
# or for G-Links:
pm2 restart glinks-ui
```

6. **Test the OAuth flow:**
   - Go to Settings > Integrations
   - Click "Connect Google Calendar"
   - Should redirect to Google consent screen
   - After granting permissions, should redirect back with success message

### Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "User ID not available" | No voice_agent_user_id mapping | Run SQL update query above |
| "Failed to start Google Calendar sync" | VOAG service down or misconfigured | Check VOAG service logs: `pm2 logs voag` |
| "redirect_uri_mismatch" | Callback URL not in Google Console | Add all URLs to Authorized redirect URIs |
| CORS error | Missing CORS headers in VOAG | Update VOAG CORS config to allow origin |
| "Invalid client" | Wrong GOOGLE_CLIENT_ID | Verify Client ID matches Google Console |

---

## Issue 2: LinkedIn OAuth Authentication Failures

### Symptoms
- LinkedIn OAuth flow fails with "Invalid state parameter"
- "Failed to connect LinkedIn account" error
- After LinkedIn authorization, user not redirected back to app
- Browser shows "Connection Failed" page
- Unipile API returns 401 Unauthorized

### Root Cause
- Missing or incorrect LinkedIn OAuth credentials
- Unipile service not configured or token invalid
- State parameter mismatch (CSRF protection)
- Callback URL not whitelisted in LinkedIn app settings

### Diagnostic Steps

1. **Check Unipile configuration:**
```bash
ssh root@SERVER_IP 'cd /path/to/backend && grep -c "UNIPILE_TOKEN" .env'
ssh root@SERVER_IP 'cd /path/to/backend && grep -c "UNIPILE_DSN" .env'
```

2. **Test Unipile API connection:**
```bash
curl -X GET "https://api17.unipile.com:14788/api/v1/accounts" \
  -H "Authorization: Bearer YOUR_UNIPILE_TOKEN" \
  -H "accept: application/json"
```

3. **Check LinkedIn OAuth configuration:**
```bash
ssh root@SERVER_IP 'cd /path/to/backend && grep "LINKEDIN_CLIENT_ID\|LINKEDIN_REDIRECT_URI" .env'
```

4. **Check backend logs for Unipile errors:**
```bash
pm2 logs sts-service --lines 50 | grep -i "unipile\|linkedin"
```

### Solution

1. **Set up LinkedIn OAuth App:**

   a. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
   
   b. Create a new app or select existing app
   
   c. In "Auth" tab:
   - Authorized redirect URLs:
     ```
     https://pluto.techiemaya.com/settings/linkedin/callback
     https://glinks.techiemaya.com/settings/linkedin/callback
     http://localhost:3000/settings/linkedin/callback
     ```
   
   d. In "Products" tab:
   - Request "Sign In with LinkedIn using OpenID Connect"
   - Request "Share on LinkedIn" (if needed)
   
   e. Copy Client ID and Client Secret

2. **Set up Unipile Account:**

   a. Sign up at [Unipile](https://www.unipile.com/)
   
   b. Get your API credentials:
   - DSN (e.g., `api17.unipile.com:14788`)
   - Token (long Bearer token)
   
   c. Test the credentials:
   ```bash
   curl -X GET "https://api17.unipile.com:14788/api/v1/accounts" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Update backend environment variables:**

```bash
ssh root@SERVER_IP
cd /root/opt/repo/PLUTO/backend/sts-service  # Adjust path
nano .env

# Add or update:
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=https://pluto.techiemaya.com/settings/linkedin/callback
UNIPILE_DSN=api17.unipile.com:14788
UNIPILE_TOKEN=your_unipile_bearer_token_here
LINKEDIN_DEFAULT_CONNECTION_MESSAGE=Hi! I'd like to connect with you on LinkedIn.

# Save and exit
```

4. **Create/update LinkedIn integrations table:**

```sql
-- Connect to database
psql -U postgres -d salesmaya_agent

-- Create table if not exists
CREATE TABLE IF NOT EXISTS linkedin_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  profile_name VARCHAR(255),
  profile_url TEXT,
  email VARCHAR(255),
  connected_at TIMESTAMP DEFAULT NOW(),
  connection_data JSONB,
  unipile_account_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  connection_method VARCHAR(50) DEFAULT 'oauth'
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_linkedin_integrations_user_id 
  ON linkedin_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_integrations_unipile_account_id 
  ON linkedin_integrations(unipile_account_id);
```

5. **Add LinkedIn credentials storage to users_voiceagent:**

```sql
-- Run migration to add LinkedIn columns
-- See: sts-service/migrations/2025-01-XX_add_linkedin_credentials_to_users_voiceagent.sql

ALTER TABLE voice_agent.users_voiceagent
  ADD COLUMN IF NOT EXISTS linkedin_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS linkedin_password_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_li_at_cookie TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_li_a_cookie TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_auth_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS linkedin_unipile_account_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS linkedin_connected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS linkedin_is_connected BOOLEAN DEFAULT FALSE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_voiceagent_linkedin_unipile 
  ON voice_agent.users_voiceagent(linkedin_unipile_account_id);
```

6. **Restart backend service:**

```bash
pm2 restart sts-service
pm2 logs sts-service --lines 20
```

7. **Test LinkedIn OAuth flow:**
   - Go to Settings > LinkedIn Integration
   - Click "Connect LinkedIn"
   - Should redirect to LinkedIn authorization
   - After granting permissions, should redirect back with success

### LinkedIn Connection Methods

The system supports two methods for connecting LinkedIn:

**Method 1: OAuth (Recommended)**
- User clicks "Connect LinkedIn"
- Redirected to LinkedIn for authorization
- Returns with access token
- Most secure, no password storage needed

**Method 2: Credentials (Alternative)**
```javascript
// Connect with email/password
POST /api/linkedin/connect
{
  "method": "credentials",
  "email": "user@linkedin.com",
  "password": "password123"
}
```

**Method 3: Cookies (Advanced)**
```javascript
// Connect with li_at cookie
POST /api/linkedin/connect
{
  "method": "cookies",
  "li_at": "AQEDAR...",
  "li_a": "AQEDAR..." // optional
}
```

### Common LinkedIn Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid state parameter" | CSRF state mismatch | Clear sessionStorage and try again |
| "401 Unauthorized" from Unipile | Invalid UNIPILE_TOKEN | Verify token in Unipile dashboard |
| "redirect_uri_mismatch" | Callback URL not in LinkedIn app | Add URL to LinkedIn app settings |
| "UNIPILE_TOKEN is not configured" | Missing env variable | Add UNIPILE_TOKEN to .env |
| "Checkpoint required" | LinkedIn security check | Use cookies method or complete checkpoint |
| "Account already connected" | Duplicate connection | Disconnect existing account first |

### LinkedIn Checkpoint Handling

If LinkedIn requires additional verification (checkpoint):

1. **Status shows checkpoint required:**
```json
{
  "checkpoint": {
    "required": true,
    "type": "email_otp",
    "contact": "u***@example.com"
  }
}
```

2. **Submit verification code:**
```javascript
POST /api/linkedin/verify-checkpoint
{
  "unipile_account_id": "account_id_here",
  "otp_code": "123456"
}
```

3. **Check if checkpoint resolved:**
```javascript
GET /api/linkedin/status
// Should show checkpoint.required = false
```

---

## Issue 3: Authentication Token Storage Inconsistency (401 Unauthorized Errors)

### Symptoms
- User can login successfully but gets 401 Unauthorized on subsequent API calls
- `/api/auth/me` returns 401 even though user is logged in
- Settings page fails to load with authentication errors
- Browser console shows: `GET /api/auth/me 401 (Unauthorized)`
- Token exists in localStorage under `'token'` but code looks for `'auth_token'`

### Root Cause
- Frontend code has inconsistent token storage key usage
- `authService.login()` stores token as `'token'`
- `authService.getCurrentUser()` and other services look for `'auth_token'`
- Mismatch causes authenticated requests to fail

### Diagnostic Steps

1. **Check localStorage in browser:**
```javascript
// Open DevTools > Application > Local Storage
// Check if both 'token' and 'auth_token' exist
localStorage.getItem('token')      // Should return JWT token
localStorage.getItem('auth_token') // Should return same JWT token
```

2. **Check Network tab for Authorization header:**
```javascript
// DevTools > Network > Select failed request > Headers
// Request Headers should include:
// Authorization: Bearer eyJhbGci...
```

3. **Check authService code:**
```bash
# Verify token storage in login function
grep -A 5 "setItem.*token" src/services/authService.ts
```

4. **Test token retrieval:**
```javascript
// In browser console
import { safeStorage } from '@/utils/storage';
console.log('token:', safeStorage.getItem('token'));
console.log('auth_token:', safeStorage.getItem('auth_token'));
```

### Solution

1. **Update authService.ts to store token in both keys:**

```typescript
// File: src/services/authService.ts
// In the login function:

const data: LoginResponse = await response.json();
if (typeof window !== 'undefined' && data.token) {
  safeStorage.setItem('token', data.token);
  safeStorage.setItem('auth_token', data.token); // Also store as auth_token for consistency
}
return data;
```

2. **Rebuild the frontend:**

```bash
cd /path/to/lad_ui
npm run build
```

3. **Deploy the new build:**

```bash
# Sync .next folder to server
rsync -avz --delete .next/ root@SERVER_IP:/var/www/html/glinks/.next/

# Restart frontend service
ssh root@SERVER_IP 'pm2 restart glinks-frontend'
```

4. **Force browser cache clear (IMPORTANT):**

Users must clear browser cache to load new JavaScript:

**Method 1: Hard Refresh (Recommended)**
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Method 2: Empty Cache and Hard Reload**
- Open DevTools (F12)
- Right-click the refresh button
- Select "Empty Cache and Hard Reload"

**Method 3: Clear localStorage manually**
```javascript
// In browser console
localStorage.clear();
// Then refresh the page and login again
```

5. **Verify the fix:**

```javascript
// After login, check both keys exist:
console.log('token:', localStorage.getItem('token'));
console.log('auth_token:', localStorage.getItem('auth_token'));
// Both should return the same JWT token

// Navigate to Settings page - should work without 401 errors
```

### Alternative Fix: Update All Code to Use Single Key

If you prefer consistency over backward compatibility:

```typescript
// Option A: Use only 'auth_token' everywhere
// Update authService.ts:
safeStorage.setItem('auth_token', data.token);

// Update all services to use 'auth_token':
const token = safeStorage.getItem('auth_token');

// Option B: Use only 'token' everywhere
// Update authService.ts getCurrentUser():
const token = safeStorage.getItem('token'); // Changed from 'auth_token'
```

### Common Auth Errors After Login

| Error | Cause | Fix |
|-------|-------|-----|
| GET /api/auth/me 401 | Token key mismatch | Store token in both `'token'` and `'auth_token'` |
| "Not authenticated" error | Token not in localStorage | Clear cache, login again |
| Settings page 401 error | Old JavaScript cached | Hard refresh browser (Ctrl+Shift+R) |
| Authorization header missing | safeStorage.getItem returns null | Check token key consistency |
| "Invalid token" error | Token format issue | Verify JWT token format in localStorage |

### Nginx Configuration for /api/auth/me

Ensure `/api/auth/me` is routed through Next.js (not directly to backend):

```nginx
# /etc/nginx/sites-available/glinks
server {
    # Route /api/auth/me through Next.js to handle cookie extraction
    location ~ ^/api/(auth/me|recording-proxy|webhooks) {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # All other /api/ routes go to backend
    location /api/ {
        proxy_pass http://localhost:3005/api/;
        # ... other proxy settings
    }
}
```

**Why?** The Next.js `/api/auth/me` route extracts the token from httpOnly cookies and adds it to the Authorization header when calling the backend.

---

## Issue 4: 502 Bad Gateway Errors on API Calls

### Symptoms
- User creation/management returns 502 errors
- Browser console shows: `Failed to load resource: the server responded with a status of 502 (Bad Gateway)`
- Frontend receives HTML error pages instead of JSON: `SyntaxError: Unexpected token '<', '<html>...' is not valid JSON`

### Root Cause
Multiple conflicting Nginx `location /api/` blocks with different `proxy_pass` configurations causing ambiguity in request routing.

### Diagnostic Steps

1. **Check Nginx configuration for conflicts:**
```bash
ssh root@SERVER_IP 'cat /etc/nginx/sites-enabled/* | grep -A 20 "location /api"'
```

2. **Verify backend is working independently:**
```bash
ssh root@SERVER_IP 'curl -s http://localhost:3004/api/users -H "Authorization: Bearer test"'
```
Expected: JSON response with 401 error (proves backend works)

3. **Check Nginx error logs:**
```bash
ssh root@SERVER_IP 'tail -50 /var/log/nginx/error.log'
```

### Solution

1. **List all active Nginx configuration files:**
```bash
ssh root@SERVER_IP 'ls -la /etc/nginx/sites-enabled/'
```

2. **Identify conflicting configurations:**
Look for multiple files with `/api/` location blocks:
```nginx
# BAD - Multiple conflicting blocks:
location /api/ {
    proxy_pass http://localhost:3004/api/;  # With trailing slash
}

location /api/ {
    proxy_pass http://localhost:3004;  # Without trailing slash - CONFLICT!
}
```

3. **Keep only ONE consistent configuration:**
```nginx
# GOOD - Single, clear configuration:
location /api/ {
    proxy_pass http://localhost:3005/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Special handling for Next.js API routes (keep separate):
location ~ ^/api/(auth|recording-proxy|webhooks) {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

4. **Edit the configuration file:**
```bash
# Find which file has the duplicate
ssh root@SERVER_IP 'grep -l "location /api/" /etc/nginx/sites-enabled/*'

# Edit to remove duplicates
ssh root@SERVER_IP 'nano /etc/nginx/sites-enabled/pluto'
```

5. **Test configuration before applying:**
```bash
ssh root@SERVER_IP 'nginx -t'
```

6. **Reload Nginx:**
```bash
ssh root@SERVER_IP 'systemctl reload nginx'
```

7. **Verify the fix:**
```bash
# Should now return JSON 401 error instead of 502
curl -s https://pluto.techiemaya.com/api/users -H "Authorization: Bearer test"
```

---

## Issue 2: 404 Not Found on Recording Proxy API

### Symptoms
```
GET https://glinks.techiemaya.com/api/recording-proxy?url=gs://... 404 (Not Found)
Audio play error: NotSupportedError: The element has no supported sources.
```

### Root Cause
The `/api/recording-proxy` endpoint is being routed to the wrong backend service (port 3004 instead of port 3000 Next.js API route).

### Diagnostic Steps

1. **Check which service handles recording-proxy:**
```bash
ssh root@SERVER_IP 'cat /etc/nginx/sites-enabled/* | grep -B 5 -A 10 "recording-proxy"'
```

2. **Verify Next.js API route exists:**
```bash
# Check if the recording-proxy API route file exists
ssh root@SERVER_IP 'ls -la /var/www/html/pluto/src/app/api/recording-proxy/'
# or
ssh root@SERVER_IP 'ls -la /var/www/html/glinks/src/app/api/recording-proxy/'
```

3. **Test the endpoint directly:**
```bash
# Test Next.js service (port 3000)
ssh root@SERVER_IP 'curl -s -I http://localhost:3000/api/recording-proxy'

# Test backend service (port 3004)
ssh root@SERVER_IP 'curl -s -I http://localhost:3004/api/recording-proxy'
```

### Solution

1. **Update Nginx configuration to route recording-proxy to Next.js:**
```nginx
# This block should come BEFORE the general /api/ block
location ~ ^/api/(auth|recording-proxy|webhooks) {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# General API routes go to backend (port 3004)
location /api/ {
    proxy_pass http://localhost:3004/api/;
    # ... other proxy settings
}
```

2. **Verify the Next.js API route file exists:**

If missing, create `/src/app/api/recording-proxy/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const agentId = searchParams.get('agentId');
    const token = searchParams.get('token');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Proxy the request to the actual recording URL
    const response = await fetch(url, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch recording' },
        { status: response.status }
      );
    }

    const audioData = await response.arrayBuffer();

    return new NextResponse(audioData, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'audio/wav',
        'Content-Length': response.headers.get('Content-Length') || String(audioData.byteLength),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[recording-proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

3. **Rebuild and redeploy the frontend:**
```bash
cd /path/to/lad_ui
npm run build
./deploy.sh
```

4. **Test the endpoint:**
```bash
curl -I "https://glinks.techiemaya.com/api/recording-proxy?url=test"
# Should return 400 or other response, not 404
```

---

## Issue 3: Backend Service Crashes / Database Connection Errors

### Symptoms
- Site completely inaccessible
- Backend logs show: `Error: Connection terminated unexpectedly`
- Port 3004 not listening

### Diagnostic Steps

1. **Check PM2 service status:**
```bash
ssh root@SERVER_IP 'pm2 list'
```

2. **Check backend logs:**
```bash
ssh root@SERVER_IP 'pm2 logs sts-service --lines 50 --nostream'
```

3. **Check PostgreSQL status:**
```bash
ssh root@SERVER_IP 'systemctl status postgresql'
```

4. **Test database connection:**
```bash
ssh root@SERVER_IP 'psql -U postgres -d salesmaya_agent -c "SELECT NOW();"'
```

### Solution

1. **Restart the backend service:**
```bash
ssh root@SERVER_IP 'pm2 restart sts-service'
```

2. **Verify service is running:**
```bash
ssh root@SERVER_IP 'pm2 logs sts-service --lines 20 --nostream'
```

Look for:
- `✅ Initial database connection successful`
- `Server running on port 3004`
- `👂 Listening to PostgreSQL NOTIFY: calllogs_channel`

3. **Test API endpoint:**
```bash
ssh root@SERVER_IP 'curl -s http://localhost:3004/api/auth/login -X POST'
```
Expected: `{"error":"Invalid email or password."}` (proves API works)

4. **If PostgreSQL is down, restart it:**
```bash
ssh root@SERVER_IP 'systemctl restart postgresql'
```

---

## Issue 4: Frontend Not Loading / PM2 Issues

### Symptoms
- Login page doesn't load
- White screen or connection refused
- PM2 shows service as stopped

### Diagnostic Steps

1. **Check PM2 status:**
```bash
ssh root@SERVER_IP 'pm2 list | grep -E "(pluto-ui|glinks-ui)"'
```

2. **Check frontend logs:**
```bash
ssh root@SERVER_IP 'pm2 logs pluto-ui --lines 50 --nostream'
```

3. **Test frontend port:**
```bash
ssh root@SERVER_IP 'curl -s -I http://localhost:3000'
```

### Solution

1. **Restart the frontend service:**
```bash
ssh root@SERVER_IP 'pm2 restart pluto-ui'
# or for G-Links:
ssh root@SERVER_IP 'pm2 restart glinks-ui'
```

2. **If service doesn't exist, start it:**
```bash
ssh root@SERVER_IP << 'ENDSSH'
cd /var/www/html/pluto
pm2 start npm --name "pluto-ui" -- start
pm2 save
ENDSSH
```

3. **Verify Nginx is running:**
```bash
ssh root@SERVER_IP 'systemctl status nginx'
```

4. **Test the site:**
```bash
curl -s -I https://pluto.techiemaya.com
# Should return 200 or 307 redirect
```

---

## Complete Diagnostic Checklist

### For G-Links (or any clone app):

```bash
# 1. Check all services are running
ssh root@143.110.249.144 'pm2 list'
ssh root@143.110.249.144 'systemctl status nginx'
ssh root@143.110.249.144 'systemctl status postgresql'

# 2. Check Nginx configuration
ssh root@143.110.249.144 'cat /etc/nginx/sites-enabled/glinks'
ssh root@143.110.249.144 'nginx -t'

# 3. Check backend is responding
ssh root@143.110.249.144 'curl -s http://localhost:3004/api/auth/login -X POST'

# 4. Check frontend is responding
ssh root@143.110.249.144 'curl -s -I http://localhost:3000'

# 5. Check for conflicting /api/ blocks
ssh root@143.110.249.144 'cat /etc/nginx/sites-enabled/* | grep -A 15 "location /api"'

# 6. Check logs for errors
ssh root@143.110.249.144 'pm2 logs sts-service --lines 30 --nostream'
ssh root@143.110.249.144 'tail -50 /var/log/nginx/error.log'
```

---

## Standard Nginx Configuration Template

### For Pluto/G-Links Applications:

```nginx
server {
    server_name glinks.techiemaya.com;
    root /var/www/html/glinks;

    # Frontend - Next.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js API Routes (auth, recording-proxy, webhooks)
    # MUST come BEFORE general /api/ block
    location ~ ^/api/(auth|recording-proxy|webhooks) {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API Routes (all other /api/ calls)
    location /api/ {
        proxy_pass http://localhost:3004/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # SSL Configuration (managed by Certbot)
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/glinks.techiemaya.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/glinks.techiemaya.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name glinks.techiemaya.com;
    return 301 https://$server_name$request_uri;
}
```

---

## PM2 Process Setup

### Standard PM2 Configuration:

```bash
# Backend Service
pm2 start npm --name "sts-service" -- start --prefix /path/to/sts-service
pm2 save

# Frontend Service
pm2 start npm --name "glinks-ui" -- start --prefix /var/www/html/glinks
pm2 save

# Enable PM2 startup on system reboot
pm2 startup
# Follow the command output instructions

# View all processes
pm2 list

# Monitor in real-time
pm2 monit

# View logs
pm2 logs glinks-ui --lines 50
pm2 logs sts-service --lines 50
```

---

## Quick Fix Commands for G-Links

### Apply these commands in sequence:

```bash
# 1. Check for Nginx configuration conflicts
ssh root@143.110.249.144 'cat /etc/nginx/sites-enabled/glinks | grep -A 15 "location /api"'

# 2. If duplicate blocks found, edit the config
ssh root@143.110.249.144 'nano /etc/nginx/sites-enabled/glinks'

# Remove duplicate /api/ blocks, ensure this order:
# - First: location ~ ^/api/(auth|recording-proxy|webhooks) → port 3000
# - Second: location /api/ → port 3004/api/

# 3. Test Nginx configuration
ssh root@143.110.249.144 'nginx -t'

# 4. Reload Nginx
ssh root@143.110.249.144 'systemctl reload nginx'

# 5. Verify recording-proxy now works
curl -I "https://glinks.techiemaya.com/api/recording-proxy?url=test"
# Should return 400 Bad Request (URL required), not 404

# 6. Check PM2 services
ssh root@143.110.249.144 'pm2 list'

# 7. Restart services if needed
ssh root@143.110.249.144 'pm2 restart all'

# 8. Monitor logs for errors
ssh root@143.110.249.144 'pm2 logs --lines 50 --nostream'
```

---

## Testing After Fixes

### 1. Test Backend API:
```bash
curl -s https://glinks.techiemaya.com/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test","password":"test"}'
# Expected: {"error":"Invalid email or password."}
```

### 2. Test Recording Proxy:
```bash
curl -I "https://glinks.techiemaya.com/api/recording-proxy?url=https://example.com/test.wav"
# Expected: 400 or 500 (not 404)
```

### 3. Test Frontend:
```bash
curl -s https://glinks.techiemaya.com/login | grep -i "email"
# Should return HTML with email input field
```

### 4. Browser Testing:
- Open browser console (F12)
- Navigate to the application
- Check Network tab for:
  - No 502 errors on /api/ calls
  - No 404 errors on /api/recording-proxy
  - Successful 200 responses for authenticated calls

---

## Common Mistakes to Avoid

1. **Multiple /api/ location blocks** - Always consolidate to one block per backend service
2. **Wrong proxy_pass order** - Specific routes (recording-proxy) must come BEFORE general /api/
3. **Trailing slash inconsistency** - Use `proxy_pass http://localhost:3004/api/;` (with trailing slash)
4. **Forgetting to reload Nginx** - Always run `systemctl reload nginx` after config changes
5. **Not testing config first** - Always run `nginx -t` before reloading
6. **Mixing up ports** - Next.js (3000), Backend (3004)
7. **Missing API route files** - Verify `/src/app/api/recording-proxy/route.ts` exists

---

## Preventive Measures

1. **Use single configuration file per domain** - Avoid split configurations
2. **Document all location blocks** - Add comments explaining routing logic
3. **Monitor PM2 logs regularly** - Set up log rotation and monitoring
4. **Test after every deployment** - Run the testing checklist above
5. **Keep backups of working configs** - Store in version control
6. **Use PM2 ecosystem file** - Standardize process management

---

## Support Resources

- **Nginx Documentation**: https://nginx.org/en/docs/
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Next.js API Routes**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

---

## Revision History

| Date | Issue | Solution Applied |
|------|-------|------------------|
| 2025-12-09 | 502 Bad Gateway on user creation | Removed duplicate Nginx /api/ blocks |
| 2025-12-09 | Backend service crash | Restarted PM2 sts-service, verified PostgreSQL |
| 2025-12-09 | 404 on recording-proxy | Fixed Nginx routing order for Next.js API routes |

---

**Last Updated**: December 9, 2025
**Applies To**: Pluto (pluto.techiemaya.com), G-Links (glinks.techiemaya.com)
