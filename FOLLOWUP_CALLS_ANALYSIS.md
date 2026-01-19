# Follow-up Calls Functionality Analysis

## Question
Does the followup calls system use the lead's associated agent ID and voice number?

---

## Current Implementation Analysis

### 1. **Follow-up Call Flow**

```
Lead is assigned an agent_id and voice_number
           ↓
Booking is created for the lead
           ↓
FollowUpSchedulerService.scheduleFollowUpCall() - Creates Cloud Task
           ↓
Cloud Task triggers at scheduled time
           ↓
BookingsController.executeFollowUpCall() - Receives Cloud Task request
           ↓
FollowUpExecutionService.executeFollowUpCall() - Executes the call
           ↓
prepareCallParameters() - Gets lead and agent info
           ↓
voiceAgentClient.startCall() - Initiates the voice call
```

### 2. **Current Agent ID Assignment** ❌ ISSUE FOUND

**File**: `/backend/features/deals-pipeline/services/followUpExecutionService.js` (Lines 288-291)

```javascript
// Get default agent ID (could be from booking metadata or tenant settings)
// For now, use a configurable default or fetch from tenant settings
const agentId = process.env.DEFAULT_FOLLOW_UP_AGENT_ID || '24'; // VAPI agent

// Get phone number from lead
const phoneNumber = lead.phone;
```

### **PROBLEM #1: Agent ID is NOT Using Lead's Associated Agent**
- ❌ Currently: Uses hardcoded `DEFAULT_FOLLOW_UP_AGENT_ID` (env variable)
- ❌ Fallback: Uses hardcoded `'24'` (VAPI agent)
- ❌ Missing: NOT fetching the agent_id from the lead record

### 3. **Lead Data Being Fetched**

**File**: `/backend/features/deals-pipeline/services/followUpExecutionService.js` (Lines 256-264)

```javascript
const leadQuery = `
  SELECT 
    id,
    first_name,
    last_name,
    phone,
    email
  FROM ${schema}.leads
  WHERE id = $1 AND tenant_id = $2
  LIMIT 1
`;
```

### **PROBLEM #2: Lead Query Missing Agent ID**
- ❌ Currently: Fetches only `id, first_name, last_name, phone, email`
- ✅ Already fetching: `phone` (voice number) ✓
- ❌ Missing: `agent_id` from the leads table
- ❌ Missing: `voice_number` or `from_number` from the leads table

### 4. **Voice Number Assignment** ✅ PARTIAL

**Current Status**:
- ✅ Lead phone number IS being fetched: `lead.phone`
- ✅ Phone number IS being used for the call: `phoneNumber: callParams.phoneNumber`
- ⚠️ But: Using lead's phone as the CALLED number, not the FROM number

**Expected for FROM number**:
```javascript
fromNumberId: callParams.fromNumberId  // Currently always null!
```

---

## What Needs to be Fixed

### Fix #1: Fetch Agent ID from Lead Record
**Current Code** (Line 288):
```javascript
const agentId = process.env.DEFAULT_FOLLOW_UP_AGENT_ID || '24'; // ❌ WRONG
```

**Should Be**:
```javascript
// Fetch agent_id from the lead record
const agentId = lead.agent_id;
if (!agentId) {
  throw new Error('Lead has no assigned agent');
}
```

### Fix #2: Expand Lead Query to Include Agent ID

**Current Query**:
```javascript
const leadQuery = `
  SELECT 
    id,
    first_name,
    last_name,
    phone,
    email
  FROM ${schema}.leads
  WHERE id = $1 AND tenant_id = $2
  LIMIT 1
`;
```

**Should Be**:
```javascript
const leadQuery = `
  SELECT 
    id,
    first_name,
    last_name,
    phone,
    email,
    agent_id,
    voice_number  -- or from_number field if it exists
  FROM ${schema}.leads
  WHERE id = $1 AND tenant_id = $2
  LIMIT 1
`;
```

### Fix #3: Use Lead's Voice Number as FROM Number

**Current**:
```javascript
fromNumberId: null, // ❌ Always null
```

**Should Be**:
```javascript
fromNumberId: lead.voice_number || lead.from_number,  // Use lead's voice number
```

---

## Implementation Plan

### Step 1: Add Missing Columns to Leads Table

**CURRENT SCHEMA**: The `leads` table does NOT have:
- ❌ `agent_id` column
- ❌ `voice_number` column

**Only has**: `assigned_user_id` (references users, not voice agents)

