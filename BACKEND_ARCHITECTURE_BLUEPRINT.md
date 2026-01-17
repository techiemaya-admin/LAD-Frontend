# Backend Architecture Blueprint for Education Vertical

## Overview
This document provides the complete backend architecture for implementing the education vertical in the Deals Pipeline feature. Follow LAD architecture rules strictly.

---

## Folder Structure

```
backend/features/deals-pipeline/
├── controllers/
│   ├── leadsController.js (existing - extend)
│   ├── stagesController.js (existing)
│   ├── educationStudentsController.js ✨ NEW
│   └── bookingsController.js (existing - extend)
│
├── services/
│   ├── leadsService.js (existing - extend)
│   ├── educationStudentsService.js ✨ NEW
│   ├── bookingsService.js (existing - extend)
│   └── utils/
│       └── tenantHelpers.js ✨ NEW (isEducationTenant)
│
├── repositories/
│   ├── leadsRepository.js ✨ NEW
│   ├── educationStudentsRepository.js ✨ NEW
│   ├── bookingsRepository.js ✨ NEW
│   ├── stagesRepository.js ✨ NEW
│   └── referenceRepository.js ✨ NEW
│
├── dtos/
│   ├── leadDto.js ✨ NEW
│   └── studentDto.js ✨ NEW
│
├── validators/
│   └── studentValidator.js ✨ NEW
│
├── constants/
│   └── educationConstants.js ✨ NEW
│
├── routes/
│   ├── leadsRoutes.js (existing)
│   ├── studentsRoutes.js ✨ NEW
│   └── bookingsRoutes.js (existing - extend)
│
└── manifest.js (existing - update)
```

---

## Critical Implementation Rules

### 🔴 NON-NEGOTIABLE

1. **Every query MUST include:**
   ```javascript
   AND tenant_id = $1
   AND is_deleted = false
   ```

2. **NO hardcoded schemas:**
   ```javascript
   // ❌ WRONG
   FROM lad_dev.leads
   
   // ✅ CORRECT
   const schema = getSchema(req);
   FROM ${schema}.leads
   ```

3. **Layering:**
   - Controllers: Request validation + response formatting ONLY
   - Services: Business logic ONLY
   - Repositories: SQL ONLY

4. **Logging:**
   ```javascript
   // ❌ WRONG
   console.log('something');
   
   // ✅ CORRECT
   logger.info('Student created', { 
     tenantId, 
     userId, 
     studentId, 
     feature: 'education' 
   });
   ```

---

## 1. Repository Layer (SQL Only)

### `repositories/educationStudentsRepository.js`

