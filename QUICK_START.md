# ⚡ Quick Start Guide - Golden Calls & KB

Get up and running in 30 minutes.

## 1️⃣ Setup Database (5 min)

```bash
# Execute the migration
supabase db push supabase/migrations/005_golden_calls_and_knowledge_base.sql

# Or via Supabase dashboard:
# Paste content from that file into SQL Editor → Run
```

✅ Tables created: `golden_calls`, `golden_calls_comparison`, `kb_documents`, `kb_chunks`

---

## 2️⃣ Generate Golden Calls (2 min)

**Prerequisites:** At least 10 calls with AI analysis scores

```bash
# Identify top 5% calls per rep
npx ts-node scripts/identify-golden-calls.ts

# Output: ✅ Created X golden calls total
```

✅ Now your system has baselines

---

## 3️⃣ Upload Knowledge Base (5 min)

Create `scripts/quick-add-kb.ts`:

```typescript
import { uploadKBDocument } from '../src/services/kbService';

const examplePlaybook = `
# Objection Handling

## Price ("That's too expensive")
Response: "I understand cost is important. Most clients 
see ROI in 6 months. Let me show you..."

## Timing ("Not now, maybe Q3")
Response: "I get it - timing matters. How about we set 
up a check-in for June to align with your planning?"
`;

await uploadKBDocument(
  'Objection Handling Playbook',
  'Complete guides for handling common objections',
  examplePlaybook,
  'playbook',
  'objections',
  ['price', 'timing', 'decision']
);

console.log('✅ Playbook uploaded');
```

Run it:
```bash
npx ts-node scripts/quick-add-kb.ts
```

✅ Document ready for embedding

---

## 4️⃣ Generate Embeddings (10 min)

```bash
# Chunk & embed all KB documents
npx ts-node scripts/process-knowledge-base.ts

# Output: ✅ Processed X documents with Y total chunks
```

⚠️ **Note:** Uses OpenAI API (~$0.02 per 100 docs)

✅ Ready for semantic search

---

## 5️⃣ Compare Calls (2 min)

```bash
# Compare new calls to golden baselines
npx ts-node scripts/compare-calls-to-golden.ts

# Output: 📊 Created X comparisons
```

✅ Each call now has comparison data

---

## 6️⃣ Display in Dashboard (Immediate)

### Show Golden Baseline on Call View

```tsx
import { GoldenCallsPanel } from './components/GoldenCallsPanel';

function CallView({ callId, repId }) {
  return (
    <>
      <CallAnalysis callId={callId} />
      
      {/* Add this: */}
      <GoldenCallsPanel
        callId={callId}
        repId={repId}
        mode="comparison"
      />
    </>
  );
}
```

### Show KB Search in Company GPT

```tsx
import { KBCoachingReferences } from './components/KBCoachingReferences';

function CompanyGPT() {
  return (
    <>
      {/* Add this: */}
      <KBCoachingReferences
        category="coaching"
        compact={true}
      />
      
      {/* Then chat interface */}
      <ChatPanel />
    </>
  );
}
```

✅ Live in your app

---

## What You Now Have

| Feature | What It Does | User Sees |
|---------|--------------|-----------|
| **Golden Calls** | Stores top 5% calls per rep | "You scored 85, golden baseline is 92" |
| **Comparisons** | Calculates deltas vs golden | "+10% talk ratio, -5% discovery questions" |
| **Knowledge Base** | Stores playbooks/SOPs | Playbook recommendations in Company GPT |
| **KB Search** | Semantic search via pgvector | "Here's how the golden call handled this objection" |

---

## Common Commands

```bash
# Identify top performers
npx ts-node scripts/identify-golden-calls.ts

# Process KB documents
npx ts-node scripts/process-knowledge-base.ts

# Compare new calls
npx ts-node scripts/compare-calls-to-golden.ts

# Run all in sequence
npm run setup:golden-calls
```

---

## Troubleshooting

### "No golden calls found"
→ Run: `npx ts-node scripts/generate-new-calls-with-transcripts.ts` first

### "KB search returns nothing"
→ Run: `npx ts-node scripts/process-knowledge-base.ts`

### "OpenAI error"
→ Check OPENAI_API_KEY is set

---

## Services Available Now

**goldenCallsService.ts:**
```typescript
getGoldenCallsForRep(repId)
compareCallToGolden(callId, repId)
calculateTeamImprovement()
markAsGoldenCall(callId, score, metadata)
```

**kbService.ts:**
```typescript
uploadKBDocument(title, content, type, category, tags)
searchKnowledgeBase(query, options)
getCoachingReferencesForQuery(query, repId)
```

---

## Next (Optional Enhancements)

- [ ] KB upload UI for clients
- [ ] Live call golden call suggestions
- [ ] Chorus/Fathom auto-sync
- [ ] Custom benchmark builder
- [ ] KB analytics dashboard

---

## 🎯 You're Done! 

Reps now have:
- ✅ Golden call comparisons
- ✅ Context-aware AI coaching
- ✅ Playbook references
- ✅ Clear improvement paths

Managers now have:
- ✅ Team improvement metrics
- ✅ Coaching targets
- ✅ Trending analysis

**Time to first value: ~30 minutes** ⚡
