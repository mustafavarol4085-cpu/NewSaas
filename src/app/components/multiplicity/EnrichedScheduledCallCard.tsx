/**
 * Enriched Scheduled Call Card - Shows LinkedIn + CRM + AI insights
 */

import React from 'react';
import type { ScheduledCall } from '../../../services/types';

interface EnrichedScheduledCallCardProps {
  call: ScheduledCall;
}

export function EnrichedScheduledCallCard({ call }: EnrichedScheduledCallCardProps) {
  const priorityColors = {
    high: 'border-red-400 bg-red-50',
    medium: 'border-yellow-400 bg-yellow-50',
    low: 'border-blue-400 bg-blue-50',
  };

  const callTypeIcons = {
    Discovery: '🔍',
    Demo: '🎯',
    'Follow-up': '📞',
    Closing: '🤝',
  };

  const icon = callTypeIcons[call.call_type as keyof typeof callTypeIcons] || '📞';

  return (
    <div className={`border-l-4 rounded-lg p-4 ${priorityColors[call.priority]} transition-all hover:shadow-md`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            {icon} {call.customer_name}
            {call.company && <span className="text-sm text-gray-600">• {call.company}</span>}
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            {new Date(call.scheduled_date).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Chicago',
            })} • {call.duration_minutes} min
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          call.priority === 'high' ? 'bg-red-200 text-red-800' :
          call.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
          'bg-blue-200 text-blue-800'
        }`}>
          {call.priority}
        </span>
      </div>

      {/* LinkedIn Data */}
      {call.linkedin_data && (
        <div className="mb-3 bg-white rounded-md p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600 font-medium text-sm">💼 LinkedIn Profile</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {call.linkedin_data.title && (
              <div>
                <span className="text-gray-500">Title:</span>
                <span className="ml-1 font-medium text-gray-900">{call.linkedin_data.title}</span>
              </div>
            )}
            {call.linkedin_data.company_size && (
              <div>
                <span className="text-gray-500">Company Size:</span>
                <span className="ml-1 font-medium text-gray-900">{call.linkedin_data.company_size}</span>
              </div>
            )}
            {call.linkedin_data.industry && (
              <div className="col-span-2">
                <span className="text-gray-500">Industry:</span>
                <span className="ml-1 font-medium text-gray-900">{call.linkedin_data.industry}</span>
              </div>
            )}
            {call.linkedin_data.recent_activity && (
              <div className="col-span-2 mt-1 pt-2 border-t border-gray-100">
                <span className="text-gray-500">Recent Activity:</span>
                <p className="text-gray-700 mt-1 italic">"{call.linkedin_data.recent_activity}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CRM Data */}
      {call.crm_data && (
        <div className="mb-3 bg-white rounded-md p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-600 font-medium text-sm">📊 CRM Data</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {call.crm_data.deal_stage && (
              <div>
                <span className="text-gray-500">Stage:</span>
                <span className="ml-1 font-medium text-gray-900">{call.crm_data.deal_stage}</span>
              </div>
            )}
            {call.crm_data.deal_value && (
              <div>
                <span className="text-gray-500">Value:</span>
                <span className="ml-1 font-medium text-green-600">${call.crm_data.deal_value.toLocaleString()}</span>
              </div>
            )}
            {call.crm_data.lead_source && (
              <div>
                <span className="text-gray-500">Source:</span>
                <span className="ml-1 font-medium text-gray-900">{call.crm_data.lead_source}</span>
              </div>
            )}
            {call.crm_data.last_interaction && (
              <div>
                <span className="text-gray-500">Last Contact:</span>
                <span className="ml-1 font-medium text-gray-900">{call.crm_data.last_interaction}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Prep Insights */}
      {call.ai_prep_insights && call.ai_prep_insights.length > 0 && (
        <div className="mb-3 bg-gradient-to-br from-purple-50 to-blue-50 rounded-md p-3 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-700 font-medium text-sm">🤖 AI Preparation Tips</span>
          </div>
          <ul className="space-y-1.5">
            {call.ai_prep_insights.map((insight, idx) => (
              <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                <span className="text-purple-500 mt-0.5 flex-shrink-0">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prior Calls Summary */}
      {call.prior_calls_summary && (
        <div className="mb-3 bg-blue-50 rounded-md p-3 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-700 font-medium text-sm">📝 Prior Interactions</span>
          </div>
          <p className="text-xs text-gray-700 italic">{call.prior_calls_summary}</p>
        </div>
      )}

      {/* Notes */}
      {call.notes && (
        <div className="text-sm text-gray-700 bg-white rounded-md p-2 border border-gray-200">
          <span className="font-medium text-gray-900">Notes:</span> {call.notes}
        </div>
      )}
    </div>
  );
}

