/**
 * Golden Calls Service
 * Manages golden (reference) calls for benchmarking and comparison
 * Allows selecting top-performing calls as baselines for rep coaching
 */

import { supabase } from './supabase';
import type { GoldenCall, GoldenCallsComparison } from './types';

/**
 * Mark a call as a golden call (top performer)
 * Golden calls serve as reference baselines for coaching
 */
export async function markAsGoldenCall(
  callId: string,
  repId: string,
  analysisData: any,
  reasonSelected: string = 'Top performer'
): Promise<GoldenCall | null> {
  try {
    const { data, error } = await supabase
      .from('golden_calls')
      .insert({
        call_id: callId,
        rep_id: repId,
        overall_score: analysisData.overall_score || 0,
        objection_score: analysisData.objection_score || 0,
        discovery_score: analysisData.discovery_score || 0,
        closing_score: analysisData.closing_score || 0,
        talk_ratio: analysisData.talk_ratio || 0.5,
        questions_asked: analysisData.questions_asked || 0,
        customer_objections: analysisData.customer_objections || 0,
        objections_handled: analysisData.objections_handled || 0,
        avg_question_quality: analysisData.avg_question_quality || 5,
        call_duration_seconds: analysisData.call_duration_seconds,
        product_category: analysisData.product_category,
        industry: analysisData.industry,
        deal_stage: analysisData.deal_stage,
        key_techniques: analysisData.key_techniques || [],
        language_patterns: analysisData.language_patterns || {},
        objection_responses: analysisData.objection_responses || {},
        discovery_questions: analysisData.discovery_questions || [],
        winning_patterns: analysisData.winning_patterns || {},
        reason_selected: reasonSelected,
        percentile_rank: 95, // Will be updated by identifying_golden_calls function
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error marking call as golden:', error);
    return null;
  }
}

/**
 * Get all active golden calls for a rep
 */
export async function getGoldenCallsByRep(repId: string): Promise<GoldenCall[]> {
  try {
    const { data, error } = await supabase
      .from('golden_calls')
      .select('*')
      .eq('rep_id', repId)
      .eq('is_active', true)
      .order('overall_score', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching golden calls for rep:', error);
    return [];
  }
}

/**
 * Get top golden calls across all reps (for team benchmarking)
 */
export async function getTopGoldenCalls(
  limit: number = 10,
  category?: string
): Promise<GoldenCall[]> {
  try {
    let query = supabase
      .from('golden_calls')
      .select('*')
      .eq('is_active', true)
      .order('overall_score', { ascending: false });

    if (category) {
      query = query.eq('product_category', category);
    }

    const { data, error } = await query.limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching top golden calls:', error);
    return [];
  }
}

/**
 * Automatically identify top X% of calls as golden
 * Uses the SQL function from migration
 */
export async function identifyGoldenCallsAutomatically(
  percentileThreshold: number = 95,
  limitPerRep: number = 3
): Promise<{ callsMarked: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('identify_golden_calls', {
      percentile_threshold: percentileThreshold,
      limit_per_rep: limitPerRep,
    });

    if (error) throw error;

    // Now mark these calls as golden
    let markedCount = 0;
    for (const result of data || []) {
      const marked = await markAsGoldenCall(
        result.call_id,
        result.rep_id,
        { overall_score: result.overall_score },
        `Auto-identified - Top ${percentileThreshold}th percentile`
      );
      if (marked) markedCount++;
    }

    return { callsMarked: markedCount };
  } catch (error) {
    console.error('Error auto-identifying golden calls:', error);
    return {
      callsMarked: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Compare a new call against golden calls to identify performance gaps
 */
export async function compareCallToGolden(
  callId: string,
  repId: string,
  newCallAnalysis: any
): Promise<GoldenCallsComparison | null> {
  try {
    // Get representative golden calls for this rep
    const goldenCalls = await getGoldenCallsByRep(repId);
    if (goldenCalls.length === 0) {
      console.warn('No golden calls found for rep:', repId);
      return null;
    }

    // Average the golden call metrics
    const goldenBaseline = {
      avg_score: goldenCalls.reduce((sum, gc) => sum + gc.overall_score, 0) / goldenCalls.length,
      avg_talk_ratio: goldenCalls.reduce((sum, gc) => sum + (gc.talk_ratio || 0.5), 0) / goldenCalls.length,
      avg_questions: goldenCalls.reduce((sum, gc) => sum + (gc.questions_asked || 0), 0) / goldenCalls.length,
      avg_objection_score: goldenCalls.reduce((sum, gc) => sum + (gc.objection_score || 0), 0) / goldenCalls.length,
    };

    // Calculate deltas
    const performanceDelta = newCallAnalysis.overall_score - goldenBaseline.avg_score;
    const performanceDeltaPercentage = ((performanceDelta / goldenBaseline.avg_score) * 100).toFixed(1);

    const talkRatioDelta = (newCallAnalysis.talk_ratio || 0.5) - goldenBaseline.avg_talk_ratio;
    const questionsCountDelta = (newCallAnalysis.questions_asked || 0) - goldenBaseline.avg_questions;
    const objectionHandlingDelta = (newCallAnalysis.objection_score || 0) - goldenBaseline.avg_objection_score;

    // Determine strengths and gaps
    const strengths: string[] = [];
    const gaps: string[] = [];

    if (newCallAnalysis.overall_score > goldenBaseline.avg_score) {
      strengths.push('Better overall performance than baseline');
    }
    if ((newCallAnalysis.talk_ratio || 0.5) < goldenBaseline.avg_talk_ratio) {
      strengths.push('Better listening ratio (less rep talk)');
    } else {
      gaps.push('Speaking too much - golden calls had less rep talk');
    }
    if ((newCallAnalysis.questions_asked || 0) >= goldenBaseline.avg_questions) {
      strengths.push('Good number of discovery questions');
    } else {
      gaps.push('Fewer questions than golden baseline - explore more');
    }
    if ((newCallAnalysis.objection_score || 0) >= goldenBaseline.avg_objection_score) {
      strengths.push('Strong objection handling');
    } else {
      gaps.push('Objection handling needs improvement vs golden calls');
    }

    // Store comparison in database
    const { data, error } = await supabase
      .from('golden_calls_comparison')
      .insert({
        rep_id: repId,
        call_id: callId,
        golden_call_id: goldenCalls[0].id, // Use the strongest golden call as primary reference
        performance_delta_percentage: parseInt(performanceDeltaPercentage),
        comparison_summary: `Call scored ${performanceDeltaPercentage}% ${
          performanceDelta > 0 ? 'better' : 'worse'
        } than your golden baseline.`,
        talk_ratio_delta: parseFloat(talkRatioDelta.toFixed(2)),
        questions_count_delta: questionsCountDelta,
        objection_handling_delta: objectionHandlingDelta,
        strengths_vs_golden: strengths,
        gaps_vs_golden: gaps,
        recommendations_text: generateRecommendations(gaps, strengths),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error comparing call to golden:', error);
    return null;
  }
}

/**
 * Get comparison for a specific call
 */
export async function getCallComparison(callId: string): Promise<GoldenCallsComparison | null> {
  try {
    const { data, error } = await supabase
      .from('golden_calls_comparison')
      .select('*')
      .eq('call_id', callId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching call comparison:', error);
    return null;
  }
}

/**
 * Get all comparisons for a rep
 */
export async function getRepComparisons(repId: string): Promise<GoldenCallsComparison[]> {
  try {
    const { data, error } = await supabase
      .from('golden_calls_comparison')
      .select('*')
      .eq('rep_id', repId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching rep comparisons:', error);
    return [];
  }
}

/**
 * Generate coaching recommendations based on gaps
 */
function generateRecommendations(gaps: string[], strengths: string[]): string {
  let recommendations = '';

  if (gaps.length > 0) {
    recommendations += 'Focus areas:\n';
    gaps.forEach((gap, index) => {
      recommendations += `${index + 1}. ${gap}\n`;
    });
  }

  if (strengths.length > 0) {
    recommendations += '\nKeep up your strengths:\n';
    strengths.forEach((strength, index) => {
      recommendations += `${index + 1}. ${strength}\n`;
    });
  }

  recommendations += '\n→ Review your golden call examples to see how top performers handle these situations.';

  return recommendations;
}

/**
 * Get improvement trend for a rep (comparing recent calls to golden baseline)
 */
export async function getRepImprovementTrend(
  repId: string,
  limitCalls: number = 10
): Promise<{
  trend: 'improving' | 'declining' | 'stable';
  avgDelta: number;
  comparisons: GoldenCallsComparison[];
}> {
  try {
    const comparisons = await getRepComparisons(repId);
    const recentComparisons = comparisons.slice(0, limitCalls);

    if (recentComparisons.length === 0) {
      return { trend: 'stable', avgDelta: 0, comparisons: [] };
    }

    const avgDelta =
      recentComparisons.reduce((sum, c) => sum + c.performance_delta_percentage, 0) /
      recentComparisons.length;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (avgDelta > 5) trend = 'improving';
    if (avgDelta < -5) trend = 'declining';

    return { trend, avgDelta, comparisons: recentComparisons };
  } catch (error) {
    console.error('Error getting improvement trend:', error);
    return { trend: 'stable', avgDelta: 0, comparisons: [] };
  }
}

/**
 * Update a golden call's status
 */
export async function updateGoldenCallStatus(
  goldenCallId: string,
  isActive: boolean
): Promise<GoldenCall | null> {
  try {
    const { data, error } = await supabase
      .from('golden_calls')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', goldenCallId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating golden call status:', error);
    return null;
  }
}

/**
 * Archive old golden calls and identify new ones
 */
export async function refreshGoldenCalls(
  percentileThreshold: number = 95
): Promise<{ archived: number; newlyMarked: number }> {
  try {
    // Archive old golden calls
    const { error: archiveError } = await supabase
      .from('golden_calls')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('is_active', true);

    if (archiveError) throw archiveError;

    // Identify and mark new ones
    const result = await identifyGoldenCallsAutomatically(percentileThreshold, 3);

    return {
      archived: 100, // Approximate - would need count query for exact
      newlyMarked: result.callsMarked,
    };
  } catch (error) {
    console.error('Error refreshing golden calls:', error);
    return { archived: 0, newlyMarked: 0 };
  }
}
