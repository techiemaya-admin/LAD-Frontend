You are an expert LAD (Layered Application Design) architect and senior full-stack engineer.

Your task is to extend the existing Deals Pipeline feature for the Education vertical (G-Links) WITHOUT creating new top-level pages or breaking shared functionality.

Review current student page and map it back to Option A

🎯 CORE PRINCIPLE (MANDATORY)

DO NOT create a new standalone page for students.

Education is a vertical, not a separate product.
The existing Pipeline page must be reused, with labeling + conditional UI logic.

✅ OPTION A (REQUIRED APPROACH)
✔ Reuse existing Pipeline

/app/pipeline/page.tsx

/app/pipeline/[id]/page.tsx

Existing board, stages, drag-drop, analytics

✔ Apply Education-specific behavior via:

Feature flags

Tenant vertical detection

Conditional UI blocks

Label changes only

🚫 STRICTLY FORBIDDEN

❌ Creating:

/app/pipeline/students/page.tsx

/app/students/*

A parallel “Students Pipeline”

❌ Forking:

Separate student board

Separate lead board

Separate routing trees

❌ Hardcoding:

tenant IDs

schema names

education logic without guards

🧩 HOW TO DETECT EDUCATION VERTICAL

Use feature flags / tenant features, NOT routes.

Backend

tenant_features

or feature_flags

Key: education.vertical

Frontend
const { hasFeature } = useAuth();

const isEducation = hasFeature('education.vertical');

🏷️ LABEL & TERMINOLOGY MAPPING (UI ONLY)
Generic (Default)	Education (UI Label)
Lead	Student
Deal	Application
Owner	Counsellor
Pipeline	Admissions Pipeline
Booking	Counselling Session
Value	Program Fee / Intake

⚠️ Database, APIs, and routing MUST remain generic (leads, lead_bookings)

🧠 UI IMPLEMENTATION RULES
Pipeline List Page
<h1>
  {isEducation ? 'Students' : 'Leads'}
</h1>

Lead Card
<Label>
  {isEducation ? 'Student ID' : 'Lead ID'}
</Label>

Sidebar
<MenuItem>
  {isEducation ? 'Students' : 'Pipeline'}
</MenuItem>

🧩 EDUCATION-SPECIFIC UI BLOCKS (CONDITIONAL)

Allowed only inside existing pages:

{isEducation && (
  <StudentProfilePanel
    program={student.program}
    intakeYear={student.intakeYear}
    counsellor={student.counsellor}
  />
)}

🗄️ DATA STORAGE RULES
Generic Data (ALL tenants)

leads

lead_bookings

lead_notes

lead_attachments

Education-Only Extensions

education_students (1-1 with leads)

education_counsellors

⛔ Do NOT add education columns to leads

🔐 ACCESS CONTROL (MANDATORY)
Backend

Guard education routes with:

requireFeature('education.vertical')

Frontend
if (isEducation) {
  showEducationFields();
}

📐 ARCHITECTURE RULES (HARD)
Frontend

❌ No fetch() in components

✅ SDK hooks only

❌ No logic in pages

✅ Thin pages, rich components

Backend

SQL → repositories only

Services → business logic

Controllers → request/response

No hardcoded schema names

Tenant isolation enforced

✅ ACCEPTABLE FILE CHANGES
Frontend
pipeline/
├── components/
│   ├── PipelineBoard.tsx (extended)
│   ├── LeadCard.tsx (label aware)
│   ├── StudentFields.tsx (education only)

Backend
repositories/
├── educationStudentsRepository.js
services/
├── educationStudentsService.js

🧪 VALIDATION CHECKLIST (MUST PASS)

 No new /students page created

 Pipeline routes unchanged

 Education visible only if feature enabled

 Other tenants unaffected

 One pipeline code path

 No duplicated logic

 No schema hardcoding

 SDK used everywhere

📊 FINAL DECISION LOGIC
Scenario	Result
Education tenant	Sees “Students”
Non-education tenant	Sees “Leads”
Same codebase	✅
Same routes	✅
Same DB core tables	✅
🧠 REMEMBER

Verticals customize behavior, not architecture.

If you create a new page → ❌ WRONG
If you reuse pipeline with labels → ✅ CORRECT

🟢 OUTPUT EXPECTATION

When implementing:

Modify existing pipeline UI

Add conditional components

Add feature guards

Do NOT add new pages