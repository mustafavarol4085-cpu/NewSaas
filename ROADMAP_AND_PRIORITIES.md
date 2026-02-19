# Multiplicity Agent - Implementation Roadmap

## ✅ Progress Update (February 17, 2026)

**Completed today:**
- KB chat integration connected in `AIChatPanel` (semantic search + playbook references in responses)
- KB service stabilization in `kbService` (embedding key handling + safer document update flow)
- Benchmark foundation migration created: `supabase/migrations/006_custom_benchmark_and_rubric.sql`
- Benchmark runtime context integrated in `aiAgentService` prompts
- Manager benchmark management UI added in `ManagerPerformanceDashboard`
- Manager KB upload/management UI added in `ManagerPerformanceDashboard`

**Still blocking launch:**
- Chorus/Fathom transcript import (OAuth/API + scheduled sync)
- Live during-call assistant (real-time transcript + websocket panel)

## 🎯 Critical Path to MVP (What You MUST Have)

### Phase 1: FOUNDATION (Weeks 1-2) - 80% Complete
**Goal**: Get core system working with demo data

| Feature | Status | Priority | Effort | Why? |
|---------|--------|----------|--------|------|
| Sales Call Analyzer Core | ✅ DONE | 🔴 CRITICAL | 1 hour | Client can see what AI can do |
| Rep Dashboard | ✅ DONE | 🔴 CRITICAL | 1 hour | Daily use interface |
| Manager Dashboard | ✅ DONE | 🔴 CRITICAL | 1 hour | Oversight capability |
| AI Coaching Feedback | ✅ DONE | 🔴 CRITICAL | 30 min | Delivers value immediately |
| Company GPT Chat | ✅ DONE | 🟡 IMPORTANT | 1 hour | Differentiator feature |
| Audio Player | ✅ DONE | 🟡 IMPORTANT | 30 min | Review calls |
| Email Notifications | ✅ DONE | 🟡 IMPORTANT | 30 min | Engagement driver |
| Demo Data Seeding | ✅ DONE | 🔴 CRITICAL | 30 min | Show value on day 1 |

**Status: READY FOR MVP DEMO** ✅

---

### Phase 2: CLIENTIZATION (Weeks 3-4) - 75% Complete
**Goal**: Make system work with CLIENT'S data and customizations

| Feature | Status | Priority | Effort | Why? |
|---------|--------|----------|--------|------|
| Knowledge Base Upload | ✅ DONE | 🔴 CRITICAL | 8 hours | Client playbooks matter |
| Knowledge Base Search | ✅ DONE | 🔴 CRITICAL | 6 hours | Company GPT needs context |
| Custom Benchmark Upload | ✅ DONE | 🔴 CRITICAL | 6 hours | Scoring must match client's best |
| Chorus/Fathom Integration | ❌ NOT DONE | 🔴 CRITICAL | 8 hours | Real data, not demo |
| Custom Scoring Rubric Editor | ❌ NOT DONE | 🟡 IMPORTANT | 10 hours | Client-specific metrics |
| Run AI on Client Data | ⚠️ MANUAL | 🔴 CRITICAL | 2 hours | Execute analysis |

**Status: BLOCKING CLIENT LAUNCH** 🚨

---

### Phase 3: SCALE & OPTIMIZE (Weeks 5-6) - 20% Complete
**Goal**: System works at production scale

| Feature | Status | Priority | Effort | Why? |
|---------|--------|----------|--------|------|
| Performance Testing (1000+ calls) | ❌ NOT DONE | 🟡 IMPORTANT | 4 hours | Know limits |
| Caching Optimization | ⚠️ BASIC | 🟡 IMPORTANT | 6 hours | Reduce API costs |
| Admin Dashboard | ❌ NOT DONE | 🟡 IMPORTANT | 8 hours | Monitor system health |
| Error Handling & Recovery | ⚠️ BASIC | 🟡 IMPORTANT | 4 hours | Handle edge cases |
| API Rate Limiting | ❌ NOT DONE | 🟢 NICE-TO-HAVE | 3 hours | Prevent abuse |

