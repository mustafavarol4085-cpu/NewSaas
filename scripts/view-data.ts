import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jytjdryjgcxgnfwlgtwc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGpkcnlqZ2N4Z25md2xndHdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNjAyNCwiZXhwIjoyMDg0MTgyMDI0fQ.H1c6S6DkhpZUqh6dOqwVUjnwZwtmf3_OsxNIR0ty9m0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function viewData() {
  console.log('📊 EXISTING DATA\n');
  console.log('='.repeat(80));

  // CALLS TABLE
  console.log('\n📞 CALLS TABLE\n');
  const { data: calls, error: callsError } = await supabase
    .from('calls')
    .select('*')
    .order('id', { ascending: true });

  if (callsError) {
    console.log('❌ Error:', callsError.message);
  } else if (calls && calls.length > 0) {
    console.log('Columns:', Object.keys(calls[0]).join(', '));
    console.log('\nData:');
    calls.forEach((call, idx) => {
      console.log(`\n${idx + 1}. Record:`);
      console.log(JSON.stringify(call, null, 2));
    });
  }

  // ANALYSIS TABLE
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📊 ANALYSIS TABLE\n');
  const { data: analysis, error: analysisError } = await supabase
    .from('analysis')
    .select('*')
    .order('id', { ascending: true });

  if (analysisError) {
    console.log('❌ Error:', analysisError.message);
  } else if (analysis && analysis.length > 0) {
    console.log('Columns:', Object.keys(analysis[0]).join(', '));
    console.log('\nData:');
    analysis.forEach((item, idx) => {
      console.log(`\n${idx + 1}. Record:`);
      console.log(JSON.stringify(item, null, 2));
    });
  }

  // TRANSCRIPTS TABLE
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 TRANSCRIPTS TABLE\n');
  const { data: transcripts, error: transcriptError } = await supabase
    .from('transcripts')
    .select('*')
    .limit(3);

  if (transcriptError) {
    console.log('❌ Error:', transcriptError.message);
  } else if (transcripts && transcripts.length > 0) {
    console.log('Columns:', Object.keys(transcripts[0]).join(', '));
    console.log('\nData:');
    transcripts.forEach((item, idx) => {
      console.log(`\n${idx + 1}. Record:`);
      console.log(JSON.stringify(item, null, 2));
    });
  } else {
    console.log('⚠️  Empty table - would you like to add a sample record to view the structure?');
  }
}

viewData();
