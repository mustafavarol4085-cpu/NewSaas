-- =====================================================
-- ADMIN ROLE-BASED ACCESS CONTROL (RBAC)
-- =====================================================

-- Helper function: checks if current JWT role is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() ->> 'role') = 'admin', false);
$$;

-- Apply admin full-access policy across key app tables (if they exist)
DO $$
DECLARE
  tbl text;
  target_tables text[] := ARRAY[
    'calls',
    'analysis',
    'transcripts',
    'ai_insights',
    'reps',
    'managers',
    'scheduled_calls',
    'key_moments',
    'agent_analysis',
    'objections',
    'questions',
    'rep_skills',
    'coaching_plans',
    'deal_predictions',
    'master_coach_reports',
    'customer_profiles',
    'golden_calls',
    'golden_call_comparisons',
    'kb_documents',
    'kb_chunks',
    'kb_search_logs',
    'kb_coaching_references',
    'benchmark_transcripts',
    'custom_scoring_rubric'
  ];
BEGIN
  FOREACH tbl IN ARRAY target_tables
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "admin_full_access" ON public.%I', tbl);
      EXECUTE format(
        'CREATE POLICY "admin_full_access" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())',
        tbl
      );
    END IF;
  END LOOP;
END $$;