**Status: NOT CRITICAL FOR LAUNCH**

---

## 🚨 BLOCKING ISSUES FOR CLIENT LAUNCH

### 1. ✅ **Knowledge Base Search + Upload Connected** - CRITICAL
- **Problem**: Company GPT in `AIChatPanel` doesn't have access to playbooks/FAQs
- **Status**: Chat-side semantic search + manager upload flow active
- **Fix Needed**: 
  ```
   1. Add tenant/category hard filtering (optional hardening)
   2. Add search logging and usage analytics
   3. Add validation tests for KB-backed chat answers
  ```
- **Impact**: Without this, GPT can't answer technical/process questions
- **Time to Fix**: 6-8 hours
- **Must Do By**: Week 3

### 2. ✅ **Custom Benchmark Runtime Connected** - CRITICAL
- **Problem**: AI scoring uses hardcoded rubric, not client's top rep transcripts
- **Status**: DB migration + upload UI + runtime prompt context completed
- **Fix Needed**:
  ```
   1. Show benchmark delta per call in rep/manager score cards (optional UX enhancement)
   2. Add benchmark governance workflow (approve/reject history)
  ```
- **Impact**: AI coaching won't reflect client's actual best practices
- **Time to Fix**: 6-8 hours
- **Must Do By**: Week 2

### 3. ❌ **No Transcript Import from Chorus/Fathom** - CRITICAL
- **Problem**: Demo data only, client has 100+ real calls
- **Status**: n8n workflow skeleton exists, API integration missing
- **Fix Needed**:
  ```
  1. Get Chorus/Fathom API credentials
  2. Implement OAuth flow (Chorus)
  3. Fetch transcripts periodically
  4. Store in calls + transcripts tables
  5. Trigger analysis automatically
  ```
- **Impact**: Can't analyze real client calls
- **Time to Fix**: 8-12 hours
- **Must Do By**: Week 1

### 4. 🚧 **Company GPT Not Live-Available** - MEDIUM
- **Problem**: Chat panel works but not accessible during actual sales calls
- **Status**: Interface complete, integration missing
- **Fix Needed**:
  ```
  1. Add side panel to rep dashboard
  2. Real-time transcript sync during calls
  3. WebSocket connection for live updates
  4. Quick-action buttons for objections
  ```
- **Impact**: Can't use for real-time coaching
- **Time to Fix**: 10-12 hours
- **Must Do By**: Week 4

---

## 📊 CURRENT vs REQUIRED FOR CLIENT LAUNCH

### What YOU Have Now (84% of MVP):
- ✅ **Sales Call Analyzer** - Fully functional, all 10 agents working
- ✅ **Rep Dashboard** - Can see calls, scores, feedback
- ✅ **Manager Dashboard** - Can see team performance
- ✅ **Company GPT Chat** - Works for asking questions about past calls
- ✅ **KB References in Chat** - GPT now receives semantic KB references during chat
- ✅ **KB Upload Management** - Managers can upload playbooks/SOP content
- ✅ **Custom Benchmark Runtime** - Agent prompts use approved benchmark context
- ✅ **Email Notifications** - Post-call feedback sent automatically
- ✅ **Database Schema** - All tables exist and working

### What CLIENT Needs (100% of MVP):
- ✅ **Sales Call Analyzer** - Fully functional ← YOU HAVE THIS
- ✅ **Rep Dashboard** - Can see calls, scores, feedback ← YOU HAVE THIS
- ✅ **Manager Dashboard** - Can see team performance ← YOU HAVE THIS
- ✅ **Company GPT Chat** - Works for asking questions ← YOU HAVE THIS
- ✅ **+ Custom Benchmark** - Scoring based on THEIR best reps ← DONE
- ✅ **+ Knowledge Base** - GPT can reference playbooks ← DONE
- ⚠️ **+ Real Transcripts** - Chorus/Fathom integration ← MISSING
- ⚠️ **+ Live Access** - Available during calls ← MISSING (50%)

