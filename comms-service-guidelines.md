## BNI Conversation Service — Backend API Reference

### Service URL
Production: https://bni-conversation-service-160078175457.us-central1.run.app

### Architecture
- **Backend**: Python FastAPI service running on Google Cloud Run (port 8080)
- **Database**: PostgreSQL (`salesmaya_bni`) with tables: `conversations`, `messages`, `leads`, `bni_conversation_manager`
- **WhatsApp**: Integrated with WhatsApp Business Cloud API for sending/receiving messages and tracking delivery status
- **Frontend Proxy**: Next.js API routes at `/api/whatsapp-conversations/` proxy requests to this Python service

### Database Schema

**conversations** table:
- id (UUID, PK), lead_id (UUID, FK→leads), status (active|resolved|muted), owner (AI|human_agent), metadata (JSONB), started_at, updated_at

**messages** table:
- id (UUID, PK), conversation_id (UUID, FK→conversations), lead_id (UUID, FK→leads), role (lead|agent|human_agent), content (text), message_status (received|sent|delivered|read|failed), external_message_id, created_at

**leads** table:
- id (UUID, PK), organization_id (UUID), name, phone, created_at, updated_at

**bni_conversation_manager** table:
- id (UUID, PK), lead_id (UUID), member_phone, member_name, context_status, company_name, industry, designation, services_offered, metadata (JSONB), created_at, updated_at

---

### API Endpoints

#### 1. List Conversations
GET /api/conversations?status=active&search=john&limit=50&offset=0


**Query params** (all optional): `status`, `search`, `channel`, `limit` (default 50), `offset` (default 0)

