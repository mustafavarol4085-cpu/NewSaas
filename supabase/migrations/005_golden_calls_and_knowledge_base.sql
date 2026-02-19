-- =====================================================
-- GOLDEN CALLS & KNOWLEDGE BASE SYSTEM
-- =====================================================

-- =====================================================
-- 1. GOLDEN CALLS - Top reference calls for benchmarking
-- =====================================================
CREATE TABLE IF NOT EXISTS golden_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  rep_id UUID NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
  
  -- Scoring & Ranking
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  objection_score INTEGER CHECK (objection_score >= 0 AND objection_score <= 100),
  discovery_score INTEGER CHECK (discovery_score >= 0 AND discovery_score <= 100),
  closing_score INTEGER CHECK (closing_score >= 0 AND closing_score <= 100),
  
  -- Key Metrics (baseline for comparison)
  talk_ratio DECIMAL(3, 2) DEFAULT 0.5, -- 0.0-1.0, rep talk time / total time
  questions_asked INTEGER DEFAULT 0,
  customer_objections INTEGER DEFAULT 0,
  objections_handled INTEGER DEFAULT 0,
  avg_question_quality INTEGER CHECK (avg_question_quality >= 0 AND avg_question_quality <= 10),
  
  -- Call Details
  call_duration_seconds INTEGER,
  product_category VARCHAR(100),
  industry VARCHAR(100),
  deal_stage VARCHAR(50), -- 'discovery', 'demo', 'negotiation', 'closing'
  
  -- Extracted Features (JSONB for flexibility)
  key_techniques TEXT[], -- Array of techniques used (e.g., 'assumptive_close', 'trial_close')
  language_patterns JSONB, -- {"powerwords": ["definitely", "guarantee"], "phrases": [...]}
  objection_responses JSONB, -- {"price": "response text", "timing": "response text"}
  discovery_questions TEXT[], -- The actual good questions asked
  winning_patterns JSONB, -- What made this call successful
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  reason_selected TEXT, -- Why this was chosen as golden
  percentile_rank INTEGER CHECK (percentile_rank > 0 AND percentile_rank <= 100), -- What percentile this call is at
  
  created_by UUID REFERENCES managers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_golden_per_rep_and_call UNIQUE(call_id)
);

CREATE INDEX idx_golden_calls_rep_id ON golden_calls(rep_id);
CREATE INDEX idx_golden_calls_overall_score ON golden_calls(overall_score DESC);
CREATE INDEX idx_golden_calls_is_active ON golden_calls(is_active) WHERE is_active = true;


-- =====================================================
-- 2. GOLDEN CALLS COMPARISON - Track how reps compare
-- =====================================================
CREATE TABLE IF NOT EXISTS golden_calls_comparison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  
  -- The golden call being compared to
  golden_call_id UUID NOT NULL REFERENCES golden_calls(id) ON DELETE CASCADE,
  
  -- Overall comparison
  performance_delta_percentage INTEGER, -- +15 (15% better) or -20 (20% worse)
  comparison_summary VARCHAR(500),
  
  -- Detailed Metrics Comparison
  talk_ratio_delta DECIMAL(3, 2), -- +0.05 or -0.10
  questions_count_delta INTEGER, -- +3 or -1
  objection_handling_delta INTEGER, -- -10 or +20
  
  -- Areas of Strength (where this rep matches/exceeds golden)
  strengths_vs_golden TEXT[], -- ["better at closing", "more confident tone"]
  
  -- Areas for Improvement (where rep lags golden)
  gaps_vs_golden TEXT[], -- ["limited discovery questions", "weak objection response"]
  
  -- Specific Recommendations
  recommendations_text TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_comparison_per_call UNIQUE(call_id, golden_call_id)
);

CREATE INDEX idx_golden_comparison_rep_id ON golden_calls_comparison(rep_id);
CREATE INDEX idx_golden_comparison_call_id ON golden_calls_comparison(call_id);