```javascript
const logger = require('../../../utils/logger');

/**
 * Create education student record
 * @param {Object} params - Student data
 * @param {string} params.schema - Dynamic schema name
 * @param {string} params.tenantId - Tenant ID
 * @returns {Object} Created student
 */
async function createEducationStudent({ schema, tenantId, leadId, studentData }) {
  const query = `
    INSERT INTO ${schema}.education_students (
      lead_id, tenant_id,
      current_education_level, current_institution, gpa, graduation_year,
      target_degree, target_major, target_universities, target_countries,
      sat_score, act_score, toefl_score, ielts_score, gre_score, gmat_score,
      budget_range, preferred_intake, scholarship_interest
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *
  `;

  const values = [
    leadId,
    tenantId,
    studentData.current_education_level,
    studentData.current_institution,
    studentData.gpa,
    studentData.graduation_year,
    studentData.target_degree,
    studentData.target_major,
    studentData.target_universities,
    studentData.target_countries,
    studentData.sat_score,
    studentData.act_score,
    studentData.toefl_score,
    studentData.ielts_score,
    studentData.gre_score,
    studentData.gmat_score,
    studentData.budget_range,
    studentData.preferred_intake,
    studentData.scholarship_interest,
  ];

  try {
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to create education student', { 
      tenantId, 
      leadId, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Get education student by lead_id
 * @param {Object} params - Query params
 * @returns {Object|null} Student record
 */
async function getStudentByLeadId({ schema, tenantId, leadId }) {
  const query = `
    SELECT * FROM ${schema}.education_students
    WHERE tenant_id = $1 AND lead_id = $2 AND is_deleted = false
  `;

  const result = await db.query(query, [tenantId, leadId]);
  return result.rows[0] || null;
}

/**
 * Update education student
 * @param {Object} params - Update params
 * @returns {Object} Updated student
 */
async function updateEducationStudent({ schema, tenantId, leadId, updates }) {
  const fields = Object.keys(updates)
    .map((key, idx) => `${key} = $${idx + 3}`)
    .join(', ');
  
  const query = `
    UPDATE ${schema}.education_students
    SET ${fields}, updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = $1 AND lead_id = $2 AND is_deleted = false
    RETURNING *
  `;

  const values = [tenantId, leadId, ...Object.values(updates)];
  const result = await db.query(query, values);
  return result.rows[0];
}

/**
 * Soft delete education student
 * @param {Object} params - Delete params
 */
async function deleteEducationStudent({ schema, tenantId, leadId }) {
  const query = `
    UPDATE ${schema}.education_students
    SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = $1 AND lead_id = $2 AND is_deleted = false
  `;

  await db.query(query, [tenantId, leadId]);
}

module.exports = {
  createEducationStudent,
  getStudentByLeadId,
  updateEducationStudent,
  deleteEducationStudent,
};
```

### `repositories/leadsRepository.js`

```javascript
/**
 * Get leads with optional filters (including counsellor scoping)
 * @param {Object} params - Filter params
 * @returns {Array} Leads
 */
async function getLeads({ schema, tenantId, userId, isAdmin, filters = {} }) {
  let query = `
    SELECT l.* FROM ${schema}.leads l
    WHERE l.tenant_id = $1 AND l.is_deleted = false
  `;

  const values = [tenantId];
  let paramIndex = 2;

  // Counsellor scoping (if not admin, only show assigned leads)
  if (!isAdmin && userId) {
    query += ` AND l.assigned_user_id = $${paramIndex}`;
    values.push(userId);
    paramIndex++;
  }

  // Apply filters (stage, status, search, etc.)
  if (filters.stage) {
    query += ` AND l.stage = $${paramIndex}`;
    values.push(filters.stage);
    paramIndex++;
  }

  if (filters.status) {
    query += ` AND l.status = $${paramIndex}`;
    values.push(filters.status);
    paramIndex++;
  }

  if (filters.search) {
    query += ` AND (l.name ILIKE $${paramIndex} OR l.email ILIKE $${paramIndex} OR l.phone ILIKE $${paramIndex})`;
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY l.created_at DESC`;

  const result = await db.query(query, values);
  return result.rows;
}

// ... other lead repository methods
```

---

## 2. Service Layer (Business Logic Only)

### `services/utils/tenantHelpers.js`

```javascript
/**
 * Check if tenant is an education tenant
 * @param {string} tenantId - Tenant ID
 * @returns {boolean} True if education tenant
 */
async function isEducationTenant(tenantId) {
  // Option A: Check tenants.vertical column
  const query = `
    SELECT vertical FROM tenants 
    WHERE id = $1 AND is_deleted = false
  `;
  
  const result = await db.query(query, [tenantId]);
  const tenant = result.rows[0];
  
  return tenant && tenant.vertical === 'education';

  // Option B: Check tenant_features table
  // const query = `
  //   SELECT enabled FROM tenant_features
  //   WHERE tenant_id = $1 AND feature_key = 'education_vertical'
  // `;
  // const result = await db.query(query, [tenantId]);
  // return result.rows[0]?.enabled === true;
}

module.exports = { isEducationTenant };
```

### `services/educationStudentsService.js`

```javascript
const educationStudentsRepository = require('../repositories/educationStudentsRepository');
const leadsRepository = require('../repositories/leadsRepository');
const { isEducationTenant } = require('./utils/tenantHelpers');
const logger = require('../../../utils/logger');

/**
 * Create a new student (lead + education_students)
 * @param {Object} params - Student data
 * @returns {Object} Created student with lead data
 */
