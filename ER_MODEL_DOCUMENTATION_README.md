# LAD Database ER Model - Complete Documentation Suite

**Last Updated:** January 9, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready

## 📚 Documentation Files

### 1. **LAD_ER_MODEL_UPDATED.md** (21 KB)
**The Primary Artifact** - Complete Mermaid ER Diagram

```
├─ Mermaid syntax ready for rendering
├─ 50+ tables with all relevant columns
├─ 70+ relationships with cardinality  
├─ Foreign key constraints documented
├─ Unique key constraints (UK) marked
├─ Multi-tenant isolation strategy
└─ Soft delete patterns throughout
```

**Use Cases:**
- Paste into Mermaid Live Editor (https://mermaid.live)
- Include in Notion/Confluence documentation
- Generate diagrams in CI/CD pipelines
- Share with stakeholders for architecture review

**Key Sections:**
- Core infrastructure (tenants, users, auth)
- Leads and pipeline management
- Campaigns and multichannel orchestration
- **AI ICP Assistant** (4 new tables)
- **Voice Agent System** (9 tables)
- **Modern Billing** (6 new tables)
- All relationships with clear cardinality

---

### 2. **LAD_ER_MODEL_SUMMARY.md** (9.3 KB)
**Developer's Bible** - Comprehensive Schema Guide

```
├─ 50+ table organization by module
├─ Table purposes and key fields
├─ Design patterns explanation
├─ Key relationships and cardinality
├─ Foreign key strategy details
├─ Unique constraints and alternate keys
├─ Index strategy recommendations
└─ Removed/deprecated tables list
```

**Best For:**
- Understanding the "why" behind each table
- Learning design patterns used
- Implementing queries correctly
- Database maintenance and optimization
- Onboarding new developers

**Contains:**
- Complete table index organized by feature
- Design pattern explanations (multi-tenancy, soft deletes, RBAC, billing)
- Foreign key relationship details
- Unique constraint documentation
- Column type conventions
- Indexing strategy

---

### 3. **DATABASE_SCHEMA_INDEX.md** (9.4 KB)
**Quick Reference** - Fast Lookup and Examples

```
├─ Quick table list with purposes
├─ Record count estimates
├─ Security compliance checklist
├─ Performance considerations
├─ Migration tracking
├─ High-volume table analysis
└─ Common SQL query examples
```

**Perfect For:**
- Quick lookups during development
- Performance optimization decisions
- Architecture planning
- New developer onboarding
- Query examples and patterns

**Includes:**
- All 50+ tables in summary grid
- Key fields for each table
- Billing chain visualization
- Access control chain
- Critical indexes list
- Common query patterns

---

### 4. **ER_MODEL_UPDATE_NOTES.md** (7.4 KB)
**Change Log** - What Was Updated and Why

```
├─ Comprehensive table discovery process
├─ AI ICP Assistant tables (NEW)
├─ Voice Agent corrections
├─ Column cleanup and relevance
├─ Relationship mapping completion
├─ Unique key documentation
└─ Key discoveries and insights
```

**For:**
- Understanding what changed
- Reviewing update quality
- Documenting architecture evolution
- Migration planning

---

## 🎯 Getting Started

### Step 1: View the ER Diagram
1. Open **LAD_ER_MODEL_UPDATED.md**
2. Copy the Mermaid code (starts with `---\nconfig:\n  layout: elk`)
3. Paste into https://mermaid.live
4. Interactive diagram renders immediately

### Step 2: Understand the Schema
1. Read **LAD_ER_MODEL_SUMMARY.md** sections in order:
   - Table Organization (understand modules)
   - Design Patterns (learn architecture)
   - Key Relationships (understand data flow)
   - Column Conventions (know data types)

### Step 3: Quick Lookups
1. Use **DATABASE_SCHEMA_INDEX.md** when you need:
   - Table purposes quickly
   - Field names for specific tables
   - Query examples
   - Performance considerations

### Step 4: Details & Context
1. Check **ER_MODEL_UPDATE_NOTES.md** for:
   - What changed and why
   - Key discoveries
   - Quality assurance notes

---

## 📊 Schema Snapshot

### Tables by Category
| Category | Count | Key Tables |
|----------|-------|-----------|
| Core Infrastructure | 9 | TENANTS, USERS, MEMBERSHIPS, TENANT_FEATURES |
| Leads & Pipeline | 7 | LEADS, LEAD_STAGES, LEAD_BOOKINGS |
| Campaigns | 4 | CAMPAIGNS, CAMPAIGN_STEPS, CAMPAIGN_LEADS |
| Communication | 4 | EMAIL_ACCOUNTS, SOCIAL_LINKEDIN_ACCOUNTS |
| Enrichment | 2 | COMPANY_SEARCH_CACHE, EMPLOYEES_CACHE |
| Education | 2 | EDUCATION_STUDENTS, EDUCATION_COUNSELLORS |
| Credits (Legacy) | 2 | USER_CREDITS, CREDIT_TRANSACTIONS |
| **Billing (New)** | **6** | **BILLING_WALLETS, BILLING_LEDGER_TRANSACTIONS, BILLING_USAGE_EVENTS** |
| **AI ICP (New)** | **4** | **AI_CONVERSATIONS, AI_MESSAGES, AI_ICP_PROFILES, AI_KEYWORD_EXPANSIONS** |
| **Voice** | **9** | **VOICE_AGENTS, VOICE_CALL_LOGS, VOICE_CALL_ANALYSIS** |

**Total: 50+ Tables**

---

## 🔑 Important Concepts

### Multi-Tenancy Strategy
✅ **ALL** tables include `tenant_id`  
✅ Enforced at query level (application layer)  
✅ Soft deletion via `deleted_at` timestamp  
✅ Unique constraints preserve history  

### Billing Architecture
```
Feature Usage → Billing Usage Events → Billing Ledger → Billing Wallets
     (raw)      (aggregated, pending)  (immutable)     (cached balance)
```
- **Idempotent:** External retries don't double-charge
- **Multi-component:** Single charge can include STT, LLM, TTS costs
- **Ledger-based:** Single source of truth in transactions

### AI ICP Assistant Flow
```
User Conversation → AI Messages (token tracking) → Extracted ICP Data
         ↓                                              ↓
    Save as Profile ← ← ← ← ← ← ← ← ← ← ← ← ← Build Search Params
         ↓
    Trigger Apollo Search (separate feature)
```

### Voice System Architecture
```
Voice Agent → Phone Number (country + base)
    ↓              ↓
Voice Config → Call Batches → Call Logs → Call Analysis
                    ↓              ↓
              Batch Entries    Recording, Transcription, Sentiment
```

---

## 🔒 Security & Compliance

### ✅ Implemented
- Multi-tenant data isolation
- Role-based access control (TENANTS, USERS, MEMBERSHIPS)
- Granular permissions (USER_CAPABILITIES)
- Soft delete audit trail
- Complete change tracking (created_at, updated_at, created_by_user_id)
- Foreign key integrity
- Idempotency for critical operations

### ⚠️ Requires Production Hardening
- Encrypt sensitive fields (tokens, passwords, SMTP credentials)
- Use secrets manager for production credentials
- Implement column-level encryption for PII
- Row-level security in database (PostgreSQL RLS)
- Query logging and monitoring

---

## 🚀 Performance Notes

### Critical Indexes (Must Have)
```sql
CREATE INDEX idx_leads_tenant_created ON leads(tenant_id, created_at DESC);
CREATE INDEX idx_voice_calls_tenant_created ON voice_call_logs(tenant_id, created_at DESC);
CREATE INDEX idx_campaigns_tenant_status ON campaigns(tenant_id, status);
CREATE INDEX idx_billing_ledger_tenant ON billing_ledger_transactions(tenant_id, created_at DESC);
```

### High-Volume Tables
| Table | Est. Rows | Insert Rate | Needs Partitioning |
|-------|-----------|------------|-------------------|
| VOICE_CALL_LOGS | 10M+ | 100s/min | ✅ Yes (by month) |
| BILLING_LEDGER | 1M+ | 10s/min | ⚠️ Consider |
| AI_MESSAGES | 100K-1M | 1s/min | ❌ No |
| CAMPAIGN_LEAD_ACTIVITIES | 1M+ | Variable | ⚠️ Consider |

---

## 📝 Common Tasks

### Find all tables for a feature
See **DATABASE_SCHEMA_INDEX.md** "Table List" section

### Understand a relationship
See **LAD_ER_MODEL_SUMMARY.md** "Key Relationships" section

### Write efficient query
See **DATABASE_SCHEMA_INDEX.md** "Common Queries" section

### Check permissions model
See **LAD_ER_MODEL_SUMMARY.md** "RBAC" subsection

### Understand billing flow
See **LAD_ER_MODEL_SUMMARY.md** "Billing Multi-Component Model"

---

## 🔄 Maintenance

### Regular Tasks
- Review soft-deleted records (archived_at, deleted_at)
- Monitor high-volume tables (VOICE_CALL_LOGS, BILLING_LEDGER)
- Update indexes based on query patterns
- Archive old billing transactions after invoicing

### Migration Strategy
- All new migrations should include `tenant_id` 
- Use `IF NOT EXISTS` for idempotency
- Test soft delete behavior before production
- Document foreign key strategy

---

## 📚 Reading Order (Recommended)

**For Architects:**
1. **LAD_ER_MODEL_UPDATED.md** - See complete diagram
2. **LAD_ER_MODEL_SUMMARY.md** - Understand design patterns
3. **ER_MODEL_UPDATE_NOTES.md** - Learn key discoveries

**For Developers:**
1. **DATABASE_SCHEMA_INDEX.md** - Quick reference
2. **LAD_ER_MODEL_SUMMARY.md** - Deep dive specific features
3. **LAD_ER_MODEL_UPDATED.md** - View relationships

**For DevOps/DBA:**
1. **LAD_ER_MODEL_SUMMARY.md** - Index strategy
2. **DATABASE_SCHEMA_INDEX.md** - Performance notes
3. **LAD_ER_MODEL_UPDATED.md** - All tables and constraints

---

## 🎓 Key Features Highlighted

### ✨ New in This Update
- ✅ **AI ICP Assistant** - 4 tables for conversational ICP definition
- ✅ **Modern Billing System** - 6 tables for usage-based billing
- ✅ **Complete Voice System** - 9 tables for voice agent management
- ✅ **Relationship Mapping** - 70+ relationships documented
- ✅ **Unique Key Documentation** - All alternate keys identified

### 🎯 Aligned With Architecture
- ✅ LAD-compliant feature-based structure
- ✅ Multi-tenant first design
- ✅ Soft-delete strategy throughout
- ✅ Event sourcing ready (DOMAIN_EVENTS)
- ✅ RBAC and capability-based access control

---

## 📞 Questions?

### Not sure which file to use?
- **Quick lookup:** DATABASE_SCHEMA_INDEX.md
- **Full understanding:** LAD_ER_MODEL_SUMMARY.md  
- **Visual reference:** LAD_ER_MODEL_UPDATED.md
- **Learning history:** ER_MODEL_UPDATE_NOTES.md

### Need a specific query pattern?
→ See **DATABASE_SCHEMA_INDEX.md** "Common Queries" section

### Want to understand relationships?
→ See **LAD_ER_MODEL_SUMMARY.md** "Key Relationships" section

### Checking for a table?
→ Search in **LAD_ER_MODEL_UPDATED.md** for table name

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-09 | 1.0 | Initial comprehensive ER model with AI ICP, modern billing, complete voice system |

---

**Status:** ✅ Production Ready  
**Quality:** Comprehensive, verified against lad_dev schema  
**Maintainability:** Well-organized with multiple reference documents
