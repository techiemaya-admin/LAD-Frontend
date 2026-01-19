# Campaign Steps Testing - Setup Complete ✅

You now have a complete testing suite for validating all LinkedIn campaign steps. Here's what's available:

## 📦 Testing Scripts Created

### 1. **run-campaign-tests.js** (Interactive Menu) 🎯 START HERE
```bash
node run-campaign-tests.js
```
- Interactive menu for selecting tests
- Backend health check
- Menu-driven workflow
- Easy to run different test scenarios

**Features:**
- ✅ Check if backend is running
- ✅ Select test to run from menu
- ✅ Run tests individually or all at once
- ✅ View documentation from menu

---

### 2. **test-campaign-steps-detailed.js** (Recommended for Detailed Testing)
```bash
node test-campaign-steps-detailed.js
```
Provides the most comprehensive analysis with:
- Campaign discovery and setup verification
- Lead inventory check
- LinkedIn account status analysis
- Sequential testing of each step type:
  - linkedin_connect (connection request)
  - linkedin_visit (profile visit)
  - linkedin_follow (follow)
  - linkedin_message (direct message)
- Error analysis with root cause detection
- Troubleshooting recommendations

**Output Highlights:**
```
📋 Test: Send Connection Request
   Type: linkedin_connect
   Status: Testing...
   ✅ SUCCESS (1245ms)
   
Root Cause Analysis:
- No active LinkedIn account: Resolved ✅
- LinkedIn URL missing: Not applicable ✅
- Rate limit hit: No ✅
```

---

### 3. **test-all-campaign-steps.js** (Full Campaign Analysis)
```bash
node test-all-campaign-steps.js
```
Colorized output with:
- Campaign status and configuration
- Campaign steps review
- Campaign leads summary
- LinkedIn account health (active/expired/checkpoint)
- Activity log analysis
- Step execution tests
- Campaign statistics

**Output Highlights:**
```
Step 2: Reviewing Campaign Steps
✅ Found 3 steps
  1. linkedin_connect
     Title: Initial Connection
     Message: "Hi, would love to connect!"
```

---

### 4. **test-campaign-api.js** (Quick API Check)
```bash
node test-campaign-api.js
```
Fast validation of:
- Campaign CRUD endpoints
- Leads retrieval
- Activity logging
- Step execution
- Campaign statistics

---

## 📋 Testing Flow

### Option A: Interactive (Easiest)
```bash
# Start the menu-driven test runner
node run-campaign-tests.js

# Then select options from the menu:
# 1. Detailed Sequential Test
# 2. Full Campaign Analysis  
# 3. Quick API Check
# 4. View Documentation
# 5. Run All Tests
# 6. Exit
```

### Option B: Direct (Fastest)
```bash
# Run detailed test directly (most comprehensive)
node test-campaign-steps-detailed.js

# Or run full analysis
node test-all-campaign-steps.js

# Or quick check
node test-campaign-api.js
```

---

## 🎯 Campaign Steps Being Tested

### 1. **linkedin_connect**
Sends a LinkedIn connection request (optional with message)
```javascript
{
  step_type: 'linkedin_connect',
  config: { message: 'Hi! Would love to connect.' }
}
```
- Requires: Active LinkedIn account, target LinkedIn URL
- Optional: Message (limited monthly quota)
- Success: Status = "delivered" or "sent"

### 2. **linkedin_visit**
Visits someone's LinkedIn profile (shows in their visitors)
```javascript
{
  step_type: 'linkedin_visit',
  config: {}
}
```
- Requires: Active LinkedIn account, target LinkedIn URL
- No prior connection needed
- Success: Status = "delivered"

### 3. **linkedin_follow**
Follows someone on LinkedIn
```javascript
{
  step_type: 'linkedin_follow',
  config: {}
}
```
- Requires: Active LinkedIn account, target LinkedIn URL
- No prior connection needed
- Success: Status = "delivered"

### 4. **linkedin_message**
Sends a direct message on LinkedIn
```javascript
{
  step_type: 'linkedin_message',
  config: { message: 'Hi! Great to connect.' }
}
```
- Requires: Active LinkedIn account, target LinkedIn URL
- Usually requires prior connection
- Success: Status = "delivered"

---

## ✅ What Gets Tested

Each test script validates:

1. **Campaign Existence**
   - Can find running campaigns
   - Campaign has valid configuration
   - Campaign has steps configured

2. **Lead Availability**
   - Campaign has leads
   - Leads have required data (LinkedIn URLs)
   - Leads are in correct status

3. **LinkedIn Account Health**
   - At least 1 account should be active
   - Check for expired accounts
   - Check for accounts needing validation (checkpoint)

4. **Step Execution**
   - Each step type can be called
   - Responses are properly formatted
   - Errors are descriptive and actionable