### Gap Analysis:
```
You have:        ████████████████████████████████ 84%
Client needs:    ████████████████████████████████████████ 100%
Gap:             ███ 16%
```

**Gap consists of:**
- Real Data Integration (Chorus/Fathom): 12%
- Live during-call assistant: 4%

---

## 🎯 PRIORITY MATRIX

```
          │ HIGH EFFORT
          │
          │  ✋ API Integration     ⚠️ Chorus/Fathom
HIGH      │  (8-12 hrs)           (12+ hrs)
IMPACT    │
          │  🔥 Knowledge Base     📋 Custom Benchmark
          │  (8 hrs)              (6 hrs)
          │
          │  🎨 Custom Scoring    💬 Live Chat Panel
MEDIUM    │  (10 hrs)             (12 hrs)
IMPACT    │
          │  📊 Admin Dashboard   🔧 Performance Tune
          │  (8 hrs)              (4-6 hrs)
          │
          │  LOW EFFORT
          │
          └──────────────────────────────────
            LOW              MEDIUM      HIGH
            EFFORT           EFFORT      EFFORT
```

**Recommendation**: 
🔴 **Do These First** (blocking):
1. Custom Benchmark (6 hrs) - Highest ROI
2. Knowledge Base (8 hrs) - Differentiator
3. Chorus Integration (12 hrs) - Real data

🟡 **Then Do These** (day 15-30):
4. Live Chat Integration (12 hrs)
5. Custom Scoring Editor (10 hrs)

🟢 **Nice-to-Have** (week 6+):
6. Admin Dashboard
7. Performance optimization

---

## 📅 REALISTIC TIMELINE

### Week 1: Foundation (What you have)
- Day 1-2: Deploy MVP, client kickoff
- Day 3-5: Get Chorus/Fathom API keys
- Day 5: Start implementing data integration

### Week 2: Customization Starts
- Day 1-3: Implement Chorus integration (parallel with below)
- Day 3-5: Custom benchmark upload UI + loading
- Day 5: Run analysis on first batch of client's real calls

### Week 3: Intelligence
- Day 1-3: Knowledge base embedding + search
- Day 3-5: Integrate KB search into Company GPT
- Day 5: Live testing with client's data

### Week 4: Refinement
- Day 1-3: Live call interface implementation
- Day 3-5: Custom scoring rubric editor
- Day 5: Full pilot team training

### Week 5+: Scale
- Monitoring, optimization, rollout
- Additional client onboarding

---

## 🎬 MVP DEMO SCRIPT (What Works Now)

**"Here's what your reps will see when they login..."**

```
1. Rep Dashboard loads
   ✅ Past 20 calls shown
   ✅ Each with score (e.g., 85/100)
   ✅ Coaching feedback visible

2. Click a call
   ✅ Transcript shows
   ✅ Audio plays with timeline
   ✅ AI Coaching panel shows:
      ✅ Top 3 strengths
      ✅ Top 3 improvements
      ✅ All objections detected
      ✅ Questions scored

3. Ask AI Coach (Company GPT)
   ✅ Chat opens
   ✅ Ask "What did I miss?"
   ✅ Gets specific feedback from THAT call
   ✅ Includes objection & question data

4. Manager views dashboard
   ✅ Team overview
   ✅ Compare 2 reps side-by-side
   ✅ Ask AI "Which rep needs help?"
   ✅ Gets team insights

5. Email arrives
   ✅ Post-call summary
   ✅ Includes score, strengths, focus area
   ✅ Links to full analysis
```

**What's Missing from Demo**:
- ❌ Real calls (using demo data)
- ❌ Custom scoring (using defaults)
- ✅ Company playbooks in GPT (KB references + upload active)
- ❌ Live coaching during calls

---

## 💾 DATA MIGRATION PLAN

