# Unipile Outreach Sequence API

**Date**: 2026-01-18  
**Feature**: LinkedIn outreach automation with intelligent scheduling  
**Status**: Ready for implementation  

## Overview

Automate LinkedIn outreach campaigns with intelligent scheduling that respects LinkedIn rate limits and mimics human behavior. Based on official Unipile best practices for outreach sequences.

### Key Features

✅ **Rate Limiting Compliance**
- Respects LinkedIn limits: 80-100 requests/day, 200/week
- Spreads invitations across working hours with random intervals
- Prevents account restrictions and blocks

✅ **Intelligent Scheduling**
- Automatically generates sending slots for multiple days
- Skips weekends automatically
- Human-like randomization of send times

✅ **Relationship-Aware**
- Detects existing connections
- Handles pending incoming requests
- Sends appropriate message type (invite vs message vs InMail)

✅ **Conversion of IDs**
- Converts public LinkedIn IDs to private IDs (required for sending)
- Retrieves profile data before sending

---

## API Endpoints

### 1. Create Outreach Sequence

**Endpoint**: `POST /api/apollo-leads/unipile/outreach/create`

Create a new outreach sequence with automatic scheduling.

**Request**:
```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/outreach/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "campaignId": "campaign-123",
    "profileIds": [
      "https://www.linkedin.com/in/john-doe",
      "https://www.linkedin.com/in/jane-smith",
      "jane-smith"
    ],
    "accountId": "unipile-account-id-123",
    "message": "Hi {{first_name}}, I would like to connect with you!",
    "dailyLimit": 40,
    "startDate": "2026-01-20"
  }'
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string | ✅ Yes | Campaign ID to associate with sequence |
| `profileIds` | Array<string> | ✅ Yes | LinkedIn profile URLs or IDs to contact |
| `accountId` | string | ✅ Yes | Unipile LinkedIn account ID |
| `message` | string | ❌ No | Connection message template |
| `dailyLimit` | number | ❌ No | Daily invitation limit (default: 40, max: 80) |
| `startDate` | string | ❌ No | Start date (ISO format, default: today) |

**Response**:
```json
{
  "success": true,
  "sequenceId": "seq-789",
  "totalProfiles": 1000,
  "dailyLimit": 40,
  "estimatedDays": 25,
  "estimatedWeeks": 5,
  "startDate": "2026-01-20",
  "slots": 1000
}
```

**What Happens**:
1. Creates a sequence record in database
2. Generates 1000 sending slots (1 per profile)
3. Spreads slots across 25 days (1000 ÷ 40/day)
4. Respects LinkedIn rate limits (max 80/day)
5. Skips weekends automatically
6. Randomizes times within working hours (9 AM - 6 PM)
7. Returns sequence ID for tracking

---

### 2. Get Pending Slots for Today

**Endpoint**: `GET /api/apollo-leads/unipile/outreach/pending`

Retrieve all sending slots scheduled for today.

**Request**:
```bash
curl -X GET 'http://localhost:3004/api/apollo-leads/unipile/outreach/pending?accountId=unipile-account-id-123' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | string | ✅ Yes | Unipile LinkedIn account ID |

**Response**:
```json
{
  "success": true,
  "slots": [
    {
      "id": "slot-001",
      "profile_id": "https://www.linkedin.com/in/john-doe",
      "scheduled_time": "2026-01-20T10:15:00Z",
      "status": "pending",
      "message": "Hi {{first_name}}...",
      "campaign_id": "campaign-123"
    },
    {
      "id": "slot-002",
      "profile_id": "https://www.linkedin.com/in/jane-smith",
      "scheduled_time": "2026-01-20T11:45:00Z",
      "status": "pending",
      "message": "Hi {{first_name}}...",
      "campaign_id": "campaign-123"
    }
  ],
  "count": 42
}
```

---

### 3. Send Connection Request

**Endpoint**: `POST /api/apollo-leads/unipile/outreach/send`

Send a connection request immediately or in response to a scheduled slot.

**Request**:
```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/outreach/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "slotId": "slot-001",
    "profileId": "https://www.linkedin.com/in/john-doe",
    "accountId": "unipile-account-id-123",
    "message": "Hi John, I would like to connect!",
    "sequenceId": "seq-789"
  }'
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `profileId` | string | ✅ Yes | LinkedIn profile URL or ID |
| `accountId` | string | ✅ Yes | Unipile LinkedIn account ID |
| `slotId` | string | ❌ No | Slot ID (for tracking) |
| `message` | string | ❌ No | Connection message |
| `sequenceId` | string | ❌ No | Sequence ID (for tracking) |

**Response**:
```json
{
  "success": true,
  "profileId": "https://www.linkedin.com/in/john-doe",
  "privateId": "private-12345",
  "relationshipStatus": "NOT_CONNECTED",
  "actionTaken": "invitation_sent",
  "result": {
    "status": "sent",
    "timestamp": "2026-01-20T10:15:00Z"
  }
}
```

**Relationship Status Handling**:
| Status | Action | Details |
|--------|--------|---------|
| `NOT_CONNECTED` | Send invitation | Standard connection request with message |
| `CONNECTED` | Send message | Message to existing connection |
| `PENDING_OUTGOING` | Send message | Message to pending outgoing request |
| `PENDING_INCOMING` | Accept + Message | Accept request, then send message |

---

### 4. Process Pending Slots (Cron Job)

**Endpoint**: `POST /api/apollo-leads/unipile/outreach/process`

Process all pending slots due for sending today (trigger via cron job).

**Request**:
```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/outreach/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "accountId": "unipile-account-id-123"
  }'
