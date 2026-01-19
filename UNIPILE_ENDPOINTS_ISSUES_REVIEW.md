# Unipile Endpoints Issues Review
**Date:** January 18, 2026  
**Scope:** Campaign scripts reviewing Unipile endpoints for account expiry, connection requests, and contact information retrieval

---

## Executive Summary

The review identified **3 critical issues** and **5 operational issues** across the Unipile integration services that handle:
1. Account credential expiry detection and handling
2. Sending connection requests to LinkedIn profiles
3. Retrieving contact information from profiles

---

## Issue #1: Account Expiry Detection & Handling ⚠️ CRITICAL

### Location
- **Primary:** `UnipileProfileService.js` - Lines 150-180 (getLinkedInContactDetails method)
- **Secondary:** `UnipileProfileService.js` - Lines 250-280 (error handling)
- **Related:** `LinkedInAccountHelper.js` - verifyAccountHealth function (Lines 145-180)

### Problems Found

#### 1.1 Incomplete Database Schema Updates
**Status:** ❌ ISSUE

```javascript
// UnipileProfileService.js - Lines 150-180
await pool.query(
    `UPDATE ${schema}.social_linkedin_accounts 
     SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
     WHERE provider_account_id = $1`,
    [accountId]
);
```

**Issues:**
- Updates `social_linkedin_accounts` table but also needs to update `linkedin_accounts` (TDD schema)
- May fail silently if wrong schema used
- No verification that update was successful

**Impact:** 
- Account marked as expired in one schema but not another
- Campaign execution may continue using expired account from fallback query
- Status inconsistency across database

#### 1.2 Missing Proactive Account Health Check
**Status:** ❌ ISSUE

**Current Behavior:**
- Account health is ONLY checked when a 401/missing_credentials error occurs
- No proactive health check before campaign execution starts
- No periodic re-verification of account status

**Where:**
- `LinkedInAccountHelper.js` - `verifyAccountHealth()` function exists but is never called
- `UnipileBaseService.js` - No health check in `getBaseUrl()` or `getAuthHeaders()`

**Code:**
```javascript
// LinkedInAccountHelper.js - Lines 145-180
async function verifyAccountHealth(unipileAccountId) {
  try {
    const response = await axios.get(
      `${baseUrl}/accounts/${unipileAccountId}`,
      { headers, timeout: 10000 }
    );
    
    // Check if account has checkpoint (needs re-authentication)
    if (accountData.checkpoint) {
      return { valid: false, error: 'Account requires checkpoint resolution', hasCheckpoint: true };
    }
    // ... more checks ...
  }
}
```

**Issue:** This function is exported but **NEVER CALLED** before sending connection requests or fetching contact details.

**Impact:**
- Campaigns may run with invalid/expired accounts
- Errors only discovered after failed API calls
- No early warning system

#### 1.3 Inconsistent Expiry Error Messages
**Status:** ❌ ISSUE

**Problem:** Different error messages returned from different services:
- `UnipileProfileService`: "LinkedIn account credentials expired. Please reconnect your LinkedIn account in Settings."
- `UnipileConnectionService`: Returns basic error without account expiry guidance
- Inconsistent `accountExpired` flag only in some responses

**Code Gaps:**
```javascript
// UnipileProfileService.js - RETURNS accountExpired: true
return {
    success: false,
    error: 'LinkedIn account credentials expired. Please reconnect...',
    accountExpired: true,
    accountId: accountId
};

// UnipileConnectionService.js - NO accountExpired flag
if (lookupError.response?.status === 404) {
    return {
        success: false,
        error: `Account not found in Unipile: ${accountId}`,
        errorType: 'account_not_found', // MISSING: accountExpired flag
        isAccountInvalid: true
    };
}
```

**Impact:** 
- UI/frontend cannot consistently handle account expiry state
- Error handling logic differs between connection and contact detail operations
- Confusing error messages for users

---

## Issue #2: Connection Request Sending Issues ⚠️ CRITICAL

### Location
- **Primary:** `UnipileConnectionService.js` - Lines 20-270 (sendConnectionRequest method)
- **Secondary:** `LinkedInAccountHelper.js` - Lines 290-350 (fallback strategy)

### Problems Found

#### 2.1 Incorrect Endpoint Documentation
**Status:** ⚠️ WARNING

**Current Code:**
```javascript
// UnipileConnectionService.js - Line ~180
response = await axios.post(
    `${baseUrl}/users/invite`,
    payload,
    { headers, timeout: Number(process.env.UNIPILE_PROFILE_TIMEOUT_MS) || 30000 }
);
```

