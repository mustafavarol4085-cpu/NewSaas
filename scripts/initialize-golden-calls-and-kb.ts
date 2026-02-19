/**
 * Setup & Initialization Scripts for Golden Calls & KB System
 * Run this script to initialize the system with demo data
 */

import {
  markAsGoldenCall,
  identifyGoldenCallsAutomatically,
  compareCallToGolden,
  getGoldenCallsByRep,
} from '../services/goldenCallsService';

import {
  uploadKBDocument,
  chunkAndEmbedDocument,
  searchKBBySimilarity,
  generateCoachingWithKB,
  getKBStatistics,
} from '../services/kbService';

import { supabase } from '../services/supabase';

// =====================================================
// GOLDEN CALLS SETUP
// =====================================================

/**
 * Initialize golden calls from existing calls
 * Finds top 5% of calls and marks them as golden
 */
export async function initializeGoldenCalls(): Promise<void> {
  console.log('🏆 Initializing Golden Calls...');

  try {
    // Get all reps with their call counts
    const { data: reps, error: repsError } = await supabase
      .from('reps')
      .select('id, name')
      .eq('status', 'active');

    if (repsError) throw repsError;

    console.log(`Found ${reps?.length || 0} active reps`);

    // For each rep, identify their golden calls
    for (const rep of reps || []) {
      const { data: repCalls, error: callsError } = await supabase
        .from('calls')
        .select(
          `
          id,
          analysis (
            overall_score,
            objection_score,
            discovery_score,
            closing_score,
            talk_ratio,
            questions_asked,
            customer_objections,
            objections_handled,
            avg_question_quality,
            duration_seconds,
            call_type,
            industry
          )
        `
        )
        .eq('rep_id', rep.id)
        .order('created_at', { ascending: false })
        .limit(20); // Get 20 most recent calls

      if (callsError) {
        console.warn(`Error fetching calls for rep ${rep.name}:`, callsError);
        continue;
      }

      if (!repCalls || repCalls.length === 0) {
        console.log(`No calls found for rep ${rep.name}`);
        continue;
      }

      // Sort and mark top calls as golden
      const sortedCalls = repCalls
        .filter((call) => call.analysis && call.analysis.length > 0)
        .sort((a, b) => {
          const scoreA = a.analysis[0]?.overall_score || 0;
          const scoreB = b.analysis[0]?.overall_score || 0;
          return scoreB - scoreA;
        });

      // Mark top 3 as golden
      for (let i = 0; i < Math.min(3, sortedCalls.length); i++) {
        const call = sortedCalls[i];
        const analysis = call.analysis[0];

        const marked = await markAsGoldenCall(
          call.id,
          rep.id,
          {
            overall_score: analysis.overall_score,
            objection_score: analysis.objection_score,
            discovery_score: analysis.discovery_score,
            closing_score: analysis.closing_score,
            talk_ratio: analysis.talk_ratio,
            questions_asked: analysis.questions_asked,
            customer_objections: analysis.customer_objections,
            objections_handled: analysis.objections_handled,
            avg_question_quality: analysis.avg_question_quality,
            call_duration_seconds: analysis.duration_seconds,
            product_category: call.call_type,
            industry: call.industry,
          },
          `Top performer - ranked #${i + 1} for ${rep.name}`
        );

        if (marked) {
          console.log(`✅ Marked call for ${rep.name} as golden (rank #${i + 1})`);
        }
      }
    }

    console.log('✅ Golden Calls initialization complete!');
  } catch (error) {
    console.error('Error initializing golden calls:', error);
  }
}

/**
 * Compare all recent calls to golden baseline
 */