```

**Cron Schedule Example**:
```bash
# Run every 15 minutes during working hours
*/15 9-18 * * 1-5 curl -X POST http://localhost:3004/api/apollo-leads/unipile/outreach/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{"accountId":"unipile-account-id-123"}'
```

**Response**:
```json
{
  "success": true,
  "processed": 12,
  "failed": 0
}
```

---

### 5. Get Sequence Status

**Endpoint**: `GET /api/apollo-leads/unipile/outreach/:sequenceId/status`

Get current status and statistics for an outreach sequence.

**Request**:
```bash
curl -X GET 'http://localhost:3004/api/apollo-leads/unipile/outreach/seq-789/status' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "sequence": {
    "id": "seq-789",
    "campaign_id": "campaign-123",
    "account_id": "unipile-account-123",
    "total_profiles": 1000,
    "daily_limit": 40,
    "estimated_days": 25,
    "start_date": "2026-01-20",
    "status": "active",
    "created_at": "2026-01-18T12:00:00Z"
  },
  "stats": {
    "total": 1000,
    "sent": 120,
    "failed": 5,
    "pending": 875,
    "successRate": "96.0"
  }
}
```

---

## Usage Examples

### Example 1: Full Outreach Campaign

**Step 1: Search for leads**
```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/search/people \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "accountId": "unipile-account-id-123",
    "industry": "SaaS",
    "location": "San Francisco",
    "designation": "Product Manager",
    "limit": 100
  }' > leads.json
```

**Step 2: Extract profile IDs**
```bash
jq -r '.data[].linkedin_url' leads.json > profile_ids.txt
```

**Step 3: Create outreach sequence**
```bash
curl -X POST http://localhost:3004/api/apollo-leads/unipile/outreach/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "campaignId": "pm-outreach-2026",
    "profileIds": '$(jq -R -s 'split("\n") | map(select(length > 0))' profile_ids.txt)',
    "accountId": "unipile-account-id-123",
    "message": "Hi, I noticed you are a Product Manager at a SaaS company. I would like to connect!",
    "dailyLimit": 50,
    "startDate": "2026-01-20"
  }' > sequence.json
```

**Step 4: Monitor progress**
```bash
SEQUENCE_ID=$(jq -r '.sequenceId' sequence.json)

# Check status daily
curl -X GET "http://localhost:3004/api/apollo-leads/unipile/outreach/${SEQUENCE_ID}/status" \
  -H "Authorization: Bearer ${JWT_TOKEN}"
