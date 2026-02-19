-- =====================================================
-- CUSTOM BENCHMARKS & SCORING RUBRIC
-- =====================================================

-- 1. Benchmark transcripts selected by managers as gold standards
CREATE TABLE IF NOT EXISTS benchmark_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES managers(id) ON DELETE SET NULL,
  title VARCHAR(255),
  notes TEXT,
  is_approved_benchmark BOOLEAN DEFAULT FALSE,
  benchmark_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(call_id)
);

-- 2. Custom scoring rubric configurable by managers
CREATE TABLE IF NOT EXISTS custom_scoring_rubric (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES managers(id) ON DELETE CASCADE,
  dimension VARCHAR(100) NOT NULL,
  weight NUMERIC(5, 2) NOT NULL DEFAULT 0,
  criteria TEXT NOT NULL,
  examples TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_benchmark_transcripts_rep_id ON benchmark_transcripts(rep_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_transcripts_benchmark_date ON benchmark_transcripts(benchmark_date DESC);
CREATE INDEX IF NOT EXISTS idx_custom_scoring_rubric_manager_id ON custom_scoring_rubric(manager_id);
CREATE INDEX IF NOT EXISTS idx_custom_scoring_rubric_active ON custom_scoring_rubric(is_active) WHERE is_active = TRUE;

-- 4. Triggers for updated_at
DROP TRIGGER IF EXISTS update_benchmark_transcripts_updated_at ON benchmark_transcripts;
CREATE TRIGGER update_benchmark_transcripts_updated_at BEFORE UPDATE ON benchmark_transcripts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_custom_scoring_rubric_updated_at ON custom_scoring_rubric;
CREATE TRIGGER update_custom_scoring_rubric_updated_at BEFORE UPDATE ON custom_scoring_rubric
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE benchmark_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_scoring_rubric ENABLE ROW LEVEL SECURITY;

-- 6. Policies
DROP POLICY IF EXISTS "Managers can manage benchmark transcripts" ON benchmark_transcripts;
DROP POLICY IF EXISTS "Reps can view approved benchmark transcripts" ON benchmark_transcripts;
DROP POLICY IF EXISTS "Managers can manage custom scoring rubric" ON custom_scoring_rubric;
DROP POLICY IF EXISTS "Reps can view active custom scoring rubric" ON custom_scoring_rubric;

CREATE POLICY "Managers can manage benchmark transcripts" ON benchmark_transcripts
FOR ALL USING (auth.uid() IN (SELECT id FROM managers))
WITH CHECK (auth.uid() IN (SELECT id FROM managers));

CREATE POLICY "Reps can view approved benchmark transcripts" ON benchmark_transcripts
FOR SELECT USING (is_approved_benchmark = TRUE);

CREATE POLICY "Managers can manage custom scoring rubric" ON custom_scoring_rubric
FOR ALL USING (auth.uid() IN (SELECT id FROM managers))
WITH CHECK (auth.uid() IN (SELECT id FROM managers));

CREATE POLICY "Reps can view active custom scoring rubric" ON custom_scoring_rubric
FOR SELECT USING (is_active = TRUE);