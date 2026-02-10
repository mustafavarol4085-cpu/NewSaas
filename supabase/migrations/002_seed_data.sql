-- =====================================================
-- SEED DATA - Test data for sales performance dashboard
-- =====================================================

-- First, clean existing test data (optional)
-- DELETE FROM key_moments;
-- DELETE FROM ai_insights;
-- DELETE FROM scheduled_calls;
-- DELETE FROM transcripts;
-- DELETE FROM analysis WHERE call_id NOT IN (SELECT id FROM calls WHERE external_call_id LIKE 'fake-call%');
-- DELETE FROM calls WHERE external_call_id NOT LIKE 'fake-call%';

-- 0. AUTH USERS - Create demo auth users (run this manually in Supabase Auth)
-- Note: These users need to be created via Supabase Auth Admin API or Dashboard
-- For demo mode, the app uses localStorage. For production:
-- 
-- Create via Supabase Dashboard > Authentication > Users:
-- 1. Email: rep@example.com, Password: demo123, User Metadata: {"name": "Sarah Johnson", "role": "rep"}
-- 2. Email: manager@example.com, Password: demo123, User Metadata: {"name": "John Manager", "role": "manager"}
--
-- Or use this SQL (if you have direct access to auth schema):
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
-- VALUES 
-- ('a0000000-0000-0000-0000-000000000001'::uuid, 'rep@example.com', crypt('demo123', gen_salt('bf')), now(), '{"name": "Sarah Johnson", "role": "rep"}'::jsonb, now(), now()),
-- ('b0000000-0000-0000-0000-000000000001'::uuid, 'manager@example.com', crypt('demo123', gen_salt('bf')), now(), '{"name": "John Manager", "role": "manager"}'::jsonb, now(), now())
-- ON CONFLICT (email) DO NOTHING;

-- 1. REPS - Sales Representatives
-- Note: Since auth.users doesn't have these users yet, we need to remove the FK constraint temporarily
-- or create standalone reps first

-- First, drop the foreign key constraint temporarily
ALTER TABLE reps DROP CONSTRAINT IF EXISTS reps_id_fkey;

-- Insert reps with generated IDs
INSERT INTO reps (id, name, email, hire_date, status) VALUES
('a0000000-0000-0000-0000-000000000001'::uuid, 'Sarah Johnson', 'rep@example.com', '2024-06-15', 'active'),
('a0000000-0000-0000-0000-000000000002'::uuid, 'Tom Martinez', 'tom.martinez@company.com', '2025-01-10', 'active'),
('a0000000-0000-0000-0000-000000000003'::uuid, 'Emma Rodriguez', 'emma.rodriguez@company.com', '2023-09-20', 'active')
ON CONFLICT (email) DO NOTHING;

-- 2. MANAGERS
-- Same approach - drop FK constraint and use fixed IDs
ALTER TABLE managers DROP CONSTRAINT IF EXISTS managers_id_fkey;

INSERT INTO managers (id, name, email, team_name) VALUES
('b0000000-0000-0000-0000-000000000001'::uuid, 'John Manager', 'manager@example.com', 'Sales Team Alpha')
ON CONFLICT (email) DO NOTHING;

-- 3. Update existing CALLS with additional info
-- Drop FK constraint temporarily to allow rep_id updates
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_rep_id_fkey;

-- Update all existing calls with complete information
UPDATE calls 
SET 
  company = CASE 
    WHEN customer_name = 'Michael Chen' THEN 'TechSolutions Inc.'
    WHEN customer_name = 'Jennifer Wu' THEN 'MarketPro'
    WHEN customer_name = 'David Kim' THEN 'FinanceHub'
    WHEN customer_name = 'Test Customer' THEN 'Test Company Inc.'
    ELSE 'Unknown Company'
  END,
  industry = CASE
    WHEN customer_name = 'Michael Chen' THEN 'Cloud Migration'
    WHEN customer_name = 'Jennifer Wu' THEN 'Marketing Automation'
    WHEN customer_name = 'David Kim' THEN 'Financial Services'
    WHEN customer_name = 'Test Customer' THEN 'Technology'
    ELSE 'Technology'
  END,
  duration_seconds = CASE
    WHEN external_call_id = 'fake-call-001' THEN 1320  -- 22 min
    WHEN external_call_id = 'fake-call-002' THEN 660   -- 11 min
    WHEN external_call_id = 'fake-call-003' THEN 1080  -- 18 min
    WHEN started_at IS NOT NULL AND ended_at IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER
    ELSE 900
  END,
  outcome = CASE
    WHEN external_call_id = 'fake-call-001' THEN 'Demo Scheduled for Tuesday 2 PM'
    WHEN external_call_id = 'fake-call-002' THEN 'Prospect not interested'
    WHEN external_call_id = 'fake-call-003' THEN 'Proposal sent, follow-up on Friday'
    WHEN status = 'completed' THEN 'Call completed'
    ELSE 'In Progress'
  END,
  audio_url = CASE
    WHEN external_call_id = 'fake-call-001' THEN 'https://example.com/audio/fake-call-001.mp3'
    WHEN external_call_id = 'fake-call-002' THEN 'https://example.com/audio/fake-call-002.mp3'
    WHEN external_call_id = 'fake-call-003' THEN 'https://example.com/audio/fake-call-003.mp3'
    ELSE NULL
  END,
  rep_id = CASE
    WHEN rep_name = 'Sarah Johnson' THEN 'a0000000-0000-0000-0000-000000000001'::uuid
    WHEN rep_name = 'Tom Martinez' THEN 'a0000000-0000-0000-0000-000000000002'::uuid
    WHEN rep_name = 'Emma Rodriguez' THEN 'a0000000-0000-0000-0000-000000000003'::uuid
    ELSE NULL
  END