-- =====================================================
-- 3. KNOWLEDGE BASE - Documents (Playbooks, SOPs, FAQs)
-- =====================================================

-- First, enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Document Metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  document_type VARCHAR(50) NOT NULL, -- 'playbook', 'sop', 'faq', 'script', 'objection_handling', 'product_guide'
  category VARCHAR(100), -- 'sales', 'product', 'objections', 'discovery', etc.
  
  -- File Information
  file_name VARCHAR(255),
  file_size INTEGER, -- bytes
  content_text TEXT NOT NULL, -- Full text of document (for fallback search)
  
  -- Source & Ownership
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id VARCHAR(255), -- Multi-tenant support
  
  -- Version Control
  version INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  
  -- Metadata
  tags TEXT[], -- ['price_objection', 'enterprise_sales', 'Q1_2026']
  last_reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_documents_type ON kb_documents(document_type);
CREATE INDEX idx_kb_documents_category ON kb_documents(category);
CREATE INDEX idx_kb_documents_active ON kb_documents(is_active) WHERE is_active = true;


-- =====================================================
-- 4. KNOWLEDGE BASE - Chunks (Text chunks with embeddings)
-- =====================================================
CREATE TABLE IF NOT EXISTS kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  
  -- Chunk Information
  chunk_index INTEGER NOT NULL, -- Sequential position in document
  chunk_text TEXT NOT NULL, -- The actual text content (max 2000 chars)
  token_count INTEGER, -- For usage tracking
  
  -- Embedding (OpenAI's 1536-dimensional vector)
  embedding vector(1536), -- pgvector column for similarity search
  
  -- Context
  document_title VARCHAR(255), -- Denormalized for quick reference
  document_type VARCHAR(50), -- Denormalized for filtering
  category VARCHAR(100),
  
  -- Metadata
  section_title VARCHAR(255), -- If document has sections
  has_code_example BOOLEAN DEFAULT false,
  has_example BOOLEAN DEFAULT false,
  is_critical BOOLEAN DEFAULT false, -- High-priority content
  
  -- Search Optimization
  keywords TEXT[], -- Extracted keywords
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for fast vector similarity search (cosine distance)
CREATE INDEX idx_kb_chunks_embedding ON kb_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

CREATE INDEX idx_kb_chunks_document_id ON kb_chunks(document_id);
CREATE INDEX idx_kb_chunks_category ON kb_chunks(category);
CREATE INDEX idx_kb_chunks_critical ON kb_chunks(is_critical) WHERE is_critical = true;


-- =====================================================
-- 5. KB SEARCH USAGE - Track what gets searched
-- =====================================================
CREATE TABLE IF NOT EXISTS kb_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rep_id UUID REFERENCES reps(id) ON DELETE SET NULL,
  
  query_text VARCHAR(500) NOT NULL, -- What they searched for
  query_type VARCHAR(50), -- 'company_gpt', 'manual_search', 'auto_suggestion'
  
  -- Results
  results_count INTEGER,
  top_chunk_id UUID REFERENCES kb_chunks(id) ON DELETE SET NULL,
  selected_chunk_id UUID REFERENCES kb_chunks(id) ON DELETE SET NULL,
  
  -- Feedback
  was_helpful BOOLEAN,
  feedback_text TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_search_user_id ON kb_search_logs(user_id);
CREATE INDEX idx_kb_search_rep_id ON kb_search_logs(rep_id);


-- =====================================================
-- 6. KB INTEGRATION - Link KB content to AI coaching
-- =====================================================
CREATE TABLE IF NOT EXISTS kb_coaching_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What triggered this reference
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  agent_analysis_id UUID REFERENCES agent_analysis(id) ON DELETE CASCADE,
  coaching_plan_id UUID REFERENCES coaching_plans(id) ON DELETE CASCADE,
  
  -- What KB chunk was referenced
  kb_chunk_id UUID NOT NULL REFERENCES kb_chunks(id) ON DELETE CASCADE,
  
  -- Context
  reference_reason VARCHAR(100), -- 'objection_handling', 'discovery_script', 'best_practice'
  relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100), -- How relevant (0-100)
  
  -- Was it useful to rep?
  rep_viewed BOOLEAN DEFAULT false,
  rep_found_helpful BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_coaching_call_id ON kb_coaching_references(call_id);
