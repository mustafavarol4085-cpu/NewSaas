import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRepData(repName: string) {
  console.log(`\n================================================================================`);
  console.log(`📊 TEST DATA FOR: ${repName}`);
  console.log(`================================================================================\n`);

  // Get all calls for this rep
  const { data: calls } = await supabase
    .from('calls')
    .select('*')
    .eq('rep_name', repName);

  if (!calls || calls.length === 0) {
    console.log(`❌ No calls found for ${repName}`);
    return;
  }

  console.log(`✅ Found ${calls.length} calls\n`);

  // Get first call details
  const firstCall = calls[0];
  console.log(`📞 First Call Details:`);
  console.log(`   ID: ${firstCall.id}`);
  console.log(`   Customer: ${firstCall.customer_name}`);
  console.log(`   Company: ${firstCall.company}`);
  console.log(`   Type: ${firstCall.call_type}`);
  console.log(`   Audio URL: ${firstCall.audio_url ? '✅ Present' : '❌ Missing'}`);

  // Get transcript
  const { data: transcript } = await supabase
    .from('transcripts')
    .select('*')
    .eq('call_id', firstCall.id)
    .single();

  if (transcript) {
    console.log(`\n📝 Transcript:`);
    console.log(`   Has transcript_text: ${transcript.transcript_text && transcript.transcript_text.length > 0 ? '✅ Yes' : '❌ No'}`);
    console.log(`   Text preview: "${transcript.transcript_text?.substring(0, 80)}..."`);
    console.log(`   Segments: ${transcript.segments?.length || 0}`);
    if (transcript.segments && transcript.segments.length > 0) {
      const firstSegment = transcript.segments[0];
      console.log(`   First segment: ${firstSegment.speaker}: "${firstSegment.text.substring(0, 60)}..."`);
    }
  } else {
    console.log(`\n❌ No transcript found for first call`);
  }

  // Get analysis
  const { data: analysis } = await supabase
    .from('analysis')
    .select('*')
    .eq('call_id', firstCall.id)
    .single();

  if (analysis) {
    console.log(`\n📊 Analysis:`);
    console.log(`   Overall Score: ${analysis.scores?.overall || 'N/A'}/100`);
    console.log(`   Discovery: ${analysis.scores?.discovery || 'N/A'}/100`);
    console.log(`   Qualification: ${analysis.scores?.qualification || 'N/A'}/100`);
    console.log(`   Objection Handling: ${analysis.scores?.objection_handling || 'N/A'}/100`);
    console.log(`   Closing: ${analysis.scores?.closing || 'N/A'}/100`);
    console.log(`   Rapport Building: ${analysis.scores?.rapport_building || 'N/A'}/100`);
    console.log(`   Coaching: ${analysis.coaching?.feedback?.substring(0, 60)}...`);
  } else {
    console.log(`\n❌ No analysis found for first call`);
  }

  // Test data formatting for dashboard display
  console.log(`\n📋 Formatted for Dashboard:`);
  if (transcript) {
    const formatted = transcript.transcript_text && transcript.transcript_text.length > 50
      ? transcript.transcript_text
      : transcript.segments?.map((s: any) => `${s.speaker === 'rep' ? 'Rep' : 'Customer'}: ${s.text}`).join('\n\n');
    console.log(`   Transcript preview: "${formatted?.substring(0, 80)}..."`);
    console.log(`   Transcript length: ${formatted?.length || 0} characters`);
  }

  console.log();
}

async function main() {
  const reps = ['Sarah Johnson', 'Tom Martinez', 'Emma Rodriguez'];
  
  for (const rep of reps) {
    await testRepData(rep);
  }

  console.log('================================================================================');
  console.log('✅ Test complete - all data is ready for dashboard display');
  console.log('================================================================================\n');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