WHERE company IS NULL OR industry IS NULL OR duration_seconds IS NULL;

-- 4. TRANSCRIPTS - Add segments to existing transcripts
UPDATE transcripts
SET segments = CASE
  WHEN call_id = (SELECT id FROM calls WHERE external_call_id = 'fake-call-001' LIMIT 1) THEN
    '[
      {"timestamp": "00:00", "speaker": "rep", "text": "Good morning, this is Sarah Johnson from TechSolutions. Am I speaking with Michael Chen?"},
      {"timestamp": "00:05", "speaker": "customer", "text": "Yes, that is me. Hi Sarah."},
      {"timestamp": "00:08", "speaker": "rep", "text": "Great! Thanks for taking my call, Michael. I see you recently downloaded our whitepaper on cloud migration strategies."}
    ]'::JSONB
  WHEN call_id = (SELECT id FROM calls WHERE external_call_id = 'fake-call-002' LIMIT 1) THEN
    '[
      {"timestamp": "00:00", "speaker": "rep", "text": "Hi, is this Jennifer?"},
      {"timestamp": "00:02", "speaker": "customer", "text": "Yes, who is calling?"},
      {"timestamp": "00:05", "speaker": "rep", "text": "This is Tom from MarketPro. I wanted to talk to you about our marketing automation software."}
    ]'::JSONB
  WHEN call_id = (SELECT id FROM calls WHERE external_call_id = 'fake-call-003' LIMIT 1) THEN
    '[
      {"timestamp": "00:00", "speaker": "rep", "text": "Hello David, this is Emma Rodriguez from FinanceHub. Thanks for scheduling this call with me."},
      {"timestamp": "00:06", "speaker": "customer", "text": "Hi Emma, yes, I have been looking into your platform for our accounting needs."}
    ]'::JSONB
  ELSE segments
END
WHERE call_id IN (
  SELECT id FROM calls WHERE external_call_id IN ('fake-call-001', 'fake-call-002', 'fake-call-003')
);

-- 5. AI_INSIGHTS
INSERT INTO ai_insights (call_id, timestamp, type, text, category) VALUES
-- Sarah's call insights
((SELECT id FROM calls WHERE external_call_id = 'fake-call-001' LIMIT 1), '03:15', 'positive', 
 'Great open-ended question: "What challenges are you facing with your current solution?"', 'discovery'),
 
((SELECT id FROM calls WHERE external_call_id = 'fake-call-001' LIMIT 1), '08:45', 'positive',
 'Excellent objection handling using ROI data to address pricing concern', 'objection_handling'),
 
((SELECT id FROM calls WHERE external_call_id = 'fake-call-001' LIMIT 1), '12:20', 'improvement',
 'Missed opportunity to create urgency. Try: "Based on your Q1 timeline, would you be comfortable moving forward by March 31st?"', 'closing'),

-- Tom's call insights  
((SELECT id FROM calls WHERE external_call_id = 'fake-call-002' LIMIT 1), '01:20', 'improvement',
 'Avoid leading with product features. Start with discovery questions about customer needs.', 'discovery'),
 
((SELECT id FROM calls WHERE external_call_id = 'fake-call-002' LIMIT 1), '03:30', 'warning',
 'Customer expressed disinterest multiple times. Recognize buying signals and know when to pivot.', 'objection_handling'),

-- Emma's call insights
((SELECT id FROM calls WHERE external_call_id = 'fake-call-003' LIMIT 1), '02:45', 'positive',
 'Perfect SPIN question: "What''s the impact of this problem on your team?"', 'discovery'),
 
