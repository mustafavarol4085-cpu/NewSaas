import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

if (!apiKey) {
  console.warn('⚠️ VITE_OPENAI_API_KEY is not defined – check your .env.local file.');
}

const openai = apiKey
  ? new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Dev only – use backend proxy in production
    })
  : null;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CoachingContext {
  role: 'rep' | 'manager';
  userName?: string;
  overallScore?: number;
  recentCalls?: Array<{ customer: string; score: number; type: string }>;
  teamData?: Array<{ name: string; score: number; trend: string }>;
  strengths?: string[];
  improvements?: string[];
  aiCoachingData?: {
    masterReport: any;
    agentAnalysis: any[];
    objections: any[];
    questions: any[];
  } | null;
}

// Build system prompt based on context
function buildSystemPrompt(context: CoachingContext): string {
  const { role, userName, overallScore, strengths, improvements, aiCoachingData } = context;

  let systemPrompt = '';

  if (role === 'rep') {
    systemPrompt = `You are an expert AI Sales Coach helping ${userName || 'the sales rep'} improve their performance.

**IMPORTANT: You have access to REAL call data from this company's Supabase database. Always reference specific calls, scores, and insights when answering.**

**Current Performance:**
- Overall Score: ${overallScore || 'N/A'}/100
- Top Strengths: ${strengths?.slice(0, 3).join(', ') || 'Building rapport, active listening'}
- Areas to Improve: ${improvements?.slice(0, 3).join(', ') || 'Objection handling, closing techniques'}

**Recent Calls:**
${context.recentCalls?.slice(0, 5).map((call, i) =>
  `${i + 1}. ${call.customer} - ${call.type} call - Score: ${call.score}/100`
).join('\n') || 'No recent calls available'}

**Your Role:**
- ALWAYS reference specific calls by customer name when answering
- Provide actionable, specific coaching advice based on REAL data
- Be encouraging but honest
- Focus on practical tips they can use immediately
- Use sales methodologies: SPIN, BANT, MEDDIC

**Communication Style:**
- Friendly and supportive
- Use emojis sparingly (1-2 per message)
- Keep responses concise (2-3 paragraphs max)
- ALWAYS mention specific customer names and call details from the data above`;

    // Add AI coaching data if available
    if (aiCoachingData?.masterReport) {
      const report = aiCoachingData.masterReport;
      systemPrompt += `

**Latest Call AI Analysis (from Master Coach Agent):**
- Overall Score: ${report.overall_score}/100
- Priority Coaching Focus: ${report.priority_coaching_focus}

**Top Strengths:**
${report.top_strengths?.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') || 'N/A'}

**Top Improvements Needed:**
${report.top_improvements?.map((imp: string, i: number) => `${i + 1}. ${imp}`).join('\n') || 'N/A'}

**Agent Scores:**
${Object.entries(report.agent_scores || {}).map(([key, score]) =>
  `- ${key.replace(/_/g, ' ')}: ${score}/100`
).join('\n')}`;
    }

    if (aiCoachingData?.objections && aiCoachingData.objections.length > 0) {
      systemPrompt += `

**Objections Detected in Latest Call:**
${aiCoachingData.objections.map((obj: any, i: number) =>
  `${i + 1}. [${obj.timestamp}] ${obj.category.toUpperCase()} objection
   Customer: "${obj.customer_said}"
   Rep Response Score: ${obj.response_score}/10
   ${obj.response_analysis ? `Analysis: ${obj.response_analysis}` : ''}
   Suggested Better Response: "${obj.suggested_responses?.[0] || 'N/A'}"
   Resolved: ${obj.was_resolved ? 'Yes ✓' : 'No ✗'}`
).join('\n\n')}`;
    }

    if (aiCoachingData?.questions && aiCoachingData.questions.length > 0) {
      const avgScore = aiCoachingData.questions.reduce((sum: number, q: any) => sum + q.quality_score, 0) / aiCoachingData.questions.length;
      systemPrompt += `

**Questions Asked in Latest Call:**
Average Quality Score: ${avgScore.toFixed(1)}/10

${aiCoachingData.questions.map((q: any, i: number) =>
  `${i + 1}. [${q.timestamp}] "${q.question_text}"
   Type: ${q.question_type} | Score: ${q.quality_score}/10
   ${q.why_good ? `✓ ${q.why_good}` : ''}
   ${q.why_bad ? `✗ ${q.why_bad}` : ''}
   ${q.better_alternative ? `Better: "${q.better_alternative}"` : ''}`
).join('\n\n')}`;
    }

  } else {
    // Manager role
    systemPrompt = `You are an expert AI Team Intelligence Assistant helping ${userName || 'the sales manager'} coach their team.

**IMPORTANT: You have access to REAL team performance data from this company's Supabase database. Always reference specific reps, scores, and trends when answering.**

**Your Role:**
- ALWAYS reference specific rep names and their actual scores
- Provide team-level insights and coaching strategies based on REAL data
- Help identify patterns across reps
- Suggest targeted coaching interventions
- Recommend best practices from top performers

**Communication Style:**
- Professional and data-driven
- Focus on actionable team strategies
- Highlight both individual and team trends
- Keep responses concise and strategic
- ALWAYS mention specific rep names and their performance data`;

    if (context.teamData && context.teamData.length > 0) {
      const teamAvg = context.teamData.reduce((sum, rep) => sum + rep.score, 0) / context.teamData.length;
      const topPerformer = context.teamData.reduce((top, rep) => rep.score > top.score ? rep : top, context.teamData[0]);
      const needsHelp = context.teamData.filter(rep => rep.score < 60);

      systemPrompt += `

**Current Team Performance (REAL DATA):**
Team Average: ${teamAvg.toFixed(1)}/100

**Individual Rep Scores:**
${context.teamData.map((rep, i) => {
  const trend = rep.trend === 'up' ? '📈 Improving' : rep.trend === 'down' ? '📉 Declining' : '➡️ Stable';
  return `${i + 1}. ${rep.name}: ${rep.score}/100 ${trend}`;
}).join('\n')}

**Key Insights:**
- Top Performer: ${topPerformer.name} (${topPerformer.score}/100)
- Reps Needing Attention: ${needsHelp.length > 0 ? needsHelp.map(r => `${r.name} (${r.score}/100)`).join(', ') : 'None'}
- Team Trend: ${context.teamData.filter(r => r.trend === 'up').length} improving, ${context.teamData.filter(r => r.trend === 'down').length} declining

**When answering questions:**
- Always reference these specific reps by name
- Use their actual scores and trends
- Provide specific, actionable coaching recommendations`;
    }
  }

  return systemPrompt;
}