CREATE INDEX idx_kb_coaching_kb_chunk_id ON kb_coaching_references(kb_chunk_id);

-- =====================================================
-- FUNCTIONS FOR GOLDEN CALLS
-- =====================================================

-- Function to identify top X% of calls as golden
CREATE OR REPLACE FUNCTION identify_golden_calls(
  percentile_threshold INTEGER DEFAULT 95,
  limit_per_rep INTEGER DEFAULT 3
)
RETURNS TABLE (
  call_id UUID,
  rep_id UUID,
  overall_score INTEGER,
  percentile_rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.rep_id,
    a.overall_score,
    PERCENT_RANK() OVER (PARTITION BY c.rep_id ORDER BY a.overall_score) * 100
  FROM calls c
  JOIN analysis a ON c.id = a.call_id
  WHERE a.overall_score >= (
    SELECT PERCENTILE_CONT((percentile_threshold::float / 100)) WITHIN GROUP (ORDER BY overall_score)
    FROM analysis
  )
  ORDER BY c.rep_id, a.overall_score DESC
  LIMIT (SELECT COUNT(DISTINCT rep_id) FROM calls) * limit_per_rep;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- FUNCTIONS FOR KB SIMILARITY SEARCH
-- =====================================================

-- Function to search KB by similarity (cosine distance)
CREATE OR REPLACE FUNCTION search_kb_by_similarity(
  query_embedding vector(1536),
  similarity_threshold FLOAT DEFAULT 0.5,
  limit_results INTEGER DEFAULT 5,
  p_category VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_title VARCHAR,
  chunk_text TEXT,
  similarity_score FLOAT,
  document_type VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.document_title,
    kc.chunk_text,
    (1 - (kc.embedding <=> query_embedding))::FLOAT AS similarity_score,
    kc.document_type
  FROM kb_chunks kc
  WHERE (p_category IS NULL OR kc.category = p_category)
    AND kc.embedding IS NOT NULL
    AND (1 - (kc.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- GRANTS FOR RLS (Row-Level Security)
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE golden_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE golden_calls_comparison ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_coaching_references ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "golden_calls_visible_to_team" ON golden_calls;
CREATE POLICY "golden_calls_visible_to_team" ON golden_calls
  FOR SELECT USING (
    rep_id = auth.uid() OR
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM reps r
      WHERE r.id = golden_calls.rep_id
        AND r.manager_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "kb_documents_visible_to_authenticated" ON kb_documents;
CREATE POLICY "kb_documents_visible_to_authenticated" ON kb_documents
  FOR SELECT USING (is_active = true AND is_archived = false);

DROP POLICY IF EXISTS "kb_chunks_visible_with_parent" ON kb_chunks;
CREATE POLICY "kb_chunks_visible_with_parent" ON kb_chunks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM kb_documents WHERE id = document_id AND is_active = true)
  );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'analysis'
      AND column_name = 'rep_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_call_rep ON analysis(call_id, rep_id);
  ELSE
    CREATE INDEX IF NOT EXISTS idx_analysis_call_id_only ON analysis(call_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_calls_rep_created ON calls(rep_id, created_at DESC);

-- Composite index for golden call rankings
CREATE INDEX IF NOT EXISTS idx_golden_calls_rep_score ON golden_calls(rep_id, overall_score DESC);

-- Composite index for KB searches
CREATE INDEX IF NOT EXISTS idx_kb_chunks_doc_type_category ON kb_chunks(document_id, document_type, category);
