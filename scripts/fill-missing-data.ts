import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fillMissingData() {
  console.log('🔍 Finding missing transcripts and analysis for Sarah Johnson...\n');

  // Get all Sarah Johnson calls
  const { data: sarahCalls } = await supabase
    .from('calls')
    .select('*')
    .eq('rep_name', 'Sarah Johnson');

  // Get existing transcripts and analysis
  const { data: transcripts } = await supabase
    .from('transcripts')
    .select('call_id');

  const { data: analysis } = await supabase
    .from('analysis')
    .select('call_id');

  const transcriptCallIds = new Set(transcripts?.map(t => t.call_id) || []);
  const analysisCallIds = new Set(analysis?.map(a => a.call_id) || []);

  // Find calls missing transcripts or analysis
  const missingCalls = sarahCalls?.filter(
    call => !transcriptCallIds.has(call.id) || !analysisCallIds.has(call.id)
  ) || [];

  if (missingCalls.length === 0) {
    console.log('✅ All Sarah Johnson calls have complete transcripts and analysis!');
    return;
  }

  console.log(`⚠️  Found ${missingCalls.length} calls with missing data:\n`);

  // Create transcripts and analysis for missing calls
  for (const call of missingCalls) {
    console.log(`📞 Processing: ${call.customer_name} (${call.company})`);

    // Create mock transcript if missing
    if (!transcriptCallIds.has(call.id)) {
      const segments = [
        {
          timestamp: '0:00',
          speaker: 'rep' as const,
          text: `Hi ${call.customer_name}, this is ${call.rep_name} from our company. How are you doing today?`
        },
        {
          timestamp: '0:15',
          speaker: 'customer' as const,
          text: 'Hi, I\'m doing well. What is this call about?'
        },
        {
          timestamp: '0:28',
          speaker: 'rep' as const,
          text: `I wanted to discuss how we can help ${call.company} with their ${call.industry} needs.`
        },
        {
          timestamp: '1:00',
          speaker: 'customer' as const,
          text: 'That sounds interesting. Tell me more.'
        }
      ];

      const { error: transcriptError } = await supabase
        .from('transcripts')
        .insert({
          call_id: call.id,
          segments: segments,
          transcript_text: segments.map(s => `${s.speaker === 'rep' ? 'Rep' : 'Customer'}: ${s.text}`).join('\n\n'),
          language: 'en'
        });

      if (transcriptError) {
        console.log(`   ❌ Failed to create transcript: ${transcriptError.message}`);
      } else {
        console.log(`   ✅ Created transcript`);
      }
    }

    // Create mock analysis if missing
    if (!analysisCallIds.has(call.id)) {
      const { error: analysisError } = await supabase
        .from('analysis')
        .insert({
          call_id: call.id,
          scores: {
            overall: 78,
            discovery: 75,
            qualification: 80,
            objection_handling: 76,
            closing: 78,
            rapport_building: 82
          },
          coaching: {
            feedback: `Call with ${call.customer_name} went well. Focus on deeper discovery questions and better objection handling.`,
            strengths: ['Built good rapport', 'Clear communication'],
            improvement_areas: ['Deeper discovery', 'Objection handling']
          }
        });

      if (analysisError) {
        console.log(`   ❌ Failed to create analysis: ${analysisError.message}`);
      } else {
        console.log(`   ✅ Created analysis`);
      }
    }

    console.log();
  }

  console.log('✅ Missing data generation complete!');
}

fillMissingData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