**ACTION NEEDED**: Add columns to leads table:
```sql
ALTER TABLE leads ADD COLUMN agent_id BIGINT;
ALTER TABLE leads ADD COLUMN voice_number VARCHAR(50);
```

### Step 2: Update Lead Query in followUpExecutionService.js

**Location**: `/backend/features/deals-pipeline/services/followUpExecutionService.js` (Lines 256-264)

Add the new columns to SELECT:
```javascript
const leadQuery = `
  SELECT 
    id,
    first_name,
    last_name,
    phone,
    email,
    agent_id,
    voice_number
  FROM ${schema}.leads
  WHERE id = $1 AND tenant_id = $2
  LIMIT 1
`;
```

### Step 2: Update Agent ID Assignment

**Location**: Same file (Line 288)

```javascript
// ❌ OLD
const agentId = process.env.DEFAULT_FOLLOW_UP_AGENT_ID || '24';

// ✅ NEW
const agentId = lead.agent_id;
if (!agentId) {
  throw new Error(`Lead ${booking.lead_id} has no assigned voice agent`);
}
```

### Step 3: Update FROM Number Assignment

**Location**: Same file (around Line 289)

```javascript
// ❌ OLD
fromNumberId: null, // Use default from voice agent

// ✅ NEW
fromNumberId: lead.voice_number || process.env.DEFAULT_VOICE_NUMBER,
```

### Step 4: Add Validation Logging

```javascript
logger.info('[FollowUpExecution] Call parameters prepared:', {
  tenantId,
  bookingId: booking.id,
  leadId: lead.id,
  agentId: callParams.agentId,        // Log the actual agent ID
  phoneNumber: this.maskPhoneNumber(callParams.phoneNumber),
  fromNumberId: callParams.fromNumberId, // Log the from number
  leadName: callParams.leadName
});
```

---

## Verification Checklist

After fixing, verify:

### ✅ Database Schema Check
**CURRENT FINDINGS**:
- Leads table structure (confirmed from schema):
  ```
  ✅ id (uuid)
  ✅ first_name
  ✅ last_name
  ✅ phone (this is the TO number)
  ✅ email
  ✅ assigned_user_id (points to users, not voice agents)
  ❌ agent_id (MISSING - needs to be added)
  ❌ voice_number (MISSING - needs to be added)
  ```

**Voice Agents Table**:
- `voice_agents` has columns:
  - `id` (bigint) - the agent ID
  - `tenant_id` (uuid)
  - `name`
  - `voice_id` (uuid)
  - Related to `voice_agent_numbers` for phone numbers

**ACTION**: Add two columns to leads table:
```sql
ALTER TABLE lad_dev.leads 
ADD COLUMN agent_id BIGINT REFERENCES voice_agents(id),
ADD COLUMN voice_number VARCHAR(50);
```

### ✅ Booking Creation
- When booking is created, verify it references the lead's agent_id

### ✅ Follow-up Execution
- Check server logs to see if `agentId` is being fetched from lead
- Verify `fromNumberId` is populated
- Test followup call and verify correct agent is used

### ✅ Error Handling
- If lead has no agent_id → should throw error with clear message
- If lead has no phone → already handled ✓
- If lead has no voice_number → should have fallback

---

## Testing

### Manual Test:
1. Create a lead with assigned agent_id and voice_number
2. Create a booking for that lead
3. Schedule a follow-up call
4. Verify in logs that:
   ```
   agentId: <lead's actual agent_id>
   phoneNumber: <lead's phone>
   fromNumberId: <lead's voice_number>
   ```
5. Verify call was made with correct agent

### Query to Verify:
```sql
SELECT 
  l.id,
  l.agent_id,
  l.voice_number,
  l.phone,
  b.booking_type,
  b.scheduled_at
FROM lad_dev.leads l
JOIN lad_dev.bookings b ON l.id = b.lead_id
WHERE b.booking_type LIKE '%followup%'
LIMIT 10;
```

---

## Summary

| Component | Current | Status | Fix Required |
|-----------|---------|--------|--------------|
| Agent ID from lead | ❌ NO (hardcoded) | **NOT WORKING** | ✅ YES |
| Voice number from lead | ✅ Partially (phone fetched) | **PARTIAL** | ✅ YES (also as FROM number) |
| Call execution | ✅ YES | **WORKING** | ✅ Use lead's agent instead of default |

**Overall Status**: 🔴 **NOT FULLY WORKING** - Agent ID is using default, not lead's assigned agent