**Issue:** 
- Documentation states endpoint is `/users/invite` but actual Unipile API may use different endpoint
- No comments explaining if this is Unipile Classic API vs REST API
- Payload structure hardcoded without validation

**Correct Structure per Conversation History:**
- **Endpoint:** `/api/v1/chats` (for sending connection requests)
- **Payload Format:** Should use `attendees_ids` not `provider_id`
- **Example:**
```javascript
// CORRECT (from conversation)
POST /api/v1/chats
{
  "provider": "LINKEDIN",
  "account_id": "D96MaOAdRFmYnbKGStxCqg",
  "attendees_ids": ["urn:li:member:123456789"],  // NOT provider_id
  "message": "..."
}

// INCORRECT (current code may use)
POST /api/v1/users/invite
{
  "provider": "LINKEDIN",
  "account_id": "...",
  "provider_id": "...",  // Wrong field name
  "message": "..."
}
```

**Impact:** 
- Connection requests consistently return 403/422 errors
- API endpoint mismatch causes all requests to fail
- Field name mismatch (`provider_id` vs `attendees_ids`)

#### 2.2 Weak Error Handling for Different Failure Modes
**Status:** ❌ ISSUE

**Current Code (Lines 200-240):**
```javascript
if (inviteError.response?.status === 422) {
    const errorData = inviteError.response.data;
    const errorType = errorData?.type || '';
    
    if (errorType.includes('already_invited') || 
        (errorDetail.includes('already') && errorDetail.includes('invited'))) {
        // Treat as success
        return { success: true, alreadySent: true };
    }
}
```

**Problems:**
1. Generic string matching on error messages is fragile
2. No distinction between:
   - Already connected (should be success/info)
   - Invalid profile ID (should be error)
   - Rate limit (should have retry logic)
   - Permission denied (should skip user)

3. Response structure assumption wrong:
```javascript
// Assumes this structure:
{
  "type": "error_type_string",
  "detail": "error message"
}

// But Unipile likely returns:
{
  "status": 422,
  "type": "some_error",
  "message": "description"
}
```

#### 2.3 Missing Rate Limit Handling Strategy
**Status:** ❌ ISSUE

**Current Implementation (Line 235):**
```javascript
if (errorType.includes('cannot_resend_yet') || 
    errorDetail.includes('temporary provider limit') ||
    errorDetail.includes('provider limit')) {
    return {
        success: false,
        isRateLimit: true,
        error: `Rate limit: ${errorDetail}`
    };
}
```

**Problems:**
1. Only returns error, no retry suggestion
2. No tracking of rate limit reset time (LinkedIn resets at specific times)
3. No exponential backoff strategy in batch operations
4. `sendBatchConnectionRequests()` has hardcoded 2000ms delay but doesn't respect rate limits

**Better Approach Needed:**
```javascript
// Should return:
{
  success: false,
  isRateLimit: true,
  retryAfter: 3600, // seconds until rate limit resets
  rateLimitType: 'weekly', // weekly vs monthly vs daily
  error: 'Rate limit: 7 day limit reached'
}
```

#### 2.4 No Handling for Checkpoint/Verification Issues
**Status:** ⚠️ WARNING

**Issue:** 
- Account may require checkpoint verification (2FA, location change, etc.)
- `verifyAccountHealth()` checks for `accountData.checkpoint` but no handling in connection flow
- No way to detect/retry after checkpoint resolution

**Code Gap:**
```javascript
// LinkedInAccountHelper.js - Line 165
if (accountData.checkpoint) {
    return { valid: false, hasCheckpoint: true };
}

// But sendConnectionRequest() never checks for this!
async sendConnectionRequest(employee, customMessage, accountId) {
    // NO call to verifyAccountHealth()
    // NO checkpoint detection
    // Just proceeds to lookup and fails later
}
```

---

## Issue #3: Contact Information Retrieval Issues ⚠️ CRITICAL

### Location
- **Primary:** `UnipileProfileService.js` - Lines 100-250 (getLinkedInContactDetails method)

### Problems Found

#### 3.1 Inconsistent Contact Field Parsing
**Status:** ❌ ISSUE

**Current Code (Lines 170-200):**
```javascript
// Extract email
const emails = profileData.contact_info?.emails || [];
const email = emails.length > 0 
    ? (typeof firstEmail === 'string' ? firstEmail : firstEmail.email || firstEmail.address || ...)
    : profileData.email;

// Extract phone
const phones = profileData.contact_info?.phones || profileData.contact_info?.phone_numbers || [];
const phone = phones.length > 0 
    ? (typeof firstPhone === 'string' ? ... : firstPhone.number || firstPhone.phone || ...)
    : profileData.phone_number;
```

