import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAudioUrls() {
  console.log('\n🔍 CHECKING AUDIO URLS IN DATABASE\n');

  const { data: calls } = await supabase
    .from('calls')
    .select('id, customer_name, rep_name, audio_url')
    .limit(5);

  console.log('Sample audio URLs from database:');
  calls?.forEach(call => {
    console.log(`\n📞 ${call.customer_name} (${call.rep_name})`);
    console.log(`   URL: ${call.audio_url}`);
    if (call.audio_url) {
      console.log(`   Length: ${call.audio_url.length} chars`);
      console.log(`   Ends with: ${call.audio_url.substring(call.audio_url.length - 30)}`);
    }
  });

  // Check Supabase Storage directly
  console.log('\n\n📦 CHECKING SUPABASE STORAGE\n');

  try {
    const { data: files, error } = await supabase
      .storage
      .from('audio-files')
      .list('call-recordings', {
        limit: 10,
        offset: 0,
      });

    if (error) {
      console.log('❌ Error listing files:', error.message);
      return;
    }

    console.log(`✅ Found ${files?.length || 0} audio files in storage:\n`);
    files?.forEach((file: any) => {
      console.log(`   📄 ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
    });
  } catch (err: any) {
    console.log('❌ Storage error:', err.message);
  }
}

checkAudioUrls().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
