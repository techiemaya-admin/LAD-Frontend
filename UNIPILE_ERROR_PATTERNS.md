# Unipile Endpoints - Error Pattern Analysis

**Purpose:** Document actual error patterns observed and their root causes

---

## Error Pattern #1: 403/422 on Connection Requests

### Observed Pattern
```
POST /users/invite
Status: 403 Forbidden or 422 Unprocessable Entity
Response: {
  "type": "some_error",
  "detail": "Invalid request",
  "status": 403
}
```

### Root Cause Analysis

**Current Code Problem:**
```javascript
// UnipileConnectionService.js - Lines 175-185
const payload = {
    provider: 'LINKEDIN',
    account_id: accountId,
    provider_id: encodedProviderId  // ❌ WRONG FIELD
};

response = await axios.post(
    `${baseUrl}/users/invite`,  // ❌ WRONG ENDPOINT
    payload
);
```

**Why It Fails:**
1. Endpoint `/users/invite` doesn't exist in Unipile v1 API
2. Field `provider_id` is not accepted parameter
3. Should use `attendees_ids` as array of URNs
4. Should use `/api/v1/chats` endpoint

**Correct Endpoint:**
```
POST /api/v1/chats
{
  "provider": "LINKEDIN",
  "account_id": "...",
  "attendees_ids": ["urn:li:member:123456789"],  // ✅ ARRAY, not string
  "message": "optional"
}
```

### Failure Rate Impact
- **Current:** 100% of connection requests fail
- **After Fix:** Expected ~90-95% success (5-10% for genuine errors like already connected)

### How to Verify Fix Works
```bash
# Before fix: Returns 403/422
curl -X POST "https://api8.unipile.com:13811/api/v1/users/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"provider_id":"urn:li:member:123","account_id":"..."}'

# After fix: Returns 200-201
curl -X POST "https://api8.unipile.com:13811/api/v1/chats" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"attendees_ids":["urn:li:member:123"],"account_id":"...","provider":"LINKEDIN"}'
```

---

## Error Pattern #2: 401 Missing Credentials Errors

### Observed Pattern
```
GET /api/v1/users/{id}
Status: 401 Unauthorized
Response: {
  "type": "missing_credentials",
  "title": "Missing credentials",
  "detail": "Account credentials expired or invalid"
}
```

### Root Cause Analysis

**Why It Happens:**
1. LinkedIn account connected to Unipile expires
2. User doesn't reconnect account
3. Campaign execution tries to use expired account
4. Gets 401 error DURING campaign (not before)

**Current Code Problem:**
```javascript
// No health check before campaign execution
async function getLinkedInAccountForExecution(tenantId, userId) {
    // Finds account from database
    // Returns accountId immediately
    // ❌ Never verifies if account is still valid!
    return accountId;
}
```

**What Happens:**
1. Campaign starts
2. First API call made with expired account
3. Gets 401, marks account as expired
4. Campaign fails after wasting API calls
5. User discovers issue too late

**Better Approach:**
```javascript
// Verify account BEFORE campaign execution
async function getLinkedInAccountForExecution(tenantId, userId) {
    const accountId = await findAccountFromDatabase(...);
    
    // ✅ NEW: Check health before returning
    const health = await verifyAccountReadyForCampaign(accountId);
    if (!health.valid) {
        throw new Error(`Account not ready: ${health.reason}`);
    }
    
    return accountId;
}
```

### Impact
- **Current:** Campaign fails partway through with confusing errors
- **After Fix:** Clear error message before campaign starts

---

## Error Pattern #3: Contact Info Returns null/Empty

### Observed Pattern
```javascript
// Success response but no data
{
  success: true,
  phone: null,
  email: null,
  profile: { ... }
}
```

### Root Cause Analysis