**Response:**
```json
{
  "success": true,
  "total": 25,
  "data": [
    {
      "id": "uuid",
      "lead_id": "uuid",
      "lead_name": "Naveen Reddy",
      "lead_phone": "971506341191",
      "lead_channel": "whatsapp",
      "status": "active",
      "owner": "AI",
      "context_status": "icp_discovery",
      "last_message_content": "Thank you for sharing.",
      "last_message_role": "agent",
      "last_message_at": "2026-03-04T10:30:00",
      "message_count": 12,
      "unread_count": 0,
      "started_at": "2026-03-01T09:00:00",
      "updated_at": "2026-03-04T10:30:00"
    }
  ]
}
2. Get Single Conversation

GET /api/conversations/{conversation_id}
Response:


{
  "success": true,
  "data": {
    "id": "uuid",
    "lead_id": "uuid",
    "lead_name": "Naveen Reddy",
    "lead_phone": "971506341191",
    "lead_channel": "whatsapp",
    "status": "active",
    "owner": "AI",
    "context_status": "icp_discovery",
    "started_at": "2026-03-01T09:00:00",
    "updated_at": "2026-03-04T10:30:00"
  }
}
3. List Messages

GET /api/conversations/{conversation_id}/messages?limit=50&offset=0
Response:


{
  "success": true,
  "total": 12,
  "has_more": false,
  "data": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "lead_id": "uuid",
      "role": "user",
      "content": "Hello, I run a construction company",
      "message_status": "received",
      "created_at": "2026-03-04T10:25:00"
    },
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "lead_id": "uuid",
      "role": "assistant",
      "content": "Thank you. What industry does your business operate in?",
      "message_status": "delivered",
      "created_at": "2026-03-04T10:25:05"
    }
  ]
}
Role mapping: DB stores lead → API returns user, DB stores agent → API returns assistant, human_agent stays as-is.

Message status values and their meaning:

received — Incoming message from the user (role: user)
sent — Outgoing message sent to WhatsApp API, awaiting delivery confirmation
delivered — WhatsApp confirmed delivery to recipient's device
read — Recipient opened and read the message (blue ticks)
failed — Message failed to send
Status icon mapping for frontend:

received → No icon needed (incoming messages)
sent → Clock icon (single grey tick)
delivered → Double grey tick
read → Double blue tick
failed → Red error icon
Messages are sorted by created_at ASC (oldest first). Status updates happen automatically via WhatsApp webhook callbacks and are reflected when the frontend polls for messages.

4. Send Message (Human Agent Takeover)

POST /api/conversations/{conversation_id}/messages
Content-Type: application/json

{
  "content": "Hi, this is a human agent reaching out.",
  "lead_id": "uuid",
  "phone_number": "971506341191"
}
If phone_number is omitted, the service looks it up from the leads table using lead_id
Sends the message via WhatsApp Business API
Saves it to the messages table with role human_agent
Automatically sets conversation owner to human_agent
Message status will progress from sent → delivered → read via webhook callbacks
Response:


{
  "success": true,
  "data": {
    "id": "uuid",
    "conversation_id": "uuid",
    "lead_id": "uuid",
    "role": "human_agent",
    "content": "Hi, this is a human agent reaching out.",
    "message_status": "sent",
    "created_at": null
  }
}
5. Update Conversation Status

PATCH /api/conversations/{conversation_id}/status
Content-Type: application/json

{ "status": "resolved" }
Valid values: active, resolved, muted

6. Update Conversation Ownership

PATCH /api/conversations/{conversation_id}/ownership
Content-Type: application/json

{ "owner": "human_agent" }
Valid values: AI, human_agent

WhatsApp Delivery Status Flow
The backend automatically tracks message delivery status via WhatsApp webhook callbacks:


Message sent → WhatsApp API → saved as "sent"
                    ↓
         WhatsApp delivers to device → webhook callback → updated to "delivered"
                    ↓
         Recipient reads message → webhook callback → updated to "read"
Status updates are processed at POST /webhook (same endpoint that receives incoming messages)
Messages are matched by external_message_id (WhatsApp's message ID)
Status never downgrades (e.g., a read message won't revert to delivered)
The frontend should poll GET /api/conversations/{id}/messages periodically (recommended: every 10 seconds) to pick up status changes
Frontend Integration (Next.js)
The frontend uses Next.js API routes as a proxy layer. All requests go through /api/whatsapp-conversations/ which forwards to the Python service.

Proxy mapping:

Frontend Route	Backend Route
GET /api/whatsapp-conversations/conversations	GET /api/conversations
GET /api/whatsapp-conversations/conversations/:id	GET /api/conversations/:id
GET /api/whatsapp-conversations/conversations/:id/messages	GET /api/conversations/:id/messages
POST /api/whatsapp-conversations/conversations/:id/messages	POST /api/conversations/:id/messages
PATCH /api/whatsapp-conversations/conversations/:id/status	PATCH /api/conversations/:id/status
PATCH /api/whatsapp-conversations/conversations/:id/ownership	PATCH /api/conversations/:id/ownership
Proxy utility (web/src/app/api/whatsapp-conversations/utils/python-proxy.ts):

getWhatsAppServiceUrl() — returns the BNI service URL from env var NEXT_PUBLIC_BNI_SERVICE_URL or BNI_SERVICE_URL
proxyToPythonService(req, baseUrl, path) — forwards the request with query params, headers, and body
SDK layer (sdk/features/conversations/api.ts):

Uses proxyClient (relative fetch through Next.js) not direct backend calls
All data is mapped from snake_case (API) to camelCase (frontend) via mapConversationFromApi and mapMessageFromApi
Messages poll every 10 seconds via TanStack Query refetchInterval
Environment variable needed in frontend .env:


NEXT_PUBLIC_BNI_SERVICE_URL=https://bni-conversation-service-160078175457.us-central1.run.app
Or set BNI_SERVICE_URL as a server-side env var in Cloud Run.

Conversation State Machine
The context_status field in bni_conversation_manager tracks the AI conversation flow:


onboarding_greeting → onboarding_profile → icp_discovery → onboarding_complete → match_suggested → coordination_a_availability → idle
The AI agent handles all state transitions automatically. Human agents can take over any conversation by sending a message through the POST endpoint. When a human agent sends a message, the conversation owner is automatically changed to human_agent.