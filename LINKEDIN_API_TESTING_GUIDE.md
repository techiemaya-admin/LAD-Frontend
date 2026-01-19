# LinkedIn Connection API Testing Guide

This guide helps you test LinkedIn connection APIs one by one using curl commands.

**Backend URL:** `http://localhost:3004`

> **Note:** The LinkedIn connection functionality has been migrated to the `social-integration` feature. The `/api/social-integration/linkedin/*` endpoints are the primary and recommended way to connect and manage LinkedIn accounts. All connection methods (`connectAccount`, `verifyOTP`) are now implemented within the social-integration feature, ensuring proper feature isolation and following LAD architecture principles.

---

## Step 1: Get Authentication Token

First, you need to login to get a JWT token:

```bash
# Login and save token to environment variable
TOKEN=$(curl -s -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password123"}' | jq -r '.token')

# Verify token was retrieved
echo "Token: ${TOKEN:0:50}..."
```

If the user doesn't exist, you may need to register first:

```bash
# Register a new user (if needed)
curl -X POST http://localhost:3004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password123","name":"Admin User"}'
```

---

## Step 2: Test LinkedIn Connection Status (Campaigns Route)

Check if you have any LinkedIn accounts connected:

```bash
curl -X GET http://localhost:3004/api/campaigns/linkedin/status \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Expected Response:**
```json
{
  "connected": true/false,
  "status": "connected" | "disconnected",
  "connections": [...],
  "accounts": [...],
  "success": true
}
```

---

## Step 3: List LinkedIn Accounts (Campaigns Route)

Get all LinkedIn accounts for the current user:

```bash
curl -X GET http://localhost:3004/api/campaigns/linkedin/accounts \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "accounts": [...]
}
```

---

## Step 4: Connect LinkedIn Account (OAuth Flow - Start)

Start the OAuth flow to connect a LinkedIn account:

```bash
curl -X POST http://localhost:3004/api/campaigns/linkedin/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "redirectUri": "http://localhost:3000/settings/linkedin/callback"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://www.linkedin.com/oauth/v2/authorization?..."
  }
}
```

Visit the `authUrl` in your browser to complete OAuth.

---

## Step 5: Connect LinkedIn Account (Using Cookies)

Connect using LinkedIn cookies (li_at and/or li_a):

```bash
curl -X POST http://localhost:3004/api/campaigns/linkedin/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "cookies",
    "li_at": "YOUR_LI_AT_COOKIE_HERE",
    "li_a": "YOUR_LI_A_COOKIE_HERE",
    "user_agent": "Mozilla/5.0..."
  }' | jq '.'
```

**Note:** You need to extract these cookies from your browser's LinkedIn session.

---

## Step 6: Connect LinkedIn Account (Using Credentials)

⚠️ **Note:** This may not be supported depending on your Unipile API version.

```bash
curl -X POST http://localhost:3004/api/campaigns/linkedin/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "credentials",
    "email": "your-linkedin-email@example.com",
    "password": "your-linkedin-password"
  }' | jq '.'
```

---

## Step 7: Disconnect LinkedIn Account

Disconnect a LinkedIn account using connection_id or unipileAccountId:

```bash
# Using connection_id (database UUID)
curl -X POST "http://localhost:3004/api/campaigns/linkedin/disconnect?connection_id=YOUR_CONNECTION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

# Or using unipileAccountId in body
curl -X POST http://localhost:3004/api/campaigns/linkedin/disconnect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "unipileAccountId": "YOUR_UNIPILE_ACCOUNT_ID"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "LinkedIn account disconnected successfully"
}
```

---

## Step 8: Social Integration Routes - Check Status ⭐ (Recommended)

> **Note:** The social-integration routes are now the primary way to interact with LinkedIn accounts. All connection methods have been moved to this feature.

Check LinkedIn status via social-integration API:

```bash
curl -X GET http://localhost:3004/api/social-integration/linkedin/status \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "platform": "linkedin",
  "configured": true,
  "message": "Platform is configured and ready"
}
```

---

## Step 9: Social Integration Routes - List Accounts ⭐ (Recommended)

List all LinkedIn accounts via social-integration API:

```bash
curl -X GET http://localhost:3004/api/social-integration/linkedin/accounts \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "accounts": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "user_id": "uuid",
      "provider": "unipile",
      "provider_account_id": "unipile-account-id",
      "account_name": "John Doe",
      "status": "active",
      "metadata": {
        "profile_url": "https://www.linkedin.com/in/johndoe",
        "connected_via": "cookies"
      },
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Step 10: Social Integration Routes - Connect Account ⭐ (Recommended)

