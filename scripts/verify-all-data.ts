import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyData() {
  console.log('\n================================================================================');
  console.log('📊 DATA VERIFICATION REPORT');
  console.log('================================================================================\n');

  // Get all calls
  const { data: calls, error: callsError } = await supabase
    .from('calls')
    .select('*')
    .order('created_at', { ascending: false });

  console.log(`✅ CALLS: ${calls?.length || 0} records`);
  if (calls && calls.length > 0) {
    console.log(`   First call: ${calls[0].customer_name} - ${calls[0].rep_name} (ID: ${calls[0].id})`);
    console.log(`   Audio URL present: ${calls[0].audio_url ? '✅ Yes' : '❌ No'}`);
  }

  // Get all transcripts
  const { data: transcripts, error: transcriptsError } = await supabase
    .from('transcripts')
    .select('*')
    .order('created_at', { ascending: false });

  console.log(`\n✅ TRANSCRIPTS: ${transcripts?.length || 0} records`);
  if (transcripts && transcripts.length > 0) {
    const t = transcripts[0];
    console.log(`   First transcript (Call ID: ${t.call_id})`);
    console.log(`   - Has transcript_text: ${t.transcript_text && t.transcript_text.length > 0 ? '✅ Yes' : '❌ No'}`);
    console.log(`   - Has segments: ${t.segments && Array.isArray(t.segments) && t.segments.length > 0 ? `✅ Yes (${t.segments.length} segments)` : '❌ No'}`);
    if (t.segments && Array.isArray(t.segments) && t.segments.length > 0) {
      console.log(`   - Sample segment: ${t.segments[0].speaker}: "${t.segments[0].text.substring(0, 50)}..."`);
    }
  }

  // Get all analysis
  const { data: analysis, error: analysisError } = await supabase
    .from('analysis')
    .select('*')
    .order('created_at', { ascending: false });

  console.log(`\n✅ ANALYSIS: ${analysis?.length || 0} records`);
  if (analysis && analysis.length > 0) {
    const a = analysis[0];
    console.log(`   First analysis (Call ID: ${a.call_id})`);
    console.log(`   - Overall score: ${a.scores?.overall || 'N/A'}`);
    console.log(`   - Has coaching: ${a.coaching?.feedback ? '✅ Yes' : '❌ No'}`);
  }

  // Check for each rep
  console.log('\n================================================================================');
  console.log('📊 DATA BY REP');
  console.log('================================================================================\n');

  const reps = ['Sarah Johnson', 'Tom Martinez', 'Emma Rodriguez'];
  
  for (const rep of reps) {
    const repCalls = calls?.filter(c => c.rep_name === rep) || [];
    const repTranscripts = transcripts?.filter(t => repCalls.some(c => c.id === t.call_id)) || [];
    const repAnalysis = analysis?.filter(a => repCalls.some(c => c.id === a.call_id)) || [];
    
    console.log(`👤 ${rep}`);
    console.log(`   ├─ Calls: ${repCalls.length}`);
    console.log(`   ├─ Transcripts: ${repTranscripts.length}`);
    console.log(`   ├─ Analysis: ${repAnalysis.length}`);
    
    // Check audio files
    const withAudio = repCalls.filter(c => c.audio_url).length;
    const withoutAudio = repCalls.length - withAudio;
    console.log(`   ├─ Audio files: ${withAudio} with, ${withoutAudio} without`);
    
    if (repCalls.length > 0) {
      const firstCall = repCalls[0];
      console.log(`   └─ Sample: ${firstCall.customer_name} (${firstCall.call_type})`);
    }
    console.log();
  }

  // Check for mismatches
  console.log('================================================================================');
  console.log('🔍 DATA INTEGRITY CHECKS');
  console.log('================================================================================\n');

  let issues = 0;

  // Check calls without transcripts
  const callsWithoutTranscripts = calls?.filter(
    c => !transcripts?.some(t => t.call_id === c.id)
  ) || [];
  if (callsWithoutTranscripts.length > 0) {
    console.log(`❌ ${callsWithoutTranscripts.length} calls without transcripts:`);
    callsWithoutTranscripts.slice(0, 3).forEach(c => {
      console.log(`   - ${c.customer_name} (ID: ${c.id})`);
    });
    issues++;
  }

  // Check calls without analysis
  const callsWithoutAnalysis = calls?.filter(
    c => !analysis?.some(a => a.call_id === c.id)
  ) || [];
  if (callsWithoutAnalysis.length > 0) {
    console.log(`❌ ${callsWithoutAnalysis.length} calls without analysis:`);
    callsWithoutAnalysis.slice(0, 3).forEach(c => {
      console.log(`   - ${c.customer_name} (ID: ${c.id})`);
    });
    issues++;
  }

  // Check calls without audio
  const callsWithoutAudio = calls?.filter(c => !c.audio_url) || [];
  if (callsWithoutAudio.length > 0) {
    console.log(`⚠️  ${callsWithoutAudio.length} calls without audio files`);
    issues++;
  }

  if (issues === 0) {
    console.log('✅ All integrity checks passed!');
  }

  console.log('\n================================================================================\n');
}

verifyData().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