export async function compareAllCallsToGolden(): Promise<void> {
  console.log('📊 Comparing recent calls to golden baseline...');

  try {
    const { data: recentCalls, error } = await supabase
      .from('calls')
      .select(
        `
        id,
        rep_id,
        analysis (
          id,
          overall_score,
          objection_score,
          discovery_score,
          closing_score,
          talk_ratio,
          questions_asked,
          customer_objections,
          objections_handled,
          avg_question_quality
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(50); // Last 50 calls

    if (error) throw error;

    let comparisonsCreated = 0;

    for (const call of recentCalls || []) {
      if (!call.analysis || call.analysis.length === 0) continue;

      const analysis = call.analysis[0];
      const comparison = await compareCallToGolden(call.id, call.rep_id, {
        overall_score: analysis.overall_score,
        objection_score: analysis.objection_score,
        discovery_score: analysis.discovery_score,
        closing_score: analysis.closing_score,
        talk_ratio: analysis.talk_ratio,
        questions_asked: analysis.questions_asked,
        customer_objections: analysis.customer_objections,
        objections_handled: analysis.objections_handled,
        avg_question_quality: analysis.avg_question_quality,
      });

      if (comparison) {
        comparisonsCreated++;
      }
    }

    console.log(`✅ Created ${comparisonsCreated} call comparisons`);
  } catch (error) {
    console.error('Error comparing calls:', error);
  }
}

// =====================================================
// KNOWLEDGE BASE SETUP
// =====================================================

/**
 * Upload sample playbooks and knowledge base documents
 */
export async function initializeSampleKB(): Promise<void> {
  console.log('📚 Initializing Knowledge Base with samples...');

  try {
    // Sample 1: Objection Handling Playbook
    const objectionPlaybook = `
# Objection Handling Playbook

## Common SaaS Objections and Responses

### 1. Price Objection
The customer says: "Your price is too high compared to competitors."

#### Best Response Strategy:
1. Acknowledge their concern
2. Position value, not price
3. Ask about their current situation
4. Show ROI/time savings quantification

Example: "I understand budget is important. What's interesting is that our clients typically see a 40% improvement in productivity within 3 months. That translates to about $X in recovered time annually. How does that compare to the price discussion?"

### 2. Timing Objection
The customer says: "We're not ready yet" or "Let's revisit this next quarter."

#### Best Response Strategy:
1. Validate their timeline
2. Uncover the real reason
3. Plant seeds for future
4. Schedule specific follow-up

Example: "That makes sense. Help me understand - is this a budget timing thing, or are there other projects you're focused on? No pressure at all, I just want to make sure I understand your situation."

### 3. Authority Objection
The customer says: "I need to check with my team/manager."

#### Best Response Strategy:
1. Ask them to collaborate
2. Prepare them for objections
3. Schedule joint call
4. Provide materials for sharing

Example: "Great idea to loop them in. Just so they feel prepared, what are the main concerns or questions you think they'll have? I can put together a quick summary for them."

### 4. Need Objection
The customer says: "We don't have a problem to solve right now."

#### Best Response Strategy:
1. Probe deeper with discovery questions
2. Ask about pain points in similar areas
3. Present leading indicators
4. Plant seed for future

Example: "That's fair. Many of our customers said the same thing initially. One thing we find is that teams often don't realize the impact until we walk through their current process together. Would you be open to a 15-minute discovery call?"

## Key Principles:
- Never argue with objections
- Ask, don't tell
- Focus on value, not features
- Bridge to next step smoothly
`;

    const objectionDoc = await uploadKBDocument(
      'SaaS Objection Handling Playbook',
      'Comprehensive guide for handling common objections in SaaS sales',
      objectionPlaybook,
      'objection_handling',
      'objections',
      ['objections', 'price', 'timing', 'authority', 'need']
    );

    if (objectionDoc) {
      console.log('✅ Uploaded Objection Handling Playbook');
    }

    // Sample 2: Discovery Questions Script
    const discoveryScript = `
# Discovery Questions Script

## Pre-Call Research
Before the call, research:
- Company size and growth stage
- Recent funding/news
- Current tech stack (hint: LinkedIn)
- Common problems in their industry

## Opening Discovery Call

### Step 1: Build Rapport (2 minutes)
"Thanks for taking time today. Before we dive in, I'd love to know a bit about what brought you to this conversation. What made you think now might be a good time to explore this?"

### Step 2: Listen to Their Story (3 minutes)
Ask open-ended follow-ups:
- "Tell me more about that..."
- "How is that impacting your team?"
- "What's the biggest challenge there?"

### Step 3: Diagnose Problems (5 minutes)
Ask about:
1. Current process: "Walk me through how you currently handle [X]?"
2. Impact: "How much time does that take your team?"
3. Cost: "What's the impact on revenue/productivity?"
4. Timeline: "When did this become a problem?"
5. Stakeholders: "Who else is involved in this decision?"

### Step 4: Explore Vision (3 minutes)
"Imagine we magic-wanded this away. What would be different?"
"What would success look like for you?"

### Step 5: Qualify (2 minutes)
- Budget: "Is this part of your existing budget?"
- Timeline: "When are you hoping to have this solved?"
- Authority: "Who else needs to be involved in evaluating solutions?"

## Power Questions by Scenario:

### For Scaling Teams
- "As you've grown, what's become harder to manage?"
- "How many tools are your teams jumping between?"
- "What metrics matter most to your leadership?"

### For Compliance/Risk
- "What would happen if [risk] occurred?"
- "How are you currently handling [compliance requirement]?"
- "Who owns this responsibility today?"

### For Cost Optimization
- "What are you spending annually on this process?"
- "How much manual work is involved?"
- "What would you do with recovered time?"
`;

    const discoveryDoc = await uploadKBDocument(
      'Discovery Questions Script',
      'Step-by-step framework for discovery calls',
      discoveryScript,
      'script',
      'discovery',
      ['discovery', 'questions', 'script']
    );

    if (discoveryDoc) {
      console.log('✅ Uploaded Discovery Questions Script');
    }

    // Sample 3: Closing Techniques
    const closingGuide = `
# Closing Techniques Guide

## 1. Assumptive Close
Assume the customer is buying and move forward as if agreement has been reached.

"Great, I think we're a good fit. Let me send over the contract. Can you sign by Friday?"

When to use: You've clearly addressed all concerns and uncovered strong need.

## 2. Trial Close
Ask a question that assumes they've bought.

"Would implementing this on your sales team first or support team first make more sense?"

When to use: Mid-conversation to gauge interest and comfort level.

## 3. Urgency Close
Create appropriate urgency around a decision.

"This promotion expires Friday. After that, the pricing moves to the standard rate."

When to use: Only if genuinely true. Never fabricate deadlines.

## 4. Alternative Close
Give them limited options that both lead to yes.

"Would you prefer monthly billing or annual with a 10% discount?"

When to use: Avoid open-ended "should we buy?" questions.

## 5. Summary Close
Recap all the benefits and outcomes they want.

"So if I'm hearing you right, your main goals are X, Y, and Z. Our solution delivers all three. The question is really just when you want to get started."

When to use: When you want to solidify their thinking before asking for the sale.

## Red Flags to Listen For:
- "Let me think about it" → Unmet objection still lurking
- "We're happy with current vendor" → Haven't shown differentiation
- "We don't have budget" → Didn't uncover financial impact
- "Let's revisit next quarter" → Not enough urgency created

## Green Lights to Listen For:
- Questions about implementation ("How does rollout work?")
- Questions about timeline ("When could we start?")
- Asking about pricing details
- Introducing internal stakeholders
- Asking for references/case studies
`;

    const closingDoc = await uploadKBDocument(
      'Closing Techniques Guide',
      'Advanced closing strategies and when to use them',
      closingGuide,
      'playbook',
      'closing',
      ['closing', 'sales-techniques', 'negotiations']
    );

    if (closingDoc) {
      console.log('✅ Uploaded Closing Techniques Guide');
    }

    // Get KB stats
    const stats = await getKBStatistics();
    console.log(`✅ Knowledge Base initialized - ${stats.totalDocuments} documents, ${stats.totalChunks} chunks`);
  } catch (error) {
    console.error('Error initializing KB:', error);
  }
}

// =====================================================
// TEST SEARCH
// =====================================================

/**
 * Test KB search functionality
 */
export async function testKBSearch(): Promise<void> {
  console.log('🔍 Testing KB Search...');

  try {
    const testQueries = [
      'How do I handle price objections?',
      'What discovery questions should I ask?',
      'How do I close a deal?',
      'What if customer says we are not ready?',
    ];

    for (const query of testQueries) {
      console.log(`\nSearching for: "${query}"`);
      const results = await searchKBBySimilarity(query, 0.5, 3);

      if (results.length > 0) {
        results.forEach((chunk, index) => {
          console.log(`  ${index + 1}. ${chunk.document_title} (${chunk.category})`);
          console.log(`     Score: ${(chunk.similarity_score * 100).toFixed(1)}%`);
        });
      } else {
        console.log('  No results found');
      }
    }

    console.log('\n✅ KB Search test complete!');
  } catch (error) {
    console.error('Error testing KB search:', error);
  }
}

// =====================================================
// MAIN INITIALIZATION
// =====================================================

/**
 * Run all initialization tasks
 */
export async function initializeAllSystems(): Promise<void> {
  console.log('\n🚀 Starting system initialization...\n');

  try {
    // Initialize KB first (so we have content)
    await initializeSampleKB();
    console.log();

    // Initialize golden calls
    await initializeGoldenCalls();
    console.log();

    // Compare recent calls to golden
    await compareAllCallsToGolden();
    console.log();

    // Test search
    await testKBSearch();
    console.log();

    console.log('✅ All systems initialized successfully!');
  } catch (error) {
    console.error('Fatal error during initialization:', error);
  }
}

// If run directly
if (import.meta.main) {
  initializeAllSystems();
}