Connect LinkedIn account via social-integration API. This is the **recommended endpoint** for connecting LinkedIn accounts.

```bash
# Using cookies (recommended method)
curl -X POST http://localhost:3004/api/social-integration/linkedin/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "cookies",
    "li_at": "YOUR_LI_AT_COOKIE",
    "li_a": "YOUR_LI_A_COOKIE",
    "user_agent": "Mozilla/5.0..."
  }' | jq '.'
```

**Using credentials method:**

```bash
curl -X POST http://localhost:3004/api/social-integration/linkedin/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "credentials",
    "email": "your-linkedin-email@example.com",
    "password": "your-linkedin-password"
  }' | jq '.'
```

**Expected Responses:**

Success (connected):
```json
{
  "success": true,
  "data": {
    "accountId": "uuid-of-account",
    "providerAccountId": "unipile-account-id",
    "accountName": "John Doe",
    "status": "active",
    "connected": true,
    "method": "cookies"
  },
  "message": "LinkedIn account connected successfully"
}
```

Checkpoint required (OTP/2FA):
```json
{
  "success": true,
  "checkpoint_required": true,
  "data": {
    "accountId": "unipile-account-id",
    "checkpoint": {
      "type": "OTP",
      "required": true,
      "is_otp": true,
      "message": "Enter the code sent to your phone"
    },
    "method": "cookies"
  },
  "message": "LinkedIn account created but requires verification (OTP/2FA)"
}
```

Error (Unipile not configured):
```json
{
  "success": false,
  "error": "LinkedIn connection failed",
  "message": "Failed to connect to LinkedIn: Unipile is not configured"
}
```

**Note:** You need to set `UNIPILE_DSN` and `UNIPILE_TOKEN` environment variables for this endpoint to work with real LinkedIn accounts.

---

## Step 11: Send LinkedIn Connection Request (Invitation)

Send a connection request to a LinkedIn profile:

```bash
curl -X POST http://localhost:3004/api/social-integration/linkedin/send-invitation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileUrl": "https://www.linkedin.com/in/johndoe",
    "accountId": "YOUR_UNIPILE_ACCOUNT_ID",
    "customMessage": "Hi! Would love to connect."
  }' | jq '.'
```

**Alternative formats:**

```bash
# Using publicIdentifier
curl -X POST http://localhost:3004/api/social-integration/linkedin/send-invitation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "publicIdentifier": "johndoe",
    "accountId": "YOUR_UNIPILE_ACCOUNT_ID"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "invitation_id": "inv_123abc",
    "status": "sent"
  },
  "profile": {...},
  "alreadySent": false,
  "creditsUsed": 1
}
```

---

## Step 12: Batch Send Connection Requests

Send multiple connection requests:

```bash
curl -X POST http://localhost:3004/api/social-integration/linkedin/batch-send-invitations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profiles": [
      {
        "name": "John Doe",
        "publicIdentifier": "johndoe"
      },
      {
        "name": "Jane Smith",
        "profile_url": "https://www.linkedin.com/in/janesmith"
      }
    ],
    "accountId": "YOUR_UNIPILE_ACCOUNT_ID",
    "customMessage": "Hi! Would love to connect.",
    "delayMs": 2000
  }' | jq '.'
```

---

## Step 13: Lookup LinkedIn Profile

Lookup a LinkedIn profile:

```bash
curl -X GET "http://localhost:3004/api/social-integration/linkedin/lookup?publicIdentifier=johndoe&accountId=YOUR_UNIPILE_ACCOUNT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## Step 14: Social Integration Routes - Disconnect Account ⭐ (Recommended)

Disconnect via social-integration API:

```bash
# Using account ID in URL (database UUID)
curl -X DELETE http://localhost:3004/api/social-integration/linkedin/accounts/YOUR_ACCOUNT_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Or using disconnect endpoint with accountId
curl -X POST http://localhost:3004/api/social-integration/linkedin/disconnect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "YOUR_UNIPILE_ACCOUNT_ID"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Account disconnected"
}
```

---

## Quick Reference: All Endpoints Summary

### Social Integration Routes (`/api/social-integration/linkedin`) ⭐ **Primary/Recommended**

> **Architecture Note:** All LinkedIn connection functionality (`connectAccount`, `verifyOTP`) has been moved to the social-integration feature to maintain proper feature isolation following LAD architecture principles. These endpoints are self-contained and don't depend on other features.

- `GET /status` - Check platform status and configuration
- `GET /accounts` - List all connected LinkedIn accounts ⭐
- `POST /connect` - Connect LinkedIn account (cookies or credentials method) ⭐
- `POST /disconnect` - Disconnect LinkedIn account
- `POST /send-invitation` - Send connection request to a LinkedIn profile
- `POST /batch-send-invitations` - Batch send connection requests
- `GET /lookup` - Lookup LinkedIn profile information
- `POST /send-message` - Send direct message to LinkedIn contact
- `GET /messages` - Get messages for an account
- `GET /conversations` - Get conversations for an account
- `GET /invitations` - Get invitations status

### Campaigns Routes (`/api/campaigns/linkedin`) (Legacy/Campaign-specific)

> **Note:** These routes are maintained for campaign-specific functionality. For general LinkedIn account management, use the social-integration routes above.

- `GET /status` - Check connection status
- `GET /accounts` - List all accounts
- `POST /connect` - Connect account (OAuth/credentials/cookies)
- `POST /disconnect` - Disconnect account
- `POST /verify-otp` - Verify OTP for checkpoint
- `POST /solve-checkpoint` - Solve checkpoint
- `GET /checkpoint-status` - Get checkpoint status
- `GET /callback` - OAuth callback handler
- `GET /status` - Check platform status and configuration
- `GET /accounts` - List all connected LinkedIn accounts
- `POST /connect` - Connect LinkedIn account (cookies or credentials method) ⭐
- `POST /disconnect` - Disconnect LinkedIn account
- `POST /send-invitation` - Send connection request to a LinkedIn profile
- `POST /batch-send-invitations` - Batch send connection requests
- `GET /lookup` - Lookup LinkedIn profile information
- `POST /send-message` - Send direct message to LinkedIn contact
- `GET /messages` - Get messages for an account
- `GET /conversations` - Get conversations for an account
- `GET /invitations` - Get invitations status

**Note:** The social-integration routes are self-contained and don't depend on the campaigns feature. All LinkedIn connection logic is implemented within the social-integration feature following LAD architecture principles.

---

## Troubleshooting

### 401 Unauthorized
- Make sure you've logged in and have a valid token
- Check that the token is set correctly: `echo $TOKEN`
- Ensure you're using `Bearer` prefix: `Authorization: Bearer $TOKEN`

### 403 Forbidden
- Token may be expired, try logging in again
- Check JWT_SECRET matches between login and verification

### No Accounts Found
- You may need to connect an account first using `/connect` endpoint
- Check if you're using the correct tenant/user ID

### Connection Failed / "Unipile is not configured"
- **Required:** Set `UNIPILE_DSN` and `UNIPILE_TOKEN` environment variables
- Example:
  ```bash
  export UNIPILE_DSN=https://api17.unipile.com:14788
  export UNIPILE_TOKEN=your_unipile_api_token_here
  ```
- Verify credentials are loaded: Check backend logs for configuration status
- Ensure LinkedIn cookies/credentials are valid
- The error "Unipile is not configured" is expected if environment variables are not set

### Invalid Method Error
- Make sure to include `"method": "cookies"` or `"method": "credentials"` in the request body
- Method must be exactly `"cookies"` or `"credentials"` (case-sensitive)

---

## Tips

1. **Save token for multiple requests:**
   ```bash
   export TOKEN=$(curl -s -X POST http://localhost:3004/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@demo.com","password":"password123"}' | jq -r '.token')
   ```

2. **Pretty print JSON responses:**
   - Add `| jq '.'` to any curl command
   - Or use `jq` to extract specific fields: `| jq '.accounts[0].id'`

3. **Check response status:**
   ```bash
   # Using social-integration endpoint (recommended)
   curl -X GET http://localhost:3004/api/social-integration/linkedin/status \
     -H "Authorization: Bearer $TOKEN" \
     -w "\nHTTP Status: %{http_code}\n" | jq '.'
   ```

4. **Debug with verbose output:**
   ```bash
   curl -v -X POST http://localhost:3004/api/social-integration/linkedin/connect \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"method": "cookies", "li_at": "test"}'
   ```

5. **Test connection endpoint validation:**
   ```bash
   # This should return a validation error for missing method
   curl -X POST http://localhost:3004/api/social-integration/linkedin/connect \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"li_at": "test"}' | jq '.'
   ```