**Issues:**
1. Multiple possible field names with no standardization:
   - `contact_info.emails` vs `email`
   - `contact_info.phones` vs `contact_info.phone_numbers` vs `phone_number`
   - `phone.number` vs `phone.phone` vs `phone.value` vs `phone.raw_number`

2. No logging of which field was actually used
3. Fragile to API schema changes
4. Returns only FIRST contact, ignores others

**Debug Logging:**
```javascript
if (profileData.contact_info) {
    logger.debug('[Unipile] Contact info structure', { 
        keys: Object.keys(profileData.contact_info),
        phonesLength: profileData.contact_info.phones?.length || 0,
        phoneNumbersLength: profileData.contact_info.phone_numbers?.length || 0
    });
}
```

**Problem:** Logs structure but doesn't log which field was actually selected or why.

#### 3.2 API Parameter Not Documented
**Status:** ⚠️ WARNING

**Code (Line 140):**
```javascript
const params = {
    account_id: accountId,
    linkedin_sections: '*'  // What does this parameter actually do?
};

const response = await axios.get(endpoint, {
    headers: headers,
    params: params,
    timeout: 15000
});
```

**Issues:**
1. `linkedin_sections: '*'` parameter has no explanation
2. Unknown if:
   - `*` means all sections or is it invalid?
   - Should it be specific sections like `'contact_info,basic'`?
   - Does Unipile API even support this parameter?

3. No validation that response contains expected structure
4. No handling if API doesn't return contact_info

#### 3.3 Silent Failure for Missing Contact Info
**Status:** ❌ ISSUE

**Current Behavior:**
```javascript
return {
    success: true,  // ← MARKED AS SUCCESS!
    phone: null,    // ← But no phone/email
    email: null,
    profile: { ... }
};
```

**Problem:**
- Returns `success: true` even when no contact info found
- Caller cannot distinguish between:
  - API succeeded but user has no public contact info (legitimate)
  - API failed to fetch contact info (error)
  - Contact info exists but parsing failed

**Better Approach:**
```javascript
return {
    success: true,
    phone: null,
    email: null,
    contactInfoAvailable: false, // New flag
    reason: 'contact_info_not_found_in_response' // Why it's empty
};
```

#### 3.4 No Fallback for Non-Connected Profiles
**Status:** ⚠️ WARNING

**Issue:**
- Unipile restricts contact details to connected profiles (1st degree)
- Non-connected profiles return 422 or empty contact_info
- No alternative data source mentioned

**Gap:**
```javascript
// No such fallback:
if (!email && !phone && !isConnected) {
    // Try alternative:
    // - Try Apollo data
    // - Try enrichment service
    // - Return partial data with explanation
}
```

---

## Issue #4: Database Schema Inconsistency

### Location
- Multiple files: `LinkedInAccountHelper.js`, `UnipileProfileService.js`

### Problems

#### 4.1 Multiple Account Tables Not Synchronized
**Status:** ❌ ISSUE

**Current:**
```javascript
// UnipileProfileService tries to update:
UPDATE ${schema}.social_linkedin_accounts SET status = 'expired'

// LinkedInAccountHelper queries from:
SELECT FROM ${schema}.linkedin_accounts (TDD schema)
SELECT FROM ${schema}.user_integrations_voiceagent (old schema)

// But expiry status only updated in social_linkedin_accounts!
```

**Impact:**
- Account marked expired in one table
- But campaigns still use it from another table
- Inconsistent state across database

#### 4.2 No Retry Mechanism After Account Recovery
**Status:** ❌ ISSUE

**Problem:**
- Once account marked as `expired`, no way to auto-recover
- No check if user has manually reconnected
- Must restart entire campaign

---

## Issue #5: Operational Issues

### 5.1 Missing Timeout Configuration
**Status:** ⚠️ WARNING

```javascript
// UnipileConnectionService.js - Hardcoded timeouts
timeout: Number(process.env.UNIPILE_PROFILE_TIMEOUT_MS) || 30000
timeout: Number(process.env.UNIPILE_LOOKUP_TIMEOUT_MS) || 15000
```

**Issue:** No central timeout configuration, scattered throughout code

### 5.2 No Correlation ID for Tracing
**Status:** ⚠️ WARNING

