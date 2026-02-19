import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jytjdryjgcxgnfwlgtwc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGpkcnlqZ2N4Z25md2xndHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MDYwMjQsImV4cCI6MjA4NDE4MjAyNH0.lLWFWMIrLm0GzPAF3vFRAUfKaFkCMkxIXsXN8P5z-vU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRepNames() {
  console.log('📊 Checking all rep names in database...\n');
  
  const { data: calls, error } = await supabase
    .from('calls')
    .select('id, rep_name, customer_name, created_at')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`Found ${calls?.length || 0} total calls\n`);
  
  // Group by rep_name
  const repGroups: Record<string, any[]> = {};
  calls?.forEach(call => {
    const repName = call.rep_name || 'NULL';
    if (!repGroups[repName]) {
      repGroups[repName] = [];
    }
    repGroups[repName].push(call);
  });
  
  console.log('Calls grouped by rep_name:');
  Object.keys(repGroups).forEach(repName => {
    console.log(`\n🎯 Rep: "${repName}" (${repGroups[repName].length} calls)`);
    repGroups[repName].slice(0, 3).forEach(call => {
      console.log(`   - ID ${call.id}: ${call.customer_name}`);
    });
  });
  
  console.log('\n\n📋 Unique rep names:');
  Object.keys(repGroups).forEach(repName => {
    console.log(`   "${repName}"`);
  });
}

checkRepNames();
