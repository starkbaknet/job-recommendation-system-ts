-- Database initialization script (without vectorization)
-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    reference VARCHAR(50) UNIQUE NOT NULL,
    number_of_vacancies INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft',
    is_open BOOLEAN DEFAULT TRUE,
    job_requirements TEXT,
    role_summary TEXT,
    duties_and_responsibilities TEXT,
    minimum_experience INTEGER,
    maximum_experience INTEGER,
    education_level VARCHAR(50),
    salary_type VARCHAR(20),
    minimum_salary DECIMAL(10, 2),
    maximum_salary DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    period VARCHAR(20) DEFAULT 'monthly',
    work_type VARCHAR(20) DEFAULT 'full_time',
    gender VARCHAR(20) DEFAULT 'any',
    nationality VARCHAR(100),
    language VARCHAR(100),
    publish_date DATE,
    expiry_date DATE,
    company_id UUID,
    company_name VARCHAR(255),
    company_is_public BOOLEAN DEFAULT FALSE,
    company_work_policy VARCHAR(20) DEFAULT 'hybrid',  -- remote, on-site, hybrid
    industry_type_id VARCHAR(50),
    industry_type_name VARCHAR(100),
    country_code VARCHAR(10),
    country_name VARCHAR(100),
    province_name VARCHAR(100),
    area_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create applicants table
CREATE TABLE IF NOT EXISTS applicants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    bio TEXT,
    nationality VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    country_code VARCHAR(10),
    country_name VARCHAR(100),
    province_name VARCHAR(100),
    speaking_languages TEXT, -- JSON array of languages
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create applicant skills table
CREATE TABLE IF NOT EXISTS applicant_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create applicant functional areas table
CREATE TABLE IF NOT EXISTS applicant_functional_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
    area_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create applicant education table
CREATE TABLE IF NOT EXISTS applicant_education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
    level VARCHAR(50) NOT NULL, -- high_school, associate, bachelor, master, phd
    institute_name VARCHAR(255) NOT NULL,
    field_of_study VARCHAR(255),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create applicant experience table
CREATE TABLE IF NOT EXISTS applicant_experience (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create applicant applied jobs table
CREATE TABLE IF NOT EXISTS applicant_applied_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'applied', -- applied, viewed, shortlisted, rejected, etc.
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(applicant_id, job_id) -- Prevent duplicate applications
);

-- Create applicant job interactions table
CREATE TABLE IF NOT EXISTS applicant_job_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- view, scroll, click, save, share, etc.
    time_spent_seconds INTEGER DEFAULT 0,
    scroll_depth INTEGER DEFAULT 0, -- Percentage of page scrolled (0-100)
    click_count INTEGER DEFAULT 0,
    metadata JSONB, -- Additional interaction data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status) WHERE is_open = true;
CREATE INDEX IF NOT EXISTS idx_jobs_area ON jobs(area_name);
CREATE INDEX IF NOT EXISTS idx_jobs_publish_date ON jobs(publish_date);
CREATE INDEX IF NOT EXISTS idx_applicants_country ON applicants(country_code);
CREATE INDEX IF NOT EXISTS idx_applicant_skills_applicant_id ON applicant_skills(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applicant_functional_areas_applicant_id ON applicant_functional_areas(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applicant_applied_jobs_applicant_id ON applicant_applied_jobs(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applicant_applied_jobs_job_id ON applicant_applied_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_applicant_job_interactions_applicant_id ON applicant_job_interactions(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applicant_job_interactions_job_id ON applicant_job_interactions(job_id);
CREATE INDEX IF NOT EXISTS idx_applicant_job_interactions_type ON applicant_job_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_applicant_job_interactions_created_at ON applicant_job_interactions(created_at DESC);

