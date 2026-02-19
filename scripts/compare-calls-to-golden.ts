/**
 * Script to compare new calls against golden calls
 * This runs AI analysis on new calls and compares them to the golden baselines
 * 
 * Usage: npx ts-node scripts/compare-calls-to-golden.ts
 */

import { supabase } from '../src/services/supabase';
import { analyzeCall } from './run-ai-agents';

async function compareCallsToGolden() {
  try {
    console.log('🔍 Starting call-to-golden comparison...');

    // Get calls that haven't been compared yet
    const { data: newCalls, error: callsError } = await supabase
      .from('calls')
      .select(
        `
        id,
        rep_id,
        created_at,
        analysis:analysis(
          overall_score,
          objection_score,
          discovery_score,
          closing_score
        )
      `
      )
      .not('id', 'in', `(SELECT DISTINCT call_id FROM golden_calls_comparison)`) // Not yet compared
      .eq('is_demo_data', false)
      .order('created_at', { ascending: false })
      .limit(50); // Process in batches

    if (callsError) throw callsError;

    if (!newCalls || newCalls.length === 0) {
      console.log('✅ No new calls to compare');
      return;
    }

    console.log(`📊 Found ${newCalls.length} new calls to compare`);

    let comparisonsCreated = 0;

    for (const call of newCalls) {
      try {
        // Get golden calls for this rep
        const { data: goldenCalls, error: goldenError } = await supabase
          .from('golden_calls')
          .select('*')
          .eq('rep_id', call.rep_id)
          .eq('is_active', true)
          .order('overall_score', { ascending: false })
          .limit(1);

        if (goldenError) throw goldenError;

        if (!goldenCalls || goldenCalls.length === 0) {
          console.log(`⚠️  No golden calls for rep ${call.rep_id}, skipping`);
          continue;
        }

        const goldenCall = goldenCalls[0];
        const callAnalysis = call.analysis?.[0];

        // Calculate deltas
        const performanceDelta =
          (callAnalysis?.overall_score || 0) - goldenCall.overall_score;

        const talkRatioDelta =
          (callAnalysis?.talk_ratio || 0.5) - goldenCall.talk_ratio;

        // Simple scoring for now
        const strengths: string[] = [];
        const gaps: string[] = [];

        if (
          (callAnalysis?.closing_score || 0) > goldenCall.closing_score
        ) {
          strengths.push('Better closing technique');
        } else {
          gaps.push('Weaker closing - review golden call for approach');
        }

        if (
          (callAnalysis?.discovery_score || 0) > goldenCall.discovery_score
        ) {
          strengths.push('Strong discovery questions');
        } else {
          gaps.push('Limited discovery questions - ask more open-ended questions');
        }

        if (
          (callAnalysis?.objection_score || 0) > goldenCall.objection_score
        ) {
          strengths.push('Excellent objection handling');
        } else {
          gaps.push(
            'Objection handling needs work - reference golden call response patterns'
          );
        }

        if (talkRatioDelta < -0.1) {
          gaps.push(
            'Talking too much - let customer speak more (listen better)'
          );
        }

        // Create comparison record
        const { error: insertError } = await supabase
          .from('golden_calls_comparison')
          .insert({
            rep_id: call.rep_id,
            call_id: call.id,
            golden_call_id: goldenCall.id,
            performance_delta_percentage: Math.round(performanceDelta),
            talk_ratio_delta: parseFloat(talkRatioDelta.toFixed(2)),
            questions_count_delta: 0, // Would need more data to calculate
            objection_handling_delta:
              (callAnalysis?.objection_score || 0) -
              goldenCall.objection_score,
            strengths_vs_golden: strengths,
            gaps_vs_golden: gaps,
            recommendations_text: `Compare call against golden baseline. ${strengths.length > 0 ? `Strengths: ${strengths.join(', ')}. ` : ''}${gaps.length > 0 ? `Focus areas: ${gaps.join(', ')}.` : ''}`,
          });

        if (insertError) throw insertError;

        comparisonsCreated++;
        console.log(
          `  ✅ Compared call ${call.id.slice(0, 8)}... (${performanceDelta > 0 ? '+' : ''}${performanceDelta}%)`
        );
      } catch (error) {
        console.error(`  ❌ Error comparing call:`, error);
      }
    }

    console.log(`\n📊 Created ${comparisonsCreated} comparisons`);
    console.log('💡 Use these to identify improvement areas for each rep');
  } catch (error) {
    console.error('❌ Error in comparison process:', error);
    process.exit(1);
  }
}

compareCallsToGolden();
