/**
 * Generate new realistic calls for each rep with OpenAI transcripts
 * Creates 3 additional calls per rep with complete data
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const openaiKey = process.env.VITE_OPENAI_API_KEY!;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

// Industries for variety
const industries = ['SaaS', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Education', 'Energy', 'Real Estate'];
const products = ['Cloud Platform', 'Analytics Tool', 'CRM System', 'Automation Software', 'Security Suite'];
const callTypes = ['Discovery', 'Demo', 'Follow-up', 'Consultation', 'Technical Review'];

interface CallSegment {
  timestamp: string;
  speaker: 'Rep' | 'Customer';
  text: string;
}

interface CallRecord {
  customer_name: string;
  rep_name: string;
  company: string;
  industry: string;
  call_type: string;
  duration_seconds: number;
  started_at: string;
  ended_at: string;
  outcome: string;
  rep_id?: string;
  status: string;
  external_call_id?: string;
  source?: string;
}

interface AnalysisScore {
  overall: number;
  discovery: number;
  qualification: number;
  objection_handling: number;
  closing: number;
  rapport_building: number;
}

// Generate a realistic conversation based on call type and industry
async function generateTranscript(
  repName: string,
  customerName: string,
  company: string,
  industry: string,
  callType: string
): Promise<{ transcript: string; segments: CallSegment[]; durationSeconds: number; score: number }> {
  console.log(`\n🤖 Generating transcript for ${customerName} (${company}) - ${callType} call...`);

  // Create a simpler prompt that generates segments directly
  const prompt = `Generate a realistic ${callType} sales call conversation between a rep named ${repName} and customer ${customerName} from ${company}. This is a ${industry} company.

Create realistic dialogue with timestamps (MM:SS format). The call should last ${callType === 'Discovery' ? '3-5 minutes' : callType === 'Demo' ? '4-6 minutes' : '2-4 minutes'}.

Return ONLY a JSON object (no markdown, no explanation):
{
  "segments": [
    {"timestamp": "0:00", "speaker": "Rep", "text": "opening greeting"},
    {"timestamp": "0:10", "speaker": "Customer", "text": "customer response"}
  ],
  "score": 75
}

Make the dialogue realistic with customer objections and rep handling them professionally.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = (response.choices[0].message.content || '').trim();
    
    // Try to extract JSON - look for the first { and last }
    const startIdx = content.indexOf('{');
    const endIdx = content.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      throw new Error('No valid JSON found in response');
    }

    let jsonStr = content.substring(startIdx, endIdx + 1);
    
    // Clean up common JSON issues
    jsonStr = jsonStr
      .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
      .replace(/[\n\r\t]/g, ' ')  // Replace line breaks and tabs with spaces
      .replace(/  +/g, ' ');  // Replace multiple spaces with single space
    
    const data = JSON.parse(jsonStr);
    const segments: CallSegment[] = (data.segments || []).map((s: any) => ({
      timestamp: s.timestamp || '0:00',
      speaker: (s.speaker === 'rep' || s.speaker === 'Rep' ? 'Rep' : 'Customer') as 'Rep' | 'Customer',
      text: s.text || ''
    }));
    
    if (segments.length === 0) {
      throw new Error('No segments generated');
    }

    // Calculate duration from last timestamp
    let durationSeconds = 180; // Default 3 minutes
    const lastSegment = segments[segments.length - 1];
    const timeParts = lastSegment.timestamp.split(':');
    durationSeconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);

    // Create full transcript
    const transcript = segments
      .map(s => `[${s.timestamp}] ${s.speaker}: ${s.text}`)
      .join('\n');

    const score = Math.min(95, Math.max(30, data.score || 65));

    return { transcript, segments, durationSeconds, score };
  } catch (error) {
    console.error(`      ❌ Error generating transcript:`, error instanceof Error ? error.message : String(error));
    // Return a simple fallback transcript
    const segments: CallSegment[] = [
      { timestamp: '0:00', speaker: 'Rep', text: `Hello, is this ${customerName}?` },
      { timestamp: '0:05', speaker: 'Customer', text: 'Yes, speaking.' },
      { timestamp: '0:10', speaker: 'Rep', text: `Great! This is ${repName} calling about our solutions for ${industry}.` },
      { timestamp: '0:20', speaker: 'Customer', text: 'What is this about?' },
      { timestamp: '0:25', speaker: 'Rep', text: 'We help companies like yours improve efficiency. Do you have a few minutes?' },
      { timestamp: '0:35', speaker: 'Customer', text: 'Sure, go ahead.' },
      { timestamp: '0:45', speaker: 'Rep', text: 'Perfect! Let me ask - what are your biggest challenges right now?'},
      { timestamp: '1:00', speaker: 'Customer', text: 'We struggle with scaling and team coordination.'},
      { timestamp: '1:15', speaker: 'Rep', text: 'That sounds interesting. How is that impacting your business?'}
    ];

    const transcript = segments
      .map(s => `[${s.timestamp}] ${s.speaker}: ${s.text}`)
      .join('\n');

    return {
      transcript,
      segments,
      durationSeconds: 300,
      score: 65
    };
  }
}

// Generate realistic company names and customer names
function generateCustomerName(): string {
  const firstNames = ['Michael', 'Jennifer', 'David', 'Sarah', 'Robert', 'Emily', 'James', 'Lisa', 'William', 'Jessica'];
  const lastNames = ['Chen', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  return firstNames[Math.floor(Math.random() * firstNames.length)] + ' ' + lastNames[Math.floor(Math.random() * lastNames.length)];
}

function generateCompanyName(): string {
  const prefixes = ['Tech', 'Cloud', 'Digital', 'Global', 'Smart', 'Prime', 'Elite', 'Apex', 'Quantum', 'Nexus'];
  const suffixes = ['Solutions', 'Systems', 'Labs', 'Group', 'Enterprise', 'Industries', 'Innovations', 'Services', 'Partners', 'Ventures'];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + ' ' + suffixes[Math.floor(Math.random() * suffixes.length)];
}

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDaysAgo(maxDays: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * maxDays));
  return date;
}

async function createNewCalls() {
  console.log('🚀 Generating New Calls with Complete Data...\n');

  try {
    // Get all existing reps
    const { data: reps, error: repsError } = await supabase
      .from('reps')
      .select('id, name')
      .eq('status', 'active');

    if (repsError || !reps || reps.length === 0) {
      console.error('❌ Error fetching reps:', repsError);
      return;
    }

    console.log(`📊 Found ${reps.length} active reps\n`);

    let totalCallsCreated = 0;

    // For each rep, create 3 new calls
    for (const rep of reps) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`👤 Rep: ${rep.name}`);
      console.log(`${'='.repeat(60)}`);

      for (let i = 0; i < 3; i++) {
        const customerName = generateCustomerName();
        const company = generateCompanyName();
        const industry = getRandomItem(industries);
        const callType = getRandomItem(callTypes);

        console.log(`\n   📞 Call ${i + 1}/3: ${customerName} from ${company}`);

        // Generate transcript with OpenAI
        const { transcript, segments, durationSeconds, score } = await generateTranscript(
          rep.name,
          customerName,
          company,
          industry,
          callType
        );

        // Create the call record
        const callDate = getRandomDaysAgo(30);
        const callStartTime = new Date(callDate);
        callStartTime.setHours(Math.floor(Math.random() * 8) + 9); // 9 AM to 5 PM
        
        const callEndTime = new Date(callStartTime);
        callEndTime.setSeconds(callEndTime.getSeconds() + durationSeconds);

        const externalCallId = `ai-gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const callRecord: CallRecord = {
          external_call_id: externalCallId,
          source: 'ai_generated',
          customer_name: customerName,
          rep_name: rep.name,
          company: company,
          industry: industry,
          call_type: callType,
          duration_seconds: durationSeconds,
          started_at: callStartTime.toISOString(),
          ended_at: callEndTime.toISOString(),
          outcome: score > 70 ? 'successful' : score > 50 ? 'promising' : 'needs_follow_up',
          status: 'completed',
          rep_id: rep.id
        };

        // Insert call
        const { data: insertedCall, error: callError } = await supabase
          .from('calls')
          .insert([callRecord])
          .select('id');

        if (callError || !insertedCall || insertedCall.length === 0) {
          console.error(`      ❌ Error creating call:`, callError);
          continue;
        }

        const callId = insertedCall[0].id;
        console.log(`      ✅ Call created (ID: ${callId.substring(0, 8)}...)`);
        console.log(`         Score: ${score}/100 | Duration: ${Math.round(durationSeconds / 60)}m | Type: ${callType}`);

        // Insert transcript
        const { error: transcriptError } = await supabase
          .from('transcripts')
          .insert([
            {
              call_id: callId,
              segments: segments,
              language: 'en'
            }
          ]);

        if (transcriptError) {
          console.error(`      ❌ Error creating transcript:`, transcriptError);
        } else {
          console.log(`      ✅ Transcript created (${segments.length} segments)`);
        }

        // Create analysis record with scores
        const analysisScores: AnalysisScore = {
          overall: score,
          discovery: Math.min(100, Math.max(0, score + Math.floor(Math.random() * 15) - 7)),
          qualification: Math.min(100, Math.max(0, score + Math.floor(Math.random() * 15) - 7)),
          objection_handling: Math.min(100, Math.max(0, score + Math.floor(Math.random() * 15) - 7)),
          closing: Math.min(100, Math.max(0, score + Math.floor(Math.random() * 15) - 7)),
          rapport_building: Math.min(100, Math.max(0, score + Math.floor(Math.random() * 15) - 7)),
        };

        const coachingData = {
          feedback: `${callType} call performance was ${score > 75 ? 'strong' : score > 50 ? 'moderate' : 'needs improvement'}. Customer engagement level: ${score > 75 ? 'High' : score > 50 ? 'Medium' : 'Low'}. Next steps: ${callRecord.outcome}`,
          strengths: [`Handled ${callType} phase professionally`, `Customer engagement maintained`, `Professional communication`],
          dimension_notes: {
            discovery: `Score: ${analysisScores.discovery}/100`,
            objection_handling: `Score: ${analysisScores.objection_handling}/100`,
            closing: `Score: ${analysisScores.closing}/100`
          },
          improvement_areas: [score < 75 ? 'Focus on stronger closing techniques' : 'Continue current approach', 'Practice active listening']
        };

        const { error: analysisError } = await supabase
          .from('analysis')
          .insert([
            {
              call_id: callId,
              scores: analysisScores,
              coaching: coachingData,
              raw: { callType, company, customerName }
            }
          ]);

        if (analysisError) {
          console.error(`      ❌ Error creating analysis:`, analysisError);
        } else {
          console.log(`      ✅ Analysis created with overall score: ${score}/100`);
        }

        totalCallsCreated++;

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Successfully created ${totalCallsCreated} new calls!`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
createNewCalls().catch(console.error);
