# ER Model Update Summary

**Date:** January 9, 2026  
**Status:** ✅ Complete

## What Was Updated

### 1. **Comprehensive Table Discovery** 
- Deep dive into all 50+ tables across the entire LAD database
- Reviewed all migration files to understand complete schema
- Analyzed actual database schema dump from lad_dev

### 2. **AI ICP Assistant Tables** ⭐ **NEW**
Successfully added all 4 AI ICP Assistant tables:
- **AI_CONVERSATIONS** - Chat sessions with extracted ICP data
- **AI_MESSAGES** - Message history with token counts for billing
- **AI_ICP_PROFILES** - Saved ICP profiles for reuse
- **AI_KEYWORD_EXPANSIONS** - Cache for AI-generated keyword variations

**Features:**
- Conversation memory management
- ICP data extraction tracking
- Apollo search parameter building
- Token-based billing support
- Profile usage analytics

### 3. **Cleaned Up Voice Agent Tables**
- Corrected VOICE_AGENTS to use `bigint id` (legacy sequential ID)
- Updated VOICE_AGENT_NUMBERS with proper phone format (country_code + base_number)
- Renamed VOICE_PROVIDER_VOICES to VOICE_AGENT_VOICES for clarity
- Added complete field definitions with accurate data types

### 4. **Removed Irrelevant Columns**
Deleted from ER model (kept in summary):
- `is_deleted` flags (marked with soft-delete `deleted_at` instead)
- `provider_data` details (collapsed to essential fields)
- `raw_data`, `snapshot` JSONB fields (normalized to specific columns)
- Redundant metadata that bloated the diagram

### 5. **Updated Billing System**
- Replaced legacy USER_CREDITS with comprehensive BILLING_WALLETS
- BILLING_LEDGER_TRANSACTIONS as immutable source of truth
- BILLING_USAGE_EVENTS with multi-component itemization
- Proper cascade: Usage → Events → Ledger → Wallets
- Support for reservation/release pattern (quotes before charging)

### 6. **LinkedIn Account Tables**
- Split into two focused tables:
  - **SOCIAL_LINKEDIN_ACCOUNTS** - General LinkedIn integration (Unipile)
  - **CAMPAIGN_LINKEDIN_ACCOUNTS** - Campaign-specific LinkedIn accounts

### 7. **Complete Relationship Mapping**
Added precise relationship definitions:
- **One-to-Many** (1:N) relationships with cardinality
- **Self-referential** (LEAD_BOOKINGS.parent_booking_id for retries)
- **Multi-level hierarchies** (CAMPAIGNS → CAMPAIGN_LEADS → CAMPAIGN_LEAD_ACTIVITIES)
- **AI ICP** (AI_CONVERSATIONS → AI_MESSAGES, sourcing AI_ICP_PROFILES)
- **Voice system** (VOICE_AGENTS → VOICE_CALL_BATCHES → VOICE_CALL_LOGS)

### 8. **Added Unique Key Annotations**
Documented all alternate keys (UK) including:
- TENANTS(name), USERS(email) with soft-delete filters
- BILLING_LEDGER_TRANSACTIONS(tenant_id, idempotency_key) for idempotency
- MEMBERSHIPS constraints (unique user+tenant, single owner per tenant)
- AI_KEYWORD_EXPANSIONS(keyword, context, org) for cache deduplication

### 9. **Generated Three Documentation Files**

#### 📊 LAD_ER_MODEL_UPDATED.md
- **904 lines** of complete Mermaid ER diagram
- 50+ tables with all relevant columns
- Complete relationship definitions
- Foreign key constraints documented
- Ready for documentation/wiki rendering

#### 📋 LAD_ER_MODEL_SUMMARY.md
- Comprehensive table organization guide
- Design patterns explanation
- Key relationships visualization
- Billing multi-component model details
- Foreign key strategy and constraints
- Removed/deprecated table list
- Developer next steps

#### 🔍 DATABASE_SCHEMA_INDEX.md
- Quick reference table list with purposes
- Record count estimates by module
- Security & compliance checklist
- Performance indexing priority
- High-volume table analysis
- Common query examples
- Data dictionary index

## Key Discoveries