// Main chat function
export async function sendChatMessage(
  messages: ChatMessage[],
  context: CoachingContext
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key is missing. Set VITE_OPENAI_API_KEY in .env.local.');
  }

  try {
    const systemPrompt = buildSystemPrompt(context);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to get AI response. Please try again.');
  }
}

// Low-latency live coaching helper (short actionable output)
export async function generateLiveMicroTip(input: {
  transcriptSnippet: string;
  customerName?: string;
  callType?: string;
}): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key is missing. Set VITE_OPENAI_API_KEY in .env.local.');
  }

  const prompt = `You are a real-time sales coach.

Context:
- Customer: ${input.customerName || 'Unknown'}
- Call type: ${input.callType || 'Call'}
- Latest transcript snippet: ${input.transcriptSnippet}

Return very short coaching output in this exact format:
1) Next best sentence (one sentence the rep can say now)
2) Risk alert (max 8 words)
3) Goal for next 30 seconds (one short line)

Keep total output under 70 words.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You provide instant, concise, tactical coaching during live sales calls.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 120,
    });

    return response.choices[0]?.message?.content || 'No coaching tip generated.';
  } catch (error) {
    console.error('OpenAI live micro-tip error:', error);
    throw new Error('Failed to generate live coaching tip.');
  }
}

// Streaming chat function (for real-time typing effect)
export async function* streamChatMessage(
  messages: ChatMessage[],
  context: CoachingContext
): AsyncGenerator<string, void, unknown> {
  if (!openai) {
    throw new Error('OpenAI API key is missing. Set VITE_OPENAI_API_KEY in .env.local.');
  }

  try {
    const systemPrompt = buildSystemPrompt(context);

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error('OpenAI Streaming Error:', error);
    throw new Error('Failed to stream AI response. Please try again.');
  }
}

// =====================================================
// MEETING ASSISTANT – REAL-TIME AI COACHING
// =====================================================

export interface MeetingMessage {
  id: string;
  speaker: 'rep' | 'customer' | 'system';
  text: string;
  timestamp: string;
}

/**
 * AI-powered speaker detection.
 * Given conversation history + a new utterance, AI decides if the speaker
 * is the rep or the customer based on context, tone, and content.
 */
export async function detectSpeaker(input: {
  newUtterance: string;
  conversationHistory: MeetingMessage[];
  customerName: string;
  callType: string;
}): Promise<'rep' | 'customer'> {
  if (!openai) return 'rep';

  const historyText = input.conversationHistory.slice(-6)
    .map(m => `[${m.speaker.toUpperCase()}] ${m.text}`)
    .join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a speaker-diarization assistant for a live sales call.
Given the conversation history and a new spoken sentence, decide who said it: the sales REP or the CUSTOMER.

Clues:
- REP typically: pitches product, asks discovery questions, handles objections, uses sales language, offers demos/pricing
- CUSTOMER typically: asks about price/features, raises concerns/objections, talks about their company/needs, says "we need", "our team"

Customer name: ${input.customerName}
Call type: ${input.callType}

Reply with ONLY one word: REP or CUSTOMER`
        },
        {
          role: 'user',
          content: `Conversation so far:\n${historyText || '(start of call)'}\n\nNew utterance: "${input.newUtterance}"\n\nWho said this? REP or CUSTOMER?`
        }
      ],
      temperature: 0,
      max_tokens: 5,
    });

    const answer = (response.choices[0]?.message?.content || '').trim().toUpperCase();
    return answer.includes('CUSTOMER') ? 'customer' : 'rep';
  } catch {
    return 'rep';
  }
}

