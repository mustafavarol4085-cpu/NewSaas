import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jytjdryjgcxgnfwlgtwc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGpkcnlqZ2N4Z25md2xndHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MDYwMjQsImV4cCI6MjA4NDE4MjAyNH0.lLWFWMIrLm0GzPAF3vFRAUfKaFkCMkxIXsXN8P5z-vU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function viewAllCalls() {
  console.log('📊 Fetching all calls from database...\n');
  
  const { data: calls, error } = await supabase
    .from('calls')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  if (!calls || calls.length === 0) {
    console.log('⚠️  No calls found in database!');
    return;
  }
  
  console.log(`✅ Found ${calls.length} calls\n`);
  
  // Group by rep
  const byRep: Record<string, any[]> = {};
  calls.forEach(call => {
    const rep = call.rep_name || 'Unknown';
    if (!byRep[rep]) byRep[rep] = [];
    byRep[rep].push(call);
  });
  
  // Display by rep
  Object.keys(byRep).sort().forEach(rep => {
    console.log(`\n👤 ${rep} (${byRep[rep].length} calls):`);
    byRep[rep].forEach(call => {
      console.log(`   📞 ID: ${call.id} | Customer: ${call.customer_name} | ${call.call_type || 'Call'}`);
      console.log(`      Duration: ${call.duration_seconds}s | Score: ${call.score || 'N/A'}`);
      console.log(`      Audio: ${call.audio_url ? '✅ Yes' : '❌ No'}`);
    });
  });
  
  console.log('\n\n📋 Summary:');
  Object.keys(byRep).sort().forEach(rep => {
    console.log(`   ${rep}: ${byRep[rep].length} calls`);
  });
}

viewAllCalls();