5. **Activity Logging**
   - Actions are logged to campaign_lead_activities
   - Status values are correct
   - Error messages are recorded

6. **Campaign Statistics**
   - Lead counts are accurate
   - Success/failure rates calculated
   - Progress tracking works

---

## 🚀 Before Running Tests

### Checklist
- [ ] Backend server running on http://localhost:3001
- [ ] PostgreSQL database accessible
- [ ] At least 1 campaign created
- [ ] Campaign has leads added
- [ ] (Optional but recommended) LinkedIn account connected

### Quick Setup
```bash
# Terminal 1: Start backend
cd /Users/naveenreddy/Desktop/AI-Maya/LAD/backend
npm start

# Terminal 2: Run tests
cd /Users/naveenreddy/Desktop/AI-Maya/LAD
node run-campaign-tests.js
```

---

## 📊 Understanding Results

### Success Scenario
```
✅ Test: Send Connection Request
   Duration: 1245ms
   Status: SUCCESS
   
Campaign has:
  ✅ 1 active LinkedIn account
  ✅ 5 campaign leads
  ✅ No previous errors
  
Result: Connection request will be sent
```

### Failure Scenario with Analysis
```
❌ Test: Send Connection Request
   Duration: 892ms
   Status: FAILED
   Error: "No active LinkedIn account connected with Unipile"
   
Root Cause: No active LinkedIn accounts
   - 0 accounts active
   - 3 accounts expired
   - 1 account checkpoint
   
Recommendation:
  1. Connect a LinkedIn account in Settings
  2. Verify account status shows "active"
  3. Retry test
```

---

## 🔍 Troubleshooting Quick Links

### "No active LinkedIn account"
→ See [LinkedIn Setup Guide](LINKEDIN_FIX_USER_GUIDE.md)

### "LinkedIn URL not found"
→ Check lead data import

### "Rate limit exceeded"  
→ Wait for limit window to reset

### "Checkpoint/needs validation"
→ Verify account in Unipile, complete OTP

### "Backend not responding"
→ Make sure `npm start` is running in backend folder

---

## 📚 Documentation Files

Created alongside tests:

1. **[CAMPAIGN_TESTING_GUIDE.md](CAMPAIGN_TESTING_GUIDE.md)** - Comprehensive testing guide
2. **[LINKEDIN_ERROR_HANDLING_FIX.md](LINKEDIN_ERROR_HANDLING_FIX.md)** - Error handling improvements
3. **[LINKEDIN_FIX_USER_GUIDE.md](LINKEDIN_FIX_USER_GUIDE.md)** - User-facing LinkedIn guide

---

## 🎬 Quick Start Steps

1. **Open two terminals:**
   ```bash
   # Terminal 1
   cd /Users/naveenreddy/Desktop/AI-Maya/LAD/backend
   npm start
   
   # Terminal 2
   cd /Users/naveenreddy/Desktop/AI-Maya/LAD
   ```

2. **Run the test menu:**
   ```bash
   node run-campaign-tests.js
   ```

3. **Select test option:**
   ```
   1. Detailed Sequential Test (Recommended)
   2. Full Campaign Analysis
   3. Quick API Check
   4. View Documentation
   5. Run All Tests
   6. Exit
   ```

4. **Review results** and follow recommendations

---

## ✨ Next Steps After Testing

1. **Fix Any Failures**
   - Use troubleshooting section for each error type
   - Address missing data or configuration

2. **Retest to Verify**
   - Run tests again after fixes
   - Ensure all steps passing

3. **Monitor Production**
   - Check campaign_lead_activities table
   - Monitor success rates
   - Watch for rate limit issues

4. **Scale Campaign**
   - Increase lead volume
   - Add more campaign steps
   - Monitor system performance

---

## 💡 Pro Tips

1. **Save test output for review:**
   ```bash
   node test-campaign-steps-detailed.js > test-results.txt 2>&1
   ```

2. **Monitor activity in real-time:**
   ```bash
   # In PostgreSQL
   SELECT * FROM campaign_lead_activities 
   WHERE campaign_id = '<id>'
   ORDER BY created_at DESC
   LIMIT 20;
   ```

3. **Check multiple campaigns:**
   - Tests use first available campaign
   - Manually test different campaigns
   - Verify consistency across campaigns

4. **Test different lead types:**
   - Test with various lead sources
   - Verify each lead type works
   - Check data completeness

---

## 📞 Support

If tests fail:
1. Review error message
2. Check [CAMPAIGN_TESTING_GUIDE.md](CAMPAIGN_TESTING_GUIDE.md) troubleshooting section
3. Check backend logs
4. Verify configuration matches guide

---

**Status:** ✅ Campaign testing suite ready for use
**Created:** Jan 19, 2026
**Last Updated:** Jan 19, 2026
