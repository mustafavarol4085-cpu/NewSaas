import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('\n🔍 Checking what\'s loaded for Sarah Johnson calls\n');

  const { data: calls } = await supabase
    .from('calls')
    .select('id, customer_name, rep_name')
    .eq('rep_name', 'Sarah Johnson');

  if (!calls || calls.length === 0) {
    console.log('❌ No Sarah Johnson calls');
    return;
  }

  console.log(`✅ Found ${calls.length} Sarah Johnson calls\n`);

  for (const call of calls.slice(0, 3)) {
    console.log(`📞 ${call.customer_name} (ID: ${call.id})`);

    // Check key moments
    const { data: moments } = await supabase
      .from('key_moments')
      .select('*')
      .eq('call_id', call.id);

    console.log(`   Key moments: ${moments?.length || 0}`);
    if (moments && moments.length > 0) {
      moments.slice(0, 2).forEach(m => console.log(`      - ${m.time}: ${m.label}`));
    }

    // Check insights
    const { data: insights } = await supabase
      .from('insights')
      .select('*')
      .eq('call_id', call.id);

    console.log(`   Insights: ${insights?.length || 0}`);

    // Check analysis
    const { data: analysis } = await supabase
      .from('analysis')
      .select('*')
      .eq('call_id', call.id);

    console.log(`   Analysis: ${analysis ? '✅ Yes' : '❌ No'}`);
    if (analysis) {
      console.log(`      Score: ${analysis.scores?.overall || 'N/A'}`);
      console.log(`      Coaching: ${analysis.coaching?.feedback?.substring(0, 50)}...`);
    }

    // Check transcript
    const { data: transcript } = await supabase
      .from('transcripts')
      .select('*')
      .eq('call_id', call.id);

    console.log(`   Transcript: ${transcript ? '✅ Yes' : '❌ No'}`);
    if (transcript) {
      console.log(`      Text length: ${transcript.transcript_text?.length || 0} chars`);
    }

    console.log();
  }
}

checkData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
