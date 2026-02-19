import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAudioFiles() {
  console.log('\n================================================================================');
  console.log('🔍 AUDIO FILES VERIFICATION');
  console.log('================================================================================\n');

  // Get all calls
  const { data: calls } = await supabase
    .from('calls')
    .select('*')
    .order('created_at', { ascending: false });

  if (!calls || calls.length === 0) {
    console.log('❌ No calls found');
    return;
  }

  console.log(`📞 Total calls: ${calls.length}\n`);

  // Check each call's audio
  let audioCount = 0;
  let noAudioCount = 0;

  for (const call of calls) {
    if (call.audio_url) {
      audioCount++;
      console.log(`✅ ${call.customer_name} (${call.rep_name})`);
      console.log(`   Audio URL: ${call.audio_url?.substring(0, 80)}...`);
      
      // Try to fetch the audio file to verify it exists
      try {
        const response = await fetch(call.audio_url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`   Status: File exists ✅`);
        } else {
          console.log(`   Status: URL broken (${response.status}) ❌`);
        }
      } catch (err) {
        console.log(`   Status: Cannot verify access ⚠️`);
      }
    } else {
      noAudioCount++;
      console.log(`❌ ${call.customer_name} (${call.rep_name}) - NO AUDIO`);
    }
    console.log();
  }

  console.log('================================================================================');
  console.log(`📊 Summary: ${audioCount} with audio, ${noAudioCount} without`);
  console.log('================================================================================\n');

  // Check transcripts as well
  const { data: transcripts } = await supabase
    .from('transcripts')
    .select('*');

  console.log(`📝 Transcripts: ${transcripts?.length || 0} records\n`);

  // Check analysis
  const { data: analysis } = await supabase
    .from('analysis')
    .select('*');

  console.log(`📊 Analysis: ${analysis?.length || 0} records\n`);
}

verifyAudioFiles().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
