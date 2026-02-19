/**
 * AI Agent Service - Specialized AI agents for sales coaching
 *
 * This service implements 10 specialized agents:
 * 1-5: Call Analysis Agents
 * 6-8: Performance Tracking Agents
 * 9-10: Coaching & Training Agents
 * + Master Orchestrator
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// For Node.js environment (scripts)
const getEnvVar = (key: string, fallback?: string): string => {
  // Try process.env first (Node.js)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key]!;
  }
  // Try import.meta.env (Vite/browser)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  // Fallback
  if (fallback) return fallback;
  throw new Error(`Environment variable ${key} not found`);
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://jytjdryjgcxgnfwlgtwc.supabase.co');
// Use service_role key for scripts, anon key for browser
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
const openaiKey = getEnvVar('VITE_OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({
  apiKey: openaiKey,
  dangerouslyAllowBrowser: true
});

async function getBenchmarkContext(callId: string): Promise<string> {
  try {
    const { data: currentCall } = await supabase
      .from('calls')
      .select('rep_id')
      .eq('id', callId)
      .single();

    if (!currentCall?.rep_id) return '';

    const { data: benchmarkRows, error } = await supabase
      .from('benchmark_transcripts')
      .select('call_id, title, notes')
      .eq('rep_id', currentCall.rep_id)
      .eq('is_approved_benchmark', true)
      .order('benchmark_date', { ascending: false })
      .limit(3);

    if (error || !benchmarkRows?.length) return '';

    const details = await Promise.all(
      benchmarkRows.map(async (row: any) => {
        const { data: transcript } = await supabase
          .from('transcripts')
          .select('transcript_text, segments')
          .eq('call_id', row.call_id)
          .single();

        const { data: analyses } = await supabase
          .from('analysis')
          .select('scores')
          .eq('call_id', row.call_id)
          .limit(1);

        const transcriptText =
          transcript?.transcript_text ||
          (Array.isArray(transcript?.segments)
            ? transcript.segments.map((seg: any) => `${seg.speaker}: ${seg.text}`).join('\n')
            : '');

        const overall = analyses?.[0]?.scores?.overall;

        return {
          title: row.title || 'Benchmark Call',
          notes: row.notes || '',
          score: typeof overall === 'number' ? overall : null,
          excerpt: transcriptText.slice(0, 1200),
        };
      })
    );

    const formatted = details
      .filter((item) => item.excerpt)
      .map((item, index) => {
        const scoreText = item.score !== null ? ` | Score: ${item.score}/100` : '';
        const notesText = item.notes ? ` | Notes: ${item.notes}` : '';
        return `${index + 1}. ${item.title}${scoreText}${notesText}\n${item.excerpt}`;
      })
      .join('\n\n');

    if (!formatted) return '';

    return `\n\nBENCHMARK CONTEXT (client best-practice references):\n${formatted}\n\nWhen scoring, align feedback with these benchmark patterns and call out gaps versus benchmark behavior.`;
  } catch (error) {
    console.error('Failed to load benchmark context:', error);
    return '';
  }
}

// ============================================
// CATEGORY 1: CALL ANALYSIS AGENTS (1-5)
// ============================================

/**
 * Agent 1: Objection Handler 🛡️
 * Detects customer objections and scores rep's responses
 */