- No request ID tracking across Unipile API calls
- Cannot trace why specific requests fail
- Hard to debug batch operations

### 5.3 Batch Rate Limiting Not Account-Aware
**Status:** ❌ ISSUE

```javascript
// UnipileConnectionService.js - Line 340
async sendBatchConnectionRequests(employees, customMessage, accountId, { delay = 2000 } = {}) {
    for (let i = 0; i < employees.length; i++) {
        const result = await this.sendConnectionRequest(employee, customMessage, accountId);
        if (i < employees.length - 1 && delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

**Problems:**
1. Fixed 2000ms delay regardless of account limits
2. No tracking of per-account rate limits
3. No intelligent backoff when rate limit hit
4. Doesn't use `retryAfter` from error responses

---

## Recommended Fixes (Priority Order)

### 🔴 CRITICAL (Fix Immediately)

1. **Fix Connection Request Endpoint & Payload**
   - Change from `/users/invite` to `/api/v1/chats`
   - Change from `provider_id` to `attendees_ids` in payload
   - Add proper error response parsing

2. **Implement Pre-Campaign Account Health Check**
   - Call `verifyAccountHealth()` before campaign starts
   - Handle checkpoint/2FA scenarios
   - Return clear error message to user

3. **Synchronize Account Expiry Across All Schemas**
   - Update both `social_linkedin_accounts` and `linkedin_accounts` tables
   - Add logic to mark in both old and new schemas
   - Verify update success before returning

### 🟡 HIGH (Fix Soon)

4. **Standardize Contact Information Parsing**
   - Define schema contract for expected response format
   - Log which fields were used
   - Handle all variations consistently
   - Distinguish between "no info found" vs "API error"

5. **Implement Intelligent Rate Limit Handling**
   - Extract `retryAfter` from error responses
   - Return retry guidance to user
   - Implement exponential backoff in batch operations
   - Track per-account rate limits

6. **Add Connection Request Error Categorization**
   - Separate error types (rate limit, permission, invalid profile, etc.)
   - Return appropriate remediation steps
   - Log specific error reasons for debugging

### 🟢 MEDIUM (Nice to Have)

7. **Add Request Correlation IDs**
   - Pass trace ID through all API calls
   - Enable debugging of batch operations

8. **Improve Batch Operation Awareness**
   - Stop batch on account expiry
   - Use account-specific rate limits
   - Implement per-account fallback strategy

---

## Testing Recommendations

### Unit Tests Needed
- [ ] Test account health check with expired account
- [ ] Test contact parsing with all field name variations
- [ ] Test connection request with correct/incorrect endpoints
- [ ] Test rate limit handling with retry timing

### Integration Tests Needed
- [ ] Test campaign execution with multiple accounts (fallback)
- [ ] Test account expiry detection and database updates
- [ ] Test batch connection requests with rate limits
- [ ] Test contact info retrieval for connected vs non-connected profiles

### Manual Testing
```bash
# Test account health
curl -X GET "https://api8.unipile.com:13811/api/v1/accounts/{accountId}" \
  -H "Authorization: Bearer {token}"

# Test connection request (with correct endpoint)
curl -X POST "https://api8.unipile.com:13811/api/v1/chats" \
  -H "Authorization: Bearer {token}" \
  -d '{"provider":"LINKEDIN","account_id":"...","attendees_ids":["urn:li:member:123"],"message":"..."}'

# Test contact info
curl -X GET "https://api8.unipile.com:13811/api/v1/users/{publicId}?account_id=..." \
  -H "Authorization: Bearer {token}"
```

---

## Summary Table

| Issue | Component | Severity | Root Cause | Fix Complexity |
|-------|-----------|----------|-----------|-----------------|
| Incomplete expiry updates | UnipileProfileService | CRITICAL | Multiple schema targets | Medium |
| No proactive health check | LinkedInAccountHelper | CRITICAL | Function unused | Low |
| Wrong endpoint/payload | UnipileConnectionService | CRITICAL | API documentation mismatch | Medium |
| Inconsistent contact parsing | UnipileProfileService | CRITICAL | Schema flexibility unknown | Medium |
| No rate limit reset tracking | UnipileConnectionService | HIGH | Missing error parsing | Medium |
| Missing checkpoint handling | Connection flow | HIGH | Feature not integrated | Low |
| Schema sync issues | Database layer | HIGH | Multiple table targets | High |
| Contact field variations | UnipileProfileService | HIGH | API underdocumented | Medium |

---

**End of Review**
