-- Seed script for testing applied jobs and interactions
-- Applicant ID: 2085d6cd-b96a-4872-b61c-513feb652155

-- First, let's create a temporary function to get job IDs by reference
-- Then insert applied jobs and interactions

-- APPLIED JOBS (4 jobs - mix of high and medium scoring)
-- These represent jobs the applicant has actually applied to
INSERT INTO applicant_applied_jobs (applicant_id, job_id, status, applied_at, updated_at)
SELECT 
    '2085d6cd-b96a-4872-b61c-513feb652155'::uuid,
    id,
    'applied',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '5 days'
FROM jobs
WHERE reference IN (
    'JOB30675D51',  -- Risk Manager (high score)
    'JOBE2D29C01',  -- CFO (high score)
    'JOB0824458C',  -- Financial Analyst (high score)
    'JOB1D79B7E4'   -- Controller (high score)
)
ON CONFLICT (applicant_id, job_id) DO NOTHING;

-- INTERACTIONS (8 jobs with various engagement levels)
-- These represent different types of user interactions with jobs

-- High engagement interactions (viewed, scrolled, clicked, saved)
INSERT INTO applicant_job_interactions (
    applicant_id, 
    job_id, 
    interaction_type, 
    time_spent_seconds, 
    scroll_depth, 
    click_count, 
    metadata,
    created_at,
    updated_at
)
SELECT 
    '2085d6cd-b96a-4872-b61c-513feb652155'::uuid,
    id,
    'view',
    120,  -- 2 minutes
    85,   -- 85% scrolled
    3,    -- 3 clicks
    '{"device": "desktop", "source": "recommendations"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM jobs
WHERE reference = 'JOB7C8C7F93';  -- Risk Manager (high engagement)

INSERT INTO applicant_job_interactions (
    applicant_id, 
    job_id, 
    interaction_type, 
    time_spent_seconds, 
    scroll_depth, 
    click_count, 
    metadata,
    created_at,
    updated_at
)
SELECT 
    '2085d6cd-b96a-4872-b61c-513feb652155'::uuid,
    id,
    'save',
    45,   -- 45 seconds
    100,  -- fully scrolled
    5,    -- 5 clicks (very interested)
    '{"device": "mobile", "source": "search"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM jobs
WHERE reference = 'JOB44E2557A';  -- CFO (saved job)

INSERT INTO applicant_job_interactions (
    applicant_id, 
    job_id, 
    interaction_type, 
    time_spent_seconds, 
    scroll_depth, 
    click_count, 
    metadata,
    created_at,
    updated_at
)
SELECT 
    '2085d6cd-b96a-4872-b61c-513feb652155'::uuid,
    id,
    'click',
    90,   -- 1.5 minutes
    60,   -- 60% scrolled
    4,    -- 4 clicks
    '{"device": "desktop", "source": "recommendations"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
FROM jobs
WHERE reference = 'JOB53E23B37';  -- Risk Manager (clicked multiple times)

-- Medium engagement interactions
INSERT INTO applicant_job_interactions (
    applicant_id, 
    job_id, 
    interaction_type, 
    time_spent_seconds, 
    scroll_depth, 
    click_count, 
    metadata,
    created_at,
    updated_at
)
SELECT 
    '2085d6cd-b96a-4872-b61c-513feb652155'::uuid,
    id,
    'view',
    35,   -- 35 seconds
    40,   -- 40% scrolled
    1,    -- 1 click
    '{"device": "desktop", "source": "browse"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    CURRENT_TIMESTAMP - INTERVAL '4 days'
FROM jobs
WHERE reference = 'JOB444E1B2A';  -- CFO (medium engagement)