async function createStudent({ schema, tenantId, userId, studentData }) {
  // Validate tenant is education vertical
  const isEducation = await isEducationTenant(tenantId);
  if (!isEducation) {
    throw new Error('Education vertical not enabled for this tenant');
  }

  logger.info('Creating student', { tenantId, userId });

  try {
    // 1. Create lead first
    const leadData = {
      name: studentData.name,
      email: studentData.email,
      phone: studentData.phone,
      company: studentData.company,
      value: studentData.value,
      stage: studentData.stage || 'new',
      status: studentData.status || 'active',
      source: studentData.source,
      priority: studentData.priority,
      assigned_user_id: studentData.assigned_user_id,
    };

    const lead = await leadsRepository.createLead({ schema, tenantId, userId, leadData });

    // 2. Create education_students record
    const student = await educationStudentsRepository.createEducationStudent({
      schema,
      tenantId,
      leadId: lead.id,
      studentData,
    });

    logger.info('Student created successfully', { 
      tenantId, 
      userId, 
      leadId: lead.id,
      studentId: student.id 
    });

    return {
      ...lead,
      student,
    };
  } catch (error) {
    logger.error('Failed to create student', { tenantId, userId, error: error.message });
    throw error;
  }
}

/**
 * Get students with filters (respects counsellor scoping)
 * @param {Object} params - Query params
 * @returns {Array} Students with lead data
 */
async function getStudents({ schema, tenantId, userId, isAdmin, filters }) {
  const isEducation = await isEducationTenant(tenantId);
  if (!isEducation) {
    throw new Error('Education vertical not enabled for this tenant');
  }

  // Get leads (with counsellor scoping if not admin)
  const leads = await leadsRepository.getLeads({
    schema,
    tenantId,
    userId: isAdmin ? null : userId, // Only scope if not admin
    isAdmin,
    filters,
  });

  // Fetch education_students for each lead
  const students = await Promise.all(
    leads.map(async (lead) => {
      const student = await educationStudentsRepository.getStudentByLeadId({
        schema,
        tenantId,
        leadId: lead.id,
      });

      return {
        ...lead,
        student,
      };
    })
  );

  return students;
}

// ... other service methods (getStudent, updateStudent, deleteStudent, assignCounsellor)

module.exports = {
  createStudent,
  getStudents,
  // ... other exports
};
```

---

## 3. Controller Layer (Request/Response Only)

### `controllers/educationStudentsController.js`

```javascript
const educationStudentsService = require('../services/educationStudentsService');
const studentValidator = require('../validators/studentValidator');
const { studentToApi } = require('../dtos/studentDto');
const logger = require('../../../utils/logger');

/**
 * GET /api/deals-pipeline/students
 * List all students for tenant (respects counsellor scoping)
 */
async function listStudents(req, res) {
  try {
    const schema = getSchema(req);
    const tenantId = req.user.tenantId; // From JWT
    const userId = req.user.id;
    const isAdmin = req.user.capabilities.includes('education.admin');

    const filters = {
      stage: req.query.stage,
      status: req.query.status,
      education_level: req.query.education_level,
      target_country: req.query.target_country,
      search: req.query.search,
    };

    const students = await educationStudentsService.getStudents({
      schema,
      tenantId,
      userId,
      isAdmin,
      filters,
    });

    // Transform to API format
    const apiStudents = students.map(studentToApi);

    res.json(apiStudents);
  } catch (error) {
    logger.error('Failed to list students', { 
      tenantId: req.user.tenantId, 
      userId: req.user.id,
      error: error.message 
    });
    
    res.status(error.message.includes('not enabled') ? 403 : 500).json({
      error: error.message,
    });
  }
}

/**
 * POST /api/deals-pipeline/students
 * Create a new student
 */
async function createStudent(req, res) {
  try {
    // Validate request body
    const { error, value } = studentValidator.validateCreate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const schema = getSchema(req);
    const tenantId = req.user.tenantId; // From JWT (NOT from request body)
    const userId = req.user.id;

    const student = await educationStudentsService.createStudent({
      schema,
      tenantId,
      userId,
      studentData: value,
    });

    res.status(201).json(studentToApi(student));
  } catch (error) {
    logger.error('Failed to create student', { 
      tenantId: req.user.tenantId, 
      userId: req.user.id,
      error: error.message 
    });
    
    res.status(error.message.includes('not enabled') ? 403 : 500).json({
      error: error.message,
    });
  }
}

