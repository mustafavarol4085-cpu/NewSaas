# Implementation Plan - February 17, 2026

## What's Blocking Launch

Based on ROADMAP_AND_PRIORITIES.md analysis, 3 critical features are missing:

| Feature | Status | Hours | Impact |
|---------|--------|-------|--------|
| Knowledge Base Search | 30% | 8 | Can't reference playbooks in GPT |
| Custom Benchmarks | 0% | 6 | Scoring doesn't match client standards |
| Chorus Integration | 0% | 12 | No real client data |

---

## TODAY'S FOCUS (8 hours)

### 1. KNOWLEDGE BASE SEARCH (4 hours)

**What it does:** Customers upload playbooks → AI searches them when answering questions

**Files to modify:**
- `src/services/openaiService.ts` - Add search function
- `src/services/supabaseService.ts` - pgvector queries
- `src/app/components/multiplicity/AIChatPanel.tsx` - Inject KB results into prompts

**Implementation steps:**
```
1. Enable pgvector extension in Supabase (already done?)
2. Create kb_documents upload endpoint
3. Split docs into 512-token chunks
4. Create OpenAI embeddings for chunks
5. Store in kb_chunks table with vectors
6. Query similarity search endpoint
7. Pass top 3 results to GPT prompt
```

**Definition of Done:**
- User can upload PDF/DOCX file
- File is chunked and embedded
- Chat panel shows "References from playbook"
- GPT responses cite the playbook

---

### 2. CUSTOM BENCHMARKS (3 hours)

**What it does:** Manager uploads top rep transcripts → All reps scored against THOSE standards

**Files to modify:**
- `src/app/components/ManagerDashboard.tsx` - Add benchmark section
- `supabase/migrations/` - Add benchmark tables
- `src/services/aiAgentService.ts` - Load benchmark into agent prompts

**Implementation steps:**
```
1. Create benchmark_transcripts table
2. Add upload form in Manager panel
3. Store top rep calls as reference
4. Load benchmark into each agent's system prompt
5. Compare call scores vs benchmark
6. Show "vs benchmark" metrics in dashboard
```

**Definition of Done:**
- Manager uploads 5-10 top rep calls
- Flag them as "benchmark"
- Next call scored shows % above/below benchmark
- Manager sees "Team avg vs your standard" comparison

---

### 3. QUICK WIN: Website Update (1 hour)

**Add to PRESENTATION.html:**
- Show 3 blocking features
- Add timeline (what works today vs tomorrow)
- Show completion percentage
- Add implementation diagram

---

## FOLLOW-UP (Next 2 days)

- **Day 2:** Chorus/Fathom API integration (12 hrs) - Get real data
- **Day 3:** Live chat panel (8 hrs) - Use during actual calls

---

## SUCCESS CRITERIA

By EOD today:
- [ ] Knowledge base upload form works
- [ ] First playbook searchable in chat
- [ ] Benchmark UI built
- [ ] First benchmark uploaded and scoring
- [ ] Website shows progress

**Result:** System 2 at 85% instead of 80%

---

## Database Changes Needed

```sql
-- kb_documents (already exists, verify)
-- kb_chunks (already exists, verify)
-- benchmark_transcripts (CREATE THIS)
CREATE TABLE benchmark_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  rep_id UUID NOT NULL REFERENCES reps(id),
  call_id UUID NOT NULL REFERENCES calls(id),
  is_approved_benchmark BOOLEAN DEFAULT FALSE,
  benchmark_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- custom_scoring_rubric (CREATE THIS)
CREATE TABLE custom_scoring_rubric (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  dimension VARCHAR(50),
  weight NUMERIC(5, 2),
  criteria TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Commands to Run

```bash
# 1. Check if pgvector is enabled
psql -h db.supabase.co -U postgres -d postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 2. Run migrations
npm run db:migrate

# 3. Start dev server
npm run dev

# 4. Test endpoints
curl http://localhost:5173/api/kb/search -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"discovery questions","customer_id":"..."}'
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| pgvector not enabled | Low | High | Check Supabase settings |
| OpenAI rate limits | Medium | Medium | Implement queue system |
| Embedding cost | Medium | Low | Cache embeddings |
| Benchmark conflict with agent logic | Medium | High | Test with sample data |

---

## Sign-off

Plan created: 2026-02-17 08:00
Expected complete: 2026-02-17 17:00
Owner: Development Team
Status: Ready to start
