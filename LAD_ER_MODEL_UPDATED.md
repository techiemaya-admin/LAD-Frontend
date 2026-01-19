---
config:
  layout: elk
---
erDiagram
  %% =========================
  %% CORE (Multi-tenant SaaS)
  %% =========================
  TENANTS {
    uuid id PK
    varchar name UK
    varchar slug UK
    varchar status
    varchar plan_tier
    varchar email
    varchar phone
    varchar website
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
  }

  USERS {
    uuid id PK
    varchar email UK
    varchar password_hash
    varchar first_name
    varchar last_name
    varchar phone
    text avatar_url
    uuid primary_tenant_id FK
    boolean is_active
    boolean email_verified
    boolean phone_verified
    timestamptz last_login_at
    timestamptz password_changed_at
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
  }

  USER_IDENTITIES {
    uuid id PK
    uuid user_id FK
    varchar provider
    varchar provider_user_id UK
    text access_token
    text refresh_token
    timestamptz token_expires_at
    jsonb provider_data
    timestamptz created_at
    timestamptz updated_at
  }

  MEMBERSHIPS {
    uuid id PK
    uuid user_id FK
    uuid tenant_id FK
    varchar role
    uuid invited_by FK
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
  }

  TENANT_FEATURES {
    uuid id PK
    uuid tenant_id FK
    varchar feature_key
    boolean enabled
    jsonb config
    timestamptz created_at
    timestamptz updated_at
  }

  USER_CAPABILITIES {
    uuid id PK
    uuid user_id FK
    uuid tenant_id FK
    varchar capability_key
    varchar feature_key
    boolean enabled
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  TENANT_INVITATIONS {
    uuid id PK
    uuid tenant_id FK
    varchar email
    varchar role
    uuid invited_by FK
    varchar invitation_token UK
    timestamptz accepted_at
    uuid accepted_by FK
    timestamptz expires_at
    text message
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
  }

  DOMAIN_EVENTS {
    uuid id PK
    uuid tenant_id FK
    varchar event_type
    varchar aggregate_type
    uuid aggregate_id
    jsonb payload
    boolean processed
    timestamptz processed_at
    int retry_count
    jsonb metadata
    timestamptz created_at
  }

  FEATURE_FLAGS {
    uuid id PK
    varchar feature_key
    uuid tenant_id FK
    uuid user_id FK
    boolean is_enabled
    jsonb config
    timestamptz expires_at
    timestamptz created_at
    timestamptz updated_at
  }

  %% =========================
  %% LEADS / PIPELINE
  %% =========================
  LEADS {
    uuid id PK
    uuid tenant_id FK
    uuid created_by_user_id FK
    uuid assigned_user_id FK
    varchar first_name
    varchar last_name
    varchar email
    varchar phone
    varchar company_name
    varchar title
    varchar linkedin_url
    varchar stage
    varchar status
    int priority
    numeric estimated_value
    varchar currency
    jsonb custom_fields
    text notes
    boolean is_archived
    boolean is_deleted
    timestamptz last_activity_at
    timestamptz next_follow_up_at
    timestamptz created_at
    timestamptz updated_at
  }

  LEAD_STAGES {
    uuid id PK
    uuid tenant_id FK
    varchar key
    varchar label
    varchar description
    varchar color
    int display_order
    timestamptz created_at
    timestamptz updated_at
  }

  LEAD_STATUSES {
    uuid id PK
    uuid tenant_id FK
    varchar key
    varchar label
    varchar color
    timestamptz created_at
    timestamptz updated_at
  }

  LEAD_NOTES {
    uuid id PK
    uuid tenant_id FK
    uuid lead_id FK
    uuid created_by_user_id FK
    text content
    boolean is_deleted
    timestamptz created_at
    timestamptz updated_at
  }

  LEAD_ATTACHMENTS {
    uuid id PK
    uuid tenant_id FK
    uuid lead_id FK
    text file_url
    varchar file_name
    varchar file_type
    bigint file_size
    uuid uploaded_by_user_id FK
    boolean is_deleted
    timestamptz created_at
    timestamptz updated_at
  }

  LEAD_BOOKINGS {
    uuid id PK
    uuid tenant_id FK
    uuid lead_id FK
    uuid assigned_user_id FK
    uuid parent_booking_id FK "for retries"
    varchar booking_type
    varchar booking_source
    timestamptz scheduled_at
    varchar timezone
    varchar status
    varchar call_result
    int retry_count
    text notes
    jsonb metadata
    uuid created_by_user_id FK
    boolean is_deleted
    timestamptz created_at
    timestamptz updated_at
  }

  LEAD_SOCIAL {
    uuid id PK
    uuid tenant_id FK
    uuid lead_id FK
    jsonb data
    timestamptz created_at
    timestamptz updated_at
  }

  %% =========================
  %% CAMPAIGNS
  %% =========================
  CAMPAIGNS {
    uuid id PK
    uuid tenant_id FK
    varchar name
    text description
    varchar status
    uuid created_by_user_id FK
    uuid updated_by_user_id FK
    jsonb config
    timestamptz starts_at
    timestamptz ends_at
    boolean is_deleted
    timestamptz created_at
    timestamptz updated_at
  }

  CAMPAIGN_STEPS {
    uuid id PK
    uuid tenant_id FK
    uuid campaign_id FK
    varchar type
    int order
    varchar title
    text description
    jsonb config
    timestamptz created_at
    timestamptz updated_at
  }

  CAMPAIGN_LEADS {
    uuid id PK
    uuid tenant_id FK
    uuid campaign_id FK
    uuid lead_id FK
    varchar first_name
    varchar last_name
    varchar email
    varchar company_name
    varchar title
    text linkedin_url
    varchar phone
    jsonb lead_data
    varchar status
    int current_step_order
    timestamptz started_at
    timestamptz completed_at
    timestamptz created_at
    timestamptz updated_at
  }

  CAMPAIGN_LEAD_ACTIVITIES {
    uuid id PK
    uuid tenant_id FK
    uuid campaign_lead_id FK
    uuid step_id FK
    varchar channel
    varchar step_type
    varchar action_type
    varchar status
    varchar subject
    text message_content
    text error_message
    jsonb metadata
    timestamptz executed_at
    timestamptz created_at
    timestamptz updated_at
  }

  COMMUNICATION_TEMPLATES {
    uuid id PK
    uuid tenant_id FK
    varchar channel
    varchar template_key
    varchar language
    varchar subject
    text body
    jsonb variables_schema
    boolean is_active
    timestamptz created_at
    timestamptz updated_at
  }

  EMAIL_ACCOUNTS {
    uuid id PK
    uuid tenant_id FK
    varchar email
    varchar smtp_host
    int smtp_port
    varchar smtp_username
    text smtp_password
    boolean smtp_secure
    boolean is_active
    int daily_send_limit
    int sent_today
    date last_reset_date
    timestamptz created_at
    timestamptz updated_at
  }

  SOCIAL_LINKEDIN_ACCOUNTS {
    uuid id PK
    uuid tenant_id FK
    varchar account_name
    varchar unipile_account_id
    text session_cookies
    boolean is_active
    int daily_action_limit
    int actions_today
    date last_reset_date
    timestamptz created_at
    timestamptz updated_at
  }

  CAMPAIGN_LINKEDIN_ACCOUNTS {
    uuid id PK
    uuid tenant_id FK
    uuid campaign_id FK
    uuid linkedin_account_id FK
    varchar status
    int daily_requests_limit
    int daily_requests_used
    date last_reset_date
    timestamptz created_at
    timestamptz updated_at
  }

  %% =========================
  %% APOLLO CACHES
  %% =========================
  COMPANY_SEARCH_CACHE {
    bigint id PK
    uuid tenant_id FK
    varchar search_keywords
    varchar search_location
    varchar search_industry
    varchar apollo_organization_id
    varchar company_name
    varchar company_domain
    jsonb company_data
    int page_number
    int access_count
    timestamptz last_accessed_at
    timestamptz created_at
    timestamptz updated_at
  }

  EMPLOYEES_CACHE {
    bigint id PK
    uuid tenant_id FK
    varchar company_id
    varchar company_name
    varchar company_domain
    varchar employee_name
    varchar employee_title
    varchar employee_email
    varchar employee_phone
    text employee_linkedin_url
    text employee_photo_url
    text employee_headline
    varchar employee_city
    varchar employee_state
    varchar employee_country
    varchar apollo_person_id
    varchar data_source
    jsonb employee_data
    timestamptz last_fetched_at
    timestamptz created_at
    timestamptz updated_at
  }

  %% =========================
  %% EDUCATION VERTICAL
  %% =========================
  EDUCATION_STUDENTS {
    uuid id PK
    uuid tenant_id FK
    uuid lead_id FK
    varchar student_parent_name
    varchar parent_designation
    varchar program_interested_in
    varchar country_interested
    int intake_year
    varchar intake_month
    jsonb metadata
    boolean is_deleted
    timestamptz created_at
    timestamptz updated_at
  }

  EDUCATION_COUNSELLORS {
    uuid id PK
    uuid tenant_id FK
    uuid user_id FK
    varchar counselor_code
    varchar specialization
    varchar timezone
    jsonb availability_rules
    jsonb metadata
    boolean is_deleted
    timestamptz created_at
    timestamptz updated_at
  }

  %% =========================
  %% BILLING & CREDITS
  %% =========================
  USER_CREDITS {
    uuid id PK
    uuid user_id FK
    uuid tenant_id FK
    numeric balance
    numeric monthly_usage
    timestamptz last_usage_reset
    timestamptz created_at
    timestamptz updated_at
  }

  CREDIT_TRANSACTIONS {
    uuid id PK
    uuid user_id FK
    uuid tenant_id FK
    uuid user_credit_id FK
    numeric amount
    varchar transaction_type
    varchar reference_type
    uuid reference_id
    numeric balance_before
    numeric balance_after
    jsonb metadata
    timestamptz created_at
  }

  BILLING_WALLETS {
    uuid id PK
    uuid tenant_id FK
    uuid user_id FK
    numeric current_balance
    numeric reserved_balance
    varchar currency
    varchar status
    numeric low_balance_threshold
    timestamptz low_balance_notified_at
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  BILLING_PRICING_CATALOG {
    uuid id PK
    uuid tenant_id FK
    varchar category "enrichment, llm, stt, tts, telephony, vm_infrastructure"
    varchar provider "apollo, openai, google, deepgram, twilio, vonage, runpod"
    varchar model
    varchar unit "record, token, second, minute, character, message"
    numeric unit_price
    text description
    timestamptz effective_from
    timestamptz effective_to
    boolean is_active
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  BILLING_USAGE_EVENTS {
    uuid id PK
    uuid tenant_id FK
    uuid user_id FK
    varchar feature_key "voice-agent, campaigns, apollo-leads, etc"
    jsonb usage_items
    numeric total_quantity
    numeric total_cost
    varchar currency
    varchar status "pending, charged, voided, failed"
    uuid ledger_transaction_id FK
    timestamptz charged_at
    varchar idempotency_key UK
    varchar external_reference_id
    text error_message
    int retry_count
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  BILLING_LEDGER_TRANSACTIONS {
    uuid id PK
    uuid tenant_id FK
    uuid wallet_id FK
    varchar transaction_type "topup, debit, credit, adjustment, reservation, release"
    numeric amount
    numeric balance_before
    numeric balance_after
    varchar reference_type "usage_event, invoice, manual, stripe_payment"
    uuid reference_id
    varchar idempotency_key UK
    uuid created_by FK
    text description
    jsonb metadata
    timestamptz created_at
  }

  BILLING_INVOICES {
    uuid id PK
    uuid tenant_id FK
    varchar invoice_number UK
    varchar status "draft, pending, paid, voided, overdue"
    numeric subtotal
    numeric tax
    numeric total
    varchar currency
    timestamptz period_start
    timestamptz period_end
    timestamptz paid_at
    varchar payment_method
    timestamptz due_at
    jsonb line_items
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  BILLING_FEATURE_ENTITLEMENTS {
    uuid id PK
    uuid tenant_id FK
    varchar feature_key UK
    boolean enabled
    numeric monthly_quota
    numeric daily_quota
    boolean allow_overages
    numeric overage_rate
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  %% =========================
  %% AI ICP ASSISTANT
  %% =========================
  AI_CONVERSATIONS {
    uuid id PK
    uuid user_id FK
    uuid organization_id FK "tenant"
    varchar title
    varchar status
    jsonb icp_data
    jsonb search_params
    boolean search_triggered
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
    timestamptz archived_at
  }

  AI_MESSAGES {
    uuid id PK
    uuid conversation_id FK
    varchar role "user|assistant"
    text content
    jsonb message_data
    int tokens_used
    varchar model
    timestamptz created_at
  }

  AI_ICP_PROFILES {
    uuid id PK
    uuid user_id FK
    uuid organization_id FK "tenant"
    varchar name
    text description
    jsonb icp_data
    jsonb search_params
    uuid source_conversation_id FK
    boolean is_active
    int usage_count
    timestamptz last_used_at
    timestamptz created_at
    timestamptz updated_at
  }

  AI_KEYWORD_EXPANSIONS {
    uuid id PK
    varchar original_keyword UK
    jsonb expanded_keywords
    varchar context
    varchar model
    uuid organization_id FK "tenant"
    int usage_count
    timestamptz last_used_at
    timestamptz created_at
  }
  VOICE_AGENTS {
    bigint id PK
    uuid tenant_id FK
    varchar name
    text agent_instructions
    text system_instructions
    text outbound_starter_prompt
    text inbound_starter_prompt
    uuid voice_id FK
    varchar gender
    varchar language
    timestamptz created_at
    timestamptz updated_at
  }

  VOICE_AGENT_NUMBERS {
    uuid id PK
    uuid tenant_id FK
    varchar country_code
    bigint base_number
    varchar provider
    varchar status
    bigint default_agent_id FK
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  VOICE_AGENT_VOICES {
    uuid id PK
    uuid tenant_id FK
    varchar provider
    varchar provider_voice_id
    text description
    varchar gender
    varchar accent
    varchar language
    text voice_sample_url
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  VOICE_USER_PROFILES {
    uuid id PK
    uuid tenant_id FK
    uuid user_id FK
    bigint default_agent_id FK
    uuid default_number_id FK
    jsonb preferences
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  VOICE_PERMISSIONS {
    uuid id PK
    uuid tenant_id FK
    uuid user_id FK
    uuid number_id FK
    uuid voice_id FK
    boolean is_active
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  VOICE_CALL_BATCHES {
    uuid id PK
    uuid tenant_id FK
    uuid initiated_by_user_id FK
    bigint agent_id FK
    uuid voice_id FK
    uuid from_number_id FK
    varchar job_id
    varchar status
    int total_calls
    int completed_calls
    int failed_calls
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  VOICE_CALL_BATCH_ENTRIES {
    uuid id PK
    uuid tenant_id FK
    uuid batch_id FK
    uuid lead_id FK
    varchar status
    text error_message
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  VOICE_CALL_LOGS {
    uuid id PK
    uuid tenant_id FK
    uuid initiated_by_user_id FK
    uuid lead_id FK
    bigint agent_id FK
    uuid from_number_id FK
    varchar to_country_code
    bigint to_base_number
    uuid campaign_id FK
    uuid campaign_lead_id FK
    uuid campaign_step_id FK
    varchar status
    varchar direction "inbound|outbound"
    timestamptz started_at
    timestamptz ended_at
    int duration_seconds
    text recording_url
    jsonb transcripts
    numeric cost
    varchar currency
    jsonb cost_breakdown
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }

  VOICE_CALL_ANALYSIS {
    uuid id PK
    uuid tenant_id FK
    uuid call_log_id FK
    uuid lead_id FK
    text summary
    varchar sentiment
    varchar lead_category
    jsonb lead_extraction
    numeric cost
    jsonb metadata
    timestamptz created_at
  }

  %% =========================
  %% RELATIONSHIPS - CORE
  %% =========================
  TENANTS ||--o{ MEMBERSHIPS : has
  USERS   ||--o{ MEMBERSHIPS : belongs_to
  TENANTS ||--o{ USERS : primary_for

  USERS ||--o{ USER_IDENTITIES : has

  TENANTS ||--o{ TENANT_FEATURES : enables
  TENANTS ||--o{ USER_CAPABILITIES : scopes
  USERS   ||--o{ USER_CAPABILITIES : grants

  TENANTS ||--o{ TENANT_INVITATIONS : has
  USERS   ||--o{ TENANT_INVITATIONS : invited_by
  USERS   ||--o{ TENANT_INVITATIONS : accepted_by

  TENANTS ||--o{ DOMAIN_EVENTS : emits

  TENANTS ||--o{ FEATURE_FLAGS : has
  USERS   ||--o{ FEATURE_FLAGS : overrides

  %% =========================
  %% RELATIONSHIPS - LEADS
  %% =========================
  TENANTS ||--o{ LEADS : owns
  USERS   ||--o{ LEADS : created_by
  USERS   ||--o{ LEADS : assigned_to

  TENANTS ||--o{ LEAD_STAGES : defines
  TENANTS ||--o{ LEAD_STATUSES : defines
  LEADS   ||--o{ LEAD_NOTES : has
  USERS   ||--o{ LEAD_NOTES : created_by
  LEADS   ||--o{ LEAD_ATTACHMENTS : has
  USERS   ||--o{ LEAD_ATTACHMENTS : uploaded_by
  LEADS   ||--o{ LEAD_BOOKINGS : schedules
  USERS   ||--o{ LEAD_BOOKINGS : assigned_to
  LEAD_BOOKINGS ||--o{ LEAD_BOOKINGS : parent_retry
  LEADS   ||--o{ LEAD_SOCIAL : enriches

  %% =========================
  %% RELATIONSHIPS - CAMPAIGNS
  %% =========================
  TENANTS ||--o{ CAMPAIGNS : owns
  USERS   ||--o{ CAMPAIGNS : created_by
  USERS   ||--o{ CAMPAIGNS : updated_by
  CAMPAIGNS ||--o{ CAMPAIGN_STEPS : contains
  CAMPAIGNS ||--o{ CAMPAIGN_LEADS : targets
  LEADS     ||--o{ CAMPAIGN_LEADS : participates
  CAMPAIGN_LEADS ||--o{ CAMPAIGN_LEAD_ACTIVITIES : logs
  CAMPAIGN_STEPS ||--o{ CAMPAIGN_LEAD_ACTIVITIES : drives

  TENANTS ||--o{ COMMUNICATION_TEMPLATES : owns
  TENANTS ||--o{ EMAIL_ACCOUNTS : owns
  TENANTS ||--o{ SOCIAL_LINKEDIN_ACCOUNTS : owns
  TENANTS ||--o{ CAMPAIGN_LINKEDIN_ACCOUNTS : owns
  CAMPAIGNS ||--o{ CAMPAIGN_LINKEDIN_ACCOUNTS : uses

  %% =========================
  %% RELATIONSHIPS - APOLLO
  %% =========================
  TENANTS ||--o{ COMPANY_SEARCH_CACHE : caches
  TENANTS ||--o{ EMPLOYEES_CACHE : caches

  %% =========================
  %% RELATIONSHIPS - EDUCATION
  %% =========================
  TENANTS ||--o{ EDUCATION_STUDENTS : has
  LEADS   ||--|| EDUCATION_STUDENTS : extends
  TENANTS ||--o{ EDUCATION_COUNSELLORS : has
  USERS   ||--|| EDUCATION_COUNSELLORS : extends

  %% =========================
  %% RELATIONSHIPS - BILLING
  %% =========================
  USERS   ||--o{ USER_CREDITS : has
  TENANTS ||--o{ USER_CREDITS : scopes
  USER_CREDITS ||--o{ CREDIT_TRANSACTIONS : logs
  USERS        ||--o{ CREDIT_TRANSACTIONS : makes
  TENANTS      ||--o{ CREDIT_TRANSACTIONS : scopes

  TENANTS ||--o{ BILLING_WALLETS : has
  TENANTS ||--o{ BILLING_PRICING_CATALOG : defines
  TENANTS ||--o{ BILLING_USAGE_EVENTS : records
  USERS   ||--o{ BILLING_USAGE_EVENTS : triggers
  BILLING_WALLETS ||--o{ BILLING_LEDGER_TRANSACTIONS : posts
  TENANTS ||--o{ BILLING_INVOICES : issues
  TENANTS ||--o{ BILLING_FEATURE_ENTITLEMENTS : entitles

  %% =========================
  %% RELATIONSHIPS - AI ICP
  %% =========================
  TENANTS ||--o{ AI_CONVERSATIONS : hosts
  USERS   ||--o{ AI_CONVERSATIONS : initiates
  AI_CONVERSATIONS ||--o{ AI_MESSAGES : contains
  USERS   ||--o{ AI_MESSAGES : sends
  TENANTS ||--o{ AI_ICP_PROFILES : owns
  USERS   ||--o{ AI_ICP_PROFILES : creates
  AI_CONVERSATIONS ||--|| AI_ICP_PROFILES : sources
  TENANTS ||--o{ AI_KEYWORD_EXPANSIONS : caches

  %% =========================
  %% RELATIONSHIPS - VOICE
  %% =========================
  TENANTS ||--o{ VOICE_AGENTS : owns
  TENANTS ||--o{ VOICE_AGENT_NUMBERS : owns
  TENANTS ||--o{ VOICE_AGENT_VOICES : catalogs
  TENANTS ||--o{ VOICE_USER_PROFILES : maps
  USERS   ||--o{ VOICE_USER_PROFILES : has
  TENANTS ||--o{ VOICE_PERMISSIONS : grants
  USERS   ||--o{ VOICE_PERMISSIONS : has

  VOICE_AGENT_VOICES ||--o{ VOICE_AGENTS : uses
  VOICE_AGENT_NUMBERS ||--o{ VOICE_AGENTS : defaults

  VOICE_AGENTS ||--o{ VOICE_CALL_BATCHES : initiates
  VOICE_AGENT_NUMBERS ||--o{ VOICE_CALL_BATCHES : from_number
  VOICE_AGENT_VOICES ||--o{ VOICE_CALL_BATCHES : voice
  USERS   ||--o{ VOICE_CALL_BATCHES : initiated_by

  VOICE_CALL_BATCHES ||--o{ VOICE_CALL_BATCH_ENTRIES : contains
  LEADS   ||--o{ VOICE_CALL_BATCH_ENTRIES : targets

  VOICE_CALL_BATCHES ||--o{ VOICE_CALL_LOGS : produces
  LEADS   ||--o{ VOICE_CALL_LOGS : called
  VOICE_AGENTS ||--o{ VOICE_CALL_LOGS : agent
  VOICE_AGENT_NUMBERS ||--o{ VOICE_CALL_LOGS : from_number
  USERS   ||--o{ VOICE_CALL_LOGS : initiated_by
  CAMPAIGNS ||--o{ VOICE_CALL_LOGS : triggers
  CAMPAIGN_LEADS ||--o{ VOICE_CALL_LOGS : tracks

  VOICE_CALL_LOGS ||--o{ VOICE_CALL_ANALYSIS : analyzed
  LEADS   ||--o{ VOICE_CALL_ANALYSIS : extracts_for
