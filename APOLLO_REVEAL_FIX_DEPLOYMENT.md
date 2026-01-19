# Apollo Reveal Fix - Implementation Checklist & Next Steps

## ✅ Completed Fixes

### 1. ID Format Validation
- [x] Added UUID format detection in ApolloRevealService
- [x] Prevents calling Apollo API with invalid IDs
- [x] Returns validation error without charging credits
- [x] Applied to both `revealEmail()` and `revealPhone()` methods

### 2. Credit Refund System
- [x] Implemented `refundCredits()` function in credit_guard middleware
- [x] Handles atomic database transactions with rollback
- [x] Logs refund transactions with detailed metadata
- [x] Exported function for use in services

### 3. Service-Level Error Handling
- [x] Added `_attemptRefund()` helper method to ApolloRevealService
- [x] Refunds on UUID format detection (validation error)
- [x] Refunds on Apollo 4xx errors (client errors)
- [x] Does NOT refund on 5xx errors (server errors, retry eligible)

---

## 🔄 Next Steps to Verify & Deploy

### Phase 1: Testing (Before Deployment)
- [ ] **Unit Tests**: Test validation logic in isolation
  ```bash
  npm test -- src/features/apollo-leads/services/ApolloRevealService.test.js
  ```
  
- [ ] **Integration Tests**: Test with mock Apollo API
  - Verify UUID format ID → rejected without charge
  - Verify valid numeric ID → calls Apollo API
  - Verify Apollo 422 error → refunds credits

- [ ] **Database Tests**: Verify transaction logging
  - Confirm deduction transaction created
  - Confirm refund transaction created
  - Verify balance consistency

### Phase 2: Staging Deployment
- [ ] Deploy to staging environment
- [ ] Test with real Apollo API credentials
- [ ] Monitor for any unforeseen 4xx error patterns
- [ ] Verify refund transactions appear in billing reports

### Phase 3: Production Deployment
- [ ] Create database backup before deploying
- [ ] Deploy changes (credit_guard.js, ApolloRevealService.js)
- [ ] Monitor error logs for any issues
- [ ] Verify Apollo API integration works
- [ ] Check billing/transaction logs for correct refund entries

---

## 🐛 How to Identify the Original Problem

To understand what UUID ID was being sent, check backend logs:

```bash
# Look for Apollo Reveal logs
grep -i "person ID has UUID format" /var/log/app.log

# Check credit transaction logs
SELECT * FROM user_credits WHERE balance changes unexpectedly;
SELECT * FROM credit_transactions WHERE transaction_type = 'deduction' 
  AND description LIKE '%apollo%' 
  ORDER BY created_at DESC LIMIT 20;
```

---

## 📋 Data to Investigate (If Needed)

### Check Campaign Leads Data
```sql
-- See what apollo_person_id values are stored in campaign_leads
SELECT 
  cl.id,
  cl.lead_data->>'apollo_person_id' as stored_apollo_person_id,
  cl.lead_data->>'name' as lead_name,
  cl.created_at
FROM lad_dev.campaign_leads cl
WHERE cl.lead_data->>'apollo_person_id' IS NOT NULL
LIMIT 10;

-- Check if they're UUID format (should be numeric)
SELECT COUNT(*) FROM lad_dev.campaign_leads cl
WHERE cl.lead_data->>'apollo_person_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
```

### Check Credit Transactions
```sql
-- Find all refund transactions
SELECT * FROM lad_dev.credit_transactions 
WHERE transaction_type = 'refund'
ORDER BY created_at DESC LIMIT 20;

-- Calculate total refunded credits
SELECT 
  SUM(amount) as total_refunded,
  COUNT(*) as refund_count,
  MIN(created_at) as first_refund,
  MAX(created_at) as last_refund
FROM lad_dev.credit_transactions 
WHERE transaction_type = 'refund' AND description LIKE '%apollo%';
```

---

## 🔍 Debugging Guide

### If UUID IDs are Still Being Sent

**Location**: Campaign Lead Display or Edit
- Check where `apollo_person_id` is being set when displaying campaign leads
- Verify it comes from `employees_cache.apollo_person_id` (correct source)
- NOT from campaign lead's database ID

**Fix Required**: Update code that populates `apollo_person_id` field
```javascript
// WRONG - using database ID
const apolloPersonId = campaignLead.id; // This is UUID!

// CORRECT - using Apollo's person ID
const apolloPersonId = campaignLead.lead_data.apollo_person_id; // Should be numeric
```

### If Refunds Aren't Working

**Check**:
1. Is `refundCredits` function exported from credit_guard.js?
2. Is it imported in ApolloRevealService.js?
3. Does the request have valid `req` object?
4. Does the user have active record in `user_credits` table?