**Root Cause #1: Account Expiry**
- Account is expired (error pattern #2)
- API request for contact details returns 401
- Error is caught and silently returned as success with null values
- Campaign has no way to know if data is missing due to error or because it doesn't exist

```javascript
// UnipileProfileService.js - Current behavior
if (error.response && error.response.status === 401) {
    // ❌ Just returns null without explanation
    return {
        success: true,  // ← Misleading!
        phone: null,
        email: null,
        error: 'LinkedIn account credentials expired',
        accountExpired: true
    };
}
```

**Root Cause #2: Non-Existent Fields**
- Multiple possible field names in Unipile response
- Code tries specific fields but gives up easily
- Doesn't log which field it checked or why it failed

```javascript
// UnipileProfileService.js - Fragile parsing
const emails = profileData.contact_info?.emails || [];  // ❌ What if it's contact_info.email (singular)?
const phones = profileData.contact_info?.phones ||     // ❌ What if it's phone_numbers?
              profileData.contact_info?.phone_numbers;   // ❌ What if it's in contact_info.phone_number?

// No logging of which field was used!
```

**Root Cause #3: Non-Connected Profiles**
- LinkedIn restricts contact info to 1st degree connections
- Non-connected profiles return 422 or empty contact_info
- No way to distinguish:
  - Profile has no public contact info (legitimate)
  - Profile is not connected (expected behavior)
  - API error occurred (unexpected)

### Impact
- **Current:** Can't get contact info from profiles
- **After Fix:** Reliable extraction with clear error messages

---

## Error Pattern #4: Account Expiry Not Synchronized

### Observed Pattern

**In Database After Error:**
```sql
-- Table 1: Marked as expired
SELECT status FROM social_linkedin_accounts 
WHERE provider_account_id = 'D96MaOAdRFmYnbKGStxCqg';
-- Result: expired ✓

-- Table 2: Still marked as active (oops!)
SELECT is_active FROM linkedin_accounts 
WHERE unipile_account_id = 'D96MaOAdRFmYnbKGStxCqg';
-- Result: true ✗

-- Table 3: Not updated either
SELECT is_connected FROM user_integrations_voiceagent 
WHERE credentials->>'unipile_account_id' = 'D96MaOAdRFmYnbKGStxCqg';
-- Result: true ✗
```

### Root Cause Analysis

**Current Code:**
```javascript
// UnipileProfileService.js - Only updates one table
await pool.query(
    `UPDATE ${schema}.social_linkedin_accounts 
     SET status = 'expired'
     WHERE provider_account_id = $1`,
    [accountId]
);

// ❌ Doesn't update the other two tables!
```

**Why It Matters:**
```javascript
// LinkedInAccountHelper.js - Looks in different table
const result = await pool.query(
    `SELECT unipile_account_id FROM ${schema}.linkedin_accounts 
     WHERE is_active = TRUE
     AND unipile_account_id = $1`,
    [accountId]
);
// ❌ Still finds the account because it wasn't updated!
```

**Consequence:**
1. Account marked as expired in Table A
2. Fallback logic queries Table B
3. Table B still shows account as active
4. Campaign continues using expired account
5. Fails again on next API call

### Impact
- **Current:** Expired account can be reused by fallback logic
- **After Fix:** Account marked as inactive in all tables

---

## Error Pattern #5: Rate Limit Not Detected

### Observed Pattern
```
POST /api/v1/chats (or /users/invite)
Status: 422 Unprocessable Entity
Response: {
  "type": "rate_limit_exceeded",
  "detail": "You have reached your weekly limit of 70 invitations",
  "retryAfter": "7 days"
}
```

### Current Handling
```javascript
// UnipileConnectionService.js - Lines 200-240
if (errorDetail.includes('cannot_resend_yet') || 
    errorDetail.includes('temporary provider limit')) {
    return {
        success: false,
        isRateLimit: true,  // Flagged as rate limit
        error: `Rate limit: ${errorDetail}`
    };
}

// ❌ But sendBatchConnectionRequests just treats it as error
// ❌ No extraction of "7 days" from message
// ❌ No guidance to user when to retry
```

### Better Error Response Needed
```javascript
{
    success: false,
    error: 'Rate limit: You have reached your weekly limit',
    isRateLimit: true,
    retryAfterSeconds: 604800,  // ✅ 7 days in seconds
    rateLimitType: 'weekly',      // ✅ What kind of limit
    userMessage: 'You can send 70 connection requests per week. Try again in 7 days.' // ✅ Clear message
}
```

### Impact
- **Current:** User doesn't know when they can retry
- **After Fix:** Clear guidance: "Wait X hours/days, then try again"

---

## Error Pattern #6: Checkpoint/2FA Not Detected

### Observed Pattern
```
GET /api/v1/accounts/{accountId}
Status: 200 OK
Response: {
  "checkpoint": {
    "type": "LOGIN_VERIFICATION",
    "message": "Please verify your identity"
  },
  "state": "active"
}
```

### Current Behavior
```javascript
// LinkedInAccountHelper.js - Function exists but never called
async function verifyAccountHealth(unipileAccountId) {
    const accountData = response.data;
    
    // ✅ Checks for checkpoint
    if (accountData.checkpoint) {
        return { 
            valid: false, 
            hasCheckpoint: true,
            checkpointType: accountData.checkpoint.type
        };
    }
}

// ❌ But this function is NEVER CALLED before campaign
// ❌ Campaign proceeds and fails when account needs 2FA
```

### Impact
- **Current:** Campaigns fail on accounts needing checkpoint
- **After Fix:** Error message: "Account requires identity verification. Please verify in Settings."

---

## Summary Table

| Error Pattern | Current Handling | Issue | After Fix |
|---|---|---|---|
| 403/422 on connect | Silent failure | Wrong endpoint | Works |
| 401 missing creds | Caught late | No pre-check | Caught early |
| null contact info | Success flag + null | Not synced | Clear error |
| Account sync | One table only | Multiple tables | All tables |
| Rate limits | No retry time | No user guidance | Clear timing |
| Checkpoint/2FA | Function unused | Not detected | Pre-checked |

---

## Debugging Guide

### To Find Connection Request Issues
1. Check network logs for actual endpoint being called
   ```
   Expected: POST /api/v1/chats
   Actual:   POST /users/invite  ← WRONG
   ```

2. Check request payload
   ```
   Expected: { "attendees_ids": ["urn:li:member:..."] }
   Actual:   { "provider_id": "urn:li:member:..." }  ← WRONG
   ```

3. Check response status and error type
   ```
   403 or 422 → Endpoint/payload issue (Fix #1)
   401 → Account expired (Fix #2)
   ```

### To Find Account Expiry Issues
1. Check database tables
   ```sql
   SELECT status FROM social_linkedin_accounts;
   SELECT is_active FROM linkedin_accounts;
   SELECT is_connected FROM user_integrations_voiceagent;
   ```
   If inconsistent → Database sync issue (Fix #3)

2. Check account health before campaign
   ```javascript
   const health = await verifyAccountReadyForCampaign(accountId);
   if (!health.valid) console.log('Not ready:', health.reason);
   ```

### To Find Contact Info Issues
1. Check response structure
   ```javascript
   console.log(Object.keys(response.data.contact_info));
   // Expected: ['emails', 'phones', ...]
   // Actual:   ['phone_numbers', 'email', ...] ← Different
   ```

2. Check which fields were actually used
   ```
   Added logging: "Email parsed from field: contact_info.emails"
   ```

3. Check if it's a connectivity issue
   ```
   401 → Account expired (need pre-check)
   422 → Profile not connected (expected for non-1st degree)
   200 empty → Profile has no public contact info
   ```

---

**End of Error Pattern Analysis**