INSERT INTO applicant_job_interactions (
    applicant_id, 
    job_id, 
    interaction_type, 
    time_spent_seconds, 
    scroll_depth, 
    click_count, 
    metadata,
    created_at,
    updated_at
)
SELECT 
    '2085d6cd-b96a-4872-b61c-513feb652155'::uuid,
    id,
    'scroll',
    25,   -- 25 seconds
    55,   -- 55% scrolled
    2,    -- 2 clicks
    '{"device": "mobile", "source": "recommendations"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '6 days',
    CURRENT_TIMESTAMP - INTERVAL '6 days'
FROM jobs
WHERE reference = 'JOBAD44C062';  -- Controller (scrolled)

INSERT INTO applicant_job_interactions (
    applicant_id, 
    job_id, 
    interaction_type, 
    time_spent_seconds, 
    scroll_depth, 
    click_count, 
    metadata,
    created_at,
    updated_at
)
SELECT 
    '2085d6cd-b96a-4872-b61c-513feb652155'::uuid,
    id,
    'view',
    50,   -- 50 seconds
    70,   -- 70% scrolled
    2,    -- 2 clicks
    '{"device": "desktop", "source": "search"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    CURRENT_TIMESTAMP - INTERVAL '7 days'
FROM jobs
WHERE reference = 'JOB5641EDCA';  -- Tax Specialist (viewed)

-- Lower engagement interactions (quick views)
INSERT INTO applicant_job_interactions (
    applicant_id, 
    job_id, 
    interaction_type, 
    time_spent_seconds, 
    scroll_depth, 
    click_count, 
    metadata,
    created_at,
    updated_at
)
SELECT 
    '2085d6cd-b96a-4872-b61c-513feb652155'::uuid,
    id,
    'view',
    15,   -- 15 seconds (quick view)
    20,   -- 20% scrolled
    0,    -- no clicks
    '{"device": "mobile", "source": "browse"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    CURRENT_TIMESTAMP - INTERVAL '8 days'
FROM jobs
WHERE reference = 'JOBB7907A42';  -- Risk Manager (quick view)

INSERT INTO applicant_job_interactions (
    applicant_id, 
    job_id, 
    interaction_type, 
    time_spent_seconds, 
    scroll_depth, 
    click_count, 
    metadata,
    created_at,
    updated_at
)
SELECT 
    '2085d6cd-b96a-4872-b61c-513feb652155'::uuid,
    id,
    'view',
    20,   -- 20 seconds
    30,   -- 30% scrolled
    1,    -- 1 click
    '{"device": "desktop", "source": "recommendations"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '9 days',
    CURRENT_TIMESTAMP - INTERVAL '9 days'
FROM jobs
WHERE reference = 'JOB1F4A0CB2';  -- Compliance Officer (quick view)

-- Summary of what was created:
-- APPLIED JOBS: 4 jobs
--   - JOB30675D51 (Risk Manager)
--   - JOBE2D29C01 (CFO)
--   - JOB0824458C (Financial Analyst)
--   - JOB1D79B7E4 (Controller)

-- INTERACTIONS: 8 jobs with varying engagement
--   High engagement (engagement score >= 3):
--     - JOB7C8C7F93 (Risk Manager) - view, 120s, 85% scroll, 3 clicks = score 6
--     - JOB44E2557A (CFO) - save, 45s, 100% scroll, 5 clicks = score 10
--     - JOB53E23B37 (Risk Manager) - click, 90s, 60% scroll, 4 clicks = score 8
--   
--   Medium engagement (engagement score 2-3):
--     - JOB444E1B2A (CFO) - view, 35s, 40% scroll, 1 click = score 2
--     - JOBAD44C062 (Controller) - scroll, 25s, 55% scroll, 2 clicks = score 3
--     - JOB5641EDCA (Tax Specialist) - view, 50s, 70% scroll, 2 clicks = score 3
--   
--   Low engagement (engagement score < 3):
--     - JOBB7907A42 (Risk Manager) - view, 15s, 20% scroll, 0 clicks = score 1
--     - JOB1F4A0CB2 (Compliance Officer) - view, 20s, 30% scroll, 1 click = score 2