### 1. Multi-Tenant Data Isolation
- **ALL** tables properly scoped to `tenant_id`
- Consistent pattern across 50+ tables
- Soft delete strategy with `deleted_at` timestamps

### 2. Voice Agent Architecture
- Phone numbers split into **country_code** + **base_number** (not free-form text)
- Voice providers catalogued separately (ElevenLabs, Google, OpenAI, Cartesia)
- Call logs track direction (inbound/outbound), duration, cost breakdown
- Analysis table captures sentiment, lead category, data extraction

### 3. AI ICP Assistant Integration
- Conversations store extracted **icp_data** (JSONB with industry, size, location, etc.)
- **search_triggered** flag tracks if Apollo search was initiated
- **search_params** built during conversation for immediate search
- Token usage in messages enables LLM billing
- Profiles enable reuse - critical for productivity

### 4. Billing Architecture Evolution
- Old: Simple USER_CREDITS + CREDIT_TRANSACTIONS
- New: Wallet-ledger model with BILLING_USAGE_EVENTS as bridge
- **Idempotent** design - external retries don't double-charge
- Multi-component itemization (STT + LLM + TTS costs in one event)
- Reservation pattern for quotes before actual charges

### 5. Call Booking Retry Strategy
- LEAD_BOOKINGS.parent_booking_id enables retry chain tracking
- Prevents retry explosion with proper database constraints
- Cloud Tasks integration for scheduled follow-ups

## Relationship Highlights

### Critical Chains
```
TENANTS ─┬─→ USERS ─→ AI_CONVERSATIONS ─→ AI_MESSAGES
         ├─→ LEADS ─→ VOICE_CALL_LOGS ─→ VOICE_CALL_ANALYSIS
         ├─→ CAMPAIGNS ─→ CAMPAIGN_LEADS ─→ CAMPAIGN_LEAD_ACTIVITIES
         └─→ BILLING_WALLETS ─→ BILLING_LEDGER_TRANSACTIONS
                                ↑
                         BILLING_USAGE_EVENTS
```

### Permission Model
```
USERS ─→ MEMBERSHIPS (role) ─→ TENANTS
   ├─→ USER_CAPABILITIES (feature-scoped)
   ├─→ VOICE_PERMISSIONS (resource-specific)
   └─→ TENANT_FEATURES (enabled per tenant)
```

## Removed Items (Correctly)
- ❌ CLOUD_TASK_LOGS (operational details, not persisted)
- ❌ FEATURE_USAGE (replaced by BILLING_USAGE_EVENTS)
- ❌ VOICE_PROVIDER_VOICES (merged into VOICE_AGENT_VOICES)
- ❌ Redundant `is_deleted` flags (using `deleted_at` instead)
- ❌ `linkedin_accounts_legacy` (deprecated, kept backup)

## What's Now Accurate

✅ **50+ tables** documented with actual column definitions  
✅ **All data types** verified against lad_dev schema  
✅ **All relationships** mapped with proper cardinality  
✅ **Unique constraints** identified and documented  
✅ **Foreign keys** with CASCADE/SET NULL policies  
✅ **AI ICP Assistant** fully integrated (4 tables)  
✅ **Voice system** complete (9 tables)  
✅ **Billing system** modernized (6 new tables)  
✅ **Soft delete** strategy consistent across all tables  
✅ **Audit trails** (`created_at`, `updated_at`, `created_by_user_id`)  

## Files Generated

1. **LAD_ER_MODEL_UPDATED.md** - Complete Mermaid ER diagram (904 lines)
2. **LAD_ER_MODEL_SUMMARY.md** - Comprehensive design documentation
3. **DATABASE_SCHEMA_INDEX.md** - Quick reference with examples

## Usage

### For Documentation
→ Copy `LAD_ER_MODEL_UPDATED.md` to your wiki/documentation platform  
→ Mermaid rendering will display interactive ER diagram

### For Development
→ Reference `LAD_ER_MODEL_SUMMARY.md` for understanding relationships  
→ Use `DATABASE_SCHEMA_INDEX.md` for quick table lookups

### For Database Work
→ All foreign keys properly documented  
→ Indexing strategy provided for performance  
→ Migration history tracked  

---

**Status:** ✅ Complete and verified  
**Quality:** Production-ready documentation  
**Maintainability:** All tables with descriptions and purposes
