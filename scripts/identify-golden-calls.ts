/**
 * Script to identify and create golden calls (top 5% performers)
 * Run this after you have calls with analysis scores
 * 
 * Usage: npx ts-node scripts/identify-golden-calls.ts
 */

import { supabase } from '../src/services/supabase';

async function identifyGoldenCalls() {
  try {
    console.log('🏆 Starting golden calls identification...');

    // Get all calls with their analysis scores
    const { data: allCalls, error: callsError } = await supabase
      .from('calls')
      .select(
        `
        id,
        rep_id,
        duration_seconds,
        product_category,
        deal_stage,
        created_at,
        analysis:analysis(
          overall_score,
          objection_score,
          discovery_score,
          closing_score
        )
      `
      )
      .eq('is_demo_data', false) // Only real data
      .eq('deleted_at', null)
      .order('created_at', { ascending: false });

    if (callsError) throw callsError;

    if (!allCalls || allCalls.length === 0) {
      console.log('❌ No calls found with analysis data');
      return;
    }

    console.log(`📊 Found ${allCalls.length} calls with analysis data`);

    // Group by rep
    const callsByRep = new Map<string, any[]>();
    allCalls.forEach((call) => {
      if (!callsByRep.has(call.rep_id)) {
        callsByRep.set(call.rep_id, []);
      }
      callsByRep.get(call.rep_id)!.push(call);
    });

    console.log(`👥 Across ${callsByRep.size} reps`);

    // For each rep, mark top 5% as golden
    let goldenCallsCreated = 0;
    const goldenCallsData: any[] = [];

    for (const [repId, repCalls] of callsByRep.entries()) {
      // Sort by score
      const sortedByScore = repCalls.sort(
        (a, b) =>
          (b.analysis?.[0]?.overall_score || 0) -
          (a.analysis?.[0]?.overall_score || 0)
      );

      // Top 5% = at least 1 call
      const topCount = Math.max(1, Math.ceil(repCalls.length * 0.05));
      const topCalls = sortedByScore.slice(0, topCount);

      console.log(`  📍 Rep ${repId}: Selecting ${topCount} golden calls from ${repCalls.length} total`);

      for (let i = 0; i < topCalls.length; i++) {
        const call = topCalls[i];
        const analysis = call.analysis?.[0];
        const percentile = Math.round(100 - (i / repCalls.length) * 100);

        goldenCallsData.push({
          call_id: call.id,
          rep_id: repId,
          overall_score: analysis?.overall_score || 85,
          objection_score: analysis?.objection_score || 80,
          discovery_score: analysis?.discovery_score || 85,
          closing_score: analysis?.closing_score || 90,
          call_duration_seconds: call.duration_seconds,
          product_category: call.product_category,
          deal_stage: call.deal_stage,
          reason_selected: `Top ${topCount} calls for rep - ${i + 1}/${topCount}`,
          percentile_rank: percentile,
          is_active: true,
        });

        goldenCallsCreated++;
      }
    }

    // Insert all golden calls
    if (goldenCallsData.length > 0) {
      const { error: insertError } = await supabase
        .from('golden_calls')
        .insert(goldenCallsData);

      if (insertError) throw insertError;

      console.log(`\n✅ Created ${goldenCallsCreated} golden calls total`);
      console.log('📈 Golden calls are now ready for benchmarking');
      console.log('💡 New calls will be compared against these baselines');
    }
  } catch (error) {
    console.error('❌ Error identifying golden calls:', error);
    process.exit(1);
  }
}

identifyGoldenCalls();
