# LAD Database Schema - Quick Reference Index

## 📊 Complete Table List (50 Tables)

### Core Infrastructure (9)
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| TENANTS | Organizations | id, name, slug, status, plan_tier |
| USERS | Global users | id, email, password_hash, primary_tenant_id |
| USER_IDENTITIES | External auth | user_id, provider, provider_user_id |
| MEMBERSHIPS | User-tenant roles | user_id, tenant_id, role |
| TENANT_FEATURES | Feature flags | tenant_id, feature_key, enabled |
| USER_CAPABILITIES | Permissions | user_id, capability_key, feature_key |
| TENANT_INVITATIONS | Team invites | tenant_id, email, invitation_token |
| DOMAIN_EVENTS | Event sourcing | tenant_id, event_type, payload |
| FEATURE_FLAGS | Dynamic toggles | feature_key, tenant_id, user_id |

### Leads & Pipeline (7)
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| LEADS | Contact database | tenant_id, first_name, email, stage, status |
| LEAD_STAGES | Pipeline stages | tenant_id, key, label, display_order |
| LEAD_STATUSES | Status definitions | tenant_id, key, label |
| LEAD_NOTES | Comments | lead_id, created_by_user_id, content |
| LEAD_ATTACHMENTS | Files | lead_id, file_url, file_name |
| LEAD_BOOKINGS | Call scheduling | lead_id, scheduled_at, status, retry_count |
| LEAD_SOCIAL | Social data | lead_id, data (JSONB) |

### Campaigns (4)
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| CAMPAIGNS | Campaign definitions | tenant_id, name, status |
| CAMPAIGN_STEPS | Workflow steps | campaign_id, type, order, config |
| CAMPAIGN_LEADS | Campaign enrollment | campaign_id, lead_id, status |
| CAMPAIGN_LEAD_ACTIVITIES | Action history | campaign_lead_id, step_id, status |

### Communication (4)
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| COMMUNICATION_TEMPLATES | Message templates | tenant_id, channel, template_key |
| EMAIL_ACCOUNTS | SMTP config | tenant_id, email, smtp_host |
| SOCIAL_LINKEDIN_ACCOUNTS | LinkedIn integration | tenant_id, unipile_account_id |
| CAMPAIGN_LINKEDIN_ACCOUNTS | Campaign LinkedIn | campaign_id, linkedin_account_id |

### Enrichment (2)
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| COMPANY_SEARCH_CACHE | Apollo companies | tenant_id, apollo_organization_id |
| EMPLOYEES_CACHE | Apollo contacts | tenant_id, apollo_person_id |

### Education Vertical (2)
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| EDUCATION_STUDENTS | Student data | lead_id, student_parent_name |
| EDUCATION_COUNSELLORS | Counselor mgmt | user_id, counselor_code |

### Credits (2 Legacy)
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| USER_CREDITS | User balance | user_id, tenant_id, balance |
| CREDIT_TRANSACTIONS | Audit trail | user_id, amount, transaction_type |

### Billing (6 New) ⭐
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| BILLING_WALLETS | Credit wallets | tenant_id, user_id, current_balance |
| BILLING_LEDGER_TRANSACTIONS | Immutable ledger | wallet_id, amount, transaction_type |
| BILLING_USAGE_EVENTS | Feature usage | tenant_id, feature_key, usage_items |
| BILLING_PRICING_CATALOG | Price rules | category, provider, model, unit_price |
| BILLING_INVOICES | Invoice mgmt | tenant_id, invoice_number, total |
| BILLING_FEATURE_ENTITLEMENTS | Plan quotas | tenant_id, feature_key, monthly_quota |

### AI ICP Assistant (4) ⭐ **NEW**
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| AI_CONVERSATIONS | Chat sessions | user_id, organization_id, icp_data |
| AI_MESSAGES | Messages | conversation_id, role, content, tokens_used |
| AI_ICP_PROFILES | Saved profiles | user_id, icp_data, search_params |
| AI_KEYWORD_EXPANSIONS | Keyword cache | original_keyword, expanded_keywords |

### Voice Agent System (8)
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| VOICE_AGENTS | Agent config | tenant_id, name, voice_id, language |
| VOICE_AGENT_NUMBERS | Phone numbers | tenant_id, country_code, base_number |
| VOICE_AGENT_VOICES | Voice catalog | tenant_id, provider, provider_voice_id |
| VOICE_USER_PROFILES | User defaults | user_id, default_agent_id |
| VOICE_PERMISSIONS | Access control | user_id, number_id, voice_id |
| VOICE_CALL_BATCHES | Batch ops | tenant_id, agent_id, total_calls |
| VOICE_CALL_BATCH_ENTRIES | Batch items | batch_id, lead_id, status |
| VOICE_CALL_LOGS | Call history | tenant_id, agent_id, duration_seconds, cost |
| VOICE_CALL_ANALYSIS | Call analysis | call_log_id, sentiment, lead_category |

---

## 🔗 Key Relationships

### Ownership Chains
```
TENANTS → owns → LEADS → recorded in → VOICE_CALL_LOGS
TENANTS → owns → CAMPAIGNS → targets → CAMPAIGN_LEADS
TENANTS → hosts → AI_CONVERSATIONS → sources → AI_ICP_PROFILES
```

### Access Control Chain
```
USERS → belongs to → TENANTS via MEMBERSHIPS (role)
        → granted → USER_CAPABILITIES (feature-scoped)
        → granted → VOICE_PERMISSIONS (resource-scoped)
```

