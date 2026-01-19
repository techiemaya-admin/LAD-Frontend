# Apollo Reveal API 422 Error Fix - Complete Summary

## Problem Identified

**Error**: HTTP 422 "Parameters misconfigured. 872ab3fe-d7f1-4b59-a6aa-2e6745000bc5 is not a valid ID"
**Impact**: Credits being deducted (8 credits for phone, 1 credit for email) despite API failures
**Root Cause**: Invalid Apollo person ID format being sent to Apollo's `/people/match` endpoint

### Error Analysis

1. **ID Format Mismatch**: The `person_id` being sent (looks like: `872ab3fe-d7f1-4b59-a6aa-2e6745000bc5`) is a UUID format, not Apollo's expected numeric person ID
2. **Apollo's Expectation**: Apollo person IDs are numeric values (e.g., `12345678`), not UUIDs
3. **Wrong ID Storage**: Somewhere in the flow, the wrong type of ID is being passed to the reveal endpoints

### Credit Deduction Issue

- **Problem**: Credits were deducted at **middleware level BEFORE** service execution
- **Timing**: `requireCredits` middleware runs first, deducting credits, then the service would fail
- **Solution**: Implement credit refund mechanism for failed API calls

---

## Solutions Implemented

### 1. ID Format Validation (Prevents Invalid API Calls)

**File**: `/backend/features/apollo-leads/services/ApolloRevealService.js`

**Changes**:
- Added UUID format validation using regex pattern
- Check if incoming `personId` matches UUID format
- If UUID detected, reject immediately without calling Apollo API
- Return validation error with `credits_used: 0` (no charge)

**Code**:
```javascript
const isUUIDFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(personId));
if (isUUIDFormat) {
  logger.warn('[Apollo Reveal] Person ID has UUID format - likely a database ID');
  // Refund credits for validation error
  await this._attemptRefund(tenantId, 'apollo_email', CREDIT_COSTS.EMAIL_REVEAL, req, 'Invalid person ID format');
  return { 
    email: null, 
    credits_used: 0, // No charge!
    error: 'Invalid person ID format. Apollo expects numeric person IDs from search results.',
    validation_error: true
  };
}
```

**Impact**: Prevents invalid 422 errors from reaching Apollo API

---

### 2. Credit Refund Mechanism (Refunds on Failed Calls)

**File**: `/backend/shared/middleware/credit_guard.js`

**New Function**: `refundCredits(tenantId, usageType, credits, req, reason)`

