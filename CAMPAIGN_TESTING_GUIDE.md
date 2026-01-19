# Campaign Steps Testing Guide

This guide explains how to test the LinkedIn campaign steps using the provided test scripts.

## 📋 Overview

After fixing the LinkedIn error handling, we now have several test scripts to comprehensively verify that all campaign steps work correctly:

1. **test-campaign-steps-detailed.js** - Recommended for comprehensive testing
2. **test-all-campaign-steps.js** - Full campaign analysis with colorized output
3. **test-campaign-api.js** - API endpoint testing

## 🚀 Getting Started

### Prerequisites

1. **Backend Server Running**
   ```bash
   cd backend
   npm start
   # Server should be running on http://localhost:3001
   ```

2. **Campaign Setup**
   - At least one campaign created
   - Campaign should have leads added
   - (Recommended) LinkedIn account connected

### Running Tests

#### Option 1: Detailed Sequential Testing (Recommended)

```bash
cd /Users/naveenreddy/Desktop/AI-Maya/LAD
node test-campaign-steps-detailed.js
```

This script will:
- ✅ Find an existing campaign
- ✅ Get campaign leads
- ✅ Check LinkedIn account status
- ✅ Test each step type individually:
  - linkedin_connect
  - linkedin_visit
  - linkedin_follow
  - linkedin_message
- ✅ Analyze failures with root cause
- ✅ Provide troubleshooting recommendations

**Output Example:**
```
╔════════════════════════════════════════════════════════╗
║  Campaign Steps - Sequential Testing with Analytics    ║
╚════════════════════════════════════════════════════════╝

🔍 Finding existing campaign...
✅ Found campaign: LinkedIn Outreach (uuid-here)
   Status: running
   Steps: 3

📋 Test: Send Connection Request
   Type: linkedin_connect
   Status: Testing...
   ✅ SUCCESS (1245ms)

[... more tests ...]
```

#### Option 2: Full Campaign Analysis

```bash
node test-all-campaign-steps.js
```

Provides:
- Campaign status and configuration
- Lead inventory and status
- LinkedIn account health check
- Recent activity analysis
- Step execution testing
- Campaign statistics

#### Option 3: Simple API Testing

```bash
node test-campaign-api.js
```

Tests:
- Campaign CRUD operations
- Lead management
- Activity logging
- Basic step execution

## 📊 Understanding Test Results

### Success Indicators

```
✅ SUCCESS (1234ms)
```
- Step executed without errors
- Action was sent to LinkedIn/Unipile
- Activity was logged

### Common Failures and Solutions

#### 1. "No active LinkedIn account"
**Cause:** No LinkedIn accounts connected or all are expired
**Solution:**
1. Go to Settings → LinkedIn Integration
2. Connect a LinkedIn account
3. Verify account status shows "active"
4. Retry test

#### 2. "LinkedIn URL not found"
**Cause:** Lead missing LinkedIn profile URL
**Solution:**
1. Ensure leads have valid LinkedIn URLs
2. Check lead data import source
3. Add leads with LinkedIn profiles

#### 3. "Rate limit exceeded"
**Cause:** LinkedIn's daily/weekly limits reached
**Solution:**
1. Wait for limit window to reset
2. Use different LinkedIn account
3. Continue with other campaigns

#### 4. "Account needs checkpoint"
**Cause:** LinkedIn account requires OTP/verification
**Solution:**
1. Verify the account in Unipile dashboard
2. Complete OTP challenge
3. Account status will change to "active"

#### 5. "Account credentials expired"
**Cause:** LinkedIn token or credentials no longer valid
**Solution:**
1. Reconnect the LinkedIn account
2. Re-authenticate with fresh credentials
3. Account status will update to "active"

## 🎯 Campaign Step Types

### 1. linkedin_connect
**Purpose:** Send a LinkedIn connection request

**Configuration:**
```javascript
{
  step_type: 'linkedin_connect',
  config: {
    message: 'Hi! Would love to connect.' // Optional
  }
}
```

**Requirements:**
- Active LinkedIn account in Unipile
- Target has valid LinkedIn URL
- May have monthly message limit

**Success Response:**
- Connection request sent
- Status: "delivered" or "sent"

---

### 2. linkedin_visit
**Purpose:** Visit someone's LinkedIn profile

**Configuration:**
```javascript
{
  step_type: 'linkedin_visit',
  config: {}
}
```

