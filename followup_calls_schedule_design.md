You are a senior full-stack engineer working inside the LAD multi-tenant SaaS codebase.

0) Objective

Implement an automatic follow-up call system:

When a new lead booking is created (record inserted into lad_dev.lead_bookings), schedule a job using GCP Cloud Tasks.

At the correct time (lead_bookings.scheduled_at), the job should call the voice-agent feature endpoint:

POST /api/voice-agent/calls/start-call

Must support multi-tenancy and must not break LAD architecture rules.

1) LAD Architecture Rules (Non-negotiable)
1.1 Folder structure

All new backend code must live in the correct layer:

Routes: HTTP routing only

Controllers: request/response only (no SQL)

Services: business logic (no SQL)

Repositories: SQL only (parameterized), schema resolved dynamically

Utils: small helpers only (no business logic)

No direct db.query() from controllers/services; only from repositories.

1.2 Multi-tenancy & Schema rules

Never hardcode schema names like lad_dev.table.

Always resolve schema dynamically from request context, e.g. getSchema(req) or req.user.schema.

Every write and read must be tenant-scoped:

tenant_id must be required in queries and validated.

1.3 Naming / casing

Database columns: snake_case

API payloads: camelCase

Normalization is allowed at boundaries:

Example: normalizedFromNumber = fromNumber || from_number is OK only at the boundary layer, but final internal DTO should be consistent.

1.4 Idempotency & retries

Cloud Tasks will retry; your handler must be idempotent:

Starting the same call twice must not happen.

Use a deterministic idempotency key per booking.

1.5 Logging

No console.log.

Use LAD logger utility (structured logs) with tenant_id, booking_id context.

2) What to Build (High level)
2.1 When booking is created

On creating a booking (existing endpoint: POST /api/deals-pipeline/bookings), after DB insert:

If the booking qualifies as a follow-up call (booking_type indicates follow-up / auto follow-up):

Create a Cloud Task scheduled at scheduled_at (or slightly before if you need warm-up).

Save enough metadata to make the execution reliable and idempotent.

2.2 When the task runs

A new internal endpoint receives the task request and triggers:

POST /api/voice-agent/calls/start-call

It passes the correct tenant/user context + booking details.

3) Data Model Additions (Minimal + Safe)

Do not create random tables. Add only what you need to enforce idempotency & traceability.

Option A (preferred): Extend lead_bookings

Add columns (migration):

task_name TEXT NULL (Cloud Tasks task name returned by API)

task_scheduled_at TIMESTAMPTZ NULL

task_status VARCHAR(30) NOT NULL DEFAULT 'pending'

values: pending | scheduled | executed | cancelled | failed

executed_at TIMESTAMPTZ NULL

execution_attempts INT NOT NULL DEFAULT 0

last_execution_error TEXT NULL

idempotency_key VARCHAR(100) UNIQUE NULL (or unique per tenant)

Unique constraint:

(tenant_id, idempotency_key) unique (recommended)

Option B: New table follow_up_tasks

Only if you want strict separation. Otherwise prefer Option A.

4) Cloud Tasks Design
4.1 Queue

Queue name: follow-up-calls

Location: from env (e.g., GCP_LOCATION)

Project: from env

4.2 Task execution target

Task hits a backend endpoint like:

POST /api/deals-pipeline/bookings/:id/execute-followup

This endpoint is internal and must be protected:

Validate Cloud Tasks auth:

Use OIDC token or header secret (best: OIDC via service account)

Reject requests not from Cloud Tasks.

4.3 Schedule time

Set scheduleTime = lead_bookings.scheduled_at

If scheduled_at is in the past, enqueue immediately.

4.4 Payload

Payload should include:

tenantId

bookingId

leadId

assignedUserId (if needed)

idempotencyKey

Never include secrets in payload.

5) Backend Implementation Plan (Concrete)
5.1 Add a “follow-up scheduler” module (in Deals Pipeline feature)

Create these files under:
backend/features/deals-pipeline/

repositories/

bookingsRepository.js

createBooking(...)

markTaskScheduled(bookingId, taskName, scheduledAt, idempotencyKey)

lockBookingForExecution(tenantId, bookingId) (SELECT FOR UPDATE)

markExecuted(...)

markFailed(...)

services/

bookingsService.js (existing)

after create booking: call followUpSchedulerService.scheduleFollowUpCall(...)

followUpSchedulerService.js (NEW)

decides if booking needs task

generates idempotency key

calls cloudTasksClient.createTask

updates booking row with task metadata

followUpExecutionService.js (NEW)

validate booking belongs to tenant

enforce idempotency:

if task_status = executed → return 200 OK (no-op)

increments attempts

calls voice-agent endpoint internally via service call/client

marks executed/failed

controllers/

bookingsController.js (existing)

expose new internal handler: executeFollowUpCall

must do minimal request parsing and call service

routes/

bookingsRoutes.js

add route:

POST /bookings/:id/execute-followup (internal)

5.2 Add shared integration client for Cloud Tasks

Do NOT duplicate connection code in feature repo.
Place Cloud Tasks client in:

backend/shared/gcp/cloudTasksClient.js (if it doesn’t exist)

Expose function:

createScheduledHttpTask({ queue, url, payload, scheduleTime, oidcServiceAccountEmail })

5.3 Voice-agent call trigger

Do NOT call voice-agent by “fetch” from random places.
Create a proper internal client:

backend/shared/clients/voiceAgentClient.js

startCall({ tenantId, bookingId, leadId, ... })

This client must:

pass tenant header X-Tenant-Id

pass authorization/internal service token if required

6) Security Requirements
6.1 Cloud Tasks authentication

Implement one of these (prefer OIDC):

Cloud Task uses OIDC token generated from service account

Backend verifies JWT audience + issuer + service account email
OR

Shared secret header X-CloudTasks-Secret (less preferred)

6.2 Tenant enforcement

Execution endpoint must:

derive schema via tenant context (from payload + validated)

ensure booking row tenant_id matches payload tenantId

7) Idempotency Requirements (Must pass)

Use deterministic idempotency key:

followup:${tenantId}:${bookingId}:${scheduled_at_iso}

On execution:

if task_status = executed → return 200, do nothing

else attempt execution within DB transaction:

SELECT booking FOR UPDATE

mark in_progress (optional)

call voice-agent

mark executed

8) Failure & Retry Logic

On failure:

write task_status='failed'

save last_execution_error

allow Cloud Tasks retry (do not block retries unless permanently invalid)

If booking is cancelled before scheduled time:

set task_status = cancelled

optionally delete Cloud Task if task_name exists

9) Testing Checklist (must implement)
Unit tests

scheduling logic: creates task with correct scheduleTime

idempotency: second execution returns success without calling voice agent

tenant check: cannot execute booking from another tenant

Integration tests (optional but ideal)

create booking → task scheduled → simulate call to internal endpoint → voiceAgentClient invoked

10) Deliverables (Output expected)

Migration SQL for new columns/constraints

New repository + service + controller + route files

Cloud Tasks client utility in shared

Voice agent client in shared

Documentation: backend/features/deals-pipeline/ARCHITECTURE_COMPLIANCE.md

show “no hardcoded schema”, “tenant-scoped”, “idempotent”, “no console.log”

11) PR Validation Rules (self-check before final)

When finished, scan and report blockers in this exact format:

🔴 CRITICAL BLOCKERS (Cannot Deploy):

Issue #1: Hardcoded Schema Names

Issue #2: Missing Tenant Filter

Issue #3: Non-idempotent handler

Issue #4: console.log usage
📊 Production Readiness: ✅ READY / ❌ NOT READY