### Billing Chain
```
VOICE_CALL_LOGS (usage) → triggers → BILLING_USAGE_EVENTS
BILLING_USAGE_EVENTS → charged via → BILLING_LEDGER_TRANSACTIONS
BILLING_LEDGER_TRANSACTIONS → posted to → BILLING_WALLETS
```

---

## 📈 Record Counts by Module (Estimated)

| Module | Table Count | Typical Records |
|--------|------------|-----------------|
| Core | 9 | Tens (users/tenants) |
| Leads | 7 | Thousands (leads scale with usage) |
| Campaigns | 4 | Hundreds (campaigns) |
| Communication | 4 | Dozens (templates/accounts) |
| Enrichment | 2 | Millions (cached data) |
| Education | 2 | Hundreds (if enabled) |
| Credits | 2 | Per-user records |
| Billing | 6 | Hundreds-thousands (events/transactions) |
| **AI ICP** | **4** | **Hundreds-thousands (conversations)** |
| Voice | 9 | Millions (calls, logs, analysis) |

---

## 🔐 Security & Compliance

### Multi-Tenancy
✅ All tables scoped to `tenant_id`  
✅ Row-level security via queries (application layer)  
✅ Tenant isolation enforced at query level  

### Audit Trail
✅ All tables have `created_at`, `updated_at`  
✅ Soft deletes (`deleted_at`) preserve history  
✅ `created_by_user_id` tracks who made changes  
✅ DOMAIN_EVENTS table for event sourcing  

### Data Integrity
✅ Foreign key cascades on deletes  
✅ Unique constraints prevent duplicates  
✅ Idempotency keys in billing prevent double-charges  
✅ CHECK constraints on balances and amounts  

### Encryption
⚠️ Passwords hashed with bcrypt  
⚠️ Tokens stored plain (encrypt in production)  
⚠️ SMTP passwords stored plain (use secrets manager)  

---

## 📊 Indexing Priority

### Critical Indexes (must have)
- LEADS(tenant_id, created_at DESC)
- VOICE_CALL_LOGS(tenant_id, created_at DESC)
- CAMPAIGNS(tenant_id, status)
- BILLING_LEDGER_TRANSACTIONS(tenant_id, created_at DESC)
- AI_CONVERSATIONS(user_id, organization_id, created_at DESC)

### Performance Indexes (recommended)
- CAMPAIGN_LEADS(campaign_id, status)
- VOICE_CALL_LOGS(agent_id, status, started_at)
- BILLING_USAGE_EVENTS(feature_key, status, created_at)
- LEAD_BOOKINGS(lead_id, status, scheduled_at)

### Selective Indexes (low cardinality)
- USERS(is_active) WHERE is_active = true
- TENANTS(status) WHERE status = 'active'
- CAMPAIGNS(status) WHERE is_deleted = false

---

## 🚀 Performance Considerations

### High-Volume Tables
| Table | Est. Rows | Insert Rate | Query Pattern |
|-------|-----------|------------|---------------|
| VOICE_CALL_LOGS | 10M+ | 100s/min | By tenant, date range, agent |
| BILLING_LEDGER | 1M+ | 10s/min | By tenant, wallet, date |
| AI_MESSAGES | 100K-1M | 1s/min | By conversation, user |
| CAMPAIGN_LEAD_ACTIVITIES | 1M+ | Variable | By campaign, lead, date |

### Query Optimization Tips
1. Always include `tenant_id` in WHERE clause
2. Use `created_at DESC` for recent data
3. Partition voice_call_logs by month for archiving
4. Denormalize common aggregations (cost totals, call counts)
5. Archive old billing transactions after invoicing

---

## 🔄 Migration Tracking

### Applied Migrations
- 001_lad_dev_schema.sql - Core infrastructure
- 006_create_campaigns_tables.sql - Campaign system
- 007_create_ai_icp_assistant_tables.sql - AI ICP Assistant
- 20251227_001_create_billing_tables.sql - New billing system
- Various feature migrations (voice, education, etc.)

### Pending
- Partition strategy for voice_call_logs
- Materialized views for analytics
- Archive tables for historical data

---

## 📝 Data Dictionary References

**Complete documentation:** See [LAD_ER_MODEL_SUMMARY.md](LAD_ER_MODEL_SUMMARY.md)  
**Visual ER diagram:** See [LAD_ER_MODEL_UPDATED.md](LAD_ER_MODEL_UPDATED.md)  

---

## ❓ Common Queries

### Find all calls for a tenant
```sql
SELECT * FROM voice_call_logs 
WHERE tenant_id = :tenant_id 
ORDER BY created_at DESC
```

### Calculate call costs by feature
```sql
SELECT feature_key, SUM(total_cost) 
FROM billing_usage_events 
WHERE tenant_id = :tenant_id 
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY feature_key
```

### Get conversation with all messages
```sql
SELECT c.*, json_agg(m.*) as messages
FROM ai_conversations c
LEFT JOIN ai_messages m ON c.id = m.conversation_id
WHERE c.id = :conversation_id
GROUP BY c.id
```

### Track user permissions for feature
```sql
SELECT uc.capability_key, tf.enabled
FROM user_capabilities uc
LEFT JOIN tenant_features tf ON uc.feature_key = tf.feature_key
WHERE uc.user_id = :user_id 
  AND uc.tenant_id = :tenant_id
```

---

**Generated:** January 9, 2026  
**Schema Version:** 1.0