// ... other controller methods (getStudent, updateStudent, deleteStudent, assignCounsellor)

module.exports = {
  listStudents,
  createStudent,
  // ... other exports
};
```

---

## 4. DTOs (Field Mapping)

### `dtos/studentDto.js`

```javascript
/**
 * Transform student from DB format to API format
 * @param {Object} student - Student from database
 * @returns {Object} API format student
 */
function studentToApi(student) {
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    company: student.company,
    value: student.value,
    stage: student.stage,
    status: student.status,
    source: student.source,
    priority: student.priority,
    assigned_user_id: student.assigned_user_id,
    created_at: student.created_at,
    updated_at: student.updated_at,
    tenant_id: student.tenant_id,
    
    // Education-specific fields
    student: student.student ? {
      id: student.student.id,
      lead_id: student.student.lead_id,
      current_education_level: student.student.current_education_level,
      current_institution: student.student.current_institution,
      gpa: student.student.gpa,
      graduation_year: student.student.graduation_year,
      target_degree: student.student.target_degree,
      target_major: student.student.target_major,
      target_universities: student.student.target_universities,
      target_countries: student.student.target_countries,
      sat_score: student.student.sat_score,
      act_score: student.student.act_score,
      toefl_score: student.student.toefl_score,
      ielts_score: student.student.ielts_score,
      gre_score: student.student.gre_score,
      gmat_score: student.student.gmat_score,
      budget_range: student.student.budget_range,
      preferred_intake: student.student.preferred_intake,
      scholarship_interest: student.student.scholarship_interest,
      created_at: student.student.created_at,
      updated_at: student.student.updated_at,
    } : null,
  };
}

/**
 * Transform from API format to DB format
 * @param {Object} apiStudent - Student from API request
 * @returns {Object} DB format student
 */
function studentFromApi(apiStudent) {
  // Extract lead fields vs student fields
  return {
    leadData: {
      name: apiStudent.name,
      email: apiStudent.email,
      phone: apiStudent.phone,
      company: apiStudent.company,
      value: apiStudent.value,
      stage: apiStudent.stage,
      status: apiStudent.status,
      source: apiStudent.source,
      priority: apiStudent.priority,
      assigned_user_id: apiStudent.assigned_user_id,
    },
    studentData: {
      current_education_level: apiStudent.current_education_level,
      current_institution: apiStudent.current_institution,
      gpa: apiStudent.gpa,
      graduation_year: apiStudent.graduation_year,
      target_degree: apiStudent.target_degree,
      target_major: apiStudent.target_major,
      target_universities: apiStudent.target_universities,
      target_countries: apiStudent.target_countries,
      sat_score: apiStudent.sat_score,
      act_score: apiStudent.act_score,
      toefl_score: apiStudent.toefl_score,
      ielts_score: apiStudent.ielts_score,
      gre_score: apiStudent.gre_score,
      gmat_score: apiStudent.gmat_score,
      budget_range: apiStudent.budget_range,
      preferred_intake: apiStudent.preferred_intake,
      scholarship_interest: apiStudent.scholarship_interest,
    },
  };
}

module.exports = {
  studentToApi,
  studentFromApi,
};
```

---

## 5. Routes

### `routes/studentsRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const educationStudentsController = require('../controllers/educationStudentsController');
const { authenticate } = require('../../../middleware/auth');
const { requireCapability } = require('../../../middleware/capabilities');

// All routes require authentication
router.use(authenticate);

// List students (counsellors see only assigned, admins see all)
router.get('/', 
  requireCapability('education.students.view'),
  educationStudentsController.listStudents
);

// Get single student
router.get('/:id',
  requireCapability('education.students.view'),
  educationStudentsController.getStudent
);

// Create student
router.post('/',
  requireCapability('education.students.create'),
  educationStudentsController.createStudent
);