```

---

### Example 2: Manual Sending with Verification

```javascript
// Get pending slots for today
const pending = await fetch('/api/apollo-leads/unipile/outreach/pending?accountId=...', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log(`${pending.count} profiles to contact today`);

// Review before sending
for (const slot of pending.slots) {
  console.log(`Send to: ${slot.profile_id} at ${slot.scheduled_time}`);
}

// Send manually (instead of automatic processing)
for (const slot of pending.slots.slice(0, 5)) {
  const result = await fetch('/api/apollo-leads/unipile/outreach/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      slotId: slot.id,
      profileId: slot.profile_id,
      accountId: slot.account_id,
      message: slot.message
    })
  }).then(r => r.json());
  
  console.log(`✅ Sent to ${slot.profile_id}`);
  
  // Small random delay between requests
  await new Promise(r => setTimeout(r, Math.random() * 3000 + 2000));
}
```

---

## LinkedIn Rate Limits

Based on official Unipile documentation:

### Connection Requests
- **Per Day**: 80-100 requests per account
- **Per Week**: 200 requests maximum
- **Recommended**: 30-50 invitations daily
- **Spacing**: Random intervals throughout working hours

### Profile Visits
- **Standard Account**: 80-100 visits per day
- **Sales Navigator**: Up to 150 visits per day

### Data Gathering
- **Max Per Day**: 1,000 profiles to fetch
- **Pagination**: Use cursor for all pages
- **Spacing**: Mimic human activity patterns

---

## Sending Slot Generation

The service automatically generates intelligent sending slots:

### Algorithm

1. **Calculate total days needed**
   ```
   totalDays = ceil(profileCount / dailyLimit)
   ```

2. **Skip weekends**
   - Automatically skips Saturday (day 6) and Sunday (day 0)

3. **Generate random times within working hours**
   - Working hours: 9 AM - 6 PM (9 random intervals per day)
   - Random offset: ±15 minutes per slot
   - Prevents clustering of requests

### Example: 100 profiles with 40/day limit

**Day 1 (Monday)**
- 9:15 AM - Profile 1
- 10:42 AM - Profile 2
- 12:08 PM - Profile 3
- 1:35 PM - Profile 4
- ...
- 5:47 PM - Profile 40

**Day 2 (Tuesday)**
- 9:22 AM - Profile 41
- 10:51 AM - Profile 42
- ...

**Day 3 (Wednesday)**
- 9:10 AM - Profile 81
- ...
- 11:28 AM - Profile 100

---

## Database Schema

### outreach_sequences
```sql
CREATE TABLE outreach_sequences (
  id UUID PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  tenant_id UUID NOT NULL,
  account_id VARCHAR(255) NOT NULL, -- Unipile account ID
  total_profiles INT NOT NULL,
  daily_limit INT NOT NULL,
  estimated_days INT,
  estimated_weeks INT,
  start_date DATE,
  message TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, failed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  INDEX (tenant_id, account_id)
);
```

### outreach_sending_slots
```sql
CREATE TABLE outreach_sending_slots (
  id UUID PRIMARY KEY,
  sequence_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  profile_id VARCHAR(500) NOT NULL, -- LinkedIn profile URL
  scheduled_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
  day DATE,
  metadata JSONB, -- { error: string, result: object, attempt: number }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (sequence_id) REFERENCES outreach_sequences(id),
  INDEX (sequence_id, status),
  INDEX (tenant_id, scheduled_time)
);
```

---

## Error Handling

### LinkedIn Rate Limit Exceeded

```json
{
  "success": false,
  "error": "LinkedIn rate limit exceeded. Please wait before sending more requests.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 3600
}
```

**Handling**: Automatically reschedule failed slots to next day.

### Profile Not Found

```json
{
  "success": false,
  "error": "Profile not found or inaccessible",
  "profileId": "https://www.linkedin.com/in/invalid-profile"
}
```

**Handling**: Mark slot as failed, skip and continue.

### Checkpoint/Security Challenge

```json
{
  "success": false,
  "error": "LinkedIn checkpoint triggered. Please solve the challenge.",
  "code": "CHECKPOINT_REQUIRED"
}
```

**Handling**: Pause sequence until challenge is solved.

---

## Best Practices

### 1. Batch Size
- Search for leads in batches of 100-500
- Create sequence with those results
- Let scheduling system handle daily sending

### 2. Timing
- Create sequences during business hours
- Let system send during 9 AM - 6 PM
- Separate sequences by 1-2 hours to avoid clustering

### 3. Message Template
- Keep messages short and personalized
- Use variables: `{{first_name}}`, `{{company_name}}`
- Mention how you found them (industry, location, role)

### 4. Monitoring
- Check status daily via `/status` endpoint
- Adjust daily limit if hitting rate limits
- Pause if receiving LinkedIn checkpoints

### 5. Multiple Accounts
- Distribute profiles across multiple accounts
- Don't run 2 sequences on same account simultaneously
- Adjust daily limits to share the 200/week budget

---

## Integration with Campaigns

### Create Campaign → Generate Leads → Automate Outreach

```javascript
// 1. Create campaign
const campaign = await createCampaign({
  name: "SaaS PM Outreach",
  industry: "SaaS",
  location: "San Francisco"
});

// 2. Search for leads via Unipile
const leads = await searchLeads({
  accountId: "...",
  industry: "SaaS",
  location: "San Francisco",
  designation: "Product Manager"
});

// 3. Save leads to campaign
const saved = await saveLeadsToCampaign(campaign.id, leads);

// 4. Create outreach sequence
const sequence = await createOutreachSequence({
  campaignId: campaign.id,
  profileIds: leads.map(l => l.linkedin_url),
  accountId: "...",
  message: "Hi {{first_name}}, I noticed you're a PM at {{company_name}}..."
});

console.log(`📅 Sequence created: ${sequence.estimatedWeeks} weeks, ${sequence.estimatedDays} days`);
```

---

## Troubleshooting

### Sequence Taking Too Long
**Problem**: Estimated 8 weeks to contact 1,600 people  
**Solution**: Increase `dailyLimit` to 60 (requires 2 accounts or waiting)

### High Failure Rate
**Problem**: 20% of requests failing  
**Solution**: 
- Check if hitting LinkedIn rate limits
- Verify profile URLs are correct
- Check for LinkedIn security checkpoints

### Uneven Distribution
**Problem**: Sending more on some days than others  
**Solution**: This is by design (weekends are skipped, random spacing varies)

### Slots Not Being Processed
**Problem**: Pending slots not sending automatically  
**Solution**:
- Check if cron job is configured
- Verify `accountId` in database
- Check logs for errors

---

## Environment Variables

```bash
UNIPILE_DSN=your-unipile-api-endpoint
UNIPILE_TOKEN=your-unipile-api-token
```

---

## Related Features

- [Unipile Search API](UNIPILE_SEARCH_API.md) - Find leads before outreach
- Apollo Reveals - Get email/phone for reveals after connection
- Campaign Management - Create campaigns for outreach efforts
- LinkedIn Integration - Connect your LinkedIn account to Unipile
