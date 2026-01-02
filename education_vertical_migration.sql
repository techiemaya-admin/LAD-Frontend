-- =============================================
-- Education Vertical Database Migration
-- =============================================
-- This migration adds education-specific tables to support
-- the Education vertical (G-Links) feature in LAD
-- =============================================

-- Table: education_students
-- Purpose: Store education-specific data for leads in the education vertical
-- Relationship: 1:1 with leads table via lead_id
CREATE TABLE IF NOT EXISTS education_students (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    lead_id VARCHAR(36) NOT NULL,
    tenant_id VARCHAR(36) NOT NULL,
    
    -- Current Education
    current_education_level VARCHAR(50), -- 'high_school', 'bachelors', 'masters', 'phd'
    current_institution VARCHAR(255),
    gpa DECIMAL(3, 2), -- 0.00 to 4.00
    graduation_year INTEGER,
    
    -- Target Information
    target_degree VARCHAR(100),
    target_major VARCHAR(100),
    target_universities TEXT[], -- Array of university names
    target_countries TEXT[], -- Array of country codes
    
    -- Test Scores
    sat_score INTEGER, -- 400-1600
    act_score INTEGER, -- 1-36
    toefl_score INTEGER, -- 0-120
    ielts_score DECIMAL(2, 1), -- 0.0-9.0
    gre_score INTEGER, -- 260-340
    gmat_score INTEGER, -- 200-800
    
    -- Preferences
    budget_range VARCHAR(50), -- e.g., '50k-100k', '100k-150k'
    preferred_intake VARCHAR(50), -- e.g., 'Fall 2025', 'Spring 2026'
    scholarship_interest BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    
    -- Constraints
    CONSTRAINT fk_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT unique_lead_student UNIQUE (lead_id)
);

-- Indexes for performance
CREATE INDEX idx_education_students_tenant ON education_students(tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_education_students_lead ON education_students(lead_id) WHERE is_deleted = false;
CREATE INDEX idx_education_students_education_level ON education_students(current_education_level) WHERE is_deleted = false;
CREATE INDEX idx_education_students_target_countries ON education_students USING GIN (target_countries) WHERE is_deleted = false;

-- =============================================

-- Table: education_counsellors (Optional - if counsellors need specialized data)
-- Purpose: Store counsellor-specific information
-- Relationship: 1:1 with users table via user_id
-- Note: This is optional - you can also just use users table with a 'counsellor' role
CREATE TABLE IF NOT EXISTS education_counsellors (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    user_id VARCHAR(36) NOT NULL,
    tenant_id VARCHAR(36) NOT NULL,
    
    -- Counsellor Information
    specialization TEXT[], -- Array of specializations (e.g., 'MBA', 'Engineering', 'Medicine')
    countries_expertise TEXT[], -- Array of countries they specialize in
    languages TEXT[], -- Array of languages spoken
    experience_years INTEGER,
    
    -- Availability
    is_active BOOLEAN DEFAULT true,
    max_students INTEGER DEFAULT 50, -- Maximum students they can handle
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    
    -- Constraints
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_counsellor FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_counsellor UNIQUE (user_id)
);

-- Indexes for performance
CREATE INDEX idx_education_counsellors_tenant ON education_counsellors(tenant_id) WHERE is_deleted = false AND is_active = true;
CREATE INDEX idx_education_counsellors_user ON education_counsellors(user_id) WHERE is_deleted = false;
CREATE INDEX idx_education_counsellors_specialization ON education_counsellors USING GIN (specialization) WHERE is_deleted = false;

-- =============================================

-- Table: lead_bookings (May already exist - this is reference schema)
-- Purpose: Store appointment bookings between students and counsellors
-- Note: Check if this table already exists in your schema
CREATE TABLE IF NOT EXISTS lead_bookings (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    tenant_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL, -- References education_students.id OR leads.id
    lead_id VARCHAR(36) NOT NULL,
    counsellor_id VARCHAR(36) NOT NULL, -- References users.id or education_counsellors.user_id
    assigned_user_id VARCHAR(36), -- User who assigned this booking
    
    -- Booking Details
    booking_type VARCHAR(50) NOT NULL, -- 'manual_followup', 'initial_consult', 'application_review', etc.
    booking_source VARCHAR(50) DEFAULT 'user_ui', -- 'user_ui', 'automated', 'api'
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show'
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    
    -- Constraints
    CONSTRAINT fk_booking_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_counsellor FOREIGN KEY (counsellor_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_lead_bookings_tenant ON lead_bookings(tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_lead_bookings_student ON lead_bookings(student_id) WHERE is_deleted = false;
CREATE INDEX idx_lead_bookings_counsellor ON lead_bookings(counsellor_id) WHERE is_deleted = false;
CREATE INDEX idx_lead_bookings_date ON lead_bookings(booking_date) WHERE is_deleted = false;
CREATE INDEX idx_lead_bookings_status ON lead_bookings(status) WHERE is_deleted = false;

-- =============================================

-- Add assigned_user_id to leads table (if it doesn't exist)
-- Purpose: Track which counsellor is assigned to a lead/student
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'assigned_user_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN assigned_user_id VARCHAR(36);
        ALTER TABLE leads ADD CONSTRAINT fk_leads_assigned_user 
            FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX idx_leads_assigned_user ON leads(assigned_user_id) WHERE is_deleted = false;
    END IF;
END $$;

-- =============================================

-- Feature Flag / Vertical Configuration
-- Option A: Add vertical column to tenants table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'vertical'
    ) THEN
        ALTER TABLE tenants ADD COLUMN vertical VARCHAR(50) DEFAULT 'default';
        CREATE INDEX idx_tenants_vertical ON tenants(vertical);
        
        -- Possible values: 'default', 'education', 'saas', 'realestate'
        COMMENT ON COLUMN tenants.vertical IS 'Business vertical: default, education, saas, realestate';
    END IF;
END $$;

-- Option B: Use tenant_features table (if you have one)
-- INSERT INTO tenant_features (tenant_id, feature_key, enabled)
-- VALUES ('tenant-uuid', 'education_vertical', true)
-- WHERE NOT EXISTS (
--     SELECT 1 FROM tenant_features 
--     WHERE tenant_id = 'tenant-uuid' AND feature_key = 'education_vertical'
-- );

-- =============================================

-- Sample Data (for testing only - remove in production)
-- Uncomment to insert sample data

-- INSERT INTO tenants (id, name, vertical) VALUES
-- ('test-tenant-1', 'Test Education Org', 'education')
-- ON CONFLICT (id) DO UPDATE SET vertical = 'education';

-- =============================================
-- END OF MIGRATION
-- =============================================

-- Post-Migration Validation Queries
-- Run these after migration to verify everything is set up correctly

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('education_students', 'education_counsellors', 'lead_bookings')
ORDER BY table_name;

-- Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('education_students', 'education_counsellors', 'lead_bookings')
ORDER BY tablename, indexname;

-- Check foreign key constraints
SELECT
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('education_students', 'education_counsellors', 'lead_bookings')
ORDER BY tc.table_name, tc.constraint_name;
