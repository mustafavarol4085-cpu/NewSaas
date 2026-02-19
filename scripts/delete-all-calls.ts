import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllRealCalls() {
  console.log('\n================================================================================');
  console.log('🗑️  DELETING ALL REAL CALLS FROM DATABASE');
  console.log('================================================================================\n');

  // Get all calls
  const { data: calls, error: fetchError } = await supabase
    .from('calls')
    .select('id, customer_name, rep_name');

  if (fetchError) {
    console.log('❌ Error fetching calls:', fetchError.message);
    return;
  }

  if (!calls || calls.length === 0) {
    console.log('✅ No calls to delete');
    return;
  }

  console.log(`Found ${calls.length} calls to delete\n`);

  for (const call of calls) {
    console.log(`🗑️  Deleting: ${call.customer_name} (${call.rep_name})`);

    // Delete related data first
    
    // 1. Delete transcripts
    const { error: transcriptError } = await supabase
      .from('transcripts')
      .delete()
      .eq('call_id', call.id);

    if (transcriptError) {
      console.log(`   ⚠️  Transcript error: ${transcriptError.message}`);
    } else {
      console.log(`   ✅ Transcript deleted`);
    }

    // 2. Delete analysis
    const { error: analysisError } = await supabase
      .from('analysis')
      .delete()
      .eq('call_id', call.id);

    if (analysisError) {
      console.log(`   ⚠️  Analysis error: ${analysisError.message}`);
    } else {
      console.log(`   ✅ Analysis deleted`);
    }

    // 3. Delete key moments
    const { error: momentError } = await supabase
      .from('key_moments')
      .delete()
      .eq('call_id', call.id);

    if (momentError) {
      console.log(`   ⚠️  Key moments error: ${momentError.message}`);
    } else {
      console.log(`   ✅ Key moments deleted`);
    }

    // 4. Delete insights (if table exists)
    await supabase
      .from('insights')
      .delete()
      .eq('call_id', call.id);

    // 5. Delete the call itself
    const { error: callError } = await supabase
      .from('calls')
      .delete()
      .eq('id', call.id);

    if (callError) {
      console.log(`   ❌ Call error: ${callError.message}`);
    } else {
      console.log(`   ✅ Call deleted`);
    }

    console.log();
  }

  console.log('================================================================================');
  console.log('✅ ALL REAL CALLS DELETED - Only mock calls remain in code');
  console.log('================================================================================\n');
}

deleteAllRealCalls().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
