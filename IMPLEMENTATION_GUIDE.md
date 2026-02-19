# 🚀 Implementation Guide: Golden Calls & Knowledge Base

This guide explains how to set up and use the Golden Calls and Knowledge Base systems to maximize AI coaching effectiveness.

## Overview

The system consists of two main features:

1. **Golden Calls** - Identify top-performing calls and compare new calls against them
2. **Knowledge Base** - Store playbooks, SOPs, FAQs and embed them for semantic search in AI coaching

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Call Recording / Transcription           │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │  Run 10 AI Agents        │
        │  (Score: 0-100)          │
        └────────┬─────────────────┘
                 │
        ┌────────┴──────────────────────┐
        │                               │
        ▼                               ▼
   ┌─────────────┐        ┌──────────────────────┐
   │ Store Score │        │ Compare vs Golden    │
   │ & Analysis  │        │ Call Baseline        │
   └─────────────┘        └──────┬───────────────┘
        │                        │
        │     ┌──────────────────┘
        │     │
        ▼     ▼
   ┌──────────────────────────────────┐
   │ Generate Coaching Report:        │
   │ - Strengths vs Golden            │
   │ - Gaps vs Golden                 │
   │ - KB-Powered Recommendations     │
   └──────────────────────────────────┘
        │
        ▼
   ┌──────────────────────────────────┐
   │ Rep sees in Company GPT:         │
   │ - AI analysis with context       │
   │ - Matching KB references         │
   │ - Golden call examples           │
   └──────────────────────────────────┘
```

## Step 1: Create Database Tables

The migration `005_golden_calls_and_knowledge_base.sql` creates these tables:

### Golden Calls Tables
- `golden_calls` - Top reference calls per rep
- `golden_calls_comparison` - Compares new calls to golden baselines

### Knowledge Base Tables
- `kb_documents` - Playbooks, SOPs, FAQs (metadata)
- `kb_chunks` - Text chunks with pgvector embeddings
- `kb_search_logs` - Tracks KB searches for analytics

Run migration:
```bash
# Supabase CLI
supabase db push migrations/005_golden_calls_and_knowledge_base.sql

# Or via Supabase dashboard:
# Copy-paste the SQL file into SQL Editor
```

## Step 2: Generate Golden Calls

Once you have calls with AI analysis scores, identify top performers:

```bash
# Identify top 5% calls as golden baselines per rep
npx ts-node scripts/identify-golden-calls.ts
```

**What it does:**
- Gets all calls with AI analysis scores
- Groups by rep
- Marks top 5% of each rep's calls as "golden"
- Stores key metrics (objection score, discovery score, talk ratio, etc.)

**Output example:**
```
👥 Rep ABC123: Selecting 3 golden calls from 65 total
  ✅ Compared call 1234... (+15%)
  ✅ Compared call 5678... (+10%)
  ✅ Compared call 9012... (+8%)
```

## Step 3: Upload Knowledge Base Documents

### Option A: Via Script (Bulk Upload)

```typescript
// scripts/bulk-upload-kb.ts
import { uploadKBDocument } from '../src/services/kbService';

const playbook = `
# Objection Handling Playbook

## Price Objection
"That's out of budget"

Response Formula:
1. Acknowledge (empathy)
2. Reframe (value)
3. Options (flexibility)
...
`;

await uploadKBDocument(
  'Price Objection Playbook',
  'Complete price objection handling guide with scripts',
  playbook,
  'playbook',
  'objections',
  ['price', 'budget', 'cost', 'negotiation']
);
```

### Option B: Via Frontend Upload (Future)

Build a KB upload form in the dashboard:

```tsx
<KBUploadForm
  onUpload={async (file, metadata) => {
    const content = await file.text();
    await uploadKBDocument(
      metadata.title,
      metadata.description,
      content,
      metadata.type,
      metadata.category,
      metadata.tags
    );
  }}
/>
```

## Step 4: Process Knowledge Base (Generate Embeddings)

Once documents are uploaded, chunk and embed them:

```bash
# Chunk documents and generate pgvector embeddings
npx ts-node scripts/process-knowledge-base.ts
```

**What it does:**
- Reads each KB document
- Splits into 512-token chunks with overlap
- Calls OpenAI to generate embeddings
- Stores vectors in pgvector for semantic search

**Note:** This uses OpenAI API. Ensure you have credits.

```
📄 Processing: "Objection Handling Playbook"
  ✂️  Chunked into 8 pieces
  ✅ Embedded 8 chunks (cost: ~$0.02)
```

## Step 5: Compare New Calls to Golden Calls

After analyzing new calls, compare them to golden baselines:

```bash
# Compare new calls against golden call baselines
npx ts-node scripts/compare-calls-to-golden.ts
```

**What it does:**
- Gets calls without comparisons yet
- Finds that rep's top golden call
- Calculates performance deltas
- Identifies strengths and gaps
- Creates coaching recommendations

**Example output:**
```
🔍 Call 1234... COMPARISON RESULTS:
  Performance: -8% (slightly below golden)
  Strengths: Better closing technique, confident tone
  Gaps: Limited discovery questions, weak objection response
  Recommendation: Compare against golden call response patterns
```

## Step 6: Display in Dashboard

### For Sales Reps

Show comparison on individual call view:

```tsx
import { GoldenCallsPanel } from './GoldenCallsPanel';