### For any new client:
1. **Week 1**: Get their Chorus/Fathom API key
2. **Week 2**: Pull all their historical transcripts (~100-500)
3. **Week 2**: Get 10-20 "top rep" transcripts for benchmark
4. **Week 3**: Upload playbooks/objection guides/FAQs to KB
5. **Week 3**: Run analysis on all historical calls
6. **Week 4**: Dashboard shows real data, real coaching
7. **Week 4**: Live pilots with 3-5 reps begin

---

## 🏆 SUCCESS METRICS FOR MVP LAUNCH

**Client should be able to:**
- [x] See all their reps' call analytics
- [x] Get instant AI coaching on any call
- [x] Compare rep performance
- [x] Ask AI questions about their coaching
- [x] View upcoming scheduled calls
- [x] Use Company GPT with their playbooks
- [ ] Import calls directly from Chorus/Fathom
- [ ] Define what "good" means (custom benchmark)
- [ ] Use AI during live calls
- [ ] Track skill improvement over time

**Current Score: 8.5/10**
**Need to reach: 10/10**

---

## 🚀 QUICK WINS (1-2 hours each)

Things you could do in your next 2-hour block:

1. **Add logo/branding to header** - Professional look
2. **Create settings page** - Where to put future config
3. **Add "Help" tooltips** - Explain features
4. **Export dialog data to CSV** - Client wants spreadsheets
5. **Add search to call list** - Find specific calls
6. **Dark mode toggle** - Some clients prefer
7. **Call filters, by rep** - Improve UX
8. **Real-time notification bell** - When new calls analyzed

None of these block launch but all improve UX.

---

## ⚖️ EFFORT vs PAYOFF ANALYSIS

| Feature | Effort | Payoff | ROI | Do It? |
|---------|--------|--------|-----|--------|
| Knowledge Base Embedding | 8 hrs | Makes GPT 10x better | Very High | 🔴 YES |
| Chorus Integration | 12 hrs | Real data (critical) | Very High | 🔴 YES |
| Custom Benchmark | 6 hrs | Client-specific scores | High | 🔴 YES |
| Live Chat Panel | 12 hrs | Real-time coaching | Medium-High | 🟡 YES |
| Custom Scoring UI | 10 hrs | Client self-service | Medium | 🟡 MAYBE |
| Admin Dashboard | 8 hrs | Monitoring | Medium | 🟢 LATER |
| Performance Tuning | 6 hrs | Handles scale | Low | 🟢 LATER |
| Logo/Branding | 2 hrs | Looks professional | Medium | 🟢 YES |

**Recommended Effort Allocation**:
- Knowledge Base: 8 hrs (do it)
- Chorus Integration: 12 hrs (do it)
- Custom Benchmark: 6 hrs (do it)
- Live Interface: 12 hrs (do it)
- Quick Wins: 5 hrs (do them)
- **Total: 43 hours = 1 week**

---

## 📋 DEPENDENCY CHAIN

```
Chorus Integration (Get API keys)
        ↓
Pull Historical Transcripts (Run daily)
        ↓
Analyze All Calls (Run AI agents)
        ↓
Dashboard Shows Real Data (Visible to client)
        ↓
   ┌────┴────────────────────────────────┐
   ↓                                      ↓
Custom Benchmark              Knowledge Base Embedding
(Upload top rep calls)        (Upload playbooks)
   ↓                                      ↓
Score against THEIR best            ↑ GPT prompts
   ↓                                      ↓
Custom coaching for team        Live Company GPT Answers
        ↓                                  ↓
   ┌────┴──────────────────────────────────┐
   ↓
Full MVP Ready for Pilot
```

**Critical Path: ~45 hours = 1.5 weeks of focused work**

---

## ✋ STOP & THINK: Do You Need Phase 3?

Looking at rest of requirements:
- RBAC (role-based access) - Already done via Supabase
- API security - Already done via Supabase
- Infrastructure - Already using Supabase (managed)
- Scalability - Already designed for it

**You don't need Phase 3 infrastructure work.**
**You need Phase 2 customization work.**

Phase 3 can happen AFTER client is using Phase 2.