**Debug**:
```javascript
// Add logging in _attemptRefund method
console.log('[DEBUG] Refund attempt:', { tenantId, credits, hasReq: !!req });
```

---

## 📊 Metrics to Monitor Post-Deployment

### Key Metrics
1. **Apollo Reveal Success Rate**
   - Track: successful vs. failed reveals
   - Target: >95% success rate

2. **Invalid ID Rejection Rate**
   - Track: UUID format detections
   - Target: Should go to 0 after fix deployed

3. **Refund Frequency**
   - Track: refunds per day
   - Expect: Initially high (catching backlog), then dropping to near zero

4. **User Credit Balance**
   - Track: total refunded credits per user
   - Expected: Users regain lost credits from previous 422 errors

### Dashboard Queries
```sql
-- Daily refund activity
SELECT 
  DATE(created_at) as date,
  COUNT(*) as refund_count,
  SUM(amount) as total_credits_refunded
FROM lad_dev.credit_transactions 
WHERE transaction_type = 'refund'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Refund reasons breakdown
SELECT 
  (metadata->>'reason') as reason,
  COUNT(*) as count,
  SUM(amount) as total_credits
FROM lad_dev.credit_transactions 
WHERE transaction_type = 'refund'
GROUP BY (metadata->>'reason')
ORDER BY count DESC;
```

---

## 🚨 Rollback Plan (If Issues Arise)

### Quick Rollback Steps
1. Revert ApolloRevealService.js to previous version
2. Revert credit_guard.js to previous version
3. Monitor for any further issues

### Manual Credit Correction (If Needed)
```sql
-- Find all users who were incorrectly charged
SELECT 
  ct1.tenant_id,
  COUNT(*) as deduction_count,
  SUM(ct1.amount) as total_deducted
FROM lad_dev.credit_transactions ct1
WHERE ct1.transaction_type = 'deduction' 
  AND ct1.description LIKE '%apollo_email%'
  AND NOT EXISTS (
    SELECT 1 FROM lad_dev.credit_transactions ct2
    WHERE ct2.tenant_id = ct1.tenant_id
      AND ct2.transaction_type = 'refund'
      AND ct2.created_at > ct1.created_at
  )
GROUP BY ct1.tenant_id;

-- Manually refund specific user (if needed)
UPDATE lad_dev.user_credits 
SET balance = balance + 9 -- Refund 8 (phone) + 1 (email)
WHERE tenant_id = 'TENANT_ID_HERE';
```

---

## 📝 Communication Template

### For Users Affected by 422 Errors

**Subject**: Credit Adjustment for Apollo Reveal Service Issues

**Message**:
> We identified an issue with the Apollo Reveal service that was causing credits to be deducted even when the API call failed (HTTP 422 errors). 
>
> **What happened**: Invalid person ID formats were being sent to Apollo, which rejected the request but we had already deducted your credits.
>
> **What we fixed**: 
> - Added validation to reject invalid IDs before calling Apollo (no charge)
> - Implemented automatic credit refunds when Apollo returns errors (client gets refund)
>
> **Your account**: Any credits lost due to this issue have been refunded to your account. Check your billing history for "Refund" transactions.
>
> **Going forward**: Credits will only be charged for successful reveals. Failed requests will refund immediately.

---

## 🎯 Success Criteria

### Deployment is Successful When:
- [ ] No 422 errors appearing in logs for reveal endpoints
- [ ] Refund transactions logged in credit_transactions table
- [ ] User credit balances remain stable (no unexpected changes)
- [ ] Apollo API calls succeed with valid IDs
- [ ] All test cases pass (UUID rejection, valid ID success, 4xx refund)

### Deployment is Problematic If:
- ❌ 422 errors still appearing (ID format not fixed)
- ❌ Refunds not being created (refund function broken)
- ❌ Credits being deducted for refunded operations (logic error)
- ❌ Valid Apollo calls now failing (breaking change)

---

## 📞 Escalation Path

### If Issues Found Post-Deployment:
1. **Immediate**: Disable reveal endpoints temporarily
2. **Investigation**: Check logs for exact error
3. **Fix**: Apply hot patch or rollback
4. **Verification**: Re-test before re-enabling

### Contact Points:
- Backend Team: Review ApolloRevealService changes
- Database Team: Verify transaction logging
- DevOps: Monitor production logs and metrics

---

## 📚 Related Documentation

- See [APOLLO_REVEAL_FIX_SUMMARY.md](APOLLO_REVEAL_FIX_SUMMARY.md) for detailed fix explanation
- See [ApolloRevealService.js](backend/features/apollo-leads/services/ApolloRevealService.js) for implementation
- See [credit_guard.js](backend/shared/middleware/credit_guard.js) for refund mechanism

