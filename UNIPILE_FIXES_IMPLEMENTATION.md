# Unipile Endpoints - Implementation Fixes

This document provides exact code fixes for the critical issues identified in the endpoints review.

---

## Fix #1: Correct Connection Request Endpoint & Payload

### File: `UnipileConnectionService.js`

**Current Code (BROKEN):**
```javascript
// Line ~180
const payload = {
    provider: 'LINKEDIN',
    account_id: accountId,
    provider_id: encodedProviderId  // ❌ WRONG field
};

response = await axios.post(
    `${baseUrl}/users/invite`,  // ❌ WRONG endpoint
    payload,
    { headers, timeout: 30000 }
);
```

**Fixed Code:**
```javascript
// STEP 2: Send invitation with the CORRECT endpoint and payload structure
logger.debug('[Unipile] Step 2: Sending invitation to chat endpoint');

// Convert provider_id (urn format) to attendees_ids array format
// Unipile expects: ["urn:li:member:123456789"]
const attendeesIds = [encodedProviderId];

const payload = {
    provider: 'LINKEDIN',
    account_id: accountId,
    attendees_ids: attendeesIds  // ✅ CORRECT field name (array)
};

// Only include message if explicitly provided
if (customMessage) {
    payload.message = customMessage;
    logger.debug('[Unipile] Including custom message in connection request');
} else {
    logger.debug('[Unipile] Sending connection request without message');
}

logger.debug('[Unipile] Request payload', { payload, endpoint: `${baseUrl}/chats` });

let response;
try {
    response = await axios.post(
        `${baseUrl}/chats`,  // ✅ CORRECT endpoint
        payload,
        {
            headers: headers,
            timeout: Number(process.env.UNIPILE_PROFILE_TIMEOUT_MS) || 30000
        }
    );
```

**Why This Fix:**
- Unipile Classic API uses `/chats` endpoint for sending connection requests/messages
- Field must be `attendees_ids` (array) not `provider_id` (string)
- This matches the successful API patterns from conversation history

---

## Fix #2: Proactive Account Health Check Before Campaign

### File: `LinkedInAccountHelper.js` 

**Add new function to verify account before execution:**

```javascript
/**
 * Verify account is valid and ready before campaign execution
 * This should be called once per campaign, not per request
 * 
 * @param {string} unipileAccountId - Account ID to verify
 * @returns {Promise<Object>} { valid: boolean, reason: string, canRetry: boolean }
 */
async function verifyAccountReadyForCampaign(unipileAccountId) {
    try {
        const health = await verifyAccountHealth(unipileAccountId);
        
        if (!health.valid) {
            const reason = health.error || 'Account health check failed';
            
            // Check if it's recoverable
            const canRetry = 
                health.hasCheckpoint ||  // User can resolve checkpoint
                !health.expired;          // Not yet marked as expired
            
            logger.warn('[LinkedIn Account Helper] Account failed health check', {
                unipileAccountId,
                reason,
                hasCheckpoint: health.hasCheckpoint,
                expired: health.expired,
                canRetry
            });
            
            return {
                valid: false,
                reason: reason,
                canRetry: canRetry,
                requiresCheckpoint: health.hasCheckpoint || false
            };
        }
        
        logger.info('[LinkedIn Account Helper] Account health verified successfully', {
            unipileAccountId
        });
        
        return { valid: true, reason: 'OK', canRetry: false };
    } catch (error) {
        logger.error('[LinkedIn Account Helper] Error verifying account health', {
            error: error.message,
            unipileAccountId
        });
        
        // If we can't reach Unipile, assume account might still be valid
        // (network issue, not account issue)
        return {
            valid: true,
            reason: 'Could not verify, proceeding cautiously',
            canRetry: false,
            warning: error.message
        };
    }
}
```

**Update `getLinkedInAccountForExecution` to use health check:**