// Update student
router.put('/:id',
  requireCapability('education.students.edit'),
  educationStudentsController.updateStudent
);

// Delete student
router.delete('/:id',
  requireCapability('education.students.delete'),
  educationStudentsController.deleteStudent
);

// Assign counsellor to student
router.post('/:id/assign-counsellor',
  requireCapability('education.students.assign'),
  educationStudentsController.assignCounsellor
);

module.exports = router;
```

### Update `routes/index.js` (deals-pipeline feature routes)

```javascript
const studentsRoutes = require('./studentsRoutes');

// Register education routes
router.use('/students', studentsRoutes);
```

---

## 6. Validators

### `validators/studentValidator.js`

```javascript
const Joi = require('joi');

const studentSchema = Joi.object({
  // Lead fields
  name: Joi.string().required().max(255),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional().max(50),
  company: Joi.string().optional().max(255),
  value: Joi.number().optional().min(0),
  stage: Joi.string().optional(),
  status: Joi.string().optional(),
  source: Joi.string().optional(),
  priority: Joi.string().optional(),
  assigned_user_id: Joi.string().uuid().optional(),

  // Education fields
  current_education_level: Joi.string().valid('high_school', 'bachelors', 'masters', 'phd').optional(),
  current_institution: Joi.string().max(255).optional(),
  gpa: Joi.number().min(0).max(4).optional(),
  graduation_year: Joi.number().integer().min(1950).max(2100).optional(),
  target_degree: Joi.string().max(100).optional(),
  target_major: Joi.string().max(100).optional(),
  target_universities: Joi.array().items(Joi.string()).optional(),
  target_countries: Joi.array().items(Joi.string()).optional(),
  sat_score: Joi.number().integer().min(400).max(1600).optional(),
  act_score: Joi.number().integer().min(1).max(36).optional(),
  toefl_score: Joi.number().integer().min(0).max(120).optional(),
  ielts_score: Joi.number().min(0).max(9).optional(),
  gre_score: Joi.number().integer().min(260).max(340).optional(),
  gmat_score: Joi.number().integer().min(200).max(800).optional(),
  budget_range: Joi.string().max(50).optional(),
  preferred_intake: Joi.string().max(50).optional(),
  scholarship_interest: Joi.boolean().optional(),
});

function validateCreate(data) {
  return studentSchema.validate(data);
}

function validateUpdate(data) {
  return studentSchema.fork(Object.keys(studentSchema.describe().keys), (schema) => schema.optional()).validate(data);
}

module.exports = {
  validateCreate,
  validateUpdate,
};
```

---

## 7. Capabilities (RBAC)

Add these capabilities to your RBAC system:

```javascript
const EDUCATION_CAPABILITIES = [
  'education.students.view',    // View students list and details
  'education.students.create',  // Create new students
  'education.students.edit',    // Update student information
  'education.students.delete',  // Delete students
  'education.students.assign',  // Assign counsellors to students
  'education.admin',            // Full education admin access
];
```

---

## Testing Checklist

### Unit Tests
- [ ] Repository tests with tenant isolation
- [ ] Service tests for business logic
- [ ] DTO transformation tests
- [ ] Validator tests

### Integration Tests
- [ ] Create student flow
- [ ] List students with counsellor scoping
- [ ] Update student (lead + education_students)
- [ ] Delete student (soft delete both)
- [ ] Assign counsellor
- [ ] Feature flag enforcement

### Security Tests
- [ ] Tenant isolation (cannot access other tenant's students)
- [ ] Counsellor scoping (counsellors only see assigned)
- [ ] Feature flag gating (non-education tenants get 403)
- [ ] RBAC capabilities enforced

---

## Deployment Checklist

- [ ] Run migration SQL
- [ ] Verify indexes created
- [ ] Add capabilities to RBAC system
- [ ] Update tenant records with vertical = 'education'
- [ ] Test feature flag system
- [ ] Deploy backend
- [ ] Test all endpoints with Postman
- [ ] Deploy frontend
- [ ] End-to-end testing

---

**End of Backend Architecture Blueprint**
