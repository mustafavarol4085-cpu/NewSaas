-- Live Call Assistant: meeting link support + live session tracking

ALTER TABLE public.scheduled_calls
ADD COLUMN IF NOT EXISTS meeting_url TEXT,
ADD COLUMN IF NOT EXISTS meeting_provider VARCHAR(30),
ADD COLUMN IF NOT EXISTS join_instructions TEXT,
ADD COLUMN IF NOT EXISTS live_assistant_enabled BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.live_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_call_id UUID NOT NULL REFERENCES public.scheduled_calls(id) ON DELETE CASCADE,
  rep_id UUID NOT NULL REFERENCES public.reps(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active | ended | failed
  meeting_url_snapshot TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.live_transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_call_sessions(id) ON DELETE CASCADE,
  speaker VARCHAR(20), -- rep | customer | unknown
  text TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_calls_meeting_provider ON public.scheduled_calls(meeting_provider);
CREATE INDEX IF NOT EXISTS idx_live_call_sessions_scheduled_call ON public.live_call_sessions(scheduled_call_id);
CREATE INDEX IF NOT EXISTS idx_live_call_sessions_rep_id ON public.live_call_sessions(rep_id);
CREATE INDEX IF NOT EXISTS idx_live_transcript_segments_session ON public.live_transcript_segments(session_id);
CREATE INDEX IF NOT EXISTS idx_live_transcript_segments_ts ON public.live_transcript_segments(ts DESC);

DROP TRIGGER IF EXISTS update_live_call_sessions_updated_at ON public.live_call_sessions;
CREATE TRIGGER update_live_call_sessions_updated_at
BEFORE UPDATE ON public.live_call_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.live_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_transcript_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reps and managers can view live call sessions" ON public.live_call_sessions;
CREATE POLICY "Reps and managers can view live call sessions" ON public.live_call_sessions
FOR SELECT USING (
  rep_id = auth.uid() OR auth.uid() IN (SELECT id FROM public.managers) OR public.is_admin()
);

DROP POLICY IF EXISTS "Reps can insert own live call sessions" ON public.live_call_sessions;
CREATE POLICY "Reps can insert own live call sessions" ON public.live_call_sessions
FOR INSERT WITH CHECK (rep_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Reps can update own live call sessions" ON public.live_call_sessions;
CREATE POLICY "Reps can update own live call sessions" ON public.live_call_sessions
FOR UPDATE USING (rep_id = auth.uid() OR public.is_admin())
WITH CHECK (rep_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Reps and managers can view transcript segments" ON public.live_transcript_segments;
CREATE POLICY "Reps and managers can view transcript segments" ON public.live_transcript_segments
FOR SELECT USING (
  session_id IN (
    SELECT id FROM public.live_call_sessions
    WHERE rep_id = auth.uid() OR auth.uid() IN (SELECT id FROM public.managers) OR public.is_admin()
  )
);

DROP POLICY IF EXISTS "Reps can insert transcript segments" ON public.live_transcript_segments;
CREATE POLICY "Reps can insert transcript segments" ON public.live_transcript_segments
FOR INSERT WITH CHECK (
  session_id IN (SELECT id FROM public.live_call_sessions WHERE rep_id = auth.uid()) OR public.is_admin()
);