```javascript
async function getLinkedInAccountForExecution(tenantId, userId) {
    // ... existing code to find accountId ...
    
    if (accountResult.rows.length === 0) {
        return null;
    }
    
    const accountId = accountResult.rows[0].unipile_account_id;
    
    // ✅ NEW: Verify account health before returning
    const health = await verifyAccountReadyForCampaign(accountId);
    
    if (!health.valid) {
        logger.error('[LinkedIn Account Helper] Account is not ready for campaign execution', {
            accountId,
            reason: health.reason,
            requiresCheckpoint: health.requiresCheckpoint
        });
        
        // Return account info but flag it as requiring attention
        return {
            accountId: accountId,
            isValid: false,
            healthCheck: health,
            message: health.requiresCheckpoint 
                ? 'Account requires checkpoint verification. Please verify your identity in Settings.'
                : 'Account credentials expired. Please reconnect your LinkedIn account.'
        };
    }
    
    return accountId;  // or { accountId, isValid: true } for consistency
}

// Export the new function
module.exports = {
    getAllLinkedInAccountsForTenant,
    getLinkedInAccountForExecution,
    verifyAccountReadyForCampaign,  // ✅ NEW
    sendConnectionRequestWithFallback
};
```

---

## Fix #3: Synchronize Account Expiry Across All Schemas

### File: `UnipileProfileService.js`

**Replace the incomplete expiry marking code:**

```javascript
// Current broken code (Lines ~150-180):
await pool.query(
    `UPDATE ${schema}.social_linkedin_accounts 
     SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
     WHERE provider_account_id = $1`,
    [accountId]
);

// FIXED CODE:
async function markAccountAsExpired(accountId, schema) {
    let updateCount = 0;
    
    // Strategy 1: Update new TDD schema (linkedin_accounts)
    try {
        const linkedInAccountsResult = await pool.query(
            `UPDATE ${schema}.linkedin_accounts 
             SET is_active = FALSE, status = 'expired', updated_at = CURRENT_TIMESTAMP 
             WHERE unipile_account_id = $1
             AND status != 'expired'`,  // Avoid duplicate updates
            [accountId]
        );
        updateCount += linkedInAccountsResult.rowCount || 0;
        logger.info('[Unipile] Marked account as expired in linkedin_accounts table', {
            accountId,
            rowsUpdated: linkedInAccountsResult.rowCount
        });
    } catch (error) {
        logger.warn('[Unipile] Could not update linkedin_accounts (TDD schema may not exist)', {
            error: error.message
        });
    }
    
    // Strategy 2: Update old schema (user_integrations_voiceagent)
    try {
        const userIntegrationResult = await pool.query(
            `UPDATE ${schema}.user_integrations_voiceagent 
             SET is_connected = FALSE, updated_at = CURRENT_TIMESTAMP 
             WHERE (credentials->>'unipile_account_id' = $1 
                 OR credentials->>'account_id' = $1)
             AND provider = 'linkedin'
             AND is_connected = TRUE`,  // Avoid duplicate updates
            [accountId]
        );
        updateCount += userIntegrationResult.rowCount || 0;
        logger.info('[Unipile] Marked account as expired in user_integrations_voiceagent table', {
            accountId,
            rowsUpdated: userIntegrationResult.rowCount
        });
    } catch (error) {
        logger.warn('[Unipile] Could not update user_integrations_voiceagent', {
            error: error.message
        });
    }
    
    // Strategy 3: Update social_linkedin_accounts if it exists
    try {
        const socialResult = await pool.query(
            `UPDATE ${schema}.social_linkedin_accounts 
             SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
             WHERE provider_account_id = $1
             AND status != 'expired'`,
            [accountId]
        );
        updateCount += socialResult.rowCount || 0;
        logger.info('[Unipile] Marked account as expired in social_linkedin_accounts table', {
            accountId,
            rowsUpdated: socialResult.rowCount
        });
    } catch (error) {
        // social_linkedin_accounts might not exist, ignore
        logger.debug('[Unipile] Could not update social_linkedin_accounts (may not exist)', {
            error: error.message
        });
    }
    
    if (updateCount === 0) {
        logger.error('[Unipile] WARNING: Account expiry not persisted to ANY table!', { accountId });
        return { success: false, reason: 'No tables updated', totalUpdated: 0 };
    }
    
    logger.info('[Unipile] Account successfully marked as expired', {
        accountId,
        totalTablesUpdated: updateCount
    });
    
    return { success: true, totalUpdated: updateCount };
}

// Usage in error handler:
if (errorType.includes('missing_credentials') || errorTitle.includes('Missing credentials')) {
    logger.warn('[Unipile] Account credentials expired - marking as inactive across all schemas', { accountId });
    
    const expiredResult = await markAccountAsExpired(accountId, schema);
    
    if (!expiredResult.success) {
        logger.error('[CRITICAL] Failed to mark account as expired in database!', {
            accountId,
            reason: expiredResult.reason
        });
    }
    
    return {
        success: false,
        phone: null,
        email: null,
        error: 'LinkedIn account credentials expired. Please reconnect your LinkedIn account in Settings.',
        accountExpired: true,
        accountId: accountId,
        expiryPersisted: expiredResult.success  // Track if update succeeded
    };
}
```