export async function runObjectionHandlerAgent(callId: string, transcript: any[], benchmarkContext: string = '') {
  console.log('🛡️ Running Objection Handler Agent...');

  const transcriptText = transcript.map(seg => 
    `[${seg.timestamp}] ${seg.speaker}: ${seg.text}`
  ).join('\n');

  const prompt = `Analyze this sales call transcript and identify ALL customer objections.

TRANSCRIPT:
${transcriptText}
${benchmarkContext}

For each objection, provide:
1. Timestamp
2. What customer said (exact quote)
3. Category (price, timing, authority, need, trust, competition)
4. Severity (high, medium, low)
5. Rep's response (exact quote)
6. Response score (0-10, where 10 is perfect)
7. Why the response was good/bad
8. 2-3 better alternative responses
9. Was it resolved? (true/false)

Return JSON:
{
  "objections": [
    {
      "timestamp": "2:15",
      "customer_said": "...",
      "category": "price",
      "severity": "high",
      "rep_response": "...",
      "response_score": 7,
      "response_analysis": "...",
      "suggested_responses": ["...", "..."],
      "was_resolved": true
    }
  ],
  "overall_score": 75,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "recommendations": ["...", "..."]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert sales objection handling coach. Analyze objections with precision and provide actionable feedback.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  // Save to database
  const { data: agentAnalysis } = await supabase
    .from('agent_analysis')
    .insert({
      call_id: callId,
      agent_type: 'objection_handler',
      score: result.overall_score,
      analysis_data: result,
      strengths: result.strengths,
      improvements: result.improvements,
      recommendations: result.recommendations
    })
    .select()
    .single();

  // Save individual objections
  if (result.objections && result.objections.length > 0) {
    await supabase.from('objections').insert(
      result.objections.map((obj: any) => ({
        call_id: callId,
        agent_analysis_id: agentAnalysis?.id,
        timestamp: obj.timestamp,
        customer_said: obj.customer_said,
        category: obj.category,
        severity: obj.severity,
        rep_response: obj.rep_response,
        response_score: obj.response_score,
        response_analysis: obj.response_analysis,
        suggested_responses: obj.suggested_responses,
        was_resolved: obj.was_resolved
      }))
    );
  }

  console.log(`✅ Objection Handler: ${result.objections?.length || 0} objections found, score: ${result.overall_score}/100`);
  return result;
}

/**
 * Agent 2: Discovery Coach 🔍
 * Analyzes how well rep qualifies prospects and uncovers needs
 */
export async function runDiscoveryCoachAgent(callId: string, transcript: any[], benchmarkContext: string = '') {
  console.log('🔍 Running Discovery Coach Agent...');

  const transcriptText = transcript.map(seg => 
    `[${seg.timestamp}] ${seg.speaker}: ${seg.text}`
  ).join('\n');

  const prompt = `Analyze this sales call for discovery effectiveness using SPIN Selling and BANT frameworks.

TRANSCRIPT:
${transcriptText}
${benchmarkContext}

Evaluate:
1. **SPIN Coverage:**
   - Situation questions (understanding current state)
   - Problem questions (uncovering pain points)
   - Implication questions (exploring consequences)
   - Need-payoff questions (building value)

2. **BANT Qualification:**
   - Budget: Did rep discuss budget/pricing?
   - Authority: Did rep identify decision maker?
   - Need: Did rep uncover clear pain points?
   - Timeline: Did rep establish urgency/timeline?

3. **Pain Points Discovered:** List all pain points uncovered
4. **Missed Opportunities:** What should rep have asked?

Return JSON:
{
  "spin_coverage": {
    "situation": { "score": 8, "examples": ["..."] },
    "problem": { "score": 9, "examples": ["..."] },
    "implication": { "score": 6, "examples": ["..."] },
    "need_payoff": { "score": 7, "examples": ["..."] }
  },
  "bant_coverage": {
    "budget": { "covered": true, "score": 8, "evidence": "..." },
    "authority": { "covered": true, "score": 9, "evidence": "..." },
    "need": { "covered": true, "score": 10, "evidence": "..." },
    "timeline": { "covered": false, "score": 0, "evidence": null }
  },
  "pain_points_found": ["...", "..."],
  "missed_opportunities": ["...", "..."],
  "overall_score": 75,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "recommendations": ["...", "..."]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert sales discovery coach trained in SPIN Selling and BANT qualification. Provide detailed, framework-based analysis.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  // Save to database
  await supabase.from('agent_analysis').insert({
    call_id: callId,
    agent_type: 'discovery_coach',
    score: result.overall_score,
    analysis_data: result,
    strengths: result.strengths,
    improvements: result.improvements,
    recommendations: result.recommendations
  });

  console.log(`✅ Discovery Coach: Score ${result.overall_score}/100`);
  return result;
}

/**
 * Agent 3: Closing Coach 🎯
 * Evaluates call ending, next steps, and commitment level
 */
export async function runClosingCoachAgent(callId: string, transcript: any[], benchmarkContext: string = '') {
  console.log('🎯 Running Closing Coach Agent...');

  // Focus on last 20% of call
  const lastSegments = transcript.slice(Math.floor(transcript.length * 0.8));
  const closingText = lastSegments.map(seg =>
    `[${seg.timestamp}] ${seg.speaker}: ${seg.text}`
  ).join('\n');

  const prompt = `Analyze the closing portion of this sales call.

CLOSING TRANSCRIPT:
${closingText}
${benchmarkContext}

Evaluate:
1. **Next Step Clarity:** Is there a clear, specific next step?
2. **Commitment Level:** How committed is the customer?
3. **Timeline Specificity:** Is there a specific date/time?
4. **Mutual Commitment:** Did both parties commit?
5. **Urgency Creation:** Did rep create appropriate urgency?
6. **Calendar Invite:** Was a meeting scheduled?

Return JSON:
{
  "next_step": {
    "defined": true,
    "clarity_score": 9,
    "what": "Demo scheduled",
    "when": "Next Tuesday 2pm",
    "who": "CEO and CTO will attend"
  },
  "commitment_level": {
    "score": 8,
    "customer_enthusiasm": "high",
    "evidence": "Customer said 'This looks perfect for us'"
  },
  "urgency": {
    "created": true,
    "score": 7,
    "technique_used": "Mentioned limited availability"
  },
  "calendar_invite": {
    "sent": true,
    "confirmed": true
  },
  "overall_score": 85,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "recommendations": ["...", "..."]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert sales closing coach. Analyze call endings and commitment levels with precision.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  await supabase.from('agent_analysis').insert({
    call_id: callId,
    agent_type: 'closing_coach',
    score: result.overall_score,
    analysis_data: result,
    strengths: result.strengths,
    improvements: result.improvements,
    recommendations: result.recommendations
  });

  console.log(`✅ Closing Coach: Score ${result.overall_score}/100`);
  return result;
}

/**
 * Agent 4: Talk-Time Analyzer ⏱️
 * Measures conversation balance and speaking pace
 */
export async function runTalkTimeAnalyzerAgent(callId: string, transcript: any[]) {
  console.log('⏱️ Running Talk-Time Analyzer Agent...');

  // Calculate talk time from transcript
  const repSegments = transcript.filter(seg => seg.speaker === 'Rep');
  const customerSegments = transcript.filter(seg => seg.speaker === 'Customer');

  const repWordCount = repSegments.reduce((sum, seg) => sum + seg.text.split(' ').length, 0);
  const customerWordCount = customerSegments.reduce((sum, seg) => sum + seg.text.split(' ').length, 0);
  const totalWords = repWordCount + customerWordCount;

  const repTalkRatio = Math.round((repWordCount / totalWords) * 100);
  const customerTalkRatio = 100 - repTalkRatio;

  // Find monologues (segments > 100 words)
  const repMonologues = repSegments.filter(seg => seg.text.split(' ').length > 100);
  const customerMonologues = customerSegments.filter(seg => seg.text.split(' ').length > 100);

  // Ideal ratio: Rep 30-40%, Customer 60-70%
  let score = 100;
  if (repTalkRatio < 30) score -= 20; // Rep talking too little
  if (repTalkRatio > 40) score -= (repTalkRatio - 40); // Rep talking too much
  if (repMonologues.length > 2) score -= 10; // Too many monologues

  const result = {
    talk_ratio: {
      rep: repTalkRatio,
      customer: customerTalkRatio,
      ideal: '30-40% rep, 60-70% customer',
      assessment: repTalkRatio >= 30 && repTalkRatio <= 40 ? 'Excellent balance' :
                  repTalkRatio > 40 ? 'Rep talking too much' : 'Rep not talking enough'
    },
    monologues: {
      rep_count: repMonologues.length,
      customer_count: customerMonologues.length,
      rep_examples: repMonologues.slice(0, 2).map(seg => ({ timestamp: seg.timestamp, length: seg.text.split(' ').length }))
    },
    overall_score: Math.max(0, score),
    strengths: repTalkRatio >= 30 && repTalkRatio <= 40 ?
      ['Excellent talk-time balance', 'Gave customer space to talk'] : [],
    improvements: repTalkRatio > 40 ?
      ['Talk less, listen more', 'Ask more questions', 'Avoid long monologues'] :
      repTalkRatio < 30 ?
      ['Be more assertive', 'Provide more value', 'Share relevant insights'] : [],
    recommendations: repTalkRatio > 40 ?
      ['Aim for 30-40% talk time', 'Use open-ended questions', 'Practice active listening'] :
      ['Engage more in conversation', 'Share case studies', 'Provide insights']
  };

  await supabase.from('agent_analysis').insert({
    call_id: callId,
    agent_type: 'talk_time_analyzer',
    score: result.overall_score,
    analysis_data: result,
    strengths: result.strengths,
    improvements: result.improvements,
    recommendations: result.recommendations
  });

  console.log(`✅ Talk-Time Analyzer: ${repTalkRatio}% rep / ${customerTalkRatio}% customer, score: ${result.overall_score}/100`);
  return result;
}

/**
 * Agent 5: Question Quality Analyzer ❓
 * Evaluates quality and type of questions asked
 */
export async function runQuestionQualityAgent(callId: string, transcript: any[], benchmarkContext: string = '') {
  console.log('❓ Running Question Quality Analyzer Agent...');

  const repSegments = transcript.filter(seg => seg.speaker === 'Rep');
  const questions = repSegments.filter(seg => seg.text.includes('?'));

  const transcriptText = questions.map(seg =>
    `[${seg.timestamp}] ${seg.text}`
  ).join('\n');

  const prompt = `Analyze the quality of questions asked by the sales rep.

QUESTIONS:
${transcriptText}
${benchmarkContext}

For each question, classify and score:
1. **Type:** open_ended, probing, clarifying, closed, leading
2. **Quality Score:** 0-10 (10 = excellent discovery question)
3. **Why Good:** What makes it effective
4. **Why Bad:** What could be improved
5. **Better Alternative:** Suggest a better version

**Question Type Definitions:**
- **Open-ended (best):** Encourages detailed responses ("What challenges are you facing?")
- **Probing:** Digs deeper ("Can you tell me more about that?")
- **Clarifying:** Confirms understanding ("So you're saying...?")
- **Closed:** Yes/no answers ("Do you have a budget?")
- **Leading (worst):** Suggests the answer ("You want to save money, right?")

Return JSON:
{
  "questions": [
    {
      "timestamp": "1:30",
      "question_text": "...",
      "question_type": "open_ended",
      "quality_score": 9,
      "why_good": "...",
      "why_bad": null,
      "better_alternative": null
    }
  ],
  "summary": {
    "total_questions": 12,
    "open_ended": 7,
    "probing": 3,
    "clarifying": 1,
    "closed": 1,
    "leading": 0,
    "average_quality": 8.2
  },
  "overall_score": 85,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "recommendations": ["...", "..."]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert sales questioning coach. Analyze question quality with precision and provide actionable feedback.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  // Save to database
  const { data: agentAnalysis } = await supabase
    .from('agent_analysis')
    .insert({
      call_id: callId,
      agent_type: 'question_quality',
      score: result.overall_score,
      analysis_data: result,
      strengths: result.strengths,
      improvements: result.improvements,
      recommendations: result.recommendations
    })
    .select()
    .single();

  // Save individual questions
  if (result.questions && result.questions.length > 0) {
    await supabase.from('questions').insert(
      result.questions.map((q: any) => ({
        call_id: callId,
        agent_analysis_id: agentAnalysis?.id,
        timestamp: q.timestamp,
        question_text: q.question_text,
        question_type: q.question_type,
        quality_score: q.quality_score,
        why_good: q.why_good,
        why_bad: q.why_bad,
        better_alternative: q.better_alternative
      }))
    );
  }

  console.log(`✅ Question Quality: ${result.questions?.length || 0} questions analyzed, score: ${result.overall_score}/100`);
  return result;
}

// ============================================
// MASTER ORCHESTRATOR AGENT 🧠
// ============================================

/**
 * Master Orchestrator Agent
 * Coordinates all agents and synthesizes insights
 */
export async function runMasterOrchestratorAgent(callId: string, agentResults: any) {
  console.log('🧠 Running Master Orchestrator Agent...');

  const prompt = `You are the Master Sales Coach. Synthesize insights from all specialized agents into a unified coaching report.

AGENT RESULTS:
${JSON.stringify(agentResults, null, 2)}

Create a comprehensive coaching report:
1. **Overall Score:** 0-100 (weighted average of all agents)
2. **Top 3 Strengths:** Most impressive aspects of the call
3. **Top 3 Improvements:** Most critical areas to work on
4. **Priority Coaching Focus:** Which ONE skill to focus on first
5. **Recommended Actions:** Specific, prioritized action items
6. **Agent Scores:** Individual scores from each agent

**Scoring Weights:**
- Objection Handling: 25%
- Discovery: 25%
- Closing: 20%
- Talk-Time: 15%
- Question Quality: 15%

Return JSON:
{
  "overall_score": 78,
  "top_strengths": ["...", "...", "..."],
  "top_improvements": ["...", "...", "..."],
  "priority_coaching_focus": "objection_handling",
  "recommended_actions": [
    { "priority": "high", "action": "...", "why": "..." },
    { "priority": "medium", "action": "...", "why": "..." }
  ],
  "agent_scores": {
    "objection_handling": 75,
    "discovery": 85,
    "closing": 80,
    "talk_time": 70,
    "question_quality": 90
  }
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a Master Sales Coach who synthesizes insights from multiple specialized agents. Provide clear, actionable coaching.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  // Save to database
  await supabase.from('master_coach_reports').insert({
    call_id: callId,
    overall_score: result.overall_score,
    top_strengths: result.top_strengths,
    top_improvements: result.top_improvements,
    priority_coaching_focus: result.priority_coaching_focus,
    recommended_actions: result.recommended_actions,
    agent_scores: result.agent_scores
  });

  console.log(`✅ Master Orchestrator: Overall score ${result.overall_score}/100`);
  return result;
}

// ============================================
// MAIN PIPELINE
// ============================================

/**
 * Run all agents on a call
 */
export async function runAllAgents(callId: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🤖 Running AI Agent System for call: ${callId}`);
  console.log(`${'='.repeat(60)}\n`);

  // Get transcript
  const { data: transcriptData, error: transcriptError } = await supabase
    .from('transcripts')
    .select('segments')
    .eq('call_id', callId)
    .single();

  if (transcriptError) {
    console.error('❌ Transcript query error:', transcriptError);
    throw new Error(`Transcript query failed: ${transcriptError.message}`);
  }

  if (!transcriptData || !transcriptData.segments) {
    console.error('❌ No transcript data found for call:', callId);
    throw new Error('No transcript found for this call');
  }

  const transcript = transcriptData.segments;
  const benchmarkContext = await getBenchmarkContext(callId);

  // Run all 5 call analysis agents in parallel
  const [
    objectionResult,
    discoveryResult,
    closingResult,
    talkTimeResult,
    questionResult
  ] = await Promise.all([
    runObjectionHandlerAgent(callId, transcript, benchmarkContext),
    runDiscoveryCoachAgent(callId, transcript, benchmarkContext),
    runClosingCoachAgent(callId, transcript, benchmarkContext),
    runTalkTimeAnalyzerAgent(callId, transcript),
    runQuestionQualityAgent(callId, transcript, benchmarkContext)
  ]);

  // Run master orchestrator
  const masterResult = await runMasterOrchestratorAgent(callId, {
    objection_handler: objectionResult,
    discovery_coach: discoveryResult,
    closing_coach: closingResult,
    talk_time_analyzer: talkTimeResult,
    question_quality: questionResult
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ AI Agent System Complete!`);
  console.log(`   Overall Score: ${masterResult.overall_score}/100`);
  console.log(`   Priority Focus: ${masterResult.priority_coaching_focus}`);
  console.log(`${'='.repeat(60)}\n`);

  return {
    objection_handler: objectionResult,
    discovery_coach: discoveryResult,
    closing_coach: closingResult,
    talk_time_analyzer: talkTimeResult,
    question_quality: questionResult,
    master_orchestrator: masterResult
  };
}

