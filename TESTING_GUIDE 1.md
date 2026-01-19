# Voice Agent API Testing Guide

> Quick reference for starting servers and testing V2 API endpoints using curl (Git Bash compatible).

---

## Table of Contents
1. [Starting the Servers](#starting-the-servers)
2. [Environment Setup](#environment-setup)
3. [Single Call API](#single-call-api)
4. [Batch Call API](#batch-call-api)
5. [Call Status & Cancel](#call-status--cancel)
6. [Recordings API](#recordings-api)
7. [Agents API](#agents-api)
8. [OAuth - Google](#oauth---google)
9. [OAuth - Microsoft](#oauth---microsoft)
10. [Knowledge Base API](#knowledge-base-api)
11. [Call Routing Tests](#call-routing-tests)
12. [Vertical Routing Tests](#vertical-routing-tests)

---

## Starting the Servers

### Option 1: Legacy Server (main.py)
```bash
# From project root
cd vonage-voice-agent
source venv/bin/activate  # or: .\venv\Scripts\activate (Windows)

# Start the API server
python main.py
# or
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Start the LiveKit worker (separate terminal)
python agent.py dev
```

### Option 2: V2 Server (Recommended)
```bash
# From project root
cd vonage-voice-agent/v2

# Terminal 1: Start the V2 API server
uv run main.py
# or
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Start the V2 LiveKit Agent Worker
python -m agent.worker dev
# or for production mode:
python -m agent.worker start
```

**Worker Modes:**
- `dev` - Development mode with hot reload
- `start` - Production mode

### Production Server (SSH)
```bash
# SSH into production
ssh voag-prod

# Check running services
pm2 status

# View logs
pm2 logs voice-agent-api
pm2 logs voice-agent-worker
```

---

## Environment Setup

Set these variables in Git Bash for convenience:

```bash
# Base URLs
export BASE_URL="http://localhost:8000"
export BASE_URL="https://voag.techiemaya.com"
export PROD_URL="https://voag.techiemaya.com"

# Authentication
export API_KEY="kMQgGRDAa8t5CvmkfqFYuGiXIXgNYC1EEGjYs5v8_NU"
export FRONTEND_ID="dev"

# Test user (UUID format for V2)
export USER_ID="81f1decc-7ee5-4093-b55c-95ac9b7c9f45" 

export USER_ID="fe9d6368-ff1b-4133-952a-525d60d06cbe"
####this is mine SAHIL  , my google and microsoft id are attached already , change this to your user id

# Common headers
export HEADERS="-H 'Content-Type: application/json' -H 'X-Frontend-ID: $FRONTEND_ID' -H 'X-API-Key: $API_KEY'"
```

---

## Single Call API

### Trigger a Single Call
```bash
# V2 Endpoint: POST /calls/start-call
curl -X POST "$BASE_URL/calls/start-call" \
  -H "Content-Type: application/json" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "voice_id": "default",
    "to_number": "+918384884150",
    "from_number": "+19513456728",
    "added_context": "This is a test call",
    "initiated_by": "81f1decc-7ee5-4093-b55c-95ac9b7c9f45",
    "agent_id": 7,
    "lead_name": "Sahil"
  }'
```

### With Knowledge Base
```bash
curl -X POST "$BASE_URL/calls/start-call" \
  -H "Content-Type: application/json" \
  -H "X-Frontend-ID: g_links" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "voice_id": "default",
    "to_number": "+918384884150",
    "from_number": "+19513456728",
    "added_context": "Customer inquiry about courses",
    "initiated_by": "81f1decc-7ee5-4093-b55c-95ac9b7c9f45",
    "agent_id": 14,
    "lead_name": "Sahil",
    "knowledge_base_store_ids": ["fileSearchStores/glinks-complete-documents-d-8uyr36hsxdgz"]
  }'
```

### Get Job Status
```bash
# Replace {job_id} with actual job ID from trigger response
curl -X GET "$BASE_URL/calls/job/{job_id}" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY"
```

---
```
curl -X POST "$BASE_URL/calls/start-call"   -H "Content-Type: application/json"   -H "X-Frontend-ID: dev"   -H "X-API-Key: $API_KEY"   -d '{
    "voice_id": "default",
    "to_number": "+918384884150",
    "from_number": "+19513456728",
    "added_context": "This is a test call",
    "initiated_by": "81f1decc-7ee5-4093-b55c-95ac9b7c9f45",
    "agent_id": 9,
    "lead_name": "Sahil"
  }'
```

## Batch Call API

### Trigger Batch Call (JSON)
```bash
# V2 Endpoint: POST /batch/trigger-batch-call
curl -X POST "$BASE_URL/batch/trigger-batch-call" \
  -H "Content-Type: application/json" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "voice_id": "default",
    "from_number": "+918634515070",
    "agent_id": 4,
    "initiated_by": "81f1decc-7ee5-4093-b55c-95ac9b7c9f45",
    "entries": [
      {"to_number": "+918384884150", "lead_name": "Sahil"},
      {"to_number": "+919457818390", "lead_name": "Sahil Tomar", "added_context": "VIP customer"}
    ]
  }'
```

### Get Batch Status
```bash
# Replace {batch_id} with batch-xxx ID from trigger response
curl -X GET "$BASE_URL/batch/batch-status/{batch_id}" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY"
```

### Cancel Batch
```bash
curl -X POST "$BASE_URL/batch/batch-cancel/{batch_id}" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY"
```

---

## Call Status & Cancel

### Get Call Status
```bash
# By call_log_id (UUID)
curl -X GET "$BASE_URL/calls/status/656c20da-f859-46db-ae05-3cc2a3ca24e7" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY"

# By batch job_id (batch-xxx format)
curl -X GET "$BASE_URL/calls/status/batch-abc123" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY"
```

### Cancel Call or Batch
```bash
curl -X POST "$BASE_URL/calls/cancel" \
  -H "Content-Type: application/json" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY" \
  -d '{"resource_id": "89adc2d4e8814fc6898151f3091eeebc"}'
```

---

## Recordings API

### Get Signed URL by GCS Path
```bash
curl -X POST "$BASE_URL/recordings/signed-url" \
  -H "Content-Type: application/json" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "gs_url": "gs://voiceagent-recording/recordings/call-16f056a5b0f5414d890ea73e5d51e8f6-3c405bac/25488e7d-9131-4212-9e2b-d5b20a7c2198.ogg",
    "expiration_hours": 36
  }'
```

### Get Signed URL by Call ID
```bash
curl -X GET "$BASE_URL/recordings/calls/656c20da-f859-46db-ae05-3cc2a3ca24e7/signed-url" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY"
```

---

## Agents API

### List All Agents
```bash
curl -X GET "$BASE_URL/agents/voice-agents?limit=50&active_only=true" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY"
```

### Get Specific Agent
```bash
curl -X GET "$BASE_URL/agents/voice-agents/35" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY"
```

### Create Agent
```bash
curl -X POST "$BASE_URL/agents/voice-agents" \
  -H "Content-Type: application/json" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "Test Agent",
    "description": "Agent for testing",
    "voice_id": "default",
    "instructions": "You are a helpful assistant.",
    "is_active": true
  }'
```

### Update Agent
```bash
curl -X PUT "$BASE_URL/agents/voice-agents/35" \
  -H "Content-Type: application/json" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "instructions": "Updated instructions here"
  }'
```

### Delete Agent (Soft Delete)
```bash
curl -X DELETE "$BASE_URL/agents/voice-agents/35" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY"
```

---

## OAuth - Google

### Check OAuth Status
```bash
curl -X GET "$BASE_URL/auth/status?user_id=81f1decc-7ee5-4093-b55c-95ac9b7c9f45" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY"
```

### Start OAuth Flow (Browser Redirect)
```bash
# This returns a redirect URL - open in browser
curl -i "$BASE_URL/auth/google/start?user_id=81f1decc-7ee5-4093-b55c-95ac9b7c9f45&frontend_id=console"
```

### Revoke Google Tokens
```bash
curl -X POST "$BASE_URL/auth/revoke" \
  -H "Content-Type: application/json" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY" \
  -d '{"user_id": "81f1decc-7ee5-4093-b55c-95ac9b7c9f45"}'
```

---

## OAuth - Microsoft

### Check Microsoft OAuth Status
```bash
curl -X GET "$BASE_URL/auth/microsoft/status?user_id=$USER_ID" \
  -H "X-Frontend-ID: $FRONTEND_ID" \
  -H "X-API-Key: $API_KEY"
```

### Start Microsoft OAuth Flow
```bash
curl -X GET "$BASE_URL/auth/microsoft/start?user_id=$USER_ID&frontend_id=$FRONTEND_ID" \
  -H "X-Frontend-ID: $FRONTEND_ID" \
  -H "X-API-Key: $API_KEY"
```

### List Booking Businesses
```bash
curl -X GET "$BASE_URL/auth/microsoft/list-businesses?user_id=$USER_ID" \
  -H "X-Frontend-ID: $FRONTEND_ID" \
  -H "X-API-Key: $API_KEY"
```

### List Booking Services
```bash
curl -X GET "$BASE_URL/auth/microsoft/list-services?user_id=$USER_ID&business_id=testingname@techiemaya.com" \
  -H "X-Frontend-ID: $FRONTEND_ID" \
  -H "X-API-Key: $API_KEY"
```

### List Booking Staff
```bash
curl -X GET "$BASE_URL/auth/microsoft/staff?user_id=$USER_ID&business_id=testingname@techiemaya.com" \
  -H "X-Frontend-ID: $FRONTEND_ID" \
  -H "X-API-Key: $API_KEY"
```

### Save Booking Defaults
```bash
curl -X POST "$BASE_URL/auth/microsoft/save-config" \
  -H "Content-Type: application/json" \
  -H "X-Frontend-ID: $FRONTEND_ID" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "user_id": "'"$USER_ID"'",
    "business_id": "testingname@techiemaya.com",
    "service_id": "d51ffd7f-0a25-4704-b81c-9dd56254f9f6",
    "staff_member_id": "1cef32ff-e905-4b0f-8693-48b41a57ea36"
  }'
```


### Revoke Microsoft Tokens
```bash
curl -X POST "$BASE_URL/auth/microsoft/revoke" \
  -H "Content-Type: application/json" \
  -H "X-Frontend-ID: g_links" \
  -H "X-API-Key: $API_KEY" \
  -d '{"user_id": "63"}'
```

---

## Knowledge Base API

### Check KB Status
```bash
curl -X GET "$BASE_URL/knowledge-base/status" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY"
```

### List All Stores
```bash
curl -X GET "$BASE_URL/knowledge-base/stores" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY"
```

### Create Store
```bash
curl -X POST "$BASE_URL/knowledge-base/stores" \
  -H "Content-Type: application/json" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "display_name": "Test KB Store",
    "description": "Knowledge base for testing"
  }'
```

### Get Stores for Agent
```bash
curl -X GET "$BASE_URL/knowledge-base/agents/35/stores" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY"
```

### Link Store to Agent
```bash
curl -X POST "$BASE_URL/knowledge-base/agents/35/stores" \
  -H "Content-Type: application/json" \
  -H "X-Frontend-ID: dev" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "store_id": "fileSearchStores/glinks-complete-documents-d-8uyr36hsxdgz",
    "is_default": true,
    "priority": 1
  }'
```

---

## Quick Health Check

```bash
# Root health check
curl "$BASE_URL/"

# Kubernetes probes
curl "$BASE_URL/healthz"
curl "$BASE_URL/readyz"
```

---

## Notes

- **Git Bash on Windows**: Use `curl.exe` instead of `curl` if you get issues
- **API Key**: Never commit real API keys to version control
- **UUIDs**: V2 uses UUID strings for `initiated_by` and `lead_id` (not integers)
- **Production**: Replace `$BASE_URL` with `https://voag.techiemaya.com` for production tests

---

## Call Routing Tests

Tests for phone number validation and carrier-specific formatting (`utils/call_routing.py`).

### Test Phone Number Parsing
```bash
cd vonage-voice-agent/v2
uv run python -c "
from utils.call_routing import parse_phone_number

# Test phone number parsing
test_cases = [
    '+919876543210',  # India with country code
    '919876543210',   # India without +
    '09876543210',    # India with 0-prefix (local format)
    '9876543210',     # Bare 10 digits (should fail - no country)
    '+14155551234',   # USA
    '+447911123456',  # UK
]

print('=== Phone Number Parsing Tests ===')
for num in test_cases:
    parsed = parse_phone_number(num)
    status = 'OK' if parsed.country else 'NO COUNTRY'
    print(f'{num:20} -> cc={parsed.country_code}, country={parsed.country} [{status}]')
"
```

### Test Call Routing with Database
```bash
cd vonage-voice-agent/v2
uv run python -c "
from utils.call_routing import validate_and_format_call
from db.db_config import get_db_config

db_config = get_db_config()

print('=== Call Routing Tests ===')
test_cases = [
    # Vonage number (global) - requires country code
    ('+19513456728', '+919876543210', 'Vonage: India with CC'),
    ('+19513456728', '09876543210', 'Vonage: India 0-prefix'),
    ('+19513456728', '9876543210', 'Vonage: bare (ERROR expected)'),
    ('+19513456728', '+14155551234', 'Vonage: USA'),
    
    # Sasya number (India only) - must use 0-prefix format
    ('+918634515070', '+919876543210', 'Sasya: India with CC'),
    ('+918634515070', '09876543210', 'Sasya: India 0-prefix'),
    ('+918634515070', '+14155551234', 'Sasya: USA (ERROR expected)'),
]

for from_num, to_num, desc in test_cases:
    result = validate_and_format_call(from_num, to_num, db_config)
    status = 'OK' if result.success else 'FAIL'
    output = result.formatted_to_number if result.success else result.error_message[:40]
    print(f'{desc:30} [{status}] {output}')
"
```

### Expected Results
| Carrier | Input | Expected Output |
|---------|-------|-----------------|
| Vonage (+19513456728) | `+919876543210` | `+919876543210` |
| Vonage (+19513456728) | `09876543210` | `+919876543210` |
| Vonage (+19513456728) | `9876543210` | **ERROR** (no country code) |
| Sasya (+918634515070) | `+919876543210` | `09876543210` |
| Sasya (+918634515070) | `+14155551234` | **ERROR** (India only) |

---

## Vertical Routing Tests

Tests for tenant-based lead extraction routing (`utils/vertical_routing.py`).

### Test Slug to Vertical Detection
```bash
cd vonage-voice-agent/v2
uv run python -c "
from utils.tenant_utils import get_vertical_from_slug

test_cases = [
    ('education_glinks', 'education'),
    ('education-glinks', 'education'),
    ('realestate_xyz', 'realestate'),
    ('realestate-agency', 'realestate'),
    ('g_links', 'education'),
    ('general-company', 'general'),
    ('random_slug', 'general'),
]

print('=== Slug to Vertical Detection ===')
for slug, expected in test_cases:
    result = get_vertical_from_slug(slug)
    status = 'OK' if result == expected else 'FAIL'
    print(f'{slug:20} -> {result:12} (expected: {expected}) [{status}]')
"
```

### Test Vertical Routing from Tenant ID
```bash
cd vonage-voice-agent/v2
uv run python -c "
from utils.tenant_utils import get_vertical_from_tenant_id_sync

# Glinks tenant ID
tenant_id = '926070b5-189b-4682-9279-ea10ca090b84'
vertical = get_vertical_from_tenant_id_sync(tenant_id)
print(f'Tenant {tenant_id[:8]}... -> Vertical: {vertical}')
print(f'Expected: education')
print(f'Status: {\"OK\" if vertical == \"education\" else \"FAIL\"}')"
```

### Expected Vertical Routing Flow
| Tenant Slug | Vertical | Target Table |
|-------------|----------|--------------|
| `education_glinks` | education | `lad_dev.education_students` |
| `realestate_xyz` | realestate | (future) |
| `general-company` | general | `voice_call_analysis.lead_extraction` |