/**
 * Stream real-time meeting coaching based on full conversation context.
 * Uses gpt-4o-mini with streaming for sub-2s first-token latency.
 */
export async function* streamMeetingCoaching(input: {
  conversationHistory: MeetingMessage[];
  customerName: string;
  callType: string;
  kbContext?: string;
}): AsyncGenerator<string, void, unknown> {
  if (!openai) {
    throw new Error('OpenAI API key is missing.');
  }

  const conversationText = input.conversationHistory
    .map(m => `[${m.speaker.toUpperCase()}] ${m.text}`)
    .join('\n');

  const systemPrompt = `You are a real-time AI Meeting Assistant embedded in a sales coaching platform.
You watch the live conversation and provide instant, actionable coaching to the sales rep.

RULES:
- Be extremely concise (max 60 words total)
- Output EXACTLY this format, nothing else:

💡 **Say Next:** <one sentence the rep should say right now>
⚠️ **Risk:** <max 8 words about any risk or missed opportunity>
🎯 **30s Goal:** <one short action for the next 30 seconds>
📊 **Sentiment:** <Positive/Neutral/Negative + 2 words why>

${input.kbContext ? `\nKNOWLEDGE BASE CONTEXT (use if relevant):\n${input.kbContext}\n` : ''}

Customer: ${input.customerName}
Call Type: ${input.callType}`;

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Live conversation so far:\n\n${conversationText}\n\nProvide instant coaching for the rep.` }
      ],
      temperature: 0.15,
      max_tokens: 180,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error('Meeting coaching stream error:', error);
    throw new Error('Failed to stream meeting coaching.');
  }
}

/**
 * Generate a post-meeting summary from full conversation.
 */
export async function generateMeetingSummary(input: {
  conversationHistory: MeetingMessage[];
  customerName: string;
  callType: string;
}): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key is missing.');
  }

  const conversationText = input.conversationHistory
    .map(m => `[${m.speaker.toUpperCase()}] ${m.text}`)
    .join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a sales call analyst. Provide a structured post-call summary.`
        },
        {
          role: 'user',
          content: `Customer: ${input.customerName}
Call Type: ${input.callType}
Conversation:
${conversationText}

Provide a summary with:
1. **Call Score** (0-100)
2. **Key Takeaways** (3 bullets)
3. **Action Items** (numbered list)
4. **Objections Raised** (list with how they were handled)
5. **Next Steps** (what should happen after this call)
6. **Rep Performance** (2-3 sentence assessment)`
        }
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    return response.choices[0]?.message?.content || 'Summary could not be generated.';
  } catch (error) {
    console.error('Meeting summary error:', error);
    throw new Error('Failed to generate meeting summary.');
  }
}