**Requirements:**
- Active LinkedIn account in Unipile
- Target has valid LinkedIn URL
- No prior connection needed

**Success Response:**
- Profile visited (shows in target's visitors)
- Status: "delivered"

---

### 3. linkedin_follow
**Purpose:** Follow someone on LinkedIn

**Configuration:**
```javascript
{
  step_type: 'linkedin_follow',
  config: {}
}
```

**Requirements:**
- Active LinkedIn account in Unipile
- Target has valid LinkedIn URL
- No prior connection needed

**Success Response:**
- Profile followed
- Status: "delivered"

---

### 4. linkedin_message
**Purpose:** Send a direct message on LinkedIn

**Configuration:**
```javascript
{
  step_type: 'linkedin_message',
  config: {
    message: 'Your message here'
  }
}
```

**Requirements:**
- Active LinkedIn account in Unipile
- Target has valid LinkedIn URL
- Usually requires prior connection
- LinkedIn may restrict messages from non-connections

**Success Response:**
- Message sent
- Status: "delivered"

---

## 📈 Campaign Activity Log

View campaign activities:

```sql
SELECT 
  action_type,
  status,
  error_message,
  created_at
FROM campaign_lead_activities
WHERE campaign_id = '<your-campaign-id>'
ORDER BY created_at DESC
LIMIT 20;
```

**Activity Status Values:**
- `pending` - Waiting to be executed
- `sent` - Sent to LinkedIn
- `delivered` - Successfully executed
- `failed` - Failed (check error_message)

---

## 🔄 Testing Workflow

### Complete Test Sequence

1. **Setup**
   ```bash
   # Terminal 1: Start backend
   cd backend && npm start
   ```

2. **Run Tests**
   ```bash
   # Terminal 2: Run test script
   cd /Users/naveenreddy/Desktop/AI-Maya/LAD
   node test-campaign-steps-detailed.js
   ```

3. **Review Results**
   - Check success/failure counts
   - Note any error patterns
   - Review recommendations

4. **Fix Issues**
   - Address failed tests as recommended
   - Reconnect accounts if needed
   - Add leads if missing

5. **Retest**
   - Run test script again
   - Verify fixes worked
   - Document results

---

## 💡 Tips for Testing

1. **Test with Different Leads**
   - Tests use first lead by default
   - Manually test with different leads to verify consistency

2. **Check Activity Log Real-time**
   ```sql
   -- Run in separate terminal to monitor
   SELECT * FROM campaign_lead_activities 
   WHERE campaign_id = '<id>'
   ORDER BY created_at DESC;
   ```

3. **Monitor LinkedIn Account Status**
   ```sql
   SELECT id, status, account_name, created_at 
   FROM social_linkedin_accounts 
   WHERE status != 'active'
   ORDER BY created_at DESC;
   ```

4. **Test Different Step Combinations**
   - Test each step independently first
   - Then test in campaign workflow order
   - Verify multi-step campaigns work

5. **Rate Limit Testing**
   - Track daily action counts per account
   - Note any throttling or 429 errors
   - Adjust batch sizes if needed

---

## 🚨 Troubleshooting

### No Response from Backend
```bash
# Check if backend is running
curl http://localhost:3001/health
# Should return 200 OK
```

### Database Connection Issues
```bash
# Verify database is accessible
psql -U postgres -d lad_dev -c "SELECT COUNT(*) FROM campaigns;"
```

### Campaign Not Found
```bash
# Check if campaign exists
SELECT id, name, status FROM campaigns LIMIT 1;
```

### Leads Not Loading
```bash
# Verify leads are attached to campaign
SELECT COUNT(*) FROM campaign_leads 
WHERE campaign_id = '<campaign-id>';
```

---

## 📚 Additional Resources

- [LinkedIn Error Handling Fix](LINKEDIN_ERROR_HANDLING_FIX.md)
- [Campaign Architecture](backend/features/campaigns/README.md)
- [LinkedIn Integration Guide](LINKEDIN_API_TESTING_GUIDE.md)

---

## ✅ Success Criteria

A successful test run should show:
- ✅ Campaign found and loaded
- ✅ Leads retrieved successfully
- ✅ LinkedIn account status verified
- ✅ At least 1 account active or checkpoint
- ✅ Most step types executing without errors
- ✅ Activity logged in campaign_lead_activities

If you're not seeing these, review the troubleshooting section or check the error messages in the test output.
