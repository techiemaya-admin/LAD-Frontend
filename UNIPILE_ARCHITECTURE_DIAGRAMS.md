# Unipile Campaign Integration - Visual Architecture

## Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CAMPAIGN EXECUTION FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

START: Campaign Trigger
  ↓
┌─────────────────────────────────────────────────────────────────────┐
│ READ CAMPAIGN CONFIGURATION (LeadGenerationService.js:254)         │
│                                                                     │
│  SELECT config, search_source FROM campaigns WHERE id = ?          │
│                                                                     │
│  search_source options:                                             │
│   • 'unipile'    → Use only Unipile                                 │
│   • 'apollo_io'  → Use only Apollo (default)                        │
│   • 'auto'       → Try Unipile, fallback to Apollo                  │
│   • undefined    → Default to 'apollo_io'                           │
└─────────────────────────────────────────────────────────────────────┘
  ↓
  ├─────────────────────────────────────────────────────────────────┐
  │ DECISION POINT: Which source to use?                            │
  └─────────────────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────┬──────────────────────┬─────────────────┐
│ 'unipile' Mode          │ 'auto' Mode          │ 'apollo_io' Mode│
│ (Unipile only)          │ (Smart fallback)     │ (Default)       │
└─────────────────────────┴──────────────────────┴─────────────────┘
  ↓                         ↓                      ↓
  
┌──────────────────────┐
│ STEP 1: TRY UNIPILE  │ (if unipile_account_id set)
│                      │
│ Call:                │
│ UnipileApolloAdapter │
│ .searchLeadsWithFall │
│  back({...})         │
└──────────────────────┘
  ↓
  ├─ SUCCESS ─────────────────────────┐
  │                                   │
  │ Response: {                        │
  │   success: true,                   │
  │   people: [{                       │
  │     _source: 'unipile',  ← KEY!   │
  │     id: '...',                     │
  │     name: '...',                   │
  │     ...                            │
  │   }],                              │
  │   source: 'unipile'                │
  │ }                                  │
  │                                   │
  └──────────────────────────────────┘
         ↓
         
┌──────────────────────┐
│ GOT ENOUGH LEADS?    │
│ (employees.length    │
│  >= dailyLimit)      │
└──────────────────────┘
  ↓
  ├─ YES ────────────────┐
  │ (Skip Apollo)        │
  │                      │
  └──────────────────────┘
       ↓
       
┌──────────────────────┐
│ STEP 2: SAVE LEADS   │
│ (LeadSaveService)    │
└──────────────────────┘
       ↓
       
  ├─ FAILED or NO RESULTS (Unipile)
  │
  ├─ If searchSource='unipile': ERROR STOP ✗
  ├─ If searchSource='auto': FALLBACK TO APOLLO ↓
  │
  └──────────────────────────────────────────────────────┐
                                                         │
┌──────────────────────────────────────────────────┐    │
│ STEP 1B: TRY APOLLO/DATABASE (Fallback)          │    │
│ (Only if 'auto' mode or 'apollo_io' mode)       │    │
│                                                  │    │
│ Call:                                            │    │
│  searchEmployeesFromDatabase() → leads[]        │    │
│  searchEmployees() [Apollo API] → leads[]       │    │
│                                                  │    │
│ Response: {                                       │    │
│   success: true,                                  │    │
│   people: [{                                      │    │
│     _source: undefined,  ← Will default!         │    │
│     apollo_person_id: '...',                     │    │
│     ...                                           │    │
│   }]                                              │    │
│ }                                                 │    │
└──────────────────────────────────────────────────┘ ←──┘
       ↓
       
┌──────────────────────────────────────────────────┐
│ STEP 2: SAVE LEADS TO CAMPAIGN                   │
│ (LeadSaveService.saveLeadsToCampaign)           │
│                                                  │
│ FOR EACH lead IN leads:                          │
│   ├─ Detect source:                              │
│   │  const source = lead._source || 'apollo_io' │
│   │                                              │
│   ├─ Extract ID based on source:                 │
│   │  if source='unipile':                        │
│   │    sourceId = lead.id                        │
│   │  else:                                       │
│   │    sourceId = lead.apollo_person_id          │
│   │                                              │
│   ├─ Map fields (supports both formats):         │
│   │  linkedin_url = lead.linkedin_url ||         │
│   │                 lead.profile_url             │
│   │  photo_url = lead.photo_url ||               │
│   │              lead.profile_picture_url        │
│   │                                              │
│   ├─ INSERT INTO leads:                          │
│   │  (id, tenant_id, source, source_id, ...)    │
│   │  VALUES (uuid, $1, 'unipile' or              │
│   │          'apollo_io', sourceId, ...)         │
│   │                                              │
│   └─ Log:                                        │
│      "[Lead Save] Successfully saved lead"       │
│      {"sourceId":"...","source":"unipile",...}   │
│                                                  │
└──────────────────────────────────────────────────┘
       ↓
       
┌──────────────────────────────────────────────────┐
│ RESULTS IN DATABASE                             │
│                                                  │
│ leads table:                                     │
│ ┌─────────┬─────────────────────┐                │
│ │ source  │ source_id           │                │
│ ├─────────┼─────────────────────┤                │
│ │ unipile │ z6gy_lead_12345     │ ← Unipile     │
│ │ unipile │ z6gy_lead_67890     │ ← Unipile     │
│ │ apollo  │ 664c35298863b80...  │ ← Apollo      │
│ │ apollo  │ 680491167c656a...   │ ← Apollo      │
│ └─────────┴─────────────────────┘                │
│                                                  │
│ campaign_leads table:                            │
│ ┌──────────┬──────────────┐                      │
│ │ lead_id  │ source       │                      │
│ ├──────────┼──────────────┤                      │
│ │ uuid-1   │ unipile      │                      │
│ │ uuid-2   │ unipile      │                      │
│ │ uuid-3   │ apollo_io    │                      │
│ │ uuid-4   │ apollo_io    │                      │
│ └──────────┴──────────────┘                      │
│                                                  │
└──────────────────────────────────────────────────┘
       ↓
       
