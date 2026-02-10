-- =====================================================
-- MISSING COLUMNS & IMPROVEMENTS
-- =====================================================

-- 1. Add missing columns to CALLS table
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS company VARCHAR(255),
ADD COLUMN IF NOT EXISTS industry VARCHAR(255),
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS outcome TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS rep_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure TRANSCRIPTS table has correct structure
-- The table already exists, so we'll add missing columns if needed
ALTER TABLE transcripts 
ADD COLUMN IF NOT EXISTS segments JSONB,
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Create AI_INSIGHTS table
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  timestamp VARCHAR(10), -- "03:15"
  type VARCHAR(50), -- 'positive', 'improvement', 'warning'
  text TEXT NOT NULL,
  category VARCHAR(100), -- 'discovery', 'objection_handling', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create REPS table
CREATE TABLE IF NOT EXISTS reps (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  manager_id UUID REFERENCES auth.users(id),
  hire_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive'
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create MANAGERS table  
CREATE TABLE IF NOT EXISTS managers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  team_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create SCHEDULED_CALLS table
CREATE TABLE IF NOT EXISTS scheduled_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  call_type VARCHAR(100), -- 'Discovery', 'Demo', 'Follow-up'
  scheduled_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  priority VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
  notes TEXT,
  preparation_tips JSONB, -- ["tip1", "tip2"]
  linkedin_url TEXT,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create KEY_MOMENTS table
CREATE TABLE IF NOT EXISTS key_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  time VARCHAR(10) NOT NULL, -- "03:20"
  label VARCHAR(255) NOT NULL, -- "Discovery Phase", "Objection Handled"
  type VARCHAR(50), -- 'milestone', 'warning', 'success'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calls_rep_id ON calls(rep_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_call_id ON analysis(call_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_call_id ON transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_call_id ON ai_insights(call_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_rep_id ON scheduled_calls(rep_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_date ON scheduled_calls(scheduled_date);

-- 9. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9b. Create trigger function that calls N8N via Edge Function
CREATE OR REPLACE FUNCTION trigger_n8n_on_call_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer status 'completed' olarak değişirse, Edge Function'ı çağır
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Network request - async (fire and forget)
    PERFORM net.http_post(
      'https://jytjdryjgcxgnfwlgtwc.supabase.co/functions/v1/trigger-email',
      jsonb_build_object('call_id', NEW.id::text)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Add triggers for updated_at
DROP TRIGGER IF EXISTS update_calls_updated_at ON calls;
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reps_updated_at ON reps;
CREATE TRIGGER update_reps_updated_at BEFORE UPDATE ON reps
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_managers_updated_at ON managers;
CREATE TRIGGER update_managers_updated_at BEFORE UPDATE ON managers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_calls_updated_at ON scheduled_calls;
CREATE TRIGGER update_scheduled_calls_updated_at BEFORE UPDATE ON scheduled_calls
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Enable Row Level Security (RLS)
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_moments ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS Policies

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Reps can view their own calls" ON calls;
DROP POLICY IF EXISTS "Managers can view all calls" ON calls;
DROP POLICY IF EXISTS "Users can view analysis of their calls" ON analysis;
DROP POLICY IF EXISTS "Users can view transcripts of their calls" ON transcripts;
DROP POLICY IF EXISTS "Users can view AI insights of their calls" ON ai_insights;
DROP POLICY IF EXISTS "Reps can view their scheduled calls" ON scheduled_calls;
DROP POLICY IF EXISTS "Reps can view their profile" ON reps;
DROP POLICY IF EXISTS "Managers can view all reps" ON reps;

-- Reps can see their own calls
CREATE POLICY "Reps can view their own calls" ON calls
FOR SELECT USING (rep_id = auth.uid());

-- Managers can see all calls of their team
CREATE POLICY "Managers can view all calls" ON calls
FOR SELECT USING (
  auth.uid() IN (SELECT id FROM managers)
);

-- Similar policies for other tables
CREATE POLICY "Users can view analysis of their calls" ON analysis
FOR SELECT USING (
  call_id IN (SELECT id FROM calls WHERE rep_id = auth.uid() OR auth.uid() IN (SELECT id FROM managers))
);

CREATE POLICY "Users can view transcripts of their calls" ON transcripts
FOR SELECT USING (
  call_id IN (SELECT id FROM calls WHERE rep_id = auth.uid() OR auth.uid() IN (SELECT id FROM managers))
);

CREATE POLICY "Users can view AI insights of their calls" ON ai_insights
FOR SELECT USING (
  call_id IN (SELECT id FROM calls WHERE rep_id = auth.uid() OR auth.uid() IN (SELECT id FROM managers))
);

CREATE POLICY "Reps can view their scheduled calls" ON scheduled_calls
FOR SELECT USING (rep_id = auth.uid() OR auth.uid() IN (SELECT id FROM managers));

CREATE POLICY "Reps can view their profile" ON reps
FOR SELECT USING (id = auth.uid() OR auth.uid() IN (SELECT id FROM managers));

CREATE POLICY "Managers can view all reps" ON reps
FOR SELECT USING (auth.uid() IN (SELECT id FROM managers));