---

## Fix #4: Standardize Contact Information Parsing

### File: `UnipileProfileService.js`

**Replace the fragile contact extraction with robust parsing:**

```javascript
/**
 * Extract contact information from Unipile profile response
 * Handles multiple possible field names and formats
 * 
 * @param {Object} profileData - Raw profile data from Unipile
 * @returns {Object} { emails: [], phones: [], parsedEmails: [], parsedPhones: [] }
 */
function extractContactInfo(profileData) {
    const contactInfo = profileData.contact_info || {};
    const extractedData = {
        rawEmails: [],
        rawPhones: [],
        parsedEmails: [],
        parsedPhones: [],
        fieldsChecked: []
    };
    
    // ===== EMAIL EXTRACTION =====
    // Try multiple field names
    const emailFields = [
        { path: 'contact_info.emails', priority: 1 },
        { path: 'contact_info.email', priority: 2 },
        { path: 'email', priority: 3 },
        { path: 'emails', priority: 4 }
    ];
    
    for (const field of emailFields) {
        const [first, second] = field.path.split('.');
        const value = second 
            ? (profileData[first]?.[second])
            : profileData[field.path];
        
        if (value && Array.isArray(value) && value.length > 0) {
            extractedData.rawEmails = value;
            extractedData.fieldsChecked.push(field.path);
            break;
        } else if (value && typeof value === 'string' && value.trim()) {
            extractedData.rawEmails = [value];
            extractedData.fieldsChecked.push(field.path);
            break;
        }
    }
    
    // Parse extracted emails
    for (const email of extractedData.rawEmails) {
        let parsedEmail = null;
        
        if (typeof email === 'string') {
            parsedEmail = email.trim();
        } else if (typeof email === 'object') {
            // Try common field names in email object
            parsedEmail = 
                email.email || 
                email.address || 
                email.value || 
                email.data ||
                (email.primary && email.primary.value);
        }
        
        if (parsedEmail && typeof parsedEmail === 'string') {
            extractedData.parsedEmails.push(parsedEmail.toLowerCase().trim());
        }
    }
    
    // ===== PHONE EXTRACTION =====
    // Try multiple field names
    const phoneFields = [
        { path: 'contact_info.phones', priority: 1 },
        { path: 'contact_info.phone_numbers', priority: 2 },
        { path: 'phone_numbers', priority: 3 },
        { path: 'contact_info.phone_number', priority: 4 },
        { path: 'phone_number', priority: 5 }
    ];
    
    for (const field of phoneFields) {
        const [first, second] = field.path.split('.');
        const value = second 
            ? (profileData[first]?.[second])
            : profileData[field.path];
        
        if (value && Array.isArray(value) && value.length > 0) {
            extractedData.rawPhones = value;
            extractedData.fieldsChecked.push(field.path);
            break;
        } else if (value && typeof value === 'string' && value.trim()) {
            extractedData.rawPhones = [value];
            extractedData.fieldsChecked.push(field.path);
            break;
        }
    }
    
    // Parse extracted phones
    for (const phone of extractedData.rawPhones) {
        let parsedPhone = null;
        
        if (typeof phone === 'string') {
            parsedPhone = phone.trim();
        } else if (typeof phone === 'object') {
            // Try common field names in phone object
            parsedPhone = 
                phone.number || 
                phone.phone || 
                phone.value || 
                phone.raw_number ||
                phone.full_number ||
                (phone.primary && phone.primary.value);
        }
        
        if (parsedPhone && typeof parsedPhone === 'string') {
            // Remove spaces and dashes for consistency
            const normalizedPhone = parsedPhone.trim().replace(/[\s\-]/g, '');
            extractedData.parsedPhones.push(normalizedPhone);
        }
    }
    
    logger.debug('[Unipile] Contact info extraction completed', {
        emailsFound: extractedData.parsedEmails.length,
        phonesFound: extractedData.parsedPhones.length,
        fieldsChecked: extractedData.fieldsChecked,
        rawEmailCount: extractedData.rawEmails.length,
        rawPhoneCount: extractedData.rawPhones.length
    });
    
    return extractedData;
}

// Use in getLinkedInContactDetails():
const extractedInfo = extractContactInfo(profileData);

const email = extractedInfo.parsedEmails.length > 0 
    ? extractedInfo.parsedEmails[0] 
    : null;

const phone = extractedInfo.parsedPhones.length > 0 
    ? extractedInfo.parsedPhones[0] 
    : null;

logger.info('[Unipile] Extracted contact details', {
    hasEmail: !!email,
    hasPhone: !!phone,
    emailSource: extractedInfo.fieldsChecked[0] || 'unknown',
    phoneSource: extractedInfo.fieldsChecked[1] || 'unknown'
});

return {
    success: true,
    phone: phone,
    email: email,
    contactInfoAvailable: !!(email || phone),  // ✅ NEW: Clear flag
    sourceFields: extractedInfo.fieldsChecked,  // Track which fields were used
    additionalEmails: extractedInfo.parsedEmails.slice(1),  // Store alternatives
    additionalPhones: extractedInfo.parsedPhones.slice(1),
    profile: {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        headline: profileData.headline,
        public_identifier: profileData.public_identifier,
        summary: profileData.summary,
        bio: profileData.bio,
        company: profileData.company,
        location: profileData.location,
        title: profileData.title
    }
};
```

