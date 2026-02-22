import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jytjdryjgcxgnfwlgtwc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGpkcnlqZ2N4Z25md2xndHdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNjAyNCwiZXhwIjoyMDg0MTgyMDI0fQ.H1c6S6DkhpZUqh6dOqwVUjnwZwtmf3_OsxNIR0ty9m0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('🔍 Inspecting Supabase database...\n');

  try {
    // List all tables using PostgreSQL information schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error('❌ Failed to retrieve table list:', tablesError.message);
      
      // Try alternate method - query specific tables
      console.log('\n📊 Checking known tables...\n');
      
      const knownTables = ['calls', 'analysis', 'transcript', 'users', 'reps', 'managers', 'performance_dimensions', 'ai_insights', 'scheduled_calls'];
      
      for (const tableName of knownTables) {
        try {
          const { data, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          if (!error) {
            console.log(`✅ ${tableName} - ${count || 0} records`);
          }
        } catch (e) {
          console.log(`❌ ${tableName} - Table not found`);
        }
      }
      
      return;
    }

    if (!tables || tables.length === 0) {
      console.log('⚠️  No tables found in public schema.\n');
      return;
    }

    console.log(`📋 Tables found (${tables.length}):\n`);
    
    for (const table of tables) {
      const tableName = table.table_name;
      
      // Get row count
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.log(`  • ${tableName} - (could not retrieve record count)`);
      } else {
        console.log(`  ✅ ${tableName} - ${count || 0} records`);
      }
    }

    // Check specific tables we need
    console.log('\n\n🔎 Required tables check:\n');
    
    const requiredTables = {
      'calls': 'Sales calls',
      'analysis': 'Call analysis data',
      'transcript': 'Transcript data',
      'users': 'Users (auth.users extend)',
      'reps': 'Sales representatives',
      'managers': 'Managers',
      'performance_dimensions': 'Performance dimensions (discovery, qualification, etc.)',
      'ai_insights': 'AI-generated insights',
      'scheduled_calls': 'Scheduled calls',
      'team_metrics': 'Team metrics'
    };

    const existingTableNames = tables.map(t => t.table_name);

    for (const [tableName, description] of Object.entries(requiredTables)) {
      const exists = existingTableNames.includes(tableName);
      if (exists) {
        console.log(`  ✅ ${tableName} - ${description}`);
      } else {
        console.log(`  ❌ ${tableName} - ${description} (MISSING)`);
      }
    }

    // If calls table exists, show its structure
    if (existingTableNames.includes('calls')) {
      console.log('\n\n📊 "calls" table details:\n');
      
      const { data: sampleCall } = await supabase
        .from('calls')
        .select('*')
        .limit(1)
        .single();
      
      if (sampleCall) {
        console.log('  Available columns:');
        Object.keys(sampleCall).forEach(key => {
          console.log(`    • ${key}: ${typeof sampleCall[key]}`);
        });
      }
    }

    // If analysis table exists, show its structure
    if (existingTableNames.includes('analysis')) {
      console.log('\n\n📊 "analysis" table details:\n');
      
      const { data: sampleAnalysis } = await supabase
        .from('analysis')
        .select('*')
        .limit(1)
        .single();
      
      if (sampleAnalysis) {
        console.log('  Available columns:');
        Object.keys(sampleAnalysis).forEach(key => {
          console.log(`    • ${key}: ${typeof sampleAnalysis[key]}`);
        });
      }
    }

    // If transcript table exists, show its structure
    if (existingTableNames.includes('transcript')) {
      console.log('\n\n📊 "transcript" table details:\n');
      
      const { data: sampleTranscript } = await supabase
        .from('transcript')
        .select('*')
        .limit(1)
        .single();
      
      if (sampleTranscript) {
        console.log('  Available columns:');
        Object.keys(sampleTranscript).forEach(key => {
          console.log(`    • ${key}: ${typeof sampleTranscript[key]}`);
        });
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkTables();