function CallDetailView({ callId, repId }) {
  return (
    <div>
      <CallAnalysisPanel callId={callId} />
      
      {/* Side-by-side comparison to golden */}
      <GoldenCallsPanel
        callId={callId}
        repId={repId}
        mode="comparison"
      />
    </div>
  );
}
```

### For Managers

Show team trending and improvement:

```tsx
function ManagerDashboard({ teamId }) {
  return (
    <div>
      <TeamMetricsPanel teamId={teamId} />
      
      {/* See which reps are improving */}
      <GoldenCallsPanel
        repId={teamId}
        mode="team-trend"
      />
    </div>
  );
}
```

## Step 7: Integrate KB into Company GPT

Company GPT now automatically searches KB when answering:

### Manual Integration in Chat

```tsx
import { AIChatPanel } from './AIChatPanel';
import { KBCoachingReferences } from './KBCoachingReferences';

function CompanyGPTChat({ repId }) {
  const [query, setQuery] = useState('');
  
  return (
    <div>
      {/* KB search panel */}
      <KBCoachingReferences
        query={query}
        category="coaching"
        onChunkSelected={handleSelectChunk}
      />
      
      {/* Chat interface */}
      <AIChatPanel
        repId={repId}
        initialKBContext={selectedKBChunk}
      />
    </div>
  );
}
```

### Auto-Injection in GPT Responses

When Company GPT answers a question, it now:

1. **Embeds the query** (via OpenAI)
2. **Searches KB chunks** (cosine similarity in pgvector)
3. **Injects top results** into system prompt
4. **Returns answer with KB references**

```typescript
// In openaiService.ts
async function streamChatMessageWithKB(
  message: string,
  repId: string,
  callContext?: any
) {
  // 1. Search knowledge base
  const kbChunks = await searchKnowledgeBase(message, { limit: 3 });
  
  // 2. Build system prompt with KB context
  const systemPrompt = `
    You are an AI sales coach. Use these resources:
    
    KNOWLEDGE BASE:
    ${kbChunks.map(c => `- ${c.document_title}: ${c.chunk_text}`).join('\n')}
    
    GOLDEN CALL BASELINE:
    ${goldenCallContext}
    
    Provide coaching reference specific techniques from KB.
  `;
  
  // 3. Stream response
  return streamChatMessage(message, systemPrompt);
}
```

## Services Reference

### goldenCallsService.ts

```typescript
// Get golden calls for a rep
getGoldenCallsForRep(repId: string): Promise<GoldenCall[]>

// Compare a call to golden baseline
compareCallToGolden(callId: string, repId: string): Promise<GoldenCallComparison>

// Get trending improvement
getRepComparisonTrend(repId: string, limit?: number): Promise<GoldenCallComparison[]>

// Team-wide metrics
calculateTeamImprovement(): Promise<{
  avgDeltaPercentage: number
  improvingReps: string[]
  regressingReps: string[]
}>
```

### kbService.ts

```typescript
// Upload document (playbook, SOP, FAQ)
uploadKBDocument(
  title: string,
  description: string,
  contentText: string,
  documentType: 'playbook' | 'sop' | 'faq' | 'script' | 'objection_handling' | 'product_guide',
  category: string,
  tags?: string[]
): Promise<KBDocument>

// Search knowledge base
searchKnowledgeBase(
  query: string,
  options?: {
    limit?: number
    categoryFilter?: string
  }
): Promise<KBChunk[]>

// Get KB coaching context for a query
getCoachingReferencesForQuery(
  query: string,
  repId: string
): Promise<KBCoachingReference[]>
```

## Typical Workflow

### Week 1: Setup
1. ✅ Run migration to create tables
2. ✅ Upload 3-5 playbooks/SOPs as KB documents
3. ✅ Run `process-knowledge-base.ts` to embed

### Week 2: Pattern Recognition
1. ✅ Run 50+ calls through AI agents
2. ✅ Run `identify-golden-calls.ts` to mark top 5%
3. ✅ Run `compare-calls-to-golden.ts` for new calls
4. ✅ Display golden call comparisons in dashboards

### Week 3+: Coaching at Scale
1. ✅ Reps see comparison on each call
2. ✅ Managers see team trends
3. ✅ Company GPT references KB when coaching
4. ✅ Monthly review: update playbooks based on new top performers

## Metrics to Track

### Golden Calls System
- **% of reps improving** - What % have higher score than golden?
- **Average improvement** - How much better are new calls?
- **Engagement** - Which golden calls do reps review most?

### Knowledge Base System
- **Search volume** - How often is KB used?
- **KB coverage** - What topics are most searched?
- **Playbook effectiveness** - Do reps improve after using KB?

## Troubleshooting

### Problem: No golden calls generated

**Cause:** No calls with analysis scores yet

**Fix:**
```bash
# First run AI analysis on calls
npx ts-node scripts/generate-new-calls-with-transcripts.ts
npx ts-node scripts/run-ai-agents.ts

# Then identify golden calls
npx ts-node scripts/identify-golden-calls.ts
```

### Problem: KB search returns no results

**Cause:** 
- Documents not embedded yet
- Wrong search terms

**Fix:**
```bash
# Re-process documents
npx ts-node scripts/process-knowledge-base.ts

# Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Problem: OpenAI rate limit

**Cause:** Processing too many KB chunks at once

**Fix:** The script has built-in delays. For large documents:
```typescript
// Increase delay in process-knowledge-base.ts
if (i % 5 === 0) { // Instead of 10
  await new Promise(resolve => setTimeout(resolve, 500)); // Instead of 200
}
```

## Next Steps

1. ✅ Implement golden calls for benchmarking
2. ✅ Build knowledge base from client playbooks
3. ⏳ Add Chorus/Fathom integration (when ready)
4. ⏳ Build live call panel with real-time KB suggestions
5. ⏳ Create KB editor dashboard for clients

## Questions?

Refer to:
- `/src/services/goldenCallsService.ts` - Golden calls logic
- `/src/services/kbService.ts` - KB search implementation
- `/scripts/` - Running analysis and comparisons
- `/src/app/components/` - UI components for display