---

## Fix #5: Intelligent Rate Limit Handling

### File: `UnipileConnectionService.js`

**Improve error response parsing:**

```javascript
/**
 * Parse Unipile error response and categorize the issue
 * 
 * @param {Object} errorResponse - axios error.response object
 * @returns {Object} { type, retryable, retryAfter, message }
 */
function categorizeUnipileError(errorResponse) {
    const status = errorResponse.status;
    const data = errorResponse.data || {};
    const errorType = data.type || '';
    const errorMessage = data.detail || data.message || '';
    
    logger.debug('[Unipile] Categorizing error response', {
        status,
        errorType,
        errorMessagePreview: errorMessage.substring(0, 100)
    });
    
    // 404: Account or profile not found
    if (status === 404) {
        if (errorMessage.includes('Account not found') || errorType.includes('account_not_found')) {
            return {
                type: 'account_not_found',
                retryable: false,
                message: 'LinkedIn account not found in Unipile',
                userMessage: 'Please reconnect your LinkedIn account'
            };
        }
        return {
            type: 'profile_not_found',
            retryable: false,
            message: 'LinkedIn profile not found',
            userMessage: 'Profile may have been deleted or is inaccessible'
        };
    }
    
    // 401: Credentials expired
    if (status === 401) {
        return {
            type: 'credentials_expired',
            retryable: false,
            message: 'LinkedIn credentials expired',
            userMessage: 'Please reconnect your LinkedIn account in Settings'
        };
    }
    
    // 409: Conflict (already sent)
    if (status === 409) {
        return {
            type: 'already_sent',
            retryable: false,
            alreadySent: true,
            message: 'Invitation already sent',
            userMessage: 'You have already sent an invitation to this profile'
        };
    }
    
    // 422: Unprocessable Entity (various issues)
    if (status === 422) {
        // Check for rate limit messages
        if (errorMessage.includes('temporary provider limit') ||
            errorMessage.includes('provider limit') ||
            errorMessage.includes('cannot_resend_yet') ||
            errorMessage.includes('weekly limit') ||
            errorMessage.includes('monthly limit')) {
            
            // Extract retry time if available
            let retryAfterSeconds = 3600; // Default: 1 hour
            const match = errorMessage.match(/(\d+)\s*(hours?|days?|weeks?)/i);
            if (match) {
                const value = parseInt(match[1]);
                const unit = match[2].toLowerCase();
                if (unit.includes('hour')) retryAfterSeconds = value * 3600;
                else if (unit.includes('day')) retryAfterSeconds = value * 86400;
                else if (unit.includes('week')) retryAfterSeconds = value * 604800;
            }
            
            return {
                type: 'rate_limit',
                retryable: true,
                retryAfterSeconds: retryAfterSeconds,
                message: `Rate limit reached: ${errorMessage}`,
                userMessage: `You've reached your weekly connection request limit. Try again in ${Math.ceil(retryAfterSeconds / 3600)} hours.`,
                rateLimitType: errorMessage.includes('weekly') ? 'weekly' : 
                              errorMessage.includes('monthly') ? 'monthly' : 
                              'temporary'
            };
        }
        
        // Already invited
        if (errorMessage.includes('already') && errorMessage.includes('invited')) {
            return {
                type: 'already_sent',
                retryable: false,
                alreadySent: true,
                message: 'Connection already sent',
                userMessage: 'You have already sent an invitation to this profile'
            };
        }
        
        // Permission denied
        if (errorMessage.includes('permission') || errorMessage.includes('cannot')) {
            return {
                type: 'permission_denied',
                retryable: false,
                message: `Permission denied: ${errorMessage}`,
                userMessage: 'You do not have permission to connect with this profile'
            };
        }
        
        // Generic 422
        return {
            type: 'unprocessable',
            retryable: false,
            message: `Unprocessable request: ${errorMessage}`,
            userMessage: 'Unable to send invitation. Please verify the profile is valid.'
        };
    }
    
    // 429: Too Many Requests (global rate limit)
    if (status === 429) {
        return {
            type: 'global_rate_limit',
            retryable: true,
            retryAfterSeconds: 60,
            message: 'Too many requests to Unipile API',
            userMessage: 'Too many requests. Please wait a minute before trying again.'
        };
    }
    
    // Generic error
    return {
        type: 'unknown_error',
        retryable: false,
        message: `HTTP ${status}: ${errorMessage}`,
        userMessage: 'An unexpected error occurred. Please try again later.'
    };
}