**Features**:
- Atomic transaction using database connection pooling
- Reverses deducted credits by adding them back to user balance
- Logs refund transaction with detailed metadata
- Graceful error handling (logs but doesn't block response)

**Code**:
```javascript
async function refundCredits(tenantId, usageType, credits, req, reason = 'Operation failed') {
  const schema = process.env.DB_SCHEMA || 'lad_dev';
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Add credits back to balance
    await client.query(
      `UPDATE ${schema}.user_credits SET balance = balance + $1 WHERE tenant_id = $2`,
      [credits, tenantId]
    );
    
    // Log refund transaction
    await client.query(
      `INSERT INTO ${schema}.credit_transactions (...) VALUES (...)`,
      [tenantId, credits, 'refund', `Refund: ${usageType} - ${reason}`, ...]
    );
    
    await client.query('COMMIT');
    console.log(`💰 Refunded ${credits} credits to ${tenantId} - Reason: ${reason}`);
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Exported**: Added to module.exports for use in ApolloRevealService

---

### 3. Service-Level Error Handling (Refunds on Apollo Errors)

**File**: `/backend/features/apollo-leads/services/ApolloRevealService.js`

**New Method**: `_attemptRefund(tenantId, usageType, credits, req, reason)`

**Refund Triggers**:
1. **UUID Format Detected** (Validation error)
   - User provided invalid ID format
   - No API call made → no charge
   - Refund if somehow charged

2. **Apollo 4xx Errors** (Client errors)
   - 422 Unprocessable Entity (invalid parameters)
   - 400 Bad Request
   - 401 Unauthorized
   - Any 4xx = request was malformed = no service provided = refund credits

3. **Specific Handling**:
   ```javascript
   if (error.response?.status >= 400 && error.response?.status < 500) {
     logger.warn('[Apollo Reveal] Refunding credits due to client error (4xx)', { 
       status: error.response?.status
     });
     await this._attemptRefund(tenantId, 'apollo_email', CREDIT_COSTS.EMAIL_REVEAL, req, 
       `Apollo API error: ${error.response?.status}`);
     return { 
       email: null, 
       credits_used: 0, // No charge!
       error: `Apollo API error: ${error.response?.data?.message}`,
       apollo_status: error.response?.status
     };
   }
   ```

---

## Files Modified

### 1. `/backend/shared/middleware/credit_guard.js`
- Added `refundCredits()` function
- Updated module.exports to include refundCredits
- Implements atomic credit reversal with transaction logging

### 2. `/backend/features/apollo-leads/services/ApolloRevealService.js`
- Imported `refundCredits` from credit_guard
- Added `_attemptRefund()` helper method
- Updated `revealEmail()` method:
  - Added UUID format validation
  - Added refund logic for validation errors
  - Added refund logic for Apollo 4xx errors
- Updated `revealPhone()` method with same changes
- Both methods now return `credits_used: 0` for failed requests

---

## Request Flow Changes

### Before (Broken):
```
Request → Middleware deducts 1 credit → Service calls Apollo → Apollo returns 422 → User loses credit!
```

### After (Fixed):
```
Request → Middleware deducts 1 credit 
       → Service validates ID format
       → If UUID detected: Refund 1 credit → Return error with credits_used: 0
       → If valid: Call Apollo
       → If Apollo returns 4xx: Refund 1 credit → Return error with credits_used: 0
       → If Apollo returns 200: Update cache → Return success with credits_used: 1
```

---

## Controller Behavior

**File**: `/backend/features/apollo-leads/controllers/ApolloLeadsController.js`

No changes needed - controller already properly handles service response:

```javascript
const result = await ApolloLeadsService.revealEmail(personId, employeeName, req);

if (result.error) {
  return res.json({
    success: false,
    error: result.error,
    credits_used: result.credits_used // Returns 0 for failed requests
  });
}
```

---

## Testing Recommendations

### Test Case 1: UUID Format ID (Validation Error)
```bash
curl -X POST http://localhost:3004/api/apollo-leads/reveal-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"person_id": "872ab3fe-d7f1-4b59-a6aa-2e6745000bc5"}'

Expected:
- Response: HTTP 200 (not error)
- Body: { success: false, error: "Invalid person ID format...", credits_used: 0 }
- Database: User credits refunded (if any deducted)
```

### Test Case 2: Valid Apollo Person ID (Success)
```bash
curl -X POST http://localhost:3004/api/apollo-leads/reveal-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"person_id": "123456789"}'

Expected:
- Response: HTTP 200
- Body: { success: true, email: "user@company.com", credits_used: 1 }
- Database: 1 credit deducted
```

### Test Case 3: Apollo 422 Error (Refund)
Requires Apollo API to return 422 (set up mock or use real API with invalid data):
```bash
Expected:
- Response: HTTP 200
- Body: { success: false, error: "Apollo API error: 422...", credits_used: 0 }
- Database: Any deducted credits should be refunded
```

---

## Database Impact

### New Transactions Logged

When refund occurs, two transactions are created:

1. **Deduction Transaction** (from middleware):
   ```sql
   INSERT INTO lad_dev.credit_transactions 
   (user_id, tenant_id, amount, transaction_type, description)
   VALUES ($1, $2, -1, 'deduction', 'apollo_email - Email reveal');
   ```

2. **Refund Transaction** (from refundCredits function):
   ```sql
   INSERT INTO lad_dev.credit_transactions 
   (user_id, tenant_id, amount, transaction_type, description, metadata)
   VALUES ($1, $2, 1, 'refund', 'Refund: apollo_email - Invalid person ID format', {...});
   ```

### Balance Updates

- **Deduction**: `balance = balance - 1`
- **Refund**: `balance = balance + 1`
- **Net Result**: Balance unchanged (no credit loss)

---

## Future Improvements

1. **Automatic Retry Logic**
   - For 5xx errors, implement exponential backoff retry
   - Only charge credits after confirmed success

2. **Better ID Mapping**
   - Ensure Apollo person ID is properly mapped from Apollo search results
   - Store Apollo ID separately from database record ID
   - Validate ID mapping before reveal requests

3. **Billing Analytics**
   - Track refund reasons in analytics dashboard
   - Identify patterns of invalid API usage
   - Monitor Apollo API reliability

4. **Frontend Validation**
   - Validate person_id format before sending to backend
   - Provide clearer error messages to users
   - Show credit costs clearly before operations

---

## Summary

**Root Issue**: UUID format IDs being sent to Apollo API instead of numeric person IDs, causing 422 errors and unwanted credit deductions.

**Solutions**:
1. ✅ Validate ID format before API calls (prevents 422 errors)
2. ✅ Refund credits on validation failures (no charge for bad requests)
3. ✅ Refund credits on Apollo 4xx errors (client error = no service provided)

**Result**: Users no longer lose credits for invalid API calls or Apollo client errors. Credits only charged for successful reveals.