END: Campaign execution complete ✅

```

---

## Mode Comparison Table

```
┌──────────────┬────────────────────┬────────────────────┬──────────────┐
│ Mode         │ Primary Source     │ Fallback           │ Use Case     │
├──────────────┼────────────────────┼────────────────────┼──────────────┤
│ 'unipile'    │ Unipile API        │ NONE (fail if err) │ Unipile-only │
│ 'apollo_io'  │ Apollo API         │ NONE               │ Default      │
│ 'auto'       │ Try Unipile first  │ Fall back to       │ Recommended  │
│              │                    │ Apollo             │              │
│ undefined    │ Apollo API         │ NONE               │ Backward     │
│              │ (default)          │                    │ compatible   │
└──────────────┴────────────────────┴────────────────────┴──────────────┘
```

---

## Source Detection Flow

```
LEAD ARRIVES AT LeadSaveService
  ↓
CHECK: Is _source field present?
  ├─ YES: _source = 'unipile'
  │         ↓
  │         sourceId = lead.id or lead.profile_id
  │         ↓
  │         Save as: source='unipile'
  │
  └─ NO: _source = undefined
          ↓
          DEFAULT: source = 'apollo_io'
          ↓
          sourceId = lead.apollo_person_id or lead.id
          ↓
          Save as: source='apollo_io'
```

---

## Field Mapping Support

```
INPUT: Unipile Lead                INPUT: Apollo Lead
┌──────────────────────┐           ┌──────────────────────┐
│ {                    │           │ {                    │
│   _source: 'unipile' │           │   _source: 'apollo'  │
│   id: 'z6gy...',     │           │   apollo_person_id:  │
│   profile_url: '...' │           │   '664c35...',       │
│   profile_picture: $ │           │   linkedin_url: '...'│
│   job_title: 'Dir',  │           │   photo_url: '...',  │
│   phone_number: '...'│           │   title: 'Manager',  │
│ }                    │           │   phone: '...'       │
└──────────────────────┘           │ }                    │
         ↓                         └──────────────────────┘
         │                                  ↓
         │                                  │
         └─────────────────┬────────────────┘
                           ↓
            LEADSAVESERVICE FIELD MAPPING
            
            linkedin_url = 
              lead.linkedin_url ||
              lead.profile_url ||
              lead.public_profile_url
            
            photo_url = 
              lead.photo_url ||
              lead.profile_picture_url
            
            title = 
              lead.title ||
              lead.job_title ||
              lead.headline
            
            phone = 
              lead.phone ||
              lead.phone_number
                           ↓
            UNIFIED LEADDATA OBJECT
            ┌────────────────────────┐
            │ {                      │
            │   id: sourceId,        │
            │   name: '...',         │
            │   title: '...',        │
            │   linkedin_url: '...', │
            │   photo_url: '...',    │
            │   phone: '...',        │
            │   source: source,      │ ← TRACKED
            │   ...                  │
            │ }                      │
            └────────────────────────┘
                        ↓
                   DATABASE SAVE
```

---

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                   LeadGenerationService                     │
│                    (Campaign Executor)                      │
└─────────────────────────────────────────────────────────────┘
         ↓                                    ↓
    ┌─────────────┐         ┌────────────────────────────┐
    │   Unipile   │         │  UnipileApolloAdapter      │
    │             │         │  Service                   │
    │ - Import    │         │                            │
    │ - Config    │         │  - searchLeadsWith         │
    │   read      │         │    Fallback()              │
    │ - Call      │         │  - Field mapping           │
    │   adapter   │         │  - Source detection        │
    └─────────────┘         └────────────────────────────┘
         ↓                              ↓
    ┌──────────────────────────────────────────┐
    │      LeadSaveService (Lead Saver)       │
    │                                          │
    │  - Detect source from _source field     │
    │  - Extract correct ID based on source  │
    │  - Map field names (both formats)       │
    │  - Save with correct source value       │
    └──────────────────────────────────────────┘
         ↓
    ┌──────────────────────────────────────────┐
    │       Database (Multi-tenant)            │
    │                                          │
    │  leads:                                  │
    │   ├─ source = 'unipile' or 'apollo_io' │
    │   ├─ source_id = actual ID from source  │
    │   └─ All lead data preserved            │
    │                                          │
    │  campaign_leads:                         │
    │   ├─ lead_id (reference)                │
    │   ├─ campaign_id                        │
    │   └─ source tracking                    │
    └──────────────────────────────────────────┘
```

---

## Error Handling & Fallback

```
TRY UNIPILE
  ↓
  ├─ SUCCESS: Use Unipile leads → SAVE
  │
  ├─ UNIPILE ERROR
  │  ├─ searchSource='unipile' → FAIL (don't fallback)
  │  └─ searchSource='auto' → CONTINUE TO APOLLO
  │
  └─ NO RESULTS
     ├─ searchSource='unipile' → FAIL
     └─ searchSource='auto' → CONTINUE TO APOLLO
     
TRY APOLLO (if auto or apollo_io mode)
  ↓
  ├─ SUCCESS: Use Apollo leads → SAVE
  │
  └─ FAIL: Log error, skip campaign leads

SAVE LEADS
  ↓
  ├─ SUCCESS: Mark campaign complete
  └─ FAIL: Log error, continue
```