// Usage in error handler:
if (inviteError.response) {
    const errorCategory = categorizeUnipileError(inviteError.response);
    
    logger.error('[Unipile] Categorized error', {
        type: errorCategory.type,
        retryable: errorCategory.retryable,
        userMessage: errorCategory.userMessage
    });
    
    return {
        success: false,
        error: errorCategory.message,
        userMessage: errorCategory.userMessage,  // ✅ For UI
        errorType: errorCategory.type,
        retryable: errorCategory.retryable,
        retryAfterSeconds: errorCategory.retryAfterSeconds,  // ✅ For intelligent retry
        alreadySent: errorCategory.alreadySent,
        employee: { fullname: employee.fullname }
    };
}
```

---

## Fix #6: Improve Batch Rate Limiting

### File: `UnipileConnectionService.js`

**Update batch operation to be rate-limit aware:**

```javascript
async sendBatchConnectionRequests(employees, customMessage = null, accountId = null, options = {}) {
    const {
        delay = 2000,
        stopOnError = false,
        stopOnRateLimit = true  // ✅ NEW: Stop when rate limited
    } = options;

    const results = {
        total: employees.length,
        successful: 0,
        failed: 0,
        skipped: 0,
        results: []
    };
    
    let globalRateLimitHit = false;
    let accountRateLimitResetTime = null;

    for (let i = 0; i < employees.length; i++) {
        const employee = employees[i];
        
        // Check if we hit account rate limit previously
        if (globalRateLimitHit && stopOnRateLimit) {
            logger.info('[Unipile] Skipping remaining employees due to rate limit', {
                remaining: employees.length - i
            });
            results.skipped += (employees.length - i);
            break;
        }
        
        try {
            logger.debug('[Unipile] Processing employee', { index: i + 1, total: employees.length });
            
            const result = await this.sendConnectionRequest(employee, customMessage, accountId);
            results.results.push(result);
            
            if (result.success) {
                results.successful++;
                logger.info('[Unipile] Successfully sent connection request', {
                    employee: employee.fullname,
                    index: i + 1
                });
            } else {
                results.failed++;
                
                // Check for rate limit in error response
                if (result.retryable && result.retryAfterSeconds) {
                    logger.error('[Unipile] Rate limit encountered', {
                        type: result.errorType,
                        retryAfterSeconds: result.retryAfterSeconds,
                        remainingEmployees: employees.length - i - 1
                    });
                    
                    globalRateLimitHit = true;
                    accountRateLimitResetTime = result.retryAfterSeconds;
                    
                    if (stopOnRateLimit) {
                        logger.info('[Unipile] Stopping batch due to rate limit');
                        results.skipped += (employees.length - i - 1);
                        break;
                    }
                } else {
                    logger.error('[Unipile] Error sending invitation', {
                        employee: employee.fullname,
                        error: result.error
                    });
                    
                    if (stopOnError) {
                        logger.info('[Unipile] Stopping batch due to error');
                        results.skipped += (employees.length - i - 1);
                        break;
                    }
                }
            }
        } catch (error) {
            results.failed++;
            logger.error('[Unipile] Exception processing employee', {
                employee: employee.fullname,
                error: error.message
            });
            results.results.push({
                success: false,
                error: error.message,
                employee: { fullname: employee.fullname }
            });
            
            if (stopOnError) {
                results.skipped += (employees.length - i - 1);
                break;
            }
        }

        // Add delay between requests
        if (i < employees.length - 1 && delay > 0) {
            logger.debug('[Unipile] Waiting before next request', { delayMs: delay });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    logger.info('[Unipile] Batch operation complete', {
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped,
        total: results.total,
        rateLimitHit: globalRateLimitHit,
        rateLimitResetIn: accountRateLimitResetTime
    });

    return {
        success: results.failed === 0 && results.skipped === 0,
        ...results,
        rateLimitEncountered: globalRateLimitHit,  // ✅ NEW
        rateLimitResetInSeconds: accountRateLimitResetTime  // ✅ NEW
    };
}
```

---

## Summary of Changes

| Fix | File | Lines | Impact | Priority |
|-----|------|-------|--------|----------|
| 1. Connection endpoint & payload | UnipileConnectionService.js | ~180 | Fixes all 403/422 errors | 🔴 CRITICAL |
| 2. Health check before campaign | LinkedInAccountHelper.js | NEW | Catches expired accounts early | 🔴 CRITICAL |
| 3. Sync expiry across schemas | UnipileProfileService.js | ~150 | Prevents using expired accounts | 🔴 CRITICAL |
| 4. Robust contact parsing | UnipileProfileService.js | ~170 | Handles all field name variations | 🔴 CRITICAL |
| 5. Error categorization | UnipileConnectionService.js | NEW | Clear error handling | 🟡 HIGH |
| 6. Rate limit awareness | UnipileConnectionService.js | ~340 | Intelligent batch handling | 🟡 HIGH |

---

## Testing Commands

After applying fixes, test with:

```bash
# Test connection request with correct endpoint
curl -X POST "https://api8.unipile.com:13811/api/v1/chats" \
  -H "Authorization: Bearer $UNIPILE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "LINKEDIN",
    "account_id": "D96MaOAdRFmYnbKGStxCqg",
    "attendees_ids": ["urn:li:member:123456789"],
    "message": "Let'\''s connect!"
  }'

# Test account health
curl -X GET "https://api8.unipile.com:13811/api/v1/accounts/D96MaOAdRFmYnbKGStxCqg" \
  -H "Authorization: Bearer $UNIPILE_TOKEN"

# Test contact info with all fields
curl -X GET "https://api8.unipile.com:13811/api/v1/users/diana-jane-sioson?account_id=D96MaOAdRFmYnbKGStxCqg&linkedin_sections=*" \
  -H "Authorization: Bearer $UNIPILE_TOKEN" | jq '.contact_info'
```

---

**End of Implementation Fixes**
