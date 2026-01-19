# LAD ER Model - Complete Database Schema

**Last Updated:** January 9, 2026
**Schema:** `lad_dev`
**Total Tables:** 50+

## Table Organization

### Core Multi-Tenant Infrastructure (9 tables)
- **TENANTS** - Organizations/companies using the platform
- **USERS** - Global users across all tenants (externally authenticated)
- **USER_IDENTITIES** - External auth provider linkage (Clerk, Google, etc.)
- **MEMBERSHIPS** - User-tenant relationships with roles (owner, admin, member, viewer)
- **TENANT_FEATURES** - Feature enablement flags per tenant
- **USER_CAPABILITIES** - Granular permission control linked to features
- **TENANT_INVITATIONS** - Invitation workflow for team members
- **DOMAIN_EVENTS** - Event sourcing/outbox pattern for async processing
- **FEATURE_FLAGS** - Dynamic feature toggles per tenant/user

### Credits & Billing (2 legacy + 6 new tables)
**Legacy Credit System:**
- **USER_CREDITS** - User wallet balance
- **CREDIT_TRANSACTIONS** - Audit trail of credit movements

**New Billing System:**
- **BILLING_WALLETS** - Multi-level wallets (tenant & user level) with reserved balance
- **BILLING_LEDGER_TRANSACTIONS** - Immutable ledger (source of truth)
- **BILLING_USAGE_EVENTS** - Feature usage tracking with multi-component itemization
- **BILLING_PRICING_CATALOG** - Pricing rules per component/provider/model
- **BILLING_INVOICES** - Invoice generation (stub for future)
- **BILLING_FEATURE_ENTITLEMENTS** - Plan-based feature quotas and overage rules

### Leads & Pipeline (6 tables)
- **LEADS** - Core lead data (contact info, stage, status, custom fields)
- **LEAD_STAGES** - Pipeline stages (customizable per tenant)
- **LEAD_STATUSES** - Lead status definitions
- **LEAD_NOTES** - Timestamped notes attached to leads
- **LEAD_ATTACHMENTS** - Files/documents linked to leads
- **LEAD_BOOKINGS** - Call scheduling with retry support
- **LEAD_SOCIAL** - Social profile enrichment data

### Campaigns (4 tables)
- **CAMPAIGNS** - Multi-channel campaign definitions
- **CAMPAIGN_STEPS** - Workflow steps (LinkedIn, email, voice, SMS, etc.)
- **CAMPAIGN_LEADS** - Leads enrolled in campaigns with progress tracking
- **CAMPAIGN_LEAD_ACTIVITIES** - Granular action history per lead

### Communication (3 tables)
- **COMMUNICATION_TEMPLATES** - Email/SMS/chat templates with variable substitution
- **EMAIL_ACCOUNTS** - SMTP account management for outbound email
- **SOCIAL_LINKEDIN_ACCOUNTS** - LinkedIn account integration via Unipile
- **CAMPAIGN_LINKEDIN_ACCOUNTS** - LinkedIn accounts linked to specific campaigns

### Apollo Data Enrichment (2 tables)
- **COMPANY_SEARCH_CACHE** - Cached Apollo company search results
- **EMPLOYEES_CACHE** - Cached Apollo employee/contact data

### Education Vertical (2 tables)
- **EDUCATION_STUDENTS** - Student/parent data extension
- **EDUCATION_COUNSELLORS** - Counselor management with scheduling

### AI ICP Assistant (4 tables) ⭐ **NEW**
- **AI_CONVERSATIONS** - Conversation sessions with extracted ICP data
- **AI_MESSAGES** - Individual messages with role (user/assistant) and token counts
- **AI_ICP_PROFILES** - Saved ICP configurations for reuse
- **AI_KEYWORD_EXPANSIONS** - Cached keyword expansions to reduce AI API calls

**Key Features:**
- Conversation memory and ICP data extraction
- Search parameter building from conversational input
- Profile reuse and usage tracking
- Token-based billing integration

### Voice Agent System (8 tables)
- **VOICE_AGENTS** - Agent configurations (instructions, voice, language)
- **VOICE_AGENT_NUMBERS** - Phone numbers provisioned (country_code + base_number)
- **VOICE_AGENT_VOICES** - Voice provider catalog (ElevenLabs, Google, OpenAI, Cartesia)
- **VOICE_USER_PROFILES** - User preferences and defaults
- **VOICE_PERMISSIONS** - Granular access control (user can use specific numbers/voices)
- **VOICE_CALL_BATCHES** - Batch operation tracking
- **VOICE_CALL_BATCH_ENTRIES** - Individual leads in batch
- **VOICE_CALL_LOGS** - Call history with recording, transcription, cost breakdown
- **VOICE_CALL_ANALYSIS** - AI-powered call analysis (sentiment, lead category, extraction)

**Call Status Values:** pending, ringing, ongoing, ended, declined, cancelled, failed
**Call Directions:** inbound, outbound

## Key Design Patterns

### 1. Multi-Tenancy
- All tables include `tenant_id` FK to TENANTS
- Data isolation at query level
- Tenant-scoped indexes for performance

### 2. Soft Deletes
- `deleted_at TIMESTAMPTZ NULL` column on tables with deletion semantics
- Queries filter `WHERE deleted_at IS NULL`
- Audit trail preservation

### 3. Audit Trails
- `created_at`, `updated_at` on all tables
- `created_by_user_id` where action attribution needed
- Triggers auto-update `updated_at` on writes

### 4. Immutable Ledger Pattern
- BILLING_LEDGER_TRANSACTIONS is append-only
- Balance snapshots for audit
- Idempotency keys prevent duplicates

