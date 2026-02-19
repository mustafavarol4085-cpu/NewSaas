import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Target, TrendingUp } from 'lucide-react';
import type {
  GoldenCall,
  GoldenCallComparison,
} from '../services/goldenCallsService';
import {
  getGoldenCallsForRep,
  getComparisonForCall,
  getRepComparisonTrend,
  calculateTeamImprovement,
} from '../services/goldenCallsService';

interface GoldenCallsPanelProps {
  callId?: string;
  repId: string;
  mode?: 'comparison' | 'baseline' | 'team-trend';
}

export function GoldenCallsPanel({
  callId,
  repId,
  mode = 'comparison',
}: GoldenCallsPanelProps) {
  const [goldenCalls, setGoldenCalls] = useState<GoldenCall[]>([]);
  const [comparison, setComparison] = useState<GoldenCallComparison | null>(
    null
  );
  const [trend, setTrend] = useState<GoldenCallComparison[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [callId, repId, mode]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (mode === 'comparison' && callId) {
        // Load golden calls for rep + comparison for this call
        const [golden, comp] = await Promise.all([
          getGoldenCallsForRep(repId),
          getComparisonForCall(callId),
        ]);
        setGoldenCalls(golden);
        setComparison(comp);
      } else if (mode === 'baseline') {
        // Load golden calls for rep
        const golden = await getGoldenCallsForRep(repId);
        setGoldenCalls(golden);
      } else if (mode === 'team-trend') {
        // Load team metrics
        const trendData = await getRepComparisonTrend(repId, 20);
        const metrics = await calculateTeamImprovement();
        setTrend(trendData);
        setTeamMetrics(metrics);
      }
    } catch (error) {
      console.error('Error loading golden calls data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (mode === 'comparison' && comparison) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-purple-500/30">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">
            vs Golden Baseline
          </h3>
        </div>

        {/* Performance Delta */}
        <div className="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-300">Overall Performance</span>
            <span
              className={`text-2xl font-bold flex items-center gap-1 ${
                comparison.performance_delta_percentage > 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {comparison.performance_delta_percentage > 0 ? (
                <ArrowUp className="w-5 h-5" />
              ) : (
                <ArrowDown className="w-5 h-5" />
              )}
              {Math.abs(comparison.performance_delta_percentage)}%
            </span>
          </div>
          <p className="text-sm text-slate-400">
            {comparison.performance_delta_percentage > 0
              ? 'Better than golden baseline'
              : 'Room to improve vs golden baseline'}
          </p>
        </div>

        {/* Strengths */}
        {comparison.strengths_vs_golden.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
              <span className="text-lg">✓</span> Strengths
            </h4>
            <ul className="space-y-2">
              {comparison.strengths_vs_golden.map((strength, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-200"
                >
                  <span className="text-green-400 mt-1">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Gaps */}
        {comparison.gaps_vs_golden.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-amber-400 mb-3 flex items-center gap-2">
              <span className="text-lg">!</span> Areas for Improvement
            </h4>
            <ul className="space-y-2">
              {comparison.gaps_vs_golden.map((gap, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-200"
                >
                  <span className="text-amber-400 mt-1">•</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {comparison.recommendations_text && (
          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded">
            <p className="text-sm text-blue-200 italic">
              💡 {comparison.recommendations_text}
            </p>
          </div>
        )}

        {/* Detailed Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-slate-700/30 p-3 rounded">
            <p className="text-xs text-slate-400 mb-1">Talk Ratio Delta</p>
            <p className="text-lg font-semibold text-white">
              {comparison.talk_ratio_delta > 0 ? '+' : ''}
              {comparison.talk_ratio_delta.toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-700/30 p-3 rounded">
            <p className="text-xs text-slate-400 mb-1">Questions Delta</p>
            <p className="text-lg font-semibold text-white">
              {comparison.questions_count_delta > 0 ? '+' : ''}
              {comparison.questions_count_delta}
            </p>
          </div>
          <div className="bg-slate-700/30 p-3 rounded col-span-2">
            <p className="text-xs text-slate-400 mb-1">
              Objection Handling Delta
            </p>
            <p className="text-lg font-semibold text-white">
              {comparison.objection_handling_delta > 0 ? '+' : ''}
              {comparison.objection_handling_delta}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'baseline' && goldenCalls.length > 0) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-green-500/30">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Golden Baselines</h3>
        </div>

        <div className="space-y-4">
          {goldenCalls.map((gc, i) => (
            <div
              key={gc.id}
              className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-green-500/50 transition"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-white">Golden Call #{i + 1}</h4>
                  <p className="text-xs text-slate-400">
                    {new Date(gc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">
                    {gc.overall_score}
                  </div>
                  <p className="text-xs text-slate-400">
                    {gc.percentile_rank}th percentile
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                <div className="text-slate-300">
                  📊 Talk Ratio: <span className="font-semibold">{(gc.talk_ratio * 100).toFixed(0)}%</span>
                </div>
                <div className="text-slate-300">
                  ❓ Questions: <span className="font-semibold">{gc.questions_asked}</span>
                </div>
                <div className="text-slate-300">
                  🎯 Objections: <span className="font-semibold">{gc.objections_handled}/{gc.customer_objections}</span>
                </div>
                <div className="text-slate-300">
                  ⏱️ Duration: <span className="font-semibold">{Math.round(gc.call_duration_seconds / 60)}m</span>
                </div>
              </div>

              {gc.reason_selected && (
                <p className="text-xs text-amber-300 italic">
                  → {gc.reason_selected}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'team-trend' && teamMetrics) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-blue-500/30">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">
            Team Improvement Trend
          </h3>
        </div>

        {/* Overall Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <p className="text-xs text-slate-400 mb-2">Average Improvement</p>
            <p
              className={`text-2xl font-bold ${
                teamMetrics.avgDeltaPercentage > 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {teamMetrics.avgDeltaPercentage > 0 ? '+' : ''}
              {teamMetrics.avgDeltaPercentage.toFixed(1)}%
            </p>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <p className="text-xs text-slate-400 mb-2">Reps Measured</p>
            <p className="text-2xl font-bold text-blue-400">
              {teamMetrics.repCount}
            </p>
          </div>
        </div>

        {/* Improving Reps */}
        {teamMetrics.improvingReps.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-green-400 mb-2">
              ✓ Improving Reps ({teamMetrics.improvingReps.length})
            </h4>
            <div className="space-y-1 text-sm">
              {teamMetrics.improvingReps.map((repId: string) => (
                <div key={repId} className="text-slate-300">
                  • Rep {repId.slice(0, 8)}...
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regressing Reps */}
        {teamMetrics.regressingReps.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-400 mb-2">
              ! Needs Attention ({teamMetrics.regressingReps.length})
            </h4>
            <div className="space-y-1 text-sm">
              {teamMetrics.regressingReps.map((repId: string) => (
                <div key={repId} className="text-slate-300">
                  • Rep {repId.slice(0, 8)}...
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Comparisons */}
        {trend.length > 0 && (
          <div className="mt-6 border-t border-slate-600 pt-4">
            <h4 className="font-semibold text-slate-300 mb-3 text-sm">
              Recent Calls
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {trend.slice(0, 10).map((comp) => (
                <div
                  key={comp.id}
                  className="flex justify-between items-center text-xs p-2 bg-slate-700/30 rounded"
                >
                  <span className="text-slate-400">
                    {new Date(comp.created_at).toLocaleDateString()}
                  </span>
                  <span
                    className={comp.performance_delta_percentage > 0 ? 'text-green-400' : 'text-red-400'}
                  >
                    {comp.performance_delta_percentage > 0 ? '+' : ''}
                    {comp.performance_delta_percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-slate-400">
      No data available
    </div>
  );
}