((SELECT id FROM calls WHERE external_call_id = 'fake-call-003' LIMIT 1), '05:20', 'positive',
 'Exceptional active listening - paraphrased customer''s pain point accurately', 'rapport_building')
ON CONFLICT DO NOTHING;

-- 6. KEY_MOMENTS
INSERT INTO key_moments (call_id, time, label, type) VALUES
-- Sarah's call
((SELECT id FROM calls WHERE external_call_id = 'fake-call-001' LIMIT 1), '03:20', 'Discovery Phase', 'milestone'),
((SELECT id FROM calls WHERE external_call_id = 'fake-call-001' LIMIT 1), '08:15', 'Objection Handled', 'success'),
((SELECT id FROM calls WHERE external_call_id = 'fake-call-001' LIMIT 1), '13:40', 'Demo Scheduled', 'success'),

-- Tom's call
((SELECT id FROM calls WHERE external_call_id = 'fake-call-002' LIMIT 1), '01:00', 'Introduction', 'milestone'),
((SELECT id FROM calls WHERE external_call_id = 'fake-call-002' LIMIT 1), '03:30', 'Objection Raised', 'warning'),
((SELECT id FROM calls WHERE external_call_id = 'fake-call-002' LIMIT 1), '05:45', 'Call Ended', 'milestone'),

-- Emma's call
((SELECT id FROM calls WHERE external_call_id = 'fake-call-003' LIMIT 1), '01:15', 'Discovery Phase', 'milestone'),
((SELECT id FROM calls WHERE external_call_id = 'fake-call-003' LIMIT 1), '04:30', 'Pain Point Identified', 'success'),
((SELECT id FROM calls WHERE external_call_id = 'fake-call-003' LIMIT 1), '07:00', 'Next Steps Set', 'success')
ON CONFLICT DO NOTHING;

-- 7. SCHEDULED_CALLS
INSERT INTO scheduled_calls (rep_id, customer_name, company, call_type, scheduled_date, duration_minutes, priority, notes, preparation_tips, linkedin_url, status) VALUES
(
  (SELECT id FROM reps WHERE name = 'Sarah Johnson' LIMIT 1),
  'Robert Anderson',
  'TechFlow Inc.',
  'Discovery',
  '2026-01-26 10:00:00+00',
  30,
  'high',
  'C-level stakeholder. Focus on scalability pain points.',
  '["Review their recent product launch announcement", "Prepare ROI calculator for enterprise tier", "Research competitor solutions they''re currently using"]'::JSONB,
  'https://linkedin.com/in/robert-anderson',
  'scheduled'
),
(
  (SELECT id FROM reps WHERE name = 'Sarah Johnson' LIMIT 1),
  'Lisa Martinez',
  'CloudNine Solutions',
  'Demo',
  '2026-01-26 14:00:00+00',
  45,
  'medium',
  'Follow-up from discovery. Demo custom integration features.',
  '["Set up demo environment with their use case", "Prepare integration architecture diagram"]'::JSONB,
  'https://linkedin.com/in/lisa-martinez',
  'scheduled'
),
(
  (SELECT id FROM reps WHERE name = 'Emma Rodriguez' LIMIT 1),
  'James Park',
  'DataVault Systems',
  'Follow-up',
  '2026-01-26 16:30:00+00',
  20,
  'high',
  'Address security concerns from last call. Close deal.',
  '["Prepare security compliance documentation", "Have pricing proposal ready", "Prepare urgency talking points (Q1 deadline)"]'::JSONB,
  'https://linkedin.com/in/james-park',
  'scheduled'
),
(
  (SELECT id FROM reps WHERE name = 'Tom Martinez' LIMIT 1),
  'Michelle Adams',
  'StartupXYZ',
  'Discovery',
  '2026-01-26 11:00:00+00',
  30,
  'medium',
  'Inbound lead from website. Qualify and understand needs.',
  '["Review their website and product", "Prepare discovery questions"]'::JSONB,
  'https://linkedin.com/in/michelle-adams',
  'scheduled'
)
ON CONFLICT DO NOTHING;

-- Verification queries
SELECT 'Reps:', COUNT(*) FROM reps;
SELECT 'Managers:', COUNT(*) FROM managers;
SELECT 'Calls:', COUNT(*) FROM calls;
SELECT 'Analysis:', COUNT(*) FROM analysis;
SELECT 'Transcripts:', COUNT(*) FROM transcripts;
SELECT 'AI Insights:', COUNT(*) FROM ai_insights;
SELECT 'Key Moments:', COUNT(*) FROM key_moments;
SELECT 'Scheduled Calls:', COUNT(*) FROM scheduled_calls;