### 5. Role-Based Access Control (RBAC)
```
MEMBERSHIPS → USER role (owner/admin/member/viewer)
USER_CAPABILITIES → granular permission (apollo.search, voice.call, etc.)
TENANT_FEATURES → feature enablement per tenant
```

### 6. Billing Multi-Component Model
```
BILLING_USAGE_EVENTS.usage_items = [
  {category, provider, model, unit, quantity, unit_price, cost},
  {category, provider, model, unit, quantity, unit_price, cost}
]
```
Supports charging for: STT, LLM, TTS, Telephony, Enrichment, VM Infrastructure

## Foreign Key Relationships

### One-to-Many (1:N)
- TENANTS → USERS (primary_tenant_id)
- TENANTS → MEMBERSHIPS
- TENANTS → LEADS
- TENANTS → CAMPAIGNS
- CAMPAIGNS → CAMPAIGN_STEPS
- CAMPAIGNS → CAMPAIGN_LEADS
- LEADS → LEAD_BOOKINGS
- VOICE_AGENTS → VOICE_CALL_BATCHES
- AI_CONVERSATIONS → AI_MESSAGES

### Many-to-Many (via junction tables)
- USERS ↔ TENANTS via MEMBERSHIPS
- CAMPAIGNS ↔ LEADS via CAMPAIGN_LEADS
- VOICE_AGENTS ↔ VOICE_AGENT_VOICES (FK in VOICE_AGENTS.voice_id)
- USERS ↔ VOICE_PERMISSIONS ↔ VOICE_AGENT_NUMBERS, VOICE_AGENT_VOICES

### Self-Referential
- LEAD_BOOKINGS.parent_booking_id → LEAD_BOOKINGS (for retry chains)

### Unique Constraints (Alternate Keys)
- TENANTS(name) with soft delete filter
- USERS(email) with soft delete filter
- USER_IDENTITIES(provider, provider_user_id)
- MEMBERSHIPS(user_id, tenant_id) - one membership per user/tenant combo
- MEMBERSHIPS(tenant_id) WHERE role='owner' - one owner per tenant
- BILLING_LEDGER_TRANSACTIONS(tenant_id, idempotency_key)
- BILLING_USAGE_EVENTS(tenant_id, idempotency_key)
- BILLING_INVOICES(tenant_id, invoice_number)
- BILLING_FEATURE_ENTITLEMENTS(tenant_id, feature_key)
- TENANT_INVITATIONS(tenant_id, email) WHERE accepted_at IS NULL - one pending invite per email
- AI_KEYWORD_EXPANSIONS(original_keyword, context, organization_id)

## Column Conventions

- **PK** = Primary Key (UUID with gen_random_uuid())
- **FK** = Foreign Key (references parent table, usually with ON DELETE CASCADE)
- **UK** = Unique Key (enforces uniqueness, usually with soft-delete filters)
- **timestamptz** = Timezone-aware timestamp (UTC)
- **timestamp** = Naive timestamp (needs conversion consideration)
- **jsonb** = JSON with B-tree indexing for fast queries
- **numeric(18,6)** = Decimal for financial amounts (18 total digits, 6 decimals)
- **bigint** = Large sequential ID (used in VOICE_AGENTS for legacy compatibility)

## Indexing Strategy

**Performance Indexes (by table):**
- Tenants: status, plan_tier, created_at DESC
- Users: email, primary_tenant_id, is_active, created_at DESC
- Memberships: user_id, tenant_id, role
- Leads: tenant_id, stage, status, created_at DESC, assigned_user_id
- Campaigns: tenant_id, status, created_at DESC
- Campaign Leads: campaign_id, status, created_at DESC
- Voice Calls: tenant_id, created_at DESC, agent_id, status, direction
- Billing Usage: tenant_id, created_at DESC, feature_key, status, user_id
- Billing Ledger: tenant_id, wallet_id, created_at DESC, reference_id
- AI Conversations: user_id, organization_id, status, created_at DESC
- AI Messages: conversation_id, created_at
- AI Profiles: user_id, organization_id, is_active, usage_count DESC

## Removed / Deprecated

The following tables are marked for deletion (backup copies kept):
- voice_agents_backup_marked_for_deletion
- voice_call_logs_backup_marked_for_deletion
- voice_provider_voices_marked_for_deletion
- linkedin_accounts_legacy

## Enums (Type Definitions)

```sql
CREATE TYPE tenant_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE plan_tier AS ENUM ('free', 'starter', 'professional', 'enterprise');
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial', 'cancelled');
CREATE TYPE campaign_status AS ENUM ('draft', 'running', 'paused', 'completed', 'stopped', 'archived');
CREATE TYPE campaign_channel AS ENUM ('linkedin', 'email', 'voice', 'whatsapp', 'sms', 'web');
-- ... more in full schema
```

## Next Steps for Developers

1. **Querying:** Always filter by `tenant_id` for data isolation
2. **Soft Deletes:** Include `WHERE deleted_at IS NULL` in queries
3. **Billing:** Use BILLING_LEDGER_TRANSACTIONS as source of truth
4. **Concurrency:** Idempotency keys prevent duplicate charges on retries
5. **Audit:** Check created_at, updated_at, created_by_user_id for change tracking
6. **Voice:** Call status and direction fields critical for reporting
7. **AI ICP:** Token usage in AI_MESSAGES enables accurate billing

---

**Complete Mermaid diagram:** See [LAD_ER_MODEL_UPDATED.md](LAD_ER_MODEL_UPDATED.md)
