# Unipile Endpoints Issues - Quick Reference

## 3 Critical Issues Found

### 1️⃣ Connection Requests Return 403/422 Errors

**Root Cause:** Wrong API endpoint and payload structure

**Current (BROKEN):**
```javascript
POST /users/invite
{ provider_id: "urn:li:member:..." }
```

**Fix:**
```javascript
POST /api/v1/chats
{ attendees_ids: ["urn:li:member:..."] }
```

**File:** `UnipileConnectionService.js` Line ~180  
**Impact:** All connection requests fail  
**Severity:** 🔴 CRITICAL

---

### 2️⃣ Account Expiry Not Caught Until API Fails

**Root Cause:** No pre-campaign health check; expiry only detected on error

**Issue:** 
- Account credentials expire
- `verifyAccountHealth()` function exists but is NEVER CALLED
- Campaign runs and fails after multiple API calls
- User has no warning

**Fix:** Call `verifyAccountReadyForCampaign()` before campaign starts

**File:** `LinkedInAccountHelper.js`  
**Impact:** Wastes API quota, poor user experience  
**Severity:** 🔴 CRITICAL

---

### 3️⃣ Contact Info Not Retrieved from Profiles

**Root Cause:** Multiple issues:
1. Account expiry blocks all profile fetches
2. Contact parsing too fragile (unknown field names)
3. Returns success even when no contact found

**File:** `UnipileProfileService.js` Lines 150-200  
**Impact:** Cannot get email/phone from profiles  
**Severity:** 🔴 CRITICAL

---

## Quick Fix Checklist

- [ ] **Fix #1:** Change `/users/invite` → `/api/v1/chats` endpoint
- [ ] **Fix #2:** Change `provider_id` → `attendees_ids` (as array)
- [ ] **Fix #3:** Add health check before campaign execution
- [ ] **Fix #4:** Sync account expiry across all database schemas
- [ ] **Fix #5:** Improve contact field parsing with logging
- [ ] **Fix #6:** Add rate limit detection and retry guidance

---

## Files to Modify

```
backend/features/campaigns/services/
├── UnipileConnectionService.js      (3 fixes)
├── UnipileProfileService.js         (3 fixes)
├── LinkedInAccountHelper.js         (2 fixes)
└── UnipileBaseService.js            (1 fix - optional)
```

---

## Detailed Documents

1. **UNIPILE_ENDPOINTS_ISSUES_REVIEW.md** - Full analysis of all issues
2. **UNIPILE_FIXES_IMPLEMENTATION.md** - Complete code fixes with examples

---

## Testing Quick Commands

```bash
# Test the correct endpoint
curl -X POST "https://api8.unipile.com:13811/api/v1/chats" \
  -H "Authorization: Bearer $UNIPILE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "LINKEDIN",
    "account_id": "D96MaOAdRFmYnbKGStxCqg",
    "attendees_ids": ["urn:li:member:123456789"],
    "message": "Let'\''s connect!"
  }'
```

Expected: 200-201 response (not 403/422)

---

## Impact Summary

| Component | Current Status | After Fixes |
|-----------|---|---|
| Connection Requests | ❌ All fail (403/422) | ✅ Should work |
| Account Expiry | ⚠️ Only caught on error | ✅ Caught upfront |
| Contact Info | ❌ Unreliable | ✅ Robust |
| Rate Limiting | ⚠️ Basic | ✅ Intelligent |
| Error Messages | ⚠️ Inconsistent | ✅ Clear |

---

## Estimated Fix Time

- **Reading & Understanding:** 30 mins
- **Implementing Fixes:** 1-2 hours
- **Testing:** 1-2 hours
- **Total:** 2.5-4.5 hours

---

**Last Updated:** January 18, 2026  
**Review Status:** Complete  
**Priority:** CRITICAL - Implement ASAP
