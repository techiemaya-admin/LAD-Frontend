You are an expert backend+frontend engineer working in the LAD architecture.

Your job: extend the existing Deals Pipeline feature to support the Education vertical (G-Links) while ensuring:

Multi-tenancy isolation is enforced in every query and API

Education-specific logic affects ONLY education tenants

No architecture rule breaks (repositories only contain SQL, services contain business logic, controllers handle request/response, SDK-first on frontend)

No breaking changes to existing clients/tenants and existing endpoints

0) Definitions

Tenant: organization/client record. Primary isolation key = tenant_id.

Vertical: a tenant configuration value that determines domain extensions (e.g., "education").

Education tenant: a tenant where education features are enabled and vertical = "education" (or feature flag education_vertical is enabled).

1) Hard LAD Rules (NON-NEGOTIABLE)
1.1 SQL + Multi-tenancy

✅ Every query must include:

tenant_id = $1 (or equivalent)

Soft delete guard: is_deleted = false where applicable

NO hardcoded schema like lad_dev.table. Use dynamic schema resolver:

const schema = getSchema(req);

Use ${schema}.table_name

1.2 Layering

controllers/: request validation + response formatting only (no SQL)

services/: business logic only (no SQL)

repositories/: SQL only (no business logic)

validators/: input validation schemas

dtos/: mapping between API fields and DB fields

constants/: enums, allowed values, status maps

utils/: only generic utilities (logger, schema resolver, etc.)

1.3 Logging

❌ No console.log

✅ Use logger.info/warn/error/debug with context { tenantId, userId, feature, route }

1.4 Security / Access Control

Use capabilities for RBAC (e.g., deals.view, deals.edit, education.students.view)

For counsellors: must only see assigned leads

enforce via query filtering assigned_user_id = currentUserId unless user has admin capability

1.5 Frontend (SDK-first)

❌ No direct fetch() inside web components for feature logic

✅ frontend/sdk/features/<feature>/ owns:

api.ts, hooks.ts, types.ts, index.ts

Next.js web/ is thin UI layer using SDK hooks.

2) Education Vertical Strategy (Do NOT impact other tenants)
2.1 Vertical gating (required)

Education-only behavior must be behind ONE of these gates:

Option A (preferred): tenant.vertical column in tenants.metadata or explicit column

vertical = 'education'

Option B: feature flag/tenant feature

tenant_features(feature_key='education_vertical', enabled=true)
or

feature_flags(tenant_id, feature_key='education_vertical', is_enabled=true)

Implementation rule:
In backend services, create helper:

isEducationTenant(tenantId): boolean

cache per request if needed

2.2 Education data storage pattern (required)

Base lead fields stay in leads

Education-specific fields go into extension table:

education_students (1:1 with lead via lead_id)

Do not add education columns to leads.

3) Backend Work Required (Deals Pipeline + Education)
3.1 New/Verified tables

Ensure these exist (tenant-scoped, soft delete where needed):

education_students (lead extension)

education_counsellors (1:1 extension of users OR mapping table)

lead_bookings (already exists)

(Optional if needed) education_counsellor_availability and education_counsellor_time_off

3.2 Endpoints to implement/update

All endpoints must:

read tenant_id from auth context (NOT from client payload)

validate permissions (capabilities)

use repositories for SQL

Education endpoints inside deals-pipeline (same feature, gated):

GET /api/deals-pipeline/students

GET /api/deals-pipeline/students/:id

POST /api/deals-pipeline/students (creates lead + education_students)

PUT /api/deals-pipeline/students/:id

DELETE /api/deals-pipeline/students/:id (soft delete both)

POST /api/deals-pipeline/students/:id/assign-counsellor

Bookings (already in pipeline, ensure counsellor scoping):

POST /api/deals-pipeline/bookings

GET /api/deals-pipeline/bookings/counsellor/:counsellorId

GET /api/deals-pipeline/bookings/student/:studentId

GET /api/deals-pipeline/bookings/range

GET /api/deals-pipeline/bookings/availability

3.3 Scoping rules (critical)

If user is counsellor and NOT admin:

GET /students returns only students where lead.assigned_user_id = currentUserId

GET /leads should return only assigned leads (for counsellor role)

Admin capability examples:

deals.admin

education.admin

team.manage

3.4 Repository structure (required)

Create:

repositories/leadsRepository.js

repositories/educationStudentsRepository.js

repositories/bookingsRepository.js

repositories/stagesRepository.js

repositories/referenceRepository.js

No SQL elsewhere.

3.5 DTOs (required)

Create:

dtos/leadDto.js (API ⇄ DB mapping)

dtos/studentDto.js

Example: API name → DB first_name
API company → DB company_name

4) Frontend Work Required (Education UI without impacting others)
4.1 Education UI must be slot-based (pipeline slots)

You must integrate education UI via pipeline slots pattern:

Add CounsellorScheduleSlot UI under pipeline feature slots

Ensure the pipeline board renders slots conditionally:

only when tenant is education OR feature enabled

4.2 Feature location (required)

Frontend SDK:

frontend/sdk/features/deals-pipeline/ (or education/ if you separated)

api.ts

hooks.ts (React Query)

types.ts

index.ts

Web:

frontend/web/src/app/pipeline/page.tsx uses SDK hooks only

Education screens:

frontend/web/src/app/pipeline/students/page.tsx (education only)

frontend/web/src/components/pipeline/slots/CounsellorScheduleSlot.tsx

4.3 Routing rule

It is OK to create:

web/src/app/<feature>/page.tsx

web/src/app/<feature>/[id]/page.tsx

But education-specific routes must be gated:

Hide navigation unless education enabled

Server-side guard if needed (capabilities + feature)

5) Output Requirements (What you must deliver)
5.1 Backend deliverables

Controllers + Services + Repositories + Validators + DTOs

Updated/added routes for students + bookings availability

Unit/integration tests where feasible

Migration SQL if any table changes needed

Updated manifest for deals-pipeline if required

5.2 Frontend deliverables

SDK contracts (types + api + hooks)

UI pages (students list/detail)

Pipeline slot integration (CounsellorScheduleSlot)

Capability + feature gating implemented

6) Mandatory Validation (must run before final answer)

Before you finalize, produce a PR Validation Report with:

🔴 CRITICAL BLOCKERS (Cannot Deploy)

List any violations like:

Hardcoded schema names (lad_dev.)

Missing tenant_id filters

SQL in services/controllers

console.log

web fetch() calls bypassing SDK

✅ Validation Commands

Provide commands to verify:

grep for lad_dev. usage

grep for console.

grep for fetch(/axios usage inside web layer (feature code)

ensure repositories exist and contain SQL

ensure services contain no SQL strings

7) Implementation Guidance (Important decisions)
Where to store extracted voice call data for non-education tenants?

Store generic extracted fields in voice_call_analysis.lead_extraction (or a new lead_extractions table tenant-scoped)

Education uses education_students as curated/validated data

Non-education tenants use generic extraction table + optional per-vertical extension tables later

8) Final Response Format

When responding, output in this order:

Architecture plan

Folder/file tree

DDL/migrations (if any)

Backend code snippets (key files)

SDK contracts (types/api/hooks)

UI integration summary (slots + routes)

PR Validation Report (blockers + checks)

Do not skip the validation report.